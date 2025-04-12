const hre = require("hardhat");
const { formatUnits, parseUnits } = require("ethers");
const fs = require('fs');

async function main() {
    console.log("🚀 Creating liquidity pair for RedDragon...");

    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("🔑 Using account:", deployer.address);

    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", formatUnits(balance, 18), "wS");

    try {
        // Load deployment addresses
        const addresses = JSON.parse(fs.readFileSync('deployment-addresses-sonic.json'));
        const redDragonAddress = addresses.redDragon;
        const wrappedSonicAddress = process.env.WRAPPED_SONIC_ADDRESS;
        const shadowRouterAddress = process.env.SHADOW_DEX_ROUTER;
        const shadowFactoryAddress = process.env.SHADOW_DEX_FACTORY;

        console.log("📋 Using addresses:");
        console.log("- RedDragon:", redDragonAddress);
        console.log("- Wrapped Sonic:", wrappedSonicAddress);
        console.log("- Shadow Router:", shadowRouterAddress);
        console.log("- Shadow Factory:", shadowFactoryAddress);

        // Get contract instances
        const RedDragon = await hre.ethers.getContractFactory("RedDragon");
        const redDragon = await RedDragon.attach(redDragonAddress);

        // Create interface ABIs
        const IWETH = [
            "function deposit() external payable",
            "function transfer(address to, uint value) external returns (bool)",
            "function balanceOf(address owner) external view returns (uint)"
        ];

        const IERC20 = [
            "function approve(address spender, uint256 amount) external returns (bool)",
            "function balanceOf(address account) external view returns (uint256)"
        ];

        const IShadowRouter = [
            "function factory() external view returns (address)",
            "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)"
        ];

        const IShadowFactory = [
            "function getPair(address tokenA, address tokenB) external view returns (address pair)",
            "function createPair(address tokenA, address tokenB) external returns (address pair)"
        ];

        // Create contract instances with interfaces
        const wSAsWETH = new hre.ethers.Contract(wrappedSonicAddress, IWETH, deployer);
        const wSAsERC20 = new hre.ethers.Contract(wrappedSonicAddress, IERC20, deployer);
        const router = new hre.ethers.Contract(shadowRouterAddress, IShadowRouter, deployer);
        const factory = new hre.ethers.Contract(shadowFactoryAddress, IShadowFactory, deployer);

        // Amounts for liquidity (80% DRAGON, 20% wS)
        const tokenAmount = parseUnits("800000", 18); // 800K RedDragon tokens (80%)
        const wSAmount = parseUnits("0.2", 18);      // 0.2 wS (20%)

        console.log("\n📦 Step 1: Wrapping Sonic...");
        const wrapTx = await wSAsWETH.deposit({ value: wSAmount });
        await wrapTx.wait();
        console.log("✅ Wrapped", formatUnits(wSAmount, 18), "Sonic to wS");
        
        console.log("\n📦 Step 2: Approving token transfers...");
        
        // Approve router to spend tokens
        const approveTokenTx = await redDragon.approve(shadowRouterAddress, tokenAmount);
        await approveTokenTx.wait();
        console.log("✅ Approved RedDragon tokens");

        const approveWSTx = await wSAsERC20.approve(shadowRouterAddress, wSAmount);
        await approveWSTx.wait();
        console.log("✅ Approved wS tokens");

        console.log("\n📦 Step 3: Creating pair if it doesn't exist...");
        let pairAddress = await factory.getPair(redDragonAddress, wrappedSonicAddress);
        
        if (pairAddress === "0x0000000000000000000000000000000000000000") {
            console.log("Creating new pair...");
            const createPairTx = await factory.createPair(redDragonAddress, wrappedSonicAddress);
            await createPairTx.wait();
            pairAddress = await factory.getPair(redDragonAddress, wrappedSonicAddress);
            console.log("✅ Created new pair:", pairAddress);
        } else {
            console.log("✅ Pair already exists:", pairAddress);
        }

        console.log("\n📦 Step 4: Adding liquidity...");
        
        // Add liquidity with 80/20 ratio
        const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes
        const addLiquidityTx = await router.addLiquidity(
            redDragonAddress,
            wrappedSonicAddress,
            tokenAmount,
            wSAmount,
            tokenAmount.mul(99).div(100), // 1% slippage
            wSAmount.mul(99).div(100),    // 1% slippage
            deployer.address,
            deadline,
            { gasLimit: 5000000 } // Set explicit gas limit
        );
        await addLiquidityTx.wait();
        console.log("✅ Liquidity added successfully");

        console.log("\n📦 Step 5: Setting exchange pair in RedDragon contract...");
        try {
            const setPairTx = await redDragon.setExchangePair(pairAddress);
            await setPairTx.wait();
            console.log("✅ Exchange pair set successfully");
        } catch (error) {
            console.log("⚠️ Could not set exchange pair (might already be set):", error.message);
        }

        // Update .env with LP token address
        console.log("\n📦 Step 6: Updating .env with LP token address...");
        try {
            let envContent = fs.readFileSync('.env', 'utf8');
            envContent = envContent.replace(/LP_TOKEN_ADDRESS=".*"/, `LP_TOKEN_ADDRESS="${pairAddress}"`);
            fs.writeFileSync('.env', envContent);
            console.log("✅ Updated LP_TOKEN_ADDRESS in .env");
        } catch (error) {
            console.error("❌ Could not update .env:", error.message);
            console.log("⚠️ Please manually add LP_TOKEN_ADDRESS to your .env file");
        }

        // Update deployment addresses
        addresses.lpToken = pairAddress;
        fs.writeFileSync('deployment-addresses-sonic.json', JSON.stringify(addresses, null, 2));
        console.log("✅ Updated deployment-addresses-sonic.json");

        console.log("\n🎉 Liquidity pair creation complete!");
        console.log("\n📋 Summary:");
        console.log("- RedDragon Token:", redDragonAddress);
        console.log("- wS Token:", wrappedSonicAddress);
        console.log("- LP Token Address:", pairAddress);
        console.log("- Initial Liquidity: 800K RedDragon + 0.2 wS (80/20 ratio)");
        console.log("\nNext steps:");
        console.log("1. Deploy ve8020 contract:");
        console.log("   npx hardhat run scripts/deployment/deploy-ve8020.js --network sonic");

    } catch (error) {
        console.error("\n❌ Error during liquidity pair creation:");
        console.error(error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Liquidity pair creation failed:");
        console.error(error);
        process.exit(1);
    }); 