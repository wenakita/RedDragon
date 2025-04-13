// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRedDragonSwapLottery {
    function processBuy(address user, uint256 amount) external;
    function secureProcessBuy(address user, uint256 amount) external;
    function addToJackpot(uint256 amount) external;
    function updateProbability(uint256 newProbability) external;
    function getCurrentJackpot() external view returns (uint256);
    function getStats() external view returns (uint256 winners, uint256 payouts, uint256 current);
    function getSwapLimits() external view returns (uint256 min, uint256 max, bool isUsdMode);
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