// Test Electrum with proper Dogecoin network configuration
const ElectrumClient = require('electrum-client');
const crypto = require('crypto');
const bitcoin = require('bitcoinjs-lib');

// Define Dogecoin network parameters
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

async function testElectrumWithDogecoin() {
    const client = new ElectrumClient(10061, 'electrum1.cipig.net', 'tcp');
    
    try {
        console.log('Connecting to electrum1.cipig.net:10061...');
        await client.connect();
        
        const version = await client.server_version('TestClient', '1.4');
        console.log('✅ Connected! Server version:', version);
        
        const address = 'DAYfTtLaVgDR69f5eVd9dj45Ck8f7s7Bqd';
        console.log(`\nTesting with Dogecoin address: ${address}`);
        
        // Convert address to script hash with proper Dogecoin network
        function addressToScriptHash(address) {
            try {
                const decoded = bitcoin.address.toOutputScript(address, DOGECOIN_NETWORK);
                const hash = crypto.createHash('sha256').update(decoded).digest();
                return hash.reverse().toString('hex');
            } catch (error) {
                console.error('Address decode error:', error.message);
                return null;
            }
        }
        
        const scriptHash = addressToScriptHash(address);
        if (!scriptHash) {
            throw new Error('Failed to convert address to script hash');
        }
        
        console.log('Script hash:', scriptHash);
        
        // Try getting balance
        try {
            console.log('\n=== Testing blockchain.scripthash.get_balance ===');
            const balance = await client.blockchain_scripthash_get_balance(scriptHash);
            console.log('✅ Balance result:', balance);
            
            if (balance) {
                const confirmedDOGE = balance.confirmed / 100000000;
                const unconfirmedDOGE = balance.unconfirmed / 100000000;
                console.log(`Confirmed: ${confirmedDOGE} DOGE`);
                console.log(`Unconfirmed: ${unconfirmedDOGE} DOGE`);
                console.log(`Total: ${confirmedDOGE + unconfirmedDOGE} DOGE`);
            }
        } catch (e) {
            console.log('❌ get_balance failed:', e.message);
        }
        
        // Try getting UTXOs
        try {
            console.log('\n=== Testing blockchain.scripthash.listunspent ===');
            const utxos = await client.blockchain_scripthash_listunspent(scriptHash);
            console.log('✅ UTXOs result:', JSON.stringify(utxos, null, 2));
            
            if (utxos && utxos.length > 0) {
                const totalSatoshis = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
                console.log(`\nCalculated balance from UTXOs: ${totalSatoshis / 100000000} DOGE`);
            }
        } catch (e) {
            console.log('❌ listunspent failed:', e.message);
        }
        
        await client.close();
        console.log('\n✅ Tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testElectrumWithDogecoin();
