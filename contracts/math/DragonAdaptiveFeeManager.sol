// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./HermesMath.sol";

/**
 * @title DragonAdaptiveFeeManager
 * @dev Manages adaptive fee allocation between jackpot and liquidity providers
 * using the Hermès formula to optimize for market conditions
 */
contract DragonAdaptiveFeeManager is Ownable {
    using SafeMath for uint256;
    
    // Constants for fixed-point arithmetic
    uint256 private constant PRECISION = 1e18;
    
    // Fee configuration
    uint256 public totalFee;            // Total fee percentage (scaled by 1e4, e.g. 1000 = 10%)
    uint256 public burnFee;             // Burn fee percentage (scaled by 1e4, fixed)
    
    // Hermès formula parameters
    uint256 public paramD;              // D parameter (scaled by 1e18)
    uint256 public paramN;              // N parameter (scaled by 1e18)
    
    // Current fee allocation
    uint256 public jackpotFee;          // Current jackpot fee (scaled by 1e4)
    uint256 public liquidityFee;        // Current LP fee (scaled by 1e4)
    
    // Market state tracking
    uint256 public jackpotSize;         // Current jackpot size
    uint256 public cumulativeVolume;    // Cumulative trading volume
    uint256 public dailyVolume;         // Approximate daily volume
    uint256 public lastVolumeReset;     // Timestamp of last volume reset
    uint256 public volumeUpdateInterval; // Interval between volume resets (seconds)
    
    // Update control
    uint256 public feeUpdateInterval;   // Minimum time between fee updates (seconds)
    uint256 public lastFeeUpdate;       // Timestamp of last fee update
    bool public adaptiveFeesEnabled;    // Whether adaptive fees are enabled
    
    // Events
    event FeeUpdated(uint256 jackpotFee, uint256 liquidityFee, uint256 burnFee, uint256 totalFee);
    event JackpotSizeUpdated(uint256 newSize);
    event VolumeUpdated(uint256 newVolume);
    event HermesParamsUpdated(uint256 paramD, uint256 paramN);
    event AdaptiveFeesToggled(bool enabled);
    
    /**
     * @dev Constructor
     * @param _totalFee Initial total fee (scaled by 1e4, e.g. 1000 = 10%)
     * @param _burnFee Fixed burn fee percentage (scaled by 1e4)
     * @param _initialJackpotFee Initial jackpot fee (scaled by 1e4)
     */
    constructor(
        uint256 _totalFee,
        uint256 _burnFee,
        uint256 _initialJackpotFee
    ) Ownable() {
        require(_totalFee > _burnFee, "Total fee must be greater than burn fee");
        require(_initialJackpotFee.add(_burnFee) <= _totalFee, "Fees exceed total fee");
        
        // Initialize fee structure
        totalFee = _totalFee;
        burnFee = _burnFee;
        jackpotFee = _initialJackpotFee;
        liquidityFee = _totalFee.sub(_initialJackpotFee).sub(_burnFee);
        
        // Initialize Hermès parameters
        paramD = 100 * PRECISION;  // D = 100
        paramN = 10 * PRECISION;   // N = 10
        
        // Initialize volume tracking
        lastVolumeReset = block.timestamp;
        volumeUpdateInterval = 1 days;
        feeUpdateInterval = 1 days;
        
        // Enable adaptive fees by default
        adaptiveFeesEnabled = true;
    }
    
    /**
     * @notice Update jackpot size (called when jackpot changes)
     * @param _newJackpotSize Current jackpot size
     */
    function updateJackpotSize(uint256 _newJackpotSize) external onlyOwner {
        jackpotSize = _newJackpotSize;
        emit JackpotSizeUpdated(_newJackpotSize);
        
        // Consider updating fees if conditions are met
        _maybeUpdateFees();
    }
    
    /**
     * @notice Add transaction volume
     * @param _volumeAmount Amount to add to volume tracking
     */
    function addVolume(uint256 _volumeAmount) external onlyOwner {
        // Add to cumulative volume
        cumulativeVolume = cumulativeVolume.add(_volumeAmount);
        
        // Add to daily volume approximation
        dailyVolume = dailyVolume.add(_volumeAmount);
        
        // Check if it's time to reset the daily volume counter
        if (block.timestamp >= lastVolumeReset.add(volumeUpdateInterval)) {
            // Update the daily volume metric
            lastVolumeReset = block.timestamp;
            emit VolumeUpdated(dailyVolume);
            
            // Reset daily volume counter
            dailyVolume = 0;
            
            // Consider updating fees if conditions are met
            _maybeUpdateFees();
        }
    }
    
    /**
     * @notice Force an update of fee allocation
     */
    function updateFees() external onlyOwner {
        _updateFees();
    }
    
    /**
     * @notice Get current fee percentages
     * @return _jackpotFee Current jackpot fee
     * @return _liquidityFee Current liquidity provider fee
     * @return _burnFee Current burn fee
     * @return _totalFee Total fee
     */
    function getFees() external view returns (
        uint256 _jackpotFee,
        uint256 _liquidityFee,
        uint256 _burnFee,
        uint256 _totalFee
    ) {
        return (jackpotFee, liquidityFee, burnFee, totalFee);
    }
    
    /**
     * @notice Calculate the optimal fee allocation based on current conditions
     * @param _jackpotSize Current jackpot size
     * @param _dailyVolume Approximate daily volume
     * @return _jackpotFee Calculated jackpot fee percentage (scaled by 1e4)
     * @return _liquidityFee Calculated liquidity fee percentage (scaled by 1e4)
     */
    function calculateAdaptiveFees(
        uint256 _jackpotSize,
        uint256 _dailyVolume
    ) public view returns (
        uint256 _jackpotFee,
        uint256 _liquidityFee
    ) {
        // If adaptive fees are disabled, return current fees
        if (!adaptiveFeesEnabled) {
            return (jackpotFee, liquidityFee);
        }
        
        // Calculate allocatable fee (total - burn)
        uint256 allocatableFee = totalFee.sub(burnFee);
        
        // Calculate the volume-to-jackpot ratio
        // (handle the zero jackpot case to avoid division by zero)
        uint256 volumeJackpotRatio;
        if (_jackpotSize == 0) {
            // When jackpot is zero, ratio is maximum (high to build jackpot)
            volumeJackpotRatio = 1000 * PRECISION; // An arbitrary high value
        } else {
            // Normalize values (scale down by 1e6 for formula stability)
            uint256 normalizedJackpot = _jackpotSize.div(1e6).add(1); // Min 1 to avoid division by zero
            uint256 normalizedVolume = _dailyVolume.div(1e6).add(1);  // Min 1 to avoid division by zero
            
            volumeJackpotRatio = normalizedVolume.mul(PRECISION).div(normalizedJackpot);
        }
        
        // Calculate Hermès value based on jackpot size
        uint256 normalizedJackpot = _jackpotSize > 0 ? _jackpotSize.div(1e6).add(1) : 1; // Scale to millions, min 1
        uint256 hermesValue = calculateHermesValue(normalizedJackpot);
        uint256 normalizedValue = hermesValue.mul(PRECISION).div(normalizedJackpot.add(hermesValue));
        
        // Calculate unbounded jackpot fee ratio directly from Hermès value
        // Lower hermesValue means higher jackpot fee ratio
        uint256 jackpotFeeRatio = PRECISION.sub(normalizedValue.div(2));
        
        // Adjust based on volume-to-jackpot ratio
        if (volumeJackpotRatio > PRECISION) {
            // Volume is higher than jackpot, increase jackpot allocation
            uint256 volumeAdjustment = volumeJackpotRatio.mul(5 * PRECISION / 100).div(PRECISION);
            jackpotFeeRatio = jackpotFeeRatio.add(volumeAdjustment);
        } else if (normalizedJackpot > 10) {
            // Very large jackpot, reduce jackpot allocation
            uint256 largeJackpotAdjustment = log10(normalizedJackpot).mul(5 * PRECISION / 100);
            if (jackpotFeeRatio > largeJackpotAdjustment) {
                jackpotFeeRatio = jackpotFeeRatio.sub(largeJackpotAdjustment);
            }
        }
        
        // Ensure jackpotFeeRatio doesn't exceed PRECISION
        if (jackpotFeeRatio > PRECISION) {
            jackpotFeeRatio = PRECISION;
        }
        
        // Calculate actual fee percentages from the ratio
        _jackpotFee = allocatableFee.mul(jackpotFeeRatio).div(PRECISION);
        _liquidityFee = allocatableFee.sub(_jackpotFee);
        
        return (_jackpotFee, _liquidityFee);
    }
    
    /**
     * @notice Calculate Hermès value for a given input
     * @param x Input value
     * @return Calculated Hermès value
     */
    function calculateHermesValue(uint256 x) internal view returns (uint256) {
        if (x == 0) return 0;
        
        // Use the Hermès formula implementation from the HermesMath library
        // Simplified approximation for gas efficiency
        uint256 x4 = x.mul(x).mul(x).mul(x).div(PRECISION.mul(PRECISION).mul(PRECISION));
        uint256 dTermExp = paramN.add(2 * PRECISION).div(PRECISION);
        uint256 dTerm = paramD;
        
        // Simplified exponentiation
        for (uint256 i = 1; i < dTermExp && i < 10; i++) {
            dTerm = dTerm.mul(paramD).div(PRECISION);
        }
        
        // Combine terms with appropriate scaling
        uint256 nTermFactor = paramN.mul(paramN).div(PRECISION);
        uint256 component1Numerator = x4.add(dTerm.div(nTermFactor.mul(x).div(PRECISION)));
        
        // Approximate cube root
        uint256 cubeRoot = approximateCubeRoot(component1Numerator);
        
        // Calculate component2 (x²/3cubeRoot)
        uint256 x2 = x.mul(x).div(PRECISION);
        uint256 component2 = x2.mul(PRECISION).div(cubeRoot.mul(3));
        
        // Return result (ensuring no underflow)
        if (component2 >= cubeRoot) return 0;
        return cubeRoot.sub(component2);
    }
    
    /**
     * @notice Approximate the cube root of a number
     * @param _value Value to calculate cube root of
     * @return Approximated cube root
     */
    function approximateCubeRoot(uint256 _value) internal pure returns (uint256) {
        if (_value == 0) return 0;
        if (_value == PRECISION) return PRECISION;
        
        // Start with a reasonable guess
        uint256 x = _value;
        uint256 y = _value;
        
        // Newton's method iteration (limited to avoid gas issues)
        for (uint256 i = 0; i < 8; i++) {
            // y = (2*x + _value/x^2)/3
            uint256 x2 = x.mul(x).div(PRECISION);
            if (x2 == 0) break;
            
            uint256 term1 = x.mul(2);
            uint256 term2 = _value.mul(PRECISION).div(x2).div(x);
            
            y = term1.add(term2).div(3);
            
            // Check for convergence (within 0.1%)
            if (y >= x) {
                if (y.sub(x) < PRECISION / 1000) break;
            } else {
                if (x.sub(y) < PRECISION / 1000) break;
            }
            
            x = y;
        }
        
        return x;
    }
    
    /**
     * @notice Calculate the base-10 logarithm of a number
     * @param x Value to calculate log10 of
     * @return Approximated log10 value (scaled by PRECISION)
     */
    function log10(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        
        uint256 result = 0;
        
        // Find the highest power of 10 <= x
        uint256 power = 1;
        uint256 exponent = 0;
        
        while (power.mul(10) <= x) {
            power = power.mul(10);
            exponent = exponent.add(1);
        }
        
        // The integer part of log10(x)
        result = exponent.mul(PRECISION);
        
        // Calculate fractional part (approximation)
        uint256 fraction = x.mul(PRECISION).div(power);
        if (fraction > PRECISION) {
            // Approximate ln(fraction)/ln(10) for 1 < fraction < 10
            // Using a simple approximation: ln(x)/ln(10) ≈ (x-1)/2.3 for x near 1
            uint256 adjustment = fraction.sub(PRECISION).mul(PRECISION).div(23 * PRECISION / 10);
            result = result.add(adjustment);
        }
        
        return result;
    }
    
    /**
     * @notice Update fees if conditions are met
     */
    function _maybeUpdateFees() internal {
        // Check if enough time has passed since last update
        if (block.timestamp >= lastFeeUpdate.add(feeUpdateInterval)) {
            _updateFees();
        }
    }
    
    /**
     * @notice Update fee allocation based on current conditions
     */
    function _updateFees() internal {
        // Skip if adaptive fees are disabled
        if (!adaptiveFeesEnabled) return;
        
        // Calculate new fees based on current conditions
        (uint256 newJackpotFee, uint256 newLiquidityFee) = calculateAdaptiveFees(
            jackpotSize,
            dailyVolume
        );
        
        // Update fees
        jackpotFee = newJackpotFee;
        liquidityFee = newLiquidityFee;
        lastFeeUpdate = block.timestamp;
        
        emit FeeUpdated(jackpotFee, liquidityFee, burnFee, totalFee);
    }
    
    /***************************************************************************
     *                              ADMIN FUNCTIONS                            *
     ***************************************************************************/
    
    /**
     * @notice Update Hermès formula parameters
     * @param _paramD New D parameter (scaled by 1e18)
     * @param _paramN New N parameter (scaled by 1e18)
     */
    function updateHermesParams(uint256 _paramD, uint256 _paramN) external onlyOwner {
        require(_paramD > 0, "D must be > 0");
        require(_paramN > 0, "N must be > 0");
        
        paramD = _paramD;
        paramN = _paramN;
        
        emit HermesParamsUpdated(_paramD, _paramN);
        
        // Update fees with new parameters
        _updateFees();
    }
    
    /**
     * @notice Update burn fee
     * @param _burnFee New burn fee (scaled by 1e4)
     */
    function updateBurnFee(uint256 _burnFee) external onlyOwner {
        require(_burnFee <= totalFee, "Burn fee exceeds total fee");
        
        burnFee = _burnFee;
        
        // Recalculate other fees to accommodate the new burn fee
        _updateFees();
    }
    
    /**
     * @notice Update total fee
     * @param _totalFee New total fee (scaled by 1e4)
     */
    function updateTotalFee(uint256 _totalFee) external onlyOwner {
        require(_totalFee >= burnFee, "Total fee < burn fee");
        require(_totalFee <= 2000, "Fee too high (max 20%)");
        
        totalFee = _totalFee;
        
        // Recalculate other fees
        _updateFees();
    }
    
    /**
     * @notice Set fee update interval
     * @param _intervalSeconds New interval in seconds
     */
    function setFeeUpdateInterval(uint256 _intervalSeconds) external onlyOwner {
        require(_intervalSeconds > 0, "Interval must be > 0");
        feeUpdateInterval = _intervalSeconds;
    }
    
    /**
     * @notice Set volume update interval
     * @param _intervalSeconds New interval in seconds
     */
    function setVolumeUpdateInterval(uint256 _intervalSeconds) external onlyOwner {
        require(_intervalSeconds > 0, "Interval must be > 0");
        volumeUpdateInterval = _intervalSeconds;
    }
    
    /**
     * @notice Toggle adaptive fees
     * @param _enabled Whether to enable adaptive fees
     */
    function setAdaptiveFeesEnabled(bool _enabled) external onlyOwner {
        adaptiveFeesEnabled = _enabled;
        emit AdaptiveFeesToggled(_enabled);
    }
    
    /**
     * @notice Set fixed fees (used when adaptive fees are disabled)
     * @param _jackpotFee Fixed jackpot fee
     * @param _liquidityFee Fixed liquidity fee
     */
    function setFixedFees(uint256 _jackpotFee, uint256 _liquidityFee) external onlyOwner {
        require(_jackpotFee.add(_liquidityFee).add(burnFee) == totalFee, "Fee sum must match total");
        
        jackpotFee = _jackpotFee;
        liquidityFee = _liquidityFee;
        
        emit FeeUpdated(jackpotFee, liquidityFee, burnFee, totalFee);
    }
}

 