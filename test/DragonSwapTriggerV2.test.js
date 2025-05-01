const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DragonSwapTriggerV2", function () {
  let dragonSwapTrigger;
  let wrappedToken;
  let dragonToken;
  let vrfConsumer;
  let chainlinkFeed;
  let pythOracle;
  let owner;
  let user1;
  let user2;
  
  const PYTH_PRICE_ID = "0xb2748e718cf3a75b0ca099cb467aea6aa8f7d960b381b3970769b5a2d6be26dc";
  const MIN_SWAP_AMOUNT = ethers.utils.parseEther("10");
  
  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    wrappedToken = await MockERC20.deploy("Wrapped Sonic", "wS", 18);
    dragonToken = await MockERC20.deploy("Dragon", "DRAGON", 18);
    
    // Deploy mock VRF consumer
    const MockVRFConsumer = await ethers.getContractFactory("MockVRFConsumer");
    vrfConsumer = await MockVRFConsumer.deploy();
    
    // Deploy mock oracles
    const MockChainlinkFeed = await ethers.getContractFactory("MockChainlinkFeed");
    chainlinkFeed = await MockChainlinkFeed.deploy(8); // 8 decimals
    await chainlinkFeed.setLatestAnswer(ethers.utils.parseUnits("1", 8)); // $1 for wS
    
    const MockPythOracle = await ethers.getContractFactory("MockPythOracle");
    pythOracle = await MockPythOracle.deploy();
    await pythOracle.setPrice(
      PYTH_PRICE_ID, 
      ethers.utils.parseUnits("1", 6), // $1 price
      0, // confidence (not used in our case)
      -6, // exponent -6 (typical for Pyth)
      Math.floor(Date.now() / 1000) // current timestamp
    );
    
    // Deploy DragonSwapTriggerV2
    const DragonSwapTriggerV2 = await ethers.getContractFactory("DragonSwapTriggerV2");
    dragonSwapTrigger = await DragonSwapTriggerV2.deploy(
      wrappedToken.address,
      dragonToken.address,
      vrfConsumer.address,
      MIN_SWAP_AMOUNT,
      chainlinkFeed.address,
      pythOracle.address,
      PYTH_PRICE_ID,
      owner.address
    );
    
    // Mint tokens to users
    await wrappedToken.mint(user1.address, ethers.utils.parseEther("1000"));
    await wrappedToken.mint(user2.address, ethers.utils.parseEther("1000"));
    
    // Set up initial jackpot
    await wrappedToken.mint(owner.address, ethers.utils.parseEther("100"));
    await wrappedToken.connect(owner).approve(dragonSwapTrigger.address, ethers.utils.parseEther("100"));
    await dragonSwapTrigger.connect(owner).addToJackpot(ethers.utils.parseEther("100"));
  });
  
  describe("Price Oracle Integration", function () {
    it("Should get Chainlink price", async function () {
      const [price, timestamp] = await dragonSwapTrigger.getChainlinkPrice();
      expect(price).to.equal(ethers.utils.parseEther("1")); // Should convert to 18 decimals
    });
    
    it("Should get Pyth price", async function () {
      const [price, timestamp] = await dragonSwapTrigger.getPythPrice();
      expect(price).to.equal(ethers.utils.parseEther("1")); // Should convert to 18 decimals
    });
    
    it("Should get final price using average strategy", async function () {
      const price = await dragonSwapTrigger.getFinalPrice();
      expect(price).to.equal(ethers.utils.parseEther("1")); // Average of $1 and $1
    });
    
    it("Should convert amount to USD correctly", async function () {
      const amount = ethers.utils.parseEther("50");
      const usdValue = await dragonSwapTrigger.convertToUSD(amount);
      expect(usdValue).to.equal(ethers.utils.parseEther("50")); // 50 wS = $50
    });
    
    it("Should calculate win threshold based on USD amount", async function () {
      // Calculate for $1 USD equivalent (min amount)
      const smallAmount = ethers.utils.parseEther("1"); // 1 wS = $1
      const thresholdForMin = await dragonSwapTrigger.calculateWinThreshold(smallAmount);
      
      // Calculate for $10000 USD equivalent (max amount)
      const largeAmount = ethers.utils.parseEther("10000"); // 10000 wS = $10000
      const thresholdForMax = await dragonSwapTrigger.calculateWinThreshold(largeAmount);
      
      // Min amount should have BASE_WIN_PROB_BPS = 4 (0.0004%) chance -> threshold = 250000
      expect(thresholdForMin).to.be.closeTo(ethers.BigNumber.from("250000"), 10);
      
      // Max amount should have MAX_WIN_PROB_BPS = 400 (4%) chance -> threshold = 25
      expect(thresholdForMax).to.be.closeTo(ethers.BigNumber.from("25"), 1);
      
      // Make sure higher amounts have lower thresholds (higher chance to win)
      expect(thresholdForMin).to.be.gt(thresholdForMax);
    });
  });
  
  describe("Lottery Flow", function () {
    it("Should trigger lottery when swapping tokens", async function () {
      // Approve tokens
      await wrappedToken.connect(user1).approve(dragonSwapTrigger.address, ethers.utils.parseEther("50"));
      
      // Swap tokens and trigger lottery
      await expect(dragonSwapTrigger.connect(user1).onSwapNativeTokenToDragon(user1.address, ethers.utils.parseEther("50")))
        .to.emit(dragonSwapTrigger, "SwapDetected")
        .withArgs(user1.address, ethers.utils.parseEther("50"), ethers.utils.parseEther("50"), await dragonSwapTrigger.calculateWinThreshold(ethers.utils.parseEther("50")));
    });
    
    it("Should award jackpot when user wins", async function () {
      // Set up a winning scenario
      const requestId = 123;
      const winThreshold = 100;
      const winningRandomness = 100; // This will be divisible by winThreshold
      
      // Approve and swap tokens
      await wrappedToken.connect(user1).approve(dragonSwapTrigger.address, ethers.utils.parseEther("50"));
      await dragonSwapTrigger.connect(user1).onSwapNativeTokenToDragon(user1.address, ethers.utils.parseEther("50"));
      
      // Manually set up the request in the contract for testing
      await dragonSwapTrigger.connect(owner).setRequestData(requestId, user1.address, ethers.utils.parseEther("50"), winThreshold);
      
      // Get initial balances
      const initialJackpot = await dragonSwapTrigger.jackpotBalance();
      const initialUserBalance = await wrappedToken.balanceOf(user1.address);
      
      // Process randomness with winning number
      await dragonSwapTrigger.connect(vrfConsumer).fulfillRandomness(requestId, winningRandomness);
      
      // Check results
      const finalJackpot = await dragonSwapTrigger.jackpotBalance();
      const finalUserBalance = await wrappedToken.balanceOf(user1.address);
      
      // Expected: 69% of jackpot goes to winner, 31% remains
      const expectedWinAmount = initialJackpot.mul(69).div(100);
      const expectedRemainingJackpot = initialJackpot.mul(31).div(100);
      
      expect(finalJackpot).to.equal(expectedRemainingJackpot);
      expect(finalUserBalance.sub(initialUserBalance)).to.equal(expectedWinAmount);
      expect(await dragonSwapTrigger.lastWinner()).to.equal(user1.address);
      expect(await dragonSwapTrigger.lastWinAmount()).to.equal(expectedWinAmount);
    });
  });
  
  describe("Oracle Redundancy", function () {
    it("Should fall back to Pyth when Chainlink fails", async function () {
      // Make Chainlink feed fail
      await chainlinkFeed.setSimulateFail(true);
      
      // Should still get a price from Pyth
      const price = await dragonSwapTrigger.getFinalPrice();
      expect(price).to.equal(ethers.utils.parseEther("1"));
    });
    
    it("Should fall back to Chainlink when Pyth fails", async function () {
      // Set price strategy to PYTH_ONLY to test fallback
      await dragonSwapTrigger.connect(owner).setPriceStrategy(1); // PYTH_ONLY
      
      // Make Pyth feed fail
      await pythOracle.setSimulateFail(true);
      
      // Should fall back to Chainlink
      const price = await dragonSwapTrigger.getFinalPrice();
      expect(price).to.equal(ethers.utils.parseEther("1"));
    });
    
    it("Should handle price deviations appropriately", async function () {
      // Set different prices to create a deviation
      await chainlinkFeed.setLatestAnswer(ethers.utils.parseUnits("1.1", 8)); // $1.10
      await pythOracle.setPrice(
        PYTH_PRICE_ID, 
        ethers.utils.parseUnits("0.9", 6), // $0.90
        0, // confidence (not used in our case)
        -6, // exponent -6
        Math.floor(Date.now() / 1000) // current timestamp
      );
      
      // Should still get average price and log deviation
      const price = await dragonSwapTrigger.getFinalPrice();
      expect(price).to.equal(ethers.utils.parseEther("1")); // Average of $1.10 and $0.90
    });
  });
});

