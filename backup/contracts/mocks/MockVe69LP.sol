// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../interfaces/Ive69LP.sol";

contract MockVe69LP is ERC20, Ive69LP {
    uint256 private _totalVotingPower;

    constructor() ERC20("Mock ve69LP", "ve69LP") {
        _totalVotingPower = 1000000 * 10**18; // Initial total voting power
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function totalVotingPower() external view override returns (uint256) {
        return _totalVotingPower;
    }

    function setTotalVotingPower(uint256 newTotalVotingPower) external {
        _totalVotingPower = newTotalVotingPower;
    }
    
    function balanceOf(address account) public view override(ERC20, Ive69LP) returns (uint256) {
        return super.balanceOf(account);
    }
    
    function totalSupply() public view override(ERC20, Ive69LP) returns (uint256) {
        return super.totalSupply();
    }
} 