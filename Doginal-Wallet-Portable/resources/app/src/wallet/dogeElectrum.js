"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DogeElectrumWallet = void 0;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
const bip39 = __importStar(require("bip39"));
// Import required modules
const bip32 = __importStar(require("bip32"));
const ecc = __importStar(require("tiny-secp256k1"));
const ECPair = require('ecpair');
// Create BIP32 factory with ECC library
const bip32Factory = bip32.BIP32Factory(ecc);
// Import the electrum client
const ElectrumClient = require('electrum-client');
class DogeElectrumWallet {
    constructor() {
        this.electrumUrl = '';
        this.electrumPort = 50001;
        this.isConnected = false;
        this.walletSeed = '';
        this.walletAddresses = [];
        this.electrumClient = null;
        this.privateKeys = {};
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
    }
    // Create a new wallet with seed phrase
    async createNewWallet() {
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
        }
        catch (error) {
            throw new Error(`Failed to create new wallet: ${error.message}`);
        }
    }
    // Import wallet from seed phrase
    async importWalletFromSeed(seed) {
        try {
            if (!this.validateSeedPhrase(seed)) {
                throw new Error('Invalid seed phrase');
            }
            this.walletSeed = seed;
            const addresses = await this.generateAddressesFromSeed(seed, 10);
            this.walletAddresses = addresses;
            return addresses;
        }
        catch (error) {
            throw new Error(`Failed to import wallet: ${error.message}`);
        }
    }
    // Generate new receiving address
    async generateNewAddress() {
        if (!this.walletSeed) {
            throw new Error('No wallet loaded. Create or import a wallet first.');
        }
        const addressIndex = this.walletAddresses.length;
        const newAddress = await this.deriveAddressFromSeed(this.walletSeed, addressIndex);
        this.walletAddresses.push(newAddress);
        return newAddress;
    }
    generateSeedPhrase() {
        // Use BIP39 for proper seed generation
        const entropy = crypto.randomBytes(16); // 128 bits for 12-word seed
        return bip39.entropyToMnemonic(entropy);
    }
    validateSeedPhrase(seed) {
        try {
            // Validate that it's a proper BIP39 mnemonic
            bip39.mnemonicToEntropy(seed);
            return true;
        }
        catch {
            return false;
        }
    }
    async generateAddressesFromSeed(seed, count) {
        const addresses = [];
        for (let i = 0; i < count; i++) {
            const address = await this.deriveAddressFromSeed(seed, i);
            addresses.push(address);
        }
        return addresses;
    }
    async deriveAddressFromSeed(seed, index) {
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
        this.privateKeys[address] = addressNode.toWIF();
        // Get balance for this address if connected
        let balance = { confirmed: 0, unconfirmed: 0, total: 0 };
        if (this.isConnected) {
            try {
                balance = await this.getBalance(address);
            }
            catch (error) {
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
    async connect(config) {
        try {
            this.electrumUrl = config.electrumServer || 'electrum1.cipig.net';
            this.electrumPort = config.port || 10061;
            // Create TCP connection to Electrum server
            this.electrumClient = new ElectrumClient(this.electrumPort, this.electrumUrl, 'tcp');
            // Connect to the server
            await this.electrumClient.connect();
            // Test connection with server version
            const version = await this.electrumClient.server_version('DoginalWallet', '1.4');
            console.log('Connected to Electrum server:', version);
            this.isConnected = true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to connect to Electrum server: ${errorMessage}`);
        }
    }
    async getBalance(address) {
        if (!this.isConnected || !this.electrumClient) {
            throw new Error('Wallet not connected');
        }
        try {
            // Try BlockCypher API first (more reliable than dogechain.info)
            console.log('Trying BlockCypher API for balance...');
            const response = await axios_1.default.get(`https://api.blockcypher.com/v1/doge/main/addrs/${address}/balance`);
            const data = response.data;
            if (data && typeof data.balance === 'number') {
                const balance = data.balance / 100000000; // Convert satoshis to DOGE
                const unconfirmed = (data.unconfirmed_balance || 0) / 100000000;
                console.log('BlockCypher balance:', balance, 'confirmed,', unconfirmed, 'unconfirmed');
                return {
                    confirmed: balance,
                    unconfirmed: unconfirmed,
                    total: balance + unconfirmed
                };
            }
            else {
                throw new Error('BlockCypher API returned invalid data');
            }
        }
        catch (httpError) {
            console.warn('BlockCypher API failed, trying Electrum:', httpError.message);
            // Fallback to Electrum with correct method names
            try {
                // Use the correct Electrum method for Dogecoin
                const balance = await this.electrumClient.blockchainAddress_getBalance(address);
                return {
                    confirmed: balance.confirmed / 100000000, // Convert satoshis to DOGE
                    unconfirmed: balance.unconfirmed / 100000000,
                    total: (balance.confirmed + balance.unconfirmed) / 100000000
                };
            }
            catch (electrumError) {
                console.warn('Electrum direct method failed, trying script hash method:', electrumError.message);
                try {
                    // Try with script hash method
                    const scriptHash = this.addressToScriptHash(address);
                    const balance = await this.electrumClient.blockchainScriptHash_getBalance(scriptHash);
                    return {
                        confirmed: balance.confirmed / 100000000,
                        unconfirmed: balance.unconfirmed / 100000000,
                        total: (balance.confirmed + balance.unconfirmed) / 100000000
                    };
                }
                catch (scriptError) {
                    console.warn('Script hash method also failed:', scriptError.message);
                    // Last resort: try to get UTXOs and calculate balance
                    try {
                        const scriptHash = this.addressToScriptHash(address);
                        const utxos = await this.electrumClient.blockchainScriptHash_listUnspent(scriptHash);
                        const totalSatoshis = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
                        console.log('Calculated balance from UTXOs:', totalSatoshis / 100000000, 'DOGE');
                        return {
                            confirmed: totalSatoshis / 100000000,
                            unconfirmed: 0,
                            total: totalSatoshis / 100000000
                        };
                    }
                    catch (utxoError) {
                        console.warn('All balance methods failed:', utxoError.message);
                        return {
                            confirmed: 0,
                            unconfirmed: 0,
                            total: 0
                        };
                    }
                }
            }
        }
    }
    async getAddresses() {
        if (this.walletAddresses.length === 0) {
            throw new Error('No wallet loaded. Create or import a wallet first.');
        }
        // Update balances for all addresses if connected
        if (this.isConnected) {
            const updatedAddresses = [];
            for (const address of this.walletAddresses) {
                try {
                    const balance = await this.getBalance(address.address);
                    updatedAddresses.push({
                        ...address,
                        balance,
                        isUsed: balance.total > 0
                    });
                }
                catch (error) {
                    // If balance check fails, keep original address info
                    updatedAddresses.push(address);
                }
            }
            this.walletAddresses = updatedAddresses;
        }
        return this.walletAddresses;
    }
    async getUTXOs(address) {
        if (!this.isConnected || !this.electrumClient) {
            throw new Error('Wallet not connected');
        }
        try {
            // Try different method names for getting UTXOs
            let utxos;
            try {
                // Try blockchain_scripthash_listunspent first
                const scriptHash = this.addressToScriptHash(address);
                utxos = await this.electrumClient.blockchain_scripthash_listunspent(scriptHash);
            }
            catch (e) {
                try {
                    // Try blockchain_address_listunspent as fallback
                    utxos = await this.electrumClient.blockchain_address_listunspent(address);
                }
                catch (e2) {
                    // Try blockchain_utxo_get as last resort
                    try {
                        const scriptHash = this.addressToScriptHash(address);
                        const utxoList = await this.electrumClient.blockchain_scripthash_get_utxos(scriptHash);
                        utxos = utxoList || [];
                    }
                    catch (e3) {
                        utxos = [];
                    }
                }
            }
            return utxos.map((utxo) => ({
                txid: utxo.tx_hash || utxo.txid,
                vout: utxo.tx_pos || utxo.vout,
                value: utxo.value,
                height: utxo.height
            }));
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to get UTXOs: ${errorMessage}`);
        }
    }
    // New persistent UTXO detection method
    async getUTXOsPersistent(options = {}) {
        const { onProgress, onBalanceUpdate, maxRetries = 20, retryDelays = [5000, 10000, 30000, 60000], // 5s, 10s, 30s, 60s
        checkAllAddresses = true } = options;
        let retryCount = 0;
        let allAddresses = [];
        // Get all wallet addresses if checking all
        if (checkAllAddresses) {
            try {
                const walletAddresses = await this.getAddresses();
                allAddresses = walletAddresses.map(addr => addr.address);
                onProgress?.(`🔍 Checking ${allAddresses.length} wallet addresses for UTXOs...`);
            }
            catch (error) {
                onProgress?.('⚠️ Could not get wallet addresses, checking current address only');
                allAddresses = [this.walletAddresses[0]?.address || ''];
            }
        }
        else {
            allAddresses = [this.walletAddresses[0]?.address || ''];
        }
        while (retryCount < maxRetries) {
            try {
                // Check all addresses for UTXOs
                for (const address of allAddresses) {
                    if (!address)
                        continue;
                    onProgress?.(`🔄 Checking address: ${address.substring(0, 10)}...`);
                    const utxos = await this.getUTXOs(address);
                    if (utxos.length > 0) {
                        onProgress?.(`✅ Found ${utxos.length} UTXO(s) on address: ${address.substring(0, 10)}...`);
                        return { utxos, address };
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
                        const addressBalances = [];
                        for (const address of allAddresses) {
                            if (!address)
                                continue;
                            const balance = await this.getBalance(address);
                            totalBalance += balance.confirmed;
                            if (balance.confirmed > 0) {
                                addressBalances.push(`${address.substring(0, 10)}...: ${balance.confirmed} DOGE`);
                            }
                        }
                        onBalanceUpdate(totalBalance, addressBalances);
                    }
                    catch (balanceError) {
                        onProgress?.('⚠️ Could not check balance');
                    }
                }
                // Calculate delay for next retry
                const delayIndex = Math.min(retryCount - 1, retryDelays.length - 1);
                const delay = retryDelays[delayIndex];
                onProgress?.(`⏳ No UTXOs found. Retrying in ${delay / 1000} seconds... (${retryCount}/${maxRetries})`);
                onProgress?.(`💰 Send DOGE to any of these addresses to continue:`);
                allAddresses.forEach(addr => {
                    if (addr)
                        onProgress?.(`   ${addr}`);
                });
                // Wait before next retry
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            catch (error) {
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
    async getTransactionHex(txid) {
        if (!this.isConnected || !this.electrumClient) {
            throw new Error('Wallet not connected');
        }
        try {
            // Try different method names for getting transaction hex
            let txHex;
            try {
                txHex = await this.electrumClient.blockchainTransaction_get(txid);
            }
            catch (e) {
                try {
                    txHex = await this.electrumClient.blockchain_transaction_get(txid);
                }
                catch (e2) {
                    txHex = await this.electrumClient.getTransaction(txid);
                }
            }
            return txHex;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to get transaction hex: ${errorMessage}`);
        }
    }
    async createTransaction(inputs, outputs, privateKeys) {
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
            }
            else {
                // Handle address-based outputs
                psbt.addOutput({
                    address: output.address,
                    value: Math.floor(output.value * 100000000) // Convert DOGE to satoshis
                });
            }
        });
        // Sign inputs
        inputs.forEach((input, index) => {
            const privateKey = privateKeys[index] || this.privateKeys[input.address];
            if (privateKey) {
                const keyPair = ECPair.fromWIF(privateKey, this.network);
                psbt.signInput(index, keyPair);
            }
            else {
                throw new Error(`No private key available for input ${index}`);
            }
        });
        psbt.finalizeAllInputs();
        return psbt.extractTransaction().toHex();
    }
    async broadcastTransaction(txHex) {
        if (!this.isConnected || !this.electrumClient) {
            throw new Error('Wallet not connected');
        }
        try {
            // Try different method names for broadcasting
            let txid;
            try {
                txid = await this.electrumClient.blockchainTransaction_broadcast(txHex);
            }
            catch (e) {
                try {
                    txid = await this.electrumClient.blockchain_transaction_broadcast(txHex);
                }
                catch (e2) {
                    txid = await this.electrumClient.broadcastTransaction(txHex);
                }
            }
            return txid;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to broadcast transaction: ${errorMessage}`);
        }
    }
    async estimateFee(inputCount, outputCount, feeRate = 1000) {
        // Estimate transaction size (in bytes)
        const estimatedSize = (inputCount * 148) + (outputCount * 34) + 10;
        // Return fee in DOGE
        return (estimatedSize * feeRate) / 100000000;
    }
    async getPrivateKeyForAddress(address) {
        return this.privateKeys[address] || null;
    }
    addressToScriptHash(address) {
        try {
            const decoded = bitcoin.address.toOutputScript(address, this.network);
            const hash = crypto.createHash('sha256').update(decoded).digest();
            return hash.reverse().toString('hex');
        }
        catch (error) {
            throw new Error(`Invalid address: ${address}`);
        }
    }
    disconnect() {
        if (this.electrumClient) {
            try {
                this.electrumClient.close();
            }
            catch (error) {
                console.warn('Error closing Electrum connection:', error);
            }
            this.electrumClient = null;
        }
        this.isConnected = false;
        this.electrumUrl = '';
    }
}
exports.DogeElectrumWallet = DogeElectrumWallet;
