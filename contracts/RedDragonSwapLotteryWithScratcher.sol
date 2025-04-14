// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RedDragonSwapLottery.sol";
import "./interfaces/IGoldScratcher.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title RedDragonSwapLotteryWithScratcher
 * @dev Extended lottery contract that supports GoldScratcher boosts
 * Adds functionality to boost jackpot payouts for GoldScratcher NFT holders by 6.9%
 * This increases the winner's share from 69% to 75.9% of the jackpot
 */
contract RedDragonSwapLotteryWithScratcher is RedDragonSwapLottery {
    using SafeERC20 for IERC20;
    
    // GoldScratcher contract
    IGoldScratcher public goldScratcher;
    
    // Default jackpot percentage (69%)
    uint256 public constant DEFAULT_JACKPOT_PERCENTAGE = 6900; // 69% in basis points
    
    // Events
    event GoldScratcherSet(address indexed scratcherAddress);
    event ScratcherBoostApplied(address indexed winner, uint256 boostAmount);
    event JackpotDistributed(address indexed winner, uint256 amount);
    
    // Track winning scratcher token IDs for users
    mapping(address => uint256) public userWinningScratchers;
    
    /**
     * @dev Constructor
     * @param _wrappedSonic Address of the wrapped Sonic token
     * @param _verifier Address of the PaintSwap verifier
     */
    constructor(address _wrappedSonic, address _verifier) 
        RedDragonSwapLottery(_wrappedSonic, _verifier) {
        // Initialize with default values
    }
    
    /**
     * @dev Set the GoldScratcher contract address
     * @param _goldScratcher Address of the GoldScratcher contract
     */
    function setGoldScratcher(address _goldScratcher) external onlyOwner {
        require(_goldScratcher != address(0), "GoldScratcher cannot be zero address");
        goldScratcher = IGoldScratcher(_goldScratcher);
        emit GoldScratcherSet(_goldScratcher);
    }
    
    /**
     * @dev Register a winning scratcher for a user
     * @param user User's address
     * @param tokenId Token ID of the winning scratcher
     */
    function registerWinningScratcher(address user, uint256 tokenId) external {
        require(
            msg.sender == owner() || msg.sender == address(this) || msg.sender == address(goldScratcher),
            "Only owner, self, or scratcher"
        );
        require(user != address(0), "Cannot register for zero address");
        require(goldScratcher.hasWinningScratcher(user, tokenId), "Not a winning scratcher");
        userWinningScratchers[user] = tokenId;
    }
    
    /**
     * @dev Calculate total jackpot percentage including GoldScratcher boost if applicable
     * @param _user Address of the user
     * @return percentage Total jackpot percentage in basis points
     */
    function calculateJackpotPercentage(address _user) public view returns (uint256) {
        // Default jackpot percentage is 69%
        uint256 percentage = DEFAULT_JACKPOT_PERCENTAGE;
        
        // Add GoldScratcher boost if user has a winning scratcher and contract is set
        if (address(goldScratcher) != address(0)) {
            uint256 tokenId = userWinningScratchers[_user];
            percentage += goldScratcher.calculateBoost(_user, tokenId);
        }
        
        return percentage;
    }
    
    /**
     * @dev Override the distributeJackpot function to support GoldScratcher boosts
     * @param winner Address of the lottery winner
     * @param amount Base amount they would win without boost
     */
    function distributeJackpot(address winner, uint256 amount) external override {
        // Only callable by owner or exchange pair
        require(
            msg.sender == owner() || msg.sender == address(this),
            "Only owner or this contract can distribute jackpot"
        );
        
        if (winner == address(0)) return;
        
        // Calculate boost
        uint256 percentage = calculateJackpotPercentage(winner);
        uint256 boostedAmount = (amount * percentage) / 10000; // Apply percentage (basis points)
        
        // Emit boost event if applicable
        if (percentage > DEFAULT_JACKPOT_PERCENTAGE) {
            uint256 boostAmount = boostedAmount - ((amount * DEFAULT_JACKPOT_PERCENTAGE) / 10000);
            emit ScratcherBoostApplied(winner, boostAmount);
        }
        
        // Transfer the tokens
        wrappedSonic.safeTransfer(winner, boostedAmount);
        
        // Update stats
        totalWinners++;
        totalPayouts += boostedAmount;
        
        emit JackpotDistributed(winner, boostedAmount);
    }
    
    /**
     * @dev Implement getVRFConfiguration to satisfy the interface requirement
     */
    function getVRFConfiguration() external view override returns (
        address vrfCoordinator_,
        bytes32 keyHash_,
        uint64 subscriptionId_
    ) {
        if (address(verifier) != address(0)) {
            return verifier.getVRFConfiguration();
        }
        return (address(0), bytes32(0), 0);
    }
    
    /**
     * @dev Process a swap with an optional GoldScratcher boost
     * @param user User address
     * @param wsAmount Base wSonic amount
     * @param scratcherId Optional tokenId of GoldScratcher to apply (0 if none)
     */
    function processSwapWithScratcher(address user, uint256 wsAmount, uint256 scratcherId) external {
        require(msg.sender == owner() || msg.sender == address(this), "Not authorized");
        
        uint256 finalAmount = wsAmount;
        
        // If scratcherId is provided, apply the scratcher
        if (scratcherId > 0 && address(goldScratcher) != address(0)) {
            try goldScratcher.applyToSwap(scratcherId, wsAmount) returns (bool isWinner, uint256 boostedAmount) {
                if (isWinner) {
                    finalAmount = boostedAmount;
                    // Directly set the winning scratcher for this user instead of calling registerWinningScratcher
                    userWinningScratchers[user] = scratcherId;
                }
            } catch {
                // If applying the scratcher fails, continue with the original amount
            }
        }
        
        // Process the swap with the potentially boosted amount
        processBuy(user, finalAmount);
    }
} 