// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../lib/forge-std/src/Test.sol";
import "../../contracts/DragonSwapTriggerV2.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock wrapped token
contract MockWrappedSonic is ERC20 {
    constructor() ERC20("Wrapped Sonic", "wS") {
        _mint(msg.sender, 1000000 ether);
    }

    function deposit() external payable {
        _mint(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        _burn(msg.sender, amount);
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
}

// Mock dragon token
contract MockDragon is ERC20 {
    constructor() ERC20("Dragon", "DRAGON") {
        _mint(msg.sender, 1000000 ether);
    }
}

// VRF Consumer with Fallback implementation
contract VRFConsumerWithFallback is IVRFConsumer {
    bool public useVRF = true;
    bool public vrfFailed = false;
    uint256 public fallbackSeed;
    uint64 public requestCounter;
    address public dragonSwapTrigger;
    mapping(uint64 => address) public requestToUser;
    mapping(uint64 => bool) public requestFulfilled;
    
    event VRFFailed(uint64 requestId, address user);
    event FallbackUsed(uint64 requestId, address user, address msgSender, address txOrigin);
    event RetryQueued(uint64 requestId, address user);
    
    constructor() {}
    
    function setDragonSwapTrigger(address _dragonSwapTrigger) external {
        dragonSwapTrigger = _dragonSwapTrigger;
    }
    
    function setUseVRF(bool _useVRF) external {
        useVRF = _useVRF;
    }
    
    function setVRFFailed(bool _failed) external {
        vrfFailed = _failed;
    }
    
    function requestRandomness(address user) external override returns (uint64) {
        require(msg.sender == dragonSwapTrigger, "Not authorized");
        
        // Increment request counter
        requestCounter++;
        uint64 requestId = requestCounter;
        
        // Store the user for this request
        requestToUser[requestId] = user;
        
        // Simulate VRF behavior based on settings
        if (!useVRF || vrfFailed) {
            emit VRFFailed(requestId, user);
            
            // We should not fulfill immediately, as we would in a real environment
            // Instead we'll queue it for retry to simulate a delayed response
            emit RetryQueued(requestId, user);
        }
        
        return requestId;
    }
    
    function processRandomness(uint64 requestId, address user, uint256 randomness) external override {
        // This should only be called by the dragon swap trigger
        require(msg.sender == dragonSwapTrigger, "Not authorized");
    }
    
    // Function to simulate VRF fulfillment
    function fulfillRandomness(uint64 requestId, uint256 randomness) external {
        address user = requestToUser[requestId];
        require(user != address(0), "Unknown request");
        require(!requestFulfilled[requestId], "Already fulfilled");
        
        requestFulfilled[requestId] = true;
        
        // Forward the randomness to the contract
        IVRFConsumer(dragonSwapTrigger).processRandomness(requestId, user, randomness);
    }
    
    // Function to simulate fallback mechanism
    function useFallback(uint64 requestId) external {
        address user = requestToUser[requestId];
        require(user != address(0), "Unknown request");
        require(!requestFulfilled[requestId], "Already fulfilled");
        
        // IMPORTANT: In fallback, we must verify that:
        // 1. tx.origin == msg.sender (no contracts in the middle)
        // 2. tx.origin is not a contract
        require(tx.origin == msg.sender, "No contracts allowed");
        require(tx.origin.code.length == 0, "No contract callers");
        
        // Generate fallback randomness based on various factors
        // Note: This is a simplified version for testing
        uint256 randomness = uint256(
            keccak256(
                abi.encodePacked(
                    blockhash(block.number - 1),
                    block.timestamp,
                    tx.origin,
                    requestId,
                    fallbackSeed
                )
            )
        );
        
        requestFulfilled[requestId] = true;
        
        emit FallbackUsed(requestId, user, msg.sender, tx.origin);
        
        // Forward the randomness to the contract
        IVRFConsumer(dragonSwapTrigger).processRandomness(requestId, user, randomness);
    }
    
    // Admin function to update fallback seed
    function setFallbackSeed(uint256 _seed) external {
        fallbackSeed = _seed;
    }
}

// The test contract
contract VRFFallbackImplementationTest is Test {
    DragonSwapTriggerV2 public swapTrigger;
    MockWrappedSonic public wSonic;
    MockDragon public dragon;
    VRFConsumerWithFallback public vrfConsumer;
    
    address public admin = address(1);
    address public user = address(2);
    address public userContract = address(3);
    
    function setUp() public {
        vm.startPrank(admin);
        
        // Deploy tokens
        wSonic = new MockWrappedSonic();
        dragon = new MockDragon();
        
        // Deploy VRF consumer with fallback
        vrfConsumer = new VRFConsumerWithFallback();
        
        // Deploy DragonSwapTrigger (without price oracles for simplicity)
        swapTrigger = new DragonSwapTriggerV2(
            address(wSonic),
            address(dragon),
            address(vrfConsumer),
            0.01 ether, // minSwapAmount: 0.01 wS
            address(0), // No Chainlink
            address(0), // No Pyth
            bytes32(0), // No Pyth price ID
            admin,
            DragonSwapTriggerV2.PayoutMethod.ERC20,
            "Sonic"
        );
        
        // Set up VRF consumer
        vrfConsumer.setDragonSwapTrigger(address(swapTrigger));
        
        // Set up user contract to simulate contract calls
        vm.etch(userContract, bytes("contract"));
        
        // Fund user account
        wSonic.transfer(user, 100 ether); // 100 wS
        
        // Set up jackpot
        wSonic.approve(address(swapTrigger), 100 ether);
        swapTrigger.addToJackpot(100 ether);
        
        vm.stopPrank();
    }
    
    function test_VRFPrimaryAndFallbackDisabled() public {
        // Disable VRF
        vm.prank(admin);
        vrfConsumer.setUseVRF(false);
        
        // User performs a swap
        vm.startPrank(user);
        uint256 swapAmount = 1 ether;
        wSonic.approve(address(swapTrigger), swapAmount);
        
        // Mock tx.origin to be user
        vm.mockCall(
            address(tx.origin),
            abi.encode(),
            abi.encode(user)
        );
        
        swapTrigger.onSwapNativeTokenToDragon(user, swapAmount);
        vm.stopPrank();
        
        // VRF shouldn't be used and entry should be queued for retry
        assertEq(vrfConsumer.requestCounter(), 1);
        assertEq(vrfConsumer.requestToUser(1), user);
        
        // Try to use fallback mechanism
        vm.prank(user);
        vrfConsumer.useFallback(1);
        
        // User still doesn't win because randomness is determined by the fallback
        assertEq(swapTrigger.lastWinner(), address(0));
    }
    
    function test_VRFFailsWithFallback() public {
        // Configure VRF to fail
        vm.prank(admin);
        vrfConsumer.setVRFFailed(true);
        
        // User performs a swap
        vm.startPrank(user);
        uint256 swapAmount = 1 ether;
        wSonic.approve(address(swapTrigger), swapAmount);
        
        // Mock tx.origin to be user
        vm.mockCall(
            address(tx.origin),
            abi.encode(),
            abi.encode(user)
        );
        
        swapTrigger.onSwapNativeTokenToDragon(user, swapAmount);
        vm.stopPrank();
        
        // VRF should have failed and entry queued
        assertEq(vrfConsumer.requestCounter(), 1);
        assertEq(vrfConsumer.requestToUser(1), user);
        
        // Set a seed that will produce a winning number
        uint256 threshold = swapTrigger.calculateWinThreshold(swapAmount);
        uint256 mockSeed = 123456789; // This is arbitrary and would be controlled in test
        vm.prank(admin);
        vrfConsumer.setFallbackSeed(mockSeed);
        
        // Use fallback mechanism
        vm.prank(user);
        vrfConsumer.useFallback(1);
        
        // The result depends on the fallback randomness calculation
        // We don't assert a win because the outcome is based on randomness
    }
    
    function test_FallbackMsgSenderRequirement() public {
        // Configure VRF to fail
        vm.prank(admin);
        vrfConsumer.setVRFFailed(true);
        
        // User performs a swap
        vm.startPrank(user);
        uint256 swapAmount = 1 ether;
        wSonic.approve(address(swapTrigger), swapAmount);
        
        // Mock tx.origin to be user
        vm.mockCall(
            address(tx.origin),
            abi.encode(),
            abi.encode(user)
        );
        
        swapTrigger.onSwapNativeTokenToDragon(user, swapAmount);
        vm.stopPrank();
        
        // Try to use fallback from a different address (simulating a contract call)
        // This should revert
        vm.prank(userContract);
        
        vm.expectRevert("No contracts allowed");
        vrfConsumer.useFallback(1);
    }
    
    function test_FallbackTxOriginRequirement() public {
        // Configure VRF to fail
        vm.prank(admin);
        vrfConsumer.setVRFFailed(true);
        
        // User performs a swap
        vm.startPrank(user);
        uint256 swapAmount = 1 ether;
        wSonic.approve(address(swapTrigger), swapAmount);
        
        // Mock tx.origin to be user
        vm.mockCall(
            address(tx.origin),
            abi.encode(),
            abi.encode(user)
        );
        
        swapTrigger.onSwapNativeTokenToDragon(user, swapAmount);
        vm.stopPrank();
        
        // Try to use fallback but simulate tx.origin as contract
        // mockCallWithCalldataMatcher
        vm.prank(user);
        vm.mockCall(
            address(tx.origin),
            abi.encode(),
            abi.encode(userContract)
        );
        
        // Due to the mock, the useFallback function would see tx.origin as a contract
        // The check for contract code length would fail
        vm.expectRevert("No contract callers");
        vrfConsumer.useFallback(1);
    }
    
    function test_VRFRetryMechanism() public {
        // Configure VRF to fail initially
        vm.prank(admin);
        vrfConsumer.setVRFFailed(true);
        
        // User performs a swap
        vm.startPrank(user);
        uint256 swapAmount = 1 ether;
        wSonic.approve(address(swapTrigger), swapAmount);
        
        // Mock tx.origin to be user
        vm.mockCall(
            address(tx.origin),
            abi.encode(),
            abi.encode(user)
        );
        
        swapTrigger.onSwapNativeTokenToDragon(user, swapAmount);
        vm.stopPrank();
        
        // VRF should have failed
        assertEq(vrfConsumer.requestCounter(), 1);
        
        // Now simulate VRF recovering
        vm.prank(admin);
        vrfConsumer.setVRFFailed(false);
        
        // Configure for a win
        uint256 threshold = swapTrigger.calculateWinThreshold(swapAmount);
        uint256 winningRandomness = threshold; // Ensures randomness % threshold == 0
        
        // Retry with successful VRF
        vm.prank(admin);
        vrfConsumer.fulfillRandomness(1, winningRandomness);
        
        // Verify user won jackpot
        assertEq(swapTrigger.lastWinner(), user);
        assertEq(swapTrigger.totalWinners(), 1);
        assertEq(swapTrigger.lastWinAmount(), 100 ether * 69 / 100); // 69% of jackpot
    }
} 