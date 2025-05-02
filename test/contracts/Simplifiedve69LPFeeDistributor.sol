// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Simplifiedve69LPFeeDistributor
 * @dev Simplified ve69LP fee distributor for Dragon ecosystem
 */
contract Simplifiedve69LPFeeDistributor is Ownable {
    using SafeERC20 for IERC20;

    address public ve69LPToken;
    address public wrappedSonic;
    uint256 public totalDistributed;
    uint256 public epoch;
    
    mapping(uint256 => uint256) public epochRewards;
    mapping(address => uint256) public lastClaimedEpoch;

    event RewardsDistributed(uint256 amount, uint256 epoch);
    event RewardsClaimed(address indexed user, uint256 amount, uint256 fromEpoch, uint256 toEpoch);

    /**
     * @dev Constructor to initialize the distributor
     * @param _ve69LPToken The ve69LP token address
     * @param _wrappedSonic The Wrapped Sonic token address
     */
    constructor(address _ve69LPToken, address _wrappedSonic) {
        require(_ve69LPToken != address(0), "Invalid ve69LP address");
        require(_wrappedSonic != address(0), "Invalid wS address");
        ve69LPToken = _ve69LPToken;
        wrappedSonic = _wrappedSonic;
        epoch = 1;
    }

    /**
     * @dev Distributes rewards to the contract for the current epoch
     * @param _amount The amount to distribute
     */
    function receiveRewards(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        
        IERC20(wrappedSonic).safeTransferFrom(msg.sender, address(this), _amount);
        epochRewards[epoch] += _amount;
        totalDistributed += _amount;
        
        emit RewardsDistributed(_amount, epoch);
    }

    /**
     * @dev Advances to the next epoch
     */
    function advanceEpoch() external onlyOwner {
        epoch += 1;
    }

    /**
     * @dev Claims rewards for a user
     * @param _user The user's address
     */
    function claimRewards(address _user) external {
        uint256 userLastEpoch = lastClaimedEpoch[_user];
        if (userLastEpoch == 0) {
            userLastEpoch = 1;
        }
        
        require(userLastEpoch < epoch, "No new rewards to claim");
        
        uint256 totalReward = 0;
        for (uint256 i = userLastEpoch; i < epoch; i++) {
            totalReward += calculateUserReward(_user, i);
        }
        
        require(totalReward > 0, "No rewards to claim");
        
        lastClaimedEpoch[_user] = epoch;
        IERC20(wrappedSonic).safeTransfer(_user, totalReward);
        
        emit RewardsClaimed(_user, totalReward, userLastEpoch, epoch - 1);
    }

    /**
     * @dev Calculates a user's reward for a specific epoch
     * @param _user The user's address
     * @param _epoch The epoch number
     * @return The reward amount
     */
    function calculateUserReward(address _user, uint256 _epoch) public view returns (uint256) {
        // Simplified calculation - in a real implementation, this would
        // check ve69LP balances and calculate proportional rewards
        if (epochRewards[_epoch] == 0) {
            return 0;
        }
        
        // Dummy implementation - assumes user gets 10% of epoch rewards
        return epochRewards[_epoch] / 10;
    }
} 