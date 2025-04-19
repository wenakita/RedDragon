// Google Data Studio / Looker Studio dashboard integration
const { BigQuery } = require('@google-cloud/bigquery');
const express = require('express');
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'dragon-ecosystem';
const DATASET_ID = 'dragon_analytics';
const DASHBOARD_BUCKET = process.env.DASHBOARD_BUCKET || 'dragon-dashboard-assets';
const PORT = process.env.PORT || 8080;

// Initialize Google Cloud clients
const bigquery = new BigQuery({ projectId: PROJECT_ID });
const storage = new Storage({ projectId: PROJECT_ID });

// Initialize express app for dashboard API
const app = express();

/**
 * Generate Looker Studio dashboard URL with embedded credentials
 * @param {string} dashboardId - The ID of the Looker Studio dashboard
 * @param {Object} params - Parameters to customize dashboard view
 * @returns {string} URL to the embedded dashboard
 */
function generateDashboardUrl(dashboardId, params = {}) {
  // Default dashboard ID for production
  const id = dashboardId || process.env.DEFAULT_DASHBOARD_ID || 'abc123';
  
  // Base URL
  let url = `https://lookerstudio.google.com/embed/reporting/${id}/page/1`;
  
  // Add parameters
  if (Object.keys(params).length > 0) {
    url += '?';
    for (const [key, value] of Object.entries(params)) {
      url += `${encodeURIComponent(key)}=${encodeURIComponent(value)}&`;
    }
    url = url.slice(0, -1); // Remove trailing &
  }
  
  return url;
}

/**
 * Create a Looker Studio data source using BigQuery connector
 * @param {string} tableName - The BigQuery table name to connect to
 * @returns {Object} Data source configuration
 */
