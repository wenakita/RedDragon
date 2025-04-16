// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/**
 * @dev Interface for DragonLotterySwap contract
 */
interface IDragonLotterySwap {
    /**
     * @dev Processes a buy and checks for lottery win
     * @param user Address of the user
     * @param wsAmount Amount of wS tokens involved
     */
    function processBuy(address user, uint256 wsAmount) external;
    
    /**
     * @dev Processes a sell transaction (potentially affecting global pity boost)
     * @param user Address of the user
     * @param wsAmount Amount of wS tokens involved
     */
    function processSell(address user, uint256 wsAmount) external;
    
    /**
     * @dev Increases the jackpot by depositing wS tokens
     * @param amount Amount of wS tokens to add to the jackpot
     */
    function addToJackpot(uint256 amount) external;
    
    /**
     * @dev Sets token's voting power in the lottery for boost calculation
     * @param user User address
     * @param votingPower Amount of voting power
     */
    function setUserVotingPower(address user, uint256 votingPower) external;
    
    /**
     * @dev Gets the current jackpot size
     * @return Current jackpot size in wS
     */
    function jackpot() external view returns (uint256);
    
    /**
     * @dev Gets the current total accumulated boost
     * @return Current accumulated boost percentage
     */
    function accumulatedWSBoost() external view returns (uint256);

    /**
     * @dev Process random words from VRF
     * @param requestId The request ID
     * @param randomWords The random values
     */
    function processRandomWords(uint256 requestId, uint256[] memory randomWords) external;
    
    /**
     * @dev Calculate win chance based on amount and user's voting power
     * @param user User address
     * @param wsAmount wSonic amount
     * @return winChance Win chance in basis points (e.g., 100 = 1%)
     */
    function calculateWinChance(address user, uint256 wsAmount) external view returns (uint256);
    
    function getCurrentJackpot() external view returns (uint256);
    function getStats() external view returns (uint256 winners, uint256 payouts, uint256 current);
    function getSwapLimits() external view returns (uint256 min, uint256 max, bool isUsdMode);
    function getJackpotTokenSymbol() external view returns (string memory);
    function isLotteryEnabled() external view returns (bool);

    function secureProcessBuy(address user, uint256 amount) external;
    function updateProbability(uint256 newProbability) external;
    function setExchangePair(address _exchangePair) external;
    function getLastWinner() external view returns (address);
    function getLastWinAmount() external view returns (uint256);
    function isVrfEnabled() external view returns (bool);
    function getVrfConfiguration() external view returns (
        address vrfCoordinator,
        bytes32 keyHash,
        uint64 subscriptionId
    );
    
    // Governance functions for USD mode
    function proposePriceOracle(address _priceOracle) external;
    function executePriceOracle(address _priceOracle) external;
    function proposeUseUsdEntryAmounts(bool _useUsdEntryAmounts) external;
    function executeUseUsdEntryAmounts(bool _useUsdEntryAmounts) external;
    
    // Flash loan protection
    function recordLpAcquisition(address user, uint256 amount) external;
    
    // Security checks
    function isSecureContext(address user) external view returns (bool);

    function toggleUsdMode() external;
    function setRouterUsdPriceMode(bool enable) external;
    function setJackpotWithdraw(bool enable) external;
    function setPriceUpdateGovernance(address governance) external;
    function distributeJackpot(address winner, uint256 amount) external;
    
    // Security/checks
    function isFlashLoanAttack(address from, address to) external returns (bool);
} 