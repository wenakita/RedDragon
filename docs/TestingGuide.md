# OmniDragon Testing Guide

This guide explains how to use the test contracts to verify VRF, cross-chain, and lottery mechanics of the OmniDragon project.

## Test Contracts Overview

We've created several test-specific contracts to help validate the core functionality:

1. **TestVRFConsumer.sol** - Tests VRF (Verifiable Random Function) functionality
2. **TestCrossChainBridge.sol** - Tests cross-chain bridge and messaging
3. **TestLotteryMechanics.sol** - Tests lottery entry and winning mechanics
4. **TestOmniDragon.sol** - Integration test combining all components

## Setup and Requirements

Before running the tests, ensure you have:

1. Node.js (v14 or higher)
2. Hardhat installed (`npm install hardhat`)
3. Project dependencies installed (`npm install`)

## Test Files

We've created several test files to test each component:

1. `test/minimal/vrf-test-consumer.js` - Tests the TestVRFConsumer contract
2. `test/minimal/cross-chain-bridge-test.js` - Tests the TestCrossChainBridge contract
3. `test/minimal/lottery-mechanics-test.js` - Tests the TestLotteryMechanics contract
4. `test/OmniDragonTestContracts.test.js` - Integration test for all components

## Running the Tests

To run all the tests:

```bash
npx hardhat test
```

To run a specific test file:

```bash
npx hardhat test test/minimal/vrf-test-consumer.js
```

## Test Cases

### VRF Testing

The VRF tests verify:
- Requesting randomness from the VRF consumer
- Delivering randomness to the requestor
- Proper tracking of requests and users
- Permissions and security checks

Key test files:
- `TestVRFConsumer.sol` - The VRF consumer contract being tested
- `test/minimal/vrf-test-consumer.js` - Tests for the VRF consumer

Example VRF flow:

```javascript
// 1. Deploy TestVRFConsumer
const TestVRFConsumer = await ethers.getContractFactory("TestVRFConsumer");
const testVRFConsumer = await TestVRFConsumer.deploy(callbackTarget.address);

// 2. Request randomness
const tx = await testVRFConsumer.requestRandomness(user.address);
const receipt = await tx.wait();
const requestEvent = receipt.events.find(e => e.event === "RandomnessRequested");
const requestId = requestEvent.args.requestId;

// 3. Deliver randomness
const randomValue = 12345;
await testVRFConsumer.deliverRandomness(requestId, randomValue);
```

### Cross-Chain Testing

The cross-chain tests verify:
- Registering chains in the bridge
- Sending messages between chains
- Tracking token supply across chains
- Chain-specific contract registration

Key test files:
- `TestCrossChainBridge.sol` - The cross-chain bridge contract being tested
- `test/minimal/cross-chain-bridge-test.js` - Tests for the cross-chain bridge

Example cross-chain message flow:

```javascript
// 1. Deploy TestCrossChainBridge
const TestCrossChainBridge = await ethers.getContractFactory("TestCrossChainBridge");
const testCrossChainBridge = await TestCrossChainBridge.deploy(146, "Sonic");

// 2. Register additional chain
await testCrossChainBridge.registerChain(110, "Arbitrum");

// 3. Send cross-chain message
const payload = ethers.utils.defaultAbiCoder.encode(
  ["address", "uint256"], 
  [recipient.address, amount]
);

const tx = await testCrossChainBridge.sendMessage(
  146, // Source chain
  110, // Destination chain
  sender.address,
  receiver.address,
  payload
);

// 4. Get the message ID
const receipt = await tx.wait();
const messageId = receipt.events[0].args.messageId;

// 5. Deliver the message
await testCrossChainBridge.deliverMessage(messageId, executor.address);
```

### Lottery Testing

The lottery tests verify:
- User swaps trigger lottery entries
- Jackpot accumulation and tracking
- Winner selection based on randomness
- Prize distribution

Key test files:
- `TestLotteryMechanics.sol` - The lottery mechanics contract being tested
- `test/minimal/lottery-mechanics-test.js` - Tests for the lottery mechanics

Example lottery flow:

```javascript
// 1. Deploy TestLotteryMechanics
const TestLotteryMechanics = await ethers.getContractFactory("TestLotteryMechanics");
const testLotteryMechanics = await TestLotteryMechanics.deploy(
  wrappedSonic.address,
  dragonToken.address,
  swapTrigger.address
);

// 2. Add to jackpot
await wrappedSonic.approve(testLotteryMechanics.address, ethers.utils.parseEther("100"));
await testLotteryMechanics.addToJackpot(ethers.utils.parseEther("100"));

// 3. Simulate a swap that triggers lottery entry
await wrappedSonic.approve(testLotteryMechanics.address, ethers.utils.parseEther("50"));
await testLotteryMechanics.simulateSwap(ethers.utils.parseEther("50"));

// 4. Simulate a lottery win
await testLotteryMechanics.simulateWin(winner.address, ethers.utils.parseEther("50"));
```

### Integration Testing

The integration tests combine all the above components to verify the entire flow:
- Token swaps trigger lottery entries
- VRF provides randomness for winner selection
- Cross-chain transfers maintain proper token accounting
- Jackpot accumulation and distribution works end-to-end

Key test files:
- `TestOmniDragon.sol` - The integration test contract
- `test/OmniDragonTestContracts.test.js` - Tests for the integration

Example integration flow:

```javascript
// 1. Deploy TestOmniDragon
const TestOmniDragon = await ethers.getContractFactory("TestOmniDragon");
const testOmniDragon = await TestOmniDragon.deploy(
  deployer.address,
  user1.address,
  user2.address,
  dragonToken.address
);

// 2. Simulate swap and lottery entry
await wrappedSonic.approve(testOmniDragon.address, ethers.utils.parseEther("50"));
await testOmniDragon.simulateSwap(user1.address, ethers.utils.parseEther("50"));

// 3. Simulate VRF randomness delivery
await testOmniDragon.simulateRandomnessDelivery(1, 12345);

// 4. Simulate cross-chain transfer
await testOmniDragon.simulateCrossChainTransfer(
  user1.address,
  110, // Arbitrum chain ID
  ethers.utils.parseEther("1000")
);
```

## Troubleshooting

If you encounter compilation issues with the test contracts:

1. Make sure you have the correct OpenZeppelin version (4.9.0+)
2. Verify that the TestVRFConsumer contract imports match your project's
3. Check that the mocked interfaces match the actual interfaces
4. If issues persist with unrelated contracts, try using `isolatedModules: true` in your Hardhat config

## Conclusion

These test contracts provide a comprehensive way to validate the VRF, cross-chain, and lottery mechanics of the OmniDragon project. They simplify testing complex functionality and allow for isolation of components for targeted testing.

For more details on implementing these tests in your own projects, refer to the README.md file in the test/contracts directory. 