/**
 * Dogecoin Network Constants
 * Doginal Inscription Wallet
 */

export const DOGECOIN_NETWORK = {
  messagePrefix: '\x19Dogecoin Signed Message:\n',
  bech32: 'dc',
  bip32: {
    public: 0x02facafd,
    private: 0x02fac398
  },
  pubKeyHash: 0x1e,
  scriptHash: 0x16,
  wif: 0x9e
};

export const ELECTRUM_SERVERS = [
  {
    host: 'electrum1.cipig.net',
    port: 10061,
    protocol: 'tcp',
    name: 'Cipig'
  },
  {
    host: 'electrum.dogecoin.com',
    port: 50001,
    protocol: 'tcp',
    name: 'Official'
  }
];

export const BIP44_PATH = "m/44'/3'/0'/0/0";
export const DOGECOIN_SATOSHI = 100000000;
