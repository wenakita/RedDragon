// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/**
 * @title IDragonExchangePair
 * @dev Interface for Dragon exchange pair that handles swaps with fee distribution
 */
interface IDragonExchangePair {
    /**
     * @dev Swap wrapped Sonic tokens for $DRAGON tokens
     * Applies the fee structure:
     * - 9.31% of input wrapped Sonic taken as fees (6.9% to jackpot, 2.41% to ve8020)
     * - 0.69% of output $DRAGON tokens burned
     * @param user Address of the user swapping
     * @param wrappedSonicAmount Amount of wrapped Sonic tokens being swapped
     * @return dragonAmount Amount of $DRAGON tokens returned to user
     */
    function swapWrappedSonicForDragon(address user, uint256 wrappedSonicAmount) external returns (uint256 dragonAmount);
    
    /**
     * @dev Swap $DRAGON tokens for wrapped Sonic tokens
     * Applies the fee structure:
     * - 0.69% of input $DRAGON tokens burned
     * - 9.31% of resulting wrapped Sonic taken as fees (6.9% to jackpot, 2.41% to ve8020)
     * @param user Address of the user swapping
     * @param dragonAmount Amount of $DRAGON tokens being swapped
     * @return wrappedSonicAmount Amount of wrapped Sonic tokens returned to user
     */
    function swapDragonForWrappedSonic(address user, uint256 dragonAmount) external returns (uint256 wrappedSonicAmount);
    
    /**
     * @dev Add liquidity to the exchange pair
     * @param wrappedSonicAmount Amount of wrapped Sonic tokens to add
     * @param dragonAmount Amount of $DRAGON tokens to add
     * @return lpAmount Amount of LP tokens minted to user
     */
    function addLiquidity(uint256 wrappedSonicAmount, uint256 dragonAmount) external returns (uint256 lpAmount);
    
    /**
     * @dev Remove liquidity from the exchange pair
     * @param lpAmount Amount of LP tokens to burn
     * @return dragonAmount Amount of $DRAGON tokens returned
     * @return wrappedSonicAmount Amount of wrapped Sonic tokens returned
     */
    function removeLiquidity(uint256 lpAmount) external returns (uint256 dragonAmount, uint256 wrappedSonicAmount);
    
    /**
     * @dev Get current reserves of the trading pair
     * @return dragonReserve Current $DRAGON token reserve
     * @return wrappedSonicReserve Current wrapped Sonic token reserve
     */
    function getReserves() external view returns (uint256 dragonReserve, uint256 wrappedSonicReserve);
    
    /**
     * @dev Get addresses of the tokens in the pair
     * @return dragonToken Address of the $DRAGON token
     * @return wrappedSonicToken Address of the wrapped Sonic token
     */
    function getTokens() external view returns (address dragonToken, address wrappedSonicToken);
} 