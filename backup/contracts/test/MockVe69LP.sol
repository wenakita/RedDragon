// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../interfaces/Ive69LP.sol";

contract MockVe69LP is ERC20, Ive69LP {
    constructor() ERC20("Mock ve69LP", "ve69LP") {
        _mint(msg.sender, 1000000 * 10**18);
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    // Override functions to resolve ambiguity
    function balanceOf(address account) public view override(ERC20, Ive69LP) returns (uint256) {
        return ERC20.balanceOf(account);
    }
    
    function totalSupply() public view override(ERC20, Ive69LP) returns (uint256) {
        return ERC20.totalSupply();
    }
    
    function totalVotingPower() public view override returns (uint256) {
        return totalSupply();
    }
}
