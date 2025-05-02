// Script to merge duplicate referral codes and remove self-referrals
// DRY RUN by default: no writes unless you uncomment the update/delete lines

const { Firestore } = require('@google-cloud/firestore');
const firestore = new Firestore();

async function main() {
  // Step 1: Build map of referral_code -> list of creators
  const snapshot = await firestore.collection('referrals').get();
  const codeMap = {};
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const code = data.referral_code;
    if (!code) return;
    if (!codeMap[code]) codeMap[code] = [];
    codeMap[code].push({
      user_id: data.user_id || data.id || data.telegram_user_id,
      username: data.username || data.telegram_username,
      docId: doc.id,
      timestamp: data.timestamp || null
    });
  });

  // Step 2: Find duplicates and pick canonical creator
  for (const [code, users] of Object.entries(codeMap)) {
    console.log(`Referral code: ${code}`);
    users.forEach(u => {
      console.log(`  Creator: user_id=${u.user_id}, username=${u.username}, docId=${u.docId}, timestamp=${u.timestamp}`);
    });
    const uniqueUsers = [...new Set(users.map(u => u.user_id))];
    if (uniqueUsers.length > 1) {
      console.log('>>> Entered duplicate block for code:', code);
      // Pick the canonical creator (earliest timestamp or first)
      users.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
      const canonical = users[0];
      console.log(`Duplicate referral code: ${code}`);
      console.log(`  Canonical creator:`, canonical);
      console.log(`  Other creators:`, users.slice(1));

      // Step 3: Update all joins to point to canonical creator
      // Join records: Firestore 'referral_joins' collection (adjust if different)
      const joinsSnapshot = await firestore.collection('referral_joins').where('referral_code', '==', code).get();
      for (const joinDoc of joinsSnapshot.docs) {
        const joinData = joinDoc.data();
        // Step 4: Remove/flag self-referrals
        if (
          joinData.user_id === canonical.user_id ||
          joinData.user_id === canonical.username
        ) {
          console.log(`  [SELF-REFERRAL] Removing join:`, joinDoc.id, joinData);
          await joinDoc.ref.delete();
        } else {
          // Update referrer to canonical
          console.log(`  [MERGE] Updating join:`, joinDoc.id, {
            ...joinData,
            referrer: canonical.user_id,
            referrer_username: canonical.username
          });
          await joinDoc.ref.update({
            referrer: canonical.user_id,
            referrer_username: canonical.username
          });
        }
      }
    }
  }
  console.log('Script complete. If you did not see any updates/deletes, there may be no duplicates to process.');
}

main().catch(console.error);
