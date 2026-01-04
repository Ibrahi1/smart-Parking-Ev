const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function simulateBruteForce() {
  console.log('🔴 Simulating Brute Force Attack...\n');

  // Simulate 10 failed reservation attempts in quick succession
  for (let i = 1; i <= 10; i++) {
    try {
      console.log(`Attempt ${i}/10: Trying to reserve place...`);
      
      // This will fail because we're using invalid data
      await axios.post(`${API_URL}/reservation`, {
        carId: 'INVALID_CAR',
        placeId: 'PL1-001',
        placeType: 'regular',
      });
    } catch (error) {
      console.log(`❌ Failed (expected)`);
    }

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n✅ Brute force attack simulation complete!');
  console.log('Check SOC Dashboard for alerts 🚨\n');
}

simulateBruteForce().catch(console.error);
