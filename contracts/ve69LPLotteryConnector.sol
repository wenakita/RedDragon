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
import "./interfaces/IDragonSwapTrigger.sol";
import "./interfaces/Ive69LP.sol";

/**
 * @title ve69LPLotteryConnector
 * @dev Connects ve69LP token holders to the lottery system with enhanced win probability
 * @notice Users with ve69LP tokens get a boost to their win probability when participating in the lottery
 */
contract ve69LPLotteryConnector is Ownable, ReentrancyGuard {
    // Core contracts
    Ive69LP public ve69lpToken;
    IDragonSwapTrigger public swapTrigger;
    
    // Probability boost scaling parameters
    uint256 public constant MAX_PROBABILITY_BOOST = 100;  // 100% maximum boost (1x)
    uint256 public probabilityBoostScalingFactor = 10;    // Initial scaling factor (configurable)

    // Events
    event ProbabilityBoostApplied(address indexed user, uint256 boostPercent);
    event ProbabilityBoostScalingFactorUpdated(uint256 oldFactor, uint256 newFactor);
    event SwapTriggerUpdated(address indexed oldTrigger, address indexed newTrigger);
    
    /**
     * @dev Constructor
     * @param _ve69lpToken Address of the ve69LP token
     * @param _swapTrigger Address of the dragon swap trigger contract
     */
    constructor(address _ve69lpToken, address _swapTrigger) {
        require(_ve69lpToken != address(0), "ve69LP address cannot be zero");
        require(_swapTrigger != address(0), "Swap trigger address cannot be zero");
        
        ve69lpToken = Ive69LP(_ve69lpToken);
        swapTrigger = IDragonSwapTrigger(_swapTrigger);
    }
    
    /**
     * @dev Update the user's probability boost in the lottery contract based on their ve69LP holdings.
     * Can be called by the user or an admin before the user participates in the lottery.
     */
    function updateUserProbabilityBoost() external nonReentrant {
        address user = msg.sender;
        uint256 veBalance = ve69lpToken.lockedBalanceOf(user);
        uint256 boostPercent = calculateProbabilityBoost(veBalance);
        // Since setUserProbabilityBoost isn't in IDragonSwapTrigger, we need to adapt
        // This is where you would need to add a similar method to DragonSwapTrigger
        // For now, we'll leave this commented out
        // swapTrigger.setUserProbabilityBoost(user, boostPercent);
        emit ProbabilityBoostApplied(user, boostPercent);
    }
    
    /**
     * @dev Calculate probability boost based on ve69LP holdings
     * @param _veBalance User's ve69LP balance
     * @return Probability boost in percent (e.g., 10 = 10%)
     */
    function calculateProbabilityBoost(uint256 _veBalance) public view returns (uint256) {
        if (_veBalance == 0) {
            return 0;
        }
        uint256 boostPercent = (_veBalance * probabilityBoostScalingFactor) / 1e18;
        if (boostPercent > MAX_PROBABILITY_BOOST) {
            boostPercent = MAX_PROBABILITY_BOOST;
        }
        return boostPercent;
    }
    
    /**
     * @dev Update the probability boost scaling factor
     * @param _newFactor New scaling factor
     */
    function updateProbabilityBoostScalingFactor(uint256 _newFactor) external onlyOwner {
        require(_newFactor > 0, "Factor must be greater than 0");
        uint256 oldFactor = probabilityBoostScalingFactor;
        probabilityBoostScalingFactor = _newFactor;
        emit ProbabilityBoostScalingFactorUpdated(oldFactor, _newFactor);
    }
    
    /**
     * @dev Update the lottery swap contract address
     * @param _newTrigger New swap trigger address
     */
    function updateSwapTrigger(address _newTrigger) external onlyOwner {
        require(_newTrigger != address(0), "Swap trigger address cannot be zero");
        
        address oldTrigger = address(swapTrigger);
        swapTrigger = IDragonSwapTrigger(_newTrigger);
        
        emit SwapTriggerUpdated(oldTrigger, _newTrigger);
    }
} 