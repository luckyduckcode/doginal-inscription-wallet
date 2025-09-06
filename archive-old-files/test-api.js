// Test script to verify Trezor Blockbook API works
const axios = require('axios');

async function testTrezorAPI(address) {
    try {
        console.log(`Testing Trezor API for address: ${address}`);
        const response = await axios.get(`https://doge1.trezor.io/api/v2/address/${address}`, {
            timeout: 10000
        });
        
        const data = response.data;
        console.log('Raw API response:', JSON.stringify(data, null, 2));
        
        if (data && typeof data.balance === 'string') {
            const balanceSatoshis = parseInt(data.balance);
            const unconfirmedSatoshis = parseInt(data.unconfirmedBalance || '0');
            const balance = balanceSatoshis / 100000000; // Convert to DOGE
            const unconfirmed = unconfirmedSatoshis / 100000000;
            
            console.log('\n=== PARSED BALANCE ===');
            console.log(`Confirmed: ${balance} DOGE`);
            console.log(`Unconfirmed: ${unconfirmed} DOGE`);
            console.log(`Total: ${balance + unconfirmed} DOGE`);
            console.log(`Transactions: ${data.txs}`);
            
            return {
                confirmed: balance,
                unconfirmed: unconfirmed,
                total: balance + unconfirmed
            };
        } else {
            throw new Error('API returned invalid data format');
        }
    } catch (error) {
        console.error('API Test Failed:', error.message);
        return null;
    }
}

// Test with your address
testTrezorAPI('DAYfTtLaVgDR69f5eVd9dj45Ck8f7s7Bqd').then(result => {
    if (result) {
        console.log('\n✅ SUCCESS: Trezor API is working!');
    } else {
        console.log('\n❌ FAILED: Trezor API is not working');
    }
});
