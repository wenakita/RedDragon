module.exports = function setupActions(bot) {
  bot.action('join_main', async (ctx) => {
    try {
      ctx.session.awaitingReferralInput = true;
      await ctx.reply(
        '🔑 To access the main channel, please enter your referral code. If you doesn\'t have a referral code, tap "Get referral code".',
        {
          reply_markup: {
            inline_keyboard: [[{ text: 'Get referral code', callback_data: 'join_main' }]]
          },
          parse_mode: 'HTML'
        }
      );
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in join_main action:', error);
    }
  });

  // Referral logic: ensure one join per user with cross-reference
  const { logEvent } = require('./bigquery');
  const { Firestore } = require('@google-cloud/firestore');
  const firestore = new Firestore();

  // Handle user's referral code input
  bot.on('text', async (ctx) => {
    if (!ctx.session.awaitingReferralInput) return;
    ctx.session.awaitingReferralInput = false;
    // Trim and process referral code
    const code = ctx.message.text.trim();
    // Ensure joiner has registered a wallet
    const usersQuery = await firestore.collection('users').where('username', '==', ctx.from.username).get();
    if (usersQuery.empty) {
      return ctx.reply('Please register your wallet first: /register <your wallet address>');
    }
    const userWallet = usersQuery.docs[0].id;
    // Ensure referral code exists
    const referrerDoc = await firestore.collection('users').doc(code).get();
    if (!referrerDoc.exists) {
      return ctx.reply('Invalid referral code. Ask the referrer to register with /register first.');
    }
    // Prevent self-referral
    if (userWallet === code) {
      return ctx.reply('You cannot refer yourself.');
    }
    // Prevent duplicate join by Telegram ID
    const joinDoc = await firestore.collection('referrals').doc(String(ctx.from.id)).get();
    if (joinDoc.exists) {
      return ctx.reply(`You have already used referral code ${joinDoc.data().referralCode}`);
    }
    // Prevent wallet being used to join more than once
    const walletJoinQuery = await firestore.collection('referrals').where('joinerWallet', '==', userWallet).get();
    if (!walletJoinQuery.empty) {
      return ctx.reply(`Your wallet has already joined with code ${walletJoinQuery.docs[0].data().referralCode}`);
    }
    // Record referral in Firestore, include referrerUsername for cross-reference
    await firestore.collection('referrals').doc(String(ctx.from.id)).set({
      referralCode: code,
      joinerId: ctx.from.id,
      joinerUsername: ctx.from.username,
      joinerWallet: userWallet,
      referrerWallet: code,
      referrerUsername: referrerDoc.data().username,
      joinTimestamp: new Date().toISOString(),
    });
    // Log to BigQuery
    await logEvent({
      user_id: ctx.from.id,
      username: ctx.from.username,
      event_type: 'referral_join',
      referral_code: code
    });
    await ctx.reply(`✅ You've joined successfully with code ${code}!`);
  });
};
