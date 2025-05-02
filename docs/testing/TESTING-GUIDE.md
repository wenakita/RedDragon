# Testing Guide for OmniDragon

This guide provides instructions on how to run the tests for VRF, cross-chain, and lottery mechanics for the OmniDragon project.

## Overview of Test Contracts

We've created specialized test contracts to validate core functionality:

1. **TestVRFConsumer.sol** - For testing Verifiable Random Function (VRF) functionality
2. **TestCrossChainBridge.sol** - For testing cross-chain messaging and token supply tracking
3. **TestLotteryMechanics.sol** - For testing lottery entries and rewards
4. **TestOmniDragon.sol** - Integration tests for all components together

These contracts are simplified versions of the production code, designed for testing specific functionality in isolation.

## Requirements

- Node.js v14+
- npm or yarn
- Hardhat

## Setup the Testing Environment

1. Install dependencies:
   ```bash
   npm install
   ```

2. Compile the contracts:
   ```bash
   npx hardhat compile
   ```

## Running Tests

### Running Individual Component Tests

When you encounter compilation issues due to dependent contracts, you can isolate testing by:

1. Creating an isolated hardhat config:
   ```js
   // hardhat.isolated.config.js
   module.exports = {
     solidity: "0.8.20",
     paths: {
       sources: "./contracts/test",
       tests: "./test/isolated",
       cache: "./cache-isolated",
       artifacts: "./artifacts-isolated"
     }
   };
   ```

2. Creating isolated test files in `test/isolated/` directory:
   ```js
   // test/isolated/vrf-test.js
   const { expect } = require("chai");
   const { ethers } = require("hardhat");

   describe("TestVRFConsumer", function() {
     let testVRFConsumer;
     let mockCallback;
     let owner, user1;

     beforeEach(async function() {
       [owner, user1, mockCallback] = await ethers.getSigners();
       
       // Deploy TestVRFConsumer
       const TestVRFConsumer = await ethers.getContractFactory("TestVRFConsumer");
       testVRFConsumer = await TestVRFConsumer.deploy(mockCallback.address);
     });
     
     it("should request and deliver randomness", async function() {
       // Set callback target
       await testVRFConsumer.setCallbackTarget(mockCallback.address);
       
       // Request randomness
       await testVRFConsumer.requestRandomness(user1.address);
       
       // Check that request was stored
       expect(await testVRFConsumer.requestToUser(1)).to.equal(user1.address);
       
       // Deliver randomness
       await testVRFConsumer.deliverRandomness(1, 12345);
       
       // Check that request was cleared
       expect(await testVRFConsumer.requestToUser(1)).to.equal(ethers.constants.AddressZero);
     });
   });
   ```

3. Run the tests with the isolated config:
   ```bash
   npx hardhat --config hardhat.isolated.config.js test
   ```

### Testing VRF Functionality

The TestVRFConsumer contract tests the following functionality:

- Requesting randomness from a callback target
- Tracking requests by user address
- Delivering randomness and clearing requests

Expected test flow:
1. Deploy the TestVRFConsumer contract
2. Set a callback target
3. Request randomness for a user
4. Verify the request is tracked
5. Deliver randomness to the callback target
6. Verify the request is cleared

### Testing Cross-Chain Functionality

The TestCrossChainBridge contract tests the following functionality:

- Registering chains and contracts
- Sending messages between chains
- Tracking token supply across chains
- Delivering messages to destination chains

Expected test flow:
1. Deploy the TestCrossChainBridge contract
2. Register multiple chains (e.g., Sonic, Arbitrum)
3. Send a cross-chain message
4. Verify the message is tracked
5. Deliver the message
6. Check that supply is correctly tracked across chains

### Testing Lottery Mechanics

The TestLotteryMechanics contract tests the following functionality:

- Processing swaps that trigger lottery entries
- Building and tracking the jackpot
- Simulating lottery wins based on randomness
- Distributing prizes to winners

Expected test flow:
1. Deploy the TestLotteryMechanics contract
2. Add funds to the jackpot
3. Simulate user swaps to create lottery entries
4. Simulate a lottery win
5. Verify the prize distribution and statistics

### Integration Testing

The TestOmniDragon contract provides an end-to-end test of all components:

- Cross-chain token tracking
- VRF-based lottery entry and winning
- Jackpot accumulation and distribution

Expected test flow:
1. Deploy TestOmniDragon with all components
2. Simulate swaps that trigger lottery entries
3. Simulate VRF randomness delivery
4. Simulate cross-chain transfers
5. Verify all components interact correctly

## Troubleshooting

When encountering compilation issues:

1. **Problem**: Dependencies on external contracts causing compilation errors
   **Solution**: Use isolated test configurations that only compile the test contracts

2. **Problem**: Interface mismatches between test and production contracts
   **Solution**: Simplify interfaces in test contracts to include only necessary functionality

3. **Problem**: Cross-chain contract dependencies
   **Solution**: Create mock implementations that simulate cross-chain behavior without requiring actual LayerZero endpoints

## Conclusion

These test contracts allow thorough testing of the VRF, cross-chain, and lottery mechanics of the OmniDragon project. Use them to verify the following:

1. VRF functionality is secure and properly handles randomness
2. Cross-chain transfers correctly track token supply across chains
3. Lottery mechanics fairly select winners and distribute prizes
4. The whole system works together seamlessly

For further questions or issues, please refer to the detailed documentation in `docs/TestingGuide.md`. 