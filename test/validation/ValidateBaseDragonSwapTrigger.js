// Script to validate the BaseDragonSwapTrigger contract
// This script checks for syntax and import errors without deploying

const fs = require('fs');
const path = require('path');

const contractsPath = path.join(__dirname, '../../contracts');
const baseTriggerPath = path.join(contractsPath, 'BaseDragonSwapTrigger.sol');
const chainSpecificPath = path.join(contractsPath, 'ChainSpecificSwapTrigger.sol');

// Function to validate contract imports
function validateContractImports(contractPath) {
  console.log(`\nValidating imports for ${path.basename(contractPath)}...`);
  
  try {
    // Read contract file
    const contractContent = fs.readFileSync(contractPath, 'utf8');
    
    // Extract import statements
    const importRegex = /import\s+["'](.+)["'];/g;
    const imports = [];
    let match;
    
    while ((match = importRegex.exec(contractContent)) !== null) {
      imports.push(match[1]);
    }
    
    console.log(`Found ${imports.length} imports:`);
    
    // Validate each import
    imports.forEach(importPath => {
      // Check if import is from node_modules
      if (importPath.startsWith('@')) {
        console.log(`  - ${importPath} [External package - validation skipped]`);
        return;
      }
      
      // Resolve local import path
      const resolvedPath = path.join(
        path.dirname(contractPath),
        importPath
      );
      
      // Check if file exists
      if (fs.existsSync(resolvedPath)) {
        console.log(`  - ${importPath} [✓ Found]`);
      } else {
        console.log(`  - ${importPath} [✗ Not found: ${resolvedPath}]`);
      }
    });
    
    return imports;
  } catch (error) {
    console.error(`Error reading contract at ${contractPath}:`, error.message);
    return [];
  }
}

// Function to check contract syntax
function checkContractSyntax(contractPath) {
  console.log(`\nAnalyzing syntax for ${path.basename(contractPath)}...`);
  
  try {
    const contractContent = fs.readFileSync(contractPath, 'utf8');
    
    // Check for common syntax issues
    if (!contractContent.includes('pragma solidity')) {
      console.log('  - [✗] Missing pragma solidity statement');
    } else {
      console.log('  - [✓] Pragma solidity statement found');
    }
    
    // Check for contract definition
    if (!contractContent.match(/contract\s+\w+/)) {
      console.log('  - [✗] Missing contract definition');
    } else {
      const contractMatch = contractContent.match(/contract\s+(\w+)/);
      console.log(`  - [✓] Contract definition found: ${contractMatch[1]}`);
      
      // Check inheritance
      const inheritanceMatch = contractContent.match(/contract\s+\w+\s+is\s+(.+)\s*\{/);
      if (inheritanceMatch) {
        const inheritedContracts = inheritanceMatch[1].split(',').map(c => c.trim());
        console.log(`  - [✓] Inheritance: ${inheritedContracts.join(', ')}`);
      }
    }
    
    // Check constructor
    if (!contractContent.includes('constructor(')) {
      console.log('  - [✗] Missing constructor');
    } else {
      console.log('  - [✓] Constructor found');
    }
    
    return true;
  } catch (error) {
    console.error(`Error checking contract syntax at ${contractPath}:`, error.message);
    return false;
  }
}

// Main validation function
async function validateBaseDragonSwapTrigger() {
  console.log('BaseDragonSwapTrigger Validation');
  console.log('===============================');
  
  // Validate BaseDragonSwapTrigger
  validateContractImports(baseTriggerPath);
  checkContractSyntax(baseTriggerPath);
  
  // Validate ChainSpecificSwapTrigger (parent contract)
  validateContractImports(chainSpecificPath);
  checkContractSyntax(chainSpecificPath);
  
  console.log('\nValidation completed!');
}

// Run validation
validateBaseDragonSwapTrigger().catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
}); 