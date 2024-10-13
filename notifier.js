// notifier.js
const TelegramBot = require('node-telegram-bot-api');
// Load configuration
const config = require('./config.json');
//import config from './config.json';

const bot = new TelegramBot(config.telegram.botToken, { polling: false });
const chatIds = config.telegram.chatIds; // Array of chat IDs

// notifier.js
async function sendTelegramMessage(message) {
    try {
      const promises = chatIds.map((chatId) =>
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
      );
      await Promise.all(promises);
      console.log('Telegram notifications sent.');
    } catch (error) {
      console.error('Error sending Telegram notifications:', error);
    }
  }
  

module.exports = { sendTelegramMessage };
