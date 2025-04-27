// SPDX-License-Identifier: MIT

/**
 *   ============================
 *          ve69LP BOOST
 *   ============================
 *    Dynamic Boost Calculator
 *   for ve69LP Token Holders
 *   ============================
 *
 * // "Do you understand the words that are coming out of my mouth?" - Carter
 * // https://x.com/sonicreddragon
 * // https://t.me/sonicreddragon
 */

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./interfaces/Ive69LP.sol";
import "./interfaces/IJackpot.sol";
import "./VotingPowerCalculator.sol";

/**
 * @title ve69LPBoost
 * @dev Contract for calculating boosts based on ve69LP holdings
 * Uses cubic root normalization to provide a more equitable boost to smaller holders
 * Connects ve69LP holdings to lottery/jackpot entry power
 */
contract ve69LPBoost is Ownable, ReentrancyGuard {
    // Core contract references
    Ive69LP public immutable ve69LP;
    IJackpot public jackpot;
    
    // Boost parameters (configurable)
    uint256 public constant BOOST_PRECISION = 10000;
    uint256 public baseBoost = 10000;        // 100% = 10000 (can be adjusted)
    uint256 public maxBoost = 25000;         // 250% = 25000 (can be adjusted)
    
    // Optional parameters for refined boost calculation
    uint256 public minLockDuration = 7 days; // Minimum lock duration for boost
    uint256 public maxLockDuration = 4 * 365 days; // Maximum lock duration (4 years)
    
    // Events
    event BoostCalculated(address indexed user, uint256 boost);
    event BoostParametersUpdated(uint256 baseBoost, uint256 maxBoost);
    event JackpotAddressUpdated(address indexed newJackpot);
    event JackpotEntryWithBoost(address indexed user, uint256 amount, uint256 boostedAmount);
    
    /**
     * @dev Constructor
     * @param _ve69LP Address of the ve69LP token contract
     * @param _jackpot Address of the jackpot contract
     */
    constructor(address _ve69LP, address _jackpot) {
        require(_ve69LP != address(0), "ve69LP address cannot be zero");
        require(_jackpot != address(0), "Jackpot address cannot be zero");
        
        ve69LP = Ive69LP(_ve69LP);
        jackpot = IJackpot(_jackpot);
    }
    
    /**
     * @dev Calculate boost multiplier based on user's ve69LP balance with cubic root normalization
     * Uses the shared VotingPowerCalculator for consistent cube root calculation
     * @param user Address of the user
     * @return boostMultiplier Boost multiplier in BOOST_PRECISION (10000 = 100%)
     */
    function calculateBoost(address user) public view returns (uint256 boostMultiplier) {
        // Get user's ve69LP balance
        uint256 userve69LPBalance = ve69LP.balanceOf(user);
        
        // Get total ve69LP supply (or voting power)
        uint256 totalve69LPSupply = ve69LP.totalVotingPower();
        
        // Use the shared calculator library with our precision values
        return VotingPowerCalculator.calculateBoostMultiplier(
            userve69LPBalance,
            totalve69LPSupply,
            baseBoost,
            maxBoost
        );
    }
    
    /**
     * @dev Calculate boost and emit event (non-view version)
     * @param user Address of the user
     * @return boostMultiplier Boost multiplier
     */
    function getBoostWithEvent(address user) public returns (uint256 boostMultiplier) {
        boostMultiplier = calculateBoost(user);
        emit BoostCalculated(user, boostMultiplier);
        return boostMultiplier;
    }
    
    /**
     * @dev Enter jackpot with a boosted amount based on ve69LP holdings
     * @param user Address of the user entering the jackpot
     * @param amount Base amount for jackpot entry
     * @return boostedAmount The amount after applying the boost
     */
    function enterJackpotWithBoost(address user, uint256 amount) external returns (uint256 boostedAmount) {
        // Only authorized integrators can call this function
        require(msg.sender == owner() || msg.sender == address(jackpot), "Unauthorized caller");
        
        // Calculate boost
        uint256 boostMultiplier = calculateBoost(user);
        
        // Apply boost to amount
        boostedAmount = (amount * boostMultiplier) / BOOST_PRECISION;
        
        // Enter jackpot with boosted amount
        jackpot.enterJackpotWithWrappedSonic(user, boostedAmount);
        
        // Emit events
        emit BoostCalculated(user, boostMultiplier);
        emit JackpotEntryWithBoost(user, amount, boostedAmount);
        
        return boostedAmount;
    }
    
    /**
     * @dev Update boost parameters
     * @param _baseBoost New base boost (10000 = 100%)
     * @param _maxBoost New max boost (25000 = 250%)
     */
    function setBoostParameters(uint256 _baseBoost, uint256 _maxBoost) external onlyOwner {
        require(_baseBoost > 0, "Base boost must be > 0");
        require(_maxBoost > _baseBoost, "Max boost must be > base boost");
        
        baseBoost = _baseBoost;
        maxBoost = _maxBoost;
        
        emit BoostParametersUpdated(_baseBoost, _maxBoost);
    }
    
    /**
     * @dev Update jackpot address
     * @param _jackpot New jackpot address
     */
    function setJackpot(address _jackpot) external onlyOwner {
        require(_jackpot != address(0), "Jackpot address cannot be zero");
        jackpot = IJackpot(_jackpot);
        emit JackpotAddressUpdated(_jackpot);
    }
} 