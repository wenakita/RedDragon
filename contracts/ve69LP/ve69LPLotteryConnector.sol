// SPDX-License-Identifier: MIT

/**
 *   ==========================================
 *    LOTTERY CONNECTOR FOR ve69LP TOKEN
 *   ==========================================
 *
 * // "War... war never changes." - Fallout
 * // https://x.com/sonicreddragon
 * // https://t.me/sonicreddragon
 */

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IDragonLotterySwap.sol";
import "./interfaces/Ive69LP.sol";

/**
 * @title ve69LPLotteryConnector
 * @dev Connects ve69LP token holders to the lottery system with enhanced rewards
 * @notice Users with ve69LP tokens get bonus tickets when they enter the lottery
 */
contract ve69LPLotteryConnector is Ownable, ReentrancyGuard {
    // Core contracts
    Ive69LP public ve69lpToken;
    IDragonLotterySwap public lotterySwap;
    
    // Bonus ticket scaling parameters
    uint256 public constant MAX_BONUS_PERCENT = 100;  // 100% maximum bonus
    uint256 public bonusScalingFactor = 10;          // Initial scaling factor
    
    // Events
    event BonusTicketsAwarded(address indexed user, uint256 regularTickets, uint256 bonusTickets);
    event BonusScalingFactorUpdated(uint256 oldFactor, uint256 newFactor);
    event LotterySwapUpdated(address indexed oldLottery, address indexed newLottery);
    
    /**
     * @dev Constructor
     * @param _ve69lpToken Address of the ve69LP token
     * @param _lotterySwap Address of the dragon lottery swap contract
     */
    constructor(address _ve69lpToken, address _lotterySwap) {
        require(_ve69lpToken != address(0), "ve69LP address cannot be zero");
        require(_lotterySwap != address(0), "Lottery address cannot be zero");
        
        ve69lpToken = Ive69LP(_ve69lpToken);
        lotterySwap = IDragonLotterySwap(_lotterySwap);
    }
    
    /**
     * @dev Enter the lottery with bonus tickets based on ve69LP holdings
     * @param _regularTickets Number of regular tickets to purchase
     */
    function enterLotteryWithBonus(uint256 _regularTickets) external nonReentrant {
        require(_regularTickets > 0, "Must buy at least one ticket");
        
        // Get user's ve69LP balance
        uint256 veBalance = ve69lpToken.balanceOf(msg.sender);
        
        // Calculate bonus tickets
        uint256 bonusTickets = calculateBonusTickets(_regularTickets, veBalance);
        
        // Enter the lottery with bonus tickets
        lotterySwap.enterLotteryFor(
            msg.sender,
            _regularTickets + bonusTickets
        );
        
        emit BonusTicketsAwarded(msg.sender, _regularTickets, bonusTickets);
    }
    
    /**
     * @dev Calculate bonus tickets based on ve69LP holdings
     * @param _regularTickets Number of regular tickets
     * @param _veBalance User's ve69LP balance
     * @return Number of bonus tickets
     */
    function calculateBonusTickets(uint256 _regularTickets, uint256 _veBalance) public view returns (uint256) {
        if (_veBalance == 0) {
            return 0;
        }
        
        // Calculate bonus percentage based on ve69LP balance
        uint256 bonusPercent = (_veBalance * bonusScalingFactor) / 1e18;
        
        // Cap the bonus percentage
        if (bonusPercent > MAX_BONUS_PERCENT) {
            bonusPercent = MAX_BONUS_PERCENT;
        }
        
        // Calculate bonus tickets
        uint256 bonusTickets = (_regularTickets * bonusPercent) / 100;
        
        return bonusTickets;
    }
    
    /**
     * @dev Update the bonus scaling factor
     * @param _newFactor New scaling factor
     */
    function updateBonusScalingFactor(uint256 _newFactor) external onlyOwner {
        require(_newFactor > 0, "Factor must be greater than 0");
        
        uint256 oldFactor = bonusScalingFactor;
        bonusScalingFactor = _newFactor;
        
        emit BonusScalingFactorUpdated(oldFactor, _newFactor);
    }
    
    /**
     * @dev Update the lottery swap contract address
     * @param _newLottery New lottery swap address
     */
    function updateLotterySwap(address _newLottery) external onlyOwner {
        require(_newLottery != address(0), "Lottery address cannot be zero");
        
        address oldLottery = address(lotterySwap);
        lotterySwap = IDragonLotterySwap(_newLottery);
        
        emit LotterySwapUpdated(oldLottery, _newLottery);
    }
} 