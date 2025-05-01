// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DragonProbabilityHelper
 * @dev Implements probability calculations for Dragon lottery system
 * Uses a linear USD-based model with ve69LP voting power boost using cubic root scaling
 */
contract DragonProbabilityHelper {
    // Constants for probability calculation
    uint256 public constant MIN_USD_AMOUNT = 1 ether;         // $1 minimum
    uint256 public constant MAX_USD_AMOUNT = 10000 ether;     // $10,000 maximum
    uint256 public constant MIN_PROBABILITY = 4;              // 0.0004% (4 in 1,000,000)
    uint256 public constant MAX_PROBABILITY = 40000;          // 4% (40,000 in 1,000,000)
    uint256 public constant PROBABILITY_SCALE = 1000000;      // Scale for probability calculation
    uint256 public constant MAX_BOOST_BPS = 25000;            // 250% maximum boost (25,000 / 10,000)
    uint256 public constant BPS_SCALE = 10000;                // Basis points scale
    
    // Configuration for ve69LP boost
    uint256 public maxVotingPower;                            // Maximum voting power reference
    
    // Cube root precision constants for integer calculations
    uint256 private constant CUBE_ROOT_PRECISION = 1000000;   // 6 decimal places
    
    /**
     * @dev Constructor to set the maximum voting power
     * @param _maxVotingPower The maximum voting power reference value
     */
    constructor(uint256 _maxVotingPower) {
        require(_maxVotingPower > 0, "Max voting power must be positive");
        maxVotingPower = _maxVotingPower;
    }
    
    /**
     * @notice Calculate the base probability based on USD amount
     * @param _usdAmount The USD value of the swap (in wei, 18 decimals)
     * @return probability The base probability (scaled by PROBABILITY_SCALE)
     */
    function calculateBaseProbability(uint256 _usdAmount) public pure returns (uint256) {
        // Clamp USD amount to min/max
        uint256 usdAmount = _usdAmount;
        if (usdAmount < MIN_USD_AMOUNT) {
            usdAmount = MIN_USD_AMOUNT;
        } else if (usdAmount > MAX_USD_AMOUNT) {
            usdAmount = MAX_USD_AMOUNT;
        }
        
        // Linear interpolation between min and max probability
        uint256 usdRange = MAX_USD_AMOUNT - MIN_USD_AMOUNT;
        uint256 probRange = MAX_PROBABILITY - MIN_PROBABILITY;
        
        uint256 usdDelta = usdAmount - MIN_USD_AMOUNT;
        uint256 probability = MIN_PROBABILITY + (usdDelta * probRange / usdRange);
        
        return probability;
    }
    
    /**
     * @notice Calculate the voting power boost using cube root scaling
     * @param _votingPower The user's voting power
     * @return boost The boost factor in basis points (10000 = 1.0x)
     */
    function calculateBoost(uint256 _votingPower) public view returns (uint256) {
        // No voting power = no boost
        if (_votingPower == 0 || maxVotingPower == 0) {
            return BPS_SCALE; // 1.0x boost (10000 basis points)
        }
        
        // Calculate normalized voting power (with capped maximum)
        uint256 normalizedVP = _votingPower > maxVotingPower
            ? CUBE_ROOT_PRECISION
            : (_votingPower * CUBE_ROOT_PRECISION) / maxVotingPower;
        
        // Calculate cube root
        uint256 cubeRoot = computeCubeRoot(normalizedVP);
        
        // Scale to boost factor (1.0x + boost factor * max boost)
        uint256 boostFactor = cubeRoot * (MAX_BOOST_BPS - BPS_SCALE) / CUBE_ROOT_PRECISION;
        uint256 boost = BPS_SCALE + boostFactor;
        
        return boost;
    }
    
    /**
     * @notice Calculate the win probability for a user
     * @param _usdAmount The USD value of the swap
     * @param _votingPower The user's voting power
     * @return probability The win probability (scaled by PROBABILITY_SCALE)
     */
    function calculateWinProbability(uint256 _usdAmount, uint256 _votingPower) external view returns (uint256) {
        uint256 baseProbability = calculateBaseProbability(_usdAmount);
        uint256 boost = calculateBoost(_votingPower);
        
        // Apply boost to base probability
        return (baseProbability * boost) / BPS_SCALE;
    }
    
    /**
     * @notice Determine if user wins based on VRF randomness
     * @param _randomness The VRF randomness value
     * @param _usdAmount The USD value of the swap
     * @param _votingPower The user's voting power
     * @return isWinner Whether the user won
     */
    function isWinner(uint256 _randomness, uint256 _usdAmount, uint256 _votingPower) external view returns (bool) {
        // Scale randomness to range [0, PROBABILITY_SCALE]
        uint256 scaledRandom = _randomness % PROBABILITY_SCALE;
        
        // Calculate win probability
        uint256 winProbability = this.calculateWinProbability(_usdAmount, _votingPower);
        
        // User wins if scaled random is less than win probability
        return scaledRandom < winProbability;
    }
    
    /**
     * @notice Compute the cube root of a fixed point number (with CUBE_ROOT_PRECISION decimals)
     * @dev Uses Newton's method for approximation
     * @param _x The input value (fixed point with CUBE_ROOT_PRECISION decimals)
     * @return cubeRoot The cube root (fixed point with CUBE_ROOT_PRECISION decimals)
     */
    function computeCubeRoot(uint256 _x) public pure returns (uint256) {
        if (_x == 0) return 0;
        if (_x == CUBE_ROOT_PRECISION) return CUBE_ROOT_PRECISION;
        
        // For small values, use precalculated estimates to save gas
        if (_x <= CUBE_ROOT_PRECISION) {
            // These values are precomputed cube roots for common percentages
            if (_x == CUBE_ROOT_PRECISION / 100) return 464159;      // 1%
            if (_x == CUBE_ROOT_PRECISION / 20) return 693361;       // 5%
            if (_x == CUBE_ROOT_PRECISION / 10) return 794328;       // 10%
            if (_x == CUBE_ROOT_PRECISION / 4) return 928268;        // 25%
            if (_x == CUBE_ROOT_PRECISION / 2) return 1000000 * 793 / 1000; // 50%
            if (_x == CUBE_ROOT_PRECISION * 3 / 4) return 1000000 * 908 / 1000; // 75%
        }
        
        // Initial guess - Use approximation formula for better convergence
        uint256 y = (_x + 2 * CUBE_ROOT_PRECISION) / 3;
        
        // Newton's method iterations (typically converges in 5-7 iterations)
        // y = y - (y^3 - x) / (3 * y^2)
        uint256 yPrev = 0;
        
        // Run until convergence or max iterations
        for (uint256 i = 0; i < 10 && y != yPrev; i++) {
            yPrev = y;
            
            // Calculate y^2 and y^3 with proper scaling
            uint256 ySq = (y * y) / CUBE_ROOT_PRECISION;
            uint256 yCb = (ySq * y) / CUBE_ROOT_PRECISION;
            
            // Calculate (y^3 - x) / (3 * y^2) with care to prevent underflow
            uint256 numerator;
            if (yCb > _x) {
                numerator = yCb - _x;
            } else {
                // If our guess is too small, adjust upward
                numerator = 0;
            }
            
            uint256 denominator = 3 * ySq;
            
            // Protect against division by zero
            if (denominator == 0) break;
            
            uint256 delta = numerator / denominator;
            
            // Update y for next iteration
            if (delta >= y) {
                // Prevent underflow - this shouldn't happen with proper initial guess
                y = y / 2;
            } else {
                y = y - delta;
            }
        }
        
        return y;
    }
    
    /**
     * @notice Update the maximum voting power reference
     * @param _maxVotingPower The new maximum voting power value
     */
    function setMaxVotingPower(uint256 _maxVotingPower) external {
        require(_maxVotingPower > 0, "Max voting power must be positive");
        maxVotingPower = _maxVotingPower;
    }
} 