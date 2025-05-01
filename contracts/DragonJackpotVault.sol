// SPDX-License-Identifier: MIT

/**
 *   =============================
 *      DRAGON JACKPOT VAULT
 *   =============================
 *     Treasury of the Lottery
 *   =============================
 *
 * // "Follow the rich white man." - Carter
 * // https://x.com/sonicreddragon
 * // https://t.me/sonicreddragon
 */

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IDragonSwapTrigger.sol";

/**
 * @title DragonJackpotVault
 * @dev A dedicated vault for collecting and forwarding jackpot fees to the lottery contract
 */
contract DragonJackpotVault is Ownable {
    using SafeERC20 for IERC20;
    
    // State variables
    IERC20 public wrappedSonic;
    IERC20 public dragonToken;
    address public forwardAddress; // Usually the lottery contract
    
    // Statistics for transparency
    uint256 public totalReceived;
    uint256 public totalForwarded;
    uint256 public lastForwardTime;
    
    // Events
    event TokensReceived(address indexed from, uint256 amount);
    event TokensForwarded(address indexed to, uint256 amount);
    event ForwardAddressUpdated(address indexed newAddress);
    event TokenAddressUpdated(address indexed newAddress);
    event EmergencyWithdrawal(address indexed to, uint256 amount);
    
    /**
     * @dev Constructor to initialize the vault
     * @param _wrappedSonic Address of the wS token
     * @param _owner Address of the owner (typically a multisig)
     */
    constructor(address _wrappedSonic, address _owner) {
        require(_wrappedSonic != address(0), "wS address cannot be zero");
        require(_owner != address(0), "Owner address cannot be zero");
        
        wrappedSonic = IERC20(_wrappedSonic);
        
        // Transfer ownership to the specified owner (multisig)
        transferOwnership(_owner);
    }
    
    /**
     * @dev Sets the address of the Dragon token
     * @param _dragonToken Address of the Dragon token
     */
    function setTokenAddress(address _dragonToken) external onlyOwner {
        require(_dragonToken != address(0), "Token address cannot be zero");
        dragonToken = IERC20(_dragonToken);
        emit TokenAddressUpdated(_dragonToken);
    }
    
    /**
     * @dev Sets the address to forward fees to (usually the lottery contract)
     * @param _forwardAddress Address to forward fees to
     */
    function setForwardAddress(address _forwardAddress) external onlyOwner {
        require(_forwardAddress != address(0), "Forward address cannot be zero");
        forwardAddress = _forwardAddress;
        emit ForwardAddressUpdated(_forwardAddress);
    }
    
    /**
     * @dev Receive wS tokens and forward them to the lottery contract
     * Can be called by anyone, but typically triggered by the Dragon token
     */
    function receiveAndForward() external {
        _receiveAndForward();
    }
    
    /**
     * @dev Implementation of receiveAndForward
     * Forwards any wS accumulated in this contract to the lottery
     */
    function _receiveAndForward() internal {
        require(forwardAddress != address(0), "Forward address not set");
        
        uint256 balance = wrappedSonic.balanceOf(address(this));
        require(balance > 0, "No wS to forward");
        
        totalReceived += balance;
        totalForwarded += balance;
        lastForwardTime = block.timestamp;
        
        // Forward tokens to lottery (typically)
        wrappedSonic.safeTransfer(forwardAddress, balance);
        
        // If the forward address is the lottery contract, try to increase jackpot directly
        try IDragonSwapTrigger(forwardAddress).addToJackpot(balance) {} catch {}
        
        emit TokensForwarded(forwardAddress, balance);
    }
    
    /**
     * @dev Manually trigger forwarding of tokens
     * Only callable by owner, provides a backup method
     */
    function triggerForward() external onlyOwner {
        _receiveAndForward();
    }
    
    /**
     * @dev Emergency withdrawal in case of issues
     * Only callable by owner
     */
    function emergencyWithdraw(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot withdraw to zero address");
        
        uint256 balance = wrappedSonic.balanceOf(address(this));
        uint256 withdrawAmount = amount > 0 && amount <= balance ? amount : balance;
        
        wrappedSonic.safeTransfer(to, withdrawAmount);
        emit EmergencyWithdrawal(to, withdrawAmount);
    }
    
    /**
     * @dev Fallback function to receive ETH and convert to wS
     * This allows direct ETH donations to the jackpot
     */
    receive() external payable {
        // ETH handling logic here if needed
        emit TokensReceived(msg.sender, msg.value);
    }
} 