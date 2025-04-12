# Changelog

All notable changes to the SonicRedDragon project will be documented in this file.

## [Unreleased]

### Changed
- Replaced Drand-based lottery system with PaintSwap VRF
- Updated deployment scripts to use PaintSwap VRF contracts
- Removed all Drand-related code and dependencies
- Updated documentation to reflect PaintSwap VRF integration

### Added
- New PaintSwap VRF Verifier contract
- New PaintSwap VRF Lottery contract
- Updated deployment guide with PaintSwap VRF setup instructions

## [1.0.0] - 2024-03-19

### Added
- Initial release of SonicRedDragon contracts
- RedDragon token with automated liquidity management
- Jackpot Vault for prize pool management
- Deployment scripts and documentation
- Test suite for contract verification

### Security
- Implemented secure multisig governance
- Added timelocked operations
- No minting capability
- No blacklist functions
- Verified random number generation

## [0.9.0] - 2023-03-25

### Added
- Completed test suite with 100% coverage
- Implemented drand lottery verification system
- Added multisig wallet functionality
- Created deployment scripts

### Changed
- Optimized fee distribution mechanism
- Improved gas efficiency on core token functions
- Enhanced security measures for lottery draws

### Fixed
- Fixed issue with jackpot calculation
- Resolved timing issue in lottery randomness
- Corrected contract verification procedure 