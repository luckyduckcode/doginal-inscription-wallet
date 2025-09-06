// Final Electrum test with minimal approach
const ElectrumClient = require('electrum-client');
const crypto = require('crypto');
const bitcoin = require('bitcoinjs-lib');

const DOGECOIN_NETWORK = {
    messagePrefix: '\x19Dogecoin Signed Message:\n',
    bech32: 'dc',
    bip32: { public: 0x02facafd, private: 0x02fac398 },
    pubKeyHash: 0x1e,
    scriptHash: 0x16,
    wif: 0x9e
};

async function simpleElectrumTest() {
    const client = new ElectrumClient(10061, 'electrum1.cipig.net', 'tcp');
    
    try {
        await client.connect();
        console.log('✅ Connected to Electrum server');
        
        const address = 'DAYfTtLaVgDR69f5eVd9dj45Ck8f7s7Bqd';
        
        // Calculate script hash
        const decoded = bitcoin.address.toOutputScript(address, DOGECOIN_NETWORK);
        const hash = crypto.createHash('sha256').update(decoded).digest();
        const scriptHash = hash.reverse().toString('hex');
        
        console.log('Testing script hash:', scriptHash);
        
        // Try the most basic request
        try {
            const result = await client.request('blockchain.scripthash.get_balance', [scriptHash]);
            console.log('✅ SUCCESS! Balance result:', result);
            
            if (result && result.confirmed !== undefined) {
                const balance = result.confirmed / 100000000;
                const unconfirmed = result.unconfirmed / 100000000;
                console.log(`🎉 BALANCE FOUND: ${balance} DOGE confirmed, ${unconfirmed} DOGE unconfirmed`);
                console.log(`🎉 TOTAL: ${balance + unconfirmed} DOGE`);
                return { confirmed: balance, unconfirmed, total: balance + unconfirmed };
            }
        } catch (e) {
            console.log('❌ Balance request failed:', e.message);
        }
        
        await client.close();
        return null;
        
    } catch (error) {
        console.log('❌ Connection failed:', error.message);
        return null;
    }
}

simpleElectrumTest().then(result => {
    if (result) {
        console.log('\n🚀 SUCCESS: We can get balance from Electrum!');
        console.log('This means we can fix the wallet balance display.');
    } else {
        console.log('\n💡 Electrum not working. We need to use alternative API approach.');
    }
});
