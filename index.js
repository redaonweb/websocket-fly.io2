const url = require('url');
const https = require('https'); // use `https` for secure external API call

wss.on('connection', async (ws, req) => {
  const parsedUrl = url.parse(req.url, true);
  const token = parsedUrl.query.token;
  const device = parsedUrl.query.device;

  if (!token || !device) {
    ws.send(JSON.stringify({ error: 'Missing token or device' }));
    ws.close();
    return;
  }

  try {
    // Verify token and device by calling the external API
    const verifyUrl = `https://redaonweb.com/dash/verify.php?token=${encodeURIComponent(token)}&device=${encodeURIComponent(device)}`;

    https.get(verifyUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.success !== true) {
            ws.send(JSON.stringify({ error: 'Access Denied' }));
            ws.close();
            return;
          }

          console.log('✅ Client verified:', { token, device });

          // From here, connection is accepted
          ws.on('message', (message) => {
            try {
              const text = message.toString('utf8');
              const parsed = JSON.parse(text);
              console.log('✅ Parsed JSON:', parsed);
              broadcast(JSON.stringify(parsed));
            } catch (err) {
              console.error('❌ JSON Parse Error:', err.message);
              ws.send(JSON.stringify({ error: 'Invalid JSON', details: err.message }));
            }
          });

          ws.on('close', () => {
            console.log('Client disconnected');
          });

        } catch (err) {
          console.error('❌ Verification response parse error:', err.message);
          ws.send(JSON.stringify({ error: 'Verification failed' }));
          ws.close();
        }
      });
    }).on('error', (err) => {
      console.error('❌ Verification request failed:', err.message);
      ws.send(JSON.stringify({ error: 'Verification error' }));
      ws.close();
    });

  } catch (err) {
    console.error('❌ Server error during verification:', err.message);
    ws.send(JSON.stringify({ error: 'Internal server error' }));
    ws.close();
  }
});
