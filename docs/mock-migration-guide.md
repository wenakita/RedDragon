# Mock Contract Migration Guide

## Overview

This guide outlines the process for migrating mock contracts from the duplicate locations (`contracts/mocks` and `contracts/test`) to a consolidated structure under `test/mocks`. This reorganization addresses artifact conflicts and improves test management.

## Migration Process

### 1. Set Up the New Directory Structure

```bash
# Create the new directory structure
mkdir -p test/mocks/tokens test/mocks/core test/mocks/external
mkdir -p test/unit/interfaces test/unit/core test/unit/peripheral
mkdir -p test/helpers
```

### 2. Run the Migration Helper Script

The migration helper script automates much of the process:

```bash
# Make the script executable
chmod +x scripts/migrate-mocks.js

# Run the script
node scripts/migrate-mocks.js
```

The script:
- Identifies all mock contracts in both `contracts/mocks` and `contracts/test`
- Automatically copies single implementations to the correct category folder
- Creates comparison files for duplicates that need manual merging
- Organizes mocks by category (tokens, core, and external)

### 3. Manual Merge for Duplicate Implementations

For contracts with implementations in both `contracts/mocks` and `contracts/test`:

1. Open the `COMPARE_*.sol` file created by the migration script
2. Review both implementations to identify all necessary features
3. Create a consolidated version that combines functionality from both
4. Save it to the appropriate location in `test/mocks/`

Example for `MockERC20.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @dev A comprehensive mock ERC20 token implementation for testing
 * This consolidated version combines the functionality from both
 * contracts/mocks/MockERC20.sol and contracts/test/MockERC20.sol
 */
contract MockERC20 is ERC20 {
    uint8 private _decimals;
    
    /**
     * @dev Constructor
     * @param name Token name
     * @param symbol Token symbol
     * @param decimals_ Number of decimals (defaults to 18 if not provided)
     */
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) {
        _decimals = decimals_;
    }
    
    // Combined functionality from both implementations...
}
```

### 4. Update Test Files

For each test file that uses mock contracts:

1. Update import paths to point to the new location
2. Use fully qualified names in `getContractFactory` calls to avoid ambiguity

Example:

```javascript
// Before
const MockERC20 = await ethers.getContractFactory("MockERC20");

// After - use fully qualified name
const MockERC20 = await ethers.getContractFactory("test/mocks/tokens/MockERC20.sol:MockERC20");
```

### 5. Clean Up Duplicate Files (Optional)

Once all tests are passing with the new structure, you can safely delete the original mock files:

```bash
# Remove duplicates after confirming tests pass
rm -rf contracts/test/*.sol
mv contracts/mocks/README.md test/mocks/
rm -rf contracts/mocks
```

### 6. Update Hardhat Configuration

Update your Hardhat configuration to recognize the new directory structure:

```javascript
// In hardhat.config.js
module.exports = {
  // ...
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  // ...
};
```

## Troubleshooting

### Dealing with Artifact Conflicts

If you still encounter artifact conflicts after migration:

1. Ensure you're using fully qualified contract names in `getContractFactory` calls
2. Clean the cache and recompile: `npx hardhat clean && npx hardhat compile`
3. Check for any remaining duplicates in the codebase

### Missing Dependencies

If migrated mock contracts have missing dependencies:

1. Check import paths in the mock contract file
2. Ensure any referenced interfaces or contracts are available
3. Update import paths to point to the correct locations

## Recommended Testing Flow

After migration, follow this approach for running tests:

```bash
# Run all tests
npx hardhat test

# Run tests for a specific component
npx hardhat test test/unit/interfaces/*.test.js

# Run a specific test file
npx hardhat test test/unit/interfaces/Ive69LPPoolVoting.test.js
``` 