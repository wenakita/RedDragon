// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimplifiedJackpotVault
 * @dev Simplified jackpot vault for Dragon ecosystem
 */
contract SimplifiedJackpotVault is Ownable {
    using SafeERC20 for IERC20;

    address public wrappedSonic;
    address public dragonToken;
    uint256 public jackpotAmount;

    event JackpotIncreased(uint256 amount, uint256 newTotal);
    event JackpotAwarded(address indexed winner, uint256 amount);
    event TokenAddressSet(address tokenAddress);

    /**
     * @dev Constructor to initialize the vault with Wrapped Sonic address
     * @param _wrappedSonic The address of the Wrapped Sonic token
     * @param _owner The owner of the contract
     */
    constructor(address _wrappedSonic, address _owner) {
        require(_wrappedSonic != address(0), "Invalid wS address");
        wrappedSonic = _wrappedSonic;
        transferOwnership(_owner);
    }

    /**
     * @dev Sets the Dragon token address
     * @param _tokenAddress The Dragon token address
     */
    function setTokenAddress(address _tokenAddress) external onlyOwner {
        require(_tokenAddress != address(0), "Invalid token address");
        dragonToken = _tokenAddress;
        emit TokenAddressSet(_tokenAddress);
    }

    /**
     * @dev Adds funds to the jackpot
     * @param _amount The amount to add
     */
    function addToJackpot(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        
        IERC20(wrappedSonic).safeTransferFrom(msg.sender, address(this), _amount);
        jackpotAmount += _amount;
        
        emit JackpotIncreased(_amount, jackpotAmount);
    }

    /**
     * @dev Awards jackpot to a winner
     * @param _winner The winner's address
     * @param _amount The amount to award
     */
    function awardJackpot(address _winner, uint256 _amount) external onlyOwner {
        require(_winner != address(0), "Invalid winner address");
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount <= jackpotAmount, "Insufficient jackpot funds");
        
        jackpotAmount -= _amount;
        IERC20(wrappedSonic).safeTransfer(_winner, _amount);
        
        emit JackpotAwarded(_winner, _amount);
    }

    /**
     * @dev Returns the current jackpot amount
     * @return The jackpot amount
     */
    function getJackpotAmount() external view returns (uint256) {
        return jackpotAmount;
    }
} 