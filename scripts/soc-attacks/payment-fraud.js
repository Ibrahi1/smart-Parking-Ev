// scripts/soc-attacks/payment-fraud.js

const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function simulatePaymentFraud() {
  console.log('\n═══════════════════════════════════════');
  console.log('🔴 SIMULATING PAYMENT FRAUD ATTACK');
  console.log('═══════════════════════════════════════\n');

  try {
    // Step 1: Get available parkings
    console.log('Step 1: Getting available parkings...');
    const parkingsRes = await axios.get(`${API_URL}/parking`);
    const parkingsData = parkingsRes.data;
    const parkings = parkingsData.parkings || parkingsData;
    
    if (!parkings || parkings.length === 0) {
      console.log('  ⚠️ No parkings available. Please create one first.');
      return;
    }
    
    const parkingId = parkings[0].parkingId;
    console.log(`  ✓ Using parking: ${parkingId}\n`);

    // Step 2: Create a test car
    console.log('Step 2: Creating test car...');
    const carId = `FRAUD-${Date.now()}`;
    const carRes = await axios.post(`${API_URL}/car`, {
      carId,
      owner: 'Fraudster',
      batteryLevel: 50,
      evCompatible: false,
      parkingId,
    });
    console.log(`  ✓ Car created: ${carId}\n`);

    // Step 3: Get available places
    console.log('Step 3: Getting available places...');
    const placesRes = await axios.get(`${API_URL}/parking/${parkingId}/places`);
    const placesData = placesRes.data;
    const places = placesData.places || placesData;
    const availablePlace = places.find(p => p.status === 'free' && p.type === 'regular');
    
    if (!availablePlace) {
      console.log('  ⚠️ No available places found. Creating reservation anyway for fraud test...');
      // Continue with fraud test even without available place
    } else {
      console.log(`  ✓ Found available place: ${availablePlace.placeId}\n`);
    }

    // Step 4: Make a reservation
    console.log('Step 4: Making reservation...');
    const reservationRes = await axios.post(`${API_URL}/reservation`, {
      carId,
      placeId: availablePlace.placeId,
      placeType: 'regular',
    });
    const reservationId = reservationRes.data.reservationId;
    console.log(`  ✓ Reservation created: ${reservationId}\n`);

    // Step 5: Try to start parking WITHOUT payment
    console.log('Step 5: Attempting to start parking WITHOUT payment...');
    console.log('  ⚠️ This should be BLOCKED by smart contract!\n');

    try {
      await axios.post(`${API_URL}/reservation/${reservationId}/start`);
      console.log('  ❌ FRAUD SUCCEEDED - This should NOT happen!');
      console.log('  ⚠️ Security vulnerability detected!\n');
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      console.log('  ✅ FRAUD PREVENTED by blockchain validation!');
      console.log(`  • Reason: ${errorMsg}\n`);
    }

    // Try 5 more times to trigger brute force detection
    console.log('Step 6: Attempting multiple fraud attempts (trigger detection)...');
    for (let i = 1; i <= 5; i++) {
      try {
        await axios.post(`${API_URL}/reservation/${reservationId}/start`);
      } catch (error) {
        console.log(`  [${i}/5] Fraud attempt blocked ✓`);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

  } catch (error) {
    console.error('\n  ❌ Setup error:', error.response?.data || error.message);
  }

  console.log('\n═══════════════════════════════════════');
  console.log('✅ Payment Fraud Simulation Complete!');
  console.log('═══════════════════════════════════════');
  console.log('\n📊 Expected in SOC Dashboard:');
  console.log('  • Alert: "Payment Fraud Attempt"');
  console.log('  • Severity: HIGH');
  console.log('  • Multiple fraud attempts logged');
  console.log('  • Incident created\n');
}

simulatePaymentFraud().catch(error => {
  console.error('\n❌ Simulation error:', error.message);
  process.exit(1);
});