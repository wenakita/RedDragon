// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/test/TestCrossChainBridge.sol";

contract TestCrossChainBridgeTest is Test {
    TestCrossChainBridge public bridge;
    
    // Chain IDs
    uint16 public constant SONIC_CHAIN_ID = 146;
    uint16 public constant ARBITRUM_CHAIN_ID = 110;
    
    // Mock contracts
    address public dragonOnSonic = address(1);
    address public dragonOnArbitrum = address(2);
    
    // Test accounts
    address public owner = address(10);
    address public user1 = address(11);
    address public user2 = address(12);
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy TestCrossChainBridge
        bridge = new TestCrossChainBridge(SONIC_CHAIN_ID, "Sonic");
        
        // Register Arbitrum chain
        bridge.registerChain(ARBITRUM_CHAIN_ID, "Arbitrum");
        
        // Register contracts on both chains
        bridge.registerContract(SONIC_CHAIN_ID, dragonOnSonic);
        bridge.registerContract(ARBITRUM_CHAIN_ID, dragonOnArbitrum);
        
        // Set initial supplies
        bridge.updateChainSupply(SONIC_CHAIN_ID, 1000000 ether);
        
        vm.stopPrank();
    }
    
    function testChainRegistration() public {
        // Check supported chains
        (uint16[] memory ids, string[] memory names) = bridge.getSupportedChains();
        
        // Should have two chains registered
        assertEq(ids.length, 2);
        assertEq(names.length, 2);
        
        // First chain should be Sonic
        assertEq(ids[0], SONIC_CHAIN_ID);
        assertEq(keccak256(abi.encodePacked(names[0])), keccak256(abi.encodePacked("Sonic")));
        
        // Second chain should be Arbitrum
        assertEq(ids[1], ARBITRUM_CHAIN_ID);
        assertEq(keccak256(abi.encodePacked(names[1])), keccak256(abi.encodePacked("Arbitrum")));
        
        // Check contract registration
        assertEq(bridge.omniDragonOnChain(SONIC_CHAIN_ID), dragonOnSonic);
        assertEq(bridge.omniDragonOnChain(ARBITRUM_CHAIN_ID), dragonOnArbitrum);
    }
    
    function testCrossChainSupplyTracking() public {
        // Check initial supply on Sonic
        assertEq(bridge.chainSupplies(SONIC_CHAIN_ID), 1000000 ether);
        
        // Simulate cross-chain transfer of 1000 tokens from Sonic to Arbitrum
        vm.prank(owner);
        bridge.updateChainSupply(SONIC_CHAIN_ID, 999000 ether);
        
        vm.prank(owner);
        bridge.updateChainSupply(ARBITRUM_CHAIN_ID, 1000 ether);
        
        // Check updated supplies
        assertEq(bridge.chainSupplies(SONIC_CHAIN_ID), 999000 ether);
        assertEq(bridge.chainSupplies(ARBITRUM_CHAIN_ID), 1000 ether);
        
        // Total supply should remain the same
        assertEq(bridge.getTotalSupply(), 1000000 ether);
    }
    
    function testCrossChainMessaging() public {
        // Create message payload
        bytes memory payload = abi.encode(user1, 1000 ether);
        
        // Send message
        uint256 messageId = bridge.sendMessage(
            SONIC_CHAIN_ID,
            ARBITRUM_CHAIN_ID,
            dragonOnSonic,
            dragonOnArbitrum,
            payload
        );
        
        // Check message was stored
        (
            uint16 srcChainId,
            uint16 dstChainId,
            address srcAddress,
            address dstAddress,
            bytes memory storedPayload,
            bool delivered
        ) = bridge.messages(messageId);
        
        assertEq(srcChainId, SONIC_CHAIN_ID);
        assertEq(dstChainId, ARBITRUM_CHAIN_ID);
        assertEq(srcAddress, dragonOnSonic);
        assertEq(dstAddress, dragonOnArbitrum);
        assertEq(keccak256(storedPayload), keccak256(payload));
        assertEq(delivered, false);
        
        // Deliver message
        bridge.deliverMessage(messageId, user2);
        
        // Check delivered status
        (, , , , , bool isDelivered) = bridge.messages(messageId);
        assertEq(isDelivered, true);
    }
} 