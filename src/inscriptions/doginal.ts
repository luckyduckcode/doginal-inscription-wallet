import { DogeElectrumWallet } from '../wallet/dogeElectrum';
import { DoginalInscription, InscriptionRequest, InscriptionEstimate } from '../types';
import * as bitcoin from 'bitcoinjs-lib';

export class DoginalInscriptions {
    private wallet: DogeElectrumWallet;
    private taxWalletAddress: string;
    private inscriptionHistory: DoginalInscription[] = [];

    constructor(wallet: DogeElectrumWallet, taxWalletAddress: string) {
        this.wallet = wallet;
        this.taxWalletAddress = taxWalletAddress;
    }

    async createInscription(request: InscriptionRequest & { taxAmount: number }): Promise<DoginalInscription> {
        // Add overall timeout for the entire inscription process
        return await Promise.race([
            this.performInscription(request),
            new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Inscription process timed out after 5 minutes')), 300000)
            )
        ]);
    }

    private async performInscription(request: InscriptionRequest & { taxAmount: number }): Promise<DoginalInscription> {
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
            let progressCallback: ((message: string) => void) | undefined;
            let balanceCallback: ((balance: number, addresses: string[]) => void) | undefined;

            // Check if we have progress callbacks from the request
            if (request.onProgress) {
                progressCallback = request.onProgress;
            }
            if (request.onBalanceUpdate) {
                balanceCallback = request.onBalanceUpdate;
            }

            progressCallback?.('🔄 Starting inscription creation...');
            progressCallback?.('🔍 Looking for available UTXOs...');

            // Get UTXOs using less aggressive settings for inscriptions
            const { utxos, address: utxoAddress } = await this.wallet.getUTXOsPersistent({
                onProgress: progressCallback,
                onBalanceUpdate: balanceCallback,
                maxRetries: 5, // Reduce from 20 to 5 for faster inscriptions
                retryDelays: [2000, 5000, 10000], // Shorter delays: 2s, 5s, 10s
                checkAllAddresses: true
            });

            if (utxos.length === 0) {
                throw new Error('No UTXOs available for inscription after persistent search');
            }

            progressCallback?.(`✅ Found ${utxos.length} UTXO(s) on address: ${utxoAddress.substring(0, 10)}...`);
            progressCallback?.('� Verifying UTXOs are still unspent...');

            // Verify UTXOs are still valid before using them
            const validUTXOs = await this.wallet.verifyUTXOsUnspent(utxos);
            
            if (validUTXOs.length === 0) {
                throw new Error('No valid UTXOs available - all UTXOs appear to be already spent');
            }

            progressCallback?.(`✅ Verified ${validUTXOs.length} valid UTXO(s)`);
            progressCallback?.('�💰 Calculating fees and preparing transaction...');

            // Use first valid UTXO for the transaction
            const selectedUtxos = validUTXOs.slice(0, 1);
            
            // Calculate fees - 1 input, 3 outputs (inscription, tax, change)
            const networkFee = await this.wallet.estimateFee(selectedUtxos.length, 3, request.feeRate);
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
                utxos: selectedUtxos,
                feeRate: request.feeRate,
                utxoAddress: utxoAddress, // Pass the UTXO address
                onProgress: progressCallback // Pass progress callback
            });

            progressCallback?.('📡 Broadcasting transaction to network...');

            // Broadcast transaction
            const txid = await this.wallet.broadcastTransaction(inscriptionTx);

            progressCallback?.(`✅ Inscription created successfully! TXID: ${txid.substring(0, 10)}...`);

            // Create inscription record
            const inscription: DoginalInscription = {
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

        } catch (error: any) {
            throw new Error(`Failed to create inscription: ${error.message}`);
        }
    }

    async estimateInscriptionCost(request: InscriptionRequest): Promise<InscriptionEstimate> {
        const content = typeof request.content === 'string' 
            ? Buffer.from(request.content, 'utf8') 
            : request.content;
        
        const inscriptionSize = content.length;
        const networkFee = await this.wallet.estimateFee(1, 3, request.feeRate); // 1 input, 3 outputs (inscription, tax, change)
        const taxFee = 2.0; // Fixed 2 DOGE tax
        const totalCost = networkFee + taxFee;

        return {
            totalCost,
            networkFee,
            taxFee,
            inscriptionSize,
            estimatedConfirmationTime: this.estimateConfirmationTime(request.feeRate || 500000)
        };
    }

    private async createInscriptionTransaction(params: {
        content: Buffer;
        contentType: string;
        receivingAddress: string;
        taxAmount: number;
        utxos: any[];
        feeRate?: number;
        utxoAddress?: string; // Add this parameter
        onProgress?: (message: string) => void; // Add progress callback
    }): Promise<string> {
        const { content, contentType, receivingAddress, taxAmount, utxos, feeRate = 10, utxoAddress, onProgress } = params;

        // Create inscription script
        const inscriptionScript = this.createInscriptionScript(content, contentType);
        
        // Calculate total input value
        const totalInput = utxos.reduce((sum, utxo) => sum + utxo.value, 0) / 100000000; // Convert to DOGE

        // Calculate change
        const networkFee = await this.wallet.estimateFee(utxos.length, 3, feeRate); // inputs, 3 outputs (inscription, tax, change)
        const change = totalInput - taxAmount - networkFee;

        if (change < 0) {
            throw new Error('Insufficient funds for transaction');
        }

        // Fetch full transaction hex for each UTXO (needed for PSBT) with timeout
        onProgress?.('🔄 Fetching transaction details...');
        const inputsWithTxHex = await Promise.all(
            utxos.map(async (utxo, index) => {
                try {
                    onProgress?.(`📥 Fetching transaction ${index + 1}/${utxos.length}...`);
                    const txHex = await Promise.race([
                        this.wallet.getTransactionHex(utxo.txid),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Transaction fetch timeout')), 30000)
                        )
                    ]);
                    return {
                        ...utxo,
                        txHex: txHex as string
                    };
                } catch (error) {
                    throw new Error(`Failed to fetch transaction ${utxo.txid}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            })
        );

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
        const privateKeys: string[] = [];
        
        // More efficient: Get the private key for the specific UTXO address
        const utxoPrivateKey = await this.wallet.getPrivateKeyForAddress(utxoAddress);
        if (!utxoPrivateKey) {
            throw new Error(`No private key available for UTXO address ${utxoAddress}`);
        }
        
        // Use the same private key for all UTXOs since they're from the same address
        for (const utxo of inputsWithTxHex) {
            privateKeys.push(utxoPrivateKey);
        }

        // Create the actual transaction using the wallet
        return await this.wallet.createTransaction(inputsWithTxHex, outputs, privateKeys);
    }

    private createInscriptionScript(content: Buffer, contentType: string): string {
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



    private estimateConfirmationTime(feeRate: number): string {
        // Dogecoin fee rate expectations (sat/byte)
        if (feeRate >= 100) return '1-2 blocks (~2-4 minutes)';
        if (feeRate >= 50) return '2-5 blocks (~4-10 minutes)';
        if (feeRate >= 20) return '5-10 blocks (~10-20 minutes)';
        if (feeRate >= 10) return '10-20 blocks (~20-40 minutes)';
        return '20+ blocks (40+ minutes or may not confirm)';
    }

    async getInscriptionHistory(): Promise<DoginalInscription[]> {
        return this.inscriptionHistory;
    }

    async getInscription(id: string): Promise<DoginalInscription | null> {
        return this.inscriptionHistory.find(inscription => inscription.id === id) || null;
    }

    // Validate Doginal ID format
    private isValidDoginalId(id: string): boolean {
        return /^[a-fA-F0-9]{64}i\d+$/.test(id);
    }

    // Get inscription by transaction ID
    async getInscriptionByTxId(txid: string): Promise<DoginalInscription[]> {
        return this.inscriptionHistory.filter(inscription => inscription.txid === txid);
    }
}
