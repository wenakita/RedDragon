// Minimal Google Cloud Function for Telegram Webhook using Telegraf
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { Telegraf } = require('telegraf');

const secretManager = new SecretManagerServiceClient();
const fs = require('fs');
const path = require('path');
let bot;
let botTokenLoaded = false;

// Set your Telegram chat ID here or via environment variable
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "<YOUR_CHAT_ID>";

// Video file paths
const BUY_VIDEO_PATH = path.join(__dirname, "20250419_0703_Dragon's Fiery Emblem_simple_compose_01js75snhzec3twt9g3qpyf22s.mp4");
const JACKPOT_VIDEO_PATH = path.join(__dirname, "20250419_0659_Dragon's Fiery Jackpot_simple_compose_01js75h2ebejb822q9dvtmjq1c.mp4");

async function getBotToken() {
  const projectId = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || process.env.PROJECT_ID;
  if (!projectId) throw new Error('No Google Cloud project ID found in environment variables.');
  const [version] = await secretManager.accessSecretVersion({
    name: `projects/${projectId}/secrets/telegram-bot-token/versions/latest`,
  });
  return version.payload.data.toString();
}

async function initBot() {
  if (botTokenLoaded) return;
  const token = await getBotToken();
  bot = new Telegraf(token);
  botTokenLoaded = true;
}

exports.telegramWebhook = async (req, res) => {
  try {
    await initBot();
    if (req.method === 'GET' || req.method === 'HEAD') {
      return res.status(200).send('OK');
    }
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body, res);
      if (!res.headersSent) {
        res.status(200).send();
      }
      return;
    }
    res.status(405).send('Method Not Allowed');
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error');
    }
  }
};

// Notification endpoint: POST /notify with type, user, amount, tx, jackpot
exports.notify = async (req, res) => {
  try {
    await initBot();
    const { type, user, amount, tx, jackpot } = req.body;
    let message = "";
    let videoPath = null;

    if (type === "buy") {
      message =
        `🚀 <b>NEW $DRAGON BUY!</b> 🚀\n\n` +
        `👤 <b>Buyer:</b> <code>${user}</code>\n` +
        `💰 <b>Amount:</b> <b>${amount} $DRAGON</b>\n\n` +
        `🔗 <a href=\"${tx}\">View Transaction</a>`;
      videoPath = BUY_VIDEO_PATH;
    } else if (type === "jackpot") {
      message = `🎉 ${user} just WON the JACKPOT of ${jackpot} $DRAGON!\n[View Tx](${tx})`;
      videoPath = JACKPOT_VIDEO_PATH;
    } else {
      return res.status(400).send("Unknown notification type");
    }

    // Send video with caption
    await bot.telegram.sendVideo(
      TELEGRAM_CHAT_ID,
      { source: fs.createReadStream(videoPath) },
      { caption: message, parse_mode: "HTML" }
    );
    res.status(200).send("Notification sent");
  } catch (err) {
    console.error("Failed to send notification:", err);
    res.status(500).send("Failed to send notification");
  }
};
