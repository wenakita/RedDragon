// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/SonicVRFConsumer.sol";
import "../../contracts/ArbitrumVRFRequester.sol";
import "../../contracts/mocks/MockLzEndpoint.sol";
import "../../contracts/test/MockCallback.sol";
import "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2Mock.sol";

contract VRFFallbackTest is Test {
    // Contracts
    MockLzEndpoint public sonicLzEndpoint;
    MockLzEndpoint public arbitrumLzEndpoint;
    MockCallback public lotteryContract;
    SonicVRFConsumer public sonicVRFConsumer;
    ArbitrumVRFRequester public arbitrumVRFRequester;
    VRFCoordinatorV2Mock public vrfCoordinator;
    
    // Chain IDs
    uint32 public constant SONIC_CHAIN_ID = 1;
    uint32 public constant ARBITRUM_CHAIN_ID = 110;
    
    // VRF parameters
    uint64 public subscriptionId;
    bytes32 public keyHash = bytes32(uint256(123456)); // Mock key hash
    
    // Test accounts
    address public owner = address(1);
    address public user1 = address(2);
    address public malicious = address(3);
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy mock LZ endpoints
        sonicLzEndpoint = new MockLzEndpoint();
        arbitrumLzEndpoint = new MockLzEndpoint();
        
        // Deploy VRF coordinator mock
        vrfCoordinator = new VRFCoordinatorV2Mock(100000000000000000, 1000000000);
        
        // Create and fund subscription
        subscriptionId = vrfCoordinator.createSubscription();
        vrfCoordinator.fundSubscription(subscriptionId, 10 ether);
        
        // Deploy mock lottery contract
        lotteryContract = new MockCallback();
        
        // Deploy Arbitrum VRF requester
        arbitrumVRFRequester = new ArbitrumVRFRequester(
            address(vrfCoordinator),
            address(arbitrumLzEndpoint),
            subscriptionId,
            keyHash,
            SONIC_CHAIN_ID,
            address(0) // Will update after deploying SonicVRFConsumer
        );
        
        // Add consumer to subscription
        vrfCoordinator.addConsumer(subscriptionId, address(arbitrumVRFRequester));
        
        // Deploy Sonic VRF consumer
        sonicVRFConsumer = new SonicVRFConsumer(
            address(sonicLzEndpoint),
            ARBITRUM_CHAIN_ID,
            address(arbitrumVRFRequester),
            address(lotteryContract)
        );
        
        // Update the SonicVRFConsumer address in ArbitrumVRFRequester
        arbitrumVRFRequester.updateSonicVRFConsumer(address(sonicVRFConsumer));
        
        vm.stopPrank();
        
        // Fund contracts with ETH for fees
        vm.deal(address(sonicVRFConsumer), 10 ether);
        vm.deal(address(arbitrumVRFRequester), 10 ether);
    }
    
    function testRequestRandomnessWithFailedLzDeliver() public {
        // Step 1: Request randomness from Sonic chain
        vm.prank(address(lotteryContract));
        uint64 sonicRequestId = sonicVRFConsumer.requestRandomness(user1);
        
        // Step 2: Verify request was registered
        assertEq(sonicVRFConsumer.requestToUser(sonicRequestId), user1);
        
        // Step 3: Simulate LZ delivery failure (no simulation of LZ message delivery)
        
        // Step 4: Verify retry mechanism
        // This would require a retry function to be implemented in the contract
        // For now, we'll just verify the request is still registered
        assertEq(sonicVRFConsumer.requestToUser(sonicRequestId), user1);
    }
    
    function testVRFCoordinatorOutage() public {
        // Step 1: Request randomness from Sonic chain
        vm.prank(address(lotteryContract));
        uint64 sonicRequestId = sonicVRFConsumer.requestRandomness(user1);
        
        // Step 2: Deliver message to Arbitrum
        bytes memory payload = abi.encode(sonicRequestId, user1);
        vm.prank(address(sonicLzEndpoint));
        arbitrumLzEndpoint.mockLzReceive(
            SONIC_CHAIN_ID,
            abi.encodePacked(address(sonicVRFConsumer)),
            0,
            payload
        );
        
        // Step 3: Simulate VRF Coordinator outage by not fulfilling the request
        uint256 vrfRequestId = 1; // First VRF request ID
        
        // Step 4: Check request status in ArbitrumVRFRequester
        (bool exists, bool fulfilled, uint256 randomness) = arbitrumVRFRequester.getRequestStatus(vrfRequestId);
        assertEq(exists, true);
        assertEq(fulfilled, false);
        assertEq(randomness, 0);
    }
    
    function testRetrySendRandomness() public {
        // Step 1: Request randomness from Sonic chain
        vm.prank(address(lotteryContract));
        uint64 sonicRequestId = sonicVRFConsumer.requestRandomness(user1);
        
        // Step 2: Deliver message to Arbitrum
        bytes memory payload = abi.encode(sonicRequestId, user1);
        vm.prank(address(sonicLzEndpoint));
        arbitrumLzEndpoint.mockLzReceive(
            SONIC_CHAIN_ID,
            abi.encodePacked(address(sonicVRFConsumer)),
            0,
            payload
        );
        
        // Step 3: Fulfill VRF request
        uint256 vrfRequestId = 1; // First VRF request ID
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 123456789;
        
        vm.prank(address(vrfCoordinator));
        vrfCoordinator.fulfillRandomWordsWithOverride(
            vrfRequestId,
            address(arbitrumVRFRequester),
            randomWords
        );
        
        // Step 4: Verify request was fulfilled but not delivered to Sonic
        (bool exists, bool fulfilled, uint256 randomness) = arbitrumVRFRequester.getRequestStatus(vrfRequestId);
        assertEq(exists, true);
        assertEq(fulfilled, true);
        assertEq(randomness, randomWords[0]);
        
        // Request is still registered in SonicVRFConsumer (because delivery is mocked and not automatic)
        assertEq(sonicVRFConsumer.requestToUser(sonicRequestId), user1);
        
        // Step 5: Simulate retry through manual call to retrySendRandomness
        vm.prank(owner);
        arbitrumVRFRequester.retrySendRandomness(vrfRequestId);
        
        // Step 6: Now manually deliver the message to Sonic
        bytes memory returnPayload = abi.encode(sonicRequestId, user1, randomWords[0]);
        vm.prank(address(arbitrumLzEndpoint));
        sonicLzEndpoint.mockLzReceive(
            ARBITRUM_CHAIN_ID,
            abi.encodePacked(address(arbitrumVRFRequester)),
            0,
            returnPayload
        );
        
        // Step 7: Verify the request was cleaned up in SonicVRFConsumer
        assertEq(sonicVRFConsumer.requestToUser(sonicRequestId), address(0));
        
        // Step 8: Verify the lottery contract received the randomness
        assertEq(lotteryContract.receivedRandomness(sonicRequestId), randomWords[0]);
    }
    
    function testFailOnMaliciousUser() public {
        // Prepare a payload to spoof as a user in the fallback mechanism
        bytes memory maliciousPayload = abi.encode(uint64(0), malicious, uint256(789));
        
        // Try to call from a malicious user pretending to be ArbitrumVRFRequester
        vm.prank(address(sonicLzEndpoint));
        sonicLzEndpoint.mockLzReceive(
            ARBITRUM_CHAIN_ID,
            abi.encodePacked(malicious), // Not the ArbitrumVRFRequester
            0,
            maliciousPayload
        );
        
        // This should fail due to validation in SonicVRFConsumer._lzReceive
    }
    
    function testRandomnessProcessingFailure() public {
        // Step 1: Set up a failing lottery contract
        FailingMockCallback failingLottery = new FailingMockCallback();
        
        // Step 2: Update SonicVRFConsumer to use the failing lottery
        vm.prank(owner);
        sonicVRFConsumer.updateLotteryContract(address(failingLottery));
        
        // Step 3: Request randomness from Sonic chain
        vm.prank(address(failingLottery));
        uint64 sonicRequestId = sonicVRFConsumer.requestRandomness(user1);
        
        // Step 4: Deliver message to Arbitrum
        bytes memory payload = abi.encode(sonicRequestId, user1);
        vm.prank(address(sonicLzEndpoint));
        arbitrumLzEndpoint.mockLzReceive(
            SONIC_CHAIN_ID,
            abi.encodePacked(address(sonicVRFConsumer)),
            0,
            payload
        );
        
        // Step 5: Fulfill VRF request
        uint256 vrfRequestId = 1; // First VRF request ID
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 123456789;
        
        vm.prank(address(vrfCoordinator));
        vrfCoordinator.fulfillRandomWordsWithOverride(
            vrfRequestId,
            address(arbitrumVRFRequester),
            randomWords
        );
        
        // Step 6: Deliver the message back to Sonic
        bytes memory returnPayload = abi.encode(sonicRequestId, user1, randomWords[0]);
        
        vm.recordLogs();
        vm.prank(address(arbitrumLzEndpoint));
        sonicLzEndpoint.mockLzReceive(
            ARBITRUM_CHAIN_ID,
            abi.encodePacked(address(arbitrumVRFRequester)),
            0,
            returnPayload
        );
        
        // Step 7: Check that RandomnessProcessingFailed event was emitted
        Vm.Log[] memory entries = vm.getRecordedLogs();
        bool foundFailedEvent = false;
        
        for (uint i = 0; i < entries.length; i++) {
            // Check if this is the RandomnessProcessingFailed event
            // The topic[0] is the event signature: keccak256("RandomnessProcessingFailed(uint64,address,uint256)")
            if (entries[i].topics[0] == keccak256("RandomnessProcessingFailed(uint64,address,uint256)")) {
                foundFailedEvent = true;
                break;
            }
        }
        
        assertTrue(foundFailedEvent, "RandomnessProcessingFailed event not emitted");
        
        // Step 8: Verify the request was still cleaned up despite the processing failure
        assertEq(sonicVRFConsumer.requestToUser(sonicRequestId), address(0));
    }
}

// Helper contract that always reverts on processing randomness
contract FailingMockCallback is MockCallback {
    function processRandomness(uint64 requestId, address user, uint256 randomness) external override {
        revert("Always fails");
    }
} 