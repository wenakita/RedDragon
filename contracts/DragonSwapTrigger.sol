// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/ISonicVRFReceiver.sol";

/**
 * @title DragonSwapTrigger
 * @notice Contract that triggers VRF lottery when users swap wS for DRAGON
 * This contract is responsible for:
 * 1. Detecting swaps from wS to DRAGON
 * 2. Triggering the VRF randomness request for lottery
 * 3. Tracking lottery entries and winners
 *
 * Lottery Probability:
 * - Base win chance scales linearly from 0.0004% at 1 wS to 4% at 10,000 wS
 * - ve69LP holders can receive up to 2.5x probability boost (calculated with cube root scaling)
 * - Probability calculation uses cube root scaling for diminishing returns
 * - For Shadow V3 pool swaps: 6.9% fee with probability adjusted by factor of 69/100
 * - Only real users (tx.origin) are eligible, not contracts or aggregators
 */
contract DragonSwapTrigger is Ownable, ReentrancyGuard {
    /* ========== STATE VARIABLES ========== */
    
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
    
    // Swap configuration
    uint256 public minSwapAmount = 1e18; // 1 wS minimum
    
    /* ========== EVENTS ========== */
    
    event SwapDetected(address indexed user, uint256 amount);
    event VRFRequested(uint256 indexed requestId, address indexed user);
    event JackpotWon(address indexed winner, uint256 amount);
    event JackpotAdded(uint256 amount, uint256 newBalance);
    event WinThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    
    /* ========== CONSTRUCTOR ========== */
    
    /**
     * @notice Constructor
     * @param _wrappedSonicAddress The address of the Wrapped Sonic token
     * @param _dragonTokenAddress The address of the Dragon token
     * @param _sonicVRFReceiverAddress The address of the SonicVRFReceiver contract
     */
    constructor(
        address _wrappedSonicAddress,
        address _dragonTokenAddress,
        address _sonicVRFReceiverAddress
    ) Ownable() {
        require(_wrappedSonicAddress != address(0), "wS cannot be zero address");
        require(_dragonTokenAddress != address(0), "DRAGON cannot be zero address");
        require(_sonicVRFReceiverAddress != address(0), "VRF cannot be zero address");
        
        wrappedSonicAddress = _wrappedSonicAddress;
        dragonTokenAddress = _dragonTokenAddress;
        sonicVRFReceiverAddress = _sonicVRFReceiverAddress;
    }
    
    /* ========== SWAP TRIGGER ========== */
    
    /**
     * @notice Triggered when a user swaps wS for DRAGON
     * @dev This should be called by the DRAGON token contract
     * @param _user The user who performed the swap
     * @param _amount The amount of wS swapped
     */
    function onSwapWSToDragon(address _user, uint256 _amount) external nonReentrant {
        // Only allow the Dragon token to call this function
        require(msg.sender == dragonTokenAddress, "Only DRAGON token can call");
        
        // Ensure the swap amount is above the minimum
        require(_amount >= minSwapAmount, "Swap amount too small");
        
        // Assign a request ID
        uint256 requestId = requestCounter++;
        
        // Store the user for this request
        requestToUser[requestId] = _user;
        
        // Request randomness from the VRF service via SonicVRFReceiver
        ISonicVRFReceiver(sonicVRFReceiverAddress).requestRandomness(requestId);
        
        emit SwapDetected(_user, _amount);
        emit VRFRequested(requestId, _user);
    }
    
    /**
     * @notice Callback function for VRF to deliver randomness
     * @param _requestId The request ID
     * @param _randomness The random value
     */
    function fulfillRandomness(uint256 _requestId, uint256 _randomness) external {
        // Only allow the SonicVRFReceiver to call this function
        require(msg.sender == sonicVRFReceiverAddress, "Only VRF receiver can call");
        
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
    
    /* ========== JACKPOT MANAGEMENT ========== */
    
    /**
     * @notice Add funds to the jackpot
     * @param _amount The amount to add
     */
    function addToJackpot(uint256 _amount) external {
        // Transfer wS from the sender to this contract
        IERC20(wrappedSonicAddress).transferFrom(msg.sender, address(this), _amount);
        
        // Update the jackpot balance
        jackpotBalance += _amount;
        
        emit JackpotAdded(_amount, jackpotBalance);
    }
    
    /**
     * @notice Set the win threshold
     * @param _winThreshold The new win threshold
     */
    function setWinThreshold(uint256 _winThreshold) external onlyOwner {
        require(_winThreshold > 0, "Win threshold must be greater than 0");
        uint256 oldThreshold = winThreshold;
        winThreshold = _winThreshold;
        
        emit WinThresholdUpdated(oldThreshold, _winThreshold);
    }
    
    /**
     * @notice Set the minimum swap amount
     * @param _minSwapAmount The new minimum swap amount
     */
    function setMinSwapAmount(uint256 _minSwapAmount) external onlyOwner {
        minSwapAmount = _minSwapAmount;
    }
    
    /**
     * @notice Update the SonicVRFReceiver address
     * @param _sonicVRFReceiverAddress The new address
     */
    function setSonicVRFReceiver(address _sonicVRFReceiverAddress) external onlyOwner {
        require(_sonicVRFReceiverAddress != address(0), "VRF cannot be zero address");
        sonicVRFReceiverAddress = _sonicVRFReceiverAddress;
    }
    
    /**
     * @notice Receive ETH
     */
    receive() external payable {}
} 