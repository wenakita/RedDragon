// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/mocks/MockVRFCoordinator.sol";
import "../../contracts/mocks/ConsumerMock.sol";

contract MockVRFTest is Test {
    MockVRFCoordinator public vrfCoordinator;
    ConsumerMock public consumer;
    
    uint64 public constant SUB_ID = 1234;
    uint96 public constant FUND_AMOUNT = 10 ether;
    
    // Define the event signature to match the event in MockVRFCoordinator
    event RandomWordsFulfilled(uint256 indexed requestId, uint256[] randomWords, bool success);
    
    function setUp() public {
        // Deploy the contracts
        vrfCoordinator = new MockVRFCoordinator();
        consumer = new ConsumerMock();
        
        // Fund the subscription
        vrfCoordinator.fundSubscription(SUB_ID, FUND_AMOUNT);
    }
    
    function testFundSubscription() public {
        // Check if the subscription was funded correctly
        (uint96 balance, ) = vrfCoordinator.subscriptions(SUB_ID);
        assertEq(balance, FUND_AMOUNT);
    }
    
    function testRequestRandomWords() public {
        // Prepare request parameters
        bytes32 keyHash = keccak256("test");
        uint16 requestConfirmations = 3;
        uint32 callbackGasLimit = 100000;
        uint32 numWords = 1;
        
        // Request random words
        uint256 requestId = vrfCoordinator.requestRandomWords(
            keyHash,
            SUB_ID,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        
        // Check if the request was registered correctly
        assertEq(requestId, 0); // First request ID should be 0
        assertEq(vrfCoordinator.consumers(requestId), address(this));
    }
    
    function testFulfillRandomWords() public {
        // First make a request from this contract (which will be the consumer)
        bytes32 keyHash = keccak256("test");
        uint16 requestConfirmations = 3;
        uint32 callbackGasLimit = 100000;
        uint32 numWords = 1;
        
        uint256 requestId = vrfCoordinator.requestRandomWords(
            keyHash,
            SUB_ID,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        
        // Prepare random words
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 12345;
        
        // We'll call fulfillRandomWords with this contract as the consumer
        // Since the requestRandomWords function will have registered this contract as the consumer
        vrfCoordinator.fulfillRandomWords(requestId, address(this), randomWords);
        
        // No assertions needed here, if it doesn't revert, it worked
    }
    
    // Test that integrates with a consumer contract
    function testFulfillRandomWordsToConsumer() public {
        // Deploy a new VRF coordinator specifically for this test
        MockVRFCoordinator customVRF = new MockVRFCoordinator();
        customVRF.fundSubscription(SUB_ID, FUND_AMOUNT);
        
        // Create a request directly from the consumer by using prank
        vm.startPrank(address(consumer));
        
        bytes32 keyHash = keccak256("test");
        uint16 requestConfirmations = 3;
        uint32 callbackGasLimit = 100000;
        uint32 numWords = 1;
        
        uint256 requestId = customVRF.requestRandomWords(
            keyHash,
            SUB_ID,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        
        vm.stopPrank();
        
        // Prepare random words
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 12345;
        
        // Now fulfill the request - the consumer should be properly registered
        customVRF.fulfillRandomWords(requestId, address(consumer), randomWords);
        
        // Check if the consumer received the random words
        assertEq(consumer.lastRequestId(), requestId);
        assertEq(consumer.lastRandomWords(0), randomWords[0]);
    }
    
    function testCannotFulfillUnknownRequest() public {
        // Try to fulfill a request that doesn't exist
        uint256 nonExistentRequestId = 999;
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 12345;
        
        // Expect the call to revert
        vm.expectRevert("Consumer not found for request");
        vrfCoordinator.fulfillRandomWords(nonExistentRequestId, address(consumer), randomWords);
    }
    
    function testCannotRequestWithInsufficientFunds() public {
        // Prepare request parameters
        bytes32 keyHash = keccak256("test");
        uint64 invalidSubId = 5678; // This subscription doesn't exist
        uint16 requestConfirmations = 3;
        uint32 callbackGasLimit = 100000;
        uint32 numWords = 1;
        
        // Expect the call to revert
        vm.expectRevert("Not enough funds in subscription");
        vrfCoordinator.requestRandomWords(
            keyHash,
            invalidSubId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
    }
} 