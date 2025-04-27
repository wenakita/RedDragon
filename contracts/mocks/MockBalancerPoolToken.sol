// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockBalancerPoolToken
 * @dev Mock implementation of a Balancer pool token for testing
 */
contract MockBalancerPoolToken is ERC20, Ownable {
    // Balancer pool token implementation
    address public immutable balancerVault;
    uint256 public poolId;
    
    /**
     * @dev Constructor
     * @param name_ Token name
     * @param symbol_ Token symbol
     * @param _balancerVault Address of the Balancer vault
     */
    constructor(
        string memory name_,
        string memory symbol_,
        address _balancerVault
    ) ERC20(name_, symbol_) Ownable() {
        balancerVault = _balancerVault;
    }
    
    /**
     * @dev Set the pool ID for this token
     * @param _poolId The pool ID
     */
    function setPoolId(uint256 _poolId) external onlyOwner {
        poolId = _poolId;
    }
    
    /**
     * @dev Mock function to mint tokens
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Mock function to burn tokens
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
} 