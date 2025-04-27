// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DragonConfig
 * @dev Configuration constants for Dragon token and ecosystem.
 * All percentages are in basis points (1/100 of a percent).
 * Example: 100 = 1%, 10000 = 100%
 */
contract DragonConfig {
    // Token Constants
    string public constant NAME = "Dragon";
    string public constant SYMBOL = "DRAGON";
    
    // Fee Structure (in basis points)
    // Buy fees: 10% total
    uint256 public constant BUY_FEE_TOTAL = 1000;             // 10%
    uint256 public constant BUY_FEE_JACKPOT = 690;            // 6.9% to jackpot
    uint256 public constant BUY_FEE_VE69LP_DISTRIBUTOR = 241; // 2.41% to ve69LPfeedistributor
    uint256 public constant BUY_FEE_OTHER = 69;               // 0.69% (reserved for future use)
    
    // Sell fees: 10% total
    uint256 public constant SELL_FEE_TOTAL = 1000;             // 10%
    uint256 public constant SELL_FEE_JACKPOT = 690;            // 6.9% to jackpot
    uint256 public constant SELL_FEE_VE69LP_DISTRIBUTOR = 241; // 2.41% to ve69LPfeedistributor
    uint256 public constant SELL_FEE_OTHER = 69;               // 0.69% (reserved for future use)
    
    // Transfer fee: 0.69% burned
    uint256 public constant TRANSFER_BURN_FEE = 69;           // 0.69% burned on all transfers
    
    // Lottery trigger only when user swaps wrapped Sonic (wS) for DRAGON
    bool public constant LOTTERY_ON_WS_SWAP_ONLY = true;
    
    // Voting Power Calculator settings
    uint256 public constant BASE_MULTIPLIER = 10000;          // 1x (no boost)
    uint256 public constant MAX_MULTIPLIER = 25000;           // 2.5x (maximum boost)
    uint256 public constant MAX_VP = 10000 * 1e18;            // Adjustable based on real-world data
    
    // Function to verify fee structure integrity
    function verifyFeeIntegrity() external pure returns (bool) {
        require(
            BUY_FEE_JACKPOT + BUY_FEE_VE69LP_DISTRIBUTOR + BUY_FEE_OTHER == BUY_FEE_TOTAL,
            "Buy fee components don't match total"
        );
        
        require(
            SELL_FEE_JACKPOT + SELL_FEE_VE69LP_DISTRIBUTOR + SELL_FEE_OTHER == SELL_FEE_TOTAL,
            "Sell fee components don't match total"
        );
        
        return true;
    }
} 