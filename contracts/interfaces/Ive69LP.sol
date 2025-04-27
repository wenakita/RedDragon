// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

/**
 * @title Ive69LP
 * @dev Interface for the Voting Escrow 69 LP token (ve69LP)
 */
interface Ive69LP {
    /**
     * @notice Get the voting power of an account
     * @param _account The account address
     * @return The voting power
     */
    function getVotingPower(address _account) external view returns (uint256);
    
    /**
     * @notice Get the total voting power
     * @return The total voting power
     */
    function getTotalVotingPower() external view returns (uint256);
    
    /**
     * @notice Get the locked balance of an account
     * @param _account The account address
     * @return The locked balance
     */
    function getLockedBalance(address _account) external view returns (uint256);
    
    /**
     * @notice Get the unlock time of an account's lock
     * @param _account The account address
     * @return The unlock timestamp
     */
    function getUnlockTime(address _account) external view returns (uint256);
}
