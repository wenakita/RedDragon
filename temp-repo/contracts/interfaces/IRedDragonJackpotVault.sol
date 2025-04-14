// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRedDragonJackpotVault
 * @dev Interface for RedDragonJackpotVault contract
 */
interface IRedDragonJackpotVault {
    /**
     * @dev Sets the address of the RedDragon token
     * @param _redDragonToken Address of the RedDragon token
     */
    function setTokenAddress(address _redDragonToken) external;
    
    /**
     * @dev Sets the address to forward fees to (usually the lottery contract)
     * @param _forwardAddress Address to forward fees to
     */
    function setForwardAddress(address _forwardAddress) external;
    
    /**
     * @dev Receive wS tokens and forward them to the lottery contract
     * Can be called by anyone, but typically triggered by the RedDragon token
     */
    function receiveAndForward() external;
    
    /**
     * @dev Manually trigger forwarding of tokens
     * Only callable by owner, provides a backup method
     */
    function triggerForward() external;
    
    /**
     * @dev Emergency withdrawal in case of issues
     * Only callable by owner
     */
    function emergencyWithdraw(address to, uint256 amount) external;
} 