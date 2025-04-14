# Contract Refactoring Guide

This document outlines the steps needed to refactor the codebase to eliminate duplication and redundancy while maintaining backward compatibility.

## New Interface Files

The following interfaces have been created to centralize duplicated code:

1. `IPaintSwapVRF.sol` - Interface for PaintSwap's VRF service
2. `IBudgetManager.sol` - Interface for budget management functionality
3. `IEmergencyWithdrawable.sol` - Interface for emergency withdrawal functionality

## Deprecated Contracts

The following contracts have been identified as redundant and moved to the `deprecated` directory:

1. `RedDragonThankYouToken.sol` - Superseded by `RedDragonThankYouTokenMulti.sol`
2. `RedDragonLiquidityVault.sol` - Functionality included in `RedDragonLiquiDevVault.sol`
3. `RedDragonDevelopmentVault.sol` - Functionality included in `RedDragonLiquiDevVault.sol`

## Refactoring Steps

### 1. Update Import Statements

In any contract that imports a deprecated contract or duplicates interfaces, update the import statements to use the new interfaces:

```solidity
// Before
import "./RedDragonThankYouToken.sol";

// After
import "./RedDragonThankYouTokenMulti.sol";
```

```solidity
// Before
interface IPaintSwapVRF {
    function requestRandomness() external returns (bytes32);
    function fulfillRandomness(bytes32 requestId, uint256[] memory randomWords) external;
}

// After
import "./interfaces/IPaintSwapVRF.sol";
```

### 2. Implement New Interfaces

Update existing contracts to implement the new interfaces:

```solidity
// Before
contract RedDragonLiquiDevVault is Ownable {
    function emergencyWithdraw(address token, address to, uint256 amount) external onlyOwner {
        // Implementation
    }
}

// After
import "./interfaces/IEmergencyWithdrawable.sol";

contract RedDragonLiquiDevVault is Ownable, IEmergencyWithdrawable {
    function emergencyWithdraw(address token, address to, uint256 amount) external override onlyOwner {
        // Implementation
    }
}
```

### 3. Remove Duplicate Structs

Replace duplicate structs with the ones defined in interfaces:

```solidity
// Before
struct Budget {
    string purpose;
    uint256 amount;
    uint256 used;
    uint256 createdAt;
    bool active;
}

// After
import "./interfaces/IBudgetManager.sol";

// Use IBudgetManager.Budget instead of defining your own
```

## Testing

After making these changes, thoroughly test all functionality to ensure backward compatibility. Pay special attention to:

1. Contracts that might be importing the deprecated contracts
2. Any external systems that interact with the contracts
3. Test cases that might be using the deprecated contracts

## Deployment Considerations

When deploying updated contracts:

1. Ensure all interface addresses are correct
2. If replacing contracts in a live system, follow proper upgrade procedures
3. Consider implementing a version control system for contracts

## Next Steps

After successfully refactoring, the symbolic links to deprecated contracts can be removed to completely eliminate redundancy from the main source tree. 