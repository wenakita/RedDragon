// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DragonTest
 * @dev A simple test token for testing TypeScript deployment
 */
contract DragonTest is ERC20, Ownable {
    address public wrappedSonicAddress;
    
    /**
     * @dev Constructor to initialize the token
     * @param initialSupply Initial supply of tokens
     * @param _wrappedSonicAddress Address of the Wrapped Sonic token
     */
    constructor(
        uint256 initialSupply,
        address _wrappedSonicAddress
    ) ERC20("Dragon Test", "DRAGONTEST") Ownable() {
        require(_wrappedSonicAddress != address(0), "wS address cannot be zero");
        wrappedSonicAddress = _wrappedSonicAddress;
        _mint(msg.sender, initialSupply);
    }
    
    /**
     * @dev Sets the wrapped Sonic address
     * @param _wrappedSonicAddress New wrapped Sonic address
     */
    function setWrappedSonicAddress(address _wrappedSonicAddress) external onlyOwner {
        require(_wrappedSonicAddress != address(0), "wS address cannot be zero");
        wrappedSonicAddress = _wrappedSonicAddress;
    }
    
    /**
     * @dev Mints new tokens to a specified address
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Burns tokens from the caller's address
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
} 