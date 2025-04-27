// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockDragonSwapTrigger
 * @dev Mock contract for testing cross-chain VRF functionality
 */
contract MockDragonSwapTrigger {
    // Token addresses
    address public wrappedSonicAddress;
    address public dragonTokenAddress;
    
    // VRF service
    address public sonicVRFReceiverAddress;
    
    // Jackpot configuration
    uint256 public jackpotBalance;
    uint256 public winThreshold = 1000; // 0.1% chance to win (1/1000)
    
    // Request tracking
    mapping(uint256 => address) public requestToUser;
    uint256 public requestCounter;
    
    // Events
    event SwapDetected(address indexed user, uint256 amount);
    event VRFRequested(uint256 indexed requestId, address indexed user);
    event JackpotWon(address indexed winner, uint256 amount);
    event JackpotAdded(uint256 amount, uint256 newBalance);
    
    constructor(
        address _wrappedSonicAddress,
        address _dragonTokenAddress,
        address _sonicVRFReceiverAddress
    ) {
        wrappedSonicAddress = _wrappedSonicAddress;
        dragonTokenAddress = _dragonTokenAddress;
        sonicVRFReceiverAddress = _sonicVRFReceiverAddress;
    }
    
    /**
     * @dev Triggered when a user swaps wS for DRAGON
     */
    function onSwapWSToDragon(address _user, uint256 _amount) external {
        // Only DRAGON token should call this in production, but for tests we allow all
        
        // Assign a request ID
        uint256 requestId = requestCounter++;
        
        // Store the user for this request
        requestToUser[requestId] = _user;
        
        // In production, this would call the VRF service
        // For tests, we just emit the event
        emit SwapDetected(_user, _amount);
        emit VRFRequested(requestId, _user);
        
        // Request randomness from VRF service
        (bool success, ) = sonicVRFReceiverAddress.call(
            abi.encodeWithSignature(
                "requestRandomness(uint256)",
                requestId
            )
        );
        require(success, "Failed to request randomness");
    }
    
    /**
     * @dev Callback function for VRF to deliver randomness
     */
    function fulfillRandomness(uint256 _requestId, uint256 _randomness) external {
        // In production, only the VRF receiver can call this
        // For tests, we allow all calls
        
        // Get the user who made the request
        address user = requestToUser[_requestId];
        require(user != address(0), "Invalid request ID");
        
        // Determine if the user won
        bool won = (_randomness % winThreshold) == 0;
        
        // If the user won, transfer the jackpot
        if (won && jackpotBalance > 0) {
            uint256 winAmount = jackpotBalance;
            jackpotBalance = 0;
            
            // Transfer wS to the winner
            IERC20(wrappedSonicAddress).transfer(user, winAmount);
            
            emit JackpotWon(user, winAmount);
        }
    }
    
    /**
     * @dev Add funds to the jackpot
     */
    function addToJackpot(uint256 _amount) external {
        // Transfer wS from the sender to this contract
        IERC20(wrappedSonicAddress).transferFrom(msg.sender, address(this), _amount);
        
        // Update the jackpot balance
        jackpotBalance += _amount;
        
        emit JackpotAdded(_amount, jackpotBalance);
    }
    
    /**
     * @dev Set the win threshold
     */
    function setWinThreshold(uint256 _winThreshold) external {
        require(_winThreshold > 0, "Win threshold must be greater than 0");
        winThreshold = _winThreshold;
    }
    
    /**
     * @dev Set the SonicVRFReceiver address
     */
    function setSonicVRFReceiver(address _sonicVRFReceiverAddress) external {
        sonicVRFReceiverAddress = _sonicVRFReceiverAddress;
    }
} 