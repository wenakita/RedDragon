// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockLzEndpoint
 * @notice Mock implementation of the LayerZero endpoint for testing
 * @dev Includes support for both standard messages and read messages
 */
contract MockLzEndpoint {
    uint16 public chainId;
    
    // Mapping of address => remote chain ID => destination address
    mapping(address => mapping(uint16 => address)) public destLzEndpoint;
    
    // Mapping of LZ send library version => address
    mapping(uint16 => address) public sendLibrary;
    
    // Mapping of LZ receive library version => address
    mapping(uint16 => address) public receiveLibrary;
    
    // Events to track interactions
    event LzMessageSent(address indexed from, uint16 indexed to, bytes payload);
    event LzMessageReceived(address indexed to, uint16 indexed from, bytes payload);
    event LzReadMessageReceived(address indexed to, uint16 indexed from, bytes payload);
    event ConfigSet(address indexed userApplication, uint16 msgType, uint256 configType, bytes config);
    
    constructor(uint16 _chainId) {
        chainId = _chainId;
    }
    
    /**
     * @notice Set the destination LayerZero endpoint address
     * @param _userApplication The application sending messages
     * @param _endpoint The destination LayerZero endpoint
     */
    function setDestLzEndpoint(address _userApplication, address _endpoint) external {
        destLzEndpoint[_userApplication][chainId] = _endpoint;
    }
    
    /**
     * @notice Mock function to set a send library
     * @param _userApplication The application using this library
     * @param _type The message type
     * @param _library The library address
     */
    function setSendLibrary(address _userApplication, uint16 _type, address _library) external {
        sendLibrary[_type] = _library;
    }
    
    /**
     * @notice Mock function to set a receive library
     * @param _userApplication The application using this library
     * @param _type The message type
     * @param _library The library address
     */
    function setReceiveLibrary(address _userApplication, uint16 _type, address _library) external {
        receiveLibrary[_type] = _library;
    }
    
    /**
     * @notice Mock function to set configuration options
     * @param _userApplication The application to configure
     * @param _type The message type
     * @param _configType The configuration type
     * @param _config The configuration data
     */
    function setConfig(address _userApplication, uint16 _type, uint _configType, bytes calldata _config) external {
        emit ConfigSet(_userApplication, _type, _configType, _config);
    }
    
    /**
     * @notice Mocked send function for LayerZero messages
     * @param _dstChainId The destination chain ID
     * @param _destination The serialized destination address
     * @param _payload The message payload
     * @param _refundAddress The address to refund excess fees
     * @param _zroPaymentAddress The ZRO payment address (unused in mock)
     * @param _adapterParams Additional parameters for the adapter
     */
    function send(
        uint16 _dstChainId,
        bytes memory _destination,
        bytes memory _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes memory _adapterParams
    ) external payable {
        emit LzMessageSent(msg.sender, _dstChainId, _payload);
    }

    /**
     * @notice Mocked estimation function
     * @return The estimated message fee (always returns a fixed amount)
     */
    function estimateFees(
        uint16 _dstChainId,
        address _userApplication,
        bytes memory _payload,
        bool _payInZRO,
        bytes memory _adapterParams
    ) external view returns (uint nativeFee, uint zroFee) {
        return (0.01 ether, 0);
    }
    
    /**
     * @notice Mocked quoting function for the OApp variant
     * @return fee Structure containing fee information
     */
    function quoteFee(MessagingParams memory) external view returns (MessagingFee memory fee) {
        return MessagingFee({
            nativeFee: 0.01 ether,
            lzTokenFee: 0
        });
    }
    
    /**
     * @notice Mock receiving a message from another chain
     * @param _destination The destination contract
     * @param _srcChainId The source chain ID
     * @param _payload The message payload
     * @param _srcAddress The source address (optional)
     */
    function mockReceiveMessage(
        address _destination,
        uint16 _srcChainId,
        bytes calldata _payload,
        address _srcAddress
    ) external {
        // Create a mock Origin struct
        Origin memory origin = Origin({
            srcEid: _srcChainId,
            sender: bytes32(uint256(uint160(_srcAddress))),
            nonce: 1
        });

        // Call _lzReceive on the destination contract
        ILayerZeroReceiver(_destination)._lzReceive(
            origin,
            bytes32(0), // guid
            _payload,
            address(0), // executor
            bytes("") // extraData
        );
        
        emit LzMessageReceived(_destination, _srcChainId, _payload);
    }
    
    /**
     * @notice Mock receiving a read message response from another chain
     * @param _destination The destination contract
     * @param _srcChainId The source chain ID
     * @param _payload The read response payload
     */
    function mockReceiveReadMessage(
        address _destination,
        uint16 _srcChainId,
        bytes calldata _payload
    ) external {
        // Create a mock Origin struct with a high EID to simulate read channel
        Origin memory origin = Origin({
            srcEid: _srcChainId,
            sender: bytes32(uint256(uint160(address(this)))),
            nonce: 1
        });

        // Call _lzReceive on the destination contract
        ILayerZeroReceiver(_destination)._lzReceive(
            origin,
            bytes32(0), // guid
            _payload,
            address(0), // executor
            bytes("") // extraData
        );
        
        emit LzReadMessageReceived(_destination, _srcChainId, _payload);
    }
}

// Definition of structs for compatibility with OAppRead
struct Origin {
    uint16 srcEid;
    bytes32 sender;
    uint64 nonce;
}

struct MessagingParams {
    uint32 dstEid;
    bytes receiver;
    bytes message;
    bytes options;
    address payable refundAddress;
}

struct MessagingFee {
    uint256 nativeFee;
    uint256 lzTokenFee;
}

interface ILayerZeroReceiver {
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) external;
} 