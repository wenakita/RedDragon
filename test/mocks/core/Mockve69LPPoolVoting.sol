// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../../../contracts/interfaces/Ive69LPPoolVoting.sol";

/**
 * @title Mockve69LPPoolVoting
 * @dev Mock implementation of ve69LPPoolVoting for testing
 */
contract Mockve69LPPoolVoting is Ownable, Ive69LPPoolVoting {
    uint256 public currentPeriod = 2885;
    mapping(uint256 => uint256) public partnerBoosts;
    mapping(address => uint256) public partnerAddressToId;
    mapping(uint256 => address) public partnerIdToAddress;
    
    constructor() {
        // Initialize with default values
    }
    
    function setPartnerBoost(uint256 _partnerId, uint256 _boost) external onlyOwner {
        partnerBoosts[_partnerId] = _boost;
    }
    
    function setPartnerAddressMapping(address _partner, uint256 _partnerId) external onlyOwner {
        partnerAddressToId[_partner] = _partnerId;
        partnerIdToAddress[_partnerId] = _partner;
    }

    function getPartnerProbabilityBoost(uint256 _partnerId) external view override returns (uint256) {
        return partnerBoosts[_partnerId];
    }
    
    function getPartnerProbabilityBoostByAddress(address _partner) external view override returns (uint256) {
        uint256 partnerId = partnerAddressToId[_partner];
        return partnerBoosts[partnerId];
    }
    
    function calculateBoosts() external override {
        // Mock implementation does nothing but can be overridden for testing
    }
    
    function setCurrentPeriod(uint256 _period) external onlyOwner {
        currentPeriod = _period;
    }
} 