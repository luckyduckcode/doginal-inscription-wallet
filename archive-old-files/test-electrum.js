// Test Electrum connection and methods
const ElectrumClient = require('electrum-client');
const crypto = require('crypto');
const bitcoin = require('bitcoinjs-lib');

async function testElectrumConnection() {
    const client = new ElectrumClient(10061, 'electrum1.cipig.net', 'tcp');
    
    try {
        console.log('Connecting to electrum1.cipig.net:10061...');
        await client.connect();
        
        console.log('✅ Connected! Getting server version...');
        const version = await client.server_version('TestClient', '1.4');
        console.log('Server version:', version);
        
        // Test address
        const address = 'DAYfTtLaVgDR69f5eVd9dj45Ck8f7s7Bqd';
        console.log(`\nTesting methods for address: ${address}`);
        
        // Convert address to script hash (Electrum standard)
        function addressToScriptHash(address) {
            const decoded = bitcoin.address.toOutputScript(address, bitcoin.networks.dogecoin);
            const hash = crypto.createHash('sha256').update(decoded).digest();
            return hash.reverse().toString('hex');
        }
        
        const scriptHash = addressToScriptHash(address);
        console.log('Script hash:', scriptHash);
        
        // Try different Electrum methods
        console.log('\n=== Testing Electrum Methods ===');
        
        try {
            console.log('1. Testing blockchain.scripthash.get_balance...');
            const balance1 = await client.blockchain_scripthash_get_balance(scriptHash);
            console.log('✅ blockchain.scripthash.get_balance:', balance1);
        } catch (e) {
            console.log('❌ blockchain.scripthash.get_balance failed:', e.message);
        }
        
        try {
            console.log('2. Testing blockchain.scripthash.listunspent...');
            const utxos = await client.blockchain_scripthash_listunspent(scriptHash);
            console.log('✅ blockchain.scripthash.listunspent:', utxos);
            
            if (utxos && utxos.length > 0) {
                const totalSatoshis = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
                console.log(`Calculated balance from UTXOs: ${totalSatoshis / 100000000} DOGE`);
            }
        } catch (e) {
            console.log('❌ blockchain.scripthash.listunspent failed:', e.message);
        }
        
        await client.close();
        console.log('\n✅ Tests completed');
        
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
    }
}

testElectrumConnection();
