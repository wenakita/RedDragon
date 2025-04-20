const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DragonShadowV3Swapper - Combined Boosts", function () {
  let swapper;
  let mockVe69LPBoost;
  let mockPoolVoting;
  let mockX33Token;
  let mockBeetsLP;
  let mockWS;
  let mockUSDC;
  let mockJackpot;
  let mockQuoter;
  let mockRouter;
  let owner, user1, user2, partner;
  
  const BOOST_PRECISION = 10000;
  const BASE_BOOST = 10000; // 100%
  const MAX_VE69LP_BOOST = 20000; // 200%
  const MAX_PARTNER_BOOST = 690; // 6.9%
  
  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, partner] = await ethers.getSigners();
    
    // Deploy mock tokens 
    const MockERC20 = await ethers.getContractFactory("test/mocks/tokens/MockERC20.sol:MockERC20");
    mockX33Token = await MockERC20.deploy("x33", "x33", 18);
    mockBeetsLP = await MockERC20.deploy("BeetsLP", "BLPT", 18);
    mockWS = await MockERC20.deploy("Wrapped Sonic", "wS", 18);
    mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
    mockJackpot = await MockERC20.deploy("Jackpot", "JPT", 18);
    
    // Deploy mock jackpot with tracking of entries
    const MockJackpot = await ethers.getContractFactory("test/mocks/core/MockJackpot.sol:MockJackpot");
    mockJackpot = await MockJackpot.deploy();
    
    // Create a test-specific mock ve69LPBoost with configurable boosts
    const mockVe69LPBoostFactory = await ethers.getContractFactory("MockVe69LPBoostWithConfigurableBoost");
    mockVe69LPBoost = await mockVe69LPBoostFactory.deploy();
    
    // Deploy a test-specific mock pool voting with configurable boosts
    const mockPoolVotingFactory = await ethers.getContractFactory("MockPoolVotingWithConfigurableBoost");
    mockPoolVoting = await mockPoolVotingFactory.deploy();
    
    // Set up mock router
    const MockRouter = await ethers.getContractFactory("test/mocks/external/MockShadowRouter.sol:MockShadowRouter");
    mockRouter = await MockRouter.deploy(mockX33Token.address, mockBeetsLP.address);
    
    // Set up mock quoter
    const MockQuoter = await ethers.getContractFactory("test/mocks/external/MockShadowQuoter.sol:MockShadowQuoter");
    mockQuoter = await MockQuoter.deploy();
    
    // Deploy the swapper with mock contracts
    const DragonShadowV3Swapper = await ethers.getContractFactory("DragonShadowV3Swapper");
    swapper = await DragonShadowV3Swapper.deploy(
      mockRouter.address,
      mockQuoter.address,
      mockX33Token.address,
      mockBeetsLP.address,
      mockWS.address,
      mockUSDC.address,
      mockJackpot.address,
      owner.address, // ve69LP - just use owner address
      mockVe69LPBoost.address
    );
    
    // Set the pool voting contract
    await swapper.setPoolVoting(mockPoolVoting.address);
    
    // Configure partner authorization
    await swapper.setPartnerAuthorization(partner.address, true);
    
    // Set price method to MANUAL for predictable testing
    await swapper.setPriceMethod(0); // MANUAL
    await swapper.updateManualRatio(ethers.utils.parseEther("1")); // 1:1 ratio
    
    // Fund the user with x33
    await mockX33Token.mint(user1.address, ethers.utils.parseEther("1000"));
    await mockX33Token.connect(user1).approve(swapper.address, ethers.constants.MaxUint256);
    
    // Set up mock for router's exactInputSingle
    await mockRouter.setReturnAmount(ethers.utils.parseEther("90")); // Return 90% after swap
    
    // Set up X33 token to be unlocked
    await mockX33Token.setUnlocked(true);
  });

  describe("Boost Independence", function () {
    it("should apply ve69LP boost and partner boost independently and additively", async function () {
      // Configure ve69LP boost to return 150% (15000 basis points)
      await mockVe69LPBoost.setBoostForUser(user1.address, 15000);
      
      // Configure partner boost to return 5% (500 basis points)
      await mockPoolVoting.setBoostForPartner(partner.address, 500);
      
      // Test the estimate function first
      const x33Amount = ethers.utils.parseEther("100");
      const [beetsLp, wsEquivalent, boostMultiplier] = 
        await swapper.estimateOutputsWithBoostAndPartner(x33Amount, user1.address, partner.address);
      
      console.log("BeetsLP estimated:", ethers.utils.formatEther(beetsLp));
      console.log("WS equivalent with both boosts:", ethers.utils.formatEther(wsEquivalent));
      console.log("ve69LP boost multiplier:", boostMultiplier.toString());
      
      // Calculate expected individual boost amounts
      const baseWsEquivalent = x33Amount.mul(69).div(100); // 69% of 100 = 69 units
      const ve69LPBoostAmount = baseWsEquivalent.mul(15000).div(10000); // 1.5x boost = 103.5 units
      const partnerBoostAmount = baseWsEquivalent.mul(500).div(10000); // 5% boost = 3.45 units
      const expectedTotal = ve69LPBoostAmount.add(partnerBoostAmount); // 106.95 units
      
      // Verify combined boost calculation
      expect(wsEquivalent).to.be.closeTo(expectedTotal, ethers.utils.parseEther("0.01"));
      expect(boostMultiplier).to.equal(15000);
      
      // Now execute an actual swap to verify the jackpot entry
      const swapTx = await swapper.connect(partner).partnerSwapX33ForBeetsLPWithJackpot(
        user1.address,
        x33Amount,
        0, // Min output
        Math.floor(Date.now() / 1000) + 3600 // Deadline
      );
      
      // Check jackpot entry
      const [entryUser, entryAmount] = await mockJackpot.getLastEntry();
      expect(entryUser).to.equal(user1.address);
      
      // The entry amount should be close to our expected total
      expect(entryAmount).to.be.closeTo(expectedTotal, ethers.utils.parseEther("0.01"));
      
      // Verify it's using both boosts by checking against what we'd expect with just the ve69LP boost
      expect(entryAmount).to.be.gt(ve69LPBoostAmount);
    });
    
    it("should allow a maximum combined boost of 10% (ve69LP) + 6.9% (partner)", async function () {
      // Configure maximum ve69LP boost (100% extra, which is 200% total)
      await mockVe69LPBoost.setBoostForUser(user1.address, MAX_VE69LP_BOOST);
      
      // Configure maximum partner boost (6.9%)
      await mockPoolVoting.setBoostForPartner(partner.address, MAX_PARTNER_BOOST);
      
      // Test the estimate function
      const x33Amount = ethers.utils.parseEther("100");
      const [beetsLp, wsEquivalent, boostMultiplier] = 
        await swapper.estimateOutputsWithBoostAndPartner(x33Amount, user1.address, partner.address);
      
      console.log("BeetsLP estimated:", ethers.utils.formatEther(beetsLp));
      console.log("WS equivalent with max boosts:", ethers.utils.formatEther(wsEquivalent));
      console.log("ve69LP boost multiplier:", boostMultiplier.toString());
      
      // Calculate expected individual boost amounts
      const baseWsEquivalent = x33Amount.mul(69).div(100); // 69% of 100 = 69 units
      const ve69LPBoostAmount = baseWsEquivalent.mul(MAX_VE69LP_BOOST).div(10000); // 2x boost = 138 units
      const partnerBoostAmount = baseWsEquivalent.mul(MAX_PARTNER_BOOST).div(10000); // 6.9% boost = 4.761 units
      const expectedTotal = ve69LPBoostAmount.add(partnerBoostAmount); // 142.761 units
      
      // Verify combined boost calculation
      expect(wsEquivalent).to.be.closeTo(expectedTotal, ethers.utils.parseEther("0.1"));
      expect(boostMultiplier).to.equal(MAX_VE69LP_BOOST);
      
      // Execute an actual swap
      const swapTx = await swapper.connect(partner).partnerSwapX33ForBeetsLPWithJackpot(
        user1.address,
        x33Amount,
        0, // Min output
        Math.floor(Date.now() / 1000) + 3600 // Deadline
      );
      
      // Check jackpot entry
      const [entryUser, entryAmount] = await mockJackpot.getLastEntry();
      expect(entryUser).to.equal(user1.address);
      
      // The actual boost should be the full expected amount (up to 2x from ve69LP + 6.9% from partner)
      const maxExpectedBoost = baseWsEquivalent.mul(MAX_VE69LP_BOOST + MAX_PARTNER_BOOST).div(10000);
      expect(entryAmount).to.be.closeTo(expectedTotal, ethers.utils.parseEther("0.1"));
      
      // Calculate the total boost percentage
      const actualBoostPercentage = entryAmount.mul(10000).div(baseWsEquivalent);
      console.log("Actual combined boost percentage:", actualBoostPercentage.toString());
      
      // Verify the total boost is near 269% (200% from ve69LP + 69% from partner)
      const expectedPercentage = MAX_VE69LP_BOOST + MAX_PARTNER_BOOST;
      expect(actualBoostPercentage).to.be.closeTo(expectedPercentage, 10); // Allow small rounding error
    });
  });
});

