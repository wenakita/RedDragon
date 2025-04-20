// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MockPoolVotingWithConfigurableBoost {
    mapping(address => uint256) public partnerBoosts;
    mapping(uint256 => uint256) public partnerIdBoosts;
    uint256 public currentPeriod = 2885;
    
    // Set boost for a specific partner
    function setBoostForPartner(address partner, uint256 boost) external {
        partnerBoosts[partner] = boost;
    }
    
    // Set boost for a partner ID
    function setBoostForPartnerId(uint256 partnerId, uint256 boost) external {
        partnerIdBoosts[partnerId] = boost;
    }
    
    // Get partner boost by address
    function getPartnerProbabilityBoostByAddress(address partner) external view returns (uint256) {
        return partnerBoosts[partner];
    }
    
    // Get partner boost by ID
    function getPartnerProbabilityBoost(uint256 partnerId) external view returns (uint256) {
        return partnerIdBoosts[partnerId];
    }
    
    // Calculate boosts (mock implementation)
    function calculateBoosts() external {
        // Does nothing
    }
} 