import * as bitcoin from 'bitcoinjs-lib';
import axios from 'axios';
import * as crypto from 'crypto';
import * as bip39 from 'bip39';
import * as https from 'https';
import { URL } from 'url';
import { WalletConfig, WalletBalance, WalletAddress, ElectrumTransaction, UTXO } from '../types';

// Import required modules
import * as bip32 from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';

// Create factories with ECC library
const bip32Factory = bip32.BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

// Import the electrum client
const ElectrumClient = require('electrum-client');

interface APIEndpoint {
    name: string;
    url: string;
    priority: number;
    lastSuccess: number;
    consecutiveFailures: number;
    isHealthy: boolean;
}

interface CircuitBreaker {
    failures: number;
    lastFailureTime: number;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

export class DogeElectrumWallet {
    private electrumUrl: string = '';
    private electrumPort: number = 50001;
    private network: any;
    private isConnected: boolean = false;
    private walletSeed: string = '';
    private walletAddresses: WalletAddress[] = [];
    private electrumClient: any = null;
    private privateKeys: { [address: string]: string } = {};
    private rawPrivateKeys: { [address: string]: Buffer | null } = {};

    // Industry-standard API resilience features
    private apiEndpoints: APIEndpoint[] = [
        {
            name: 'Trezor Blockbook',
            url: 'https://doge1.trezor.io/api/v2',
            priority: 1,
            lastSuccess: 0,
            consecutiveFailures: 0,
            isHealthy: true
        },
        {
            name: 'Blockstream',
            url: 'https://blockstream.info/dogecoin/api',
            priority: 2,
            lastSuccess: 0,
            consecutiveFailures: 0,
            isHealthy: true
        },
        {
            name: 'BlockCypher',
            url: 'https://api.blockcypher.com/v1/doge/main',
            priority: 3,
            lastSuccess: 0,
            consecutiveFailures: 0,
            isHealthy: true
        },
        {
            name: 'DogeChain.info',
            url: 'https://dogechain.info/api/v1',
            priority: 4,
            lastSuccess: 0,
            consecutiveFailures: 0,
            isHealthy: true
        }
    ];

    private circuitBreakers: { [key: string]: CircuitBreaker } = {};
    private balanceCache: { [address: string]: { balance: WalletBalance; timestamp: number } } = {};
    private readonly CACHE_TTL = 30000; // 30 seconds
    private readonly CIRCUIT_BREAKER_THRESHOLD = 3;
    private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAYS = [1000, 2000, 5000]; // 1s, 2s, 5s

    // Manual balance override for when APIs fail
    private manualBalances: { [address: string]: number } = {};

    constructor() {
        // Dogecoin network parameters
        this.network = {
            messagePrefix: '\x19Dogecoin Signed Message:\n',
            bech32: 'dc',
            bip32: {
                public: 0x02facafd,
                private: 0x02fac398,
            },
            pubKeyHash: 0x1e,
            scriptHash: 0x16,
            wif: 0x9e,
        };

        // Initialize circuit breakers
        this.apiEndpoints.forEach(endpoint => {
            this.circuitBreakers[endpoint.name] = {
                failures: 0,
                lastFailureTime: 0,
                state: 'CLOSED'
            };
        });
    }

    // Set manual balance for when APIs are down
    setManualBalance(address: string, balance: number): void {
        this.manualBalances[address] = balance;
        console.log(`Manual balance set for ${address}: ${balance} DOGE`);
    }

    // Get manual balance if set
    getManualBalance(address: string): number | null {
        return this.manualBalances[address] || null;
    }

    // Clear manual balance
    clearManualBalance(address: string): void {
        delete this.manualBalances[address];
    }

    // Industry-standard retry mechanism with exponential backoff
    private async retryWithBackoff<T>(
        operation: () => Promise<T>,
        maxRetries: number = this.MAX_RETRIES,
        delays: number[] = this.RETRY_DELAYS
    ): Promise<T> {
        let lastError: Error;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;

                if (attempt < maxRetries) {
                    const delay = delays[Math.min(attempt, delays.length - 1)];
                    console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError!;
    }

    // Circuit breaker pattern implementation
    private canExecute(endpointName: string): boolean {
        const breaker = this.circuitBreakers[endpointName];
        if (!breaker) return true;

        const now = Date.now();

        switch (breaker.state) {
            case 'CLOSED':
                return true;
            case 'OPEN':
                if (now - breaker.lastFailureTime > this.CIRCUIT_BREAKER_TIMEOUT) {
                    breaker.state = 'HALF_OPEN';
                    return true;
                }
                return false;
            case 'HALF_OPEN':
                return true;
            default:
                return true;
        }
    }

    private recordSuccess(endpointName: string): void {
        const breaker = this.circuitBreakers[endpointName];
        if (breaker) {
            breaker.failures = 0;
            breaker.state = 'CLOSED';
        }

        // Update endpoint health
        const endpoint = this.apiEndpoints.find(e => e.name === endpointName);
        if (endpoint) {
            endpoint.lastSuccess = Date.now();
            endpoint.consecutiveFailures = 0;
            endpoint.isHealthy = true;
        }
    }

    private recordFailure(endpointName: string): void {
        const breaker = this.circuitBreakers[endpointName];
        if (breaker) {
            breaker.failures++;
            breaker.lastFailureTime = Date.now();

            if (breaker.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
                breaker.state = 'OPEN';
            }
        }

        // Update endpoint health
        const endpoint = this.apiEndpoints.find(e => e.name === endpointName);
        if (endpoint) {
            endpoint.consecutiveFailures++;
            if (endpoint.consecutiveFailures >= this.CIRCUIT_BREAKER_THRESHOLD) {
                endpoint.isHealthy = false;
            }
        }
    }

    // Enhanced balance fetching with industry-standard patterns
    async getBalance(address: string): Promise<WalletBalance> {
        // Check manual balance first
        const manualBalance = this.getManualBalance(address);
        if (manualBalance !== null) {
            return {
                confirmed: manualBalance,
                unconfirmed: 0,
                total: manualBalance
            };
        }

        // Check cache first
        const cached = this.balanceCache[address];
        if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
            return cached.balance;
        }

        // Sort endpoints by priority and health
        const healthyEndpoints = this.apiEndpoints
            .filter(endpoint => endpoint.isHealthy && this.canExecute(endpoint.name))
            .sort((a, b) => a.priority - b.priority);

        console.log(`Checking balance for ${address} using ${healthyEndpoints.length} healthy endpoints`);

        // Try each healthy endpoint with circuit breaker protection
        for (const endpoint of healthyEndpoints) {
            try {
                console.log(`Trying ${endpoint.name}...`);
                const balance = await this.retryWithBackoff(async () => {
                    return await this.fetchBalanceFromEndpoint(endpoint, address);
                });

                // Record success and cache result
                this.recordSuccess(endpoint.name);
                this.balanceCache[address] = { balance, timestamp: Date.now() };

                console.log(`✅ ${endpoint.name} succeeded:`, balance);
                return balance;
            } catch (error) {
                console.warn(`❌ ${endpoint.name} failed:`, error.message);
                this.recordFailure(endpoint.name);
            }
        }

        // Fallback to Electrum methods if connected
        if (this.isConnected && this.electrumClient) {
            try {
                console.log('All API endpoints failed, trying Electrum fallback...');
                const balance = await this.getBalanceFromElectrum(address);
                this.balanceCache[address] = { balance, timestamp: Date.now() };
                return balance;
            } catch (electrumError) {
                console.warn('Electrum fallback also failed:', electrumError.message);
            }
        }

        // Return zero balance rather than throwing
        console.log('All balance methods failed, returning zero balance');
        const zeroBalance = { confirmed: 0, unconfirmed: 0, total: 0 };
        this.balanceCache[address] = { balance: zeroBalance, timestamp: Date.now() };
        return zeroBalance;
    }

