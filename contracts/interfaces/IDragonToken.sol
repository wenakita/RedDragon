// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title IDragonToken
 * @dev Interface for the Dragon token with swap-related functionality
 */
interface IDragonToken {
    /**
     * @dev Event emitted when a user swaps wS for DRAGON
     * @param user The user who performed the swap
     * @param wrappedSonicAmount The amount of wS swapped
     * @param dragonAmount The amount of DRAGON received
     */
    event SwapWSToDragon(
        address indexed user, 
        uint256 wrappedSonicAmount, 
        uint256 dragonAmount
    );
    
    /**
     * @dev Get the address of the swap trigger contract
     * @return The address of the swap trigger contract
     */
    function swapTriggerAddress() external view returns (address);
    
    /**
     * @dev Set the address of the swap trigger contract
     * @param _swapTriggerAddress The new address
     */
    function setSwapTriggerAddress(address _swapTriggerAddress) external;
    
    /**
     * @dev Swap wS for DRAGON
     * @param _wrappedSonicAmount The amount of wS to swap
     * @return The amount of DRAGON received
     */
    function swapWSToDragon(uint256 _wrappedSonicAmount) external returns (uint256);
    
    /**
     * @dev Get the exchange rate of DRAGON to wS
     * @return The exchange rate (amount of DRAGON per wS)
     */
    function getDragonExchangeRate() external view returns (uint256);
} 