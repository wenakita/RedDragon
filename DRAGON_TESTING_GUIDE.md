# Dragon Ecosystem - Testing Guide

This document outlines how to test the Dragon Ecosystem contracts, covering both unit tests and integration tests for the entire system.

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Test Environment Setup](#test-environment-setup)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [Test Coverage](#test-coverage)
6. [Contract-Specific Testing](#contract-specific-testing)
7. [Randomness Testing](#randomness-testing)
8. [Continuous Integration](#continuous-integration)

## Testing Overview

The Dragon Ecosystem testing strategy covers:

- **Unit tests**: Test individual contract functions in isolation
- **Integration tests**: Test interactions between multiple contracts
- **Edge cases**: Test boundary conditions and potential failure points
- **Randomness**: Test VRF implementation and fallback mechanisms
- **Security**: Test access controls and reentrancy protection

## Test Environment Setup

### Prerequisites

- Node.js v14+
- Hardhat
- Ethers.js
- Chai

### Installation

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npx hardhat test test/Dragon.test.js

# Run with gas reporting
REPORT_GAS=true npx hardhat test
```

## Unit Testing

Each contract should have its own unit test file. Here's how the test files are organized:

- `test/Dragon.test.js` - Tests for the main token
- `test/DragonLotterySwap.test.js` - Tests for the lottery system
- `test/ve69LP.test.js` - Tests for the voting escrow
- `test/ve69LPFeeDistributor.test.js` - Tests for fee distribution
- `test/GoldScratcher.test.js` - Tests for the NFT boost system
- `test/PromotionalItemRegistry.test.js` - Tests for promotional items
- `test/RedEnvelope.test.js` - Tests for reward distribution

### Example Unit Test Structure

Here's a template for unit tests:

```javascript
// Dragon.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Dragon Token", function () {
  let Dragon, dragon;
  let owner, user1, user2, jackpotAddress, ve69LPAddress, burnAddress;

  beforeEach(async function () {
    [owner, user1, user2, jackpotAddress, ve69LPAddress, burnAddress] = await ethers.getSigners();
    Dragon = await ethers.getContractFactory("Dragon");
    dragon = await Dragon.deploy("Dragon", "DRAGON", ethers.utils.parseEther("1000000"), jackpotAddress, ve69LPAddress, burnAddress);
    await dragon.deployed();
  });

  describe("Basic Functions", function () {
    it("Should return the correct name and symbol", async function () {
      expect(await dragon.name()).to.equal("Dragon");
      expect(await dragon.symbol()).to.equal("DRAGON");
    });

    it("Should assign total supply to owner", async function () {
      const ownerBalance = await dragon.balanceOf(owner.address);
      expect(await dragon.totalSupply()).to.equal(ownerBalance);
    });
  });

  describe("Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      await dragon.transfer(user1.address, 50);
      const user1Balance = await dragon.balanceOf(user1.address);
      expect(user1Balance).to.equal(50);
    });

    it("Should apply fees on non-exempt transfers", async function () {
      // Enable trading first
      await dragon.enableTrading();
      
      // Ensure user1 is not exempt from fees
      expect(await dragon.isExemptFromFees(user1.address)).to.equal(false);
      
      // Transfer to user1
      await dragon.transfer(user1.address, 1000);
      
      // Transfer from user1 to user2
      await dragon.connect(user1).transfer(user2.address, 100);
      
      // Check balances (should be less than 100 due to fees)
      const user2Balance = await dragon.balanceOf(user2.address);
      expect(user2Balance).to.be.lt(100);
    });
  });

  describe("Fee Management", function () {
    it("Should correctly distribute fees", async function () {
      // Enable trading
      await dragon.enableTrading();
      
      // Initial balances
      const initialJackpotBalance = await dragon.balanceOf(jackpotAddress);
      const initialVe69LPBalance = await dragon.balanceOf(ve69LPAddress);
      const initialTotalSupply = await dragon.totalSupply();
      
      // Transfer (which triggers fees)
      await dragon.transfer(user1.address, ethers.utils.parseEther("1000"));
      await dragon.connect(user1).transfer(user2.address, ethers.utils.parseEther("100"));
      
      // Check fee distribution
      const newJackpotBalance = await dragon.balanceOf(jackpotAddress);
      const newVe69LPBalance = await dragon.balanceOf(ve69LPAddress);
      const newTotalSupply = await dragon.totalSupply();
      
      // Jackpot should have received fees
      expect(newJackpotBalance).to.be.gt(initialJackpotBalance);
      
      // ve69LP should have received fees
      expect(newVe69LPBalance).to.be.gt(initialVe69LPBalance);
      
      // Total supply should have decreased due to burning
      expect(newTotalSupply).to.be.lt(initialTotalSupply);
    });
  });
});
```

## Integration Testing

Integration tests check how different contracts interact with each other. Create specific test files:

- `test/integration/LotteryIntegration.test.js` - Tests lottery with token and scratcher
- `test/integration/GovernanceIntegration.test.js` - Tests voting and fee distribution
- `test/integration/PromotionIntegration.test.js` - Tests promotional item interactions

### Example Integration Test

```javascript
// LotteryIntegration.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lottery Integration", function () {
  let Dragon, dragon;
  let WrappedSonic, wSonic;
  let DragonLotterySwap, lottery;
  let GoldScratcher, scratcher;
  let owner, user1, jackpotAddress, ve69LPAddress, burnAddress;

  beforeEach(async function () {
    [owner, user1, jackpotAddress, ve69LPAddress, burnAddress] = await ethers.getSigners();
    
    // Deploy wrapped Sonic
    WrappedSonic = await ethers.getContractFactory("MockWrappedSonic");
    wSonic = await WrappedSonic.deploy();
    
    // Deploy Dragon token
    Dragon = await ethers.getContractFactory("Dragon");
    dragon = await Dragon.deploy("Dragon", "DRAGON", ethers.utils.parseEther("1000000"), 
                                jackpotAddress, ve69LPAddress, burnAddress);
    
    // Deploy verifier mock
    const Verifier = await ethers.getContractFactory("MockVerifier");
    const verifier = await Verifier.deploy();
    
    // Deploy promotional item registry
    const Registry = await ethers.getContractFactory("PromotionalItemRegistry");
    const registry = await Registry.deploy();
    
    // Deploy gold scratcher
    GoldScratcher = await ethers.getContractFactory("GoldScratcher");
    scratcher = await GoldScratcher.deploy();
    
    // Deploy concrete lottery implementation
    const ConcreteLottery = await ethers.getContractFactory("ConcreteDragonLotterySwap");
    lottery = await ConcreteLottery.deploy(
      wSonic.address,
      verifier.address,
      registry.address,
      scratcher.address
    );
    
    // Setup interconnections
    await dragon.setLotteryAddress(lottery.address);
    await scratcher.setLotteryAddress(lottery.address);
    
    // Fund accounts
    await wSonic.mint(user1.address, ethers.utils.parseEther("1000"));
    await wSonic.connect(user1).approve(lottery.address, ethers.utils.parseEther("1000"));
    
    // Enable trading
    await dragon.enableTrading();
    
    // Initialize exchange pair (mock)
    const mockPair = owner.address; // just for testing
    await dragon.setExchangePair(mockPair);
    await lottery.setExchangePair(mockPair);
  });

  describe("Lottery Entry with Scratcher", function () {
    it("Should apply scratcher boost when entering lottery", async function () {
      // Mint a scratcher to user1
      await scratcher.mint(user1.address, 1000); // 10% boost
      const scratcherId = 1; // First token ID
      
      // Mock the lottery entry
      // This would normally happen through a swap, but we can test directly
      const entryAmount = ethers.utils.parseEther("10");
      
      // Fund the lottery with some jackpot
      await wSonic.mint(lottery.address, ethers.utils.parseEther("100"));
      await lottery.addToJackpot(ethers.utils.parseEther("100"));
      
      // Force a win by manipulating the random number (test only)
      // In production, this would come from Chainlink VRF
      await lottery.setTestRandomNumber(0); // Always win
      
      // Process entry with scratcher
      await lottery.connect(user1).testProcessEntry(
        user1.address,
        entryAmount,
        scratcherId,
        "",
        0
      );
      
      // Check if user's balance increased with boost
      const userBalance = await wSonic.balanceOf(user1.address);
      
      // Should have won with a 10% boost on top of the standard 69% jackpot
      const expectedWin = ethers.utils.parseEther("100")
                         .mul(6900 + 1000).div(10000); // 79% of jackpot
      
      expect(userBalance).to.be.approximately(
        ethers.utils.parseEther("1000").sub(entryAmount).add(expectedWin),
        ethers.utils.parseEther("0.1") // Allow for small rounding differences
      );
    });
  });
});
```

## Test Coverage

Aim for high test coverage to ensure all code paths are tested:

```bash
# Run coverage report
npx hardhat coverage
```

Ensure your tests cover:

1. **All state-changing functions**: transfers, swaps, locking, claiming
2. **Edge cases**: zero amounts, max values, unauthorized access
3. **Fee calculations**: verify exact fee amounts and distributions
4. **Randomness**: both VRF and fallback paths
5. **Access control**: owner-only functions behave correctly

## Contract-Specific Testing

### Dragon Token Testing

- Test fee mechanics for buys and sells
- Test exemption functions
- Test transaction and wallet limits
- Test locked ownership functionality
- Test timelock mechanisms for parameter changes

### Lottery Testing

- Test entry mechanisms
- Test random number generation (both VRF and fallback)
- Test win chance calculations
- Test jackpot distribution
- Test integration with scratcher and promotional items

### ve69LP Testing

- Test locking mechanisms
- Test voting power calculation
- Test lock extension
- Test withdrawal after lock expiry
- Test balance and supply at specific timestamps

### Gold Scratcher Testing

- Test minting functionality
- Test boost calculations
- Test one-time usage restrictions
- Test integration with lottery

### Promotional Items Testing

- Test registration system
- Test boost calculations for different item types
- Test boost limits and capping
- Test item application to swaps

## Randomness Testing

The lottery relies on Chainlink VRF for randomness, with a fallback mechanism. Test both paths:

### VRF Testing

```javascript
// Test the VRF path
it("Should use Chainlink VRF when available", async function () {
  // Mock the VRF coordinator
  const mockVRF = await deployMockVRFCoordinator();
  
  // Connect the lottery to the mock
  await lottery.setVerifier(mockVRF.address);
  
  // Trigger a lottery entry which requests randomness
  await lottery.connect(user1).testProcessEntry(
    user1.address,
    ethers.utils.parseEther("10"),
    0, // No scratcher
    "", // No promotion
    0  // No promotion ID
  );
  
  // Check that VRF was called
  expect(mockVRF.requestRandomnessCalled()).to.be.true;
  
  // Simulate VRF callback
  await mockVRF.fulfillRandomWords(
    1, // requestId
    [123456] // random value
  );
  
  // Verify the random number was stored
  expect(await lottery.randomNumber()).to.equal(123456);
});
```

### Fallback Testing

```javascript
// Test the fallback path
it("Should use fallback randomness when VRF is unavailable", async function () {
  // Set the verifier to address(0) to simulate unavailable VRF
  await lottery.setVerifier(ethers.constants.AddressZero);
  
  // Process a lottery entry
  await lottery.connect(user1).testProcessEntry(
    user1.address,
    ethers.utils.parseEther("10"),
    0, // No scratcher
    "", // No promotion
    0  // No promotion ID
  );
  
  // Verify entry was processed (if fallback didn't work, this would revert)
  const entryInfo = await lottery.lastEntryInfo(user1.address);
  expect(entryInfo.amount).to.equal(ethers.utils.parseEther("10"));
});
```

## Continuous Integration

Set up GitHub Actions to run tests automatically:

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2
    - name: Use Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '14.x'
    - name: Install dependencies
      run: npm ci
    - name: Compile contracts
      run: npm run compile
    - name: Run tests
      run: npm test
    - name: Run coverage
      run: npx hardhat coverage
```

