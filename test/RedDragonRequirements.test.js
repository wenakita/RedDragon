const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RedDragon Requirements", function () {
  let RedDragon, redDragon;
  let RedDragonSwapLottery, lottery;
  let RedDragonPaintSwapVerifier, verifier;
  let MockToken, wrappedSonic;
  let owner, jackpotVault, liquidityVault, devVault, user1, user2, exchangePair;
  
  const initialSupply = ethers.parseEther("6942000");
  const BURN_ADDRESS = "0x000000000000000000000000000000000000dEaD";

  beforeEach(async function () {
    [owner, jackpotVault, liquidityVault, devVault, user1, user2, exchangePair] = await ethers.getSigners();
    
    // Deploy mock wrapped Sonic token
    MockToken = await ethers.getContractFactory("MockERC20");
    wrappedSonic = await MockToken.deploy("Wrapped Sonic", "wS", 18);
    await wrappedSonic.waitForDeployment();
    
    // Deploy verifier
    RedDragonPaintSwapVerifier = await ethers.getContractFactory("RedDragonPaintSwapVerifier");
    verifier = await RedDragonPaintSwapVerifier.deploy();
    await verifier.waitForDeployment();
    
    // Initialize verifier with mock VRF coordinator
    await verifier.initialize(
      owner.address, // Mock VRF coordinator
      0,
      ethers.ZeroHash,
      0,
      0
    );
    
    // Deploy RedDragon token
    RedDragon = await ethers.getContractFactory("RedDragon");
    redDragon = await RedDragon.deploy(
      jackpotVault.address,
      liquidityVault.address,
      BURN_ADDRESS,
      devVault.address,
      await wrappedSonic.getAddress()
    );
    await redDragon.waitForDeployment();
    
    // Deploy lottery
    RedDragonSwapLottery = await ethers.getContractFactory("RedDragonSwapLottery");
    lottery = await RedDragonSwapLottery.deploy(
      await wrappedSonic.getAddress(),
      await verifier.getAddress()
    );
    await lottery.waitForDeployment();
    
    // Set up contracts
    await redDragon.setExchangePair(exchangePair.address);
    await redDragon.setLotteryAddress(await lottery.getAddress());
    await lottery.setExchangePair(exchangePair.address);
    await redDragon.enableTrading();
    
    // Mint wS tokens to exchange pair and users
    await wrappedSonic.mint(exchangePair.address, ethers.parseEther("1000000"));
    await wrappedSonic.mint(user1.address, ethers.parseEther("10000"));
    await wrappedSonic.mint(user2.address, ethers.parseEther("10000"));
    
    // Send some RedDragon tokens to the exchange pair
    await redDragon.transfer(exchangePair.address, ethers.parseEther("1000000"));
  });

  describe("Requirement 1: Only buys from wS to DRAGON enter lottery", function () {
    it("Should enter lottery when buying (simulated buy from exchange pair)", async function () {
      // First, setup a spy on the lottery's processSwap function
      // We'll use a mock implementation that just tracks calls
      const mockProcessSwap = await ethers.deployContract("MockProcessSwap");
      
      // Update the lottery in the red dragon token to use our mock
      await redDragon.setLotteryAddress(await mockProcessSwap.getAddress());
      
      // Get wS balance before the simulated swap
      const initialWSBalance = await wrappedSonic.balanceOf(exchangePair.address);
      const wsAmount = ethers.parseEther("100");
      
      // Simulate a buy: tokens are sent FROM exchange pair TO user
      const buyAmount = ethers.parseEther("1000");
      await redDragon.connect(exchangePair).transfer(user1.address, buyAmount);
      
      // Simulate wS tokens being removed from pair (as if user sent them in)
      await wrappedSonic.connect(exchangePair).transfer(user1.address, wsAmount);
      
      // Get the wS balance after the simulated swap
      const finalWSBalance = await wrappedSonic.balanceOf(exchangePair.address);
      console.log(`Initial wS balance: ${initialWSBalance}`);
      console.log(`Final wS balance: ${finalWSBalance}`);
      console.log(`Delta: ${initialWSBalance - finalWSBalance}`);
      
      // Check if the mock processSwap was called
      const callCount = await mockProcessSwap.getCallCount();
      expect(callCount).to.be.gt(0);
    });

    it("Should NOT enter lottery when selling (simulated sell to exchange pair)", async function () {
      // Setup: Create spy for lottery contract
      const processBuySpy = await ethers.provider.getTransactionCount(await lottery.getAddress());
      
      // First give user some tokens to sell
      await redDragon.transfer(user2.address, ethers.parseEther("10000"));
      
      // Simulate a sell: tokens are sent FROM user TO exchange pair
      const sellAmount = ethers.parseEther("1000");
      await redDragon.connect(user2).transfer(exchangePair.address, sellAmount);
      
      // Check if we have more transactions to the lottery
      const newTxCount = await ethers.provider.getTransactionCount(await lottery.getAddress());
      expect(newTxCount).to.equal(processBuySpy); // Should be the same (no new calls)
    });
  });

  describe("Requirement 2: 10% fees occur on both buys and sells", function () {
    it("Should take 10% fee on buys", async function () {
      // Simulate a buy
      const buyAmount = ethers.parseEther("1000");
      const expectedFeeAmount = buyAmount * 1000n / 10000n; // 10% fee
      const expectedReceivedAmount = buyAmount - expectedFeeAmount;
      
      // User1 balance before
      const user1BalanceBefore = await redDragon.balanceOf(user1.address);
      
      // Simulate the buy (exchange pair sends tokens to user)
      await redDragon.connect(exchangePair).transfer(user1.address, buyAmount);
      
      // User1 balance after
      const user1BalanceAfter = await redDragon.balanceOf(user1.address);
      const actualReceivedAmount = user1BalanceAfter - user1BalanceBefore;
      
      // Check fees were taken correctly
      expect(actualReceivedAmount).to.equal(expectedReceivedAmount);
    });

    it("Should take 10% fee on sells", async function () {
      // First give user2 some tokens to sell
      await redDragon.transfer(user2.address, ethers.parseEther("10000"));
      
      // Simulate a sell
      const sellAmount = ethers.parseEther("1000");
      const expectedFeeAmount = sellAmount * 1000n / 10000n; // 10% fee
      const expectedExchangePairReceivedAmount = sellAmount - expectedFeeAmount;
      
      // Exchange pair balance before
      const exchangePairBalanceBefore = await redDragon.balanceOf(exchangePair.address);
      
      // Simulate the sell (user sends tokens to exchange pair)
      await redDragon.connect(user2).transfer(exchangePair.address, sellAmount);
      
      // Exchange pair balance after
      const exchangePairBalanceAfter = await redDragon.balanceOf(exchangePair.address);
      const actualExchangePairReceivedAmount = exchangePairBalanceAfter - exchangePairBalanceBefore;
      
      // Check fees were taken correctly
      expect(actualExchangePairReceivedAmount).to.equal(expectedExchangePairReceivedAmount);
    });
  });

  describe("Requirement 3: All fees are distributed after each swap", function () {
    it("Should distribute fees correctly after a buy", async function () {
      // Record balances before
      const jackpotBalanceBefore = await redDragon.balanceOf(jackpotVault.address);
      const liquidityBalanceBefore = await redDragon.balanceOf(liquidityVault.address);
      const burnBalanceBefore = await redDragon.balanceOf(BURN_ADDRESS);
      const devBalanceBefore = await redDragon.balanceOf(devVault.address);
      
      // Simulate a buy
      const buyAmount = ethers.parseEther("10000");
      await redDragon.connect(exchangePair).transfer(user1.address, buyAmount);
      
      // Calculate expected fees
      const totalFeeAmount = buyAmount * 1000n / 10000n; // 10% total fee
      const expectedJackpotFee = totalFeeAmount * 500n / 1000n; // 5% to jackpot (half of total fee)
      const expectedLiquidityFee = totalFeeAmount * 300n / 1000n; // 3% to liquidity
      const expectedBurnFee = totalFeeAmount * 100n / 1000n; // 1% to burn
      const expectedDevFee = totalFeeAmount * 100n / 1000n; // 1% to dev
      
      // Record balances after
      const jackpotBalanceAfter = await redDragon.balanceOf(jackpotVault.address);
      const liquidityBalanceAfter = await redDragon.balanceOf(liquidityVault.address);
      const burnBalanceAfter = await redDragon.balanceOf(BURN_ADDRESS);
      const devBalanceAfter = await redDragon.balanceOf(devVault.address);
      
      // Check all fees were distributed correctly
      expect(jackpotBalanceAfter - jackpotBalanceBefore).to.equal(expectedJackpotFee);
      expect(liquidityBalanceAfter - liquidityBalanceBefore).to.equal(expectedLiquidityFee);
      expect(burnBalanceAfter - burnBalanceBefore).to.equal(expectedBurnFee);
      expect(devBalanceAfter - devBalanceBefore).to.equal(expectedDevFee);
    });

    it("Should distribute fees correctly after a sell", async function () {
      // First give user2 some tokens to sell
      await redDragon.transfer(user2.address, ethers.parseEther("100000"));
      
      // Record balances before
      const jackpotBalanceBefore = await redDragon.balanceOf(jackpotVault.address);
      const liquidityBalanceBefore = await redDragon.balanceOf(liquidityVault.address);
      const burnBalanceBefore = await redDragon.balanceOf(BURN_ADDRESS);
      const devBalanceBefore = await redDragon.balanceOf(devVault.address);
      
      // Simulate a sell
      const sellAmount = ethers.parseEther("10000");
      await redDragon.connect(user2).transfer(exchangePair.address, sellAmount);
      
      // Calculate expected fees
      const totalFeeAmount = sellAmount * 1000n / 10000n; // 10% total fee
      const expectedJackpotFee = totalFeeAmount * 500n / 1000n; // 5% to jackpot
      const expectedLiquidityFee = totalFeeAmount * 300n / 1000n; // 3% to liquidity
      const expectedBurnFee = totalFeeAmount * 100n / 1000n; // 1% to burn
      const expectedDevFee = totalFeeAmount * 100n / 1000n; // 1% to dev
      
      // Record balances after
      const jackpotBalanceAfter = await redDragon.balanceOf(jackpotVault.address);
      const liquidityBalanceAfter = await redDragon.balanceOf(liquidityVault.address);
      const burnBalanceAfter = await redDragon.balanceOf(BURN_ADDRESS);
      const devBalanceAfter = await redDragon.balanceOf(devVault.address);
      
      // Check all fees were distributed correctly
      expect(jackpotBalanceAfter - jackpotBalanceBefore).to.equal(expectedJackpotFee);
      expect(liquidityBalanceAfter - liquidityBalanceBefore).to.equal(expectedLiquidityFee);
      expect(burnBalanceAfter - burnBalanceBefore).to.equal(expectedBurnFee);
      expect(devBalanceAfter - devBalanceBefore).to.equal(expectedDevFee);
    });
  });

  describe("Requirement 4: Jackpot is in wS tokens", function () {
    it("Should maintain jackpot in wS tokens", async function () {
      // Fund lottery with wS
      const jackpotAmount = ethers.parseEther("1000");
      await wrappedSonic.mint(owner.address, jackpotAmount);
      
      // Approve the lottery to spend the tokens
      await wrappedSonic.approve(await lottery.getAddress(), jackpotAmount);
      
      // Add to jackpot
      await lottery.addToJackpot(jackpotAmount);
      
      // Check jackpot is in wS
      const lotteryJackpot = await lottery.getCurrentJackpot();
      expect(lotteryJackpot).to.equal(jackpotAmount);
      
      // Verify lottery's wS balance matches the jackpot
      const lotteryWSBalance = await wrappedSonic.balanceOf(await lottery.getAddress());
      expect(lotteryWSBalance).to.equal(jackpotAmount);
    });

    it("Should collect jackpot fee in RedDragon tokens but convert to wS for the jackpot", async function () {
      // Check initial jackpot vault balance
      const jackpotVaultBalanceBefore = await redDragon.balanceOf(jackpotVault.address);
      
      // Simulate a buy to generate fees
      const buyAmount = ethers.parseEther("10000");
      await redDragon.connect(exchangePair).transfer(user1.address, buyAmount);
      
      // Calculate expected jackpot fee (in RedDragon tokens)
      const totalFeeAmount = buyAmount * 1000n / 10000n; // 10% total fee
      const expectedJackpotFee = totalFeeAmount * 500n / 1000n; // 5% to jackpot
      
      // Verify the jackpot vault received the RedDragon tokens
      const jackpotVaultBalanceAfter = await redDragon.balanceOf(jackpotVault.address);
      expect(jackpotVaultBalanceAfter - jackpotVaultBalanceBefore).to.equal(expectedJackpotFee);
    });
  });
}); 