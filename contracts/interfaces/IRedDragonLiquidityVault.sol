// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRedDragonLiquidityVault
 * @dev Interface for the RedDragonLiquidityVault contract
 */
interface IRedDragonLiquidityVault {
    // Events
    event LiquidityAdded(uint256 tokenAmount, uint256 ethAmount, uint256 liquidity);
    event EmergencyWithdraw(address token, uint256 amount);
    event UpdatedTokenAddresses(address redDragon, address router, address lpToken, address weth);
    event UpdatedLiquidityConfig(uint256 minTokenAmount, uint256 minETHAmount);
    
    // Functions
    function setTokenAddresses(address _redDragon, address _router, address _lpToken, address _weth) external;
    function setLiquidityConfig(uint256 _minTokenAmount, uint256 _minETHAmount) external;
    function addLiquidity() external;
    function emergencyWithdraw(address token, uint256 amount) external;
    
    // View functions
    function redDragonToken() external view returns (address);
    function router() external view returns (address);
    function lpToken() external view returns (address);
    function weth() external view returns (address);
    function minTokenAmount() external view returns (uint256);
    function minETHAmount() external view returns (uint256);
    function totalLiquidityAdded() external view returns (uint256);
    function totalLPTokens() external view returns (uint256);
    
    // Receive function
    receive() external payable;
} 