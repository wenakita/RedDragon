// Consolidate and backfill: Firestore -> BigQuery for referral joins
const { BigQuery } = require('@google-cloud/bigquery');
const { Firestore } = require('@google-cloud/firestore');

const DATASET_ID = process.env.BQ_DATASET_ID || 'referrals';
const TABLE_ID = process.env.BQ_TABLE_ID || 'referrals_imported';
const bigquery = new BigQuery();
const firestore = new Firestore();

async function getAllFirestoreReferrals() {
  const snapshot = await firestore.collection('referrals').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function bigQueryRowExists(joinerId) {
  const options = {
    query: `SELECT COUNT(*) as count FROM \`referrals.referrals_imported\` WHERE user_id = @joinerId AND event_type = 'referral_join'`,
    params: { joinerId },
    parameterMode: 'NAMED'
  };
  const [job] = await bigquery.createQueryJob(options);
  const [rows] = await job.getQueryResults();
  return rows[0].count > 0; 
}

async function insertOrUpdateBigQuery(referral) {
  const row = {
    user_id: referral.user_id || referral.id || referral.telegram_user_id || null,
    username: referral.username || referral.telegram_username || null,
    event_type: 'referral_join',
    referral_code: referral.referral_code || referral.referralCode || null,
    referrerUsername: referral.referrerUsername || null, // Adjust if you have this data
    joinTimestamp: referral.joinTimestamp || referral.timestamp || null,
  };
  // Insert; if duplicate, ignore (idempotent)
  try {
    await bigquery.dataset(DATASET_ID).table(TABLE_ID).insert([row]);
    console.log('[BigQuery][SUCCESS] Inserted:', row);
  } catch (err) {
    if (err && err.name === 'PartialFailureError' && err.errors && err.errors[0].reason === 'duplicate') {
      console.log('[BigQuery][INFO] Duplicate row, skipping:', row.user_id);
    } else {
      console.error('[BigQuery][ERROR] Failed to insert:', err && err.stack ? err.stack : err);
    }
  }
}

async function consolidate() {
  const referrals = await getAllFirestoreReferrals();
  console.log(`Found ${referrals.length} referrals in Firestore.`);
  let updated = 0;
  for (const referral of referrals) {
    // Debug: print referral object
    console.log('[DEBUG] referral:', referral);
    // Use referral.joinerId or fallback to referral.id
    const joinerId = referral.joinerId || referral.id;
    console.log('[DEBUG] joinerId:', joinerId);
    const exists = await bigQueryRowExists(joinerId);
    if (!exists) {
      await insertOrUpdateBigQuery(referral);
      updated++;
    }
  }
  console.log(`Backfill complete. ${updated} rows inserted into BigQuery.`);
}

if (require.main === module) {
  consolidate();
}
