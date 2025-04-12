// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockExchangePair
 * @dev Simulates an AMM exchange pair for testing
 */
contract MockExchangePair is Ownable {
    IERC20 public token;
    IERC20 public wrappedSonic;
    
    event Swap(address indexed sender, uint256 tokenAmount, uint256 wsAmount, bool isBuy);

    constructor(address _token, address _wrappedSonic) {
        token = IERC20(_token);
        wrappedSonic = IERC20(_wrappedSonic);
    }
    
    /**
     * @dev Simulates a buy (wS to token)
     */
    function simulateBuy(address buyer, uint256 wsAmount, uint256 tokenAmount) external onlyOwner {
        // Transfer wS from buyer to pair
        wrappedSonic.transferFrom(buyer, address(this), wsAmount);
        
        // Transfer tokens from pair to buyer
        token.transfer(buyer, tokenAmount);
        
        emit Swap(buyer, tokenAmount, wsAmount, true);
    }
    
    /**
     * @dev Simulates a sell (token to wS)
     */
    function simulateSell(address seller, uint256 tokenAmount, uint256 wsAmount) external onlyOwner {
        // Transfer tokens from seller to pair
        token.transferFrom(seller, address(this), tokenAmount);
        
        // Transfer wS from pair to seller
        wrappedSonic.transfer(seller, wsAmount);
        
        emit Swap(seller, tokenAmount, wsAmount, false);
    }
    
    /**
     * @dev For testing direct transfers to pair
     */
    function onTokenTransfer(address from, uint256 amount) external {
        require(msg.sender == address(token), "Only token can call");
        // This would be called by the token in a real implementation
    }
    
    /**
     * @dev Allow the owner to rescue tokens
     */
    function rescueTokens(address _token, uint256 amount) external onlyOwner {
        IERC20(_token).transfer(owner(), amount);
    }
} 