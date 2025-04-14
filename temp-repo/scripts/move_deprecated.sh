#!/bin/bash

# Script to move redundant and duplicated contracts to the deprecated folder
# Run this from the project root directory

echo "Moving redundant contracts to deprecated directory..."

# Create backups first
mkdir -p backups
cp contracts/RedDragonThankYouToken.sol backups/
cp contracts/RedDragonLiquidityVault.sol backups/
cp contracts/RedDragonDevelopmentVault.sol backups/

# Move redundant contracts to deprecated folder
mv contracts/RedDragonThankYouToken.sol contracts/deprecated/
mv contracts/RedDragonLiquidityVault.sol contracts/deprecated/
mv contracts/RedDragonDevelopmentVault.sol contracts/deprecated/

echo "Creating symbolic links for backward compatibility..."

# Create symbolic links for backward compatibility in case other code relies on these files
ln -sf deprecated/RedDragonThankYouToken.sol contracts/RedDragonThankYouToken.sol
ln -sf deprecated/RedDragonLiquidityVault.sol contracts/RedDragonLiquidityVault.sol
ln -sf deprecated/RedDragonDevelopmentVault.sol contracts/RedDragonDevelopmentVault.sol

echo "Done! Check contracts/deprecated/ for the moved files."
echo "To remove the deprecated contracts completely, update import statements and remove the symbolic links." 