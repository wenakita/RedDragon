// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "forge-std/Test.sol";
import "test-crosschain/mocks/MockLayerZeroEndpoint.sol";
import "test-crosschain/mocks/MockVRFCoordinator.sol";
import "test-crosschain/mocks/MockERC20.sol";
import "test-crosschain/mocks/MockArbitrumVRFRequester.sol";
import "test-crosschain/mocks/MockSonicVRFReceiver.sol";
import "test-crosschain/mocks/MockDragonSwapTrigger.sol";

contract CrossChainVRFTest is Test {
    // Contract instances
    MockArbitrumVRFRequester arbitrumVRFRequester;
    MockSonicVRFReceiver sonicVRFReceiver;
    MockDragonSwapTrigger dragonSwapTrigger;
    MockLayerZeroEndpoint arbitrumLzEndpoint;
    MockLayerZeroEndpoint sonicLzEndpoint;
    MockVRFCoordinator vrfCoordinator;
    MockERC20 dragonToken;
    MockERC20 wrappedSonic;
    
    // Test addresses
    address owner = address(this);
    address user1 = address(0x1);
    address user2 = address(0x2);
    
    // Constants for tests
    uint16 constant ARBITRUM_CHAIN_ID = 110;
    uint16 constant SONIC_CHAIN_ID = 198;
    uint64 constant SUBSCRIPTION_ID = 1234;
    bytes32 constant KEY_HASH = 0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409;
    
    // Helper function to generate LayerZero encoded address
    function encodedPath(address srcAddr, address destAddr) internal pure returns (bytes memory) {
        return abi.encodePacked(srcAddr, destAddr);
    }
    
    function setUp() public {
        // Give ETH to test accounts
        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);
        
        // Deploy mock tokens
        wrappedSonic = new MockERC20("Wrapped Sonic", "wS", 18);
        dragonToken = new MockERC20("Dragon", "DRAGON", 18);
        
        // Deploy LayerZero endpoints for both chains
        arbitrumLzEndpoint = new MockLayerZeroEndpoint(ARBITRUM_CHAIN_ID);
        sonicLzEndpoint = new MockLayerZeroEndpoint(SONIC_CHAIN_ID);
        
        // Deploy VRF coordinator
        vrfCoordinator = new MockVRFCoordinator();
        
        // Fund the VRF subscription
        vrfCoordinator.fundSubscription(SUBSCRIPTION_ID, 10 ether);
        
        // Deploy DragonSwapTrigger first (will update VRF receiver later)
        dragonSwapTrigger = new MockDragonSwapTrigger(
            address(wrappedSonic),
            address(dragonToken),
            address(0) // Will update later
        );
        
        // Deploy SonicVRFReceiver with dummy parameters (will update later)
        sonicVRFReceiver = new MockSonicVRFReceiver(
            address(dragonSwapTrigger),
            ARBITRUM_CHAIN_ID,
            address(sonicLzEndpoint),
            encodedPath(address(0), address(0)) // Placeholder
        );
        
        // Update DragonSwapTrigger with VRF receiver
        dragonSwapTrigger.setSonicVRFReceiver(address(sonicVRFReceiver));
        
        // Deploy ArbitrumVRFRequester
        arbitrumVRFRequester = new MockArbitrumVRFRequester(
            address(vrfCoordinator),
            SUBSCRIPTION_ID,
            KEY_HASH,
            address(arbitrumLzEndpoint),
            SONIC_CHAIN_ID,
            address(sonicVRFReceiver)
        );
        
        // Setup proper trusted remotes and paths
        sonicVRFReceiver.setTrustedRemote(
            ARBITRUM_CHAIN_ID,
            encodedPath(address(arbitrumVRFRequester), address(sonicVRFReceiver))
        );
        
        // Configure LayerZero endpoints to know about each other
        sonicLzEndpoint.setDestLzEndpoint(address(arbitrumVRFRequester), address(arbitrumLzEndpoint));
        arbitrumLzEndpoint.setDestLzEndpoint(address(sonicVRFReceiver), address(sonicLzEndpoint));
        
        // Mint tokens to user1 for testing
        wrappedSonic.mint(user1, 10_000 ether);
        wrappedSonic.mint(address(dragonSwapTrigger), 1_000 ether); // Initial jackpot
        
        // Set up jackpot in DragonSwapTrigger
        dragonSwapTrigger.setWinThreshold(10); // 10% chance to win for testing
    }
    
    function testCrossChainVRFFlow() public {
        // Step 1: User swaps wS for DRAGON which triggers the lottery
        vm.prank(user1);
        dragonSwapTrigger.onSwapWSToDragon(user1, 1_000 ether);
        
        // Get the request ID (should be 0 since it's the first request)
        uint256 requestId = 0;
        
        // Step 2: Manually simulate the LayerZero message from Sonic to Arbitrum
        bytes memory sonicToArbitrumPayload = abi.encode(uint64(requestId));
        
        // Send from Sonic to Arbitrum
        sonicLzEndpoint.receivePayload(
            SONIC_CHAIN_ID,
            encodedPath(address(sonicVRFReceiver), address(arbitrumVRFRequester)),
            address(arbitrumVRFRequester),
            0, // nonce
            sonicToArbitrumPayload,
            hex"" // adapter params
        );
        
        // Step 3: Check if ArbitrumVRFRequester stored the request ID
        assertEq(arbitrumVRFRequester.lastRequestId(), requestId);
        
        // Step 4: Get user balance before lottery result
        uint256 userBalanceBefore = wrappedSonic.balanceOf(user1);
        
        // Step 5: Simulate Chainlink VRF fulfilling the request
        // We need to get the VRF request ID from events, but since we can't easily 
        // capture that in Forge tests, we'll use a direct approach in the mock
        
        // We'll fulfill request 0 to keep it simple
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 12345 ether; // Fixed value for testing
        vrfCoordinator.fulfillRandomWords(0, address(arbitrumVRFRequester), randomWords);
        
        // Step 6: Check user balance after lottery result
        uint256 userBalanceAfter = wrappedSonic.balanceOf(user1);
        
        // Since our random value is 12345 ether and winThreshold is 10, user should not win
        // because 12345 % 10 = 5 which is not 0
        assertEq(userBalanceAfter, userBalanceBefore);
        
        // Jackpot should remain the same
        assertEq(dragonSwapTrigger.jackpotBalance(), 1_000 ether);
    }
    
    function testCrossChainSecurityValidation() public {
        // Create a dummy payload
        bytes memory payload = abi.encode(uint64(0));
        
        // Try to send from wrong chain ID
        uint16 wrongChainId = 999;
        vm.expectRevert("SonicVRFReceiver: Invalid source chain");
        sonicLzEndpoint.receivePayload(
            wrongChainId,
            encodedPath(address(arbitrumVRFRequester), address(sonicVRFReceiver)),
            address(sonicVRFReceiver),
            0,
            payload,
            hex""
        );
        
        // Try to send from untrusted remote
        bytes memory untrustedPath = encodedPath(user2, address(sonicVRFReceiver));
        vm.expectRevert("SonicVRFReceiver: Invalid source address");
        sonicLzEndpoint.receivePayload(
            ARBITRUM_CHAIN_ID,
            untrustedPath,
            address(sonicVRFReceiver),
            0,
            payload,
            hex""
        );
    }
    
    function testConfigurationManagement() public {
        // Update Arbitrum VRF config
        bytes32 newKeyHash = 0x9999999999999999999999999999999999999999999999999999999999999999;
        arbitrumVRFRequester.setVRFConfig(
            address(vrfCoordinator),
            SUBSCRIPTION_ID,
            newKeyHash
        );
        
        // Verify the update
        assertEq(arbitrumVRFRequester.keyHash(), newKeyHash);
        
        // Update request config
        arbitrumVRFRequester.setRequestConfig(5, 2);
        assertEq(arbitrumVRFRequester.requestConfirmations(), 5);
        assertEq(arbitrumVRFRequester.numWords(), 2);
        
        // Update trusted remote on Sonic VRF Receiver
        bytes memory newPath = encodedPath(user2, address(sonicVRFReceiver));
        sonicVRFReceiver.setTrustedRemote(ARBITRUM_CHAIN_ID, newPath);
        
        // Random data just to test functionality
        bytes memory payload = abi.encode(uint256(0), uint256(0));
        
        // Try sending with old path - should fail
        vm.expectRevert("SonicVRFReceiver: Invalid source address");
        sonicLzEndpoint.receivePayload(
            ARBITRUM_CHAIN_ID,
            encodedPath(address(arbitrumVRFRequester), address(sonicVRFReceiver)),
            address(sonicVRFReceiver),
            0,
            payload,
            hex""
        );
        
        // Try sending with new path - should work
        sonicLzEndpoint.receivePayload(
            ARBITRUM_CHAIN_ID,
            newPath,
            address(sonicVRFReceiver),
            0,
            payload,
            hex""
        );
    }
} 