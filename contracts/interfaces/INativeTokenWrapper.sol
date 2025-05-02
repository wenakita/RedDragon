// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title INativeTokenWrapper
 * @dev Interface for wrapped native token (WETH, WAVAX, wS, etc.)
 */
interface INativeTokenWrapper is IERC20 {
    function deposit() external payable;
    function withdraw(uint256) external;
} 