// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRedDragonLPBurner {
    function burnLP(uint256 amount) external;
    function getBurnStats() external view returns (uint256 totalBurned, uint256 currentPeriodBurned);
    function getLPToken() external view returns (address);
} 