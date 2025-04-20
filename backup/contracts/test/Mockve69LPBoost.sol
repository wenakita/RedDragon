// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Mockve69LPBoost {
    // Default multiplier is 10000 (100%)
    uint256 public constant BOOST_PRECISION = 10000;
    
    // Store boost multipliers per user for testing
    mapping(address => uint256) public userBoostMultipliers;
    
    address public ve69LP;
    address public jackpot;
    
    constructor(address _ve69LP, address _jackpot) {
        // Default boost is 10000 (100%)
        ve69LP = _ve69LP;
        jackpot = _jackpot;
    }
    
    // Set custom boost multiplier for a user
    function setBoostMultiplier(address user, uint256 multiplier) external {
        userBoostMultipliers[user] = multiplier;
    }
    
    // Calculate boost for a user (returns the set value or default)
    function calculateBoost(address user) external view returns (uint256) {
        uint256 boost = userBoostMultipliers[user];
        return boost == 0 ? BOOST_PRECISION : boost;
    }
    
    // Non-view version for test compatibility
    function getBoostWithEvent(address user) external returns (uint256) {
        return this.calculateBoost(user);
    }
    
    // Simulate entering jackpot with boost
    function enterJackpotWithBoost(address user, uint256 amount) external returns (uint256) {
        uint256 boost = this.calculateBoost(user);
        return (amount * boost) / BOOST_PRECISION;
    }
    
    function setVe69LP(address _ve69LP) external {
        ve69LP = _ve69LP;
    }
    
    function setJackpot(address _jackpot) external {
        jackpot = _jackpot;
    }
} 