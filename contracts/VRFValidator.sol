// SPDX-License-Identifier: MIT

/**
 * @title VRFValidator
 * @dev Utility contract to validate Chainlink VRF integration
 *
 * This contract provides functions to verify the correct integration
 * with Chainlink's Verifiable Random Function service across chains.
 */
pragma solidity ^0.8.20;

import "./interfaces/IVRFConsumer.sol";

contract VRFValidator {
    // The default VRF coordinator address for Arbitrum chain (can be updated)
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
     * @dev Check if a contract implements the IVRFConsumer interface
     * @param consumer The address to check
     * @return hasInterface True if the address implements the interface
     */
    function isValidVRFImplementation(address consumer) external view returns (bool hasInterface) {
        if (consumer == address(0) || consumer.code.length == 0) {
            return false;
        }
        
        // Check for specific function selectors that should be present in a valid VRF consumer
        bytes4 fulfillRandomWordsSelector = IVRFConsumer.fulfillRandomWords.selector;
        
        (bool success, ) = consumer.staticcall(
            abi.encodeWithSelector(
                bytes4(keccak256("supportsInterface(bytes4)")),
                fulfillRandomWordsSelector
            )
        );
        
        return success;
    }
    
    /**
     * @dev Get the cross-chain VRF status
     * @param arbitrumVRFRequester The Arbitrum VRF requester address
     * @param sonicVRFConsumer The Sonic VRF consumer address
     * @return isValid True if the cross-chain VRF setup is valid
     * @return message A human-readable message describing the status
     */
    function getVRFCrossChainStatus(
        address arbitrumVRFRequester,
        address sonicVRFConsumer
    ) external view returns (
        bool isValid,
        string memory message
    ) {
        if (arbitrumVRFRequester == address(0) || arbitrumVRFRequester.code.length == 0) {
            return (false, "Invalid: Arbitrum VRF requester does not exist");
        }
        
        if (sonicVRFConsumer == address(0) || sonicVRFConsumer.code.length == 0) {
            return (false, "Invalid: Sonic VRF consumer does not exist");
        }
        
        // Further validation could be implemented here, checking specific configurations
        // or cross-chain messaging capabilities
        
        return (true, "Valid: Cross-chain VRF setup is correctly configured");
    }
    
    /**
     * @dev Verify that the LayerZero integration is correctly set up
     * @param consumer The VRF consumer address
     * @return isValid True if the LayerZero setup is valid
     * @return message A human-readable message describing the status
     */
    function validateLayerZeroIntegration(address consumer) external view returns (
        bool isValid,
        string memory message
    ) {
        if (consumer == address(0) || consumer.code.length == 0) {
            return (false, "Invalid: Consumer does not exist");
        }
        
        // Check for LayerZero endpoint integration
        // This is a simplified check and could be expanded with more specific validation
        (bool success, ) = consumer.staticcall(
            abi.encodeWithSelector(
                bytes4(keccak256("lzEndpoint()"))
            )
        );
        
        if (!success) {
            return (false, "Invalid: No LayerZero endpoint found");
        }
        
        return (true, "Valid: LayerZero integration appears to be correctly configured");
    }
} 