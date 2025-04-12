# $DRAGON Balancer 80/20 Pool on Sonic Network

This guide explains how to set up an 80/20 weighted pool for $DRAGON token on Sonic Network using the Beethoven X (Balancer) protocol. The 80/20 implementation provides better capital efficiency, reduced impermanent loss, and deeper liquidity compared to traditional 50/50 AMMs.

## Sonic Network Addresses

The following are the official contract addresses on Sonic Network that we'll be using:

| Contract | Address |
|----------|---------|
| Vault V2 | 0xBA12222222228d8Ba445958a75a0704d566BF2C8 |
| Vault V3 | 0xbA1333333333a1BA1108E8412f11850A5C319bA9 |
| WeightedPoolFactory | 0x22f5b7FDD99076f1f20f8118854ce3984544D56d |
| wSONC (Wrapped Sonic) | 0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38 |
| Beets Token | 0x2D0E0814E62D80056181F5cd932274405966e4f0 |

## Deployment Steps

### 1. Deploy Security Contracts

First, deploy all the security contracts using the deployment script that has been updated with the correct Sonic Network addresses:

```bash
npx hardhat run scripts/deploy-security-contracts.js --network sonic
```

This will deploy:
- RedDragonTimelock
- RedDragonLPBurner
- RedDragonVerifier
- RedDragonBalancerIntegration

### 2. Create 80/20 Pool

After deployment, use the RedDragonBalancerIntegration contract to create an 80/20 weighted pool:

```javascript
// Example using ethers.js to interact with the contract
const balancerIntegration = await ethers.getContractAt(
  "RedDragonBalancerIntegration", 
  "YOUR_DEPLOYED_INTEGRATION_CONTRACT_ADDRESS"
);

// Optional: Set a custom pool name and symbol (must be done BEFORE creating the pool)
await balancerIntegration.setPoolNameAndSymbol(
  "80DRAGON-20SONIC", // Custom pool name
  "DR-SONIC"          // Custom pool symbol
);

// Create pool with 0.25% swap fee (25 basis points)
const tx = await balancerIntegration.createPool(25);
await tx.wait();

// Get pool address from events
const receipt = await tx.wait();
const poolCreatedEvent = receipt.events.find(e => e.event === 'PoolCreated');
const poolAddress = poolCreatedEvent.args.poolAddress;
console.log(`Pool created at address: ${poolAddress}`);
```

### 3. Add Initial Liquidity

Add initial liquidity to establish the pool. Remember the ratio should be 80% DRAGON and 20% paired token by value.

```javascript
// Example amounts (adjust based on your specific token values)
const dragonAmount = ethers.utils.parseEther("10000000"); // 10 million DRAGON
const pairedTokenAmount = ethers.utils.parseEther("2500000"); // 2.5 million paired token (adjust to match value)

// Approve tokens first
const dragonToken = await ethers.getContractAt("IERC20", "YOUR_DRAGON_TOKEN_ADDRESS");
const pairedToken = await ethers.getContractAt("IERC20", "YOUR_PAIRED_TOKEN_ADDRESS");

await dragonToken.approve(balancerIntegration.address, dragonAmount);
await pairedToken.approve(balancerIntegration.address, pairedTokenAmount);

// Add initial liquidity
const addLiquidityTx = await balancerIntegration.addInitialLiquidity(
  dragonAmount,
  pairedTokenAmount
);
await addLiquidityTx.wait();
```

### 4. Burn LP Tokens for Security

For added security, burn 20% of LP tokens permanently while allocating 80% to fee collector:

```javascript
// Get LP tokens (you can use the pool address to create contract instance)
const poolToken = await ethers.getContractAt("IERC20", poolAddress);
const lpBalance = await poolToken.balanceOf(yourAddress);

// Approve LP tokens for burning
await poolToken.approve(balancerIntegration.address, lpBalance);

// Burn 20% of LP tokens and allocate 80% to fee collector
const burnTx = await balancerIntegration.burnPoolTokens(lpBalance);
await burnTx.wait();
```

## Pool Management

### Update Pool Fee

You can update the pool swap fee if needed (up to 3%):

```javascript
// Set new fee to 0.5% (50 basis points)
await balancerIntegration.updatePoolFee(50);
```

### Emergency Recovery

In case tokens are accidentally sent to the contract:

```javascript
// Recover tokens
await balancerIntegration.emergencyWithdraw(tokenAddress, amount);
```

## Integrating with Beethoven X UI

After creating your pool, you can also integrate it with the Beethoven X UI:

1. Visit the Beethoven X (Balancer) interface for Sonic Network
2. Connect your wallet
3. Navigate to "Pools" section
4. Add your pool by entering the pool address
5. Users can now interact with your pool through the UI

## Security Considerations

1. **LP Token Burning**: Our implementation burns 20% of LP tokens for security while allowing 80% to be used for fee extraction
2. **MultiSig Control**: Ensure critical functions are controlled by the MultiSig wallet
3. **Fee Management**: Fee extraction should be handled through the MultiSig for transparency
4. **Pool Verification**: After deployment, verify the pool parameters on Balancer's interface

## Benefits of 80/20 Pools

1. **Capital Efficiency**: Requires less paired token (wSONC) to create deep liquidity
2. **Reduced Impermanent Loss**: Less exposure to paired token price fluctuations
3. **Higher DRAGON Concentration**: Better supports the token's price stability
4. **Fee Optimization**: Configurable swap fees to create the best trading experience

## Troubleshooting

If you encounter issues:

1. Check that you're using the correct contract addresses for Sonic Network
2. Verify you have sufficient balances of both tokens
3. Ensure all approvals are correctly set
4. Confirm that contract interactions are happening from the owner address
5. Verify gas settings for Sonic Network 