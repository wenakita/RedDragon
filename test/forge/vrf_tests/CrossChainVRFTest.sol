// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "./mocks/MockLzEndpoint.sol";
import "./mocks/MockCallback.sol";
import "./mocks/MockVRFCoordinator.sol";
import "./mocks/MockStructs.sol";

/**
 * @title CrossChainVRFTest
 * @dev Test contract for testing cross-chain VRF functionality
 * This uses simplified mock contracts instead of the real implementations
 */
contract CrossChainVRFTest is Test {
    // Mocks
    MockLzEndpoint public sonicLzEndpoint;
    MockLzEndpoint public arbitrumLzEndpoint;
    MockCallback public lotteryContract;
    MockVRFCoordinator public vrfCoordinator;
    
    // Test accounts
    address public owner = address(1);
    address public user1 = address(2);
    address public user2 = address(3);
    
    // Constants
    uint32 public constant SONIC_CHAIN_ID = 1;
    uint32 public constant ARBITRUM_CHAIN_ID = 110;
    bytes32 public constant KEY_HASH = bytes32(uint256(123456));
    
    // Test state
    uint64 public subscriptionId;
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy mocks
        sonicLzEndpoint = new MockLzEndpoint();
        arbitrumLzEndpoint = new MockLzEndpoint();
        lotteryContract = new MockCallback();
        vrfCoordinator = new MockVRFCoordinator();
        
        // Set up VRF subscription
        subscriptionId = vrfCoordinator.createSubscription();
        vrfCoordinator.fundSubscription(subscriptionId, 10 ether);
        
        vm.stopPrank();
    }
    
    function testMockEndpointSendMessage() public {
        // Create a mock message
        MockLzEndpoint.MessagingParams memory params = MockLzEndpoint.MessagingParams({
            dstEid: ARBITRUM_CHAIN_ID,
            receiver: abi.encodePacked(address(0x123)),
            message: abi.encode("test message"),
            options: "",
            payInLzToken: false
        });
        
        // Send the message
        sonicLzEndpoint.send{value: 0.01 ether}(params);
        
        // Verify message was sent
        assertEq(sonicLzEndpoint.lastDestinationChainId(), uint16(ARBITRUM_CHAIN_ID));
        assertEq(sonicLzEndpoint.lastSentPayload(), abi.encode("test message"));
    }
    
    function testMockCallbackReceiveRandomness() public {
        // Set up the callback
        lotteryContract.setVRFConsumer(address(this));
        
        // Call processRandomness directly to test
        uint64 requestId = 123;
        uint256 randomValue = 456;
        
        vm.prank(address(this));
        lotteryContract.processRandomness(requestId, user1, randomValue);
        
        // Verify randomness was received
        assertEq(lotteryContract.receivedRandomness(requestId), randomValue);
    }
    
    function testMockVRFCoordinatorSubscription() public {
        // Verify subscription was created
        assertEq(subscriptionId, 1);
        
        // Add a consumer
        vm.prank(owner);
        vrfCoordinator.addConsumer(subscriptionId, address(this));
        
        // Request random words
        vm.prank(address(this));
        uint256 requestId = vrfCoordinator.requestRandomWords(
            KEY_HASH,
            subscriptionId,
            3, // confirmations
            200000, // gas limit
            1 // num words
        );
        
        // Verify request was created
        assertEq(requestId, 1);
    }
    
    function testMockVRFFulfillment() public {
        // Add this contract as a consumer
        vm.prank(owner);
        vrfCoordinator.addConsumer(subscriptionId, address(this));
        
        // Request random words
        vm.prank(address(this));
        uint256 requestId = vrfCoordinator.requestRandomWords(
            KEY_HASH,
            subscriptionId,
            3, // confirmations
            200000, // gas limit
            1 // num words
        );
        
        // Create the random words array
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 789012345;
        
        // Mock the VRF coordinator fulfilling the request
        // Note: This would fail in a real test unless we implement fulfillRandomWords in this contract
        // Here we're just testing the mock contract's functionality
        vm.expectRevert("fulfillRandomWords failed");
        vrfCoordinator.fulfillRandomWordsWithOverride(requestId, address(this), randomWords);
    }
} 