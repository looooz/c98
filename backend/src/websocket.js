const { WebSocketServer, WebSocket } = require('ws');
const { v4: uuidv4 } = require('uuid');

const HEARTBEAT_INTERVAL = 30000;
const HEARTBEAT_TIMEOUT = 60000;

let wss = null;
const clients = new Map();
let heartbeatTimer = null;

function initWebSocket(server) {
  if (wss) {
    return wss;
  }

  wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    const clientId = uuidv4();
    const clientInfo = {
      id: clientId,
      ws,
      connectedAt: new Date().toISOString(),
      lastPing: Date.now(),
      remoteAddress: req.socket.remoteAddress
    };

    clients.set(clientId, clientInfo);

    ws.send(JSON.stringify({
      type: 'connected',
      data: {
        clientId,
        connectedAt: clientInfo.connectedAt
      }
    }));

    ws.on('pong', () => {
      clientInfo.lastPing = Date.now();
    });

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message.toString());
        handleClientMessage(clientId, parsed);
      } catch (err) {
        sendToClient(clientId, 'error', {
          message: 'Invalid message format',
          error: err.message
        });
      }
    });

    ws.on('close', () => {
      removeClient(clientId);
    });

    ws.on('error', (err) => {
      console.error(`[WebSocket] Client ${clientId} error:`, err.message);
      removeClient(clientId);
    });
  });

  startHeartbeatCheck();

  return wss;
}

function handleClientMessage(clientId, message) {
  const { type, data } = message;

  switch (type) {
    case 'ping':
      sendToClient(clientId, 'pong', {
        serverTime: Date.now(),
        clientTime: data && data.clientTime
      });
      break;
    case 'subscribe':
      handleSubscribe(clientId, data);
      break;
    case 'unsubscribe':
      handleUnsubscribe(clientId, data);
      break;
    default:
      break;
  }
}

function handleSubscribe(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;

  if (!client.subscriptions) {
    client.subscriptions = new Set();
  }

  if (Array.isArray(data)) {
    data.forEach(channel => client.subscriptions.add(channel));
  } else if (typeof data === 'string') {
    client.subscriptions.add(data);
  }
}

function handleUnsubscribe(clientId, data) {
  const client = clients.get(clientId);
  if (!client || !client.subscriptions) return;

  if (Array.isArray(data)) {
    data.forEach(channel => client.subscriptions.delete(channel));
  } else if (typeof data === 'string') {
    client.subscriptions.delete(data);
  }
}

function startHeartbeatCheck() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }

  heartbeatTimer = setInterval(() => {
    const now = Date.now();

    clients.forEach((client, clientId) => {
      if (now - client.lastPing > HEARTBEAT_TIMEOUT) {
        try {
          client.ws.terminate();
        } catch (e) {
          // ignore
        }
        removeClient(clientId);
        return;
      }

      try {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      } catch (e) {
        // ignore
      }
    });
  }, HEARTBEAT_INTERVAL);
}

function removeClient(clientId) {
  const client = clients.get(clientId);
  if (client) {
    try {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close();
      }
    } catch (e) {
      // ignore
    }
    clients.delete(clientId);
  }
}

function broadcast(type, data, filterFn) {
  if (!wss) return 0;

  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  let sentCount = 0;

  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      if (filterFn && !filterFn(client)) {
        return;
      }
      try {
        client.ws.send(message);
        sentCount++;
      } catch (e) {
        // ignore
      }
    }
  });

  return sentCount;
}

function sendToClient(clientId, type, data) {
  const client = clients.get(clientId);
  if (!client) return false;

  if (client.ws.readyState !== WebSocket.OPEN) {
    return false;
  }

  try {
    client.ws.send(JSON.stringify({
      type,
      data,
      timestamp: Date.now()
    }));
    return true;
  } catch (e) {
    return false;
  }
}

function broadcastDeviceUpdate(device) {
  return broadcast('device_update', device);
}

function broadcastTrafficUpdate(trafficData) {
  return broadcast('traffic_update', trafficData);
}

function broadcastAlert(alert) {
  return broadcast('alert', alert);
}

function broadcastScanProgress(progress) {
  return broadcast('scan_progress', progress);
}

function broadcastOnlineStatus(statusData) {
  return broadcast('online_status', statusData);
}

function getClientCount() {
  return clients.size;
}

function getClientList() {
  const list = [];
  clients.forEach((client, clientId) => {
    list.push({
      id: clientId,
      connectedAt: client.connectedAt,
      lastPing: client.lastPing,
      remoteAddress: client.remoteAddress,
      subscriptions: client.subscriptions ? Array.from(client.subscriptions) : []
    });
  });
  return list;
}

function shutdown() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  broadcast('server_shutdown', { message: 'Server is shutting down' });

  clients.forEach((_, clientId) => removeClient(clientId));

  if (wss) {
    wss.close(() => {
      wss = null;
    });
  }
}

module.exports = {
  initWebSocket,
  broadcast,
  sendToClient,
  broadcastDeviceUpdate,
  broadcastTrafficUpdate,
  broadcastAlert,
  broadcastScanProgress,
  broadcastOnlineStatus,
  getClientCount,
  getClientList,
  shutdown
};
