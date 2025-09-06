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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoginalInscriptions = void 0;
const bitcoin = __importStar(require("bitcoinjs-lib"));
class DoginalInscriptions {
    constructor(wallet, taxWalletAddress) {
        this.inscriptionHistory = [];
        this.wallet = wallet;
        this.taxWalletAddress = taxWalletAddress;
    }
    async createInscription(request) {
        try {
            const { content, contentType, receivingAddress, taxAmount } = request;
            // Validate content
            if (!content || !contentType || !receivingAddress) {
                throw new Error('Missing required inscription parameters');
            }
            // Convert content to buffer if it's a string
            const contentBuffer = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
            const inscriptionSize = contentBuffer.length;
            // Check if content size is reasonable (max 400KB for Doginals)
            if (inscriptionSize > 400000) {
                throw new Error('Content too large. Maximum size is 400KB for Doginals.');
            }
            // Use persistent UTXO detection with progress callbacks
            let progressCallback;
            let balanceCallback;
            // Check if we have progress callbacks from the request
            if (request.onProgress) {
                progressCallback = request.onProgress;
            }
            if (request.onBalanceUpdate) {
                balanceCallback = request.onBalanceUpdate;
            }
            progressCallback?.('🔄 Starting inscription creation...');
            progressCallback?.('🔍 Looking for available UTXOs...');
            // Get UTXOs using persistent method
            const { utxos, address: utxoAddress } = await this.wallet.getUTXOsPersistent({
                onProgress: progressCallback,
                onBalanceUpdate: balanceCallback,
                maxRetries: 20,
                checkAllAddresses: true
            });
            if (utxos.length === 0) {
                throw new Error('No UTXOs available for inscription after persistent search');
            }
            progressCallback?.(`✅ Found ${utxos.length} UTXO(s) on address: ${utxoAddress.substring(0, 10)}...`);
            progressCallback?.('💰 Calculating fees and preparing transaction...');
            // Calculate fees
            const networkFee = await this.wallet.estimateFee(1, 2); // 1 input, 2 outputs (inscription + tax)
            const totalCost = networkFee + taxAmount;
            // Check if sufficient balance
            const balance = await this.wallet.getBalance(utxoAddress);
            if (balance.confirmed < totalCost) {
                throw new Error(`Insufficient balance. Required: ${totalCost} DOGE, Available: ${balance.confirmed} DOGE`);
            }
            progressCallback?.('📝 Creating inscription transaction...');
            // Create inscription transaction
            const inscriptionTx = await this.createInscriptionTransaction({
                content: contentBuffer,
                contentType,
                receivingAddress: utxoAddress, // Use the address that has the UTXOs
                taxAmount,
                utxos: utxos.slice(0, 1) // Use first UTXO
            });
            progressCallback?.('📡 Broadcasting transaction to network...');
            // Broadcast transaction
            const txid = await this.wallet.broadcastTransaction(inscriptionTx);
            progressCallback?.(`✅ Inscription created successfully! TXID: ${txid.substring(0, 10)}...`);
            // Create inscription record
            const inscription = {
                id: `${txid}i0`, // Doginal ID format
                content: contentBuffer,
                contentType,
                size: inscriptionSize,
                txid,
                outputIndex: 0,
                address: utxoAddress,
                createdAt: new Date(),
                fee: networkFee,
                taxPaid: taxAmount
            };
            // Add to history
            this.inscriptionHistory.push(inscription);
            return inscription;
        }
        catch (error) {
            throw new Error(`Failed to create inscription: ${error.message}`);
        }
    }
    async estimateInscriptionCost(request) {
        const content = typeof request.content === 'string'
            ? Buffer.from(request.content, 'utf8')
            : request.content;
        const inscriptionSize = content.length;
        const networkFee = await this.wallet.estimateFee(1, 2, request.feeRate);
        const taxFee = 2.0; // Fixed 2 DOGE tax
        const totalCost = networkFee + taxFee;
        return {
            totalCost,
            networkFee,
            taxFee,
            inscriptionSize,
            estimatedConfirmationTime: this.estimateConfirmationTime(request.feeRate || 1000)
        };
    }
    async createInscriptionTransaction(params) {
        const { content, contentType, receivingAddress, taxAmount, utxos } = params;
        // Create inscription script
        const inscriptionScript = this.createInscriptionScript(content, contentType);
        // Calculate total input value
        const totalInput = utxos.reduce((sum, utxo) => sum + utxo.value, 0) / 100000000; // Convert to DOGE
        // Calculate change
        const networkFee = await this.wallet.estimateFee(utxos.length, 3); // inputs, 3 outputs (inscription, tax, change)
        const change = totalInput - taxAmount - networkFee;
        if (change < 0) {
            throw new Error('Insufficient funds for transaction');
        }
        // Fetch full transaction hex for each UTXO (needed for PSBT)
        const inputsWithTxHex = await Promise.all(utxos.map(async (utxo) => ({
            ...utxo,
            txHex: await this.wallet.getTransactionHex(utxo.txid)
        })));
        // Create transaction outputs
        const outputs = [
            {
                address: receivingAddress,
                value: 0.00000546, // Dust amount for inscription
                script: inscriptionScript
            },
            {
                address: this.taxWalletAddress,
                value: taxAmount
            }
        ];
        // Add change output if necessary
        if (change > 0.001) { // Only add change if it's significant
            outputs.push({
                address: receivingAddress,
                value: change
            });
        }
        // Get private keys for the addresses that own the UTXOs
        // Note: In a real implementation, you'd need to determine which address owns each UTXO
        // For now, we'll assume all UTXOs belong to the wallet's addresses
        const privateKeys = [];
        for (const utxo of inputsWithTxHex) {
            // This is a simplified approach - in production you'd need proper UTXO ownership tracking
            const walletAddresses = await this.wallet.getAddresses();
            const ownerAddress = walletAddresses.find(addr => 
            // You'd need to check if this address owns the UTXO
            // For now, we'll use the first available private key as a placeholder
            true);
            if (ownerAddress) {
                const privateKey = await this.wallet.getPrivateKeyForAddress(ownerAddress.address);
                if (privateKey) {
                    privateKeys.push(privateKey);
                }
                else {
                    throw new Error(`No private key available for address ${ownerAddress.address}`);
                }
            }
            else {
                throw new Error(`No wallet address found for UTXO ${utxo.txid}:${utxo.vout}`);
            }
        }
        // Create the actual transaction using the wallet
        return await this.wallet.createTransaction(inputsWithTxHex, outputs, privateKeys);
    }
    createInscriptionScript(content, contentType) {
        // Doginal inscription script format
        // OP_FALSE OP_IF "dog" OP_1 <content-type> OP_0 <content> OP_ENDIF
        const script = bitcoin.script.compile([
            bitcoin.opcodes.OP_FALSE,
            bitcoin.opcodes.OP_IF,
            Buffer.from('dog', 'utf8'), // Doginal protocol identifier
            bitcoin.opcodes.OP_1,
            Buffer.from(contentType, 'utf8'),
            bitcoin.opcodes.OP_0,
            content,
            bitcoin.opcodes.OP_ENDIF
        ]);
        return script.toString('hex');
    }
    estimateConfirmationTime(feeRate) {
        if (feeRate >= 5000)
            return '1-2 blocks (~2-4 minutes)';
        if (feeRate >= 2000)
            return '2-5 blocks (~4-10 minutes)';
        if (feeRate >= 1000)
            return '5-10 blocks (~10-20 minutes)';
        return '10+ blocks (~20+ minutes)';
    }
    async getInscriptionHistory() {
        return this.inscriptionHistory;
    }
    async getInscription(id) {
        return this.inscriptionHistory.find(inscription => inscription.id === id) || null;
    }
    // Validate Doginal ID format
    isValidDoginalId(id) {
        return /^[a-fA-F0-9]{64}i\d+$/.test(id);
    }
    // Get inscription by transaction ID
    async getInscriptionByTxId(txid) {
        return this.inscriptionHistory.filter(inscription => inscription.txid === txid);
    }
}
exports.DoginalInscriptions = DoginalInscriptions;
