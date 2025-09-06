// Test with different Electrum servers and script hash calculation
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

async function testDifferentServers() {
    const servers = [
        { host: 'electrum1.cipig.net', port: 10061 },
        { host: 'electrum2.cipig.net', port: 10061 },
        { host: 'electrum3.cipig.net', port: 10061 }
    ];
    
    const address = 'DAYfTtLaVgDR69f5eVd9dj45Ck8f7s7Bqd';
    
    for (const server of servers) {
        console.log(`\n=== Testing ${server.host}:${server.port} ===`);
        
        const client = new ElectrumClient(server.port, server.host, 'tcp');
        
        try {
            await client.connect();
            console.log('✅ Connected!');
            
            const version = await client.request('server.version', 'TestClient', '1.4');
            console.log('Server version:', version);
            
            // Calculate script hash step by step for debugging
            console.log('\nCalculating script hash...');
            console.log('Address:', address);
            
            const decoded = bitcoin.address.toOutputScript(address, DOGECOIN_NETWORK);
            console.log('Decoded script:', decoded.toString('hex'));
            
            const hash = crypto.createHash('sha256').update(decoded).digest();
            console.log('SHA256 hash:', hash.toString('hex'));
            
            const scriptHash = hash.reverse().toString('hex');
            console.log('Reversed script hash:', scriptHash);
            
            // Try the request with proper parameter format
            try {
                console.log('\nTrying blockchain.scripthash.get_balance...');
                const balance = await client.request('blockchain.scripthash.get_balance', scriptHash);
                console.log('✅ Balance:', balance);
                
                if (balance && typeof balance.confirmed === 'number') {
                    const confirmedDOGE = balance.confirmed / 100000000;
                    const unconfirmedDOGE = balance.unconfirmed / 100000000;
                    console.log(`🎉 FOUND BALANCE: ${confirmedDOGE} DOGE confirmed, ${unconfirmedDOGE} DOGE unconfirmed`);
                    
                    // If we found balance, also get UTXOs
                    try {
                        const utxos = await client.request('blockchain.scripthash.listunspent', scriptHash);
                        console.log('✅ UTXOs:', JSON.stringify(utxos, null, 2));
                    } catch (utxoError) {
                        console.log('❌ UTXO request failed:', utxoError.message);
                    }
                }
            } catch (balanceError) {
                console.log('❌ Balance request failed:', balanceError.message);
            }
            
            await client.close();
            
        } catch (error) {
            console.log('❌ Connection failed:', error.message);
        }
    }
}

testDifferentServers();
