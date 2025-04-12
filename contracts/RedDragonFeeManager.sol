// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IVe8020FeeDistributor.sol";
import "./interfaces/IRedDragonSwapLottery.sol";

/**
 * @title RedDragonFeeManager
 * @dev This contract manages the fee distribution from the RedDragon token
 * Redirects a portion of transaction fees to the ve8020 fee distributor
 * for distribution to ve(80/20) holders based on their voting power
 */
contract RedDragonFeeManager is Ownable, ReentrancyGuard {
    // State variables
    IERC20 public dragonToken;
    IVe8020FeeDistributor public veDistributor;
    address public jackpotAddress;
    address public burnAddress;
    
    // Lottery contract
    IRedDragonSwapLottery public lottery;
    
    // Events
    event FeesDistributed(uint256 totalAmount, uint256 veDistributorAmount, uint256 jackpotAmount, uint256 burnAmount);
    event VeDistributorUpdated(address indexed newDistributor);
    event JackpotAddressUpdated(address indexed newJackpot);
    event BurnAddressUpdated(address indexed newBurn);
    event LotteryUpdated(address indexed newLottery);
    
    /**
     * @dev Constructor
     * @param _dragonToken Address of the DRAGON token
     * @param _veDistributor Address of the ve8020 fee distributor
     * @param _jackpotAddress Address where jackpot fees will be sent
     * @param _burnAddress Address where burn fees will be sent
     */
    constructor(
        address _dragonToken,
        address _veDistributor,
        address _jackpotAddress,
        address _burnAddress
    ) {
        require(_dragonToken != address(0), "DRAGON token address cannot be zero");
        require(_veDistributor != address(0), "veDistributor address cannot be zero");
        require(_jackpotAddress != address(0), "Jackpot address cannot be zero");
        require(_burnAddress != address(0), "Burn address cannot be zero");
        
        dragonToken = IERC20(_dragonToken);
        veDistributor = IVe8020FeeDistributor(_veDistributor);
        jackpotAddress = _jackpotAddress;
        burnAddress = _burnAddress;
    }
    
    /**
     * @dev Distribute fees according to the new model
     * @param jackpotShare Amount of tokens for jackpot
     * @param veDistributorShare Amount of tokens for ve8020 holders
     * @param burnShare Amount of tokens for burning
     */
    function distributeFees(
        uint256 jackpotShare,
        uint256 veDistributorShare,
        uint256 burnShare
    ) external nonReentrant {
        // Calculate total fee amount
        uint256 totalAmount = jackpotShare + veDistributorShare + burnShare;
        
        // Ensure caller has approved enough tokens
        require(dragonToken.allowance(msg.sender, address(this)) >= totalAmount, "Insufficient allowance");
        
        // Transfer tokens from caller to this contract
        require(dragonToken.transferFrom(msg.sender, address(this), totalAmount), "Transfer failed");
        
        // Send tokens to burn address
        if (burnShare > 0) {
            require(dragonToken.transfer(burnAddress, burnShare), "Burn transfer failed");
        }
        
        // Send tokens to jackpot
        if (jackpotShare > 0) {
            require(dragonToken.transfer(jackpotAddress, jackpotShare), "Jackpot transfer failed");
            
            // If lottery is set, also update its jackpot
            if (address(lottery) != address(0)) {
                try lottery.addToJackpot(jackpotShare) {} catch {}
            }
        }
        
        // Send fees to ve8020 distributor
        if (veDistributorShare > 0) {
            // Approve the fee distributor to take tokens
            dragonToken.approve(address(veDistributor), veDistributorShare);
            
            // Add rewards to the distributor
            try veDistributor.addRewards(veDistributorShare) {} catch {
                // If direct transfer fails, send tokens to the distributor
                require(dragonToken.transfer(address(veDistributor), veDistributorShare), "Distributor transfer failed");
                // Try to call receiveRewards directly
                try veDistributor.receiveRewards(veDistributorShare) {} catch {}
            }
        }
        
        emit FeesDistributed(totalAmount, veDistributorShare, jackpotShare, burnShare);
    }
    
    /**
     * @dev Update the veDistributor address
     * @param _veDistributor New veDistributor address
     */
    function setVeDistributor(address _veDistributor) external onlyOwner {
        require(_veDistributor != address(0), "veDistributor address cannot be zero");
        veDistributor = IVe8020FeeDistributor(_veDistributor);
        emit VeDistributorUpdated(_veDistributor);
    }
    
    /**
     * @dev Update the jackpot address
     * @param _jackpotAddress New jackpot address
     */
    function setJackpotAddress(address _jackpotAddress) external onlyOwner {
        require(_jackpotAddress != address(0), "Jackpot address cannot be zero");
        jackpotAddress = _jackpotAddress;
        emit JackpotAddressUpdated(_jackpotAddress);
    }
    
    /**
     * @dev Update the burn address
     * @param _burnAddress New burn address
     */
    function setBurnAddress(address _burnAddress) external onlyOwner {
        require(_burnAddress != address(0), "Burn address cannot be zero");
        burnAddress = _burnAddress;
        emit BurnAddressUpdated(_burnAddress);
    }
    
    /**
     * @dev Set the lottery contract
     * @param _lottery New lottery contract address
     */
    function setLottery(address _lottery) external onlyOwner {
        lottery = IRedDragonSwapLottery(_lottery);
        emit LotteryUpdated(_lottery);
    }
} 