// Script to remove referral code docs missing user_id or username
const { Firestore } = require('@google-cloud/firestore');
const firestore = new Firestore();

async function main() {
  const snapshot = await firestore.collection('referrals').get();
  let removed = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const userId = data.user_id || data.id || data.telegram_user_id;
    const username = data.username || data.telegram_username;
    if (!userId || !username) {
      console.log(`[CLEANUP] Removing invalid referral code: docId=${doc.id}, referral_code=${data.referral_code}, user_id=${userId}, username=${username}`);
      await doc.ref.delete();
      removed++;
    }
  }
  console.log(`Cleanup complete. ${removed} invalid referral code records removed.`);
}

main().catch(console.error);
