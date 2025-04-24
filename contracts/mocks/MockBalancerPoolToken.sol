// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockBalancerPoolToken
 * @dev Mock implementation of Balancer Pool Token (BPT) representing LP shares
 * Used for testing Balancer pool interactions with Dragon/WSONIC
 */
contract MockBalancerPoolToken is ERC20, Ownable {
    // Pool ID (used to identify the pool in Balancer Vault)
    bytes32 public poolId;
    
    // Vault address
    address public vault;
    
    constructor(
        string memory name,
        string memory symbol,
        bytes32 _poolId,
        address _vault
    ) ERC20(name, symbol) {
        poolId = _poolId;
        vault = _vault;
    }
    
    /**
     * @dev Mint BPT tokens to a recipient
     * Only callable by the Vault (or owner for testing)
     * @param recipient Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address recipient, uint256 amount) external {
        require(msg.sender == vault || msg.sender == owner(), "Only vault or owner can mint");
        _mint(recipient, amount);
    }
    
    /**
     * @dev Burn BPT tokens from an account
     * Only callable by the Vault (or owner for testing)
     * @param account Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burn(address account, uint256 amount) external {
        require(msg.sender == vault || msg.sender == owner(), "Only vault or owner can burn");
        _burn(account, amount);
    }
    
    /**
     * @dev Set the poolId (for testing)
     * @param _poolId New pool ID
     */
    function setPoolId(bytes32 _poolId) external onlyOwner {
        poolId = _poolId;
    }
    
    /**
     * @dev Set the vault address (for testing)
     * @param _vault New vault address
     */
    function setVault(address _vault) external onlyOwner {
        vault = _vault;
    }
    
    /**
     * @dev Get the pool ID for this BPT token
     * @return Pool ID as bytes32
     */
    function getPoolId() external view returns (bytes32) {
        return poolId;
    }
} 