#!/bin/bash

# Script to move Shadow-related interfaces to the deprecated folder
# Run this from the project root directory

echo "Moving Shadow interfaces to deprecated directory..."

# Create backups first
mkdir -p backups/interfaces
cp contracts/interfaces/IShadowFactory.sol backups/interfaces/
cp contracts/interfaces/IShadowPair.sol backups/interfaces/
cp contracts/interfaces/IShadowRouter.sol backups/interfaces/
cp contracts/interfaces/IRouter.sol backups/interfaces/

# Move Shadow interfaces to deprecated folder
mv contracts/interfaces/IShadowFactory.sol contracts/deprecated/
mv contracts/interfaces/IShadowPair.sol contracts/deprecated/
mv contracts/interfaces/IShadowRouter.sol contracts/deprecated/
mv contracts/interfaces/IRouter.sol contracts/deprecated/

echo "Shadow interfaces have been moved to the deprecated folder."
echo "Make sure to update any imports in your contracts to use the Balancer interfaces instead."
echo "The following interfaces were moved:"
echo "- IShadowFactory.sol → Use IBalancerWeightedPoolFactory.sol instead"
echo "- IShadowPair.sol → No direct equivalent, but most functionality covered by IBalancerVault.sol"
echo "- IShadowRouter.sol → No direct equivalent, but most functionality covered by IBalancerVault.sol"
echo "- IRouter.sol → Use IBalancerVault.sol instead" 