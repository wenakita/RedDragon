// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Mock OFT (Omnichain Fungible Token)
 * @dev This is a simplified mock of the LayerZero OFT implementation for testing
 */
abstract contract OFT is ERC20Burnable {
    // LayerZero endpoint
    address public immutable lzEndpoint;
    
    // Custom errors
    error InvalidEndpoint();
    
    // Events
    event SendToChain(uint16 dstChainId, address indexed from, bytes toAddress, uint256 amount);
    event ReceiveFromChain(uint16 srcChainId, address indexed to, uint256 amount);
    
    /**
     * @dev Constructor
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _lzEndpoint LayerZero endpoint address
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint
    ) ERC20(_name, _symbol) {
        if (_lzEndpoint == address(0)) revert InvalidEndpoint();
        lzEndpoint = _lzEndpoint;
    }
    
    /**
     * @dev Mock function to simulate sending tokens to another chain
     * @param _from Sender address
     * @param _dstChainId Destination chain ID
     * @param _amount Amount to send
     * @return uint256 The message ID
     */
    function sendFrom(
        address _from,
        uint16 _dstChainId,
        bytes calldata /* _toAddress */,
        uint256 _amount,
        address /* _refundAddress */,
        address /* _zroPaymentAddress */,
        bytes calldata /* _adapterParams */
    ) external payable virtual returns (uint256) {
        // Mock implementation - just burn tokens from sender
        _burn(_from, _amount);
        
        emit SendToChain(_dstChainId, _from, "", _amount);
        
        return 0; // Mock message ID
    }
    
    /**
     * @dev Mock function to simulate receiving tokens from another chain
     * @param _srcChainId Source chain ID 
     * @param _toAddress Recipient address
     * @param _amount Amount to receive
     */
    function mockReceiveFromChain(
        uint16 _srcChainId,
        address _toAddress,
        uint256 _amount
    ) external virtual {
        // Mock implementation - just mint tokens to recipient
        _mint(_toAddress, _amount);
        
        emit ReceiveFromChain(_srcChainId, _toAddress, _amount);
    }
    
    /**
     * @dev Mock function to simulate estimating fee
     * @return nativeFee Native token fee
     * @return zroFee ZRO token fee
     */
    function estimateSendFee(
        uint16 /* _dstChainId */,
        bytes calldata /* _toAddress */,
        uint256 /* _amount */,
        bool /* _useZro */,
        bytes calldata /* _adapterParams */
    ) external view virtual returns (uint256 nativeFee, uint256 zroFee) {
        // Mock implementation - return fixed fee
        return (0.01 ether, 0);
    }
} 