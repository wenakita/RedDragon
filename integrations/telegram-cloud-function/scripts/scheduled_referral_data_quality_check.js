require('dotenv').config();
// Scheduled referral data quality check & flagging script
// Flags (does NOT delete) invalid, duplicate, and self-referral records for manual review

const { Firestore } = require('@google-cloud/firestore');
const firestore = new Firestore();
const fetch = require('node-fetch'); // For Telegram alerts

// === CONFIG ===
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // Loaded from .env
// TODO: Replace with numeric Telegram user IDs for @OxDenzo and @stkmaakita
const TELEGRAM_CHAT_IDS = [
  1602772244, // @stkmaakita
  7316396349  // @OxDenzo
];

// To get a user's Telegram ID: have them message your bot, then check getUpdates for their "id"
// Example: https://api.telegram.org/bot<BOT_TOKEN>/getUpdates

async function sendTelegramAlert(message) {
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN.includes('YOUR_')) return;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  for (const chatId of TELEGRAM_CHAT_IDS) {
    if (!chatId || typeof chatId !== 'number') continue;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' })
    });
  }
}

async function main() {
  const snapshot = await firestore.collection('referrals').get();
  const codeMap = {};
  let flagged = 0;

  // 1. Flag records missing user_id or username, malformed referral_code, or invalid timestamp
  const now = Date.now();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const userId = data.user_id || data.id || data.telegram_user_id;
    const username = data.username || data.telegram_username;
    const referralCode = data.referral_code;
    const timestamp = data.timestamp ? Date.parse(data.timestamp) : NaN;
    let reason = '';
    if (!userId || !username) {
      reason = 'Missing user_id or username';
    } else if (!referralCode || typeof referralCode !== 'string' || referralCode.trim() === '') {
      reason = 'Missing or invalid referral_code';
    } else if (referralCode && !/^[a-zA-Z0-9]{4,32}$/.test(referralCode)) {
      reason = 'Referral code format invalid';
    } else if (!timestamp || isNaN(timestamp)) {
      reason = 'Missing or invalid timestamp';
    } else if (timestamp < now - 1000 * 60 * 60 * 24 * 30) {
      reason = 'Inactive code (>30d old)';
    }
    if (reason) {
      await doc.ref.update({ flagged_for_deletion: true, flag_reason: reason, flagged_at: new Date().toISOString() });
      console.log(`[FLAGGED] docId=${doc.id}, reason=${reason}`);
      flagged++;
    }
    // Build code map for duplicate check
    if (referralCode) {
      if (!codeMap[referralCode]) codeMap[referralCode] = [];
      codeMap[referralCode].push({ user_id: userId, username, docId: doc.id });
    }
  }

  // 2. Flag duplicate referral codes (same code, different user_id)
  for (const [code, users] of Object.entries(codeMap)) {
    const uniqueUsers = [...new Set(users.map(u => u.user_id))];
    if (uniqueUsers.length > 1) {
      users.forEach(u => {
        firestore.collection('referrals').doc(u.docId).update({ flagged_for_deletion: true, flag_reason: 'Duplicate referral_code', flagged_at: new Date().toISOString() });
        console.log(`[FLAGGED] docId=${u.docId}, reason=Duplicate referral_code`);
        flagged++;
      });
    }
  }

  // 2b. Orphan join check: referral_joins referencing non-existent codes
  const allCodes = new Set(Object.keys(codeMap));
  const joinsSnapshot = await firestore.collection('referral_joins').get();
  let selfReferrals = 0, orphanJoins = 0;
  for (const joinDoc of joinsSnapshot.docs) {
    const joinData = joinDoc.data();
    // 3. Flag self-referrals in referral_joins
    if (joinData.referral_code && joinData.user_id && codeMap[joinData.referral_code]) {
      // Find creator for this code
      const creators = codeMap[joinData.referral_code];
      if (creators.some(c => c.user_id === joinData.user_id)) {
        await joinDoc.ref.update({ flagged_for_deletion: true, flag_reason: 'Self-referral', flagged_at: new Date().toISOString() });
        console.log(`[FLAGGED] referral_joins docId=${joinDoc.id}, reason=Self-referral`);
        selfReferrals++;
      }
    }
    // 4. Orphan join: code does not exist
    if (joinData.referral_code && !allCodes.has(joinData.referral_code)) {
      await joinDoc.ref.update({ flagged_for_deletion: true, flag_reason: 'Orphan join (no such referral_code)', flagged_at: new Date().toISOString() });
      console.log(`[FLAGGED] referral_joins docId=${joinDoc.id}, reason=Orphan join`);
      orphanJoins++;
    }
  }

  // 5. Automated deletion of flagged records (referrals and referral_joins)
  let deleted = 0;
  const flaggedReferrals = await firestore.collection('referrals').where('flagged_for_deletion', '==', true).get();
  for (const doc of flaggedReferrals.docs) {
    await doc.ref.delete();
    deleted++;
    console.log(`[DELETED] referral docId=${doc.id}`);
  }
  const flaggedJoins = await firestore.collection('referral_joins').where('flagged_for_deletion', '==', true).get();
  for (const doc of flaggedJoins.docs) {
    await doc.ref.delete();
    deleted++;
    console.log(`[DELETED] referral_joins docId=${doc.id}`);
  }

  // 6. Send Telegram alert
  const alertMsg = `Referral Data Quality Check:\nFlagged: ${flagged}\nSelf-referrals: ${selfReferrals}\nOrphan joins: ${orphanJoins}\nDeleted: ${deleted}`;
  await sendTelegramAlert(alertMsg);

  console.log(`\nQuality check complete. ${flagged} referral codes flagged, ${selfReferrals} self-referrals flagged, ${orphanJoins} orphan joins flagged, ${deleted} records deleted.`);
  console.log('Review flagged records in Firestore and delete as needed.');
}


main().catch(console.error);
