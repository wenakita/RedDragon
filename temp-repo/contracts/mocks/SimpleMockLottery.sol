// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleMockLottery
 * @dev A simple mock lottery contract for testing RedDragonThankYouToken
 */
contract SimpleMockLottery is Ownable {
    // Reference to the thank you token
    address public thankYouToken;
    
    /**
     * @dev Set the thank you token address
     * @param _thankYouToken Address of the thank you token
     */
    function setThankYouToken(address _thankYouToken) external onlyOwner {
        thankYouToken = _thankYouToken;
    }
    
    /**
     * @dev Mock function that would normally call the thank you token's calculateBoost
     * @param user Address to calculate boost for
     * @return boost The boost amount
     */
    function calculateBoost(address user) external view returns (uint256) {
        return 0;
    }
} 