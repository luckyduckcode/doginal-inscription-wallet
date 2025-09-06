// Debug Electrum client methods and test with known address
const ElectrumClient = require('electrum-client');

async function debugElectrumClient() {
    const client = new ElectrumClient(10061, 'electrum1.cipig.net', 'tcp');
    
    try {
        await client.connect();
        console.log('✅ Connected!');
        
        // List all available methods
        console.log('\n=== Available methods on client ===');
        const methods = Object.getOwnPropertyNames(client)
            .filter(name => typeof client[name] === 'function' && name.includes('blockchain'))
            .sort();
        
        console.log('Blockchain methods found:', methods);
        
        // Try the request method directly
        console.log('\n=== Testing direct request method ===');
        
        const address = 'DAYfTtLaVgDR69f5eVd9dj45Ck8f7s7Bqd';
        
        try {
            // Test with direct request
            console.log('Testing blockchain.scripthash.get_balance with request...');
            const result1 = await client.request('blockchain.scripthash.get_balance', 
                '615e1c6c89d4ebafe311a01021faff12be93fab801a00d7e9a430261a30772e2');
            console.log('✅ Direct balance request result:', result1);
        } catch (e) {
            console.log('❌ Direct balance request failed:', e.message);
        }
        
        try {
            console.log('Testing blockchain.scripthash.listunspent with request...');
            const result2 = await client.request('blockchain.scripthash.listunspent', 
                '615e1c6c89d4ebafe311a01021faff12be93fab801a00d7e9a430261a30772e2');
            console.log('✅ Direct listunspent request result:', result2);
        } catch (e) {
            console.log('❌ Direct listunspent request failed:', e.message);
        }
        
        // Also try testing server features
        try {
            console.log('\nTesting server.features...');
            const features = await client.request('server.features');
            console.log('Server features:', JSON.stringify(features, null, 2));
        } catch (e) {
            console.log('❌ Server features failed:', e.message);
        }
        
        await client.close();
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

debugElectrumClient();
