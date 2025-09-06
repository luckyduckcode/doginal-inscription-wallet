const axios = require('axios');

async function testAPIs() {
    console.log('🔍 Testing Dogecoin API Connectivity...\n');
    
    const testAddress = 'DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L'; // Known address with balance
    
    const apis = [
        {
            name: 'Trezor Blockbook',
            url: `https://doge1.trezor.io/api/v2/address/${testAddress}`,
            test: (data) => data.balance
        },
        {
            name: 'BlockCypher',
            url: `https://api.blockcypher.com/v1/doge/main/addrs/${testAddress}/balance`,
            test: (data) => data.balance
        },
        {
            name: 'DogeChain.info',
            url: `https://dogechain.info/api/v1/address/balance/${testAddress}`,
            test: (data) => data.balance
        }
    ];
    
    for (const api of apis) {
        try {
            console.log(`Testing ${api.name}...`);
            const response = await axios.get(api.url, { timeout: 10000 });
            
            if (response.data && api.test(response.data)) {
                console.log(`✅ ${api.name}: Working`);
                console.log(`   Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
            } else {
                console.log(`⚠️ ${api.name}: Unexpected response format`);
                console.log(`   Response: ${JSON.stringify(response.data)}`);
            }
        } catch (error) {
            console.log(`❌ ${api.name}: Failed`);
            console.log(`   Error: ${error.message}`);
            if (error.response) {
                console.log(`   Status: ${error.response.status}`);
            }
        }
        console.log('');
    }
}

testAPIs().catch(console.error);
