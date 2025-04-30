# VRF Testing Guide with Forge

This guide explains how to properly test the cross-chain VRF implementation using Forge as the testing framework.

## Test Suite Structure

The VRF testing suite consists of three main test files:

1. **CrossChainVRFTest.t.sol**: Tests the basic cross-chain VRF flow from Sonic to Arbitrum and back
2. **VRFReadTest.t.sol**: Tests the SonicVRFConsumerRead functionality for querying VRF state
3. **VRFFallbackTest.t.sol**: Tests fallback mechanisms and error handling for VRF

## Required Dependencies

To run these tests, you'll need to install the following dependencies:

```bash
# Install Forge standard library
forge install --no-commit foundry-rs/forge-std

# Install Chainlink contracts
forge install --no-commit smartcontractkit/chainlink

# Install OpenZeppelin contracts
forge install --no-commit OpenZeppelin/openzeppelin-contracts

# Install LayerZero contracts (if required versions are available)
forge install --no-commit LayerZero-Labs/solidity-examples
```

## Test Setup and Mocks

Each test file contains a complete setup with the following mock contracts:

1. **MockLzEndpoint**: For simulating LayerZero cross-chain communication
2. **MockCallback**: For simulating the lottery contract that consumes randomness
3. **VRFCoordinatorV2Mock**: From Chainlink, for simulating the VRF Coordinator

## Test Structure

### CrossChainVRFTest.t.sol

This file tests the complete flow of VRF randomness from Sonic chain to Arbitrum and back:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/SonicVRFConsumer.sol";
import "../contracts/ArbitrumVRFRequester.sol";
import "../contracts/mocks/MockLzEndpoint.sol";
import "../contracts/test/MockCallback.sol";
import "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2Mock.sol";

contract CrossChainVRFTest is Test {
    // Test setup with all required contracts
    function setUp() public {
        // Deploy mock contracts
        // Configure VRF
        // Setup cross-chain communication
    }
    
    // Test requesting randomness
    function testRequestRandomness() public {
        // Request randomness from SonicVRFConsumer
        // Verify request is tracked properly
    }
    
    // Test complete cross-chain flow
    function testSonicToArbitrumRandomnessFlow() public {
        // Step 1: Request randomness
        // Step 2: Simulate LayerZero message to Arbitrum
        // Step 3: Fulfill VRF request on Arbitrum
        // Step 4: Simulate LayerZero message back to Sonic
        // Step 5: Verify randomness was delivered to lottery contract
    }
    
    // Test authorization checks
    function testFailOnlyLotteryContractCanRequestRandomness() public {
        // Attempt to request randomness from unauthorized address
    }
    
    // Test source verification
    function testFailOnlyArbitrumVRFRequesterCanDeliverRandomness() public {
        // Attempt to deliver randomness from unauthorized source
    }
    
    // Test parameter updates
    function testOnlyOwnerCanUpdateParameters() public {
        // Update various parameters and verify
    }
}
```

### VRFReadTest.t.sol

This file tests the SonicVRFConsumerRead functionality:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/SonicVRFConsumerRead.sol";
import "../contracts/mocks/MockLzEndpoint.sol";
import "@layerzerolabs/oapp-evm/contracts/oapp/libs/ReadCodecV1.sol";

contract VRFReadTest is Test {
    // Test setup with all required contracts
    function setUp() public {
        // Deploy mock contracts
        // Configure VRF Read
    }
    
    // Test querying VRF state
    function testQueryVRFState() public {
        // Call queryArbitrumVRFState
        // Verify events emitted
    }
    
    // Test handling read response 
    function testHandleReadResponse() public {
        // Prepare mock response data
        // Simulate receiving read response
        // Verify state updated correctly
    }
    
    // Helper function to format response in ReadCodecV1 format
    function formatDecodedResponse(uint256[] memory appLabels, bytes[] memory data) public pure returns (bytes memory) {
        // Format response as expected by the contract
    }
}
```

### VRFFallbackTest.t.sol

This file tests fallback mechanisms and error handling:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/SonicVRFConsumer.sol";
import "../contracts/ArbitrumVRFRequester.sol";
import "../contracts/mocks/MockLzEndpoint.sol";
import "../contracts/test/MockCallback.sol";
import "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2Mock.sol";

contract VRFFallbackTest is Test {
    // Test setup with all required contracts
    function setUp() public {
        // Deploy mock contracts
        // Configure VRF
        // Setup cross-chain communication
    }
    
    // Test handling failed LayerZero message delivery
    function testRequestRandomnessWithFailedLzDeliver() public {
        // Request randomness
        // Do not deliver message
        // Verify request state
    }
    
    // Test handling VRF Coordinator outage
    function testVRFCoordinatorOutage() public {
        // Request randomness
        // Deliver message to Arbitrum
        // Do not fulfill VRF request
        // Verify request state
    }
    
    // Test retry mechanism
    function testRetrySendRandomness() public {
        // Set up full flow with delay
        // Manually call retry function
        // Verify randomness is delivered
    }
    
    // Test security against malicious users
    function testFailOnMaliciousUser() public {
        // Attempt to spoof source address
        // Verify message is rejected
    }
    
    // Test handling randomness processing failures
    function testRandomnessProcessingFailure() public {
        // Use a failing callback contract
        // Verify proper error handling
        // Verify request is still cleaned up
    }
}
```

## Test Coverage Areas

The test suite covers the following key areas:

1. **Basic Functionality**
   - Request randomness from Sonic chain
   - Send request to Arbitrum via LayerZero
   - Get randomness from Chainlink VRF
   - Send randomness back to Sonic chain
   - Process randomness in lottery contract

2. **Read Functionality**
   - Query VRF state on Arbitrum
   - Receive and process read responses
   - Store queried parameters

3. **Error Handling and Fallbacks**
   - Failed LayerZero message delivery
   - VRF Coordinator outage
   - Retry mechanisms
   - Security checks against malicious actors
   - Processing failures in consumer contracts

4. **Administrative Functions**
   - Parameter updates
   - Owner-only access control

## Running the Tests

To run the full test suite:

```bash
forge test
```

To run specific tests:

```bash
# Run CrossChainVRFTest
forge test --match-contract CrossChainVRFTest -vvv

# Run VRFReadTest
forge test --match-contract VRFReadTest -vvv

# Run VRFFallbackTest
forge test --match-contract VRFFallbackTest -vvv
```

## Required Mock Implementations

For these tests to work, you'll need the following mock implementations:

1. **MockLzEndpoint.sol**
   - Simulates sending and receiving LayerZero messages
   - Provides utility methods for testing

2. **MockCallback.sol**
   - Implements callback interface for receiving randomness
   - Tracks received randomness for verification

3. **FailingMockCallback.sol**
   - Extends MockCallback but deliberately fails
   - Used for testing error handling

4. **MockSonicVRFConsumerRead.sol**
   - Simplified version of SonicVRFConsumerRead
   - Exposes internal methods for testing

## Integration with Existing Tests

These tests should be integrated into the existing test framework by:

1. Ensuring all imports resolve correctly
2. Using consistent naming patterns for test contracts
3. Following the same style as other tests in the codebase
4. Verifying all tests pass with the complete test suite 