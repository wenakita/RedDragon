const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccountKey.json')),
});

const db = admin.firestore();

async function exportReferralsForBigQuery() {
  const outPath = path.join(__dirname, 'referrals_for_bigquery.csv');
  const out = fs.createWriteStream(outPath);
  // CSV header
  out.write('referral_code,username,event_type,timestamp\n');

  const referrals = await db.collection('referrals').get();
  for (const doc of referrals.docs) {
    const referral_code = doc.id;
    // Try to get referrer's username if present in doc.data().username
    const referrerData = doc.data();
    // Export bot_joiners
    const botJoiners = await db.collection('referrals').doc(referral_code).collection('bot_joiners').get();
    for (const joiner of botJoiners.docs) {
      const joinerData = joiner.data();
      const username = joinerData.username || '';
      const timestamp = joinerData.timestamp || '';
      out.write(`${referral_code},${username},referral_join,${timestamp}\n`);
    }
    // Export channel_joiners
    const channelJoiners = await db.collection('referrals').doc(referral_code).collection('channel_joiners').get();
    for (const joiner of channelJoiners.docs) {
      const joinerData = joiner.data();
      const username = joinerData.username || '';
      const timestamp = joinerData.timestamp || '';
      out.write(`${referral_code},${username},referral_join,${timestamp}\n`);
    }
  }
  out.end();
  console.log('Exported referrals to', outPath);
}

exportReferralsForBigQuery().then(() => process.exit(0));
