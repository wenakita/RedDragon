// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../RedDragonLPBooster.sol";

/**
 * @title MockRedDragonSwapLotteryWithBoost
 * @dev Simplified version of lottery with boost integration for testing
 */
contract MockRedDragonSwapLotteryWithBoost is Ownable, ReentrancyGuard {
    // Constants for probability calculations
    uint256 private constant BASE_WS_AMOUNT = 100 ether; // 100 wS
    uint256 private constant BASE_PROBABILITY = 1; // 0.1%
    uint256 private constant PROBABILITY_DENOMINATOR = 1000; // For 0.1% precision
    uint256 private constant MAX_PROBABILITY = 100; // 10%
    
    // State variables
    IERC20 public wrappedSonic;
    
    // LP booster reference
    RedDragonLPBooster public lpBooster;
    bool public useBooster = true;
    
    // Events
    event BoosterSet(address booster);
    event BoosterUsageUpdated(bool useBooster);
    
    /**
     * @dev Constructor
     * @param _wrappedSonic Address of the wrapped Sonic token
     */
    constructor(address _wrappedSonic) {
        require(_wrappedSonic != address(0), "wS address cannot be zero");
        wrappedSonic = IERC20(_wrappedSonic);
    }
    
    /**
     * @dev Set the LP booster contract
     * @param _booster Address of the LP booster contract
     */
    function setBooster(address _booster) external onlyOwner {
        require(_booster != address(0), "Booster address cannot be zero");
        lpBooster = RedDragonLPBooster(_booster);
        emit BoosterSet(_booster);
    }
    
    /**
     * @dev Enable or disable booster usage
     * @param _useBooster Whether to use the booster
     */
    function setUseBooster(bool _useBooster) external onlyOwner {
        useBooster = _useBooster;
        emit BoosterUsageUpdated(_useBooster);
    }
    
    /**
     * @dev Calculate base win probability based on wS amount
     * @param wsAmount Amount of wS tokens
     * @return probability The calculated base win probability
     */
    function calculateBaseProbability(uint256 wsAmount) public pure returns (uint256) {
        uint256 probability = (wsAmount * BASE_PROBABILITY) / BASE_WS_AMOUNT;
        return probability > MAX_PROBABILITY ? MAX_PROBABILITY : probability;
    }
    
    /**
     * @dev Calculate probability with LP boosts applied
     * @param user Address to calculate probability for
     * @param baseProbability Base probability before boosts
     * @return probability The effective probability after boosts
     */
    function calculateProbabilityWithBoosts(
        address user,
        uint256 baseProbability
    ) public view returns (uint256) {
        // If no booster or booster disabled, return base probability
        if (address(lpBooster) == address(0) || !useBooster) {
            return baseProbability;
        }
        
        // Get boost from LP booster
        uint256 boost = lpBooster.calculateBoost(user);
        
        // If no boost, return base probability
        if (boost == 0) {
            return baseProbability;
        }
        
        // Calculate boosted probability
        // boost is in percentage with precision (e.g., 69 means 0.69%)
        uint256 boostMultiplier = 10000 + boost;
        uint256 boostedProbability = (baseProbability * boostMultiplier) / 10000;
        
        // Ensure probability doesn't exceed maximum
        return boostedProbability > MAX_PROBABILITY ? MAX_PROBABILITY : boostedProbability;
    }
    
    /**
     * @dev Simulate lottery entry processing
     * @param user User address
     * @param wsAmount Amount of wS tokens
     * @return probability The final probability after boosts
     */
    function processLotteryEntry(address user, uint256 wsAmount) external view returns (uint256) {
        // Calculate base probability
        uint256 baseProbability = calculateBaseProbability(wsAmount);
        
        // Apply boosts
        uint256 finalProbability = calculateProbabilityWithBoosts(user, baseProbability);
        
        return finalProbability;
    }
} 