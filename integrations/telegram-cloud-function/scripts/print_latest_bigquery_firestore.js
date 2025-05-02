// Script to print latest BigQuery and Firestore entries for debugging
const { BigQuery } = require('@google-cloud/bigquery');
const { Firestore } = require('@google-cloud/firestore');

const DATASET_ID = process.env.BQ_DATASET_ID || 'referrals';
const TABLE_ID = process.env.BQ_TABLE_ID || 'referrals_imported';
const bigquery = new BigQuery();
const firestore = new Firestore();

async function printLatestBigQuery() {
  console.log('--- Latest BigQuery referral_join events ---');
  const query = `SELECT * FROM \
    \`${DATASET_ID}.${TABLE_ID}\`
    WHERE event_type = 'referral_join'
    ORDER BY timestamp DESC
    LIMIT 10`;
  const [job] = await bigquery.createQueryJob({ query, location: 'US' });
  const [rows] = await job.getQueryResults();
  rows.forEach(row => console.log(row));
}

async function printLatestFirestoreReferrals() {
  console.log('--- Latest Firestore referrals ---');
  const snapshot = await firestore.collection('referrals').orderBy('joinTimestamp', 'desc').limit(10).get();
  snapshot.forEach(doc => console.log(doc.id, doc.data()));
}

async function printLatestFirestoreMemes() {
  console.log('--- Latest Firestore memes ---');
  const snapshot = await firestore.collection('memes').orderBy('createdAt', 'desc').limit(10).get();
  snapshot.forEach(doc => console.log(doc.id, doc.data()));
}

(async () => {
  await printLatestBigQuery();
  await printLatestFirestoreReferrals();
  await printLatestFirestoreMemes();
})();
