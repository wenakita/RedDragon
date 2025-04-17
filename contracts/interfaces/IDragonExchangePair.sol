// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/**
 * @title IDragonExchangePair
 * @dev Interface for Dragon exchange pair that handles swaps with fee distribution
 */
interface IDragonExchangePair {
    /**
     * @dev Swap $wS tokens for $DRAGON tokens
     * Implements the complete fee structure:
     * - 9.31% of input $wS taken as fees (6.9% to jackpot, 2.41% to ve8020)
     * - 0.69% of resulting $DRAGON burned
     * @param user Address of the user performing the swap
     * @param wsAmount Amount of $wS tokens being swapped
     * @return dragonAmount Amount of $DRAGON tokens returned to user
     */
    function swapWSForDragon(address user, uint256 wsAmount) external returns (uint256 dragonAmount);
    
    /**
     * @dev Swap $DRAGON tokens for $wS tokens
     * Implements the complete fee structure:
     * - 0.69% of input $DRAGON burned
     * - 9.31% of resulting $wS taken as fees (6.9% to jackpot, 2.41% to ve8020)
     * @param user Address of the user performing the swap
     * @param dragonAmount Amount of $DRAGON tokens being swapped
     * @return wsAmount Amount of $wS tokens returned to user
     */
    function swapDragonForWS(address user, uint256 dragonAmount) external returns (uint256 wsAmount);
    
    /**
     * @dev Add liquidity to the pair
     * @param wsAmount Amount of $wS tokens to add
     * @param dragonAmount Amount of $DRAGON tokens to add
     * @param user Address receiving the LP tokens
     * @return liquidity Amount of LP tokens minted
     */
    function addLiquidity(uint256 wsAmount, uint256 dragonAmount, address user) external returns (uint256 liquidity);
    
    /**
     * @dev Remove liquidity from the pair
     * @param liquidity Amount of LP tokens to burn
     * @param user Address receiving the tokens
     * @return wsAmount Amount of $wS tokens returned
     * @return dragonAmount Amount of $DRAGON tokens returned
     */
    function removeLiquidity(uint256 liquidity, address user) external returns (uint256 wsAmount, uint256 dragonAmount);
    
    /**
     * @dev Get the current reserves of the pair
     * @return wsReserve Current $wS token reserve
     * @return dragonReserve Current $DRAGON token reserve
     */
    function getReserves() external view returns (uint256 wsReserve, uint256 dragonReserve);
    
    /**
     * @dev Get the token addresses
     * @return wsToken Address of the $wS token
     * @return dragonToken Address of the $DRAGON token
     */
    function getTokens() external view returns (address wsToken, address dragonToken);
} 