// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

/**
 * @title Ive69LP
 * @dev Interface for the ve69LP (vote-escrow) token
 */
interface Ive69LP {
    /**
     * @dev Get the balance/voting power of a user
     * @param _user Address of the user
     * @return User's current voting power
     */
    function balanceOf(address _user) external view returns (uint256);
    
    /**
     * @dev Get the total voting power
     * @return Total current voting power
     */
    function totalVotingPower() external view returns (uint256);
    
    /**
     * @dev Get lock information for a user
     * @param _user Address of the user
     * @return amount Amount of locked LP tokens
     * @return unlockTime Timestamp when tokens unlock
     */
    function getLock(address _user) external view returns (uint256 amount, uint256 unlockTime);

    /**
     * @dev Create a new lock or add to an existing lock
     * @param _value Amount of 69/31 LP to lock
     * @param _unlockTime Future time when tokens unlock
     */
    function createLock(uint256 _value, uint256 _unlockTime) external;
    
    /**
     * @dev Increase lock amount without changing the unlock time
     * @param _value Additional amount of 69/31 LP to lock
     */
    function increaseLockAmount(uint256 _value) external;
    
    /**
     * @dev Extend lock time without changing the amount
     * @param _unlockTime New unlock time
     */
    function extendLockTime(uint256 _unlockTime) external;
    
    /**
     * @dev Withdraw tokens once the lock has expired
     */
    function withdraw() external;
}
