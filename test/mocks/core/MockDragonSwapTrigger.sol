// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/IDragonSwapTrigger.sol";

/**
 * @title MockDragonSwapTrigger
 * @dev Simplified mock of DragonSwapTrigger for testing
 */
abstract contract MockDragonSwapTrigger is IDragonSwapTrigger, Ownable, ReentrancyGuard {
    // State variables
    IERC20 public nativeTokenWrapper;
    IERC20 public dragonToken;
    address public vrfConsumer;
    
    // Lottery configuration
    uint256 public minSwapAmount;
    uint256 public winThreshold = 1000; // 0.1% chance (1/1000)
    uint256 public jackpotBalance;
    
    // Request tracking
    mapping(uint256 => address) public requestToUser;
    mapping(uint256 => uint256) public requestToAmount;
    uint256 public nonce;
    
    // Winner tracking
    address public lastWinner;
    uint256 public lastWinAmount;
    uint256 public totalWinners;
    uint256 public totalPaidOut;
    
    // Events
    event SwapDetected(address indexed user, uint256 amount);
    event RandomnessRequested(uint256 indexed requestId, address indexed user);
    event JackpotWon(address indexed winner, uint256 amount);
    event JackpotIncreased(uint256 amount, uint256 newBalance);
    event WinThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event MinSwapAmountUpdated(uint256 oldAmount, uint256 newAmount);
    
    /**
     * @dev Constructor
     * @param _nativeTokenWrapper Address of native token wrapper
     * @param _dragonToken Address of DRAGON token
     * @param _vrfConsumer Address of VRF consumer
     * @param _minSwapAmount Minimum amount for lottery entry
     */
    constructor(
        address _nativeTokenWrapper,
        address _dragonToken,
        address _vrfConsumer,
        uint256 _minSwapAmount
    ) {
        nativeTokenWrapper = IERC20(_nativeTokenWrapper);
        dragonToken = IERC20(_dragonToken);
        vrfConsumer = _vrfConsumer;
        minSwapAmount = _minSwapAmount;
    }
    
    /**
     * @notice Triggered when a user swaps native token for DRAGON
     * @param _user The user who performed the swap
     * @param _amount The amount of native token swapped
     */
    function onSwapNativeTokenToDragon(address _user, uint256 _amount) external override {
        // Check if amount is enough to enter
        if (_amount < minSwapAmount) {
            return;
        }
        
        // Transfer tokens to this contract
        nativeTokenWrapper.transferFrom(msg.sender, address(this), _amount);
        
        // Generate unique request ID
        uint256 requestId = nonce++;
        
        // Store request data
        requestToUser[requestId] = _user;
        requestToAmount[requestId] = _amount;
        
        emit SwapDetected(_user, _amount);
        emit RandomnessRequested(requestId, _user);
    }
    
    /**
     * @notice Sets the win threshold
     * @param _winThreshold New win threshold
     */
    function setWinThreshold(uint256 _winThreshold) external onlyOwner {
        uint256 oldThreshold = winThreshold;
        winThreshold = _winThreshold;
        emit WinThresholdUpdated(oldThreshold, _winThreshold);
    }
    
    /**
     * @notice Set the minimum swap amount
     * @param _minSwapAmount The new minimum swap amount
     */
    function setMinSwapAmount(uint256 _minSwapAmount) external override onlyOwner {
        uint256 oldAmount = minSwapAmount;
        minSwapAmount = _minSwapAmount;
        emit MinSwapAmountUpdated(oldAmount, _minSwapAmount);
    }
    
    /**
     * @notice Add funds to the jackpot
     * @param _amount The amount to add
     */
    function addToJackpot(uint256 _amount) external override {
        nativeTokenWrapper.transferFrom(msg.sender, address(this), _amount);
        jackpotBalance += _amount;
        emit JackpotIncreased(_amount, jackpotBalance);
    }
    
    /**
     * @notice Get the current jackpot balance
     * @return The jackpot balance
     */
    function getJackpotBalance() external view override returns (uint256) {
        return jackpotBalance;
    }
    
    /**
     * @notice Fulfills randomness (for testing)
     * @param _requestId Request ID
     * @param _randomness Random value
     */
    function fulfillRandomness(uint256 _requestId, uint256 _randomness) external {
        // Mock implementation
    }
    
    /**
     * @notice Process randomness
     * @param _requestId The request ID
     * @param _user The user address
     * @param _randomness The random value
     */
    function processRandomness(
        uint64 _requestId,
        address _user,
        uint256 _randomness
    ) external {
        require(msg.sender == vrfConsumer, "Only VRF consumer");
        
        // Get the user associated with this request
        address user = requestToUser[_requestId];
        require(user != address(0), "Unknown request");
        require(user == _user, "User mismatch");
        
        // Determine if user won (randomness % threshold == 0)
        if (_randomness % winThreshold == 0) {
            // Calculate win amount
            uint256 winAmount = jackpotBalance;
            jackpotBalance = 0;
            
            // Update stats
            lastWinner = user;
            lastWinAmount = winAmount;
            totalWinners++;
            totalPaidOut += winAmount;
            
            // Transfer the jackpot
            nativeTokenWrapper.transfer(user, winAmount);
            
            emit JackpotWon(user, winAmount);
        }
        
        // Clean up
        delete requestToUser[_requestId];
        delete requestToAmount[_requestId];
    }
    
    /**
     * @notice Update the VRF consumer address
     * @param _vrfConsumerAddress The new address
     */
    function setVRFConsumer(address _vrfConsumerAddress) external override onlyOwner {
        vrfConsumer = _vrfConsumerAddress;
    }
    
    /**
     * @notice Get the native token wrapper address
     * @return The wrapper address
     */
    function getNativeTokenWrapper() external view override returns (address) {
        return address(nativeTokenWrapper);
    }
    
    /**
     * @notice Get lottery statistics
     * @return winners Number of winners
     * @return paidOut Total amount paid out
     * @return current Current jackpot
     */
    function getStats() external view returns (
        uint256 winners,
        uint256 paidOut,
        uint256 current
    ) {
        return (totalWinners, totalPaidOut, jackpotBalance);
    }
    
    /**
     * @notice Convert token amount to USD
     * @param _amount Amount to convert
     * @return USD value with 18 decimals
     */
    function convertToUSD(uint256 _amount) external override returns (uint256) {
        // Mock implementation that returns a fixed conversion rate
        // 1 native token = $100 for testing purposes
        return _amount * 100 * 10**18 / 10**18;
    }
    
    /**
     * @notice Calculate the win threshold based on the swap amount
     * @param _amount Amount in native token
     * @return threshold The win threshold value
     */
    function calculateWinThreshold(uint256 _amount) external override returns (uint256 threshold) {
        // Mock implementation that returns a fixed threshold
        return winThreshold;
    }
    
    /**
     * @notice Set the price strategy
     * @param _strategy The price strategy to use
     */
    function setPriceStrategy(PriceStrategy _strategy) external override {
        // Mock implementation - does nothing in the mock
    }
} 