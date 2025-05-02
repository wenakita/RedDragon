// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestCrossChainBridge
 * @dev A test contract for simulating cross-chain bridge functionality
 */
contract TestCrossChainBridge is Ownable {
    // Chain registry
    mapping(uint16 => string) public chainIds;
    mapping(string => uint16) public chainNames;
    mapping(uint16 => address) public omniDragonOnChain;
    
    // Chain supply tracking
    mapping(uint16 => uint256) public chainSupplies;
    
    // Global chain setup
    uint16[] public supportedChains;
    uint16 public currentChainId;
    
    // Message tracking for cross-chain
    struct Message {
        uint16 srcChainId;
        uint16 dstChainId;
        address srcAddress;
        address dstAddress;
        bytes payload;
        bool delivered;
    }
    
    mapping(uint256 => Message) public messages;
    uint256 public messageCount;
    
    // Events
    event ChainRegistered(uint16 indexed chainId, string chainName);
    event ContractRegistered(uint16 indexed chainId, address indexed contractAddress);
    event MessageSent(uint256 indexed messageId, uint16 indexed srcChainId, uint16 indexed dstChainId, address srcAddress, address dstAddress);
    event MessageDelivered(uint256 indexed messageId, uint16 indexed srcChainId, uint16 indexed dstChainId);
    event SupplyUpdated(uint16 indexed chainId, uint256 supply);
    
    constructor(uint16 _currentChainId, string memory _currentChainName) Ownable() {
        currentChainId = _currentChainId;
        
        // Register the current chain
        _registerChain(_currentChainId, _currentChainName);
    }
    
    /**
     * @notice Register a new chain
     * @param _chainId Chain ID to register
     * @param _chainName Chain name to register
     */
    function registerChain(uint16 _chainId, string memory _chainName) external onlyOwner {
        _registerChain(_chainId, _chainName);
    }
    
    /**
     * @notice Internal function to register a chain
     * @param _chainId Chain ID to register
     * @param _chainName Chain name to register
     */
    function _registerChain(uint16 _chainId, string memory _chainName) internal {
        require(bytes(_chainName).length > 0, "Chain name cannot be empty");
        
        chainIds[_chainId] = _chainName;
        chainNames[_chainName] = _chainId;
        
        // Add to supported chains if not already added
        bool exists = false;
        for (uint i = 0; i < supportedChains.length; i++) {
            if (supportedChains[i] == _chainId) {
                exists = true;
                break;
            }
        }
        
        if (!exists) {
            supportedChains.push(_chainId);
        }
        
        emit ChainRegistered(_chainId, _chainName);
    }
    
    /**
     * @notice Register a contract on a specific chain
     * @param _chainId Chain ID to register contract for
     * @param _contractAddress Contract address to register
     */
    function registerContract(uint16 _chainId, address _contractAddress) external onlyOwner {
        require(_contractAddress != address(0), "Contract address cannot be zero");
        require(bytes(chainIds[_chainId]).length > 0, "Chain not registered");
        
        omniDragonOnChain[_chainId] = _contractAddress;
        
        emit ContractRegistered(_chainId, _contractAddress);
    }
    
    /**
     * @notice Simulate sending a cross-chain message
     * @param _srcChainId Source chain ID
     * @param _dstChainId Destination chain ID
     * @param _srcAddress Source contract address
     * @param _dstAddress Destination contract address
     * @param _payload Message payload
     * @return messageId Generated message ID
     */
    function sendMessage(
        uint16 _srcChainId,
        uint16 _dstChainId,
        address _srcAddress,
        address _dstAddress,
        bytes memory _payload
    ) external returns (uint256 messageId) {
        require(bytes(chainIds[_srcChainId]).length > 0, "Source chain not registered");
        require(bytes(chainIds[_dstChainId]).length > 0, "Destination chain not registered");
        require(_srcAddress != address(0), "Source address cannot be zero");
        require(_dstAddress != address(0), "Destination address cannot be zero");
        
        messageId = messageCount++;
        
        messages[messageId] = Message({
            srcChainId: _srcChainId,
            dstChainId: _dstChainId,
            srcAddress: _srcAddress,
            dstAddress: _dstAddress,
            payload: _payload,
            delivered: false
        });
        
        emit MessageSent(messageId, _srcChainId, _dstChainId, _srcAddress, _dstAddress);
        
        return messageId;
    }
    
    /**
     * @notice Simulate delivery of a cross-chain message
     * @param _messageId Message ID to deliver
     * @param _executor Address that will execute the delivery
     * @return success Whether the delivery was successful
     */
    function deliverMessage(uint256 _messageId, address _executor) external returns (bool success) {
        Message storage message = messages[_messageId];
        require(!message.delivered, "Message already delivered");
        require(message.srcAddress != address(0), "Invalid message ID");
        
        // Mark message as delivered
        message.delivered = true;
        
        emit MessageDelivered(_messageId, message.srcChainId, message.dstChainId);
        
        return true;
    }
    
    /**
     * @notice Update chain supply
     * @param _chainId Chain ID to update
     * @param _supply New supply amount
     */
    function updateChainSupply(uint16 _chainId, uint256 _supply) external onlyOwner {
        require(bytes(chainIds[_chainId]).length > 0, "Chain not registered");
        
        chainSupplies[_chainId] = _supply;
        
        emit SupplyUpdated(_chainId, _supply);
    }
    
    /**
     * @notice Get total supply across all chains
     * @return totalSupply The total supply
     */
    function getTotalSupply() external view returns (uint256 totalSupply) {
        for (uint i = 0; i < supportedChains.length; i++) {
            totalSupply += chainSupplies[supportedChains[i]];
        }
        
        return totalSupply;
    }
    
    /**
     * @notice Get the number of supported chains
     * @return count The number of supported chains
     */
    function getSupportedChainsCount() external view returns (uint256 count) {
        return supportedChains.length;
    }
    
    /**
     * @notice Get all supported chains
     * @return ids The chain IDs
     * @return names The chain names
     */
    function getSupportedChains() external view returns (uint16[] memory ids, string[] memory names) {
        uint256 length = supportedChains.length;
        ids = new uint16[](length);
        names = new string[](length);
        
        for (uint i = 0; i < length; i++) {
            uint16 chainId = supportedChains[i];
            ids[i] = chainId;
            names[i] = chainIds[chainId];
        }
        
        return (ids, names);
    }
} 