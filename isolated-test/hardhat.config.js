/**
 * @type import('hardhat/config').HardhatUserConfig
 */

// Explicitly change paths to avoid compiling problematic files
module.exports = {
  solidity: "0.8.20",
  paths: {
    sources: "./test-contracts", // Change source path to a subdirectory
    tests: "./test",
    cache: "./cache-2",
    artifacts: "./artifacts-2"
  }
}; 