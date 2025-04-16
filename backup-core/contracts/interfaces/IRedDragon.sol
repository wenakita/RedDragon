// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRedDragon {
    function getDetailedFeeInfo() external view returns (
        uint256 liquidityFeeBuy,
        uint256 jackpotFeeBuy,
        uint256 burnFeeBuy, 
        uint256 developmentFeeBuy,
        uint256 totalFeeBuy,
        uint256 liquidityFeeSell,
        uint256 jackpotFeeSell,
        uint256 burnFeeSell,
        uint256 developmentFeeSell,
        uint256 totalFeeSell
    );
    
    function getContractConfiguration() external view returns (
        address jackpotAddress,
        address liquidityAddress,
        address burnAddress,
        address developmentAddress,
        address feeManagerAddress,
        address lotteryAddress,
        address pair,
        address routerAddress,
        bool ownershipTimelocked
    );
    
    function getFeeStats() external view returns (
        uint256 totalBurned,
        uint256 totalJackpotFees,
        uint256 totalLiquidityFees,
        uint256 totalDevelopmentFees
    );
    
    function totalSupply() external view returns (uint256);
} 