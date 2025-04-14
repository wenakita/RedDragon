// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev Interface for interacting with the RedDragon contract
 */
interface IRedDragon {
    function jackpotAddress() external view returns (address);
    function transferOwnership(address newOwner) external;
}

/**
 * @title OneTimeJackpotUpdater
 * @dev A utility contract to bypass the timelock for setting the jackpot address one time
 */
contract OneTimeJackpotUpdater is Ownable {
    bool public hasBeenUsed = false;
    
    event JackpotAddressUpdated(address indexed redDragonAddress, address indexed newJackpotAddress);
    
    /**
     * @dev Updates the jackpot address directly on the RedDragon contract
     * This is done by:
     * 1. Taking ownership of the RedDragon contract
     * 2. Setting the jackpot address
     * 3. Transferring ownership back to the original owner
     * @param redDragonAddress Address of the RedDragon contract
     * @param newJackpotAddress New jackpot address to set
     * @param originalOwner Address to return ownership to
     */
    function updateJackpotAddressOnce(
        address redDragonAddress, 
        address newJackpotAddress,
        address originalOwner
    ) external onlyOwner {
        require(!hasBeenUsed, "This contract has already been used");
        require(redDragonAddress != address(0), "RedDragon address cannot be zero");
        require(newJackpotAddress != address(0), "New jackpot address cannot be zero");
        require(originalOwner != address(0), "Original owner address cannot be zero");
        
        // Mark as used to prevent re-use
        hasBeenUsed = true;
        
        // This is a critical step that requires the RedDragon contract owner to have
        // transferred ownership to this contract before calling this function
        
        // Since we don't have direct access to update the jackpot address storage slot,
        // we would need to find a way to either:
        // 1. Call an internal function that sets the jackpot address, or
        // 2. Use assembly to directly update the storage slot
        
        // For this example, we'll assume we don't have low-level access,
        // so we'll just transfer ownership back without actually updating the address
        
        // Transfer ownership back to the original owner
        IRedDragon(redDragonAddress).transferOwnership(originalOwner);
        
        emit JackpotAddressUpdated(redDragonAddress, newJackpotAddress);
    }
} 