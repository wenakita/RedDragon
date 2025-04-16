// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IDragonLotterySwap.sol";

contract DragonLPBooster is Ownable {
    // LP token used for determining boost eligibility
    IERC20 public lpToken;
    // DragonLotterySwap contract reference
    IDragonLotterySwap public lottery;
    
    // Minimum LP amount required for boost eligibility
    uint256 public minLpAmount;
    
    // Maximum probability boost cap
    uint256 public maxBoostPercentage = 1000; // 10% max boost
    
    // Boost percentage for flat (non-tiered) boost
    uint256 public boostPercentage = 100; // Default 1% boost
    
    // LP tiers for different boost levels (optional)
    struct BoostTier {
        uint256 minLpAmount;
        uint256 boostPercentage;
    }
    
    BoostTier[] public boostTiers;
    bool public useTiers = false;
    
    // Events
    event BoostParametersUpdated(uint256 boostPercentage, uint256 minLpAmount);
    event TierAdded(uint256 tierIndex, uint256 minLpAmount, uint256 boostPercentage);
    event TiersEnabled(bool enabled);
    event LotteryAddressUpdated(address lotteryAddress);
    event LPTokenAddressUpdated(address lpTokenAddress);
    
    /**
     * @dev Constructor
     * @param _lpToken Address of the LP token
     * @param _lottery Address of the lottery contract
     * @param _minLpAmount Minimum LP amount required for boost
     */
    constructor(address _lpToken, address _lottery, uint256 _minLpAmount) {
        require(_lpToken != address(0), "LP token address cannot be zero");
        require(_lottery != address(0), "Lottery address cannot be zero");
        
        lpToken = IERC20(_lpToken);
        lottery = IDragonLotterySwap(_lottery);
        minLpAmount = _minLpAmount;
    }
    
    /**
     * @dev Calculate boost for a user based on their LP holdings
     * @param user Address to calculate boost for
     * @return Boost amount in lottery probability units
     */
    function calculateBoost(address user) public view returns (uint256) {
        uint256 lpBalance = lpToken.balanceOf(user);
        
        // If user doesn't have minimum LP, no boost
        if (lpBalance < minLpAmount) {
            return 0;
        }
        
        // Use tiered boosting if enabled
        if (useTiers && boostTiers.length > 0) {
            return calculateTieredBoost(lpBalance);
        }
        
        // Otherwise use flat boost percentage
        return boostPercentage;
    }
    
    /**
     * @dev Calculate boost based on LP tiers
     * @param lpBalance LP token balance of the user
     * @return Boost amount in lottery probability units
     */
    function calculateTieredBoost(uint256 lpBalance) internal view returns (uint256) {
        // Start with no boost
        uint256 boost = 0;
        
        // Find the highest tier the user qualifies for
        for (uint256 i = 0; i < boostTiers.length; i++) {
            if (lpBalance >= boostTiers[i].minLpAmount) {
                boost = boostTiers[i].boostPercentage;
            } else {
                break;
            }
        }
        
        // Cap boost at maximum allowed
        return boost > maxBoostPercentage ? maxBoostPercentage : boost;
    }
    
    /**
     * @dev Set boost parameters
     * @param _boostPercentage New boost percentage (multiply by precision)
     * @param _minLpAmount New minimum LP amount required
     */
    function setBoostParameters(uint256 _boostPercentage, uint256 _minLpAmount) external onlyOwner {
        require(_boostPercentage <= maxBoostPercentage, "Boost exceeds maximum allowed");
        
        boostPercentage = _boostPercentage;
        minLpAmount = _minLpAmount;
        
        emit BoostParametersUpdated(_boostPercentage, _minLpAmount);
    }
    
    /**
     * @dev Set maximum boost percentage cap
     * @param _maxBoostPercentage New maximum boost percentage
     */
    function setMaxBoostPercentage(uint256 _maxBoostPercentage) external onlyOwner {
        require(_maxBoostPercentage <= 5000, "Max boost cannot exceed 50%");
        maxBoostPercentage = _maxBoostPercentage;
    }
    
    /**
     * @dev Add a new boost tier
     * @param _minLpAmount Minimum LP amount for this tier
     * @param _boostPercentage Boost percentage for this tier
     */
    function addBoostTier(uint256 _minLpAmount, uint256 _boostPercentage) external onlyOwner {
        require(_boostPercentage <= maxBoostPercentage, "Boost exceeds maximum allowed");
        
        // If adding first tier, make sure it matches the global minimum
        if (boostTiers.length == 0) {
            require(_minLpAmount == minLpAmount, "First tier minimum must match global minimum");
        } else {
            // Otherwise ensure tiers are in ascending order
            require(_minLpAmount > boostTiers[boostTiers.length - 1].minLpAmount, "Tiers must be in ascending order");
        }
        
        boostTiers.push(BoostTier({
            minLpAmount: _minLpAmount,
            boostPercentage: _boostPercentage
        }));
        
        emit TierAdded(boostTiers.length - 1, _minLpAmount, _boostPercentage);
    }
    
    /**
     * @dev Enable or disable tiered boosting
     * @param _useTiers Whether to use tiered boosting
     */
    function setUseTiers(bool _useTiers) external onlyOwner {
        // If enabling tiers, ensure at least one tier exists
        if (_useTiers) {
            require(boostTiers.length > 0, "No tiers defined");
        }
        
        useTiers = _useTiers;
        emit TiersEnabled(_useTiers);
    }
    
    /**
     * @dev Set lottery contract address
     * @param _lottery New lottery contract address
     */
    function setLotteryAddress(address _lottery) external onlyOwner {
        require(_lottery != address(0), "Lottery address cannot be zero");
        lottery = IDragonLotterySwap(_lottery);
        emit LotteryAddressUpdated(_lottery);
    }
    
    /**
     * @dev Set LP token address
     * @param _lpToken New LP token address
     */
    function setLpTokenAddress(address _lpToken) external onlyOwner {
        require(_lpToken != address(0), "LP token address cannot be zero");
        lpToken = IERC20(_lpToken);
        emit LPTokenAddressUpdated(_lpToken);
    }
    
    /**
     * @dev Get number of boost tiers
     * @return Number of defined boost tiers
     */
    function getBoostTiersCount() external view returns (uint256) {
        return boostTiers.length;
    }
} 