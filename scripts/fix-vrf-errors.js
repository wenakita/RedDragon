// Script to fix VRF compilation errors
const fs = require('fs');
const path = require('path');

console.log('Fixing VRF compilation errors...');

// Fix 1: Remove duplicate error declarations in IArbitrumVRFRequester.sol
const interfacePath = path.join(__dirname, '../contracts/interfaces/IArbitrumVRFRequester.sol');
if (fs.existsSync(interfacePath)) {
  console.log('Fixing duplicate error declarations in IArbitrumVRFRequester.sol...');
  
  let interfaceContent = fs.readFileSync(interfacePath, 'utf8');
  
  // Remove all error declarations since they're already in ArbitrumVRFRequester.sol
  const errorRegex = /error\s+[a-zA-Z0-9]+\(\);/g;
  const matches = interfaceContent.match(errorRegex) || [];
  
  if (matches.length > 0) {
    console.log(`Found ${matches.length} error declarations to remove`);
    
    // Replace each error declaration with a comment
    matches.forEach(match => {
      interfaceContent = interfaceContent.replace(match, `// Removed duplicate: ${match}`);
    });
    
    fs.writeFileSync(interfacePath, interfaceContent);
    console.log('Duplicate error declarations removed from IArbitrumVRFRequester.sol');
  } else {
    console.log('No error declarations found in IArbitrumVRFRequester.sol');
  }
} else {
  console.log('IArbitrumVRFRequester.sol not found.');
}

// Fix 2: Add missing MessagingReceipt import in SonicVRFConsumerRead.sol
const consumerReadPath = path.join(__dirname, '../contracts/SonicVRFConsumerRead.sol');
if (fs.existsSync(consumerReadPath)) {
  console.log('Fixing missing MessagingReceipt in SonicVRFConsumerRead.sol...');
  
  let consumerReadContent = fs.readFileSync(consumerReadPath, 'utf8');
  
  // Add the import for MessagingReceipt if it's missing
  if (!consumerReadContent.includes('MessagingReceipt')) {
    // Find the last import statement
    const lastImportIndex = consumerReadContent.lastIndexOf('import ');
    const lastImportEndIndex = consumerReadContent.indexOf(';', lastImportIndex) + 1;
    
    // Add the new import after the last import
    const newImport = '\nimport "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";';
    consumerReadContent = consumerReadContent.substring(0, lastImportEndIndex) + 
                          newImport + 
                          consumerReadContent.substring(lastImportEndIndex);
    
    // Update the import for OAppRead to use specific identifiers
    const oappReadImport = 'import "@layerzerolabs/oapp-evm/contracts/oapp/OAppRead.sol";';
    const updatedOAppReadImport = 'import { OAppRead, MessagingReceipt, MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppRead.sol";';
    
    // Replace the OAppRead import
    if (consumerReadContent.includes(oappReadImport)) {
      consumerReadContent = consumerReadContent.replace(oappReadImport, updatedOAppReadImport);
    }
    
    fs.writeFileSync(consumerReadPath, consumerReadContent);
    console.log('Added missing MessagingReceipt import to SonicVRFConsumerRead.sol');
  } else {
    console.log('MessagingReceipt import already exists in SonicVRFConsumerRead.sol');
  }
} else {
  console.log('SonicVRFConsumerRead.sol not found.');
}

console.log('\nFixed VRF compilation errors. Try compiling again with:');
console.log('npx hardhat compile'); 