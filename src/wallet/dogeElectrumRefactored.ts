/**
 * Refactored Doge Electrum Wallet
 * Organized with clean separation of concerns using services
 */

import * as bitcoin from 'bitcoinjs-lib';
import * as crypto from 'crypto';
import * as bip39 from 'bip39';
import * as bip32 from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as wif from 'wif';

import { WalletConfig, WalletBalance, WalletAddress, ElectrumTransaction } from '../types';
import { DOGECOIN_NETWORK, BIP44_PATH, WALLET_CONFIG, TRANSACTION_CONFIG } from '../constants';
import { ElectrumService, HTTPAPIService } from '../services';

// Create BIP32 factory
const bip32Factory = bip32.BIP32Factory(ecc);

export class DogeElectrumWalletRefactored {
  private network = DOGECOIN_NETWORK;
  private isConnected = false;
  private walletSeed = '';
  private walletAddresses: WalletAddress[] = [];
  private privateKeys: { [address: string]: string } = {};
  private rawPrivateKeys: { [address: string]: Buffer | null } = {};
  
  // Services
  private electrumService: ElectrumService;
  private httpApiService: HTTPAPIService;
  
  // Caching
  private balanceCache: { [address: string]: { balance: WalletBalance; timestamp: number } } = {};
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor() {
    this.electrumService = new ElectrumService();
    this.httpApiService = new HTTPAPIService();
  }

  /**
   * Connect to the wallet
   */
  async connect(config: WalletConfig): Promise<void> {
    try {
      console.log('🔌 Connecting to Dogecoin wallet...');
      
      // Try to connect to Electrum first
      const electrumConnected = await this.electrumService.connect();
      if (!electrumConnected) {
        console.warn('⚠️ Electrum connection failed, using HTTP APIs only');
      }
      
      this.isConnected = true;
      console.log('✅ Wallet connected successfully');
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      throw new Error(`Failed to connect: ${error.message}`);
    }
  }

  /**
   * Disconnect from the wallet
   */
  async disconnect(): Promise<void> {
    try {
      await this.electrumService.disconnect();
      this.isConnected = false;
      this.walletSeed = '';
      this.walletAddresses = [];
      this.privateKeys = {};
      this.rawPrivateKeys = {};
      this.balanceCache = {};
      console.log('🔌 Wallet disconnected');
    } catch (error) {
      console.warn('Warning during disconnect:', error);
    }
  }

  /**
   * Create a new wallet
   */
  async createWallet(): Promise<{ seed: string; addresses: WalletAddress[] }> {
    try {
      console.log('🆕 Creating new wallet...');
      
      // Generate a new mnemonic
      const mnemonic = bip39.generateMnemonic();
      
      // Import the wallet with the generated seed
      const addresses = await this.importWallet(mnemonic);
      
      console.log('✅ New wallet created successfully');
      return { seed: mnemonic, addresses };
    } catch (error) {
      console.error('❌ Failed to create wallet:', error);
      throw new Error(`Failed to create wallet: ${error.message}`);
    }
  }

  /**
   * Import wallet from seed phrase
   */
  async importWallet(seed: string): Promise<WalletAddress[]> {
    try {
      console.log('📥 Importing wallet from seed...');
      
      if (!bip39.validateMnemonic(seed)) {
        throw new Error('Invalid seed phrase');
      }

      this.walletSeed = seed;
      
      // Generate the root key from seed
      const seedBuffer = await bip39.mnemonicToSeed(seed);
      const root = bip32Factory.fromSeed(seedBuffer, this.network);
      
      // Generate first address (m/44'/3'/0'/0/0)
      const child = root.derivePath(BIP44_PATH);
      if (!child.privateKey) {
        throw new Error('Failed to derive private key');
      }
      
      // Get the address
      const { address } = bitcoin.payments.p2pkh({
        pubkey: Buffer.from(child.publicKey),
        network: this.network
      });
      
      if (!address) {
        throw new Error('Failed to generate address');
      }
      
      // Store private key
      const wifKey = child.toWIF();
      this.privateKeys[address] = wifKey;
      this.rawPrivateKeys[address] = child.privateKey ? Buffer.from(child.privateKey) : null;
      
      console.log('🔐 Stored private key for address:', address);
      console.log('🔐 Private key length:', child.privateKey.length, 'bytes');
      
      // Create wallet address object
      const walletAddress: WalletAddress = {
        address,
        balance: { confirmed: 0, unconfirmed: 0, total: 0 },
        isUsed: false,
        derivationPath: BIP44_PATH
      };
      
      this.walletAddresses = [walletAddress];
      
      console.log('✅ Wallet imported successfully');
      console.log('📍 Generated address:', address);
      
      return this.walletAddresses;
    } catch (error) {
      console.error('❌ Failed to import wallet:', error);
      throw new Error(`Failed to import wallet: ${error.message}`);
    }
  }

