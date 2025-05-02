// generateUniqueReferralCode.js
// Generates a unique referral code (4-20 chars) and ensures it is not already used in Firestore
const { Firestore } = require('@google-cloud/firestore');
const firestore = new Firestore();

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; // no 0/O/1/l/I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function generateUniqueReferralCode() {
  for (let attempts = 0; attempts < 10; attempts++) {
    const code = randomCode(); // Always 6 chars
    // Check uniqueness
    const query = await firestore.collection('users').where('referralCode', '==', code).get();
    if (query.empty) return code;
  }
  throw new Error('Could not generate a unique referral code after 10 attempts');
}

module.exports = { generateUniqueReferralCode };
