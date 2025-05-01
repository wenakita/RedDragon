// bigquery.js - Utility for logging events to BigQuery
const { BigQuery } = require('@google-cloud/bigquery');
const path = require('path');

// Change these to match your dataset/table
const DATASET_ID = process.env.BQ_DATASET_ID || 'referrals';
const TABLE_ID = process.env.BQ_TABLE_ID || 'referrals_imported';

// If running locally, set GOOGLE_APPLICATION_CREDENTIALS to your service account key
const bigquery = new BigQuery();

/**
 * Log an event to BigQuery
 * @param {Object} event - Event data (user_id, username, event_type, referral_code, extra_data)
 */
async function logEvent(event) {
  const row = {
    timestamp: new Date().toISOString(),
    ...event
  };
  try {
    await bigquery.dataset(DATASET_ID).table(TABLE_ID).insert([row]);
    console.log('[BigQuery] Event logged:', row);
  } catch (err) {
    // Ignore duplicate errors (insertId can be used for idempotency if needed)
    if (err && err.name !== 'PartialFailureError') {
      console.error('[BigQuery] Failed to log event:', err);
    }
  }
}

/**
 * Fetch all referrers for a full referral list
 * @returns {Promise<Array<{referral_code: string, joins: number, username: string}>>}
 */
async function getAllReferrals() {
  const query = `
    SELECT
      referral_code,
      COUNT(*) as joins,
      ARRAY_AGG(username IGNORE NULLS LIMIT 1)[OFFSET(0)] as username
    FROM
      ${DATASET_ID}.${TABLE_ID}
    WHERE
      event_type = 'referral_join'
    GROUP BY
      referral_code
    ORDER BY
      joins DESC
  `;
  const options = {
    query,
    location: 'US',
  };
  const [job] = await bigquery.createQueryJob(options);
  const [rows] = await job.getQueryResults();
  return rows;
}

/**
 * Fetch the top 25 referrers for leaderboard
 * @returns {Promise<Array<{referral_code: string, joins: number, username: string}>>}
 */
async function getLeaderboard() {
  const query = `
    SELECT
      referral_code,
      COUNT(*) as joins,
      ARRAY_AGG(username IGNORE NULLS LIMIT 1)[OFFSET(0)] as username
    FROM
      ${DATASET_ID}.${TABLE_ID}
    WHERE
      event_type = 'referral_join'
    GROUP BY
      referral_code
    ORDER BY
      joins DESC
    LIMIT 25
  `;
  const options = {
    query,
    location: 'US',
  };
  const [job] = await bigquery.createQueryJob(options);
  const [rows] = await job.getQueryResults();
  return rows;
}

module.exports = { logEvent, getLeaderboard, getAllReferrals };