  /**
   * Get balance for an address with caching and fallbacks
   */
  async getBalance(address: string): Promise<WalletBalance> {
    try {
      // Check cache first
      const cached = this.balanceCache[address];
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.balance;
      }

      console.log('💰 Getting balance for:', address);

      // Try Electrum first
      if (this.electrumService.isServerConnected()) {
        try {
          const electrumBalance = await this.electrumService.getBalance(address);
          if (electrumBalance) {
            const balance: WalletBalance = {
              confirmed: electrumBalance.confirmed,
              unconfirmed: electrumBalance.unconfirmed,
              total: electrumBalance.confirmed + electrumBalance.unconfirmed
            };
            
            // Cache the result
            this.balanceCache[address] = { balance, timestamp: Date.now() };
            return balance;
          }
        } catch (error) {
          console.warn('⚠️ Electrum balance failed, trying HTTP APIs...', error.message);
        }
      }

      // Fallback to HTTP APIs
      const httpBalance = await this.httpApiService.getBalance(address);
      if (httpBalance) {
        const balance: WalletBalance = {
          confirmed: httpBalance.balance,
          unconfirmed: httpBalance.unconfirmedBalance,
          total: httpBalance.balance + httpBalance.unconfirmedBalance
        };
        
        // Cache the result
        this.balanceCache[address] = { balance, timestamp: Date.now() };
        return balance;
      }

      throw new Error('All balance APIs failed');
    } catch (error) {
      console.error('❌ Failed to get balance:', error);
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  /**
   * Get UTXOs for an address
   */
  async getUTXOs(address: string): Promise<any[]> {
    try {
      console.log('🔍 Getting UTXOs for:', address);

      // Try Electrum first
      if (this.electrumService.isServerConnected()) {
        try {
          const electrumUTXOs = await this.electrumService.getUTXOs(address);
          if (electrumUTXOs.length > 0) {
            console.log(`✅ Found ${electrumUTXOs.length} UTXOs via Electrum`);
            return electrumUTXOs;
          }
        } catch (error) {
          console.warn('⚠️ Electrum UTXO failed, trying HTTP APIs...', error.message);
        }
      }

      // Fallback to HTTP APIs
      const httpUTXOs = await this.httpApiService.getUTXOs(address);
      if (httpUTXOs.length > 0) {
        console.log(`✅ Found ${httpUTXOs.length} UTXOs via HTTP API`);
        return httpUTXOs;
      }

      console.log('⚠️ No UTXOs found');
      return [];
    } catch (error) {
      console.error('❌ Failed to get UTXOs:', error);
      return [];
    }
  }

  /**
   * Estimate transaction fee
   */
  estimateFee(inputCount: number, outputCount: number, feeRate = WALLET_CONFIG.DEFAULT_FEE_RATE): number {
    // Basic transaction size calculation
    const baseSize = 10; // version (4) + locktime (4) + input count (1) + output count (1)
    const inputSize = inputCount * 148; // Average input size
    const outputSize = outputCount * 34; // Average output size
    
    const totalSize = baseSize + inputSize + outputSize;
    const fee = totalSize * feeRate;
    
    console.log(`📊 Fee estimation: ${totalSize} bytes × ${feeRate} sat/byte = ${fee} satoshis (${fee / 100000000} DOGE)`);
    
    return Math.max(fee, TRANSACTION_CONFIG.MIN_FEE);
  }

  /**
   * Create and sign a transaction
   */
  async createTransaction(
    toAddress: string,
    amount: number,
    feeRate = WALLET_CONFIG.DEFAULT_FEE_RATE
  ): Promise<string> {
    try {
      if (this.walletAddresses.length === 0) {
        throw new Error('No wallet addresses available');
      }

      const fromAddress = this.walletAddresses[0].address;
      console.log('💸 Creating transaction from:', fromAddress, 'to:', toAddress);

      // Get UTXOs
      const utxos = await this.getUTXOs(fromAddress);
      if (utxos.length === 0) {
        throw new Error('No UTXOs available for transaction');
      }

      // Calculate required amount including fee estimate
      const estimatedFee = this.estimateFee(utxos.length, 2, feeRate);
      const totalRequired = amount + estimatedFee;

      // Select UTXOs
      let totalInput = 0;
      const selectedUTXOs = [];
      
      for (const utxo of utxos) {
        selectedUTXOs.push(utxo);
        totalInput += utxo.value;
        
        if (totalInput >= totalRequired) {
          break;
        }
      }

      if (totalInput < totalRequired) {
        throw new Error(`Insufficient funds. Required: ${totalRequired}, Available: ${totalInput}`);
      }

      // Create transaction
      const psbt = new bitcoin.Psbt({ network: this.network });

      // Add inputs with transaction hex
      for (const utxo of selectedUTXOs) {
        // Try to get transaction hex
        let txHex: string | null = null;
        
        // Try Electrum first, then HTTP APIs
        if (this.electrumService.isServerConnected()) {
          // Note: Electrum doesn't support transaction hex retrieval in this implementation
          // We'll use HTTP API fallback
        }
        
        txHex = await this.httpApiService.getTransactionHex(utxo.txid);
        
        if (!txHex) {
          throw new Error(`Failed to get transaction hex for UTXO ${utxo.txid}`);
        }

        const tx = bitcoin.Transaction.fromHex(txHex);
        
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          nonWitnessUtxo: Buffer.from(txHex, 'hex')
        });
      }

      // Add outputs
      psbt.addOutput({
        address: toAddress,
        value: amount
      });

      // Add change output if needed
      const change = totalInput - amount - estimatedFee;
      if (change > TRANSACTION_CONFIG.DUST_LIMIT) {
        psbt.addOutput({
          address: fromAddress,
          value: change
        });
      }

      // Sign transaction
      const privateKey = this.getPrivateKeyForSigning(fromAddress);
      for (let i = 0; i < selectedUTXOs.length; i++) {
        psbt.signInput(i, privateKey);
      }

      // Finalize and extract
      psbt.finalizeAllInputs();
      const tx = psbt.extractTransaction();
      
      console.log('✅ Transaction created:', tx.getId());
      return tx.toHex();
    } catch (error) {
      console.error('❌ Failed to create transaction:', error);
      throw new Error(`Failed to create transaction: ${error.message}`);
    }
  }

  /**
   * Get private key for signing with re-derivation fallback
   */
  private getPrivateKeyForSigning(address: string): any {
    // Try stored raw private key first
    const rawKey = this.rawPrivateKeys[address];
    if (rawKey && rawKey.length === 32) {
      console.log('🔐 Using stored private key for signing');
      
      // Create key pair from raw private key
      const keyPair = bip32Factory.fromPrivateKey(
        rawKey,
        Buffer.alloc(32), // chain code
        this.network
      );

      // Convert to signer format expected by PSBT
      return {
        publicKey: Buffer.from(keyPair.publicKey),
        sign: (hash: Buffer) => {
          return Buffer.from(keyPair.sign(hash));
        }
      };
    }

    // Fallback: Re-derive from seed
    console.log('🔄 Re-deriving private key for address:', address);
    
    if (!this.walletSeed) {
      throw new Error('No seed available for re-derivation');
    }

    try {
      const seedBuffer = bip39.mnemonicToSeedSync(this.walletSeed);
      const root = bip32Factory.fromSeed(seedBuffer, this.network);
      const child = root.derivePath(BIP44_PATH);
      
      if (!child.privateKey) {
        throw new Error('Failed to re-derive private key');
      }

      // Verify this matches the address
      const { address: derivedAddress } = bitcoin.payments.p2pkh({
        pubkey: Buffer.from(child.publicKey),
        network: this.network
      });

      if (derivedAddress !== address) {
        throw new Error('Re-derived key does not match address');
      }

      // Cache the re-derived key
      this.rawPrivateKeys[address] = Buffer.from(child.privateKey);
      
      console.log('🔄 Re-derived private key: 32 bytes');
      
      // Create key pair from re-derived private key
      const keyPair = bip32Factory.fromPrivateKey(
        Buffer.from(child.privateKey),
        Buffer.alloc(32), // chain code
        this.network
      );

      // Convert to signer format expected by PSBT
      return {
        publicKey: Buffer.from(keyPair.publicKey),
        sign: (hash: Buffer) => {
          return Buffer.from(keyPair.sign(hash));
        }
      };
    } catch (error) {
      console.error('❌ Failed to re-derive private key:', error);
      throw new Error(`Failed to get private key: ${error.message}`);
    }
  }

  /**
   * Broadcast transaction
   */
  async broadcastTransaction(txHex: string): Promise<string> {
    try {
      console.log('📡 Broadcasting transaction...');

      // Try Electrum first
      if (this.electrumService.isServerConnected()) {
        try {
          const txid = await this.electrumService.broadcastTransaction(txHex);
          console.log('✅ Transaction broadcast via Electrum:', txid);
          return txid;
        } catch (error) {
          console.warn('⚠️ Electrum broadcast failed, trying HTTP APIs...', error.message);
        }
      }

      // Fallback to HTTP APIs
      const txid = await this.httpApiService.broadcastTransaction(txHex);
      if (txid) {
        console.log('✅ Transaction broadcast via HTTP API:', txid);
        return txid;
      }

      throw new Error('All broadcast methods failed');
    } catch (error) {
      console.error('❌ Failed to broadcast transaction:', error);
      throw new Error(`Failed to broadcast transaction: ${error.message}`);
    }
  }

  // Getters
  getAddresses(): WalletAddress[] {
    return this.walletAddresses;
  }

  isWalletConnected(): boolean {
    return this.isConnected;
  }
}
