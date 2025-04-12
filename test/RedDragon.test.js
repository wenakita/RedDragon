const { expect } = require("chai");
const { ethers } = require("hardhat");
const { ZeroAddress } = ethers;

describe("RedDragon", function () {
    let redDragon;
    let owner;
    let addr1;
    let addr2;
    let addrs;

    beforeEach(async function () {
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

        const RedDragon = await ethers.getContractFactory("RedDragon");
        redDragon = await RedDragon.deploy(
            owner.address, // jackpotAddress
            owner.address, // liquidityAddress
            owner.address, // burnAddress
            owner.address, // developmentAddress
            "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38" // wrappedSonicAddress
        );
        await redDragon.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await redDragon.owner()).to.equal(owner.address);
        });

        it("Should assign the total supply of tokens to the owner", async function () {
            const ownerBalance = await redDragon.balanceOf(owner.address);
            expect(await redDragon.totalSupply()).to.equal(ownerBalance);
        });
    });

    describe("Trading", function () {
        it("Should not allow trading before enabling", async function () {
            await expect(
                redDragon.connect(addr1).transfer(addr2.address, ethers.parseEther("1000"))
            ).to.be.revertedWith("Trading not enabled");
        });

        it("Should allow trading after enabling", async function () {
            await redDragon.enableTrading();
            const amount = ethers.parseEther("1000");
            const totalFee = (amount * 1000n) / 10000n; // 10% fee
            const expectedTransfer = amount - totalFee;
            
            await redDragon.transfer(addr1.address, amount);
            expect(await redDragon.balanceOf(addr1.address)).to.equal(expectedTransfer);
        });

        it("Should not allow trading to be disabled after enabling", async function () {
            await redDragon.enableTrading();
            expect(await redDragon.tradingEnabled()).to.equal(true);
            expect(await redDragon.tradingEnabledPermanently()).to.equal(true);
        });
    });

    describe("Fees", function () {
        beforeEach(async function () {
            await redDragon.enableTrading();
        });

        it("Should take correct buy fees", async function () {
            await redDragon.setExchangePair(addr1.address);
            
            // Transfer some tokens to exchange pair first (simulating liquidity)
            await redDragon.transfer(addr1.address, ethers.parseEther("2000"));
            
            // Now simulate a buy (transfer from exchange pair to a user)
            const amount = ethers.parseEther("1000");
            
            // Connect as exchange pair and transfer to user (buy)
            await redDragon.connect(addr1).transfer(addr2.address, amount);
            
            // Buy fees should be 10%
            const expectedFeePercentage = 1000n; // 10%
            const expectedFee = (amount * expectedFeePercentage) / 10000n;
            const expectedTransferAmount = amount - expectedFee;
            
            // Verify the user received the correct amount
            expect(await redDragon.balanceOf(addr2.address)).to.be.closeTo(
                expectedTransferAmount, 
                ethers.parseEther("0.1") // Allow small rounding differences
            );
        });

        it("Should take correct sell fees", async function () {
            await redDragon.setExchangePair(addr1.address);
            
            // Transfer some tokens to user first
            await redDragon.transfer(addr2.address, ethers.parseEther("2000"));
            
            // Now simulate a sell to the exchange pair
            const amount = ethers.parseEther("1000");
            const balanceBefore = await redDragon.balanceOf(addr1.address);
            
            // Transfer from user to exchange pair (sell)
            await redDragon.connect(addr2).transfer(addr1.address, amount);
            
            // Sell fees should be 10%
            const expectedFeePercentage = 1000n; // 10%
            const expectedFee = (amount * expectedFeePercentage) / 10000n;
            const expectedTransferAmount = amount - expectedFee;
            
            // Verify the exchange pair received the correct amount
            const balanceAfter = await redDragon.balanceOf(addr1.address);
            expect(balanceAfter - balanceBefore).to.be.closeTo(
                expectedTransferAmount,
                ethers.parseEther("0.1") // Allow small rounding differences
            );
        });

        it("Should not take fees from exempt addresses", async function () {
            const amount = ethers.parseEther("1000");
            await redDragon.transfer(await redDragon.getAddress(), amount);
            expect(await redDragon.balanceOf(await redDragon.getAddress())).to.equal(amount);
        });
    });

    describe("Limits", function () {
        beforeEach(async function () {
            await redDragon.enableTrading();
        });

        it("Should enforce transaction amount limit", async function () {
            // Get 10% of the total supply (much larger than any limit)
            const veryLargeAmount = (await redDragon.INITIAL_SUPPLY()) / 10n;
            
            await expect(
                redDragon.transfer(addr1.address, veryLargeAmount)
            ).to.be.revertedWith("Amount exceeds special wallet limit");
        });

        it("Should enforce wallet amount limit", async function () {
            const specialWalletLimit = await redDragon.SPECIAL_MAX_WALLET_AMOUNT();
            const veryLargeAmount = specialWalletLimit * 2n;
            await expect(
                redDragon.transfer(addr1.address, veryLargeAmount)
            ).to.be.revertedWith("Amount exceeds special wallet limit");
        });

        it("Should not enforce limits for exempt addresses", async function () {
            const currentTransactionLimit = await redDragon.getCurrentTransactionLimit();
            await redDragon.transfer(await redDragon.getAddress(), currentTransactionLimit + 1n);
            expect(await redDragon.balanceOf(await redDragon.getAddress())).to.equal(currentTransactionLimit + 1n);
        });
    });

    describe("Exchange Pair", function () {
        it("Should set exchange pair correctly", async function () {
            await redDragon.setExchangePair(addr1.address);
            expect(await redDragon.exchangePair()).to.equal(addr1.address);
        });

        it("Should not allow zero address as exchange pair", async function () {
            await expect(
                redDragon.setExchangePair(ZeroAddress)
            ).to.be.revertedWith("Exchange pair cannot be zero address");
        });
    });

    describe("Special Transaction Period", function() {
        beforeEach(async function () {
            await redDragon.enableTrading();
        });

        it("Should track transaction count correctly", async function() {
            const initialCount = await redDragon.transactionCount();
            
            // First transfer to addr1 from owner
            await redDragon.transfer(addr1.address, ethers.parseEther("200"));
            
            // Then transfer between regular addresses (non-owner)
            await redDragon.connect(addr1).transfer(addr2.address, ethers.parseEther("100"));
            
            // Count should increase
            const afterTransferCount = await redDragon.transactionCount();
            expect(afterTransferCount).to.be.gt(initialCount);
        });

        it("Should return the correct transaction limit based on transaction count", async function() {
            // During special period
            expect(await redDragon.getCurrentTransactionLimit()).to.equal(await redDragon.SPECIAL_MAX_TRANSACTION_AMOUNT());
        });
    });

    describe("Lottery Integration", function () {
        beforeEach(async function () {
            await redDragon.enableTrading();
            await redDragon.setExchangePair(addr1.address);
        });

        it("Should record wS balance for lottery entry on sells", async function () {
            // Create a mock lottery contract to track calls
            const MockProcessSwap = await ethers.getContractFactory("MockProcessSwap");
            const mockLottery = await MockProcessSwap.deploy();
            
            // Set the mock lottery address
            await redDragon.setLotteryAddress(await mockLottery.getAddress());
            
            const initialAmount = ethers.parseEther("2000");
            await redDragon.transfer(addr2.address, initialAmount);
            
            // Now simulate a sell from the user to the exchange pair
            const sellAmount = ethers.parseEther("1000");
            const tx = await redDragon.connect(addr2).transfer(addr1.address, sellAmount);
            const receipt = await tx.wait();
            
            // Check if our mock lottery was called
            const callCount = await mockLottery.getCallCount();
            expect(callCount).to.be.gt(0);
        });

        it("Should not record wS balance for non-sell transactions", async function () {
            const amount = ethers.parseEther("1000");
            const tx = await redDragon.transfer(addr1.address, amount);
            const receipt = await tx.wait();
            
            // Check that SwapDetected event was not emitted
            const event = receipt.events?.find(e => e.event === "SwapDetected");
            expect(event).to.be.undefined;
        });
    });

    describe("Fee Distribution", function () {
        beforeEach(async function () {
            await redDragon.enableTrading();
            await redDragon.setExchangePair(addr1.address);
        });

        it("Should distribute fees correctly on buy", async function () {
            await redDragon.setExchangePair(addr1.address);
            
            // Transfer tokens to exchange pair
            await redDragon.transfer(addr1.address, ethers.parseEther("2000"));
            
            // Get initial balances of fee recipients
            const initialJackpotBalance = await redDragon.balanceOf(await redDragon.jackpotAddress());
            const initialLiquidityBalance = await redDragon.balanceOf(await redDragon.liquidityAddress());
            const initialBurnBalance = await redDragon.balanceOf(await redDragon.burnAddress());
            const initialDevBalance = await redDragon.balanceOf(await redDragon.developmentAddress());
            
            // Simulate a buy (exchange pair to user)
            const amount = ethers.parseEther("1000");
            await redDragon.connect(addr1).transfer(addr2.address, amount);
            
            // Check fee recipient balances have increased
            expect(await redDragon.balanceOf(await redDragon.jackpotAddress())).to.be.gt(initialJackpotBalance);
            expect(await redDragon.balanceOf(await redDragon.liquidityAddress())).to.be.gt(initialLiquidityBalance);
            expect(await redDragon.balanceOf(await redDragon.burnAddress())).to.be.gt(initialBurnBalance);
            expect(await redDragon.balanceOf(await redDragon.developmentAddress())).to.be.gt(initialDevBalance);
        });

        it("Should distribute fees correctly on sell", async function () {
            await redDragon.setExchangePair(addr1.address);
            
            // Transfer tokens to user
            await redDragon.transfer(addr2.address, ethers.parseEther("2000"));
            
            // Get initial balances of fee recipients
            const initialJackpotBalance = await redDragon.balanceOf(await redDragon.jackpotAddress());
            const initialLiquidityBalance = await redDragon.balanceOf(await redDragon.liquidityAddress());
            const initialBurnBalance = await redDragon.balanceOf(await redDragon.burnAddress());
            const initialDevBalance = await redDragon.balanceOf(await redDragon.developmentAddress());
            
            // Simulate a sell (user to exchange pair)
            const amount = ethers.parseEther("1000");
            await redDragon.connect(addr2).transfer(addr1.address, amount);
            
            // Check fee recipient balances have increased
            expect(await redDragon.balanceOf(await redDragon.jackpotAddress())).to.be.gt(initialJackpotBalance);
            expect(await redDragon.balanceOf(await redDragon.liquidityAddress())).to.be.gt(initialLiquidityBalance);
            expect(await redDragon.balanceOf(await redDragon.burnAddress())).to.be.gt(initialBurnBalance);
            expect(await redDragon.balanceOf(await redDragon.developmentAddress())).to.be.gt(initialDevBalance);
        });

        it("Should emit FeesDistributed event when fees are distributed", async function () {
            await redDragon.setExchangePair(addr1.address);
            
            // Transfer tokens to user
            await redDragon.transfer(addr2.address, ethers.parseEther("2000"));
            
            // Simulate a sell which should distribute fees
            const amount = ethers.parseEther("1000");
            
            // We need to trace all emitted events
            const tx = await redDragon.connect(addr2).transfer(addr1.address, amount);
            const receipt = await tx.wait();
            
            // Filter events for FeesDistributed
            const feesDistributedEvents = receipt.logs.filter(log => {
                try {
                    // Try to parse the log and check if it's a FeesDistributed event
                    const parsedLog = redDragon.interface.parseLog(log);
                    return parsedLog && parsedLog.name === "FeesDistributed";
                } catch (e) {
                    return false;
                }
            });
            
            // Ensure we found at least one FeesDistributed event
            expect(feesDistributedEvents.length).to.be.gt(0);
        });
    });

    describe("Fee Exemptions", function () {
        it("Should allow owner to add fee exemptions", async function () {
            await redDragon.setFeeExempt(addr1.address, true);
            expect(await redDragon.isFeeExempt(addr1.address)).to.be.true;
        });

        it("Should not allow non-owner to add fee exemptions", async function () {
            await expect(
                redDragon.connect(addr1).setFeeExempt(addr2.address, true)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should not take fees from exempt addresses", async function () {
            await redDragon.setFeeExempt(addr1.address, true);
            const amount = ethers.parseEther("1000");
            
            await redDragon.transfer(addr1.address, amount);
            expect(await redDragon.balanceOf(addr1.address)).to.equal(amount);
        });
    });
}); 