    private async fetchBalanceFromEndpoint(endpoint: APIEndpoint, address: string): Promise<WalletBalance> {
        switch (endpoint.name) {
            case 'Trezor Blockbook':
                return await this.getBalanceFromTrezor(address);
            case 'Blockstream':
                return await this.getBalanceFromBlockstream(address);
            case 'BlockCypher':
                return await this.getBalanceFromBlockCypher(address);
            case 'DogeChain.info':
                return await this.getBalanceFromDogeChain(address);
            default:
                throw new Error(`Unknown endpoint: ${endpoint.name}`);
        }
    }

    private async getBalanceFromTrezor(address: string): Promise<WalletBalance> {
        // Add random delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
        
        const response = await axios.get(`https://doge1.trezor.io/api/v2/address/${address}`, {
            timeout: 10000,
            headers: {
                'User-Agent': 'DoginalWallet/1.0.0',
                'Accept': 'application/json'
            }
        });

        if (response.data && typeof response.data.balance === 'string') {
            const balanceSatoshis = parseInt(response.data.balance);
            const unconfirmedSatoshis = parseInt(response.data.unconfirmedBalance || '0');
            return {
                confirmed: balanceSatoshis / 100000000,
                unconfirmed: unconfirmedSatoshis / 100000000,
                total: (balanceSatoshis + unconfirmedSatoshis) / 100000000
            };
        }
        throw new Error('Invalid Trezor API response');
    }

    private async getBalanceFromBlockstream(address: string): Promise<WalletBalance> {
        // Add random delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 500));
        
        try {
            const response = await axios.get(`https://blockstream.info/dogecoin/api/address/${address}`, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'DoginalWallet/1.0.0',
                    'Accept': 'application/json'
                }
            });

            if (response.data && typeof response.data.chain_stats === 'object') {
                const confirmedSatoshis = response.data.chain_stats.funded_txo_sum - response.data.chain_stats.spent_txo_sum;
                const unconfirmedSatoshis = response.data.mempool_stats.funded_txo_sum - response.data.mempool_stats.spent_txo_sum;
                return {
                    confirmed: confirmedSatoshis / 100000000,
                    unconfirmed: unconfirmedSatoshis / 100000000,
                    total: (confirmedSatoshis + unconfirmedSatoshis) / 100000000
                };
            }
            throw new Error('Invalid Blockstream API response');
        } catch (error) {
            throw new Error(`Blockstream API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async getBalanceFromSoChain(address: string): Promise<WalletBalance> {
        // Add random delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 500));
        
        const response = await axios.get(`https://sochain.com/api/v2/get_address_balance/DOGE/${address}`, {
            timeout: 10000,
            headers: {
                'User-Agent': 'DoginalWallet/1.0.0',
                'Accept': 'application/json'
            }
        });

