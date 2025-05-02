// Script to update hardhat.config.ts to support multiple Solidity compiler versions
const fs = require('fs');
const path = require('path');

// Path to the hardhat config file
const configPath = path.join(__dirname, '../hardhat.config.ts');

console.log('Updating Hardhat configuration to support multiple Solidity versions...');

// Read the current config file
let configContent = fs.readFileSync(configPath, 'utf8');

// Check if the config already has multiple compilers
if (configContent.includes('compilers:')) {
  console.log('Config already has multiple compilers defined. Checking if 0.8.24 is included...');
  
  // Check if 0.8.24 is already included
  if (configContent.includes('"0.8.24"') || configContent.includes("'0.8.24'")) {
    console.log('Solidity 0.8.24 is already configured. No changes needed.');
    process.exit(0);
  }
  
  // Add 0.8.24 to existing compilers array
  const compilersMatch = configContent.match(/compilers:\s*\[([\s\S]*?)\]/);
  if (compilersMatch) {
    const updatedCompilers = compilersMatch[0].replace('[', '[\n      {\n        version: "0.8.24",\n        settings: {\n          optimizer: {\n            enabled: true,\n            runs: 200\n          }\n        }\n      },');
    configContent = configContent.replace(compilersMatch[0], updatedCompilers);
  }
} else {
  // Replace the simple solidity version with compilers array
  const solRegex = /solidity:\s*{[\s\S]*?version:\s*["']0\.8\.20["'],[\s\S]*?settings:\s*{[\s\S]*?optimizer:\s*{[\s\S]*?enabled:\s*true,[\s\S]*?runs:\s*\d+[\s\S]*?}[\s\S]*?}[\s\S]*?}/;
  
  const multiCompilerConfig = `solidity: {
    compilers: [
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  }`;
  
  configContent = configContent.replace(solRegex, multiCompilerConfig);
}

// Write the updated config back to the file
fs.writeFileSync(configPath, configContent);

console.log('Hardhat configuration updated successfully!');
console.log('Now supports Solidity versions: 0.8.20, 0.8.24');
console.log('You can now run: npx hardhat compile'); 