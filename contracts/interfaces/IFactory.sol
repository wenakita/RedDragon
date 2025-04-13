// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IFactory
 * @dev Interface for Shadow DEX Factory
 */
interface IFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
    function createPair(address tokenA, address tokenB) external returns (address pair);
    function allPairs(uint) external view returns (address pair);
    function allPairsLength() external view returns (uint);
    function feeTo() external view returns (address);
    function feeToSetter() external view returns (address);
    function INIT_CODE_PAIR_HASH() external view returns (bytes32);
} 