        if (response.data && response.data.status === 'success' && response.data.data) {
            const confirmedBalance = parseFloat(response.data.data.confirmed_balance || '0');
            const unconfirmedBalance = parseFloat(response.data.data.unconfirmed_balance || '0');
            return {
                confirmed: confirmedBalance,
                unconfirmed: unconfirmedBalance,
                total: confirmedBalance + unconfirmedBalance
            };
        }
        throw new Error('Invalid SoChain API response');
    }

    private async getBalanceFromBlockCypher(address: string): Promise<WalletBalance> {
        const response = await axios.get(`https://api.blockcypher.com/v1/doge/main/addrs/${address}/balance`, {
            timeout: 10000
        });

        if (response.data && response.data.error) {
            throw new Error(`BlockCypher API error: ${response.data.error}`);
        }

        if (response.data && typeof response.data.balance === 'number') {
            return {
                confirmed: response.data.balance / 100000000,
                unconfirmed: (response.data.unconfirmed_balance || 0) / 100000000,
                total: (response.data.balance + (response.data.unconfirmed_balance || 0)) / 100000000
            };
        }
        throw new Error('Invalid BlockCypher API response');
    }

    private async getBalanceFromDogeChain(address: string): Promise<WalletBalance> {
        const response = await axios.get(`https://dogechain.info/api/v1/address/balance/${address}`, {
            timeout: 10000
        });

        if (response.data && typeof response.data.balance === 'number') {
            const balance = response.data.balance;
            return {
                confirmed: balance,
                unconfirmed: 0,
                total: balance
            };
        }
        throw new Error('Invalid DogeChain API response');
    }

    private async getBalanceFromElectrum(address: string): Promise<WalletBalance> {
        try {
            // Try script hash method (most common for Electrum)
            const scriptHash = this.addressToScriptHash(address);
            const balance = await this.electrumClient.blockchain_scripthash_get_balance(scriptHash);
            return {
                confirmed: balance.confirmed / 100000000,
                unconfirmed: balance.unconfirmed / 100000000,
                total: (balance.confirmed + balance.unconfirmed) / 100000000
            };
        } catch (error) {
            // Try alternative method names
            try {
                const scriptHash = this.addressToScriptHash(address);
                const balance = await this.electrumClient.blockchain.scripthash.get_balance(scriptHash);
                return {
                    confirmed: balance.confirmed / 100000000,
                    unconfirmed: balance.unconfirmed / 100000000,
                    total: (balance.confirmed + balance.unconfirmed) / 100000000
                };
            } catch (error2) {
                // Try direct address method as last resort
                const balance = await this.electrumClient.blockchain_address_get_balance(address);
                return {
                    confirmed: balance.confirmed / 100000000,
                    unconfirmed: balance.unconfirmed / 100000000,
                    total: (balance.confirmed + balance.unconfirmed) / 100000000
                };
            }
        }
    }

    // Health check method for monitoring API status
    async getAPIHealthStatus(): Promise<{ [key: string]: { healthy: boolean; lastSuccess: number; failures: number } }> {
        const status: { [key: string]: { healthy: boolean; lastSuccess: number; failures: number } } = {};

        for (const endpoint of this.apiEndpoints) {
            const breaker = this.circuitBreakers[endpoint.name];
            status[endpoint.name] = {
                healthy: endpoint.isHealthy && breaker.state !== 'OPEN',
                lastSuccess: endpoint.lastSuccess,
                failures: breaker.failures
            };
        }

        return status;
    }

    // Create a new wallet with seed phrase
    async createNewWallet(): Promise<{ seed: string; addresses: WalletAddress[] }> {
        try {
            // Generate a new 12-word seed phrase
            const seed = this.generateSeedPhrase();
            this.walletSeed = seed;

            // Generate initial addresses from seed
            const addresses = await this.generateAddressesFromSeed(seed, 5); // Generate 5 addresses
            this.walletAddresses = addresses;

            return {
                seed,
                addresses
            };
        } catch (error: any) {
            throw new Error(`Failed to create new wallet: ${error.message}`);
        }
    }

    // Import wallet from seed phrase
    async importWalletFromSeed(seed: string): Promise<WalletAddress[]> {
        console.log('🚀 IMPORT WALLET FROM SEED STARTED');
        try {
            if (!this.validateSeedPhrase(seed)) {
                throw new Error('Invalid seed phrase');
            }

            this.walletSeed = seed;
            console.log('🌱 About to generate addresses from seed...');
            const addresses = await this.generateAddressesFromSeed(seed, 10);
            this.walletAddresses = addresses;

            return addresses;
        } catch (error: any) {
            throw new Error(`Failed to import wallet: ${error.message}`);
        }
    }

    // Generate new receiving address
    async generateNewAddress(): Promise<WalletAddress> {
        if (!this.walletSeed) {
            throw new Error('No wallet loaded. Create or import a wallet first.');
        }

        const addressIndex = this.walletAddresses.length;
        const newAddress = await this.deriveAddressFromSeed(this.walletSeed, addressIndex);
        this.walletAddresses.push(newAddress);

        return newAddress;
    }

    private generateSeedPhrase(): string {
        // Use BIP39 for proper seed generation
        const entropy = crypto.randomBytes(16); // 128 bits for 12-word seed
        return bip39.entropyToMnemonic(entropy);
    }

    private validateSeedPhrase(seed: string): boolean {
        try {
            // Validate that it's a proper BIP39 mnemonic
            bip39.mnemonicToEntropy(seed);
            return true;
        } catch {
            return false;
        }
    }

    private async generateAddressesFromSeed(seed: string, count: number): Promise<WalletAddress[]> {
        const addresses: WalletAddress[] = [];
        
        for (let i = 0; i < count; i++) {
            const address = await this.deriveAddressFromSeed(seed, i);
            addresses.push(address);
        }

        return addresses;
    }

    private async deriveAddressFromSeed(seed: string, index: number): Promise<WalletAddress> {
        console.log(`🏗️ Deriving address ${index} from seed...`);
        // Use proper BIP44 derivation for Dogecoin
        const seedBuffer = await bip39.mnemonicToSeed(seed);
        const root = bip32Factory.fromSeed(seedBuffer, this.network);
        const account = root.derivePath(`m/44'/3'/0'`); // Dogecoin BIP44 path
        const addressNode = account.derive(0).derive(index); // m/44'/3'/0'/0/index

        const { address } = bitcoin.payments.p2pkh({
            pubkey: Buffer.from(addressNode.publicKey),
            network: this.network
        });

        if (!address) {
            throw new Error('Failed to generate address');
        }

        // Store private key for signing (in production, this should be encrypted)
        this.privateKeys = this.privateKeys || {};
        const wifKey = addressNode.toWIF();
        console.log(`🔐 Storing WIF for ${address}: ${wifKey.substring(0, 10)}...`);
        this.privateKeys[address] = wifKey;
        
        // Also store the raw private key for easier access during signing
        this.rawPrivateKeys = this.rawPrivateKeys || {};
        if (addressNode.privateKey && addressNode.privateKey.length === 32) {
            this.rawPrivateKeys[address] = Buffer.from(addressNode.privateKey);
            console.log(`🔑 Stored raw private key for ${address}: ${addressNode.privateKey.length} bytes`);
        } else {
            console.error(`❌ Invalid private key for ${address}: ${addressNode.privateKey ? addressNode.privateKey.length : 'null'} bytes`);
            this.rawPrivateKeys[address] = null;
        }

        // Get balance for this address if connected
        let balance: WalletBalance = { confirmed: 0, unconfirmed: 0, total: 0 };
        if (this.isConnected) {
            try {
                balance = await this.getBalance(address);
            } catch (error) {
                // If balance check fails, use zero balance
            }
        }

        return {
            address,
            balance,
            isUsed: balance.total > 0,
            derivationPath: `m/44'/3'/0'/0/${index}` // Dogecoin derivation path
        };
    }

    async connect(config: WalletConfig): Promise<void> {
        try {
            this.electrumUrl = config.electrumServer || 'electrum1.cipig.net';
            this.electrumPort = config.port || 10061;

            // Create TCP connection to Electrum server
            this.electrumClient = new (ElectrumClient as any)(
                this.electrumPort,
                this.electrumUrl,
                'tcp'
            );

            // Connect to the server
            await this.electrumClient.connect();

            // Test connection with server version
            const version = await this.electrumClient.server_version('DoginalWallet', '1.4');
            console.log('Connected to Electrum server:', version);

            this.isConnected = true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to connect to Electrum server: ${errorMessage}`);
        }
    }

    async getAddresses(): Promise<WalletAddress[]> {
        if (this.walletAddresses.length === 0) {
            throw new Error('No wallet loaded. Create or import a wallet first.');
        }

        // Update balances for all addresses if connected
        if (this.isConnected) {
            const updatedAddresses: WalletAddress[] = [];
            
            for (const address of this.walletAddresses) {
                try {
                    const balance = await this.getBalance(address.address);
                    updatedAddresses.push({
                        ...address,
                        balance,
                        isUsed: balance.total > 0
                    });
                } catch (error) {
                    // If balance check fails, keep original address info
                    updatedAddresses.push(address);
                }
            }
            
            this.walletAddresses = updatedAddresses;
        }

        return this.walletAddresses;
    }

    async getUTXOs(address: string): Promise<any[]> {
        if (!this.isConnected || !this.electrumClient) {
            throw new Error('Wallet not connected');
        }

        try {
            console.log(`🔍 Getting UTXOs for address: ${address.substring(0, 10)}...`);
            
            // Try Electrum methods first
            let utxos: any[] = await this.getUTXOsFromElectrum(address);
            
            // If Electrum fails, try HTTP APIs as fallback
            if (utxos.length === 0) {
                console.log(`🌐 Electrum UTXO methods failed, trying HTTP API fallback...`);
                utxos = await this.getUTXOsFromHTTPAPI(address);
            }

            const formattedUtxos = utxos.map((utxo: any) => ({
                txid: utxo.tx_hash || utxo.txid,
                vout: utxo.tx_pos !== undefined ? utxo.tx_pos : utxo.vout,
                value: utxo.value,
                height: utxo.height,
                address: address // Add the address for reference
            }));

            console.log(`🎯 Final UTXOs for ${address.substring(0, 10)}...:`, formattedUtxos);
            return formattedUtxos;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Failed to get UTXOs for ${address}:`, errorMessage);
            throw new Error(`Failed to get UTXOs: ${errorMessage}`);
        }
    }

    private async getUTXOsFromElectrum(address: string): Promise<any[]> {
        try {
            // Try different method names for getting UTXOs
            let utxos: any[] = [];

            try {
                // Try blockchain_scripthash_listunspent first
                const scriptHash = this.addressToScriptHash(address);
                console.log(`📋 Trying blockchain_scripthash_listunspent with scriptHash: ${scriptHash.substring(0, 10)}...`);
                utxos = await this.electrumClient.blockchain_scripthash_listunspent(scriptHash);
                console.log(`✅ blockchain_scripthash_listunspent returned ${utxos.length} UTXOs`);
            } catch (e) {
                console.log(`❌ blockchain_scripthash_listunspent failed:`, e instanceof Error ? e.message : 'Unknown error');
                try {
                    // Try blockchain.scripthash.listunspent as alternative
                    const scriptHash = this.addressToScriptHash(address);
                    console.log(`📋 Trying blockchain.scripthash.listunspent...`);
                    utxos = await this.electrumClient.blockchain.scripthash.listunspent(scriptHash);
                    console.log(`✅ blockchain.scripthash.listunspent returned ${utxos.length} UTXOs`);
                } catch (e2) {
                    console.log(`❌ blockchain.scripthash.listunspent failed:`, e2 instanceof Error ? e2.message : 'Unknown error');
                    try {
                        // Try listunspent method
                        console.log(`📋 Trying listunspent...`);
                        utxos = await this.electrumClient.listunspent(address);
                        console.log(`✅ listunspent returned ${utxos.length} UTXOs`);
                    } catch (e3) {
                        console.log(`❌ All Electrum UTXO methods failed`);
                        utxos = [];
                    }
                }
            }

            return utxos;
        } catch (error) {
            console.log(`❌ Electrum UTXO fetch failed:`, error instanceof Error ? error.message : 'Unknown error');
            return [];
        }
    }

    private async getUTXOsFromHTTPAPI(address: string): Promise<any[]> {
        try {
            console.log(`🌐 Trying Trezor API for UTXOs...`);
            
            // Add random delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 500));
            
            const response = await axios.get(`https://doge1.trezor.io/api/v2/utxo/${address}`, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'DoginalWallet/1.0.0',
                    'Accept': 'application/json'
                }
            });

            if (response.data && Array.isArray(response.data)) {
                console.log(`✅ Trezor API returned ${response.data.length} UTXOs`);
                return response.data.map((utxo: any) => ({
                    txid: utxo.txid,
                    vout: utxo.vout,
                    value: parseInt(utxo.value),
                    height: utxo.height || 0,
                    confirmations: utxo.confirmations || 0
                }));
            } else {
                console.log(`⚠️ Trezor API returned unexpected format:`, response.data);
                return [];
            }
        } catch (error) {
            console.log(`❌ HTTP API UTXO fetch failed:`, error instanceof Error ? error.message : 'Unknown error');
            return [];
        }
    }

    // New persistent UTXO detection method
    async getUTXOsPersistent(options: {
        onProgress?: (message: string) => void;
        onBalanceUpdate?: (balance: number, addresses: string[]) => void;
        maxRetries?: number;
        retryDelays?: number[];
        checkAllAddresses?: boolean;
    } = {}): Promise<{ utxos: any[], address: string }> {
        const {
            onProgress,
            onBalanceUpdate,
            maxRetries = 20,
            retryDelays = [5000, 10000, 30000, 60000], // 5s, 10s, 30s, 60s
            checkAllAddresses = true
        } = options;

        let retryCount = 0;
        let allAddresses: string[] = [];

        // Get all wallet addresses if checking all
        if (checkAllAddresses) {
            try {
                const walletAddresses = await this.getAddresses();
                allAddresses = walletAddresses.map(addr => addr.address);
                onProgress?.(`🔍 Checking ${allAddresses.length} wallet addresses for UTXOs...`);
                
                // Prioritize addresses with known balances
                allAddresses.sort((a, b) => {
                    const balanceA = walletAddresses.find(addr => addr.address === a)?.balance.total || 0;
                    const balanceB = walletAddresses.find(addr => addr.address === b)?.balance.total || 0;
                    return balanceB - balanceA; // Descending order
                });
                
                onProgress?.(`💰 Address priority: ${allAddresses.map((addr, i) => {
                    const balance = walletAddresses.find(a => a.address === addr)?.balance.total || 0;
                    return `${addr.substring(0, 8)}...(${balance} DOGE)`;
                }).slice(0, 3).join(', ')}`);
                
            } catch (error) {
                onProgress?.('⚠️ Could not get wallet addresses, checking current address only');
                allAddresses = [this.walletAddresses[0]?.address || ''];
            }
        } else {
            allAddresses = [this.walletAddresses[0]?.address || ''];
        }

        while (retryCount < maxRetries) {
            try {
                // Check all addresses for UTXOs
                for (const address of allAddresses) {
                    if (!address) continue;

                    onProgress?.(`🔄 Checking address: ${address.substring(0, 10)}... for UTXOs`);

                    // First check if this address has a balance
                    try {
                        const balance = await this.getBalance(address);
                        onProgress?.(`💰 Address ${address.substring(0, 10)}... has balance: ${balance.total} DOGE`);
                        
                        if (balance.total === 0) {
                            onProgress?.(`⏭️ Skipping address with zero balance`);
                            continue;
                        }
                    } catch (balanceError) {
                        onProgress?.(`⚠️ Could not check balance for ${address.substring(0, 10)}...`);
                    }

                    const utxos = await this.getUTXOs(address);

                    if (utxos.length > 0) {
                        onProgress?.(`✅ Found ${utxos.length} UTXO(s) on address: ${address.substring(0, 10)}...`);
                        return { utxos, address };
                    } else {
                        onProgress?.(`📭 No UTXOs found on address: ${address.substring(0, 10)}...`);
                    }
                }

                // No UTXOs found on any address
                retryCount++;

                if (retryCount >= maxRetries) {
                    throw new Error(`No UTXOs found after ${maxRetries} attempts. Please send DOGE to one of your wallet addresses.`);
                }

                // Update balance information
                if (onBalanceUpdate) {
                    try {
                        let totalBalance = 0;
                        const addressBalances: string[] = [];

                        for (const address of allAddresses) {
                            if (!address) continue;
                            const balance = await this.getBalance(address);
                            totalBalance += balance.confirmed;
                            if (balance.confirmed > 0) {
                                addressBalances.push(`${address.substring(0, 10)}...: ${balance.confirmed} DOGE`);
                            }
                        }

                        onBalanceUpdate(totalBalance, addressBalances);
                    } catch (balanceError) {
                        onProgress?.('⚠️ Could not check balance');
                    }
                }

                // Calculate delay for next retry
                const delayIndex = Math.min(retryCount - 1, retryDelays.length - 1);
                const delay = retryDelays[delayIndex];

                onProgress?.(`⏳ No UTXOs found. Retrying in ${delay / 1000} seconds... (${retryCount}/${maxRetries})`);
                onProgress?.(`💰 Send DOGE to any of these addresses to continue:`);
                allAddresses.forEach(addr => {
                    if (addr) onProgress?.(`   ${addr}`);
                });

                // Wait before next retry
                await new Promise(resolve => setTimeout(resolve, delay));

            } catch (error) {
                if (error instanceof Error && error.message.includes('No UTXOs found after')) {
                    throw error; // Re-throw our custom error
                }

                retryCount++;
                const delayIndex = Math.min(retryCount - 1, retryDelays.length - 1);
                const delay = retryDelays[delayIndex];

                onProgress?.(`❌ Error checking UTXOs: ${error instanceof Error ? error.message : 'Unknown error'}`);
                onProgress?.(`⏳ Retrying in ${delay / 1000} seconds... (${retryCount}/${maxRetries})`);

                if (retryCount >= maxRetries) {
                    throw new Error(`Failed to get UTXOs after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }

                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw new Error('Maximum retries exceeded');
    }

    async getTransactionHex(txid: string): Promise<string> {
        console.log(`🔍 Getting transaction hex for: ${txid.substring(0, 10)}...`);
        
        if (!this.isConnected || !this.electrumClient) {
            throw new Error('Wallet not connected');
        }

        try {
            // Try Electrum methods first
            let txHex = await this.getTransactionHexFromElectrum(txid);
            
            // If Electrum fails, try HTTP APIs as fallback
            if (!txHex) {
                console.log(`🌐 Electrum transaction methods failed, trying HTTP API fallback...`);
                txHex = await this.getTransactionHexFromHTTPAPI(txid);
            }

            if (!txHex) {
                throw new Error('All transaction hex methods failed');
            }

            console.log(`✅ Got transaction hex (${txHex.length} chars) for ${txid.substring(0, 10)}...`);
            return txHex;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Failed to get transaction hex for ${txid}:`, errorMessage);
            throw new Error(`Failed to get transaction hex: ${errorMessage}`);
        }
    }

    private async getTransactionHexFromElectrum(txid: string): Promise<string | null> {
        try {
            // Try different method names for getting transaction hex
            let txHex: string | null = null;

            try {
                console.log(`📋 Trying blockchainTransaction_get...`);
                txHex = await this.electrumClient.blockchainTransaction_get(txid);
                console.log(`✅ blockchainTransaction_get succeeded`);
            } catch (e) {
                console.log(`❌ blockchainTransaction_get failed:`, e instanceof Error ? e.message : 'Unknown error');
                try {
                    console.log(`📋 Trying blockchain_transaction_get...`);
                    txHex = await this.electrumClient.blockchain_transaction_get(txid);
                    console.log(`✅ blockchain_transaction_get succeeded`);
                } catch (e2) {
                    console.log(`❌ blockchain_transaction_get failed:`, e2 instanceof Error ? e2.message : 'Unknown error');
                    try {
                        console.log(`📋 Trying getTransaction...`);
                        txHex = await this.electrumClient.getTransaction(txid);
                        console.log(`✅ getTransaction succeeded`);
                    } catch (e3) {
                        console.log(`❌ All Electrum transaction methods failed`);
                        txHex = null;
                    }
                }
            }

            return txHex;
        } catch (error) {
            console.log(`❌ Electrum transaction hex fetch failed:`, error instanceof Error ? error.message : 'Unknown error');
            return null;
        }
    }

    private async getTransactionHexFromHTTPAPI(txid: string): Promise<string | null> {
        try {
            console.log(`🌐 Trying Trezor API for transaction hex...`);
            
            // Add random delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 500));
            
            const response = await axios.get(`https://doge1.trezor.io/api/v2/tx/${txid}`, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'DoginalWallet/1.0.0',
                    'Accept': 'application/json'
                }
            });

            if (response.data && response.data.hex) {
                console.log(`✅ Trezor API returned transaction hex (${response.data.hex.length} chars)`);
                return response.data.hex;
            } else {
                console.log(`⚠️ Trezor API returned unexpected format (no hex field):`, Object.keys(response.data || {}));
                return null;
            }
        } catch (error) {
            console.log(`❌ HTTP API transaction hex fetch failed:`, error instanceof Error ? error.message : 'Unknown error');
            return null;
        }
    }

    async createTransaction(inputs: any[], outputs: any[], privateKeys: string[]): Promise<string> {
        // Use modern bitcoinjs-lib API
        const psbt = new bitcoin.Psbt({ network: this.network });

        // Add inputs
        for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i];
            psbt.addInput({
                hash: input.txid,
                index: input.vout,
                nonWitnessUtxo: Buffer.from(input.txHex, 'hex')
            });
        }

        // Add outputs
        outputs.forEach(output => {
            if (output.script) {
                // Handle script-based outputs (for inscriptions)
                psbt.addOutput({
                    script: Buffer.from(output.script, 'hex'),
                    value: Math.floor(output.value * 100000000) // Convert DOGE to satoshis
                });
            } else {
                // Handle address-based outputs
                psbt.addOutput({
                    address: output.address,
                    value: Math.floor(output.value * 100000000) // Convert DOGE to satoshis
                });
            }
        });

                // Sign inputs
        inputs.forEach((input, index) => {
            const privateKeyWIF = privateKeys[index] || this.privateKeys[input.address];
            let rawPrivateKey = this.rawPrivateKeys ? this.rawPrivateKeys[input.address] : null;
            
            console.log(`🔑 Signing input ${index}, privateKeyWIF:`, privateKeyWIF ? `${privateKeyWIF.substring(0, 10)}...` : 'undefined');
            console.log(`🔑 Raw private key available:`, rawPrivateKey ? `${rawPrivateKey.length} bytes` : 'undefined');
            
            // If no raw private key found, try to re-derive it from the seed
            if (!rawPrivateKey && this.walletSeed) {
                console.log(`🔄 Re-deriving private key for address: ${input.address}`);
                try {
                    // Find which address index this corresponds to
                    const addressIndex = this.walletAddresses?.findIndex(addr => addr.address === input.address);
                    if (addressIndex !== -1) {
                        // Re-derive the private key for this address
                        const seedBuffer = bip39.mnemonicToSeedSync(this.walletSeed);
                        const root = bip32Factory.fromSeed(seedBuffer, this.network);
                        const account = root.derivePath(`m/44'/3'/0'`);
                        const addressNode = account.derive(0).derive(addressIndex);
                        
                        if (addressNode.privateKey && addressNode.privateKey.length === 32) {
                            rawPrivateKey = Buffer.from(addressNode.privateKey);
                            // Store it for future use
                            this.rawPrivateKeys = this.rawPrivateKeys || {};
                            this.rawPrivateKeys[input.address] = rawPrivateKey;
                            console.log(`🔄 Re-derived private key: ${rawPrivateKey.length} bytes`);
                        } else {
                            console.error(`❌ Failed to derive valid private key for address ${input.address}`);
                        }
                    } else {
                        console.error(`❌ Address ${input.address} not found in wallet addresses`);
                    }
                } catch (error) {
                    console.warn(`Failed to re-derive private key:`, error);
                }
            }
            
            if (rawPrivateKey && rawPrivateKey.length === 32) {
                try {
                    // Use the raw private key directly
                    const privateKeyBytes = rawPrivateKey;
                    
                    console.log(`🔍 Private key bytes length:`, privateKeyBytes.length);
                    console.log(`🔍 Private key buffer:`, privateKeyBytes.toString('hex').substring(0, 20) + '...');
                    
                    // Validate the private key is not all zeros
                    const isZeroKey = privateKeyBytes.every(byte => byte === 0);
                    if (isZeroKey) {
                        throw new Error('Private key is all zeros');
                    }
                    
                    // Create ECPair from raw private key (not BIP32)
                    const keyPair = ECPair.fromPrivateKey(privateKeyBytes, { network: this.network });

                    // Convert to signer format expected by PSBT
                    const signer = {
                        publicKey: Buffer.from(keyPair.publicKey),
                        sign: (hash: Buffer) => {
                            return Buffer.from(keyPair.sign(hash));
                        }
                    };

                    psbt.signInput(index, signer);
                    console.log(`✅ Successfully signed input ${index}`);
                } catch (error) {
                    console.warn(`Failed to sign input ${index}:`, error);
                    throw new Error(`Failed to sign transaction input ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            } else {
                const keyInfo = rawPrivateKey ? `invalid length (${rawPrivateKey.length})` : 'not found';
                console.warn(`No valid raw private key available for input ${index}, address: ${input.address} - ${keyInfo}`);
                throw new Error(`No valid private key available for input ${index} (${keyInfo})`);
            }
        });

        psbt.finalizeAllInputs();
        return psbt.extractTransaction().toHex();
    }

    async broadcastTransaction(txHex: string): Promise<string> {
        if (!this.isConnected || !this.electrumClient) {
            throw new Error('Wallet not connected');
        }

        console.log('🚀 Broadcasting transaction...');

        // Try Electrum methods first
        try {
            let txid;

            console.log('🔗 Trying blockchainTransaction_broadcast...');
            try {
                txid = await this.electrumClient.blockchainTransaction_broadcast(txHex);
                console.log('✅ blockchainTransaction_broadcast succeeded');
                return txid;
            } catch (e) {
                console.log('❌ blockchainTransaction_broadcast failed:', e instanceof Error ? e.message : 'Unknown error');
            }

            console.log('🔗 Trying blockchain_transaction_broadcast...');
            try {
                txid = await this.electrumClient.blockchain_transaction_broadcast(txHex);
                console.log('✅ blockchain_transaction_broadcast succeeded');
                return txid;
            } catch (e) {
                console.log('❌ blockchain_transaction_broadcast failed:', e instanceof Error ? e.message : 'Unknown error');
            }

            console.log('🔗 Trying broadcastTransaction...');
            try {
                txid = await this.electrumClient.broadcastTransaction(txHex);
                console.log('✅ broadcastTransaction succeeded');
                return txid;
            } catch (e) {
                console.log('❌ broadcastTransaction failed:', e instanceof Error ? e.message : 'Unknown error');
            }

            console.log('❌ All Electrum broadcast methods failed');
        } catch (error) {
            console.log('❌ Electrum broadcast error:', error instanceof Error ? error.message : 'Unknown error');
        }

        // Fallback to HTTP API broadcast
        console.log('🌐 Electrum broadcast methods failed, trying HTTP API fallback...');
        
        try {
            // Try Trezor API for broadcasting using Node.js https module
            console.log('🌐 Trying Trezor API for broadcast...');
            
            const trezorResult = await new Promise<string>((resolve, reject) => {
                const postData = JSON.stringify({ hex: txHex });
                const url = new URL('https://doge1.trezor.io/api/v2/sendtx');
                
                const options = {
                    hostname: url.hostname,
                    port: url.port || 443,
                    path: url.pathname,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData)
                    }
                };

                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => {
                        try {
                            if (res.statusCode !== 200) {
                                reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                                return;
                            }
                            
                            const result = JSON.parse(data);
                            if (result.result) {
                                resolve(result.result);
                            } else {
                                reject(new Error('Invalid response format'));
                            }
                        } catch (error) {
                            reject(error);
                        }
                    });
                });

                req.on('error', reject);
                req.write(postData);
                req.end();
            });
            
            console.log('✅ Trezor API broadcast succeeded');
            return trezorResult;
            
        } catch (error) {
            console.log('❌ Trezor API broadcast failed:', error instanceof Error ? error.message : 'Unknown error');
        }

        // Try BlockCypher API as final fallback using Node.js https module
        try {
            console.log('🌐 Trying BlockCypher API for broadcast...');
            
            const blockCypherResult = await new Promise<string>((resolve, reject) => {
                const postData = JSON.stringify({ tx: txHex });
                const url = new URL('https://api.blockcypher.com/v1/doge/main/txs/push');
                
                const options = {
                    hostname: url.hostname,
                    port: url.port || 443,
                    path: url.pathname,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData)
                    }
                };

                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => {
                        try {
                            // HTTP 200 and 201 are both success codes
                            if (res.statusCode !== 200 && res.statusCode !== 201) {
                                reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                                return;
                            }
                            
                            const result = JSON.parse(data);
                            if (result.tx && result.tx.hash) {
                                resolve(result.tx.hash);
                            } else {
                                reject(new Error('Invalid response format'));
                            }
                        } catch (error) {
                            reject(error);
                        }
                    });
                });

                req.on('error', reject);
                req.write(postData);
                req.end();
            });
            
            console.log('✅ BlockCypher API broadcast succeeded');
            return blockCypherResult;
            
        } catch (error) {
            console.log('❌ BlockCypher API broadcast failed:', error instanceof Error ? error.message : 'Unknown error');
        }

        // Try ChainSo API V3 as additional fallback
        try {
            console.log('🌐 Trying ChainSo API V3 for broadcast...');
            
            const chainSoResult = await new Promise<string>((resolve, reject) => {
                const postData = JSON.stringify({ 
                    network: 'DOGE',
                    tx_hex: txHex 
                });
                const url = new URL('https://chain.so/api/v3/send_tx');
                
                const options = {
                    hostname: url.hostname,
                    port: url.port || 443,
                    path: url.pathname,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData)
                    }
                };

                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => {
                        try {
                            if (res.statusCode !== 200 && res.statusCode !== 201) {
                                reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                                return;
                            }
                            
                            const result = JSON.parse(data);
                            if (result.status === 'success' && result.data && result.data.txid) {
                                resolve(result.data.txid);
                            } else {
                                reject(new Error(`ChainSo V3 error: ${result.status || 'Unknown error'}`));
                            }
                        } catch (error) {
                            reject(error);
                        }
                    });
                });

                req.on('error', reject);
                req.write(postData);
                req.end();
            });
            
            console.log('✅ ChainSo API V3 broadcast succeeded');
            return chainSoResult;
            
        } catch (error) {
            console.log('❌ ChainSo API V3 broadcast failed:', error instanceof Error ? error.message : 'Unknown error');
        }

        // Try SoChain API as alternative endpoint
        try {
            console.log('🌐 Trying SoChain API for broadcast...');
            
            const soChainResult = await new Promise<string>((resolve, reject) => {
                const postData = `tx_hex=${encodeURIComponent(txHex)}`;
                const url = new URL('https://sochain.com/api/v2/send_tx/DOGE');
                
                const options = {
                    hostname: url.hostname,
                    port: url.port || 443,
                    path: url.pathname,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Content-Length': Buffer.byteLength(postData)
                    }
                };

                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => {
                        try {
                            if (res.statusCode !== 200 && res.statusCode !== 201) {
                                reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                                return;
                            }
                            
                            const result = JSON.parse(data);
                            if (result.status === 'success' && result.data && result.data.txid) {
                                resolve(result.data.txid);
                            } else {
                                reject(new Error(`SoChain error: ${result.status || 'Unknown error'}`));
                            }
                        } catch (error) {
                            reject(error);
                        }
                    });
                });

                req.on('error', reject);
                req.write(postData);
                req.end();
            });
            
            console.log('✅ SoChain API broadcast succeeded');
            return soChainResult;
            
        } catch (error) {
            console.log('❌ SoChain API broadcast failed:', error instanceof Error ? error.message : 'Unknown error');
        }

        // Try DogeChain API as final fallback
        try {
            console.log('🌐 Trying DogeChain API for broadcast...');
            
            const dogeChainResult = await new Promise<string>((resolve, reject) => {
                const postData = JSON.stringify({ rawtx: txHex });
                const url = new URL('https://dogechain.info/api/v1/pushtx');
                
                const options = {
                    hostname: url.hostname,
                    port: url.port || 443,
                    path: url.pathname,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData)
                    }
                };

                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => {
                        try {
                            if (res.statusCode !== 200 && res.statusCode !== 201) {
                                reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                                return;
                            }
                            
                            // DogeChain returns just the txid as text
                            const txid = data.trim();
                            if (txid && txid.length === 64) {
                                resolve(txid);
                            } else {
                                reject(new Error('Invalid txid format from DogeChain'));
                            }
                        } catch (error) {
                            reject(error);
                        }
                    });
                });

                req.on('error', reject);
                req.write(postData);
                req.end();
            });
            
            console.log('✅ DogeChain API broadcast succeeded');
            return dogeChainResult;
            
        } catch (error) {
            console.log('❌ DogeChain API broadcast failed:', error instanceof Error ? error.message : 'Unknown error');
        }

        throw new Error('Failed to broadcast transaction: All broadcast methods failed');
    }

    // Method to verify if UTXOs are still unspent
    async verifyUTXOsUnspent(utxos: UTXO[]): Promise<UTXO[]> {
        console.log(`🔍 Verifying ${utxos.length} UTXOs are still unspent...`);
        const validUTXOs: UTXO[] = [];
        
        for (const utxo of utxos) {
            try {
                // Check against current blockchain state
                const isValid = await new Promise<boolean>((resolve) => {
                    const url = new URL(`https://doge1.trezor.io/api/v2/utxo/${utxo.address}`);
                    
                    const options = {
                        hostname: url.hostname,
                        port: url.port || 443,
                        path: url.pathname,
                        method: 'GET'
                    };

                    const req = https.request(options, (res) => {
                        let data = '';
                        res.on('data', (chunk) => data += chunk);
                        res.on('end', () => {
                            try {
                                if (res.statusCode !== 200) {
                                    console.log(`⚠️ Could not verify UTXO ${utxo.txid.substring(0, 8)}...${utxo.vout}`);
                                    resolve(false);
                                    return;
                                }
                                
                                const currentUTXOs = JSON.parse(data);
                                const exists = currentUTXOs.some((current: any) => 
                                    current.txid === utxo.txid && current.vout === utxo.vout
                                );
                                resolve(exists);
                            } catch (error) {
                                console.log(`❌ Error verifying UTXO ${utxo.txid.substring(0, 8)}...${utxo.vout}`);
                                resolve(false);
                            }
                        });
                    });

                    req.on('error', () => resolve(false));
                    req.setTimeout(5000, () => {
                        req.destroy();
                        resolve(false);
                    });
                    req.end();
                });
                
                if (isValid) {
                    validUTXOs.push(utxo);
                    console.log(`✅ UTXO ${utxo.txid.substring(0, 8)}...${utxo.vout} is valid (${utxo.value/100000000} DOGE)`);
                } else {
                    console.log(`❌ UTXO ${utxo.txid.substring(0, 8)}...${utxo.vout} is already spent or invalid`);
                }
            } catch (error) {
                console.log(`⚠️ Could not verify UTXO ${utxo.txid.substring(0, 8)}...${utxo.vout}, excluding`);
            }
        }
        
        console.log(`📊 Verified UTXOs: ${validUTXOs.length}/${utxos.length} are still unspent`);
        return validUTXOs;
    }

    async estimateFee(inputCount: number, outputCount: number, feeRate: number = 10): Promise<number> {
        // Estimate transaction size (in bytes)
        // Dogecoin uses P2PKH addresses (25 bytes each)
        const inputSize = inputCount * 148; // P2PKH input size
        const outputSize = outputCount * 34; // P2PKH output size
        const overhead = 10; // Transaction overhead
        const estimatedSize = inputSize + outputSize + overhead;

        // Use provided feeRate or default to 10 sat/byte for Dogecoin
        const actualFeeRate = feeRate || 10;

        // Return fee in DOGE (convert from satoshis)
        const feeInSatoshis = estimatedSize * actualFeeRate;
        return feeInSatoshis / 100000000;
    }

    async getPrivateKeyForAddress(address: string): Promise<string | null> {
        return this.privateKeys[address] || null;
    }

    private addressToScriptHash(address: string): string {
        try {
            const decoded = bitcoin.address.toOutputScript(address, this.network);
            const hash = crypto.createHash('sha256').update(decoded).digest();
            return hash.reverse().toString('hex');
        } catch (error) {
            throw new Error(`Invalid address: ${address}`);
        }
    }

    disconnect(): void {
        if (this.electrumClient) {
            try {
                this.electrumClient.close();
            } catch (error) {
                console.warn('Error closing Electrum connection:', error);
            }
            this.electrumClient = null;
        }
        this.isConnected = false;
        this.electrumUrl = '';
    }
}