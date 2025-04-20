// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/Ive69LP.sol";
import "../interfaces/IJackpot.sol";

contract Mockve69LPBoost {
    address public ve69LP;
    address public jackpot;
    
    uint256 public baseBoost = 1e18; // 1x boost as base
    uint256 public maxBoost = 3e18;  // 3x max boost
    uint256 public minLockDuration = 7 days;
    uint256 public maxLockDuration = 4 * 365 days; // 4 years
    
    event BoostCalculated(address indexed user, uint256 amount, uint256 boostedAmount);
    event JackpotEntered(address indexed user, uint256 amount, uint256 boostedAmount);
    event ParametersUpdated(uint256 baseBoost, uint256 maxBoost, uint256 minLockDuration, uint256 maxLockDuration);
    
    constructor(address _ve69LP, address _jackpot) {
        ve69LP = _ve69LP;
        jackpot = _jackpot;
    }
    
    function calculateBoost(address user, uint256 amount) public view returns (uint256) {
        if (amount == 0) return 0;
        
        Ive69LP veToken = Ive69LP(ve69LP);
        uint256 userBalance = veToken.balanceOf(user);
        uint256 totalVotingPower = veToken.totalVotingPower();
        
        // For mock testing, simplify to a linear calculation
        if (userBalance == 0) return amount;
        
        uint256 boostMultiplier = baseBoost + ((maxBoost - baseBoost) * userBalance) / totalVotingPower;
        if (boostMultiplier > maxBoost) boostMultiplier = maxBoost;
        
        uint256 boostedAmount = (amount * boostMultiplier) / 1e18;
        
        return boostedAmount;
    }
    
    function enterJackpotWithBoost(address user, uint256 amount) external returns (bool) {
        uint256 boostedAmount = calculateBoost(user, amount);
        
        // Emit event for boost calculation
        emit BoostCalculated(user, amount, boostedAmount);
        
        // Mock jackpot entry - in a real contract this would call the jackpot contract
        emit JackpotEntered(user, amount, boostedAmount);
        return true;
    }
    
    function setParameters(
        uint256 _baseBoost,
        uint256 _maxBoost,
        uint256 _minLockDuration,
        uint256 _maxLockDuration
    ) external {
        baseBoost = _baseBoost;
        maxBoost = _maxBoost;
        minLockDuration = _minLockDuration;
        maxLockDuration = _maxLockDuration;
        
        emit ParametersUpdated(_baseBoost, _maxBoost, _minLockDuration, _maxLockDuration);
    }
    
    function setVe69LP(address _ve69LP) external {
        ve69LP = _ve69LP;
    }
    
    function setJackpot(address _jackpot) external {
        jackpot = _jackpot;
    }
} 