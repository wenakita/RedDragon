# Dragon Ecosystem API Reference

This document provides API reference information for developers integrating with the Dragon Ecosystem. It covers key smart contract functions, events, and integration points.

## Table of Contents

1. [Dragon Token (`Dragon.sol`)](#dragon-token)
2. [Lottery System (`DragonLotterySwap.sol`)](#lottery-system)
3. [Voting Escrow (`ve69LP.sol`)](#voting-escrow)
4. [Fee Distributor (`ve69LPFeeDistributor.sol`)](#fee-distributor)
5. [Gold Scratcher (`GoldScratcher.sol`)](#gold-scratcher)
6. [Promotional Items (`PromotionalItemRegistry.sol`)](#promotional-items)
7. [Red Envelope (`RedEnvelope.sol`)](#red-envelope)
8. [Events Reference](#events-reference)
9. [Integration Examples](#integration-examples)
10. [Error Codes](#error-codes)

## Dragon Token

The core ERC20 token of the ecosystem with built-in fee mechanisms.

### Key Functions

#### Token Information

```solidity
// Get token name
function name() external view returns (string memory)

// Get token symbol
function symbol() external view returns (string memory)

// Get token decimals (18)
function decimals() external view returns (uint8)

// Get total supply (decreases over time due to burning)
function totalSupply() external view returns (uint256)

// Get balance of an address
function balanceOf(address account) external view returns (uint256)
```

#### Token Transfers

```solidity
// Transfer tokens to another address (subject to fees if not exempt)
function transfer(address to, uint256 amount) external returns (bool)

// Transfer tokens from one address to another (with allowance)
function transferFrom(address from, address to, uint256 amount) external returns (bool)

// Approve another address to spend tokens
function approve(address spender, uint256 amount) external returns (bool)

// Check allowance for a spender
function allowance(address owner, address spender) external view returns (uint256)
```

#### Fee Management

```solidity
// Get detailed fee information for buys and sells
function getDetailedFeeInfo() external view returns (
    uint256 jackpotFeeBuy_,
    uint256 burnFeeBuy_,
    uint256 ve69LPFeeBuy_,
    uint256 totalFeeBuy_,
    uint256 jackpotFeeSell_,
    uint256 burnFeeSell_,
    uint256 ve69LPFeeSell_,
    uint256 totalFeeSell_
)

// Check if an address is exempt from fees
function isExemptFromFees(address account) external view returns (bool)

// Get statistics about fee distributions
function getFeeStats() external view returns (
    uint256 totalBurned_,
    uint256 totalJackpotFees_,
    uint256 totalVe69LPFees_
)
```

#### Contract Configuration

```solidity
// Get detailed contract configuration
function getContractConfiguration() external view returns (
    address jackpotAddress_,
    address ve69LPAddress_,
    address burnAddress_,
    address wrappedSonicAddress_,
    address lotteryAddress_,
    address exchangePair_,
    bool tradingEnabled_,
    bool ownershipLocked_
)

// Get transaction limits information
function getLimitsInfo() external view returns (
    uint256 currentTxLimit,
    uint256 currentWalletLimit,
    uint256 specialTxRemaining,
    uint256 currentTxCount
)

// Burn tokens manually
function burn(uint256 amount) external
```

## Lottery System

The DragonLotterySwap contract handles lottery entries and jackpot distribution.

### Key Functions

#### Lottery Information

```solidity
// Get the current jackpot amount
function getCurrentJackpot() external view returns (uint256)

// Get lottery statistics
function getStats() external view returns (
    uint256 winners,
    uint256 payouts,
    uint256 current
)

// Get entry limits
function getSwapLimits() external view returns (
    uint256 min,
    uint256 max
)

// Get jackpot token symbol
function getJackpotTokenSymbol() external view returns (string memory)
```

#### Win Chance Calculation

```solidity
// Calculate win chance for a user
function calculateWinChance(address user, uint256 wsAmount) public view returns (uint256)

// Calculate jackpot percentage with boosts
function calculateJackpotPercentage(address _user) public view returns (uint256)

// Get the current total jackpot boost for a user
function getCurrentJackpotBoost(address user) public view returns (uint256)

// Get the current total probability boost for a user
function getCurrentProbabilityBoost(address user) public view returns (uint256)
```

#### VRF Configuration

```solidity
// Get information about VRF configuration
function getVRFConfiguration() external view returns (
    address vrfCoordinator_,
    bytes32 keyHash_,
    uint64 subscriptionId_
)

// Check if the lottery is enabled
function isLotteryEnabled() external view returns (bool)
```

### Integration Points

```solidity
// Process a delayed entry after VRF became unavailable
function processDelayedEntry(address user) external

// Callback for VRF random number generation
function fulfillRandomWords(
    uint256 requestId,
    uint256[] memory randomWords
) external
```

## Voting Escrow

The ve69LP contract allows users to lock DRAGON tokens for voting power.

### Key Functions

#### Locking Tokens

```solidity
// Create a new lock
function createLock(uint256 _amount, uint256 _unlockTime) external

// Increase amount of tokens locked
function increaseAmount(uint256 _amount) external

// Extend lock time
function increaseUnlockTime(uint256 _unlockTime) external
```

#### Lock Information

```solidity
// Get locked balance for an account
function lockedBalanceOf(address _account) external view returns (uint256)

// Get balance of an account at a specific timestamp
function balanceOfAt(address _account, uint256 _timestamp) external view returns (uint256)

// Get total supply of voting power at a specific timestamp
function totalSupplyAt(uint256 _timestamp) external view returns (uint256)

// Get lock end time for an account
function lockEndOf(address _account) external view returns (uint256)
```

#### Token Withdrawal

```solidity
// Withdraw tokens after lock period ends
function withdraw() external
```

## Fee Distributor

The ve69LPFeeDistributor contract distributes fees to ve69LP holders.

### Key Functions

#### Distribution Management

```solidity
// Claim fees for a specific token
function claim(address _token) external returns (uint256)

// Claim fees for multiple tokens
function claimMany(address[] calldata _tokens) external returns (bool)

// Get claimable amount for an account and token
function claimable(address _account, address _token) external view returns (uint256)
```

#### Distribution Configuration

```solidity
// Add a token for distribution
function addRewardToken(address _token) external

// Remove a token from distribution
function removeRewardToken(address _token) external

// Get list of distributable tokens
function getRewardTokens() external view returns (address[] memory)
```

## Gold Scratcher

The GoldScratcher contract implements NFT-based jackpot boosts.

### Key Functions

#### Scratcher Management

```solidity
// Mint a new Gold Scratcher
function mint(address to, uint256 boostBasisPoints) external returns (uint256)

// Check if a user has a winning scratcher
function hasWinningScratcher(address user, uint256 tokenId) external view returns (bool)

// Apply scratcher to swap
function applyToSwap(uint256 tokenId, uint256 amount) external returns (bool isWinner, uint256 boostedAmount)

// Calculate boost for a specific scratcher
function calculateBoost(address user, uint256 tokenId) external view returns (uint256)
```

#### Scratcher Information

```solidity
// Get token URI for a specific tokenId
function tokenURI(uint256 tokenId) external view returns (string memory)

// Get total supply of scratchers
function totalSupply() external view returns (uint256)

// Get all scratchers for an address
function getScratchers(address user) external view returns (uint256[] memory)
```

## Promotional Items

The PromotionalItemRegistry contract manages promotional items.

### Key Functions

#### Registry Management

```solidity
// Register a new promotional item type
function registerPromotionalItem(string calldata itemType, address itemContract) external

// Unregister a promotional item type
function unregisterPromotionalItem(string calldata itemType) external

// Get promotional item contract address by type
function getPromotionalItem(string calldata itemType) external view returns (address)

// Get all registered item types
function getRegisteredItemTypes() external view returns (string[] memory)
```

#### Promotion Interface

```solidity
// Promotional Item Interface functions
// These are implemented by each promotional item contract

// Check if a user has an item
function hasItem(address user, uint256 itemId) external view returns (bool)

// Apply item to a swap
function applyItem(uint256 itemId, address user, uint256 amount) external returns (bool isSuccess, uint256 boostedAmount)

// Get boost type (JACKPOT or PROBABILITY)
function getBoostType() external view returns (BoostType)

// Calculate boost for a specific item
function calculateBoost(address user, uint256 itemId) external view returns (uint256)
```

## Red Envelope

The RedEnvelope contract implements special reward distributions.

### Key Functions

#### Envelope Management

```solidity
// Create a new envelope
function createEnvelope(string calldata _name, address _rewardToken, uint256 _totalReward, uint256 _totalRecipients) external returns (uint256)

// Add recipients to an envelope
function addRecipients(uint256 _envelopeId, address[] calldata _recipients) external

// Claim rewards from an envelope
function claim(uint256 _envelopeId) external

// Get envelope info
function getEnvelopeInfo(uint256 _envelopeId) external view returns (
    string memory name,
    address creator,
    address rewardToken,
    uint256 totalReward,
    uint256 totalRecipients,
    uint256 claimedCount
)
```

#### Recipient Management

```solidity
// Check if an address is a recipient of an envelope
function isRecipient(uint256 _envelopeId, address _user) external view returns (bool)

// Check if an address has claimed from an envelope
function hasClaimed(uint256 _envelopeId, address _user) external view returns (bool)

// Get all envelopes created by a user
function getEnvelopesByCreator(address _creator) external view returns (uint256[] memory)
```

## Events Reference

### Dragon Token Events

```solidity
// Emitted when tokens are transferred (including fee transfers)
event Transfer(address indexed from, address indexed to, uint256 value)

// Emitted when an approval is set
event Approval(address indexed owner, address indexed spender, uint256 value)

// Emitted when trading is enabled
event TradingEnabled()

// Emitted when a fee exemption is set
event FeeExemptionChanged(address indexed account, bool isExempt)

// Emitted when ve69LP address is updated
event Ve69LPAddressUpdated(address indexed newAddress)
```

### Lottery System Events

```solidity
// Emitted when an amount is added to the jackpot
event JackpotAdded(uint256 amount)

// Emitted when a user enters the lottery
event EntryRegistered(address indexed user, uint256 wsAmount, uint256 winChance)

// Emitted when a user wins
event Winner(address indexed user, uint256 amount)

// Emitted when jackpot is distributed
event JackpotDistributed(address indexed winner, uint256 amount)

// Emitted when a scratcher boost is applied
event ScratcherBoostApplied(address indexed winner, uint256 boostAmount)

// Emitted when a promotion is applied
event PromotionApplied(address indexed user, string itemType, uint256 itemId, uint256 boostAmount, IPromotionalItem.BoostType boostType)
```

### Voting Escrow Events

```solidity
// Emitted when a new lock is created
event Locked(address indexed provider, uint256 amount, uint256 locktime)

// Emitted when more tokens are added to a lock
event AmountIncreased(address indexed provider, uint256 amount)

// Emitted when lock duration is extended
event LockExtended(address indexed provider, uint256 unlockTime)

// Emitted when tokens are withdrawn
event Withdrawn(address indexed provider, uint256 amount)
```

### Fee Distributor Events

```solidity
// Emitted when a user claims fees
event Claimed(address indexed user, address indexed token, uint256 amount)

// Emitted when a token is added for distribution
event TokenAdded(address indexed token)

// Emitted when a token is removed from distribution
event TokenRemoved(address indexed token)
```

## Integration Examples

### Integrating with the Lottery System

```javascript
// Example using ethers.js

const provider = new ethers.providers.JsonRpcProvider("https://rpc.soniclabs.com");
const wallet = new ethers.Wallet(privateKey, provider);

// Contract addresses
const dragonAddress = "0x...";
const wSonicAddress = "0x...";
const lotteryAddress = "0x...";

// Load contract ABIs
const Dragon = new ethers.Contract(dragonAddress, dragonAbi, wallet);
const WSonic = new ethers.Contract(wSonicAddress, wSonicAbi, wallet);
const Lottery = new ethers.Contract(lotteryAddress, lotteryAbi, wallet);

// Approve wSonic for use with lottery
async function approveWSonic(amount) {
  const tx = await WSonic.approve(lotteryAddress, ethers.utils.parseEther(amount));
  await tx.wait();
  console.log("Approved wSonic for lottery usage");
}

// Get lottery stats
async function getLotteryStats() {
  const [winners, payouts, currentJackpot] = await Lottery.getStats();
  console.log(`Total Winners: ${winners}`);
  console.log(`Total Payouts: ${ethers.utils.formatEther(payouts)} wS`);
  console.log(`Current Jackpot: ${ethers.utils.formatEther(currentJackpot)} wS`);
}

// Calculate win chance
async function calculateWinChance(userAddress, wSonicAmount) {
  const winChance = await Lottery.calculateWinChance(
    userAddress,
    ethers.utils.parseEther(wSonicAmount)
  );
  // Convert from basis points to percentage
  const percentage = (Number(winChance) / 100).toFixed(2);
  console.log(`Win Chance: ${percentage}%`);
}

// Set up lottery win event listener
function listenForWins() {
  Lottery.on("Winner", (user, amount) => {
    console.log(`Winner: ${user}`);
    console.log(`Amount Won: ${ethers.utils.formatEther(amount)} wS`);
  });
}
```

### Interacting with ve69LP Staking

```javascript
// Example using ethers.js

// Contract addresses
const dragonAddress = "0x...";
const ve69LPAddress = "0x...";

// Load contract ABIs
const Dragon = new ethers.Contract(dragonAddress, dragonAbi, wallet);
const Ve69LP = new ethers.Contract(ve69LPAddress, ve69LPAbi, wallet);

// Approve Dragon for use with ve69LP
async function approveDragon(amount) {
  const tx = await Dragon.approve(ve69LPAddress, ethers.utils.parseEther(amount));
  await tx.wait();
  console.log("Approved Dragon tokens for locking");
}

// Create a lock (lock period in days)
async function createLock(amount, lockPeriodDays) {
  // Convert days to Unix timestamp
  const unlockTime = Math.floor(Date.now() / 1000) + (lockPeriodDays * 86400);
  
  const tx = await Ve69LP.createLock(
    ethers.utils.parseEther(amount),
    unlockTime
  );
  await tx.wait();
  console.log(`Locked ${amount} DRAGON for ${lockPeriodDays} days`);
}

// Get voting power
async function getVotingPower(userAddress) {
  const balance = await Ve69LP.balanceOf(userAddress);
  console.log(`Voting Power: ${ethers.utils.formatEther(balance)} ve69LP`);
}

// Increase lock amount
async function increaseAmount(amount) {
  const tx = await Ve69LP.increaseAmount(ethers.utils.parseEther(amount));
  await tx.wait();
  console.log(`Added ${amount} DRAGON to existing lock`);
}
```

## Error Codes

| Contract | Error Code | Description |
|----------|------------|-------------|
| Dragon | E1 | Transfer amount exceeds balance |
| Dragon | E2 | Transfer to zero address |
| Dragon | E3 | Approve to zero address |
| Dragon | E4 | Transfer amount exceeds transaction limit |
| Dragon | E5 | Resulting balance exceeds wallet limit |
| Dragon | E6 | Trading not yet enabled |
| Dragon | E7 | Only owner can call this function |
| Lottery | L1 | VRF call failed |
| Lottery | L2 | Entry below minimum amount |
| Lottery | L3 | Entry above maximum amount |
| Lottery | L4 | Rate limit: Wait before next entry |
| Lottery | L5 | Caller must be EOA |
| ve69LP | V1 | Lock expired |
| ve69LP | V2 | Lock did not expire yet |
| ve69LP | V3 | Zero value |
| ve69LP | V4 | Lock time too short |
| ve69LP | V5 | Lock time too long |
| GoldScratcher | G1 | Invalid token ID |
| GoldScratcher | G2 | Only lottery can register winning scratcher |
| GoldScratcher | G3 | Scratcher already used |

## Cross-Contract Interaction Flow

The Dragon ecosystem contracts interact with each other in the following ways:

1. **Dragon → DragonLotterySwap**: Token swap triggers lottery entry
2. **Dragon → ve69LPFeeDistributor**: Fees are sent to fee distributor
3. **ve69LP → DragonLotterySwap**: Voting power updates boost calculations
4. **GoldScratcher → DragonLotterySwap**: Registers winning scratchers and applies boosts
5. **PromotionalItems → DragonLotterySwap**: Apply boosts from promotional items

---

### Additional Resources

- [Dragon System Architecture](./DRAGON_SYSTEM_DIAGRAM.md)
- [Google Cloud Deployment Guide](./DRAGON_GOOGLE_CLOUD_DEPLOYMENT.md)
- [Full Documentation](./DRAGON_DOCUMENTATION.md)

For any questions or bug reports, please contact the Dragon team. 