const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function simulateDDoS() {
  console.log('🔴 Simulating DDoS Attack...\n');

  const requests = [];
  const requestCount = 150; // Exceeds rate limit of 100/min

  console.log(`Sending ${requestCount} rapid requests...`);

  // Fire off many requests simultaneously
  for (let i = 0; i < requestCount; i++) {
    requests.push(
      axios.get(`${API_URL}/parking`).catch(() => {})
    );
  }

  await Promise.all(requests);

  console.log('\n✅ DDoS simulation complete!');
  console.log('Check SOC Dashboard for API abuse alerts 🚨\n');
}

simulateDDoS().catch(console.error);
