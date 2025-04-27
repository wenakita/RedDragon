// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/DragonSwapTrigger.sol";
import "../../contracts/SonicVRFReceiver.sol";
import "../../contracts/Dragon.sol";
import "../../contracts/mocks/MockVRFCoordinator.sol";
import "../../contracts/mocks/MockLayerZeroEndpoint.sol";
import "../../contracts/mocks/MockERC20.sol";

contract DragonJackpotTest is Test {
    // Contracts
    DragonSwapTrigger public swapTrigger;
    SonicVRFReceiver public vrfReceiver;
    Dragon public dragon;
    MockVRFCoordinator public vrfCoordinator;
    MockLayerZeroEndpoint public lzEndpoint;
    MockERC20 public wrappedSonic;
    
    // Accounts
    address public owner;
    address public user1;
    address public user2;
    address public jackpot;
    address public ve69LP;
    
    // VRF Configuration
    bytes32 public keyHash;
    uint64 public subscriptionId;
    uint32 public callbackGasLimit;
    uint16 public requestConfirmations;
    uint32 public numWords;
    
    // LayerZero Configuration
    uint16 public chainId;
    
    function setUp() public {
        // Setup accounts
        owner = address(this);
        user1 = vm.addr(1);
        user2 = vm.addr(2);
        jackpot = vm.addr(3);
        ve69LP = vm.addr(4);
        
        // VRF Configuration
        keyHash = keccak256("test");
        subscriptionId = 1234;
        callbackGasLimit = 500000;
        requestConfirmations = 3;
        numWords = 1;
        chainId = 1;
        
        // Deploy wrapped Sonic token
        wrappedSonic = new MockERC20("Wrapped Sonic", "wS", 18);
        
        // Deploy mock VRF coordinator
        vrfCoordinator = new MockVRFCoordinator();
        
        // Deploy mock LayerZero endpoint
        lzEndpoint = new MockLayerZeroEndpoint(chainId);
        
        // Deploy VRF receiver
        vrfReceiver = new SonicVRFReceiver(
            address(vrfCoordinator),
            address(lzEndpoint),
            keyHash,
            subscriptionId,
            callbackGasLimit,
            requestConfirmations,
            numWords
        );
        
        // Deploy Dragon token
        dragon = new Dragon(
            "Dragon",
            "DRAGON",
            jackpot,
            ve69LP,
            address(wrappedSonic)
        );
        
        // Deploy Dragon swap trigger
        swapTrigger = new DragonSwapTrigger(
            address(wrappedSonic),
            address(dragon),
            address(vrfReceiver)
        );
        
        // Link the contracts
        vrfReceiver.setDragonSwapTrigger(address(swapTrigger));
        dragon.setVRFConnector(address(swapTrigger));
        
        // Fund the VRF subscription
        vrfCoordinator.fundSubscription(subscriptionId, 10 ether);
        
        // Mint tokens for tests
        wrappedSonic.mint(address(swapTrigger), 100 ether); // For prizes
        wrappedSonic.mint(user1, 1000 ether);
        wrappedSonic.mint(user2, 1000 ether);
        
        // Set approvals
        vm.startPrank(user1);
        wrappedSonic.approve(address(dragon), type(uint256).max);
        vm.stopPrank();
        
        vm.startPrank(user2);
        wrappedSonic.approve(address(dragon), type(uint256).max);
        wrappedSonic.approve(address(swapTrigger), type(uint256).max);
        vm.stopPrank();
    }
    
    function testJackpotAccumulation() public {
        // Setup jackpot
        uint256 jackpotAmount = 50 ether;
        vm.startPrank(user2);
        swapTrigger.addToJackpot(jackpotAmount);
        vm.stopPrank();
        
        // Verify jackpot balance
        assertEq(swapTrigger.jackpotBalance(), jackpotAmount, "Wrong jackpot balance");
    }
    
    function testWinningLottery() public {
        // Setup jackpot
        uint256 jackpotAmount = 50 ether;
        vm.startPrank(user2);
        swapTrigger.addToJackpot(jackpotAmount);
        vm.stopPrank();
        
        // Record user's balance before swap
        uint256 userBalanceBefore = wrappedSonic.balanceOf(user1);
        
        // Trigger swap/lottery
        vm.startPrank(user1);
        uint256 swapAmount = 1000 ether;
        wrappedSonic.approve(address(swapTrigger), swapAmount);
        swapTrigger.onSwapWSToDragon(user1, swapAmount);
        vm.stopPrank();
        
        // Get latest request ID
        uint256 requestId = 0; // First request
        
        // Setup the mock to make user win
        uint256[] memory randomWords = new uint256[](1);
        uint256 winThreshold = swapTrigger.winThreshold();
        randomWords[0] = winThreshold * 5; // Multiple of winThreshold
        
        // Fulfill the VRF request
        vrfCoordinator.fulfillRandomWords(requestId, address(vrfReceiver), randomWords);
        
        // Verify jackpot was distributed
        assertEq(swapTrigger.jackpotBalance(), 0, "Jackpot wasn't emptied");
        
        // Check if user received the jackpot
        uint256 userBalanceAfter = wrappedSonic.balanceOf(user1);
        assertEq(
            userBalanceAfter,
            userBalanceBefore + jackpotAmount,
            "User didn't receive jackpot"
        );
    }
    
    function testLosingLottery() public {
        // Setup jackpot
        uint256 jackpotAmount = 50 ether;
        vm.startPrank(user2);
        swapTrigger.addToJackpot(jackpotAmount);
        vm.stopPrank();
        
        // Record user's balance before swap
        uint256 userBalanceBefore = wrappedSonic.balanceOf(user1);
        
        // Trigger swap/lottery
        vm.startPrank(user1);
        uint256 swapAmount = 1000 ether;
        wrappedSonic.approve(address(swapTrigger), swapAmount);
        swapTrigger.onSwapWSToDragon(user1, swapAmount);
        vm.stopPrank();
        
        // Get latest request ID
        uint256 requestId = 0; // First request
        
        // Setup the mock to make user lose
        uint256[] memory randomWords = new uint256[](1);
        uint256 winThreshold = swapTrigger.winThreshold();
        randomWords[0] = winThreshold * 5 + 1; // Not a multiple of winThreshold
        
        // Fulfill the VRF request
        vrfCoordinator.fulfillRandomWords(requestId, address(vrfReceiver), randomWords);
        
        // Verify jackpot was not distributed
        assertEq(swapTrigger.jackpotBalance(), jackpotAmount, "Jackpot shouldn't change");
        
        // Check if user's balance remained unchanged
        uint256 userBalanceAfter = wrappedSonic.balanceOf(user1);
        assertEq(
            userBalanceAfter,
            userBalanceBefore - swapAmount,
            "User balance shouldn't include jackpot"
        );
    }
    
    function testMultipleLotteryEntries() public {
        // Setup jackpot
        uint256 jackpotAmount = 100 ether;
        vm.startPrank(user2);
        swapTrigger.addToJackpot(jackpotAmount);
        vm.stopPrank();
        
        // Get win threshold once to avoid repeating calls
        uint256 winThreshold = swapTrigger.winThreshold();
        
        // Create several lottery entries
        uint256 totalEntries = 5;
        for (uint256 i = 0; i < totalEntries; i++) {
            vm.startPrank(user1);
            uint256 swapAmount = (i + 1) * 100 ether;
            wrappedSonic.approve(address(swapTrigger), swapAmount);
            swapTrigger.onSwapWSToDragon(user1, swapAmount);
            vm.stopPrank();
            
            // For all but the last entry, fulfill with losing randomness
            if (i < totalEntries - 1) {
                uint256[] memory losingRandomWords = new uint256[](1);
                losingRandomWords[0] = winThreshold * 5 + i + 1; // Not a multiple
                vrfCoordinator.fulfillRandomWords(i, address(vrfReceiver), losingRandomWords);
            }
        }
        
        // Record balance before winning
        uint256 userBalanceBefore = wrappedSonic.balanceOf(user1);
        
        // Last entry is a winner
        uint256[] memory winningRandomWords = new uint256[](1);
        winningRandomWords[0] = winThreshold * 7; // Multiple of winThreshold
        vrfCoordinator.fulfillRandomWords(totalEntries - 1, address(vrfReceiver), winningRandomWords);
        
        // Verify jackpot was distributed
        assertEq(swapTrigger.jackpotBalance(), 0, "Jackpot wasn't emptied");
        
        // Check if user received the jackpot
        uint256 userBalanceAfter = wrappedSonic.balanceOf(user1);
        assertEq(
            userBalanceAfter,
            userBalanceBefore + jackpotAmount,
            "User didn't receive jackpot"
        );
    }
} 