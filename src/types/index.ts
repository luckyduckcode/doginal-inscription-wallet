export interface WalletConfig {
    network: string;
    rpcUrl: string;
    walletAddress: string;
    electrumServer?: string;
    port?: number;
}

export interface DoginalInscription {
    id: string;
    content: string | Buffer;
    contentType: string;
    size: number;
    txid: string;
    outputIndex: number;
    address: string;
    createdAt: Date;
    blockHeight?: number;
    fee: number;
    taxPaid: number;
}

export interface InscriptionRequest {
    content: string | Buffer;
    contentType: string;
    receivingAddress: string;
    feeRate?: number;
    onProgress?: (message: string) => void;
    onBalanceUpdate?: (balance: number, addresses: string[]) => void;
}

export interface InscriptionEstimate {
    totalCost: number;
    networkFee: number;
    taxFee: number;
    inscriptionSize: number;
    estimatedConfirmationTime: string;
}

export interface ElectrumTransaction {
    txid: string;
    inputs: Array<{
        txid: string;
        vout: number;
        value: number;
        address: string;
    }>;
    outputs: Array<{
        value: number;
        address: string;
        scriptPubKey: string;
    }>;
    fee: number;
    confirmations: number;
    blockHeight?: number;
}

export interface WalletBalance {
    confirmed: number;
    unconfirmed: number;
    total: number;
}

export interface UTXO {
    txid: string;
    vout: number;
    value: number;
    height: number;
    address: string;
}

export interface WalletAddress {
    address: string;
    balance: WalletBalance;
    isUsed: boolean;
    derivationPath?: string;
}

// Global window interface for Electron API
declare global {
    interface Window {
        electronAPI: {
            connectWallet: (config: WalletConfig) => Promise<{success: boolean, message?: string, error?: string}>;
            createWallet: () => Promise<{success: boolean, seed?: string, addresses?: WalletAddress[], error?: string}>;
            importWallet: (seed: string) => Promise<{success: boolean, addresses?: WalletAddress[], error?: string}>;
            generateNewAddress: () => Promise<{success: boolean, address?: WalletAddress, error?: string}>;
            getBalance: (address: string) => Promise<{success: boolean, balance?: WalletBalance, error?: string}>;
            getAddresses: () => Promise<{success: boolean, addresses?: WalletAddress[], error?: string}>;
            createInscription: (data: InscriptionRequest) => Promise<{success: boolean, inscription?: DoginalInscription, error?: string}>;
            estimateInscription: (data: InscriptionRequest) => Promise<{success: boolean, estimate?: InscriptionEstimate, error?: string}>;
            getInscriptionHistory: () => Promise<{success: boolean, history?: DoginalInscription[], error?: string}>;
            openExternal: (url: string) => Promise<void>;
            onInscriptionProgress: (callback: (event: any, data: any) => void) => void;
            removeInscriptionProgressListener: (callback: (event: any, data: any) => void) => void;
        };
    }
}