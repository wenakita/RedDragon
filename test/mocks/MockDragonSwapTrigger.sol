// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../contracts/DragonSwapTrigger.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../contracts/interfaces/IVRFConsumer.sol";

/**
 * @title MockDragonSwapTrigger
 * @dev Mock implementation of the Dragon Swap Trigger for testing
 */
contract MockDragonSwapTrigger is DragonSwapTrigger {
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
    mapping(uint256 => uint256) public requestToAmount;
    uint256 public requestCounter;
    
    // Events
    event SwapDetected(address indexed user, uint256 amount);
    event VRFRequested(uint256 indexed requestId, address indexed user);
    event JackpotWon(address indexed winner, uint256 amount);
    event JackpotAdded(uint256 amount, uint256 newBalance);
    event RandomnessRequested(uint64 indexed requestId, address indexed user);
    
    /**
     * @dev Constructor
     */
    constructor(
        address _wrappedSonic,
        address _dragonToken,
        address _vrfConsumer,
        uint256 _minSwapAmount
    ) DragonSwapTrigger(
        _wrappedSonic,
        _dragonToken,
        _vrfConsumer,
        _minSwapAmount
    ) {
        wrappedSonicAddress = _wrappedSonic;
        dragonTokenAddress = _dragonToken;
        sonicVRFReceiverAddress = _vrfConsumer;
    }
    
    /**
     * @notice Triggered when a user swaps wS for DRAGON
     * @param _user The user who performed the swap
     * @param _amount The amount of wS swapped
     */
    function onSwapWSToDragon(address _user, uint256 _amount) external override {
        // Only allow tx.origin to participate to prevent proxy/contract entries
        require(tx.origin == _user, "Only users can enter lottery");
        
        // Check if amount is enough to enter
        if (_amount < minSwapAmount) {
            return;
        }
        
        // Request randomness
        uint64 requestId = IVRFConsumer(vrfConsumer).requestRandomness(_user);
        
        // Store mapping
        requestToUser[requestId] = _user;
        requestToAmount[requestId] = _amount;
        
        emit SwapDetected(_user, _amount);
        emit RandomnessRequested(requestId, _user);
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