// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IDragon
 * @notice Interface for the Dragon token with additional functionality
 */
interface IDragon is IERC20 {
    /**
     * @notice Hook to be called after a swap to trigger the lottery
     * @param from The address that sent the tokens
     * @param to The address that received the tokens
     * @param amount The amount of tokens transferred
     */
    function afterSwap(address from, address to, uint256 amount) external;
    
    /**
     * @notice Add the VRF connector to handle lottery requests
     * @param vrfConnector The address of the VRF connector
     */
    function setVRFConnector(address vrfConnector) external;
    
    /**
     * @notice Add to the jackpot balance
     * @param amount The amount to add to the jackpot
     */
    function addToJackpot(uint256 amount) external;
} 