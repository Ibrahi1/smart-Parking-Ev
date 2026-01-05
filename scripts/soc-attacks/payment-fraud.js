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

    // Step 2: Get existing reservations to find one without payment
    console.log('Step 2: Getting existing reservations...');
    const reservationsRes = await axios.get(`${API_URL}/reservation`);
    const reservationsData = reservationsRes.data;
    const reservations = reservationsData.reservations || reservationsData;
    
    // Find an unpaid reservation
    const unpaidReservation = reservations.find(r => r.active && !r.paid);
    
    let reservationId;
    
    if (unpaidReservation) {
      reservationId = unpaidReservation.reservationId;
      console.log(`  ✓ Found unpaid reservation: ${reservationId}\n`);
    } else {
      // Create a new reservation for testing
      console.log('  No unpaid reservations. Creating a new car and reservation...\n');
      
      console.log('Step 3: Creating test car...');
      const carId = `FRAUD-${Date.now()}`;
      try {
        await axios.post(`${API_URL}/car`, {
          carId,
          owner: 'Fraudster',
          batteryLevel: 50,
          evCompatible: false,
          parkingId,
        });
        console.log(`  ✓ Car created: ${carId}`);
        
        // The car creation also creates a reservation automatically
        // Get the new reservation
        const newReservationsRes = await axios.get(`${API_URL}/reservation`);
        const newReservations = newReservationsRes.data.reservations || newReservationsRes.data;
        const newReservation = newReservations.find(r => r.carId === carId && r.active);
        
        if (newReservation) {
          reservationId = newReservation.reservationId;
          console.log(`  ✓ Reservation created: ${reservationId}\n`);
        } else {
          console.log('  ⚠️ Could not find reservation for the new car.\n');
          return;
        }
      } catch (carError) {
        console.log(`  ⚠️ Car creation failed: ${carError.response?.data?.error || carError.message}`);
        console.log('  Continuing with fraud attempts using fake reservation ID...\n');
        reservationId = 'FAKE-RESERVATION-ID';
      }
    }

    // Step 4: Try to start parking WITHOUT payment (FRAUD ATTEMPT)
    console.log('Step 4: Attempting to start parking WITHOUT payment...');
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

    // Step 5: Multiple fraud attempts to trigger detection rules
    console.log('Step 5: Attempting multiple fraud attempts (trigger detection)...');
    for (let i = 1; i <= 10; i++) {
      try {
        await axios.post(`${API_URL}/reservation/${reservationId}/start`);
      } catch (error) {
        console.log(`  [${i}/10] Fraud attempt blocked ✓`);
      }
      await new Promise(resolve => setTimeout(resolve, 300));
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