// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ve8020.sol";
import "./RedDragonSwapLottery.sol";

/**
 * @title ve8020LotteryIntegrator
 * @dev Contract that connects the ve8020 token with the RedDragonSwapLottery
 * This integrator automatically syncs voting power from ve8020 to the lottery
 * and allows users to boost their lottery odds based on their locked LP tokens
 */
contract ve8020LotteryIntegrator is Ownable {
    // Contracts
    ve8020 public veToken;
    RedDragonSwapLottery public lottery;
    
    // Events
    event VotingPowerSynced(address indexed user, uint256 votingPower);
    event LotteryUpdated(address indexed lotteryAddress);
    event VeTokenUpdated(address indexed veTokenAddress);
    
    /**
     * @dev Constructor
     * @param _veToken Address of the ve8020 token
     * @param _lottery Address of the RedDragonSwapLottery
     */
    constructor(address _veToken, address _lottery) {
        require(_veToken != address(0), "ve8020 token address cannot be zero");
        require(_lottery != address(0), "Lottery address cannot be zero");
        
        veToken = ve8020(_veToken);
        lottery = RedDragonSwapLottery(_lottery);
        
        // Set this contract as the voting token in the lottery
        _setLotteryVotingToken();
    }
    
    /**
     * @dev Set up the lottery contract to use veToken for voting power
     */
    function _setLotteryVotingToken() internal {
        // Set this integrator as the voting token in lottery
        // This allows us to manage user voting power in a centralized way
        lottery.setVotingToken(address(this));
    }
    
    /**
     * @dev Sync a user's voting power from ve8020 to the lottery
     * @param _user The user address to sync
     */
    function syncUserVotingPower(address _user) public {
        // Get user's current voting power from ve8020
        uint256 votingPower = veToken.balanceOf(_user);
        
        // Update the voting power in the lottery
        lottery.updateUserVotingPower(_user, votingPower);
        
        emit VotingPowerSynced(_user, votingPower);
    }
    
    /**
     * @dev Users can call this to sync their own voting power
     */
    function syncMyVotingPower() external {
        syncUserVotingPower(msg.sender);
    }
    
    /**
     * @dev Sync multiple users' voting power from ve8020 to the lottery
     * @param _users Array of user addresses to sync
     */
    function syncMultipleUsers(address[] calldata _users) external {
        for (uint256 i = 0; i < _users.length; i++) {
            syncUserVotingPower(_users[i]);
        }
    }
    
    /**
     * @dev Admin function to update the lottery address
     * @param _lottery New lottery address
     */
    function setLotteryAddress(address _lottery) external onlyOwner {
        require(_lottery != address(0), "Lottery address cannot be zero");
        lottery = RedDragonSwapLottery(_lottery);
        
        // Update the lottery's voting token
        _setLotteryVotingToken();
        
        emit LotteryUpdated(_lottery);
    }
    
    /**
     * @dev Admin function to update the ve8020 address
     * @param _veToken New ve8020 address
     */
    function setVeTokenAddress(address _veToken) external onlyOwner {
        require(_veToken != address(0), "ve8020 address cannot be zero");
        veToken = ve8020(_veToken);
        
        emit VeTokenUpdated(_veToken);
    }
    
    /**
     * @dev External view function to get a user's voting power
     * This allows the lottery to use this contract as the voting token
     * @param _user Address to check
     * @return User's voting power
     */
    function balanceOf(address _user) external view returns (uint256) {
        return veToken.balanceOf(_user);
    }
    
    /**
     * @dev External view function to get total voting power
     * @return Total voting power
     */
    function totalSupply() external view returns (uint256) {
        return veToken.totalVotingPower();
    }
    
    /**
     * @dev Calculate a user's effective boost multiplier for the lottery
     * Utility function that combines LP balance and voting power
     * @param _user User address
     * @return Boost multiplier (100 = 1x, 250 = 2.5x)
     */
    function calculateEffectiveBoost(address _user) external view returns (uint256) {
        return lottery.calculateUserBoost(_user);
    }
} 