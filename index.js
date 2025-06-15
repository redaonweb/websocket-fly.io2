const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

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
      // Convert buffer to string
      const text = message.toString('utf8');
      const parsed = JSON.parse(text);

      // ✅ Print single-line log
      console.log(`[${new Date().toISOString()}] ✅ Parsed JSON: ${JSON.stringify(parsed)}`);

      broadcast(JSON.stringify(parsed));
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
