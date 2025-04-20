#!/usr/bin/env node

/**
 * Mock Contract Migration Helper
 * 
 * This script helps with migrating mock contracts from contracts/mocks and contracts/test
 * to the consolidated test/mocks directory structure.
 * 
 * Usage:
 *   node scripts/migrate-mocks.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Directory constants
const CONTRACTS_MOCKS_DIR = path.join(__dirname, '..', 'contracts', 'mocks');
const CONTRACTS_TEST_DIR = path.join(__dirname, '..', 'contracts', 'test');
const TEST_MOCKS_DIR = path.join(__dirname, '..', 'test', 'mocks');

// Mock contract categories
const TOKEN_MOCKS = ['MockERC20', 'MockToken', 'MockVe69LP', 'MockXShadow', 'MockX33'];
const CORE_MOCKS = ['Mockve69LPBoost', 'Mockve69LPFeeDistributor', 'MockJackpot', 'MockDragonLotteryWithBoost'];
const EXTERNAL_MOCKS = [
  'MockBalancerVault', 'MockShadowQuoter', 'MockShadowRouter', 
  'MockPaintSwapVRF', 'MockPaintSwapVerifier', 'MockVRFCoordinator',
  'MockExchangePair', 'MockRouter', 'MockWeightedPool', 'MockWeightedPoolFactory'
];

// Create directories if they don't exist
const ensureDirExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Get the target directory for a mock based on its name
const getTargetDirForMock = (mockName) => {
  if (TOKEN_MOCKS.includes(mockName)) {
    return path.join(TEST_MOCKS_DIR, 'tokens');
  } else if (CORE_MOCKS.includes(mockName)) {
    return path.join(TEST_MOCKS_DIR, 'core');
  } else {
    return path.join(TEST_MOCKS_DIR, 'external');
  }
};

// Find all mock contract files in contracts/mocks and contracts/test
const findMockFiles = () => {
  const mockFiles = [];
  
  if (fs.existsSync(CONTRACTS_MOCKS_DIR)) {
    const files = fs.readdirSync(CONTRACTS_MOCKS_DIR);
    files.forEach(file => {
      if (file.endsWith('.sol') && file.startsWith('Mock')) {
        mockFiles.push({
          path: path.join(CONTRACTS_MOCKS_DIR, file),
          name: file,
          source: 'contracts/mocks'
        });
      }
    });
  }
  
  if (fs.existsSync(CONTRACTS_TEST_DIR)) {
    const files = fs.readdirSync(CONTRACTS_TEST_DIR);
    files.forEach(file => {
      if (file.endsWith('.sol') && file.startsWith('Mock')) {
        mockFiles.push({
          path: path.join(CONTRACTS_TEST_DIR, file),
          name: file,
          source: 'contracts/test'
        });
      }
    });
  }
  
  return mockFiles;
};

// Group mock files by name to find duplicates
const groupMockFilesByName = (mockFiles) => {
  const groups = {};
  
  mockFiles.forEach(mockFile => {
    const name = mockFile.name;
    if (!groups[name]) {
      groups[name] = [];
    }
    groups[name].push(mockFile);
  });
  
  return groups;
};

// Migration process
const migrateMockFiles = () => {
  console.log('Starting mock contract migration...');
  
  // Ensure target directories exist
  ensureDirExists(path.join(TEST_MOCKS_DIR, 'tokens'));
  ensureDirExists(path.join(TEST_MOCKS_DIR, 'core'));
  ensureDirExists(path.join(TEST_MOCKS_DIR, 'external'));
  
  // Find all mock files
  const mockFiles = findMockFiles();
  console.log(`Found ${mockFiles.length} mock files`);
  
  // Group by name to find duplicates
  const mockGroups = groupMockFilesByName(mockFiles);
  
  // Process each group
  for (const [name, files] of Object.entries(mockGroups)) {
    const targetDir = getTargetDirForMock(name.replace('.sol', ''));
    const targetPath = path.join(targetDir, name);
    
    console.log(`\nProcessing ${name}:`);
    
    if (files.length === 1) {
      // Single implementation - just copy it
      const sourcePath = files[0].path;
      console.log(`  Single implementation found: ${files[0].source}/${name}`);
      console.log(`  Copying to ${path.relative(process.cwd(), targetPath)}`);
      fs.copyFileSync(sourcePath, targetPath);
    } else {
      // Multiple implementations - need to merge
      console.log(`  Multiple implementations found (${files.length}):`);
      files.forEach(file => console.log(`    - ${file.source}/${name}`));
      console.log(`  ⚠️ Manual merge required for ${name}`);
      console.log(`  Target path: ${path.relative(process.cwd(), targetPath)}`);
      
      // Create a comparison file to help with merging
      console.log(`  Creating comparison file for manual merging...`);
      const comparisonPath = path.join(targetDir, `COMPARE_${name}`);
      
      let comparisonContent = `// COMPARISON FILE FOR ${name}\n`;
      comparisonContent += `// Please merge these implementations manually\n\n`;
      
      files.forEach(file => {
        comparisonContent += `// ===== From ${file.source}/${name} =====\n\n`;
        comparisonContent += fs.readFileSync(file.path, 'utf8');
        comparisonContent += '\n\n';
      });
      
      fs.writeFileSync(comparisonPath, comparisonContent);
    }
  }
  
  console.log('\nMock contract migration completed!');
  console.log('Next steps:');
  console.log('1. Review and fix any files that need manual merging (COMPARE_* files)');
  console.log('2. Update imports in test files to point to the new mock locations');
  console.log('3. Use fully qualified names in getContractFactory calls to avoid ambiguity');
};

// Start the migration process
migrateMockFiles(); 