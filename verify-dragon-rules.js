const fs = require('fs');

// Function to check if the code includes a pattern
function includesPattern(code, pattern) {
  return code.includes(pattern);
}

// Main function to verify the rules
function verifyRules() {
  console.log("Verifying Dragon Project Rules...\n");
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Read the Dragon contract
  console.log("Reading Dragon.sol...");
  const dragonPath = 'contracts/Dragon.sol';
  let dragonCode;
  try {
    dragonCode = fs.readFileSync(dragonPath, 'utf8');
    console.log("Successfully read Dragon.sol\n");
  } catch (error) {
    console.error(`Error reading ${dragonPath}: ${error.message}`);
    process.exit(1);
  }
  
  // VRF implementation files
  const vrfFiles = [
    'contracts/DragonCrossChainVRF.sol',
    'contracts/SonicVRFReceiver.sol'
  ];
  
  console.log("Reading VRF implementation files...");
  let vrfCode = '';
  for (const file of vrfFiles) {
    try {
      vrfCode += fs.readFileSync(file, 'utf8');
      console.log(`Successfully read ${file}`);
    } catch (error) {
      console.log(`Note: Couldn't read ${file}, skipping.`);
    }
  }
  console.log();
  
  // Test: Process functions are internal
  console.log("RULE 1: Process functions must be internal");
  if (includesPattern(dragonCode, 'function processBuy(address user, uint256 wrappedSonicAmount) internal')) {
    console.log("✅ processBuy is internal");
    testsPassed++;
  } else {
    console.log("❌ processBuy is not internal");
    testsFailed++;
  }
  
  if (includesPattern(dragonCode, 'function processSwapWithScratcher(address user, uint256 wrappedSonicAmount, uint256 scratcherId) internal')) {
    console.log("✅ processSwapWithScratcher is internal");
    testsPassed++;
  } else {
    console.log("❌ processSwapWithScratcher is not internal");
    testsFailed++;
  }
  
  if (includesPattern(dragonCode, 'function processSwapWithPromotion(') && 
      includesPattern(dragonCode, 'function processSwapWithPromotion') && 
      includesPattern(dragonCode.substr(dragonCode.indexOf('function processSwapWithPromotion')), ') internal {')) {
    console.log("✅ processSwapWithPromotion is internal");
    testsPassed++;
  } else {
    console.log("❌ processSwapWithPromotion is not internal");
    testsFailed++;
  }
  
  if (includesPattern(dragonCode, 'function processEntry(') && 
      includesPattern(dragonCode, 'function processEntry') &&
      includesPattern(dragonCode.substr(dragonCode.indexOf('function processEntry')), ') internal {')) {
    console.log("✅ processEntry is internal");
    testsPassed++;
  } else {
    console.log("❌ processEntry is not internal");
    testsFailed++;
  }
  console.log();
  
  // Test: registerWinningScratcher is restricted to goldScratcher
  console.log("RULE 2: registerWinningScratcher should only be callable by goldScratcher");
  if (includesPattern(dragonCode, 'require(msg.sender == goldScratcherAddress, "Only Gold Scratcher contract can register winning scratchers")')) {
    console.log("✅ registerWinningScratcher is properly restricted");
    testsPassed++;
  } else {
    console.log("❌ registerWinningScratcher is not properly restricted");
    testsFailed++;
  }
  console.log();
  
  // Test: VRF storage variables default to 0
  console.log("RULE 3: Storage variables in PaintSwap VRF should default to 0");
  if (vrfCode && (
      includesPattern(vrfCode, 'mapping(uint16 => address) public endpoints;') || 
      includesPattern(vrfCode, 'mapping(uint16 => address) public'))) {
    console.log("✅ VRF has mappings that default to zero");
    testsPassed++;
  } else if (!vrfCode) {
    console.log("⚠️ Couldn't verify VRF code - files not found");
  } else {
    console.log("❌ VRF mappings might not default to zero");
    testsFailed++;
  }
  console.log();
  
  // Test: Fee structure follows tokenomics rules
  console.log("RULE 4: Fee structure follows tokenomics rules");
  if (includesPattern(dragonCode, 'Fees public buyFees = Fees(690, 241, 69, 1000)')) {
    console.log("✅ Buy fees are correct (6.9% to jackpot, 2.41% to ve69LP, 0.69% burn)");
    testsPassed++;
  } else {
    console.log("❌ Buy fees might not be correct");
    testsFailed++;
  }
  
  if (includesPattern(dragonCode, 'Fees public sellFees = Fees(690, 241, 69, 1000)')) {
    console.log("✅ Sell fees are correct (6.9% to jackpot, 2.41% to ve69LP, 0.69% burn)");
    testsPassed++;
  } else {
    console.log("❌ Sell fees might not be correct");
    testsFailed++;
  }
  
  if (includesPattern(dragonCode, 'uint256 burnAmount = (amount * 69) / 10000;')) {
    console.log("✅ 0.69% burn on all transfers is implemented");
    testsPassed++;
  } else {
    console.log("❌ 0.69% burn on all transfers might not be implemented");
    testsFailed++;
  }
  
  // Summary
  console.log("\n==== VERIFICATION SUMMARY ====");
  console.log(`TOTAL TESTS: ${testsPassed + testsFailed}`);
  console.log(`PASSED: ${testsPassed}`);
  console.log(`FAILED: ${testsFailed}`);
  
  if (testsFailed === 0) {
    console.log("\n✅ ALL TESTS PASSED! The contract appears to comply with the Dragon Project Rules.");
  } else {
    console.log(`\n❌ ${testsFailed} TEST(S) FAILED! The contract may not fully comply with the Dragon Project Rules.`);
  }
}

// Run the verification
verifyRules(); 