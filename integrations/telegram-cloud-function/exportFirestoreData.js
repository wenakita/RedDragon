const admin = require('firebase-admin');
const fs = require('fs');

admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccountKey.json')),
});

const db = admin.firestore();

async function exportReferrals() {
  const referrals = await db.collection('referrals').get();
  for (const doc of referrals.docs) {
    const data = doc.data();
    console.log(`\nReferrer: ${doc.id}`);
    console.log(data);

    // List bot_joiners
    const botJoiners = await db.collection('referrals').doc(doc.id).collection('bot_joiners').get();
    if (!botJoiners.empty) {
      console.log('  Bot Joiners:');
      botJoiners.forEach(j => console.log(`    - ${j.id}:`, j.data()));
    }

    // List channel_joiners
    const channelJoiners = await db.collection('referrals').doc(doc.id).collection('channel_joiners').get();
    if (!channelJoiners.empty) {
      console.log('  Channel Joiners:');
      channelJoiners.forEach(j => console.log(`    - ${j.id}:`, j.data()));
    }
  }
}

async function exportUserReferrals() {
  const userRefs = await db.collection('user_referrals').get();
  if (userRefs.empty) {
    console.log('\nNo user_referrals found.');
    return;
  }
  console.log('\nUser Referrals:');
  userRefs.forEach(doc => {
    console.log(`  - ${doc.id}:`, doc.data());
  });
}

async function exportJoinAttempts() {
  const joins = await db.collection('join_attempts').get();
  if (joins.empty) {
    console.log('\nNo join_attempts found.');
    return;
  }
  console.log('\nJoin Attempts:');
  joins.forEach(doc => {
    console.log(`  - ${doc.id}:`, doc.data());
  });
}

(async () => {
  await exportReferrals();
  await exportUserReferrals();
  await exportJoinAttempts();
  process.exit(0);
})();
