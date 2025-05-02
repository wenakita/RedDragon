// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../contracts/interfaces/ILayerZeroEndpointV1.sol";

/**
 * @title MockLayerZeroEndpointV1
 * @dev Mock implementation of LayerZero endpoint for testing cross-chain interactions
 */
contract MockLayerZeroEndpointV1 is ILayerZeroEndpointV1 {
    // Mapping to track application contracts on this "chain"
    mapping(address => bool) public applications;
    
    // Mock chain ID for this endpoint
    uint16 public immutable mockChainId;
    
    // Fee for sending messages
    uint256 public defaultFee = 0.01 ether;
    
    // Events
    event LzMessageSent(
        uint16 indexed dstChainId,
        bytes indexed destination,
        bytes payload,
        address refundAddress,
        address zroPaymentAddress,
        bytes adapterParams
    );
    
    /**
     * @dev Constructor
     * @param _mockChainId Chain ID this endpoint should represent
     */
    constructor(uint16 _mockChainId) {
        mockChainId = _mockChainId;
    }
    
    /**
     * @notice Register an application
     * @param _application Address of the application to register
     */
    function registerApplication(address _application) external {
        applications[_application] = true;
    }
    
    /**
     * @notice Mock implementation of send function
     */
    function send(
        uint16 _dstChainId,
        bytes calldata _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable override {
        require(msg.value >= defaultFee, "MockLZEndpoint: not enough fee to cover message");
        
        emit LzMessageSent(
            _dstChainId,
            _destination,
            _payload,
            _refundAddress,
            _zroPaymentAddress,
            _adapterParams
        );
        
        // Refund excess fee
        if (msg.value > defaultFee) {
            uint256 refundAmount = msg.value - defaultFee;
            (bool success, ) = _refundAddress.call{value: refundAmount}("");
            require(success, "MockLZEndpoint: refund failed");
        }
    }
    
    /**
     * @notice Mock implementation of estimateFees function
     */
    function estimateFees(
        uint16,
        address,
        bytes calldata,
        bool,
        bytes calldata
    ) external view override returns (uint256 nativeFee, uint256 zroFee) {
        return (defaultFee, 0);
    }
    
    /**
     * @notice Mock implementation of getChainId function
     */
    function getChainId() external view override returns (uint16) {
        return mockChainId;
    }
    
    /**
     * @notice Mock function to deliver a cross-chain message
     * @param _srcChainId Source chain ID
     * @param _srcAddress Source address (as bytes)
     * @param _dstAddress Destination address
     * @param _nonce Message nonce
     * @param _payload Message payload
     */
    function deliverMessage(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        address _dstAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external {
        require(applications[_dstAddress], "MockLZEndpoint: destination not registered");
        
        // Call lzReceive on the destination contract
        (bool success, ) = _dstAddress.call(
            abi.encodeWithSignature(
                "lzReceive(uint16,bytes,uint64,bytes)",
                _srcChainId,
                _srcAddress,
                _nonce,
                _payload
            )
        );
        
        require(success, "MockLZEndpoint: failed to deliver message");
    }
    
    /**
     * @notice Set the default fee for sending messages
     * @param _defaultFee New default fee
     */
    function setDefaultFee(uint256 _defaultFee) external {
        defaultFee = _defaultFee;
    }
    
    /**
     * @notice Allow the contract to receive native tokens
     */
    receive() external payable {}
} 