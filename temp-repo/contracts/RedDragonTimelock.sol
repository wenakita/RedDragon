// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title RedDragonTimelock
 * @dev A timelock contract for admin functions to enhance security
 */
contract RedDragonTimelock is Ownable {
    // Delay required before execution
    uint256 public constant TIMELOCK_DELAY = 24 hours;
    
    // Mapping of action hash => scheduled time
    mapping(bytes32 => uint256) public scheduledActions;
    mapping(bytes32 => string) public actionDescriptions;
    
    // Events
    event ActionScheduled(bytes32 indexed actionId, string description, address target, bytes data, uint256 executionTime);
    event ActionCancelled(bytes32 indexed actionId, string description);
    event ActionExecuted(bytes32 indexed actionId, string description, address target, bytes data);
    
    /**
     * @dev Schedule an action to be executed after the timelock period
     * @param description A human-readable description of the action
     * @param target The address of the contract to call
     * @param data The calldata to send to the target
     * @return actionId The unique identifier for the scheduled action
     */
    function scheduleAction(
        string memory description,
        address target,
        bytes memory data
    ) external onlyOwner returns (bytes32) {
        require(target != address(0), "Target cannot be zero address");
        
        bytes32 actionId = keccak256(abi.encodePacked(target, data));
        require(scheduledActions[actionId] == 0, "Action already scheduled");
        
        scheduledActions[actionId] = block.timestamp + TIMELOCK_DELAY;
        actionDescriptions[actionId] = description;
        
        emit ActionScheduled(actionId, description, target, data, scheduledActions[actionId]);
        return actionId;
    }
    
    /**
     * @dev Cancel a scheduled action
     * @param actionId The unique identifier for the action to cancel
     */
    function cancelAction(bytes32 actionId) external onlyOwner {
        require(scheduledActions[actionId] > 0, "Action not scheduled");
        
        string memory description = actionDescriptions[actionId];
        delete scheduledActions[actionId];
        delete actionDescriptions[actionId];
        
        emit ActionCancelled(actionId, description);
    }
    
    /**
     * @dev Check if an action is ready to be executed
     * @param actionId The action to check
     * @return bool True if the action is ready for execution
     */
    function isActionReady(bytes32 actionId) public view returns (bool) {
        uint256 executionTime = scheduledActions[actionId];
        return executionTime > 0 && block.timestamp >= executionTime;
    }
    
    /**
     * @dev Execute a scheduled action
     * @param target The address of the contract to call
     * @param data The calldata to send to the target
     */
    function executeAction(address target, bytes memory data) external onlyOwner {
        bytes32 actionId = keccak256(abi.encodePacked(target, data));
        require(isActionReady(actionId), "Action not ready for execution");
        
        string memory description = actionDescriptions[actionId];
        delete scheduledActions[actionId];
        delete actionDescriptions[actionId];
        
        (bool success, ) = target.call(data);
        require(success, "Action execution failed");
        
        emit ActionExecuted(actionId, description, target, data);
    }
    
    /**
     * @dev Get action ID from target and calldata
     * @param target The target contract
     * @param data The calldata
     * @return The action ID
     */
    function getActionId(address target, bytes memory data) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(target, data));
    }
    
    /**
     * @dev Get scheduled execution time for an action
     * @param actionId The action ID to query
     * @return The scheduled execution time (0 if not scheduled)
     */
    function getScheduledTime(bytes32 actionId) external view returns (uint256) {
        return scheduledActions[actionId];
    }
    
    /**
     * @dev Get number of seconds remaining before an action can be executed
     * @param actionId The action ID to query
     * @return The number of seconds remaining (0 if ready or not scheduled)
     */
    function getTimeRemaining(bytes32 actionId) external view returns (uint256) {
        uint256 scheduledTime = scheduledActions[actionId];
        if (scheduledTime == 0 || block.timestamp >= scheduledTime) {
            return 0;
        }
        return scheduledTime - block.timestamp;
    }
    
    /**
     * @dev Emergency function to recover tokens accidentally sent to this contract
     * @param token The token to recover
     * @param amount The amount to recover
     */
    function recoverToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
} 