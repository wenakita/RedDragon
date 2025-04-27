// Google Analytics integration for Dragon ecosystem
const { BigQuery } = require('@google-cloud/bigquery');
const { Storage } = require('@google-cloud/storage');

// Configuration
const MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID || 'G-XXXXXXXXXX'; // Replace with actual GA4 measurement ID
const API_SECRET = process.env.GA_API_SECRET; // API secret from GA4
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'dragon-ecosystem';
const DATASET_ID = 'dragon_analytics';
const TABLE_ID = 'user_interactions';

// Initialize Google Cloud clients
const bigquery = new BigQuery({ projectId: PROJECT_ID });
const storage = new Storage({ projectId: PROJECT_ID });

/**
 * Track blockchain events in Google Analytics
 * @param {string} eventName - Event name (e.g., 'lp_token_locked', 'vote_cast')
 * @param {Object} params - Event parameters
 * @param {string} walletAddress - User's wallet address (anonymized before sending)
 */
async function trackBlockchainEvent(eventName, params, walletAddress) {
  try {
    // Anonymize wallet address using a one-way hash
    const anonymizedAddress = require('crypto')
      .createHash('sha256')
      .update(walletAddress + API_SECRET)
      .digest('hex')
      .substring(0, 16); // Use just a portion to further anonymize
    
    const eventParams = {
      ...params,
      wallet_id: anonymizedAddress,
      client_id: anonymizedAddress, // Using anonymized wallet as client ID
      timestamp_micros: Date.now() * 1000,
    };
    
    // Log to Google Analytics 4 using Measurement Protocol
    const response = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`, {
      method: 'POST',
      body: JSON.stringify({
        client_id: anonymizedAddress,
        events: [{
          name: eventName,
          params: eventParams
        }]
      })
    });
    
    if (!response.ok) {
      console.error(`Failed to send event to GA: ${response.statusText}`);
    }
    
    // Also store in BigQuery for more detailed analysis
    await storeEventInBigQuery(eventName, eventParams);
    
    return { success: true, clientId: anonymizedAddress };
  } catch (error) {
    console.error('Error tracking blockchain event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Store event data in BigQuery for deeper analysis
 */
async function storeEventInBigQuery(eventName, params) {
  try {
    // Ensure the dataset and table exist
    await createDatasetIfNotExists();
    await createTableIfNotExists();
    
    // Prepare the row data
    const row = {
      event_name: eventName,
      event_timestamp: new Date().toISOString(),
      ...params
    };
    
    // Insert data into BigQuery
    await bigquery
      .dataset(DATASET_ID)
      .table(TABLE_ID)
      .insert([row]);
      
    return true;
  } catch (error) {
    console.error('Error storing event in BigQuery:', error);
    return false;
  }
}

/**
 * Create the BigQuery dataset if it doesn't exist
 */
async function createDatasetIfNotExists() {
  try {
    const [exists] = await bigquery
      .dataset(DATASET_ID)
      .exists();
      
    if (!exists) {
      await bigquery.createDataset(DATASET_ID, {
        location: 'US',
        description: 'Dragon Ecosystem Analytics Data'
      });
      console.log(`Dataset ${DATASET_ID} created.`);
    }
    
    return true;
  } catch (error) {
    console.error('Error creating dataset:', error);
    return false;
  }
}

/**
 * Create the BigQuery table if it doesn't exist
 */
async function createTableIfNotExists() {
  try {
    const dataset = bigquery.dataset(DATASET_ID);
    const [exists] = await dataset.table(TABLE_ID).exists();
    
    if (!exists) {
      const schema = [
        { name: 'event_name', type: 'STRING' },
        { name: 'event_timestamp', type: 'TIMESTAMP' },
        { name: 'wallet_id', type: 'STRING' },
        { name: 'client_id', type: 'STRING' },
        { name: 'timestamp_micros', type: 'INTEGER' },
        // Schema fields for common event parameters
        { name: 'phase', type: 'STRING' },
        { name: 'contract_address', type: 'STRING' },
        { name: 'value_usd', type: 'FLOAT' },
        { name: 'gas_used', type: 'INTEGER' },
        // LP specific fields
        { name: 'lp_amount', type: 'FLOAT' },
        { name: 'lock_duration', type: 'INTEGER' },
        // Voting specific fields
        { name: 'vote_power', type: 'FLOAT' },
        { name: 'partner_id', type: 'STRING' },
        // Partner specific fields
        { name: 'boost_amount', type: 'FLOAT' },
        { name: 'partner_name', type: 'STRING' },
      ];
      
      await dataset.createTable(TABLE_ID, {
        schema: schema,
        timePartitioning: {
          type: 'DAY',
          field: 'event_timestamp'
        }
      });
      
      console.log(`Table ${TABLE_ID} created.`);
    }
    
    return true;
  } catch (error) {
    console.error('Error creating table:', error);
    return false;
  }
}

/**
 * Export analytics data to Google Cloud Storage for backup
 */
async function exportAnalyticsToStorage(bucketName, prefix = 'analytics_backup') {
  try {
    const bucket = storage.bucket(bucketName);
    const exists = await bucket.exists();
    
    if (!exists[0]) {
      await storage.createBucket(bucketName, {
        location: 'us-central1',
        storageClass: 'STANDARD'
      });
    }
    
    const date = new Date().toISOString().split('T')[0];
    const filename = `${prefix}/dragon_analytics_${date}.json`;
    
    // Create a BigQuery extraction job
    const [job] = await bigquery.dataset(DATASET_ID)
      .table(TABLE_ID)
      .extract(storage.bucket(bucketName).file(filename), {
        format: 'JSON',
        gzip: true
      });
    
    // Wait for job to complete
    await job.promise();
    
    return {
      success: true,
      destination: `gs://${bucketName}/${filename}`
    };
  } catch (error) {
    console.error('Error exporting analytics data:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  trackBlockchainEvent,
  storeEventInBigQuery,
  exportAnalyticsToStorage
}; 