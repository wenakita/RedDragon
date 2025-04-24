// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockX33 is ERC20 {
    address private mockXShadowAsset;
    bool public isUnlockedState = true;
    uint256 private mockRatio = 1e18; // 1:1 ratio by default
    
    constructor(string memory name, string memory symbol, address _mockXShadowAsset) ERC20(name, symbol) {
        mockXShadowAsset = _mockXShadowAsset;
    }
    
    // Mint function for testing
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    // Mock functions needed by the x33 interface
    function ratio() external view returns (uint256) {
        return mockRatio;
    }
    
    function asset() external view returns (address) {
        return mockXShadowAsset;
    }
    
    function isUnlocked() external view returns (bool) {
        return isUnlockedState;
    }
    
    function isCooldownActive() external pure returns (bool) {
        return false;
    }
    
    // Testing helpers
    function setRatio(uint256 _ratio) external {
        mockRatio = _ratio;
    }
    
    function setIsUnlocked(bool _state) external {
        isUnlockedState = _state;
    }
} 