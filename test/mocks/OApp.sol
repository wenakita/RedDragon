// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ILayerZeroEndpointV2.sol";

/**
 * @title OApp
 * @dev Simplified mock of LayerZero OApp for testing
 */
abstract contract OApp {
    // LayerZero endpoint
    address public immutable endpoint;
    
    // Optional delegate address
    address public immutable delegate;
    
    // Origin struct for received messages
    struct Origin {
        uint32 srcEid;
        bytes32 sender;
        uint64 nonce;
    }
    
    /**
     * @dev Constructor
     * @param _endpoint LayerZero endpoint address
     * @param _delegate Optional delegate address
     */
    constructor(address _endpoint, address _delegate) {
        endpoint = _endpoint;
        delegate = _delegate;
    }
    
    /**
     * @dev Receive message from LayerZero
     * This function is called by the endpoint when a message is received
     */
    function lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) external virtual {
        // Only the endpoint can call this function
        require(msg.sender == endpoint, "OApp: caller must be the endpoint");
        
        // Call internal function
        _lzReceive(_origin, _guid, _message, _executor, _extraData);
    }
    
    /**
     * @dev Internal function to process received message
     * Must be implemented by derived contracts
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) internal virtual;
} 