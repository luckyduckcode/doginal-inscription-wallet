// Test to find correct Electrum method names
const ElectrumClient = require('electrum-client');
const crypto = require('crypto');
const bitcoin = require('bitcoinjs-lib');

const DOGECOIN_NETWORK = {
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

async function findElectrumMethods() {
    const client = new ElectrumClient(10061, 'electrum1.cipig.net', 'tcp');
    
    try {
        await client.connect();
        console.log('✅ Connected!');
        
        const address = 'DAYfTtLaVgDR69f5eVd9dj45Ck8f7s7Bqd';
        const decoded = bitcoin.address.toOutputScript(address, DOGECOIN_NETWORK);
        const hash = crypto.createHash('sha256').update(decoded).digest();
        const scriptHash = hash.reverse().toString('hex');
        
        console.log('Script hash:', scriptHash);
        
        // Try various method name formats
        const methods = [
            'blockchain.scripthash.get_balance',
            'blockchain.scripthash.listunspent', 
            'blockchain_scripthash_get_balance',
            'blockchain_scripthash_listunspent',
            'blockchainScripthash_getBalance',
            'blockchainScripthash_listUnspent',
            'blockchain_address_get_balance',
            'blockchain_address_listunspent'
        ];
        
        for (const methodName of methods) {
            try {
                console.log(`\nTrying method: ${methodName}`);
                
                let result;
                if (methodName.includes('scripthash')) {
                    if (client[methodName]) {
                        result = await client[methodName](scriptHash);
                    } else {
                        console.log(`❌ Method ${methodName} not found on client`);
                        continue;
                    }
                } else if (methodName.includes('address')) {
                    if (client[methodName]) {
                        result = await client[methodName](address);
                    } else {
                        console.log(`❌ Method ${methodName} not found on client`);
                        continue;
                    }
                }
                
                console.log(`✅ ${methodName} SUCCESS:`, JSON.stringify(result, null, 2));
                
                // If this was a balance method and returned data, calculate DOGE
                if (methodName.includes('balance') && result) {
                    if (typeof result.confirmed === 'number') {
                        console.log(`   Balance: ${result.confirmed / 100000000} DOGE confirmed, ${result.unconfirmed / 100000000} DOGE unconfirmed`);
                    }
                }
                
                // If this was UTXOs and returned data, calculate total
                if (methodName.includes('unspent') && Array.isArray(result) && result.length > 0) {
                    const total = result.reduce((sum, utxo) => sum + utxo.value, 0);
                    console.log(`   Total from UTXOs: ${total / 100000000} DOGE`);
                    break; // Found working UTXO method, that's enough
                }
                
            } catch (error) {
                console.log(`❌ ${methodName} failed:`, error.message);
            }
        }
        
        await client.close();
        
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
    }
}

findElectrumMethods();
