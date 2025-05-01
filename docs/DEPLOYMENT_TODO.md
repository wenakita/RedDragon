# Red Dragon Project Deployment TODO

## Deployed Contracts
- ✅ DragonPartnerRegistry: ``
- ✅ DragonPartnerRouter: ``
- ✅ ve69LPPoolVoting: ``
- ✅ SimpleShadowAdapter: ``

## Pending Tasks

### 1. ShadowDEXAdapter Implementation
- [ ] Solve the deployment issues with the full ShadowDEXAdapter
- [ ] Fix contract dependencies and verify Shadow DEX token interactions
- [ ] Ensure proper routing through Shadow DEX pools
- [ ] Implement ratio-based calculations using Shadow and xShadow contracts

### 2. Contract Integration
- [ ] Connect DragonPartnerRegistry with ShadowDEXAdapter
- [ ] Set up ShadowDEXAdapter as an authorized distributor in the registry
- [ ] Configure proper fee distribution (6.9% fee with 69/31 split)
- [ ] Test real token swaps and fee transfers

### 3. Price Calculations
- [ ] Implement and test the CONTRACT_RATIOS price method
- [ ] Set up proper token ratios for Dragon/wS conversions
- [ ] Verify wrapped Sonic equivalent calculations

### 4. System Testing
- [ ] Test complete swap flow from Dragon to BeetsLP
- [ ] Verify jackpot entry calculations
- [ ] Check probability boost allocations

## Token Addresses
- Dragon ($DRAGON): ``
- BeetsLP (Dragon/wS): ``
- Wrapped Sonic (wS): ``
- Shadow Token: `0x3333b97138D4b086720b5aE8A7844b1345a33333`
- xShadow Token: `0x5050bc082FF4A74Fb6B0B04385dEfdDB114b2424`

## Shadow DEX Addresses
- SwapRouter: `0x5543c6176feb9b4b179078205d7c29eea2e2d695`
- QuoterV1: `0x3003B4FeAFF95e09683FEB7fc5d11b330cd79Dc7`
- ShadowV3Factory: `0xcD2d0637c94fe77C2896BbCBB174cefFb08DE6d7`
- NonfungiblePositionManager: `0x12E66C8F215DdD5d48d150c8f46aD0c6fB0F4406`

## Required Fixes for ShadowDEXAdapter

1. **Contract Dependencies**:
   - Ensure proper xShadow and Shadow token contract interfaces
   - Fix ratio calculation methods

2. **Deployment Parameters**:
   - Use correct Shadow DEX router and quoter addresses
   - Provide appropriate gas limits
   
3. **Token Economics**:
   - Implement 6.9% fee with 69% to jackpot and 31% to ve69LP
   - Set appropriate boost percentages

4. **Security & Permissions**:
   - Ensure proper access controls
   - Set up emergency withdrawal mechanisms

## Resource Requirements
- Additional gas for full ShadowDEXAdapter deployment (8M+ gas)
- Shadow DEX pool liquidity for testing swaps
- Access to Shadow DEX documentation for integration details 