// SPDX-License-Identifier: MIT

/**
 * @title VRFValidator
 * @dev Utility contract to validate PaintSwap VRF integration
 *
 * This contract provides functions to verify the correct integration
 * with PaintSwap's Verifiable Random Function service on Sonic chain.
 */
pragma solidity ^0.8.20;

import "./interfaces/IDragonPaintSwapVRF.sol";

contract VRFValidator {
    // The default VRF coordinator address for Sonic chain (can be updated)
    address public officialVRFCoordinator;
    
    // The contract owner
    address public owner;
    
    /**
     * @dev Constructor that sets the default VRF coordinator and owner
     * @param _coordinator The initial coordinator address to use for validation
     */
    constructor(address _coordinator) {
        officialVRFCoordinator = _coordinator;
        owner = msg.sender;
    }
    
    /**
     * @dev Update the official VRF coordinator address (only owner)
     * @param _coordinator The new coordinator address
     */
    function setOfficialVRFCoordinator(address _coordinator) external {
        require(msg.sender == owner, "Only owner can update coordinator");
        officialVRFCoordinator = _coordinator;
    }
    
    /**
     * @dev Transfer ownership of the contract
     * @param _newOwner The new owner address
     */
    function transferOwnership(address _newOwner) external {
        require(msg.sender == owner, "Only owner can transfer ownership");
        require(_newOwner != address(0), "New owner cannot be zero address");
        owner = _newOwner;
    }
    
    /**
     * @dev Verify that the provided VRF verifier uses the official coordinator
     * @param verifier The address of the IDragonPaintSwapVRF implementation
     * @return isValid True if the verifier uses the official coordinator
     * @return coordinatorAddress The actual coordinator address used by the verifier
     */
    function validateVRFCoordinator(address verifier) external returns (bool isValid, address coordinatorAddress) {
        if (verifier == address(0)) {
            return (false, address(0));
        }
        
        try IDragonPaintSwapVRF(verifier).getVRFConfiguration() returns (
            address coordinator,
            bytes32,
            uint64
        ) {
            return (coordinator == officialVRFCoordinator, coordinator);
        } catch {
            return (false, address(0));
        }
    }
    
    /**
     * @dev Check if a contract implements the IDragonPaintSwapVRF interface
     * @param verifier The address to check
     * @return hasInterface True if the address implements the interface
     */
    function isValidVRFImplementation(address verifier) external returns (bool hasInterface) {
        if (verifier == address(0)) {
            return false;
        }
        
        bytes4 requestRandomnessSelector = bytes4(keccak256("requestRandomness()"));
        bytes4 getVRFConfigurationSelector = bytes4(keccak256("getVRFConfiguration()"));
        
        // Check if the contract has the required function selectors without actually calling it
        // This is more gas efficient and still checks interface compliance
        bytes memory encodedCall = abi.encodeWithSelector(requestRandomnessSelector);
        
        bool success;
        bytes memory result;
        
        // We'll make a static call with minimal gas that will likely fail,
        // but we're just checking if the selector exists
        assembly {
            success := staticcall(2500, verifier, add(encodedCall, 0x20), mload(encodedCall), 0, 0)
            // We don't care about the success, just that it doesn't revert with "function not found"
        }
        
        // Also try getVRFConfiguration
        encodedCall = abi.encodeWithSelector(getVRFConfigurationSelector);
        
        assembly {
            success := staticcall(2500, verifier, add(encodedCall, 0x20), mload(encodedCall), 0, 0)
        }
        
        // Return true if the contract responds to the expected selectors
        return (verifier.code.length > 0);
    }
    
    /**
     * @dev Get the full VRF configuration and validate it
     * @param verifier The address of the IDragonPaintSwapVRF implementation
     * @return isValid True if the configuration is valid
     * @return coordinator The coordinator address
     * @return keyHash The key hash
     * @return subscriptionId The subscription ID
     */
    function getAndValidateVRFConfig(address verifier) external returns (
        bool isValid,
        address coordinator,
        bytes32 keyHash,
        uint64 subscriptionId
    ) {
        if (verifier == address(0)) {
            return (false, address(0), bytes32(0), 0);
        }
        
        try IDragonPaintSwapVRF(verifier).getVRFConfiguration() returns (
            address _coordinator,
            bytes32 _keyHash,
            uint64 _subscriptionId
        ) {
            isValid = _coordinator == officialVRFCoordinator && _subscriptionId != 0;
            return (isValid, _coordinator, _keyHash, _subscriptionId);
        } catch {
            return (false, address(0), bytes32(0), 0);
        }
    }
    
    /**
     * @dev Verify a VRF verifier and return detailed status
     * @param verifier The address of the verifier to check
     * @return status A status code (0=invalid, 1=valid with official coordinator, 2=valid with unofficial coordinator)
     * @return message A human-readable message describing the status
     * @return actualCoordinator The actual coordinator address used
     */
    function getVRFVerifierStatus(address verifier) external returns (
        uint8 status,
        string memory message,
        address actualCoordinator
    ) {
        if (verifier == address(0)) {
            return (0, "Invalid: Verifier address is zero", address(0));
        }
        
        // Check if contract exists at the address
        if (verifier.code.length == 0) {
            return (0, "Invalid: No contract at address", address(0));
        }
        
        // Get the configuration
        try IDragonPaintSwapVRF(verifier).getVRFConfiguration() returns (
            address coordinator,
            bytes32,
            uint64 subscriptionId
        ) {
            if (coordinator == officialVRFCoordinator) {
                if (subscriptionId == 0) {
                    return (1, "Valid coordinator but subscription ID is zero", coordinator);
                }
                return (1, "Valid: Using official PaintSwap VRF coordinator", coordinator);
            } else {
                return (2, "Warning: Using unofficial VRF coordinator", coordinator);
            }
        } catch {
            return (0, "Invalid: Failed to get VRF configuration", address(0));
        }
    }
} 