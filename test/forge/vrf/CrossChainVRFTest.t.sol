// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/SonicVRFConsumer.sol";
import "../../contracts/ArbitrumVRFRequester.sol";
import "../../contracts/mocks/MockLzEndpoint.sol";
import "../../contracts/test/MockCallback.sol";
import "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2Mock.sol";

contract CrossChainVRFTest is Test {
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
    uint256 public constant CALLBACK_GAS_LIMIT = 500000;
    
    // Test accounts
    address public owner = address(1);
    address public user1 = address(2);
    
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
        
        // Fund endpoints with ETH for fees
        vm.deal(address(sonicVRFConsumer), 10 ether);
        vm.deal(address(arbitrumVRFRequester), 10 ether);
    }
    
    function testRequestRandomness() public {
        // Prepare for testing
        vm.prank(address(lotteryContract));
        
        // Request randomness
        uint64 requestId = sonicVRFConsumer.requestRandomness(user1);
        
        // Verify requestId is 0 (first request)
        assertEq(requestId, 0);
        
        // Verify request was tracked
        assertEq(sonicVRFConsumer.requestToUser(requestId), user1);
        
        // Verify nonce was incremented
        assertEq(sonicVRFConsumer.nonce(), 1);
    }
    
    function testSonicToArbitrumRandomnessFlow() public {
        // Step 1: Request randomness from Sonic chain
        vm.prank(address(lotteryContract));
        uint64 sonicRequestId = sonicVRFConsumer.requestRandomness(user1);
        
        // Simulate the LZ message being delivered to Arbitrum
        // Extract the payload from the sonicVRFConsumer to arbitrumVRFRequester
        bytes memory destination = abi.encodePacked(address(arbitrumVRFRequester));
        bytes memory payload = abi.encode(sonicRequestId, user1);
        
        // Mock LZ endpoint delivering the message
        vm.prank(address(sonicLzEndpoint));
        arbitrumLzEndpoint.mockLzReceive(
            SONIC_CHAIN_ID,
            abi.encodePacked(address(sonicVRFConsumer)),
            0, // nonce
            payload
        );
        
        // Get the VRF request ID (Chainlink request ID)
        uint256 vrfRequestId = 1; // First VRF request ID
        
        // Simulate Chainlink VRF fulfilling the request
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 777777; // Random value
        
        vm.prank(address(vrfCoordinator));
        vrfCoordinator.fulfillRandomWordsWithOverride(
            vrfRequestId,
            address(arbitrumVRFRequester),
            randomWords
        );
        
        // Verify the request was fulfilled in ArbitrumVRFRequester
        (bool exists, bool fulfilled, uint256 randomness) = arbitrumVRFRequester.getRequestStatus(vrfRequestId);
        assertEq(exists, true);
        assertEq(fulfilled, true);
        assertEq(randomness, randomWords[0]);
        
        // Simulate the LZ message being delivered back to Sonic
        // Extract data from the arbitrumVRFRequester's fulfilled request
        bytes memory returnPayload = abi.encode(sonicRequestId, user1, randomWords[0]);
        
        // Mock LZ endpoint delivering the message back to Sonic
        vm.prank(address(arbitrumLzEndpoint));
        sonicLzEndpoint.mockLzReceive(
            ARBITRUM_CHAIN_ID,
            abi.encodePacked(address(arbitrumVRFRequester)),
            0, // nonce
            returnPayload
        );
        
        // Check if lottery contract received the randomness
        assertEq(lotteryContract.receivedRandomness(sonicRequestId), randomWords[0]);
        
        // Verify the request was cleaned up in SonicVRFConsumer
        assertEq(sonicVRFConsumer.requestToUser(sonicRequestId), address(0));
    }
    
    function testFailOnlyLotteryContractCanRequestRandomness() public {
        // Request randomness from an unauthorized address
        vm.prank(user1);
        sonicVRFConsumer.requestRandomness(user1);
    }
    
    function testFailOnlyArbitrumVRFRequesterCanDeliverRandomness() public {
        // First, make a legitimate request
        vm.prank(address(lotteryContract));
        uint64 sonicRequestId = sonicVRFConsumer.requestRandomness(user1);
        
        // Try to deliver randomness from an unauthorized source
        bytes memory returnPayload = abi.encode(sonicRequestId, user1, uint256(12345));
        
        vm.prank(address(sonicLzEndpoint));
        sonicLzEndpoint.mockLzReceive(
            ARBITRUM_CHAIN_ID,
            abi.encodePacked(user1), // Not the ArbitrumVRFRequester
            0, // nonce
            returnPayload
        );
    }
    
    function testOnlyOwnerCanUpdateParameters() public {
        vm.startPrank(owner);
        
        // Test SonicVRFConsumer parameter updates
        sonicVRFConsumer.updateArbitrumChainId(120);
        assertEq(sonicVRFConsumer.arbitrumChainId(), 120);
        
        sonicVRFConsumer.updateArbitrumVRFRequester(address(123));
        assertEq(sonicVRFConsumer.arbitrumVRFRequester(), address(123));
        
        sonicVRFConsumer.updateLotteryContract(address(456));
        assertEq(sonicVRFConsumer.lotteryContract(), address(456));
        
        // Test ArbitrumVRFRequester parameter updates
        arbitrumVRFRequester.updateKeyHash(bytes32(uint256(789)));
        assertEq(arbitrumVRFRequester.keyHash(), bytes32(uint256(789)));
        
        arbitrumVRFRequester.updateRequestConfirmations(5);
        assertEq(arbitrumVRFRequester.requestConfirmations(), 5);
        
        arbitrumVRFRequester.updateCallbackGasLimit(600000);
        assertEq(arbitrumVRFRequester.callbackGasLimit(), 600000);
        
        arbitrumVRFRequester.updateNumWords(2);
        assertEq(arbitrumVRFRequester.numWords(), 2);
        
        vm.stopPrank();
    }
    
    function testFailUnauthorizedParameterUpdate() public {
        vm.prank(user1);
        sonicVRFConsumer.updateArbitrumChainId(120);
    }
} 