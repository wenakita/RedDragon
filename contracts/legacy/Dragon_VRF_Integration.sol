// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DragonVRFIntegration
 * @notice Example implementation of Dragon token with VRF integration
 * @dev This is a reference implementation
 */
contract DragonVRFIntegration is ERC20, Ownable {
    // VRF Connector to handle lottery requests
    address public vrfConnector;

    // wS token address
    address public wrappedSonic;

    // Events
    event VRFConnectorUpdated(address indexed vrfConnector);
    event SwapWSToDragon(address indexed user, uint256 amount);

    // Ensure only VRF connector can call
    modifier onlyVRFConnector() {
        require(msg.sender == vrfConnector, "Only VRF connector can call");
        _;
    }

    /**
     * @notice Constructor
     */
    constructor() ERC20("Dragon", "DRAGON") Ownable() {
        // Initialize with default values
        vrfConnector = address(0);
        wrappedSonic = 0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38; // wS address
    }

    /**
     * @notice Set the VRF connector address
     * @param _vrfConnector The address of the VRF connector
     */
    function setVRFConnector(address _vrfConnector) external onlyOwner {
        require(_vrfConnector != address(0), "Invalid connector address");
        vrfConnector = _vrfConnector;
        emit VRFConnectorUpdated(_vrfConnector);
    }

    /**
     * @notice Set the wrapped Sonic token address
     * @param _wrappedSonic The address of the wrapped Sonic token
     */
    function setWrappedSonic(address _wrappedSonic) external onlyOwner {
        require(_wrappedSonic != address(0), "Invalid token address");
        wrappedSonic = _wrappedSonic;
    }

    /**
     * @notice Modify the _transfer function to detect swaps from wS to DRAGON
     */
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        // Regular transfer logic
        super._transfer(from, to, amount);

        // If this is a swap from wS to DRAGON, trigger the lottery
        if (from == wrappedSonic && to != address(0) && vrfConnector != address(0)) {
            // Notify the VRF connector
            IDragonVRFConnector(vrfConnector).afterTokenTransfer(from, to, amount);
            
            emit SwapWSToDragon(to, amount);
        }
    }
}

/**
 * Interface for the VRF connector
 */
interface IDragonVRFConnector {
    function afterTokenTransfer(address from, address to, uint256 amount) external;
} 