// Helper contract for testing
const MockVe69LPBoostWithConfigurableBoost = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IJackpot {
    function enterJackpotWithWS(address user, uint256 wsAmount) external;
}

contract MockVe69LPBoostWithConfigurableBoost {
    address public jackpot;
    mapping(address => uint256) public userBoosts;
    
    // Set boost for specific user
    function setBoostForUser(address user, uint256 boost) external {
        userBoosts[user] = boost;
    }
    
    // Calculate boost for a user
    function calculateBoost(address user) external view returns (uint256) {
        return userBoosts[user] > 0 ? userBoosts[user] : 10000; // Default to 1x
    }
    
    // Mock function for entering jackpot with boost
    function enterJackpotWithBoost(address user, uint256 amount) external {
        uint256 boost = userBoosts[user] > 0 ? userBoosts[user] : 10000;
        uint256 boostedAmount = (amount * boost) / 10000;
        IJackpot(jackpot).enterJackpotWithWS(user, boostedAmount);
    }
    
    // Set jackpot
    function setJackpot(address _jackpot) external {
        jackpot = _jackpot;
    }
}
`;

// Helper contract for testing
const MockPoolVotingWithConfigurableBoost = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MockPoolVotingWithConfigurableBoost {
    mapping(address => uint256) public partnerBoosts;
    mapping(uint256 => uint256) public partnerIdBoosts;
    uint256 public currentPeriod = 2885;
    
    // Set boost for a specific partner
    function setBoostForPartner(address partner, uint256 boost) external {
        partnerBoosts[partner] = boost;
    }
    
    // Set boost for a partner ID
    function setBoostForPartnerId(uint256 partnerId, uint256 boost) external {
        partnerIdBoosts[partnerId] = boost;
    }
    
    // Get partner boost by address
    function getPartnerProbabilityBoostByAddress(address partner) external view returns (uint256) {
        return partnerBoosts[partner];
    }
    
    // Get partner boost by ID
    function getPartnerProbabilityBoost(uint256 partnerId) external view returns (uint256) {
        return partnerIdBoosts[partnerId];
    }
    
    // Calculate boosts (mock implementation)
    function calculateBoosts() external {
        // Does nothing
    }
}
`; 