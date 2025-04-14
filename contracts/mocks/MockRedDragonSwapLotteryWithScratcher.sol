// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IRedDragonSwapLotteryWithScratcher.sol";

/**
 * @title MockRedDragonSwapLotteryWithScratcher
 * @dev Mock contract for testing integration with GoldScratcher
 */
contract MockRedDragonSwapLotteryWithScratcher is IRedDragonSwapLotteryWithScratcher {
    // Mapping to track winning scratchers
    mapping(address => mapping(uint256 => bool)) public winningScratchers;
    
    // For testing purposes - override winner determination
    bool public forceWinner = false;
    
    // Mock state variables
    uint256 private _jackpot = 1000 ether;
    uint256 private _boostPercentage = 0;
    address private _exchangePair;
    
    /**
     * @dev Set whether all scratchers should be winners for testing
     */
    function setIsWinnerForAllScratchers(bool _isWinner) external {
        forceWinner = _isWinner;
    }
    
    /**
     * @dev Register a winning scratcher
     * @param user User address
     * @param tokenId Token ID to register
     */
    function registerWinningScratcher(address user, uint256 tokenId) external override {
        winningScratchers[user][tokenId] = true;
    }
    
    /**
     * @dev Calculate jackpot percentage for a user
     * @param _user User address
     * @return Fixed percentage for testing (6900 basis points = 69%)
     */
    function calculateJackpotPercentage(address _user) external override view returns (uint256) {
        return 6900; // 69% in basis points
    }
    
    /**
     * @dev Check if a user has a winning scratcher
     * @param user User address
     * @param tokenId Token ID to check
     * @return True if registered as a winner or forceWinner is true
     */
    function hasWinningScratcher(address user, uint256 tokenId) external view returns (bool) {
        return winningScratchers[user][tokenId] || forceWinner;
    }
    
    // IRedDragonSwapLottery implementation for testing
    
    function processBuy(address user, uint256 wsAmount) external override {}
    
    function processSell(address user, uint256 wsAmount) external override {}
    
    function addToJackpot(uint256 amount) external override {
        _jackpot += amount;
    }
    
    function setUserVotingPower(address user, uint256 votingPower) external override {}
    
    function jackpot() external override view returns (uint256) {
        return _jackpot;
    }
    
    function accumulatedWSBoost() external override view returns (uint256) {
        return _boostPercentage;
    }
    
    function processRandomWords(uint256 requestId, uint256[] memory randomWords) external override {}
    
    function getCurrentJackpot() external override view returns (uint256) {
        return _jackpot;
    }
    
    function getStats() external override view returns (uint256 winners, uint256 payouts, uint256 current) {
        return (10, 5000 ether, _jackpot);
    }
    
    function getSwapLimits() external override view returns (uint256 min, uint256 max, bool isUsdMode) {
        return (1 ether, 10000 ether, false);
    }
    
    function getJackpotTokenSymbol() external override view returns (string memory) {
        return "wS";
    }
    
    function isLotteryEnabled() external override view returns (bool) {
        return true;
    }
    
    function secureProcessBuy(address user, uint256 amount) external override {}
    
    function updateProbability(uint256 newProbability) external override {}
    
    function setExchangePair(address _newExchangePair) external override {
        _exchangePair = _newExchangePair;
    }
    
    function getLastWinner() external override view returns (address) {
        return address(0);
    }
    
    function getLastWinAmount() external override view returns (uint256) {
        return 0;
    }
    
    function isVrfEnabled() external override view returns (bool) {
        return true;
    }
    
    function getVrfConfiguration() external override view returns (
        address vrfCoordinator,
        bytes32 keyHash,
        uint64 subscriptionId
    ) {
        return (address(0), bytes32(0), 0);
    }
    
    function proposePriceOracle(address _priceOracle) external override {}
    
    function executePriceOracle(address _priceOracle) external override {}
    
    function proposeUseUsdEntryAmounts(bool _useUsdEntryAmounts) external override {}
    
    function executeUseUsdEntryAmounts(bool _useUsdEntryAmounts) external override {}
    
    function recordLpAcquisition(address user, uint256 amount) external override {}
    
    function isSecureContext(address user) external override view returns (bool) {
        return true;
    }
    
    function toggleUsdMode() external override {}
    
    function setRouterUsdPriceMode(bool enable) external override {}
    
    function setJackpotWithdraw(bool enable) external override {}
    
    function setPriceUpdateGovernance(address governance) external override {}
    
    function distributeJackpot(address winner, uint256 amount) external override {}
    
    function isFlashLoanAttack(address from, address to) external override returns (bool) {
        return false;
    }
    
    /**
     * @dev Request randomness from VRF
     * @return requestId The request ID (mock implementation returns a fixed value)
     */
    function requestRandomness() external returns (bytes32) {
        return bytes32(uint256(1)); // Return a mock request ID
    }
    
    /**
     * @dev Calculate the effective probability with current boosts
     * @param user User to calculate for
     * @param wsAmount Amount of wS tokens
     * @return Probability in basis points (mock implementation returns a fixed value)
     */
    function calculateEffectiveProbability(address user, uint256 wsAmount) external view returns (uint256) {
        return 100; // Mock 1% probability
    }
} 