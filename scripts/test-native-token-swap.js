const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Test Native Token Swapping across chains
 * This script runs tests to ensure consistent native token swapping
 * behavior across all supported chains
 */

// Define chain configurations for testing
const chains = [
  { name: 'Sonic', chainId: 146, symbol: 'wS' },
  { name: 'Arbitrum', chainId: 110, symbol: 'wARB' },
  { name: 'Optimism', chainId: 111, symbol: 'wOP' },
  { name: 'Ethereum', chainId: 102, symbol: 'wETH' },
  { name: 'Avalanche', chainId: 106, symbol: 'wAVAX' },
  { name: 'Polygon', chainId: 109, symbol: 'wMATIC' }
];

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Log file
const logFile = path.join(logsDir, `native-token-swap-tests-${Date.now()}.log`);
fs.writeFileSync(logFile, '=== Native Token Swap Tests ===\n\n');

// Function to log messages
function log(message) {
  console.log(message);
  fs.appendFileSync(logFile, message + '\n');
}

// Function to run test with specific configuration
function runTest() {
  log('Running cross-chain native token swap tests...');
  
  try {
    // Run tests
    const result = execSync('npx hardhat test test/CrossChainTokenSwapTest.js --network hardhat', { 
      encoding: 'utf-8' 
    });
    
    log('Test results:');
    log(result);
    
    // Check for passing tests
    if (result.includes('passing')) {
      log('✅ All tests passed successfully');
      return true;
    } else {
      log('❌ Some tests failed');
      return false;
    }
  } catch (error) {
    log('❌ Error running tests:');
    log(error.toString());
    return false;
  }
}

// Main function
async function main() {
  log('Starting Native Token Swap Tests');
  log(`Testing across ${chains.length} chains: ${chains.map(c => c.name).join(', ')}`);
  log('==============================================');
  
  const success = runTest();
  
  log('==============================================');
  log(`Tests ${success ? 'PASSED' : 'FAILED'}`);
  log('See detailed logs in: ' + logFile);
  
  process.exit(success ? 0 : 1);
}

// Run the main function
main().catch(console.error); 