const functions = require('@google-cloud/functions-framework');
const { Logging } = require('@google-cloud/logging');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const axios = require('axios');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
require('dotenv').config();

// Setup logging
const logging = new Logging();
const log = logging.log('lottery-notifications-function');

// Initialize Secret Manager
const secretManager = new SecretManagerServiceClient();

// Dragon logo URL for notifications - using the proven working Imgur album URL
const DRAGON_LOGO_URL = 'https://imgur.com/a/fX9txmo'; // Imgur album URL

// MP4 file for notifications
const DRAGON_MP4_FILENAME = "20250419_0659_Dragon's Fiery Jackpot_simple_compose_01js75h2ebejb822q9dvtmjq1c.mp4";

/**
 * Format amounts to be more readable
 */
function formatAmount(amount, decimals = 18) {
  return parseFloat(ethers.utils.formatUnits(amount, decimals)).toFixed(4);
}

/**
 * Shorten addresses for display
 */
function shortenAddress(address) {
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Get token symbol based on address
 */
function getTokenSymbol(address) {
  const knownTokens = {
    [process.env.DRAGON_TOKEN_ADDRESS.toLowerCase()]: 'DRAGON',
    [process.env.WSONIC_ADDRESS.toLowerCase()]: 'wSONIC'
  };
  
  return knownTokens[address.toLowerCase()] || 'Unknown';
}

/**
 * Generate a notification message based on event data
 */
function generateNotificationMessage(eventData) {
  if (eventData.event_type === 'LotterySwapExecuted') {
    const amountIn = formatAmount(eventData.amount_in);
    const amountOut = formatAmount(eventData.amount_out);
    const tokenIn = getTokenSymbol(eventData.token_in);
    const tokenOut = getTokenSymbol(eventData.token_out);
    const userAddress = shortenAddress(eventData.user_address);
    const txHash = eventData.transaction_hash;
    const explorerLink = `${process.env.EXPLORER_URL}/tx/${txHash}`;
    
    if (eventData.is_winner) {
      const jackpotAmount = formatAmount(eventData.jackpot_amount);
      return {
        title: '🎉 Jackpot Winner!',
        message: `User ${userAddress} swapped ${amountIn} ${tokenIn} for ${amountOut} ${tokenOut} and won ${jackpotAmount} DRAGON! 🎉`,
        url: explorerLink,
        importance: 'high'
      };
    } else {
      return {
        title: 'New Lottery Swap',
        message: `User ${userAddress} swapped ${amountIn} ${tokenIn} for ${amountOut} ${tokenOut}`,
        url: explorerLink,
        importance: 'normal'
      };
    }
  } else if (eventData.event_type === 'JackpotWon') {
    const jackpotAmount = formatAmount(eventData.jackpot_amount);
    const userAddress = shortenAddress(eventData.user_address);
    const txHash = eventData.transaction_hash;
    const explorerLink = `${process.env.EXPLORER_URL}/tx/${txHash}`;
    const jackpotType = parseInt(eventData.lottery_type);
    let jackpotName = '';
    
    switch (jackpotType) {
      case 0:
        jackpotName = 'Mini Jackpot';
        break;
      case 1:
        jackpotName = 'Major Jackpot';
        break;
      case 2:
        jackpotName = 'Grand Jackpot';
        break;
      default:
        jackpotName = 'Jackpot';
    }
    
    return {
      title: `🎉 ${jackpotName} Winner!`,
      message: `User ${userAddress} won the ${jackpotName} of ${jackpotAmount} DRAGON! 🎉`,
      url: explorerLink,
      importance: 'high',
      jackpotType: jackpotType
    };
  }
  
  return null;
}

/**
 * Send notification to Discord
 */
async function sendDiscordNotification(notification) {
  try {
    // Get Discord webhook URL from Secret Manager
    const [version] = await secretManager.accessSecretVersion({
      name: `projects/${process.env.PROJECT_ID}/secrets/discord-webhook/versions/latest`,
    });
    
    const webhookUrl = version.payload.data.toString();
    
    const color = notification.importance === 'high' ? 16711680 : 3447003; // Red for high importance, blue for normal
    
    const embed = {
      title: notification.title,
      description: notification.message,
      url: notification.url,
      color: color,
      timestamp: new Date().toISOString()
    };
    
    // Add image for jackpot wins
    if (notification.importance === 'high' && notification.jackpotType !== undefined) {
      embed.thumbnail = {
        url: DRAGON_LOGO_URL
      };
    }
    
    await axios.post(webhookUrl, {
      username: 'Dragon Lottery Bot',
      embeds: [embed]
    });
    
    console.log('Sent Discord notification');
  } catch (error) {
    console.error('Error sending Discord notification:', error);
    throw error;
  }
}

/**
 * Send local MP4 file to Telegram
 */
async function sendLocalMP4(botToken, chatId, caption) {
  // Check if file exists
  const videoPath = path.join(__dirname, DRAGON_MP4_FILENAME);
  
  if (!fs.existsSync(videoPath)) {
    throw new Error(`MP4 file not found at: ${videoPath}`);
  }
  
  // Create form data with the video file
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('caption', caption);
  formData.append('parse_mode', 'Markdown');
  
  // Add the video file
  const videoFile = fs.createReadStream(videoPath);
  formData.append('video', videoFile);
  
  // Send the video
  const response = await axios.post(
    `https://api.telegram.org/bot${botToken}/sendVideo`, 
    formData, 
    {
      headers: {
        ...formData.getHeaders(),
        'Content-Type': 'multipart/form-data'
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    }
  );
  
  if (!response.data.ok) {
    throw new Error(`Failed to send local MP4: ${JSON.stringify(response.data)}`);
  }
  
  console.log('Sent Dragon MP4 from local file');
  return true;
}

/**
 * Send notification to Telegram
 */
async function sendTelegramNotification(notification) {
  try {
    // Get Telegram bot token and chat ID from Secret Manager
    const [tokenVersion] = await secretManager.accessSecretVersion({
      name: `projects/${process.env.PROJECT_ID}/secrets/telegram-bot-token/versions/latest`,
    });
    
    const [chatIdVersion] = await secretManager.accessSecretVersion({
      name: `projects/${process.env.PROJECT_ID}/secrets/telegram-chat-id/versions/latest`,
    });
    
    const botToken = tokenVersion.payload.data.toString();
    const chatId = chatIdVersion.payload.data.toString();
    
    // For important notifications (jackpot wins), send special media first
    if (notification.importance === 'high' && notification.jackpotType !== undefined) {
      // Convert jackpot type to name for caption
      let jackpotName = '';
      switch (notification.jackpotType) {
        case 0:
          jackpotName = 'MINI JACKPOT';
          break;
        case 1:
          jackpotName = 'MAJOR JACKPOT';
          break;
        case 2:
          jackpotName = 'GRAND JACKPOT';
          break;
        default:
          jackpotName = 'JACKPOT';
      }
      
      const caption = `🔥 *DRAGON ${jackpotName} ALERT* 🔥`;
      
      try {
        // Try to send local MP4 file first
        try {
          await sendLocalMP4(botToken, chatId, caption);
          // If successful, we're done with media
        } catch (localMp4Error) {
          console.error('Error sending local MP4, trying other methods:', localMp4Error.message);
          
          // If local file fails, try URL from environment variable
          if (process.env.DRAGON_MP4_URL) {
            await axios.post(`https://api.telegram.org/bot${botToken}/sendVideo`, {
              chat_id: chatId,
              video: process.env.DRAGON_MP4_URL,
              caption: caption,
              parse_mode: 'Markdown'
            });
            console.log('Sent Dragon MP4 from URL');
          } else {
            // If no URL or URL fails, try Imgur image
            throw new Error('No MP4 URL configured or URL failed, trying Imgur');
          }
        }
      } catch (videoError) {
        console.error('Error sending video, falling back to Imgur:', videoError.message);
        
        // If all video methods fail, try Imgur image
        try {
          await axios.post(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
            chat_id: chatId,
            photo: DRAGON_LOGO_URL,
            caption: caption,
            parse_mode: 'Markdown'
          });
          console.log('Sent Dragon logo from Imgur');
        } catch (imgurError) {
          console.error('Error sending Imgur image, falling back to text:', imgurError.message);
          
          // If image fails too, just send the caption text
          await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: chatId,
            text: caption,
            parse_mode: 'Markdown'
          });
          console.log('Sent text alert as fallback');
        }
      }
      
      // Wait a moment before sending the next message
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Format and send the main notification message
    const message = `*${notification.title}*\n\n${notification.message}\n\n[View Transaction](${notification.url})`;
    
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });
    
    console.log('Sent Telegram notification');
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    throw error;
  }
}