async function createDataSource(tableName) {
  try {
    // This is a mock implementation as Looker Studio data sources
    // typically need to be created through the UI or API with proper authentication
    console.log(`Creating data source for ${tableName}`);
    
    const dataSource = {
      name: `Dragon ${tableName} Data`,
      connector: 'bigQuery',
      projectId: PROJECT_ID,
      datasetId: DATASET_ID,
      tableName: tableName
    };
    
    // In a real implementation, this would make an API call to Looker Studio
    // For now, we'll just return the configuration for documentation
    return {
      success: true,
      dataSource: dataSource,
      message: 'Please manually create this data source in Looker Studio'
    };
  } catch (error) {
    console.error('Error creating data source:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a BigQuery view optimized for dashboard visualization
 * @param {string} viewName - The name for the new view
 * @param {string} query - The SQL query defining the view
 * @returns {Object} Result of the operation
 */
async function createDashboardView(viewName, query) {
  try {
    const dataset = bigquery.dataset(DATASET_ID);
    const [exists] = await dataset.exists();
    
    if (!exists) {
      await bigquery.createDataset(DATASET_ID, {
        location: 'US',
        description: 'Dragon Analytics Data for Dashboards'
      });
    }
    
    // Define the view
    const viewOptions = {
      query: query,
      useLegacySql: false
    };
    
    // Create the view
    await dataset.createTable(viewName, viewOptions);
    
    return { 
      success: true, 
      view: `${PROJECT_ID}.${DATASET_ID}.${viewName}` 
    };
  } catch (error) {
    console.error('Error creating dashboard view:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create predefined dashboard views for each phase
 */
async function createPhaseDashboardViews() {
  const views = [
    {
      name: 'phase1_lp_metrics',
      query: `
        SELECT
          TIMESTAMP_TRUNC(event_timestamp, DAY) as day,
          COUNT(*) as total_locks,
          SUM(CAST(lp_amount as FLOAT64)) as total_lp_locked,
          AVG(CAST(lock_duration as INT64))/86400 as avg_lock_days,
          COUNT(DISTINCT wallet_id) as unique_users
        FROM
          \`${PROJECT_ID}.${DATASET_ID}.user_interactions\`
        WHERE
          event_name = 'lp_token_locked'
          AND phase = 'phase1'
        GROUP BY
          day
        ORDER BY
          day DESC
      `
    },
    {
      name: 'phase2_voting_metrics',
      query: `
        SELECT
          TIMESTAMP_TRUNC(event_timestamp, DAY) as day,
          partner_id,
          COUNT(*) as vote_count,
          SUM(CAST(vote_power as FLOAT64)) as total_vote_power,
          COUNT(DISTINCT wallet_id) as unique_voters
        FROM
          \`${PROJECT_ID}.${DATASET_ID}.user_interactions\`
        WHERE
          event_name = 'vote_cast'
          AND phase = 'phase2'
        GROUP BY
          day, partner_id
        ORDER BY
          day DESC, total_vote_power DESC
      `
    },
    {
      name: 'phase3_partner_boost_metrics',
      query: `
        SELECT
          TIMESTAMP_TRUNC(event_timestamp, DAY) as day,
          partner_address,
          AVG(CAST(boost_basis_points as FLOAT64))/100 as avg_boost_percentage,
          SUM(CAST(ws_equivalent as FLOAT64)) as total_ws_boosted,
          COUNT(*) as boost_count
        FROM
          \`${PROJECT_ID}.${DATASET_ID}.user_interactions\`
        WHERE
          event_name = 'partner_boost_applied'
          AND phase = 'phase3'
        GROUP BY
          day, partner_address
        ORDER BY
          day DESC, total_ws_boosted DESC
      `
    },
    {
      name: 'phase4_ecosystem_metrics',
      query: `
        SELECT
          TIMESTAMP_TRUNC(event_timestamp, DAY) as day,
          event_name,
          COUNT(*) as event_count,
          COUNT(DISTINCT wallet_id) as unique_users,
          SUM(CASE WHEN event_name = 'swap_with_jackpot' THEN CAST(x33_amount as FLOAT64) ELSE 0 END) as total_x33_swapped,
          AVG(CASE WHEN event_name = 'swap_with_jackpot' THEN CAST(boost_percentage as FLOAT64) ELSE NULL END) as avg_boost_percentage
        FROM
          \`${PROJECT_ID}.${DATASET_ID}.user_interactions\`
        WHERE
          phase = 'phase4'
        GROUP BY
          day, event_name
        ORDER BY
          day DESC, event_count DESC
      `
    },
    {
      name: 'all_phases_comparison',
      query: `
        SELECT
          phase,
          event_name,
          COUNT(*) as event_count,
          COUNT(DISTINCT wallet_id) as unique_users,
          COUNT(DISTINCT TIMESTAMP_TRUNC(event_timestamp, DAY)) as active_days
        FROM
          \`${PROJECT_ID}.${DATASET_ID}.user_interactions\`
        GROUP BY
          phase, event_name
        ORDER BY
          phase, event_count DESC
      `
    }
  ];
  
  // Create each view
  const results = {};
  for (const view of views) {
    results[view.name] = await createDashboardView(view.name, view.query);
  }
  
  return results;
}

/**
 * Generate HTML for an embedded dashboard
 * @param {string} dashboardUrl - URL to the Looker Studio dashboard
 * @param {string} title - Dashboard title
 * @returns {string} HTML content
 */
function generateDashboardHtml(dashboardUrl, title) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Dragon Ecosystem Analytics</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
      background-color: #f0f0f0;
    }
    header {
      background-color: #212121;
      color: white;
      padding: 10px 20px;
      text-align: center;
    }
    .dashboard-container {
      width: 100%;
      height: calc(100vh - 60px);
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
  </style>
</head>
<body>
  <header>
    <h1>${title}</h1>
  </header>
  <div class="dashboard-container">
    <iframe src="${dashboardUrl}" allowfullscreen></iframe>
  </div>
</body>
</html>
  `;
}

/**
 * Deploy dashboard HTML to Google Cloud Storage for hosting
 * @param {string} filename - The name of the HTML file
 * @param {string} htmlContent - The HTML content to deploy
 * @returns {Object} Result of the operation with public URL
 */
async function deployDashboardHtml(filename, htmlContent) {
  try {
    const bucket = storage.bucket(DASHBOARD_BUCKET);
    const [exists] = await bucket.exists();
    
    if (!exists) {
      await storage.createBucket(DASHBOARD_BUCKET, {
        location: 'us-central1',
        website: {
          mainPageSuffix: 'index.html',
          notFoundPage: '404.html'
        }
      });
      
      // Make bucket public
      await bucket.makePublic();
    }
    
    // Create temporary file
    const tempPath = path.join('/tmp', filename);
    fs.writeFileSync(tempPath, htmlContent);
    
    // Upload to Google Cloud Storage
    await bucket.upload(tempPath, {
      destination: filename,
      metadata: {
        contentType: 'text/html',
        cacheControl: 'public, max-age=300'
      }
    });
    
    // Clean up temporary file
    fs.unlinkSync(tempPath);
    
    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${DASHBOARD_BUCKET}/${filename}`;
    
    return {
      success: true,
      url: publicUrl
    };
  } catch (error) {
    console.error('Error deploying dashboard HTML:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create and deploy dashboards for all phases
 */
async function createAndDeployPhaseDashboards() {
  try {
    // Create dashboard views
    await createPhaseDashboardViews();
    
    // Define dashboards for each phase
    const dashboards = [
      {
        name: 'phase1',
        title: 'Phase 1: BeetsLP 69/31 with Locking',
        dashboardId: process.env.PHASE1_DASHBOARD_ID,
        filename: 'phase1.html'
      },
      {
        name: 'phase2',
        title: 'Phase 2: Voting Infrastructure',
        dashboardId: process.env.PHASE2_DASHBOARD_ID,
        filename: 'phase2.html'
      },
      {
        name: 'phase3',
        title: 'Phase 3: Partner Integration',
        dashboardId: process.env.PHASE3_DASHBOARD_ID,
        filename: 'phase3.html'
      },
      {
        name: 'phase4',
        title: 'Phase 4: Full Ecosystem',
        dashboardId: process.env.PHASE4_DASHBOARD_ID,
        filename: 'phase4.html'
      },
      {
        name: 'all',
        title: 'Dragon Ecosystem - All Phases',
        dashboardId: process.env.ALL_PHASES_DASHBOARD_ID,
        filename: 'index.html'
      }
    ];
    
    // Create and deploy each dashboard
    const results = {};
    for (const dashboard of dashboards) {
      const url = generateDashboardUrl(dashboard.dashboardId, { phase: dashboard.name });
      const html = generateDashboardHtml(url, dashboard.title);
      results[dashboard.name] = await deployDashboardHtml(dashboard.filename, html);
    }
    
    return {
      success: true,
      dashboards: results
    };
  } catch (error) {
    console.error('Error creating and deploying dashboards:', error);
    return { success: false, error: error.message };
  }
}

/**
 * API route to get all dashboards
 */
app.get('/api/dashboards', async (req, res) => {
  try {
    const bucket = storage.bucket(DASHBOARD_BUCKET);
    const [files] = await bucket.getFiles();
    
    const dashboards = files
      .filter(file => file.name.endsWith('.html'))
      .map(file => ({
        name: file.name.replace('.html', ''),
        url: `https://storage.googleapis.com/${DASHBOARD_BUCKET}/${file.name}`
      }));
    
    res.json({
      success: true,
      dashboards: dashboards
    });
  } catch (error) {
    console.error('Error getting dashboards:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * API route to update dashboards
 */
app.post('/api/dashboards/update', async (req, res) => {
  try {
    const result = await createAndDeployPhaseDashboards();
    res.json(result);
  } catch (error) {
    console.error('Error updating dashboards:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Initialize and start the dashboard server
 */
async function startDashboardServer() {
  try {
    // Create the views
    await createPhaseDashboardViews();
    
    // Deploy dashboards
    await createAndDeployPhaseDashboards();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Dashboard server running on port ${PORT}`);
    });
    
    return {
      success: true,
      message: `Dashboard server started on port ${PORT}`
    };
  } catch (error) {
    console.error('Error starting dashboard server:', error);
    return { success: false, error: error.message };
  }
}

// Export functions for Cloud Functions
exports.updateDashboards = async (req, res) => {
  try {
    const result = await createAndDeployPhaseDashboards();
    res.status(200).json(result);
  } catch (error) {
    console.error('Error updating dashboards:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Export functions for direct usage
module.exports = {
  createPhaseDashboardViews,
  createAndDeployPhaseDashboards,
  startDashboardServer,
  generateDashboardUrl
}; 