## Mock Contracts

For effective testing, create mock contracts:

### MockWrappedSonic

```solidity
// contracts/mocks/MockWrappedSonic.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockWrappedSonic is ERC20 {
    constructor() ERC20("Wrapped Sonic", "wS") {}
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

### MockVerifier

```solidity
// contracts/mocks/MockVerifier.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IDragonPaintSwapVRF.sol";
import "../interfaces/IVRFConsumer.sol";

contract MockVerifier is IDragonPaintSwapVRF {
    bytes32 public lastRequestId;
    address public consumer;
    bool public shouldFail;
    
    function setShouldFail(bool _shouldFail) external {
        shouldFail = _shouldFail;
    }
    
    function requestRandomness() external override returns (bytes32) {
        if (shouldFail) {
            revert("VRF failed");
        }
        
        consumer = msg.sender;
        lastRequestId = keccak256(abi.encodePacked(block.timestamp, msg.sender));
        return lastRequestId;
    }
    
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
        IVRFConsumer(consumer).fulfillRandomWords(requestId, randomWords);
    }
    
    function getVRFConfiguration() external pure override returns (
        address vrfCoordinator_,
        bytes32 keyHash_,
        uint64 subscriptionId_
    ) {
        return (address(0), bytes32(0), 0);
    }
}
```

## Conclusion

This testing guide provides a comprehensive approach to testing the Dragon Ecosystem contracts. Following these practices will help ensure the reliability and security of the system.

For any questions or issues with testing, please contact the Dragon team. 