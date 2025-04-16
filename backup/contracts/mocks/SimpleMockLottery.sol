// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev A simple mock lottery contract for testing RedEnvelope
 */
contract SimpleMockLottery is Ownable {
    // Red envelope contract address
    address public redEnvelope;

    /**
     * @dev Set the red envelope contract address
     * @param _redEnvelope Address of the red envelope contract
     */
    function setRedEnvelope(address _redEnvelope) external onlyOwner {
        redEnvelope = _redEnvelope;
    }
} 