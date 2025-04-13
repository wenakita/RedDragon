// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/IRedDragonPaintSwapVerifier.sol";

/**
 * @title MockRedDragonSwapLottery
 * @dev Mock implementation of RedDragonSwapLottery for testing
 */
contract MockRedDragonSwapLottery is Ownable, ReentrancyGuard {
    IERC20 public rewardToken;
    address public verifier;
    address public votingToken;
    uint256 public jackpot;
    
    // Mapping for user voting power
    mapping(address => uint256) private userVotingPower;
    
    // Mock boost value for testing
    uint256 public mockBoost = 100; // Default 1x
    
    /**
     * @dev Constructor
     * @param _rewardToken The reward token address
     * @param _verifier The verifier address
     */
    constructor(address _rewardToken, address _verifier) {
        rewardToken = IERC20(_rewardToken);
        verifier = _verifier;
        jackpot = 0;
    }
    
    /**
     * @dev Set voting token address
     * @param _votingToken The address of the voting token
     */
    function setVotingToken(address _votingToken) external {
        votingToken = _votingToken;
    }
    
    /**
     * @dev Update user's voting power
     * @param _user User address
     * @param _votingPower New voting power
     */
    function updateUserVotingPower(address _user, uint256 _votingPower) external {
        userVotingPower[_user] = _votingPower;
    }
    
    /**
     * @dev Get user's voting power
     * @param _user User address
     * @return User's voting power
     */
    function getUserVotingPower(address _user) external view returns (uint256) {
        return userVotingPower[_user];
    }
    
    /**
     * @dev Add funds to jackpot
     * @param _amount Amount to add
     */
    function addToJackpot(uint256 _amount) external {
        jackpot += _amount;
    }
    
    /**
     * @dev Get current jackpot amount
     * @return Current jackpot
     */
    function getJackpot() external view returns (uint256) {
        return jackpot;
    }
    
    /**
     * @dev Mock function to calculate user boost
     * @param _user User address
     * @return Boost multiplier (100 = 1x, 250 = 2.5x)
     */
    function calculateUserBoost(address _user) external view returns (uint256) {
        return mockBoost;
    }
    
    /**
     * @dev Mock function to set boost value for testing
     * @param _boost Boost value to set
     */
    function setMockBoost(uint256 _boost) external {
        mockBoost = _boost;
    }
    
    /**
     * @dev Mock function to set exchange pair
     * @param _exchangePair Exchange pair address
     */
    function setExchangePair(address _exchangePair) external onlyOwner {
        // Mock implementation
    }
} 