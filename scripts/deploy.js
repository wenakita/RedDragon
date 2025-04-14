const { ethers } = require("hardhat");

async function main() {
  // Deploy the mock ERC20 token for rewards in development
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const rewardToken = await MockERC20.deploy("RedDragon", "RD", 18);
  await rewardToken.deployed();
  console.log("RedDragon token deployed to:", rewardToken.address);

  // Deploy the ve8020 token
  const Ve8020 = await ethers.getContractFactory("ve8020");
  const ve8020 = await Ve8020.deploy(rewardToken.address);
  await ve8020.deployed();
  console.log("ve8020 token deployed to:", ve8020.address);

  // Deploy the fee distributor
  const Ve8020FeeDistributor = await ethers.getContractFactory("Ve8020FeeDistributor");
  const feeDistributor = await Ve8020FeeDistributor.deploy(
    ve8020.address,
    rewardToken.address
  );
  await feeDistributor.deployed();
  console.log("Ve8020FeeDistributor deployed to:", feeDistributor.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 