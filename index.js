const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fetch = require('node-fetch'); // For making API requests
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

// Verification endpoint (as you specified)
const VERIFY_URL = 'https://redaonweb.com/dash/verify.php';

async function verifyClient(token, deviceId) {
  try {
    const verifyUrl = `${VERIFY_URL}?token=${encodeURIComponent(token)}&device=${encodeURIComponent(deviceId)}`;
    const response = await fetch(verifyUrl);
    const data = await response.json();
    
    if (!data.success) {
      console.log(`Verification failed for device ${deviceId}:`, data.message || 'No reason provided');
      return { success: false, error: data.message || 'Verification failed' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Verification error:', error);
    return { success: false, error: error.message };
  }
}

server.on('upgrade', async (request, socket, head) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');
    const deviceId = url.searchParams.get('device');

    if (!token || !deviceId) {
      throw new Error('Missing token or device ID');
    }

    const verification = await verifyClient(token, deviceId);
    if (!verification.success) {
      throw new Error(verification.error || 'Authentication failed');
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.deviceId = deviceId;
      ws.token = token;
      wss.emit('connection', ws, request);
      
      // Send immediate connection confirmation
      ws.send(JSON.stringify({
        type: 'CONNECTED',
        message: 'Authentication successful',
        deviceId: deviceId,
        timestamp: Date.now()
      }));
    });
  } catch (error) {
    console.error('Connection rejected:', error.message);
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
  }
});

// Message handling and broadcasting
wss.on('connection', (ws) => {
  console.log(`Device connected: ${ws.deviceId}`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log(`Message from ${ws.deviceId}:`, data);
      
      // Handle special message types
      if (data.type === 'ALERT') {
        broadcast({
          type: 'ALERT',
          from: ws.deviceId,
          message: data.message || 'Alert triggered',
          timestamp: Date.now()
        });
      }
      // Add other message types as needed
    } catch (error) {
      console.error('Message error:', error);
      ws.send(JSON.stringify({
        type: 'ERROR',
        error: 'Invalid message format',
        details: error.message
      }));
    }
  });

  ws.on('close', () => {
    console.log(`Device disconnected: ${ws.deviceId}`);
    broadcast({
      type: 'DEVICE_DISCONNECTED',
      deviceId: ws.deviceId,
      timestamp: Date.now()
    });
  });
});

function broadcast(data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

app.get('/', (req, res) => {
  res.send('WebSocket Server is running.');
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
