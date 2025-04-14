// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IRedDragonLPBooster.sol";

contract MockRedDragonLPBooster is IRedDragonLPBooster {
    IERC20 private _lpToken;
    uint256 public constant PRECISION = 100;
    uint256 public constant BASE_BOOST = 100; // 1x
    uint256 public constant MAX_BOOST = 250; // 2.5x
    uint256 public constant MIN_LP_AMOUNT = 1e18; // 1 LP token

    constructor(address lpTokenAddress) {
        require(lpTokenAddress != address(0), "LP token cannot be zero address");
        _lpToken = IERC20(lpTokenAddress);
    }

    function lpToken() external view override returns (address) {
        return address(_lpToken);
    }

    function minLpAmount() external pure override returns (uint256) {
        return MIN_LP_AMOUNT;
    }

    function calculateBoost(address user) external view override returns (uint256) {
        uint256 lpBalance = _lpToken.balanceOf(user);
        if (lpBalance == 0) return BASE_BOOST;

        // Simple boost calculation for testing:
        // 1x base boost + up to 1.5x additional boost based on LP balance
        uint256 additionalBoost = (lpBalance * 150) / _lpToken.totalSupply();
        uint256 totalBoost = BASE_BOOST + additionalBoost;

        // Cap at MAX_BOOST
        return totalBoost > MAX_BOOST ? MAX_BOOST : totalBoost;
    }

    function useTiers() external pure override returns (bool) {
        return false; // Mock implementation doesn't use tiers
    }
} 