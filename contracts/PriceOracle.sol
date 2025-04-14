// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title PriceOracle
 * @dev Enhanced price oracle contract for wSonic/USD conversion with
 * time-weighted average prices, multi-source support, and safety checks
 */
contract PriceOracle is Ownable, ReentrancyGuard {
    using Math for uint256;
    
    // Price data structure
    struct PriceData {
        uint256 price;       // Price in USD (6 decimals)
        uint256 timestamp;   // Timestamp of the update
        uint256 confidence;  // Confidence level 0-100
    }
    
    // Price sources
    mapping(address => bool) public authorizedSources;
    address[] public priceSources;
    mapping(address => PriceData) public sourceData;
    
    // TWAP data
    uint256 public constant TWAP_PERIOD = 1 hours;
    uint256 public constant MAX_PRICE_AGE = 2 hours;
    struct TWAPData {
        uint256 cumulativePrice;
        uint256 timestamp;
    }
    TWAPData[] public twapDataPoints;
    uint256 public lastTWAPUpdate;
    
    // Current aggregated values
    uint256 public wSonicPriceUSD;
    uint256 public confidenceLevel;
    uint256 public lastUpdateTimestamp;
    
    // Safety parameters
    uint256 public maxPriceDeviation = 20; // 20% max deviation between updates
    uint256 public minConfidenceRequired = 70; // 70% minimum confidence for validity
    uint256 public minSourcesRequired = 1; // Minimum sources needed for valid price
    
    // Events
    event PriceSourceAdded(address indexed source);
    event PriceSourceRemoved(address indexed source);
    event PriceReported(address indexed source, uint256 price, uint256 confidence);
    event PriceUpdated(uint256 oldPrice, uint256 newPrice, uint256 confidence);
    event SafetyParamsUpdated(uint256 maxDeviation, uint256 minConfidence, uint256 minSources);
    event PriceDeviationDetected(uint256 oldPrice, uint256 reportedPrice, uint256 deviation);
    
    /**
     * @dev Constructor
     * @param initialPrice Initial wSonic price in USD with 6 decimals
     */
    constructor(uint256 initialPrice) {
        require(initialPrice > 0, "Initial price must be positive");
        wSonicPriceUSD = initialPrice;
        confidenceLevel = 100; // Initial confidence is high
        lastUpdateTimestamp = block.timestamp;
        
        // Initialize TWAP
        twapDataPoints.push(TWAPData({
            cumulativePrice: initialPrice,
            timestamp: block.timestamp
        }));
        lastTWAPUpdate = block.timestamp;
    }
    
    /**
     * @dev Add an authorized price source
     * @param source Address allowed to report prices
     */
    function addPriceSource(address source) external onlyOwner {
        require(source != address(0), "Invalid source address");
        require(!authorizedSources[source], "Source already authorized");
        
        authorizedSources[source] = true;
        priceSources.push(source);
        emit PriceSourceAdded(source);
    }
    
    /**
     * @dev Remove a price source
     * @param source Address to remove
     */
    function removePriceSource(address source) external onlyOwner {
        require(authorizedSources[source], "Source not authorized");
        
        authorizedSources[source] = false;
        
        // Remove from the array
        for (uint256 i = 0; i < priceSources.length; i++) {
            if (priceSources[i] == source) {
                priceSources[i] = priceSources[priceSources.length - 1];
                priceSources.pop();
                break;
            }
        }
        
        delete sourceData[source];
        emit PriceSourceRemoved(source);
    }
    
    /**
     * @dev Report a price from an authorized source
     * @param price Price in USD with 6 decimals
     * @param confidence Confidence level 0-100
     */
    function reportPrice(uint256 price, uint256 confidence) external {
        require(authorizedSources[msg.sender], "Not an authorized source");
        require(price > 0, "Price must be positive");
        require(confidence <= 100, "Confidence must be 0-100");
        
        // Store the reported data
        sourceData[msg.sender] = PriceData({
            price: price,
            timestamp: block.timestamp,
            confidence: confidence
        });
        
        emit PriceReported(msg.sender, price, confidence);
        
        // Try to update the aggregated price
        _updateAggregatedPrice();
    }
    
    /**
     * @dev Update price parameters
     * @param maxDeviation Maximum allowed deviation between updates (percentage)
     * @param minConfidence Minimum confidence required for valid price
     * @param minSources Minimum number of sources required
     */
    function updateSafetyParams(
        uint256 maxDeviation,
        uint256 minConfidence,
        uint256 minSources
    ) external onlyOwner {
        require(maxDeviation > 0 && maxDeviation <= 50, "Deviation must be 1-50%");
        require(minConfidence <= 100, "Confidence must be 0-100");
        require(minSources > 0, "Need at least 1 source");
        
        maxPriceDeviation = maxDeviation;
        minConfidenceRequired = minConfidence;
        minSourcesRequired = minSources;
        
        emit SafetyParamsUpdated(maxDeviation, minConfidence, minSources);
    }
    
    /**
     * @dev Force an update of the aggregated price
     */
    function forceUpdatePrice() external onlyOwner {
        _updateAggregatedPrice();
    }
    
    /**
     * @dev Manually update the price (only for emergency)
     * @param newPrice New wSonic price in USD with 6 decimals
     */
    function emergencyUpdatePrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Price must be positive");
        
        // Check for excessive deviation
        uint256 deviation = _calculateDeviation(wSonicPriceUSD, newPrice);
        if (deviation > maxPriceDeviation) {
            emit PriceDeviationDetected(wSonicPriceUSD, newPrice, deviation);
        }
        
        uint256 oldPrice = wSonicPriceUSD;
        wSonicPriceUSD = newPrice;
        lastUpdateTimestamp = block.timestamp;
        confidenceLevel = 100; // Manual update has high confidence
        
        // Update TWAP
        _updateTWAP(newPrice);
        
        emit PriceUpdated(oldPrice, newPrice, confidenceLevel);
    }
    
    /**
     * @dev Get time-weighted average price
     * @return TWAP price with 6 decimals
     */
    function getTWAP() public view returns (uint256) {
        if (twapDataPoints.length < 2) {
            return wSonicPriceUSD;
        }
        
        uint256 timeWeightedPrice = 0;
        uint256 totalTime = 0;
        
        for (uint256 i = 1; i < twapDataPoints.length; i++) {
            TWAPData memory current = twapDataPoints[i];
            TWAPData memory previous = twapDataPoints[i-1];
            
            uint256 timeInterval = current.timestamp - previous.timestamp;
            uint256 avgPrice = (current.cumulativePrice + previous.cumulativePrice) / 2;
            
            timeWeightedPrice += avgPrice * timeInterval;
            totalTime += timeInterval;
        }
        
        if (totalTime == 0) {
            return wSonicPriceUSD;
        }
        
        return timeWeightedPrice / totalTime;
    }
    
    /**
     * @dev Convert USD amount to wSonic using TWAP for better manipulation resistance
     * @param usdAmount USD amount with 6 decimals
     * @return wSonic amount in wei (18 decimals)
     */
    function usdToWSonic(uint256 usdAmount) external view returns (uint256) {
        uint256 price = getTWAP();
        require(price > 0, "Price not set");
        
        // Convert USD to wSonic: (usdAmount * 10^18) / price
        return (usdAmount * 1e18) / price;
    }
    
    /**
     * @dev Convert wSonic amount to USD using TWAP
     * @param wSonicAmount wSonic amount in wei (18 decimals)
     * @return USD amount with 6 decimals
     */
    function wSonicToUSD(uint256 wSonicAmount) external view returns (uint256) {
        uint256 price = getTWAP();
        require(price > 0, "Price not set");
        
        // Convert wSonic to USD: (wSonicAmount * price) / 10^18
        return (wSonicAmount * price) / 1e18;
    }
    
    /**
     * @dev Check if the price is valid and not stale
     * @return True if the price is valid
     */
    function isPriceValid() external view returns (bool) {
        return _isPriceValid();
    }
    
    /**
     * @dev Calculate percentage deviation between two prices
     * @param oldPrice Previous price
     * @param newPrice New price
     * @return Deviation as a percentage
     */
    function _calculateDeviation(uint256 oldPrice, uint256 newPrice) private pure returns (uint256) {
        if (oldPrice == 0) return 0;
        
        uint256 difference = oldPrice > newPrice ? 
            oldPrice - newPrice : 
            newPrice - oldPrice;
            
        return (difference * 100) / oldPrice;
    }
    
    /**
     * @dev Check if the current price is valid and not stale
     * @return True if the price is valid
     */
    function _isPriceValid() private view returns (bool) {
        // Check if price is stale
        if (block.timestamp - lastUpdateTimestamp > MAX_PRICE_AGE) {
            return false;
        }
        
        // Check confidence level
        if (confidenceLevel < minConfidenceRequired) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev Update the TWAP data
     * @param newPrice New price to add to TWAP
     */
    function _updateTWAP(uint256 newPrice) private {
        // Only update once per hour at most
        if (block.timestamp - lastTWAPUpdate < TWAP_PERIOD) {
            return;
        }
        
        // Add new data point
        twapDataPoints.push(TWAPData({
            cumulativePrice: newPrice,
            timestamp: block.timestamp
        }));
        
        // Keep only data points from the past 24 hours
        uint256 cutoffTime = block.timestamp - 24 hours;
        uint256 i = 0;
        
        while (i < twapDataPoints.length && twapDataPoints[i].timestamp < cutoffTime) {
            i++;
        }
        
        if (i > 0) {
            // Remove old data points but keep at least one historical point
            uint256 newLength = twapDataPoints.length - i;
            for (uint256 j = 0; j < newLength; j++) {
                twapDataPoints[j] = twapDataPoints[j + i];
            }
            
            for (uint256 j = 0; j < i; j++) {
                twapDataPoints.pop();
            }
        }
        
        lastTWAPUpdate = block.timestamp;
    }
    
    /**
     * @dev Aggregate prices from all sources and update the price if valid
     */
    function _updateAggregatedPrice() private {
        // Count valid sources
        uint256 validSources = 0;
        uint256 totalPrice = 0;
        uint256 totalConfidence = 0;
        
        for (uint256 i = 0; i < priceSources.length; i++) {
            address source = priceSources[i];
            if (!authorizedSources[source]) continue;
            
            PriceData memory data = sourceData[source];
            if (data.price == 0 || block.timestamp - data.timestamp > MAX_PRICE_AGE) {
                continue;
            }
            
            validSources++;
            totalPrice += data.price * data.confidence; // Weight by confidence
            totalConfidence += data.confidence;
        }
        
        // Check if we have enough sources
        if (validSources < minSourcesRequired) {
            return;
        }
        
        // Calculate weighted average price
        uint256 newPrice = totalPrice / totalConfidence;
        uint256 newConfidence = totalConfidence / validSources;
        
        // Check for excessive deviation
        uint256 deviation = _calculateDeviation(wSonicPriceUSD, newPrice);
        if (deviation > maxPriceDeviation) {
            emit PriceDeviationDetected(wSonicPriceUSD, newPrice, deviation);
            return; // Don't update price if deviation is too high
        }
        
        // Update price
        uint256 oldPrice = wSonicPriceUSD;
        wSonicPriceUSD = newPrice;
        confidenceLevel = newConfidence;
        lastUpdateTimestamp = block.timestamp;
        
        // Update TWAP
        _updateTWAP(newPrice);
        
        emit PriceUpdated(oldPrice, newPrice, confidenceLevel);
    }
} 