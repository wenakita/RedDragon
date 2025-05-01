// index.js - Google Cloud Function for Telegram Webhook using Telegraf (JavaScript version)

// Global error handlers for better crash logging
if (typeof process !== 'undefined') {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  });
}

console.log(' [Startup] index.js loaded.');

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { Telegraf } = require('telegraf');
const { Firestore } = require('@google-cloud/firestore');
const LocalSession = require('telegraf-session-local');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const { uploadToPinata } = require('./upload-to-pinata');
const { logEvent, getLeaderboard } = require('./bigquery');
const { generateReply, generateMeme } = require('./vertexai');
const setupCommands = require('./setupCommands');
const setupActions = require('./setupActions');

const secretManager = new SecretManagerServiceClient();
const firestore = new Firestore();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
const TELEGRAM_BOT_USERNAME = 'sonic_reddragon_bot';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '<YOUR_CHAT_ID>';

const BUY_VIDEO_PATH = path.join(__dirname, "20250419_0703_Dragon's Fiery Emblem_simple_compose_01js75snhzec3twt9g3qpyf22s.mp4");
const JACKPOT_VIDEO_PATH = path.join(__dirname, "20250419_0659_Dragon's Fiery Jackpot_simple_compose_01js75h2ebejb822q9dvtmjq1c.mp4");

if (!fs.existsSync(BUY_VIDEO_PATH)) {
  console.warn(`[Startup] BUY_VIDEO_PATH missing: ${BUY_VIDEO_PATH}`);
} else {
  console.log(`[Startup] BUY_VIDEO_PATH found: ${BUY_VIDEO_PATH}`);
}

if (!fs.existsSync(JACKPOT_VIDEO_PATH)) {
  console.warn(`[Startup] JACKPOT_VIDEO_PATH missing: ${JACKPOT_VIDEO_PATH}`);
} else {
  console.log(`[Startup] JACKPOT_VIDEO_PATH found: ${JACKPOT_VIDEO_PATH}`);
}

if (!process.env.OPENAI_API_KEY) {
  console.warn('[Startup] OPENAI_API_KEY is missing!');
}

if (!process.env.TELEGRAM_CHAT_ID) {
  console.warn('[Startup] TELEGRAM_CHAT_ID is missing!');
}

if (!process.env.PROJECT_ID && !process.env.GCP_PROJECT && !process.env.GOOGLE_CLOUD_PROJECT) {
  console.warn('[Startup] No Google Cloud project ID found in env!');
}

let bot;
let botTokenLoaded = false;

async function getBotToken() {
  const projectId = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || process.env.PROJECT_ID;
  if (!projectId) throw new Error('No Google Cloud project ID found in environment variables.');

  const [version] = await secretManager.accessSecretVersion({
    name: `projects/${projectId}/secrets/telegram-bot-token/versions/latest`,
  });

  if (!version.payload || !version.payload.data) throw new Error('Secret payload missing');
  return version.payload.data.toString();
}

async function initBot() {
  if (botTokenLoaded) return;

  const token = await getBotToken();
  bot = new Telegraf(token);

  bot.use(new LocalSession({
    database: '/tmp/session_db.json',
    storage: LocalSession.storageFileAsync
  }).middleware());

  botTokenLoaded = true;
  setupCommands(bot);
  setupActions(bot);
  return bot;
}

async function telegramWebhook(req, res) {
  try {
    await initBot();
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body, res);
    } else {
      res.status(200).send('Sonic Red Dragon Telegram Bot is running.');
    }
  } catch (err) {
    console.error('Error in telegramWebhook handler:', err);
    res.status(500).send('Internal Server Error');
  }
}

exports.telegramWebhook = telegramWebhook;