/**
 * Cloud Function to handle notifications for lottery events
 * Triggered by Pub/Sub
 */
functions.cloudEvent('lotteryNotifications', async (cloudEvent) => {
  try {
    // Log function start
    const metadata = {
      resource: {
        type: 'cloud_function',
        labels: {
          function_name: 'lotteryNotifications'
        }
      }
    };
    
    log.info(log.entry(metadata, 'Starting lottery notifications function'));
    
    // Parse the Pub/Sub message
    const pubSubMessage = cloudEvent.data;
    const messageData = JSON.parse(Buffer.from(pubSubMessage.message.data, 'base64').toString());
    
    console.log('Received event data:', JSON.stringify(messageData));
    
    // Generate notification message
    const notification = generateNotificationMessage(messageData.data);
    
    if (!notification) {
      console.log('No notification generated for this event');
      return;
    }
    
    console.log('Generated notification:', notification);
    
    // Send notifications
    const notificationPromises = [];
    
    if (process.env.ENABLE_DISCORD_NOTIFICATIONS === 'true') {
      notificationPromises.push(sendDiscordNotification(notification));
    }
    
    if (process.env.ENABLE_TELEGRAM_NOTIFICATIONS === 'true') {
      notificationPromises.push(sendTelegramNotification(notification));
    }
    
    // Wait for all notifications to be sent
    await Promise.all(notificationPromises);
    
    log.info(log.entry(metadata, 'Lottery notifications sent successfully'));
  } catch (error) {
    console.error('Error processing notification:', error);
    log.error(log.entry({}, `Error processing notification: ${error.message}`));
    throw error;
  }
}); 