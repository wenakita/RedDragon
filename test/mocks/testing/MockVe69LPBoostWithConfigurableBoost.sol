// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IJackpot {
    function enterJackpotWithWS(address user, uint256 wsAmount) external;
}

contract MockVe69LPBoostWithConfigurableBoost {
    address public jackpot;
    mapping(address => uint256) public userBoosts;
    
    // Set boost for specific user
    function setBoostForUser(address user, uint256 boost) external {
        userBoosts[user] = boost;
    }
    
    // Calculate boost for a user
    function calculateBoost(address user) external view returns (uint256) {
        return userBoosts[user] > 0 ? userBoosts[user] : 10000; // Default to 1x
    }
    
    // Mock function for entering jackpot with boost
    function enterJackpotWithBoost(address user, uint256 amount) external {
        uint256 boost = userBoosts[user] > 0 ? userBoosts[user] : 10000;
        uint256 boostedAmount = (amount * boost) / 10000;
        IJackpot(jackpot).enterJackpotWithWS(user, boostedAmount);
    }
    
    // Set jackpot
    function setJackpot(address _jackpot) external {
        jackpot = _jackpot;
    }
} 