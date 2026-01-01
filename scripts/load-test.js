#!/usr/bin/env node

/**
 * Load Testing Script for Smart Parking System
 * Tests concurrent reservations and measures blockchain performance
 */

const axios = require('axios');
const fs = require('fs');

const API_BASE = process.env.API_URL || 'http://localhost:3001/api';
const PARKING_ID = 'P1';

// Test configuration
const TEST_CONFIG = {
  numCars: parseInt(process.argv[2]) || 10,
  concurrentReservations: parseInt(process.argv[3]) || 5,
  delayBetweenBatches: 1000, // ms
};

const results = {
  timestamp: new Date().toISOString(),
  config: TEST_CONFIG,
  cars: [],
  reservations: [],
  errors: [],
  metrics: {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageLatency: 0,
    minLatency: Infinity,
    maxLatency: 0,
    totalDuration: 0,
  },
};

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function registerCar(index) {
  const carId = `LOAD-CAR-${index}`;
  const startTime = Date.now();

  try {
    const response = await axios.post(`${API_BASE}/car`, {
      carId,
      owner: `LoadTest-${index}`,
      batteryLevel: Math.floor(Math.random() * 50) + 50,
      evCompatible: Math.random() > 0.5,
    });

    const latency = Date.now() - startTime;

    results.cars.push({
      carId,
      status: 'success',
      latency,
      evCompatible: response.data.car.evCompatible,
    });

    return {
      carId,
      evCompatible: response.data.car.evCompatible,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    results.cars.push({
      carId,
      status: 'failed',
      latency,
      error: error.message,
    });
    results.errors.push({
      operation: 'registerCar',
      carId,
      error: error.message,
    });
    return null;
  }
}

async function requestReservation(car) {
  const startTime = Date.now();

  try {
    const response = await axios.post(`${API_BASE}/reservation`, {
      carId: car.carId,
      parkingId: PARKING_ID,
      desiredType: car.evCompatible ? 'ev' : 'regular',
    });

    const latency = Date.now() - startTime;

    results.reservations.push({
      reservationId: response.data.reservation.reservationId,
      carId: car.carId,
      placeId: response.data.place.placeId,
      status: 'success',
      latency,
      txId: response.data.txId,
    });

    results.metrics.successfulRequests++;
    updateLatencyMetrics(latency);

    return response.data;
  } catch (error) {
    const latency = Date.now() - startTime;

    results.reservations.push({
      carId: car.carId,
      status: 'failed',
      latency,
      error: error.response?.data?.error || error.message,
    });

    results.errors.push({
      operation: 'requestReservation',
      carId: car.carId,
      error: error.response?.data?.error || error.message,
    });

    results.metrics.failedRequests++;
    updateLatencyMetrics(latency);

    return null;
  }
}

function updateLatencyMetrics(latency) {
  results.metrics.minLatency = Math.min(results.metrics.minLatency, latency);
  results.metrics.maxLatency = Math.max(results.metrics.maxLatency, latency);
}

async function runLoadTest() {
  console.log('='.repeat(60));
  console.log('Smart Parking Load Test');
  console.log('='.repeat(60));
  console.log(`Configuration:`);
  console.log(`  - Number of cars: ${TEST_CONFIG.numCars}`);
  console.log(`  - Concurrent reservations: ${TEST_CONFIG.concurrentReservations}`);
  console.log(`  - API Base: ${API_BASE}`);
  console.log('='.repeat(60));

  const overallStart = Date.now();

  // Phase 1: Register all cars
  console.log('\nPhase 1: Registering cars...');
  const carPromises = [];
  for (let i = 0; i < TEST_CONFIG.numCars; i++) {
    carPromises.push(registerCar(i));
  }

  const cars = (await Promise.all(carPromises)).filter((car) => car !== null);
  console.log(`✓ Registered ${cars.length} cars`);

  await sleep(TEST_CONFIG.delayBetweenBatches);

  // Phase 2: Concurrent reservations
  console.log('\nPhase 2: Making concurrent reservations...');

  for (
    let i = 0;
    i < cars.length;
    i += TEST_CONFIG.concurrentReservations
  ) {
    const batch = cars.slice(i, i + TEST_CONFIG.concurrentReservations);
    console.log(
      `  Batch ${Math.floor(i / TEST_CONFIG.concurrentReservations) + 1}: ${
        batch.length
      } concurrent reservations`
    );

    results.metrics.totalRequests += batch.length;

    const reservationPromises = batch.map((car) => requestReservation(car));
    await Promise.all(reservationPromises);

    if (i + TEST_CONFIG.concurrentReservations < cars.length) {
      await sleep(TEST_CONFIG.delayBetweenBatches);
    }
  }

  const overallDuration = Date.now() - overallStart;
  results.metrics.totalDuration = overallDuration;

  // Calculate average latency
  const allLatencies = results.reservations
    .filter((r) => r.latency)
    .map((r) => r.latency);
  results.metrics.averageLatency =
    allLatencies.reduce((sum, lat) => sum + lat, 0) / allLatencies.length || 0;

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('Test Results');
  console.log('='.repeat(60));
  console.log(`Total Duration: ${overallDuration}ms`);
  console.log(
    `Total Requests: ${results.metrics.totalRequests}`
  );
  console.log(
    `Successful: ${results.metrics.successfulRequests} (${(
      (results.metrics.successfulRequests / results.metrics.totalRequests) *
      100
    ).toFixed(1)}%)`
  );
  console.log(
    `Failed: ${results.metrics.failedRequests} (${(
      (results.metrics.failedRequests / results.metrics.totalRequests) *
      100
    ).toFixed(1)}%)`
  );
  console.log(
    `Average Latency: ${results.metrics.averageLatency.toFixed(2)}ms`
  );
  console.log(`Min Latency: ${results.metrics.minLatency}ms`);
  console.log(`Max Latency: ${results.metrics.maxLatency}ms`);
  console.log(
    `TPS: ${(
      results.metrics.totalRequests /
      (overallDuration / 1000)
    ).toFixed(2)}`
  );

  if (results.errors.length > 0) {
    console.log(`\nErrors (${results.errors.length}):`);
    results.errors.slice(0, 5).forEach((err, i) => {
      console.log(`  ${i + 1}. ${err.operation} - ${err.error}`);
    });
    if (results.errors.length > 5) {
      console.log(`  ... and ${results.errors.length - 5} more errors`);
    }
  }

  // Save results to CSV
  const csvFilename = `load-test-${Date.now()}.csv`;
  const csvData = [
    'Operation,CarId,Status,Latency,Error',
    ...results.reservations.map(
      (r) =>
        `Reservation,${r.carId},${r.status},${r.latency},${r.error || ''}`
    ),
  ].join('\n');

  fs.writeFileSync(csvFilename, csvData);
  console.log(`\n✓ Results saved to ${csvFilename}`);

  // Save detailed JSON
  const jsonFilename = `load-test-${Date.now()}.json`;
  fs.writeFileSync(jsonFilename, JSON.stringify(results, null, 2));
  console.log(`✓ Detailed results saved to ${jsonFilename}`);

  console.log('='.repeat(60));
}

// Run the test
runLoadTest().catch((error) => {
  console.error('Load test failed:', error);
  process.exit(1);
});
