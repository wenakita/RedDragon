// Script to backfill missing usernames in BigQuery referral_join events
const { BigQuery } = require('@google-cloud/bigquery');
const { Firestore } = require('@google-cloud/firestore');

const DATASET_ID = process.env.BQ_DATASET_ID || 'referrals';
const TABLE_ID = process.env.BQ_TABLE_ID || 'referrals_imported';
const bigquery = new BigQuery();
const firestore = new Firestore();

async function getMissingUsernameRows() {
  const query = `SELECT * FROM \`${DATASET_ID}.${TABLE_ID}\` WHERE event_type = 'referral_join' AND (username IS NULL OR username = '')`;
  const [job] = await bigquery.createQueryJob({ query, location: 'US' });
  const [rows] = await job.getQueryResults();
  return rows;
}

async function lookupUsername(user_id) {
  // Try Firestore users collection
  try {
    const doc = await firestore.collection('users').doc(String(user_id)).get();
    if (doc.exists) {
      const data = doc.data();
      return data.username || data.first_name || String(user_id);
    }
  } catch (e) {
    // Ignore
  }
  return String(user_id);
}

async function dryRun() {
  const rows = await getMissingUsernameRows();
  console.log(`Found ${rows.length} rows with missing username`);
  for (const row of rows) {
    const username = await lookupUsername(row.user_id);
    console.log({
      row_id: row.id || '[no id]',
      user_id: row.user_id,
      referral_code: row.referral_code,
      old_username: row.username,
      new_username: username,
      timestamp: row.timestamp
    });
  }
  console.log('Dry run complete. No rows were updated.');
}

if (require.main === module) {
  dryRun();
}
