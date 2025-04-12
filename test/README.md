# RedDragon Testing Suite

This directory contains comprehensive tests for the RedDragon token and its related contracts. The testing suite is designed to verify all functionality and ensure the reliability and security of the system.

## Test Files

- **RedDragon.test.js**: Core token functionality tests
- **RedDragonPaintSwapVerifier.test.js**: VRF integration tests
- **RedDragonRequirements.test.js**: Business requirements verification tests

## Testing Approach

### Fixtures Pattern

We use Hardhat's `loadFixture` to create efficient, reusable test environments:

```javascript
async function deployVerifierFixture() {
  // Deploy mock VRF Coordinator
  const mockVRFCoordinator = await ethers.deployContract("MockVRFCoordinator");
  
  // Deploy and initialize verifier
  const verifier = await ethers.deployContract("RedDragonPaintSwapVerifier");
  await verifier.initialize(/* parameters */);
  
  return { verifier, mockVRFCoordinator, /* other contracts */ };
}

// Usage in tests
const { verifier, mockVRFCoordinator } = await loadFixture(deployVerifierFixture);
```

This pattern ensures:
- Tests start with a clean state
- Setup code is not repeated unnecessarily
- Test execution is optimized for speed

### Robust Event Handling

For event-based tests, we use multiple approaches for reliability:

1. **Event Listeners** for simple cases:
```javascript
mockVRFCoordinator.on("RandomnessRequested", (requestId) => {
  // Handle event
});
```

2. **Log Parsing** for more robust tests:
```javascript
const verifierLogs = receipt.logs.filter(log => {
  try {
    const parsed = verifier.interface.parseLog(log);
    return parsed && parsed.name === "RandomnessRequested";
  } catch (e) {
    return false;
  }
});
```

3. **Multiple Fallbacks** to ensure test reliability:
```javascript
// First try one approach
// If that fails, try another approach
// Finally use a fallback method
```

### Diagnostic Logging

Critical tests include extensive logging for easier troubleshooting:

```javascript
console.log(">> TEST STARTING: Should fulfill randomness request");
// ... test steps with logs ...
console.log(">> TEST COMPLETED SUCCESSFULLY");
```

## Test Categories

Tests are organized by functionality:

### 1. Deployment Tests
Verify contracts initialize with the correct state and configuration.

### 2. Core Functionality Tests
Validate the essential features of each contract:
- Token transfers
- Fee collection and distribution
- Transaction limits

### 3. Integration Tests
Test interaction between contracts:
- Lottery entry detection
- VRF randomness flow
- Jackpot distribution

### 4. Error Cases
Verify proper handling of error conditions:
- Permission checks
- Invalid inputs
- Edge cases

### 5. Requirements Verification
Validate business requirements are met:
- 10% fees on buys and sells
- Only buys from wS to DRAGON enter lottery
- Fees distributed correctly
- Jackpot in wS tokens

## Running Tests

Run all tests:
```bash
npx hardhat test
```

Run specific test file:
```bash
npx hardhat test test/RedDragonPaintSwapVerifier.test.js
```

Run tests with a specific grep pattern:
```bash
npx hardhat test --grep "Randomness Fulfillment"
```

## Best Practices

1. **Isolated Tests**: Each test should be independent and not rely on the state from other tests
2. **Complete Assertions**: Verify all relevant state changes, not just one aspect
3. **Error Testing**: Include tests for expected error conditions
4. **Clear Test Names**: Use descriptive test names that explain what is being tested
5. **Minimal Mocking**: Mock only what's necessary to simulate external dependencies 