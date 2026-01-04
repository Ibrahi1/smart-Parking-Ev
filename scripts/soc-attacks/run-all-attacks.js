const { spawn } = require('child_process');

const attacks = [
  { name: 'Brute Force Attack', file: 'brute-force.js' },
  { name: 'DDoS Simulation', file: 'ddos-simulation.js' },
  { name: 'Payment Fraud', file: 'payment-fraud.js' },
];

async function runAttack(file) {
  return new Promise((resolve) => {
    const proc = spawn('node', [file], { stdio: 'inherit' });
    proc.on('close', resolve);
  });
}

async function runAllAttacks() {
  console.log('═══════════════════════════════════════════');
  console.log('🛡️  SOC SECURITY TESTING SUITE');
  console.log('═══════════════════════════════════════════\n');

  for (const attack of attacks) {
    console.log(`\n▶️  Running: ${attack.name}`);
    console.log('─'.repeat(50));
    await runAttack(attack.file);
    console.log('─'.repeat(50));
    
    // Wait 2 seconds between attacks
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('✅ All attack simulations complete!');
  console.log('📊 Check SOC Dashboard for results');
  console.log('═══════════════════════════════════════════\n');
}

runAllAttacks().catch(console.error);
