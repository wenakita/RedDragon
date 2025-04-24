// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockXShadow is ERC20 {
    address public shadowToken;
    uint256 private mockRatio = 1e18; // 1:1 ratio by default
    
    constructor(string memory name, string memory symbol, address _shadowToken) ERC20(name, symbol) {
        shadowToken = _shadowToken;
    }
    
    // Mint function for testing
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    // Mock functions needed by the XShadow interface
    function SHADOW() external view returns (address) {
        return shadowToken;
    }
    
    function ratio() external view returns (uint256) {
        return mockRatio;
    }
    
    function convertEmissionsToken(uint256 amount) external {
        // Do nothing, just a stub
    }
    
    // Testing helper
    function setRatio(uint256 _ratio) external {
        mockRatio = _ratio;
    }
} 