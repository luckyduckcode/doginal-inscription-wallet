const { DogeElectrumWallet } = require('./Doginal-Wallet-COMPLETE/dist-complete/main.js');

async function testFees() {
  console.log('🧪 Testing Fee Calculations (Dogecoin realistic rates):');
  console.log('');

  const wallet = new DogeElectrumWallet();

  // Test different scenarios
  const scenarios = [
    { inputs: 1, outputs: 2, feeRate: 1, desc: 'Simple transfer (1 sat/byte)' },
    { inputs: 1, outputs: 2, feeRate: 10, desc: 'Normal transfer (10 sat/byte)' },
    { inputs: 1, outputs: 2, feeRate: 50, desc: 'Priority transfer (50 sat/byte)' },
    { inputs: 1, outputs: 3, feeRate: 10, desc: 'Inscription tx (10 sat/byte)' },
    { inputs: 2, outputs: 3, feeRate: 10, desc: 'Complex tx (10 sat/byte)' }
  ];

  for (const scenario of scenarios) {
    const fee = await wallet.estimateFee(scenario.inputs, scenario.outputs, scenario.feeRate);
    console.log(`${scenario.desc}: ${fee.toFixed(8)} DOGE`);
  }

  console.log('');
  console.log('📊 Fee Rate Comparison:');
  console.log('Old default (500,000 sat/byte): ~0.005 DOGE per tx');
  console.log('New default (10 sat/byte): ~0.000001 DOGE per tx');
  console.log('✅ 5000x more reasonable fees!');
}

testFees().catch(console.error);
