// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRedDragonSwapLottery {
    function processBuy(address user, uint256 amount) external;
    function addToJackpot(uint256 amount) external;
    function updateProbability(uint256 newProbability) external;
    function getCurrentJackpot() external view returns (uint256);
    function getStats() external view returns (uint256 winners, uint256 payouts, uint256 current);
    function getSwapLimits() external view returns (uint256 min, uint256 max);
    function setExchangePair(address _exchangePair) external;
    function getLastWinner() external view returns (address);
    function getLastWinAmount() external view returns (uint256);
    function isVrfEnabled() external view returns (bool);
    function getVrfConfiguration() external view returns (
        address vrfCoordinator,
        bytes32 keyHash,
        uint64 subscriptionId
    );
} 