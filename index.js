const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios'); // Required for Telegram API
const PORT = process.env.PORT || 3000;

const TELEGRAM_BOT_TOKEN = '7361030705:AAGjqCk1KHeXW6p7Cv9i4h_HNe7mJriN7-U';
const TELEGRAM_CHAT_ID = '-1002608885423'; // or '-1001234567890' for private channels

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Send message to Telegram
function sendToTelegram(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  return axios.post(url, {
    chat_id: TELEGRAM_CHAT_ID,
    text: `<b>New Alert:</b>\n<pre>${message}</pre>`,
    parse_mode: 'HTML'
  }).catch(err => {
    console.error('❌ Failed to send to Telegram:', err.response?.data || err.message);
  });
}

// Broadcast to all clients
function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    try {
      const text = message.toString('utf8');
      const parsed = JSON.parse(text);
      const compactLog = JSON.stringify(parsed);
      const timestamp = new Date().toISOString();

      console.log(`[${timestamp}] ✅ Parsed JSON: ${compactLog}`);

      broadcast(compactLog);
      sendToTelegram(compactLog);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] ❌ JSON Parse Error: ${err.message}`);
      console.error(`[${new Date().toISOString()}] 🔍 Raw message: ${message.toString('utf8')}`);
      ws.send(JSON.stringify({ error: 'Invalid JSON', details: err.message }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

app.get('/', (req, res) => {
  res.send('WebSocket Server is running.');
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