// Mock contract factories
const MockVRFConsumer = {
  deploy: async function() {
    const [signer] = await ethers.getSigners();
    
    return {
      address: signer.address,
      requestRandomness: async function(user) {
        return ethers.BigNumber.from(123);
      }
    };
  }
};

const MockChainlinkFeed = {
  deploy: async function(decimals) {
    const [signer] = await ethers.getSigners();
    let latestAnswer = 0;
    let simulateFail = false;
    
    return {
      address: signer.address,
      decimals: async function() {
        return decimals;
      },
      latestRoundData: async function() {
        if (simulateFail) {
          throw new Error("Simulated failure");
        }
        
        const timestamp = Math.floor(Date.now() / 1000);
        return [1, latestAnswer, timestamp, timestamp, 1];
      },
      setLatestAnswer: async function(answer) {
        latestAnswer = answer;
      },
      setSimulateFail: async function(fail) {
        simulateFail = fail;
      }
    };
  }
};

const MockPythOracle = {
  deploy: async function() {
    const [signer] = await ethers.getSigners();
    const prices = {};
    let simulateFail = false;
    
    return {
      address: signer.address,
      getPriceUnsafe: async function(priceId) {
        if (simulateFail) {
          throw new Error("Simulated failure");
        }
        
        if (!prices[priceId]) {
          throw new Error("Price not set");
        }
        
        return prices[priceId];
      },
      setPrice: async function(priceId, price, conf, expo, publishTime) {
        prices[priceId] = {
          price: price,
          conf: conf,
          expo: expo,
          publishTime: publishTime
        };
      },
      setSimulateFail: async function(fail) {
        simulateFail = fail;
      }
    };
  }
}; 