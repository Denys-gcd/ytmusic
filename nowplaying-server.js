require('dotenv').config(); 
const http = require('http');
// Add Discord RPC
const RPC = require('discord-rpc');
const clientId = process.env.DISCORD_CLIENT_ID;
const activityType = Number(process.env.DRPC_ACTIVITY_TYPE ?? 0); // 0=Playing, 2=Listening
let rpc = null;
let rpcReady = false;

function connectRPC() {
  if (!clientId) {
    console.warn('DISCORD_CLIENT_ID not set; skipping Discord RPC.');
    return;
  }
  rpc = new RPC.Client({ transport: 'ipc' });
  rpc.on('ready', () => {
    rpcReady = true;
    console.log('Discord RPC ready.');
  });
  rpc.on('disconnected', () => {
    rpcReady = false;
    console.warn('Discord RPC disconnected; retrying in 3s...');
    setTimeout(connectRPC, 3000);
  });
  rpc.login({ clientId }).catch(err => {
    console.warn('Discord RPC login failed:', err.message);
    setTimeout(connectRPC, 5000);
  });
}

function fmtTime(sec) {
  if (!Number.isFinite(sec)) return null;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Replace updatePresence:
function updatePresence(info) {
  if (!rpcReady || !info) return;
  const title = info.title || 'YouTube Music';
  const artist = info.artist || '';
  const playing = info.playing !== false;
  const pos = Number.isFinite(info.position) ? Math.max(0, Math.floor(info.position)) : null;
  const dur = Number.isFinite(info.duration) ? Math.max(0, Math.floor(info.duration)) : null;

  const timeText =
    info.timeText ||
    (pos != null && dur != null ? `${fmtTime(pos)} / ${fmtTime(dur)}` : undefined);

  // e.g., "Artist — ▶︎ 1:23 / 3:45"
  const parts = [];
  if (artist) parts.push(artist);
  if (timeText) parts.push(`${playing ? '▶︎' : '⏸'} ${timeText}`);
  const stateLine = parts.join(' — ');
 //TODO: Timestamps, properly handle play/pause
  const activity = {
    details: title,
    state: artist || undefined,
    type: activityType,
    startTimestamp,
    endTimestamp,
    largeImageKey: '', // Set to your app's large image key
    largeImageText: '', // Optional tooltip for large image
    smallImageKey: playing ? '' : '', // Set to your app's small image keys for both states
    smallImageText: playing ? '' : '', // Optional tooltip for small image
    buttons: info.url ? [{ label: 'Open in YouTube Music', url: info.url }] : undefined,
    instance: false,
  };

 

  rpc.setActivity(activity).catch(err => {
    console.warn('setActivity failed:', err.message);
  });
}

process.on('SIGINT', async () => {
  try { if (rpcReady) await rpc.clearActivity(); } catch {}
  process.exit(0);
});

let last = null;

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/nowplaying') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        last = JSON.parse(body || '{}');
        console.log('Now playing:', last);
        // Update Discord Rich Presence on each update
        updatePresence(last);
        res.writeHead(204).end();
      } catch {
        res.writeHead(400).end();
      }
    });
  } else if (req.method === 'GET' && req.url === '/nowplaying') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(last || {}));
  } else if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }).end();
  } else {
    res.writeHead(404).end();
  }
});

server.listen(57234, '127.0.0.1', () =>
  console.log('Listening on http://127.0.0.1:57234')
);

// Start Discord RPC connection
connectRPC();