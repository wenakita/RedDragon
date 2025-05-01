// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./VRFConsumerBase.sol";

/*
   ====================================
         VRF CONSUMER BASE V2
   ====================================
     Chainlink VRF Integration Layer
     Advanced Randomness Consumption
    Cryptographic Verification Engine
   ====================================

   🔮 Chainlink VRF Integration
   ⛓️ Proof-of-Randomness Protocol
   🛡️ Tamper-Proof Security Logic
*/

/**
 * @title VRFConsumerBaseV2
 * @dev Base contract for consuming randomness from Chainlink VRF V2
 * Extends VRFConsumerBase with Chainlink-specific functionality
 */
abstract contract VRFConsumerBaseV2 is VRFConsumerBase {
    // Address of the VRF coordinator contract
    address private immutable vrfCoordinator;
    
    /**
     * @dev Constructor
     * @param _vrfCoordinator Address of the VRF coordinator
     */
    constructor(address _vrfCoordinator) {
        vrfCoordinator = _vrfCoordinator;
    }
    
    /**
     * @notice Callback function used by VRF Coordinator
     * @dev Override this function to receive randomness from VRF
     * @param requestId - id of the request
     * @param randomWords - array of random results from VRF Coordinator
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal virtual {
        require(msg.sender == vrfCoordinator, "Only VRF coordinator can fulfill");
        if (randomWords.length > 0) {
            _fulfillRandomness(requestId, randomWords[0]);
        }
    }
    
    /**
     * @notice Validate that caller is VRF Coordinator
     * @dev Called when VRF Coordinator sends randomness
     * @param requestId Request ID
     * @param randomWords Random values
     */
    function rawFulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) external {
        require(msg.sender == vrfCoordinator, "Only VRF Coordinator");
        fulfillRandomWords(requestId, randomWords);
    }
    
    /**
     * @notice Get the VRF coordinator address
     * @return Address of the VRF coordinator
     */
    function getVRFCoordinator() internal view returns (address) {
        return vrfCoordinator;
    }
} 