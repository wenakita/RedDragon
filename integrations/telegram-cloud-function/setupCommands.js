const { generateMeme } = require('./vertexai');
const { Markup } = require('telegraf');
const { Firestore } = require('@google-cloud/firestore');
const firestore = new Firestore();
const { logEvent, getLeaderboard } = require('./bigquery');

module.exports = function setupCommands(bot) {
  bot.start(async (ctx) => {
    await ctx.reply(
      '🐉 Welcome to Sonic Red Dragon Bot!\n\nTap Join below to access the main channel and enter your referral code.',
      {
        reply_markup: {
          keyboard: [[{ text: 'Join' }]],
          one_time_keyboard: true,
          resize_keyboard: true,
        },
        parse_mode: 'HTML',
      }
    );
  });

  bot.hears('Join', async (ctx) => {
    ctx.session.awaitingReferralInput = true;
    await ctx.reply(
      'Please enter your referral code to proceed,',
      Markup.keyboard([['Get referral code']])
        .oneTime()
        .resize()
    );
  });

  bot.hears('Get referral code', async (ctx) => {
    await ctx.reply(
      '🔑 To access the main channel, please request a referral code via one of these links:',
      Markup.inlineKeyboard([
        [Markup.button.url('Sonic Degenerates (Unofficial)', 'https://t.me/+ztfw-iNGemIwMTJl')],
        [Markup.button.url('Sonic Community (Official)', 'https://t.me/Sonic_English')],
        [Markup.button.url('Sonic Builders (Official)', 'https://t.me/SonicBuilders')]
      ])
    );
  });

  bot.command('meme', async (ctx) => {
    const topic = ctx.message.text.replace('/meme', '').trim();
    if (!topic) {
      await ctx.reply('Usage: /meme <topic>. Example: /meme crypto lottery');
      return;
    }
    await ctx.reply('🧠 Generating meme idea...');
    const meme = await generateMeme(topic);
    await ctx.reply(`💡 Meme idea: ${meme}`);
    logEvent({ type: 'meme_command', data: { topic } });
  });

  // Register your wallet to your Telegram username
  bot.command('register', async (ctx) => {
    const wallet = ctx.message.text.replace('/register', '').trim();
    if (!wallet) return ctx.reply('Usage: /register <your wallet address>');
    await firestore.collection('users').doc(wallet).set({ username: ctx.from.username });
    await ctx.reply(`✅ Registered wallet ${wallet} to @${ctx.from.username}`);
    logEvent({ type: 'register_wallet', data: { wallet } });
  });

  // Leaderboard: resolve wallet -> username mapping
  bot.command('leaderboard', async (ctx) => {
    const rows = await getLeaderboard();
    if (!rows || rows.length === 0) return ctx.reply('No referrals yet for leaderboard.');
    const totalPoints = rows.reduce((sum, r) => sum + Number(r.joins), 0);
    const totalDragon = 69420;
    let msg = '🏆 Leaderboard\n\nSee who’s leading in referrals and winnings!\n\n';
    for (const [idx, row] of rows.entries()) {
      const raw = row.referral_code;
      const abbr = `${raw.slice(0,5)}...${raw.slice(-5)}`;
      let name = abbr;
      const doc = await firestore.collection('users').doc(raw).get();
      if (doc.exists && doc.data().username) name = `@${doc.data().username}`;
      const tokens = Math.floor((row.joins / totalPoints) * totalDragon);
      const usd = Math.round((tokens / totalDragon) * 100000);
      msg += `${idx + 1}. ${name} — ${row.joins} points | ${tokens.toLocaleString()} $DRAGON | ~$${usd.toLocaleString()}\n`;
    }
    msg += `\nToken allocation: ${totalDragon.toLocaleString()} $DRAGON (1% of total supply) split by points.`;
    msg += `\nEst. value based on $100,000 FDV.`;
    await ctx.reply(msg);
  });
};
