const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RedDragonFeeManager", function () {
  let dragonToken, veDistributor, lottery, feeManager;
  let owner, user1, jackpotAddress, burnAddress;

  beforeEach(async function () {
    [owner, user1, jackpotAddress, burnAddress] = await ethers.getSigners();
    
    // Deploy mock DRAGON token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    dragonToken = await MockERC20.deploy("Dragon Token", "DRAGON", ethers.parseEther("1000000"));
    
    // Deploy mock ve8020 fee distributor
    const MockVeDistributor = await ethers.getContractFactory("MockVe8020FeeDistributor");
    veDistributor = await MockVeDistributor.deploy(await dragonToken.getAddress());
    
    // Deploy mock lottery contract
    const MockLottery = await ethers.getContractFactory("MockRedDragonSwapLottery");
    const mockVerifier = await (await ethers.getContractFactory("MockRedDragonPaintSwapVerifier")).deploy();
    lottery = await MockLottery.deploy(
      await dragonToken.getAddress(),
      await mockVerifier.getAddress()
    );
    
    // Deploy fee manager
    const FeeManager = await ethers.getContractFactory("RedDragonFeeManager");
    feeManager = await FeeManager.deploy(
      await dragonToken.getAddress(),
      await veDistributor.getAddress(),
      jackpotAddress.address,
      burnAddress.address
    );
    
    // Set lottery in fee manager
    await feeManager.setLottery(await lottery.getAddress());
    
    // Fund user1 with DRAGON tokens
    await dragonToken.transfer(user1.address, ethers.parseEther("100000"));
    
    // Approve fee manager to spend tokens
    await dragonToken.connect(user1).approve(await feeManager.getAddress(), ethers.parseEther("100000"));
  });

  describe("Initialization", function () {
    it("Should initialize with correct addresses", async function () {
      expect(await feeManager.dragonToken()).to.equal(await dragonToken.getAddress());
      expect(await feeManager.veDistributor()).to.equal(await veDistributor.getAddress());
      expect(await feeManager.jackpotAddress()).to.equal(jackpotAddress.address);
      expect(await feeManager.burnAddress()).to.equal(burnAddress.address);
      expect(await feeManager.lottery()).to.equal(await lottery.getAddress());
    });
    
    it("Should not allow zero addresses in constructor", async function () {
      const FeeManager = await ethers.getContractFactory("RedDragonFeeManager");
      const ZERO_ADDRESS = ethers.ZeroAddress;
      
      await expect(
        FeeManager.deploy(ZERO_ADDRESS, await veDistributor.getAddress(), jackpotAddress.address, burnAddress.address)
      ).to.be.revertedWith("DRAGON token address cannot be zero");
      
      await expect(
        FeeManager.deploy(await dragonToken.getAddress(), ZERO_ADDRESS, jackpotAddress.address, burnAddress.address)
      ).to.be.revertedWith("veDistributor address cannot be zero");
      
      await expect(
        FeeManager.deploy(await dragonToken.getAddress(), await veDistributor.getAddress(), ZERO_ADDRESS, burnAddress.address)
      ).to.be.revertedWith("Jackpot address cannot be zero");
      
      await expect(
        FeeManager.deploy(await dragonToken.getAddress(), await veDistributor.getAddress(), jackpotAddress.address, ZERO_ADDRESS)
      ).to.be.revertedWith("Burn address cannot be zero");
    });
  });
  
  describe("Fee Distribution", function () {
    it("Should distribute fees to all destinations correctly", async function () {
      // Fee amounts
      const jackpotShare = ethers.parseEther("1000");
      const veDistributorShare = ethers.parseEther("2000");
      const burnShare = ethers.parseEther("500");
      const totalFees = jackpotShare + veDistributorShare + burnShare;
      
      // Initial balances
      const initialJackpotBalance = await dragonToken.balanceOf(jackpotAddress.address);
      const initialBurnBalance = await dragonToken.balanceOf(burnAddress.address);
      
      // Distribute fees
      await feeManager.connect(user1).distributeFees(
        jackpotShare,
        veDistributorShare,
        burnShare
      );
      
      // Check jackpot received its share
      const finalJackpotBalance = await dragonToken.balanceOf(jackpotAddress.address);
      expect(finalJackpotBalance).to.equal(initialJackpotBalance + jackpotShare);
      
      // Check burn address received its share
      const finalBurnBalance = await dragonToken.balanceOf(burnAddress.address);
      expect(finalBurnBalance).to.equal(initialBurnBalance + burnShare);
      
      // Check that veDistributor's addRewards was called
      expect(await veDistributor.lastRewardsAmount()).to.equal(veDistributorShare);
    });
    
    it("Should update lottery jackpot when distributing fees", async function () {
      // Fee amounts
      const jackpotShare = ethers.parseEther("1000");
      
      // Initial lottery jackpot
      const initialJackpot = await lottery.getJackpot();
      
      // Distribute fees
      await feeManager.connect(user1).distributeFees(
        jackpotShare,
        0, // no distributor share
        0  // no burn share
      );
      
      // Check lottery jackpot was updated
      const finalJackpot = await lottery.getJackpot();
      expect(finalJackpot).to.equal(initialJackpot + jackpotShare);
    });
    
    it("Should work even with zero amounts for some destinations", async function () {
      // Only jackpot share
      await feeManager.connect(user1).distributeFees(
        ethers.parseEther("1000"),
        0, // no distributor share
        0  // no burn share
      );
      
      // Only ve distributor share
      await feeManager.connect(user1).distributeFees(
        0, // no jackpot share
        ethers.parseEther("1000"),
        0  // no burn share
      );
      
      // Only burn share
      await feeManager.connect(user1).distributeFees(
        0, // no jackpot share
        0, // no distributor share
        ethers.parseEther("1000")
      );
    });
    
    it("Should fail if caller has insufficient allowance", async function () {
      // Set allowance to less than required
      await dragonToken.connect(user1).approve(await feeManager.getAddress(), ethers.parseEther("100"));
      
      // Try to distribute more than approved
      await expect(
        feeManager.connect(user1).distributeFees(
          ethers.parseEther("1000"),
          ethers.parseEther("2000"),
          ethers.parseEther("500")
        )
      ).to.be.revertedWith("Insufficient allowance");
    });
    
    it("Should fall back to direct transfer if addRewards fails", async function () {
      // Configure mock distributor to throw on addRewards
      await veDistributor.setAddRewardsRevert(true);
      
      // Distribute fees
      await feeManager.connect(user1).distributeFees(
        ethers.parseEther("1000"),
        ethers.parseEther("2000"),
        ethers.parseEther("500")
      );
      
      // Check distributor balance directly
      const distributorBalance = await dragonToken.balanceOf(await veDistributor.getAddress());
      expect(distributorBalance).to.equal(ethers.parseEther("2000"));
      
      // Check that receiveRewards was called
      expect(await veDistributor.lastReceiveAmount()).to.equal(ethers.parseEther("2000"));
    });
  });
  
  describe("Admin Functions", function () {
    it("Should allow owner to update veDistributor", async function () {
      // Deploy a new mock distributor
      const MockVeDistributor = await ethers.getContractFactory("MockVe8020FeeDistributor");
      const newDistributor = await MockVeDistributor.deploy(await dragonToken.getAddress());
      
      // Update distributor
      await feeManager.setVeDistributor(await newDistributor.getAddress());
      
      // Check updated address
      expect(await feeManager.veDistributor()).to.equal(await newDistributor.getAddress());
    });
    
    it("Should allow owner to update jackpot address", async function () {
      const newJackpotAddress = user1.address;
      
      // Update jackpot address
      await feeManager.setJackpotAddress(newJackpotAddress);
      
      // Check updated address
      expect(await feeManager.jackpotAddress()).to.equal(newJackpotAddress);
    });
    
    it("Should allow owner to update burn address", async function () {
      const newBurnAddress = user1.address;
      
      // Update burn address
      await feeManager.setBurnAddress(newBurnAddress);
      
      // Check updated address
      expect(await feeManager.burnAddress()).to.equal(newBurnAddress);
    });
    
    it("Should allow owner to update lottery address", async function () {
      // Deploy a new mock lottery
      const MockLottery = await ethers.getContractFactory("MockRedDragonSwapLottery");
      const mockVerifier = await (await ethers.getContractFactory("MockRedDragonPaintSwapVerifier")).deploy();
      const newLottery = await MockLottery.deploy(
        await dragonToken.getAddress(),
        await mockVerifier.getAddress()
      );
      
      // Update lottery
      await feeManager.setLottery(await newLottery.getAddress());
      
      // Check updated address
      expect(await feeManager.lottery()).to.equal(await newLottery.getAddress());
    });
    
    it("Should not allow non-owner to update addresses", async function () {
      await expect(
        feeManager.connect(user1).setVeDistributor(user1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      await expect(
        feeManager.connect(user1).setJackpotAddress(user1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      await expect(
        feeManager.connect(user1).setBurnAddress(user1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      await expect(
        feeManager.connect(user1).setLottery(user1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    
    it("Should not allow zero addresses in setter functions", async function () {
      const ZERO_ADDRESS = ethers.ZeroAddress;
      
      await expect(
        feeManager.setVeDistributor(ZERO_ADDRESS)
      ).to.be.revertedWith("veDistributor address cannot be zero");
      
      await expect(
        feeManager.setJackpotAddress(ZERO_ADDRESS)
      ).to.be.revertedWith("Jackpot address cannot be zero");
      
      await expect(
        feeManager.setBurnAddress(ZERO_ADDRESS)
      ).to.be.revertedWith("Burn address cannot be zero");
      
      // Setting lottery to zero address should be allowed (optional component)
      await feeManager.setLottery(ZERO_ADDRESS);
      expect(await feeManager.lottery()).to.equal(ZERO_ADDRESS);
    });
  });
}); 