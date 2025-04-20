// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface Ive69LP {
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function totalVotingPower() external view returns (uint256);
}
