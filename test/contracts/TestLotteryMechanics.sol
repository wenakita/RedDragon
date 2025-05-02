// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IDragonSwapTrigger.sol";

/**
 * @title TestLotteryMechanics
 * @dev A test contract for simulating lottery mechanics
 */
contract TestLotteryMechanics is Ownable {
    // Tokens
    IERC20 public wrappedSonic;
    IERC20 public dragonToken;
    
    // Swap trigger
    address public swapTrigger;
    
    // Lottery stats
    struct LotteryStats {
        uint256 entries;
        uint256 winners;
        uint256 totalPaidOut;
        uint256 jackpotBalance;
    }
    
    LotteryStats public stats;
    
    // Entry tracking
    mapping(address => uint256) public userEntries;
    address[] public participants;
    
    // Winning simulation
    uint256 public winProbability = 1000; // 1 in 1000 (0.1%)
    
    // Events
    event SwapSimulated(address indexed user, uint256 wsAmount, uint256 dragonAmount);
    event LotteryEntered(address indexed user, uint256 amount);
    event LotteryWon(address indexed winner, uint256 amount);
    event JackpotIncreased(uint256 amount, uint256 newBalance);
    event WinProbabilityUpdated(uint256 oldValue, uint256 newValue);
    
    constructor(address _wrappedSonic, address _dragonToken, address _swapTrigger) Ownable() {
        wrappedSonic = IERC20(_wrappedSonic);
        dragonToken = IERC20(_dragonToken);
        swapTrigger = _swapTrigger;
    }
    
    /**
     * @notice Simulate a swap from wS to DRAGON and trigger lottery
     * @param _wsAmount Amount of wS to swap
     * @return dragonAmount Amount of DRAGON received
     */
    function simulateSwap(uint256 _wsAmount) external returns (uint256 dragonAmount) {
        require(_wsAmount > 0, "Amount must be greater than 0");
        
        // Calculate DRAGON amount (simplified 1:1 for test purposes)
        dragonAmount = _wsAmount;
        
        // Track the entry first to prevent reentrancy
        if (userEntries[msg.sender] == 0) {
            participants.push(msg.sender);
        }
        userEntries[msg.sender] += _wsAmount;
        
        // Update stats
        stats.entries++;
        
        // Transfer wS tokens from user (external call after state updates)
        wrappedSonic.transferFrom(msg.sender, address(this), _wsAmount);
        
        // Mint DRAGON tokens to user (simplified)
        // In reality, this would be a swap through DEX
        dragonToken.transfer(msg.sender, dragonAmount);
        
        // Trigger lottery entry
        IDragonSwapTrigger(swapTrigger).onSwapNativeTokenToDragon(msg.sender, _wsAmount);
        
        emit SwapSimulated(msg.sender, _wsAmount, dragonAmount);
        emit LotteryEntered(msg.sender, _wsAmount);
        
        return dragonAmount;
    }
    
    /**
     * @notice Add to the jackpot
     * @param _amount Amount to add
     */
    function addToJackpot(uint256 _amount) external {
        // Transfer wS tokens from user
        wrappedSonic.transferFrom(msg.sender, address(this), _amount);
        
        // Send to the swap trigger jackpot
        wrappedSonic.approve(swapTrigger, _amount);
        IDragonSwapTrigger(swapTrigger).addToJackpot(_amount);
        
        // Update stats
        stats.jackpotBalance += _amount;
        
        emit JackpotIncreased(_amount, stats.jackpotBalance);
    }
    
    /**
     * @notice Simulate a lottery win (for testing)
     * @param _winner Address of the winner
     * @param _amount Amount to win
     */
    function simulateWin(address _winner, uint256 _amount) external onlyOwner {
        require(_winner != address(0), "Invalid winner address");
        require(_amount > 0, "Amount must be greater than 0");
        
        // Update stats
        stats.winners++;
        stats.totalPaidOut += _amount;
        stats.jackpotBalance -= _amount > stats.jackpotBalance ? stats.jackpotBalance : _amount;
        
        emit LotteryWon(_winner, _amount);
    }
    
    /**
     * @notice Set the win probability
     * @param _winProbability New win probability (e.g., 1000 = 0.1%, 100 = 1%)
     */
    function setWinProbability(uint256 _winProbability) external onlyOwner {
        require(_winProbability > 0, "Probability must be greater than 0");
        
        uint256 oldValue = winProbability;
        winProbability = _winProbability;
        
        // Update in the swap trigger as well
        IDragonSwapTrigger(swapTrigger).setWinThreshold(_winProbability);
        
        emit WinProbabilityUpdated(oldValue, _winProbability);
    }
    
    /**
     * @notice Set minimum swap amount for lottery entry
     * @param _minSwapAmount New minimum amount
     */
    function setMinSwapAmount(uint256 _minSwapAmount) external onlyOwner {
        IDragonSwapTrigger(swapTrigger).setMinSwapAmount(_minSwapAmount);
    }
    
    /**
     * @notice Get current jackpot balance
     * @return balance Current jackpot balance
     */
    function getJackpotBalance() external view returns (uint256 balance) {
        return IDragonSwapTrigger(swapTrigger).getJackpotBalance();
    }
    
    /**
     * @notice Get number of participants
     * @return count Number of unique participants
     */
    function getParticipantCount() external view returns (uint256 count) {
        return participants.length;
    }
    
    /**
     * @notice Update swap trigger address
     * @param _swapTrigger New swap trigger address
     */
    function updateSwapTrigger(address _swapTrigger) external onlyOwner {
        require(_swapTrigger != address(0), "Invalid swap trigger address");
        swapTrigger = _swapTrigger;
    }
    
    /**
     * @notice Withdraw tokens in case of emergency
     * @param _token Token to withdraw
     * @param _to Address to send tokens to
     * @param _amount Amount to withdraw
     */
    function emergencyWithdraw(address _token, address _to, uint256 _amount) external onlyOwner {
        require(_to != address(0), "Invalid recipient address");
        IERC20(_token).transfer(_to, _amount);
    }
} 