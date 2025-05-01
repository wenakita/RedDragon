// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

/**
 * @title Ive69LP
 * @dev Interface for Voting Escrow 69LP token
 * Defines the functions for locking and calculating voting power
 */
interface Ive69LP {
    /**
     * @dev Lock tokens for voting power
     * @param amount Amount to lock
     * @param duration Lock duration in seconds
     */
    function lock(uint256 amount, uint256 duration) external;
    
    /**
     * @dev Unlock tokens after lock period
     */
    function unlock() external;
    
    /**
     * @dev Extend lock duration
     * @param duration Additional lock duration in seconds
     */
    function extendLock(uint256 duration) external;
    
    /**
     * @dev Add more tokens to an existing lock
     * @param amount Amount to add
     */
    function increaseLock(uint256 amount) external;
    
    /**
     * @dev Get locked balance of an account
     * @param account Address to check
     * @return amount Locked token amount
     */
    function lockedBalanceOf(address account) external view returns (uint256);
    
    /**
     * @dev Get unlock time of an account's lock
     * @param account Address to check
     * @return unlockTime Unlock timestamp
     */
    function unlockTimeOf(address account) external view returns (uint256);
    
    /**
     * @dev Calculate voting power of an account
     * @param account Address to get voting power for
     * @return voting power value
     */
    function votingPowerOf(address account) external view returns (uint256);
    
    /**
     * @dev Get total voting power
     * @return total voting power
     */
    function getTotalVotingPower() external view returns (uint256);
    
    /**
     * @dev Get total locked supply
     * @return total locked supply
     */
    function totalLockedSupply() external view returns (uint256);
    
    /**
     * @dev Get voting power of a user
     * Alias for votingPowerOf for backward compatibility
     * @param account Address to get voting power for
     * @return voting power value
     */
    function getVotingPower(address account) external view returns (uint256);
}
