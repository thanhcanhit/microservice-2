/**
 * Test script for Circuit Breaker pattern
 *
 * This script makes multiple requests to the flaky endpoint to demonstrate
 * how the circuit breaker opens after multiple failures.
 */

const axios = require('axios');

// Configuration
const ORDER_SERVICE_URL = 'http://localhost:3000/api/orders';
const NUM_REQUESTS = 30; // Increased from 20 to 30 for better observation
const DELAY_BETWEEN_REQUESTS_MS = 1000; // Increased from 500ms to 1000ms

// Function to get circuit breaker status
async function getCircuitBreakerStatus() {
  try {
    const response = await axios.get(`${ORDER_SERVICE_URL}/status/circuit-breaker`);
    return response.data;
  } catch (error) {
    console.error('Error getting circuit breaker status:', error.message);
    return null;
  }
}

// Function to make a request to the flaky endpoint
async function testCircuitBreaker() {
  try {
    const response = await axios.get(`${ORDER_SERVICE_URL}/test/circuit-breaker`);
    console.log('Request successful:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Request failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Function to delay execution
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function to run the test
async function runTest() {
  console.log('Starting Circuit Breaker test...');
  console.log('Initial circuit breaker status:');
  const initialStatus = await getCircuitBreakerStatus();
  console.log(JSON.stringify(initialStatus, null, 2));

  console.log(`\nMaking ${NUM_REQUESTS} requests to flaky endpoint...`);

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < NUM_REQUESTS; i++) {
    console.log(`\nRequest ${i + 1}/${NUM_REQUESTS}`);
    const result = await testCircuitBreaker();

    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }

    // Get circuit breaker status after each request
    const status = await getCircuitBreakerStatus();
    console.log('Circuit status:', status.flakyTest.status);
    console.log('Circuit stats:', status.flakyTest.stats);

    // If circuit is open, we'll see requests being rejected
    if (status.flakyTest.status === 'open') {
      console.log('Circuit is now OPEN - requests are being rejected without reaching the service');
    }

    await delay(DELAY_BETWEEN_REQUESTS_MS);
  }

  console.log('\nTest completed!');
  console.log(`Success: ${successCount}, Failures: ${failureCount}`);

  console.log('\nFinal circuit breaker status:');
  const finalStatus = await getCircuitBreakerStatus();
  console.log(JSON.stringify(finalStatus, null, 2));
}

// Run the test
runTest().catch(error => {
  console.error('Error running test:', error);
});
