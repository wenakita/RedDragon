// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/test/TestLotteryMechanics.sol";
import "../../contracts/test/TestWrappedSonic.sol";
import "../../contracts/test/MockDragonSwapTrigger.sol";

contract TestLotteryMechanicsTest is Test {
    // Contracts
    TestLotteryMechanics public lottery;
    TestWrappedSonic public wrappedSonic;
    TestWrappedSonic public dragonToken; // Using same token for simplicity
    MockDragonSwapTrigger public swapTrigger;
    
    // Test accounts
    address public owner = address(1);
    address public user1 = address(2);
    address public user2 = address(3);
    
    // Constants
    uint256 public constant INITIAL_SUPPLY = 1000000 ether;
    uint256 public constant MIN_SWAP_AMOUNT = 10 ether;
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy tokens
        wrappedSonic = new TestWrappedSonic();
        dragonToken = new TestWrappedSonic();
        
        // Mint initial supply
        wrappedSonic.mint(owner, INITIAL_SUPPLY);
        wrappedSonic.mint(user1, 1000 ether);
        wrappedSonic.mint(user2, 1000 ether);
        
        dragonToken.mint(owner, INITIAL_SUPPLY);
        
        // Deploy swap trigger
        swapTrigger = new MockDragonSwapTrigger(
            address(wrappedSonic),
            address(dragonToken),
            owner, // VRF consumer is owner for simplicity
            MIN_SWAP_AMOUNT
        );
        
        // Deploy lottery mechanics
        lottery = new TestLotteryMechanics(
            address(wrappedSonic),
            address(dragonToken),
            address(swapTrigger)
        );
        
        // Setup initial jackpot
        wrappedSonic.approve(address(swapTrigger), 100 ether);
        swapTrigger.addToJackpot(100 ether);
        
        vm.stopPrank();
    }
    
    function testAddToJackpot() public {
        // Check initial jackpot balance
        assertEq(swapTrigger.jackpotBalance(), 100 ether);
        
        // Add more to the jackpot
        vm.startPrank(owner);
        wrappedSonic.approve(address(lottery), 50 ether);
        lottery.addToJackpot(50 ether);
        vm.stopPrank();
        
        // Check jackpot increased
        assertEq(swapTrigger.jackpotBalance(), 150 ether);
        
        // Check lottery stats updated
        (,,uint256 jackpotBalance,) = lottery.stats();
        assertEq(jackpotBalance, 50 ether);
    }
    
    function testSwapCreatesLotteryEntry() public {
        vm.startPrank(user1);
        
        // Initial checks
        assertEq(lottery.getParticipantCount(), 0);
        assertEq(lottery.userEntries(user1), 0);
        
        // Approve and simulate swap
        wrappedSonic.approve(address(lottery), 50 ether);
        lottery.simulateSwap(50 ether);
        
        // Check user now has a lottery entry
        assertEq(lottery.userEntries(user1), 50 ether);
        assertEq(lottery.getParticipantCount(), 1);
        
        // Check user has dragon tokens
        assertEq(dragonToken.balanceOf(user1), 50 ether);
        
        vm.stopPrank();
    }
    
    function testSimulateWin() public {
        // Check initial state
        (uint256 winners, uint256 totalPaidOut,,) = lottery.stats();
        assertEq(winners, 0);
        assertEq(totalPaidOut, 0);
        
        // Simulate a win
        vm.prank(owner);
        lottery.simulateWin(user2, 25 ether);
        
        // Check stats updated
        (winners, totalPaidOut,,) = lottery.stats();
        assertEq(winners, 1);
        assertEq(totalPaidOut, 25 ether);
    }
    
    function testSetWinProbability() public {
        // Initial win probability
        assertEq(lottery.winProbability(), 1000);
        
        // Update probability
        vm.prank(owner);
        lottery.setWinProbability(500);
        
        // Check updated
        assertEq(lottery.winProbability(), 500);
        
        // Non-owner can't update
        vm.prank(user1);
        vm.expectRevert("Ownable: caller is not the owner");
        lottery.setWinProbability(200);
    }
    
    function testEmergencyWithdraw() public {
        // Send some tokens to the lottery contract
        vm.prank(owner);
        wrappedSonic.transfer(address(lottery), 10 ether);
        
        // Check initial balance
        assertEq(wrappedSonic.balanceOf(address(lottery)), 10 ether);
        
        // Only owner can withdraw
        vm.prank(user1);
        vm.expectRevert("Ownable: caller is not the owner");
        lottery.emergencyWithdraw(address(wrappedSonic), user1, 10 ether);
        
        // Owner can withdraw
        vm.prank(owner);
        lottery.emergencyWithdraw(address(wrappedSonic), owner, 10 ether);
        
        // Check balances after withdrawal
        assertEq(wrappedSonic.balanceOf(address(lottery)), 0);
        assertEq(wrappedSonic.balanceOf(owner), INITIAL_SUPPLY); // Back to initial supply
    }
} 