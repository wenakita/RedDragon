#!/usr/bin/env node

// Google Cloud Project Setup Script for Dragon Ecosystem
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const util = require('util');

const execPromise = util.promisify(exec);

// Configuration
const DEFAULT_PROJECT_ID = 'dragon-ecosystem';
const DEFAULT_REGION = 'us-central1';
const DEFAULT_ZONE = 'us-central1-a';
const ENV_FILE_PATH = path.join(__dirname, '..', '..', '.env.google');

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

/**
 * Main setup function
 */
async function setupGoogleCloud() {
  try {
    console.log('🐉 Dragon Ecosystem - Google Cloud Setup 🐉');
    console.log('=========================================');
    
    // Check if gcloud is installed
    try {
      await execPromise('gcloud --version');
      console.log('✅ Google Cloud SDK is installed');
    } catch (error) {
      console.error('❌ Google Cloud SDK is not installed. Please install it first:');
      console.error('   https://cloud.google.com/sdk/docs/install');
      process.exit(1);
    }
    
    // Get project ID
    const projectId = await question(`Enter Google Cloud project ID [${DEFAULT_PROJECT_ID}]: `);
    const finalProjectId = projectId || DEFAULT_PROJECT_ID;
    
    // Check if the project exists
    try {
      await execPromise(`gcloud projects describe ${finalProjectId}`);
      console.log(`✅ Project ${finalProjectId} exists`);
    } catch (error) {
      console.log(`Project ${finalProjectId} does not exist. Creating...`);
      
      // Get billing account
      const { stdout: billingAccounts } = await execPromise('gcloud billing accounts list --format="value(ACCOUNT_ID)"');
      
      if (!billingAccounts.trim()) {
        console.error('❌ No billing accounts found. Please create a billing account first.');
        process.exit(1);
      }
      
      const billingAccountsList = billingAccounts.trim().split('\n');
      console.log('Available billing accounts:');
      billingAccountsList.forEach((account, index) => {
        console.log(`${index + 1}. ${account}`);
      });
      
      const billingChoice = await question(`Select a billing account [1-${billingAccountsList.length}]: `);
      const billingAccount = billingAccountsList[parseInt(billingChoice) - 1 || 0];
      
      // Create the project
      await execPromise(`gcloud projects create ${finalProjectId} --name="Dragon Ecosystem"`);
      console.log(`✅ Project ${finalProjectId} created`);
      
      // Link billing account
      await execPromise(`gcloud billing projects link ${finalProjectId} --billing-account=${billingAccount}`);
      console.log(`✅ Linked billing account ${billingAccount} to project ${finalProjectId}`);
    }
    
    // Set the project
    await execPromise(`gcloud config set project ${finalProjectId}`);
    console.log(`✅ Set active project to ${finalProjectId}`);
    
    // Set region and zone
    const region = await question(`Enter Google Cloud region [${DEFAULT_REGION}]: `);
    const finalRegion = region || DEFAULT_REGION;
    
    const zone = await question(`Enter Google Cloud zone [${DEFAULT_ZONE}]: `);
    const finalZone = zone || DEFAULT_ZONE;
    
    await execPromise(`gcloud config set compute/region ${finalRegion}`);
    await execPromise(`gcloud config set compute/zone ${finalZone}`);
    console.log(`✅ Set region to ${finalRegion} and zone to ${finalZone}`);
    
    // Enable required APIs
    const requiredApis = [
      'cloudfunctions.googleapis.com',
      'cloudbuild.googleapis.com',
      'cloudscheduler.googleapis.com',
      'bigquery.googleapis.com',
      'storage.googleapis.com',
      'logging.googleapis.com',
      'pubsub.googleapis.com',
      'run.googleapis.com',
      'artifactregistry.googleapis.com'
    ];
    
    console.log('Enabling required APIs (this may take a few minutes)...');
    await execPromise(`gcloud services enable ${requiredApis.join(' ')}`);
    console.log('✅ Enabled required APIs');
    
    // Create service account
    const serviceAccountName = 'dragon-monitoring';
    const serviceAccountEmail = `${serviceAccountName}@${finalProjectId}.iam.gserviceaccount.com`;
    
    try {
      await execPromise(`gcloud iam service-accounts describe ${serviceAccountEmail}`);
      console.log(`✅ Service account ${serviceAccountEmail} already exists`);
    } catch (error) {
      await execPromise(`gcloud iam service-accounts create ${serviceAccountName} --display-name="Dragon Ecosystem Monitoring"`);
      console.log(`✅ Created service account ${serviceAccountEmail}`);
    }
    
    // Assign roles to the service account
    const roles = [
      'roles/bigquery.dataEditor',
      'roles/bigquery.jobUser',
      'roles/storage.objectAdmin',
      'roles/pubsub.publisher',
      'roles/logging.logWriter',
      'roles/cloudfunctions.invoker',
      'roles/run.invoker'
    ];
    
    for (const role of roles) {
      await execPromise(`gcloud projects add-iam-policy-binding ${finalProjectId} --member="serviceAccount:${serviceAccountEmail}" --role="${role}"`);
    }
    console.log(`✅ Assigned roles to service account ${serviceAccountEmail}`);
    
    // Create key for service account
    const keyPath = path.join(__dirname, '..', '..', `${finalProjectId}-key.json`);
    
    if (!fs.existsSync(keyPath)) {
      await execPromise(`gcloud iam service-accounts keys create ${keyPath} --iam-account=${serviceAccountEmail}`);
      console.log(`✅ Created key for service account at ${keyPath}`);
    } else {
      console.log(`✅ Key for service account already exists at ${keyPath}`);
    }
    
    // Create BigQuery dataset
    try {
      await execPromise(`bq mk --dataset ${finalProjectId}:dragon_analytics`);
      console.log('✅ Created BigQuery dataset dragon_analytics');
    } catch (error) {
      if (error.stderr && error.stderr.includes('Already Exists')) {
        console.log('✅ BigQuery dataset dragon_analytics already exists');
      } else {
        throw error;
      }
    }
    
    // Create Cloud Storage buckets
    const buckets = [
      'dragon-dashboard-assets',
      'dragon-analytics-exports'
    ];
    
    for (const bucket of buckets) {
      try {
        await execPromise(`gsutil mb -l ${finalRegion} -p ${finalProjectId} gs://${bucket}-${finalProjectId}`);
        await execPromise(`gsutil iam ch allUsers:objectViewer gs://${bucket}-${finalProjectId}`);
        console.log(`✅ Created public bucket gs://${bucket}-${finalProjectId}`);
      } catch (error) {
        if (error.stderr && error.stderr.includes('already exists')) {
          console.log(`✅ Bucket gs://${bucket}-${finalProjectId} already exists`);
        } else {
          throw error;
        }
      }
    }
    
    // Create PubSub topics
    const topics = [
      'dragon-lp-created',
      'dragon-lp-locked',
      'dragon-votes-cast',
      'dragon-partner-boost'
    ];
    
    for (const topic of topics) {
      try {
        await execPromise(`gcloud pubsub topics create ${topic}`);
        console.log(`✅ Created PubSub topic ${topic}`);
      } catch (error) {
        if (error.stderr && error.stderr.includes('Resource already exists')) {
          console.log(`✅ PubSub topic ${topic} already exists`);
        } else {
          throw error;
        }
      }
    }
    
    // Generate .env file
    const envContent = `
# Dragon Ecosystem Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=${finalProjectId}
GOOGLE_APPLICATION_CREDENTIALS=${path.resolve(keyPath)}
GOOGLE_CLOUD_REGION=${finalRegion}
GOOGLE_CLOUD_ZONE=${finalZone}

# Storage Buckets
DASHBOARD_BUCKET=dragon-dashboard-assets-${finalProjectId}
ANALYTICS_BUCKET=dragon-analytics-exports-${finalProjectId}

# BigQuery Config
BIGQUERY_DATASET=dragon_analytics

# Service Account
SERVICE_ACCOUNT_EMAIL=${serviceAccountEmail}

# Feature Deployment Phase
DEPLOYMENT_PHASE=phase1

# Analytics Configuration
GA_MEASUREMENT_ID=G-XXXXXXXXXX
GA_API_SECRET=
ANALYTICS_ENABLED=true

# Dashboard IDs for Looker Studio
PHASE1_DASHBOARD_ID=
PHASE2_DASHBOARD_ID=
PHASE3_DASHBOARD_ID=
PHASE4_DASHBOARD_ID=
ALL_PHASES_DASHBOARD_ID=

# Contract Addresses
BEETS_LP_ADDRESS=
VE69LP_ADDRESS=
POOL_VOTING_ADDRESS=
DRAGON_SWAPPER_ADDRESS=

# Blockchain RPC URL
RPC_URL=https://mainnet.sonic.fantom.network/
`;
    
    fs.writeFileSync(ENV_FILE_PATH, envContent.trim());
    console.log(`✅ Created environment file at ${ENV_FILE_PATH}`);
    
    // Create ABIs directory
    const abiDir = path.join(__dirname, 'abis');
    if (!fs.existsSync(abiDir)) {
      fs.mkdirSync(abiDir, { recursive: true });
      console.log(`✅ Created ABIs directory at ${abiDir}`);
    }
    
    // Instructions for next steps
    console.log('\n🎉 Google Cloud setup completed! 🎉');
    console.log('\nNext steps:');
    console.log('1. Update the .env.google file with your specific configuration');
    console.log('2. Copy contract ABIs to the integrations/google/abis directory');
    console.log('3. Update the DEPLOYMENT_PHASE variable as you progress through phases');
    console.log('4. Deploy the monitoring functions with:');
    console.log('   cd integrations && npm run deploy:monitoring');
    console.log('5. Access the dashboards at:');
    console.log(`   https://storage.googleapis.com/dragon-dashboard-assets-${finalProjectId}/index.html`);
    
    rl.close();
  } catch (error) {
    console.error('❌ Error setting up Google Cloud:', error);
    rl.close();
    process.exit(1);
  }
}

// Run the setup
setupGoogleCloud(); 