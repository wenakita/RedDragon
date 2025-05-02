// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/INativeTokenWrapper.sol";

/**
 * @title DragonTokenUtils
 * @dev Utility library for Dragon project token operations
 * Includes error handling for transfers, approvals, and distribution
 */
library DragonTokenUtils {
    using SafeERC20 for IERC20;
    
    /**
     * @notice Safely transfer tokens from contract to recipient
     * @param token Token to transfer
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function safeTransfer(
        IERC20 token,
        address to,
        uint256 amount
    ) internal {
        if (amount == 0 || to == address(0)) {
            return;
        }
        
        token.safeTransfer(to, amount);
    }
    
    /**
     * @notice Safely transfer tokens from sender to recipient
     * @param token Token to transfer
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function safeTransferFrom(
        IERC20 token,
        address from,
        address to,
        uint256 amount
    ) internal {
        if (amount == 0 || from == address(0) || to == address(0)) {
            return;
        }
        
        token.safeTransferFrom(from, to, amount);
    }
    
    /**
     * @notice Safely increase allowance for spender
     * @param token Token to approve
     * @param spender Spender address
     * @param amount Amount to approve
     */
    function safeIncreaseAllowance(
        IERC20 token,
        address spender,
        uint256 amount
    ) internal {
        if (amount == 0 || spender == address(0)) {
            return;
        }
        
        uint256 currentAllowance = token.allowance(address(this), spender);
        if (currentAllowance < amount) {
            token.safeIncreaseAllowance(spender, amount - currentAllowance);
        }
    }
    
    /**
     * @notice Safely wrap native tokens (ETH, SONIC, etc.)
     * @param wrapper Wrapper token contract (WETH, wS, etc.)
     * @param amount Amount to wrap
     */
    function safeWrapNative(
        address wrapper,
        uint256 amount
    ) internal {
        if (amount == 0 || wrapper == address(0)) {
            return;
        }
        
        // Call deposit function on wrapper contract
        // This assumes all wrappers follow the WETH9 interface
        INativeTokenWrapper(wrapper).deposit{value: amount}();
    }
    
    /**
     * @notice Safely unwrap tokens to native currency
     * @param wrapper Wrapper token contract (WETH, wS, etc.)
     * @param amount Amount to unwrap
     */
    function safeUnwrapNative(
        address wrapper,
        uint256 amount
    ) internal {
        if (amount == 0 || wrapper == address(0)) {
            return;
        }
        
        // Call withdraw function on wrapper contract
        INativeTokenWrapper(wrapper).withdraw(amount);
    }
    
    /**
     * @notice Distribute tokens according to basis points allocations
     * @param token Token to distribute
     * @param amount Total amount to distribute
     * @param recipients Array of recipient addresses
     * @param basisPoints Array of basis points for each recipient (totaling 10000)
     */
    function distributeByBasisPoints(
        IERC20 token,
        uint256 amount,
        address[] memory recipients,
        uint256[] memory basisPoints
    ) internal {
        require(recipients.length == basisPoints.length, "Arrays must have same length");
        
        uint256 totalBasisPoints = 0;
        for (uint256 i = 0; i < basisPoints.length; i++) {
            totalBasisPoints += basisPoints[i];
        }
        require(totalBasisPoints == 10000, "Basis points must total 10000");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            uint256 recipientAmount = amount * basisPoints[i] / 10000;
            if (recipientAmount > 0 && recipients[i] != address(0)) {
                token.safeTransfer(recipients[i], recipientAmount);
            }
        }
    }
    
    /**
     * @notice Get token balance of an address
     * @param token Token to check
     * @param account Account to check balance for
     * @return Token balance
     */
    function getBalance(
        IERC20 token,
        address account
    ) internal view returns (uint256) {
        return token.balanceOf(account);
    }
    
    /**
     * @notice Safely transfer token or native currency
     * @param token Token to transfer (zero address for native)
     * @param to Recipient address
     * @param amount Amount to transfer
     * @return Success status
     */
    function safeTransferTokenOrNative(
        address token,
        address to,
        uint256 amount
    ) internal returns (bool) {
        if (amount == 0 || to == address(0)) {
            return false;
        }
        
        if (token == address(0)) {
            // Transfer native currency
            (bool success, ) = to.call{value: amount}("");
            return success;
        } else {
            // Transfer ERC20 token
            try IERC20(token).transfer(to, amount) {
                return true;
            } catch {
                return false;
            }
        }
    }
} 