// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IDragon.sol";
import "../interfaces/ISonicVRFConsumer.sol";

/**
 * @title DragonVRFConnector
 * @notice Contract that integrates Dragon token with the VRF consumer
 * @dev This contract implements hooks that the Dragon token can call
 */
contract DragonVRFConnector is Ownable {
    // Dragon token
    address public dragonToken;
    
    // wS token
    address public wrappedSonic;
    
    // VRF Consumer
    ISonicVRFConsumer public vrfConsumer;
    
    // Events
    event VRFRequestSent(address indexed user, uint256 amount);
    event DragonTokenUpdated(address indexed dragonToken);
    event WrappedSonicUpdated(address indexed wrappedSonic);
    event VRFConsumerUpdated(address indexed vrfConsumer);
    
    /**
     * @notice Constructor
     * @param _dragonToken The Dragon token address
     * @param _wrappedSonic The wrapped Sonic token address
     * @param _vrfConsumer The VRF consumer address
     */
    constructor(
        address _dragonToken,
        address _wrappedSonic,
        address _vrfConsumer
    ) Ownable() {
        dragonToken = _dragonToken;
        wrappedSonic = _wrappedSonic;
        vrfConsumer = ISonicVRFConsumer(_vrfConsumer);
    }
    
    /**
     * @notice Called after a token swap
     * @dev This should be called by the Dragon token
     * @param _from Address tokens were sent from
     * @param _to Address tokens were sent to
     * @param _amount Amount of tokens transferred
     */
    function afterTokenTransfer(
        address _from,
        address _to,
        uint256 _amount
    ) external {
        // Make sure only Dragon token can call this
        require(msg.sender == dragonToken, "Only Dragon token can call");
        
        // Check if this is a swap from wS to DRAGON
        // We can detect this by looking at the _from address
        if (_from == wrappedSonic) {
            // This is a swap from wS to DRAGON
            // Trigger the VRF request for the user
            vrfConsumer.onSwapWSToDragon(_to, _amount);
            
            emit VRFRequestSent(_to, _amount);
        }
    }
    
    /**
     * @notice Update the Dragon token address
     * @param _dragonToken The new Dragon token address
     */
    function setDragonToken(address _dragonToken) external onlyOwner {
        require(_dragonToken != address(0), "Invalid token address");
        dragonToken = _dragonToken;
        emit DragonTokenUpdated(_dragonToken);
    }
    
    /**
     * @notice Update the wrapped Sonic token address
     * @param _wrappedSonic The new wrapped Sonic token address
     */
    function setWrappedSonic(address _wrappedSonic) external onlyOwner {
        require(_wrappedSonic != address(0), "Invalid token address");
        wrappedSonic = _wrappedSonic;
        emit WrappedSonicUpdated(_wrappedSonic);
    }
    
    /**
     * @notice Update the VRF consumer address
     * @param _vrfConsumer The new VRF consumer address
     */
    function setVRFConsumer(address _vrfConsumer) external onlyOwner {
        require(_vrfConsumer != address(0), "Invalid consumer address");
        vrfConsumer = ISonicVRFConsumer(_vrfConsumer);
        emit VRFConsumerUpdated(_vrfConsumer);
    }
} 