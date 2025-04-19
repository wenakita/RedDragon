/**
 * Dragon Ecosystem Integrations
 * Main entry point that exports all available integrations
 */

// Configuration
require('dotenv').config({ path: process.env.GOOGLE_ENV_PATH || './.env.google' });

// Google Cloud Integration
const googleAnalytics = require('./google/analytics');
const googleMonitoring = require('./google/contract-monitoring');
const googleDashboard = require('./google/dashboard');

/**
 * Initialize all integrations
 * @returns {Promise<Object>} Initialization results
 */
async function initializeAll() {
  try {
    console.log('Initializing Dragon Ecosystem integrations...');
    
    // Initialize Google Cloud services
    await googleMonitoring.initialize();
    
    return {
      success: true,
      message: 'All integrations initialized successfully'
    };
  } catch (error) {
    console.error('Error initializing integrations:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Start all monitoring services
 * @returns {Promise<Object>} Start results
 */
async function startMonitoring() {
  try {
    console.log('Starting Dragon Ecosystem monitoring...');
    
    // Start Google Cloud monitoring
    await googleMonitoring.startMonitoring();
    
    return {
      success: true,
      message: 'Monitoring started successfully'
    };
  } catch (error) {
    console.error('Error starting monitoring:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Initialize and start dashboards
 * @returns {Promise<Object>} Dashboard server results
 */
async function startDashboards() {
  try {
    console.log('Starting Dragon Ecosystem dashboards...');
    
    // Start Google Cloud dashboards
    const result = await googleDashboard.startDashboardServer();
    
    return {
      success: true,
      message: 'Dashboards started successfully',
      details: result
    };
  } catch (error) {
    console.error('Error starting dashboards:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Track an event across all analytics platforms
 * @param {string} eventName - Name of the event
 * @param {Object} params - Event parameters
 * @param {string} walletAddress - User's wallet address
 * @returns {Promise<Object>} Tracking results
 */
async function trackEvent(eventName, params, walletAddress) {
  try {
    // Track with Google Analytics
    const gaResult = await googleAnalytics.trackBlockchainEvent(
      eventName, 
      params, 
      walletAddress
    );
    
    return {
      success: true,
      results: {
        googleAnalytics: gaResult
      }
    };
  } catch (error) {
    console.error('Error tracking event:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export functions for direct usage
module.exports = {
  // Main functions
  initializeAll,
  startMonitoring,
  startDashboards,
  trackEvent,
  
  // Individual integrations
  google: {
    analytics: googleAnalytics,
    monitoring: googleMonitoring,
    dashboard: googleDashboard
  }
}; 