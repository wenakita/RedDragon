const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PriceOracle", function () {
  let priceOracle;
  let owner;
  let source1;
  let source2;
  let source3;
  let user;

  const INITIAL_PRICE = 5000000; // $5.00 with 6 decimals
  const WSONIC_AMOUNT = ethers.utils.parseUnits("100", 18); // 100 wSonic

  beforeEach(async function () {
    [owner, source1, source2, source3, user] = await ethers.getSigners();

    // Deploy the PriceOracle
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    priceOracle = await PriceOracle.deploy(INITIAL_PRICE);
    await priceOracle.deployed();

    // Add authorized price sources
    await priceOracle.addPriceSource(source1.address);
    await priceOracle.addPriceSource(source2.address);
  });

  describe("Initialization", function() {
    it("should initialize with correct values", async function() {
      expect(await priceOracle.wSonicPriceUSD()).to.equal(INITIAL_PRICE);
      expect(await priceOracle.confidenceLevel()).to.equal(100);
      expect(await priceOracle.maxPriceDeviation()).to.equal(20);
      expect(await priceOracle.minConfidenceRequired()).to.equal(70);
      expect(await priceOracle.minSourcesRequired()).to.equal(1);
      
      // Check if price sources were added correctly
      expect(await priceOracle.authorizedSources(source1.address)).to.be.true;
      expect(await priceOracle.authorizedSources(source2.address)).to.be.true;
      expect(await priceOracle.authorizedSources(source3.address)).to.be.false;
    });
  });

  describe("Price Source Management", function() {
    it("should allow adding new price sources", async function() {
      // Add a new source
      await priceOracle.addPriceSource(source3.address);
      
      // Check if it was added
      expect(await priceOracle.authorizedSources(source3.address)).to.be.true;
      
      // Try adding the same source again
      await expect(
        priceOracle.addPriceSource(source3.address)
      ).to.be.revertedWith("Source already authorized");
    });
    
    it("should allow removing price sources", async function() {
      // Remove a source
      await priceOracle.removePriceSource(source1.address);
      
      // Check if it was removed
      expect(await priceOracle.authorizedSources(source1.address)).to.be.false;
      
      // Try removing a non-existent source
      await expect(
        priceOracle.removePriceSource(source3.address)
      ).to.be.revertedWith("Source not authorized");
    });
    
    it("should not allow non-owners to add or remove sources", async function() {
      await expect(
        priceOracle.connect(user).addPriceSource(source3.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      await expect(
        priceOracle.connect(user).removePriceSource(source1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Price Reporting", function() {
    it("should allow authorized sources to report prices", async function() {
      // Price reporting values
      const price1 = 5200000; // $5.20
      const confidence1 = 90; // 90% confidence
      
      // Report price from an authorized source
      await priceOracle.connect(source1).reportPrice(price1, confidence1);
      
      // Check the reported data
      const sourceData = await priceOracle.sourceData(source1.address);
      expect(sourceData.price).to.equal(price1);
      expect(sourceData.confidence).to.equal(confidence1);
    });
    
    it("should not allow unauthorized sources to report prices", async function() {
      const price = 5200000;
      const confidence = 90;
      
      // Try to report from an unauthorized source
      await expect(
        priceOracle.connect(source3).reportPrice(price, confidence)
      ).to.be.revertedWith("Not an authorized source");
    });
    
    it("should update the aggregated price when multiple sources report", async function() {
      // Initial values
      const initialPrice = await priceOracle.wSonicPriceUSD();
      
      // Report from source 1
      const price1 = 5200000; // $5.20
      const confidence1 = 90; // 90% confidence
      await priceOracle.connect(source1).reportPrice(price1, confidence1);
      
      // Report from source 2
      const price2 = 5300000; // $5.30
      const confidence2 = 85; // 85% confidence
      await priceOracle.connect(source2).reportPrice(price2, confidence2);
      
      // Check if the aggregated price was updated
      const newPrice = await priceOracle.wSonicPriceUSD();
      expect(newPrice).to.not.equal(initialPrice);
      
      // The new price should be a weighted average based on confidence
      // (5200000 * 90 + 5300000 * 85) / (90 + 85) = 5248571 (rounded)
      const expectedPrice = Math.floor((price1 * confidence1 + price2 * confidence2) / (confidence1 + confidence2));
      expect(newPrice).to.be.closeTo(expectedPrice, 10); // Allow small rounding difference
      
      // Check the new confidence level
      const newConfidence = await priceOracle.confidenceLevel();
      // Average confidence: (90 + 85) / 2 = 87.5 -> 87
      expect(newConfidence).to.be.closeTo(87, 1);
    });
  });

  describe("Safety Parameters", function() {
    it("should allow updating safety parameters", async function() {
      // New safety parameters
      const newMaxDeviation = 15; // 15%
      const newMinConfidence = 75; // 75%
      const newMinSources = 2; // Need at least 2 sources
      
      // Update parameters
      await priceOracle.updateSafetyParams(
        newMaxDeviation,
        newMinConfidence,
        newMinSources
      );
      
      // Check if parameters were updated
      expect(await priceOracle.maxPriceDeviation()).to.equal(newMaxDeviation);
      expect(await priceOracle.minConfidenceRequired()).to.equal(newMinConfidence);
      expect(await priceOracle.minSourcesRequired()).to.equal(newMinSources);
    });
    
    it("should validate safety parameter values", async function() {
      // Try to set invalid values
      await expect(
        priceOracle.updateSafetyParams(0, 70, 1)
      ).to.be.revertedWith("Deviation must be 1-50%");
      
      await expect(
        priceOracle.updateSafetyParams(20, 110, 1)
      ).to.be.revertedWith("Confidence must be 0-100");
      
      await expect(
        priceOracle.updateSafetyParams(20, 70, 0)
      ).to.be.revertedWith("Need at least 1 source");
    });
  });

  describe("Emergency Price Updates", function() {
    it("should allow owner to force a price update", async function() {
      // Report prices from sources
      await priceOracle.connect(source1).reportPrice(5200000, 90);
      await priceOracle.connect(source2).reportPrice(5300000, 85);
      
      // Force price update
      await priceOracle.forceUpdatePrice();
      
      // The price should have been updated based on reported values
      expect(await priceOracle.wSonicPriceUSD()).to.not.equal(INITIAL_PRICE);
    });
    
    it("should allow owner to update price in emergencies", async function() {
      const emergencyPrice = 5500000; // $5.50
      
      // Emergency update
      await priceOracle.emergencyUpdatePrice(emergencyPrice);
      
      // Check if price was updated
      expect(await priceOracle.wSonicPriceUSD()).to.equal(emergencyPrice);
      expect(await priceOracle.confidenceLevel()).to.equal(100); // Should be highest confidence
    });
    
    it("should emit PriceDeviationDetected when emergency price exceeds deviation threshold", async function() {
      // Set a price that exceeds the 20% deviation threshold
      const extremePrice = INITIAL_PRICE * 2; // 100% increase
      
      // Emergency update should still work but emit the event
      await expect(priceOracle.emergencyUpdatePrice(extremePrice))
        .to.emit(priceOracle, "PriceDeviationDetected");
      
      // Check that the price was still updated
      expect(await priceOracle.wSonicPriceUSD()).to.equal(extremePrice);
    });
  });

  describe("Price Conversion Functions", function() {
    it("should correctly convert wSonic to USD", async function() {
      // Set a known price
      const price = 5000000; // $5.00
      await priceOracle.emergencyUpdatePrice(price);
      
      // Calculate expected USD value
      // 100 wSonic * $5.00 = $500.00
      const expectedUSD = 500000000; // $500.00 with 6 decimals
      
      // Check conversion
      expect(await priceOracle.wSonicToUSD(WSONIC_AMOUNT)).to.equal(expectedUSD);
    });
    
    it("should correctly convert USD to wSonic", async function() {
      // Set a known price
      const price = 5000000; // $5.00
      await priceOracle.emergencyUpdatePrice(price);
      
      // USD amount to convert
      const usdAmount = 500000000; // $500.00 with 6 decimals
      
      // Calculate expected wSonic amount
      // $500.00 / $5.00 = 100 wSonic
      const expectedWSonic = ethers.utils.parseUnits("100", 18);
      
      // Check conversion
      expect(await priceOracle.usdToWSonic(usdAmount)).to.equal(expectedWSonic);
    });
  });

  describe("Time-Weighted Average Price (TWAP)", function() {
    it("should update TWAP data points correctly", async function() {
      // Set some initial price
      await priceOracle.emergencyUpdatePrice(5000000);
      
      // Fast-forward time
      await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
      await ethers.provider.send("evm_mine");
      
      // Set a new price
      await priceOracle.emergencyUpdatePrice(5500000);
      
      // Check TWAP data points
      // Expect at least 2 data points
      const lastIndex = await priceOracle.twapDataPoints(1);
      expect(lastIndex.cumulativePrice).to.equal(5500000);
      
      // Get TWAP value
      const twapPrice = await priceOracle.getTWAP();
      
      // It should be between the two price points
      expect(twapPrice).to.be.within(5000000, 5500000);
    });
  });
}); 