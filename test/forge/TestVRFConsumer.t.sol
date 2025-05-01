// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/test/TestVRFConsumer.sol";
import "../../contracts/test/MockCallback.sol";

contract TestVRFConsumerTest is Test {
    TestVRFConsumer public vrfConsumer;
    MockCallback public mockCallback;
    
    address public owner = address(1);
    address public user1 = address(2);
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy MockCallback
        mockCallback = new MockCallback();
        
        // Deploy TestVRFConsumer
        vrfConsumer = new TestVRFConsumer(address(mockCallback));
        
        // Set MockCallback as the callback target
        vrfConsumer.setCallbackTarget(address(mockCallback));
        
        vm.stopPrank();
    }
    
    function testRequestRandomness() public {
        // Request randomness as owner
        vm.prank(owner);
        uint256 requestId = vrfConsumer.requestRandomness(user1);
        
        // Check the request was tracked properly
        assertEq(vrfConsumer.requestToUser(1), user1);
        
        // Check nextRequestId incremented
        assertEq(vrfConsumer.nextRequestId(), 2);
    }
    
    function testDeliverRandomness() public {
        // Request randomness
        vm.prank(owner);
        uint256 requestId = vrfConsumer.requestRandomness(user1);
        
        // Deliver randomness
        vm.prank(owner);
        vrfConsumer.deliverRandomness(requestId, 12345);
        
        // Check the request was cleared
        assertEq(vrfConsumer.requestToUser(requestId), address(0));
        
        // Check randomness was delivered to the callback
        assertEq(mockCallback.receivedRandomness(uint64(requestId)), 12345);
    }
    
    function testOnlyOwnerCanSetCallbackTarget() public {
        // Non-owner attempts to set callback target
        vm.prank(user1);
        vm.expectRevert("Ownable: caller is not the owner");
        vrfConsumer.setCallbackTarget(address(456));
        
        // Owner can set callback target
        vm.prank(owner);
        vrfConsumer.setCallbackTarget(address(789));
        
        assertEq(vrfConsumer.callbackTarget(), address(789));
    }
    
    function testCannotSetZeroAddressAsCallbackTarget() public {
        vm.prank(owner);
        vm.expectRevert("Cannot set to zero address");
        vrfConsumer.setCallbackTarget(address(0));
    }
    
    function testDeliverRandomnessToUnknownRequestReverts() public {
        // Try to deliver randomness to a non-existent request
        vm.prank(owner);
        vm.expectRevert("Unknown request");
        vrfConsumer.deliverRandomness(999, 12345);
    }
} 