// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IDragonSwapTrigger.sol";

/**
 * @title MockDragonSwapTrigger
 * @dev Mock implementation of DragonSwapTrigger for testing
 */
abstract contract MockDragonSwapTrigger is IDragonSwapTrigger, Ownable {
    // Properties
    IERC20 public wrappedSonic;
    IERC20 public dragonToken;
    address public vrfConsumer;
    uint256 public minSwapAmount;
    uint256 public winThreshold;
    uint256 public jackpotBalance;

    // Lottery tracking
    uint256 public totalEntries;
    uint256 public totalWinners;
    uint256 public totalPaidOut;
    mapping(address => uint256) public userEntries;
    
    // Events
    event EntryReceived(address indexed user, uint256 amount);
    event JackpotIncreased(uint256 amount);
    event JackpotWon(address indexed winner, uint256 amount);
    
    constructor(
        address _wrappedSonic,
        address _dragonToken,
        address _vrfConsumer,
        uint256 _minSwapAmount
    ) {
        wrappedSonic = IERC20(_wrappedSonic);
        dragonToken = IERC20(_dragonToken);
        vrfConsumer = _vrfConsumer;
        minSwapAmount = _minSwapAmount;
        winThreshold = 1000; // 1 in 1000 chance
    }
    
    /**
     * @notice Handle token swap and lottery entry
     * @param _user User address
     * @param _amount Amount swapped
     */
    function onSwapNativeTokenToDragon(address _user, uint256 _amount) external override {
        // Only accept entries above min amount
        if (_amount < minSwapAmount) {
            return;
        }
        
        // Track entries
        userEntries[_user] += _amount;
        totalEntries += 1;
        
        emit EntryReceived(_user, _amount);
    }
    
    /**
     * @notice Add to jackpot
     * @param _amount Amount to add
     */
    function addToJackpot(uint256 _amount) external override {
        wrappedSonic.transferFrom(msg.sender, address(this), _amount);
        jackpotBalance += _amount;
        
        emit JackpotIncreased(_amount);
    }
    
    /**
     * @notice Get jackpot balance
     * @return Current jackpot balance
     */
    function getJackpotBalance() external view override returns (uint256) {
        return jackpotBalance;
    }
    
    /**
     * @notice Set win threshold
     * @param _winThreshold New threshold
     */
    function setWinThreshold(uint256 _winThreshold) external onlyOwner {
        winThreshold = _winThreshold;
    }
    
    /**
     * @notice Set minimum swap amount
     * @param _minSwapAmount New min amount
     */
    function setMinSwapAmount(uint256 _minSwapAmount) external override onlyOwner {
        minSwapAmount = _minSwapAmount;
    }
    
    /**
     * @notice Process randomness from VRF
     * @param _requestId Request ID
     * @param _user User address
     * @param _randomness Random value
     */
    function processRandomness(uint64 _requestId, address _user, uint256 _randomness) external override {
        // Mock function for testing
    }
    
    /**
     * @notice Helper function for internal testing
     * @param _requestId Request ID
     * @param _randomness Random value
     */
    function fulfillRandomness(uint256 _requestId, uint256 _randomness) external {
        // Mock function for testing
    }
    
    /**
     * @notice Set VRF consumer address
     * @param _vrfConsumerAddress New address
     */
    function setVRFConsumer(address _vrfConsumerAddress) external override onlyOwner {
        vrfConsumer = _vrfConsumerAddress;
    }
    
    /**
     * @notice Get native token wrapper
     * @return Address of the native token wrapper
     */
    function getNativeTokenWrapper() external view override returns (address) {
        return address(wrappedSonic);
    }
    
    /**
     * @notice Convert token amount to USD
     * @param _amount Amount to convert
     * @return USD value with 18 decimals
     */
    function convertToUSD(uint256 _amount) external virtual override returns (uint256);
    
    /**
     * @notice Calculate the win threshold based on the swap amount
     * @param _amount Amount in native token
     * @return threshold The win threshold value
     */
    function calculateWinThreshold(uint256 _amount) external virtual override returns (uint256 threshold);
    
    /**
     * @notice Set the price strategy
     * @param _strategy The price strategy to use
     */
    function setPriceStrategy(PriceStrategy _strategy) external virtual override;
    
    /**
     * @notice Get lottery statistics
     * @return winners Number of winners
     * @return paidOut Total amount paid out
     * @return current Current jackpot balance
     */
    function getStats() external view override returns (
        uint256 winners,
        uint256 paidOut,
        uint256 current
    ) {
        return (totalWinners, totalPaidOut, jackpotBalance);
    }
    
    /**
     * @notice Simulate a lottery win for testing
     * @param _winner Winner address
     * @param _amount Amount to win
     */
    function simulateWin(address _winner, uint256 _amount) external onlyOwner {
        require(_amount <= jackpotBalance, "Insufficient jackpot");
        
        // Update state variables before transfer to prevent reentrancy
        uint256 newJackpotBalance = jackpotBalance - _amount;
        jackpotBalance = newJackpotBalance;
        totalWinners += 1;
        totalPaidOut += _amount;
        
        // Perform transfer after state variables are updated
        wrappedSonic.transfer(_winner, _amount);
        
        emit JackpotWon(_winner, _amount);
    }
} 