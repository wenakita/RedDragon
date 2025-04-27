// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IWrappedSonic
 * @dev Interface for the Wrapped Sonic (wS) token
 */
interface IWrappedSonic is IERC20 {
    /**
     * @dev Deposit Sonic to receive wS
     */
    function deposit() external payable;
    
    /**
     * @dev Withdraw Sonic by burning wS
     * @param _amount The amount of wS to burn
     */
    function withdraw(uint256 _amount) external;
    
    /**
     * @dev Get the current exchange rate between Sonic and wS
     * @return The exchange rate (should be 1:1 for wrapped tokens)
     */
    function exchangeRate() external view returns (uint256);
} 