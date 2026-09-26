import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { INITIAL_PRODUCTS, INITIAL_SHOP_SETTINGS, INITIAL_PURCHASES, INITIAL_STOCK_OUTS, INITIAL_PURCHASE_ORDERS } from './src/data/initialProducts';
import { INITIAL_ORDERS } from './src/data/initialOrders';
import { INITIAL_USERS, INITIAL_DELIVERY_TRACKINGS } from './src/data/initialUsers';
import { INITIAL_COURIERS } from './src/data/initialCouriers';

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'store-state.json');
const SNAPSHOT_BACKUP_FILE = path.join(DATA_DIR, 'latest-drive-snapshot.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Standalone snapshot backup saver for resilient zero-click restoration
const saveLatestSnapshotBackup = (snapshot: any) => {
  if (!snapshot) return;
  try {
    fs.writeFileSync(SNAPSHOT_BACKUP_FILE, JSON.stringify(snapshot, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[StoreSync] Failed to write latest snapshot backup:', err);
  }
};

// Initial fallback server state
const INITIAL_DRIVE_SNAPSHOTS = [
  {
    id: 'snap-cloud-001',
    timestamp: new Date(Date.now() - 3600 * 24 * 2 * 1000).toISOString(),
    name: 'Auto-Sync: Pre-weekend Catalog & POS State',
    sizeKb: 48,
    deviceSource: 'Chan Online Shop Main Terminal (PP)',
    targetEmail: 'chanonlineshop95@gmail.com',
    syncType: 'AUTO_MINUTE' as const,
    recordCount: {
      products: 8,
      orders: 1,
      posSales: 1,
      logs: 1,
      users: 4,
      purchases: 3,
      stockOuts: 2,
      purchaseOrders: 3,
    },
    syncedToGoogleDrive: true,
    driveFileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  },
];

const getInitialState = () => ({
  products: INITIAL_PRODUCTS,
  orders: INITIAL_ORDERS,
  inventoryLogs: [
    {
      id: 'log-seed-001',
      productId: 'prod-001',
      productName: 'Pro ANC Wireless Earbuds (Spatial Audio)',
      sku: 'COS-AUD-001',
      previousStock: 45,
      newStock: 45,
      changeQuantity: 45,
      changeType: 'INITIAL_STOCK',
      reason: 'Opening inventory initialization',
      timestamp: new Date().toISOString(),
      performedBy: 'System Administrator',
    }
  ],
  settings: INITIAL_SHOP_SETTINGS,
  categories: ['Audio & Sound', 'Smartphones & Tablets', 'Charging & Power', 'Smart Wearables', 'Computer & Desk', 'Lifestyle & Gadgets'],
  purchases: INITIAL_PURCHASES,
  stockOuts: INITIAL_STOCK_OUTS,
  purchaseOrders: INITIAL_PURCHASE_ORDERS,
  posSales: [],
  deliveryTrackings: INITIAL_DELIVERY_TRACKINGS,
  couriers: INITIAL_COURIERS,
  users: INITIAL_USERS,
  driveSnapshots: INITIAL_DRIVE_SNAPSHOTS,
});

const sanitizeServerCategories = (cats: any): string[] => {
  if (!Array.isArray(cats)) return ['Audio & Sound', 'Smartphones & Tablets', 'Charging & Power', 'Smart Wearables', 'Computer & Desk', 'Lifestyle & Gadgets'];
  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const c of cats) {
    if (typeof c !== 'string') continue;
    const trimmed = c.trim();
    if (!trimmed || trimmed.toLowerCase() === 'all') continue;
    const lower = trimmed.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      cleaned.push(trimmed);
    }
  }
  return cleaned;
};

interface StoreStateWrapper {
  version: number;
  lastUpdated: string;
  state: Record<string, any>;
}

// In-memory state cache
let serverStore: StoreStateWrapper = {
  version: 1,
  lastUpdated: new Date().toISOString(),
  state: getInitialState(),
};

// Set of recent mutation IDs for idempotency (prevents double increments)
const processedMutationIds = new Set<string>();
const recordMutationId = (id?: string): boolean => {
  if (!id) return false;
  if (processedMutationIds.has(id)) return true; // already processed
  processedMutationIds.add(id);
  if (processedMutationIds.size > 500) {
    const firstItem = processedMutationIds.values().next().value;
    if (firstItem) processedMutationIds.delete(firstItem);
  }
  return false;
};

// Immediate atomic state save to disk
const savePersistedState = () => {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(serverStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('[StoreSync] Error persisting state to file:', err);
  }
};

// Load persistent state from disk if available with validation
const loadPersistedState = () => {
  const defaults = getInitialState();
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.state && typeof parsed.version === 'number') {
        serverStore = parsed;

        if (!serverStore.state || typeof serverStore.state !== 'object') {
          serverStore.state = defaults;
        }

        // 1. Guard against empty or missing products
        if (!Array.isArray(serverStore.state.products) || serverStore.state.products.length === 0) {
          console.log('[StoreSync] Products array was empty or missing on disk, restoring initial products');
          serverStore.state.products = defaults.products;
        }

        // 2. Guard against empty or missing orders
        if (!Array.isArray(serverStore.state.orders) || serverStore.state.orders.length === 0) {
          console.log('[StoreSync] Orders array was empty or missing on disk, restoring initial orders');
          serverStore.state.orders = defaults.orders;
        }

        // 3. Guard against missing settings
        if (!serverStore.state.settings || typeof serverStore.state.settings !== 'object') {
          serverStore.state.settings = defaults.settings;
        }

        // 4. Sanitize categories
        if (!Array.isArray(serverStore.state.categories) || serverStore.state.categories.length === 0) {
          serverStore.state.categories = defaults.categories;
        } else {
          serverStore.state.categories = sanitizeServerCategories(serverStore.state.categories);
        }

        // 5. Guard against empty users & compact bloated base64 avatars
        if (!Array.isArray(serverStore.state.users) || serverStore.state.users.length === 0) {
          serverStore.state.users = defaults.users;
        } else {
          serverStore.state.users = serverStore.state.users.map((u: any) => {
            if (u.avatar && typeof u.avatar === 'string' && u.avatar.length > 50000) {
              console.log(`[StoreSync] Compacting oversize avatar for user "${u.name}" (${Math.round(u.avatar.length / 1024)} KB -> URL)`);
              return {
                ...u,
                avatar: u.role === 'SUPER_ADMIN'
                  ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80'
                  : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80',
              };
            }
            return u;
          });
        }

        // 6. Guard against empty or missing purchases
        if (!Array.isArray(serverStore.state.purchases) || serverStore.state.purchases.length === 0) {
          console.log('[StoreSync] Purchases array was empty or missing on disk, restoring initial purchases');
          serverStore.state.purchases = defaults.purchases;
        }

        // 7. Guard against empty or missing driveSnapshots
        if (!Array.isArray(serverStore.state.driveSnapshots) || serverStore.state.driveSnapshots.length === 0) {
          console.log('[StoreSync] DriveSnapshots array was empty or missing on disk, restoring initial driveSnapshots');
          serverStore.state.driveSnapshots = defaults.driveSnapshots;
        }

        // 8. Standalone snapshot restoration check: If standalone snapshot backup exists, check if it has newer data
        try {
          if (fs.existsSync(SNAPSHOT_BACKUP_FILE)) {
            const snapRaw = fs.readFileSync(SNAPSHOT_BACKUP_FILE, 'utf-8');
            const snapObj = JSON.parse(snapRaw);
            if (snapObj && snapObj.payload?.data) {
              console.log(`[StoreSync] Ingesting standalone snapshot backup "${snapObj.name}" from ${snapObj.timestamp}`);
              const snapData = snapObj.payload.data;
              for (const [key, val] of Object.entries(snapData)) {
                if (Array.isArray(val) && val.length > 0) {
                  const curr = serverStore.state[key];
                  if (!Array.isArray(curr) || curr.length === 0 || (snapObj.timestamp && snapObj.timestamp > (serverStore.lastUpdated || ''))) {
                    serverStore.state[key] = val;
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn('[StoreSync] Standalone snapshot check error:', e);
        }

        // Ensure other collections exist
        for (const [key, val] of Object.entries(defaults)) {
          if (serverStore.state[key] === undefined) {
            serverStore.state[key] = val;
          }
        }

        // Cache latest snapshot to standalone file
        if (Array.isArray(serverStore.state.driveSnapshots) && serverStore.state.driveSnapshots[0]?.payload) {
          saveLatestSnapshotBackup(serverStore.state.driveSnapshots[0]);
        }

        // Write cleaned & verified state back to disk immediately
        fs.writeFileSync(STATE_FILE, JSON.stringify(serverStore, null, 2), 'utf-8');
        console.log(`[StoreSync] Loaded persisted state v${serverStore.version} (${Object.keys(serverStore.state).length} collections, ${serverStore.state.products.length} products, ${serverStore.state.orders.length} orders, ${serverStore.state.purchases?.length || 0} purchases)`);
        return;
      }
    }
  } catch (err) {
    console.error('[StoreSync] Failed to read state file, using initial data:', err);
  }

  // Check standalone snapshot if state file was missing
  try {
    if (fs.existsSync(SNAPSHOT_BACKUP_FILE)) {
      const snapRaw = fs.readFileSync(SNAPSHOT_BACKUP_FILE, 'utf-8');
      const snapObj = JSON.parse(snapRaw);
      if (snapObj && snapObj.payload?.data) {
        console.log(`[StoreSync] Recovered state from standalone snapshot backup: ${snapObj.name}`);
        serverStore.state = {
          ...serverStore.state,
          ...snapObj.payload.data,
        };
      }
    }
  } catch (e) {}

  // Save initial state to disk
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(serverStore, null, 2), 'utf-8');
  } catch (e) {
    // ignore
  }
};

loadPersistedState();

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // Global permissive CORS middleware for seamless cross-origin and multi-device access
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Parse JSON bodies up to 25MB for bulk inventory snapshots
  app.use(express.json({ limit: '25mb' }));

  // SSE (Server-Sent Events) clients registry
  interface SseClient {
    id: string;
    clientId: string;
    deviceType: string;
    res: express.Response;
    ip: string;
    connectedAt: string;
  }
  const sseClients = new Map<string, SseClient>();

  // Initialize WebSocket Server on /ws
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Helper to calculate total active unique devices across SSE and WS
  const getConnectedDeviceCount = (): number => {
    const uniqueClientIds = new Set<string>();
    wss.clients.forEach((c: any) => {
      if (c.readyState === WebSocket.OPEN) {
        uniqueClientIds.add(c.clientId || `ws-${Math.random()}`);
      }
    });
    sseClients.forEach((client) => {
      uniqueClientIds.add(client.clientId);
    });
    return Math.max(1, uniqueClientIds.size);
  };

  // Unified Multi-Channel Broadcast Helper (Sends to both WebSocket and SSE clients)
  const broadcastAll = (data: any, options?: { excludeWs?: WebSocket; excludeClientId?: string }) => {
    const payload = JSON.stringify(data);

    // 1. Broadcast to WebSocket clients
    wss.clients.forEach((client: any) => {
      if (client !== options?.excludeWs && client.readyState === WebSocket.OPEN) {
        if (!options?.excludeClientId || client.clientId !== options.excludeClientId) {
          try {
            client.send(payload);
          } catch (e) {
            // ignore send error
          }
        }
      }
    });

    // 2. Broadcast to SSE (Server-Sent Events) clients
    sseClients.forEach((client, id) => {
      if (options?.excludeClientId && client.clientId === options.excludeClientId) {
        return;
      }
      try {
        client.res.write(`data: ${payload}\n\n`);
      } catch (err) {
        console.warn(`[StoreSync SSE] Failed to send to ${client.clientId}, removing client:`, err);
        sseClients.delete(id);
      }
    });
  };

  // Broadcast connection count & version on state changes or device connect/disconnect
  const broadcastPresence = () => {
    const count = getConnectedDeviceCount();
    const presenceData = {
      type: 'PRESENCE_UPDATE',
      connectedDevices: count,
      version: serverStore.version,
      timestamp: new Date().toISOString(),
    };
    broadcastAll(presenceData);
  };

  // SSE Heartbeat interval (keeps streaming connection alive through Cloud Run / proxy timeouts)
  setInterval(() => {
    sseClients.forEach((client, id) => {
      try {
        client.res.write(`: ping\n\n`);
      } catch (err) {
        sseClients.delete(id);
      }
    });
  }, 15000);

  // WebSocket Connection Handler
  wss.on('connection', (ws: any, req) => {
    const ip = req.socket.remoteAddress || 'unknown';
    console.log(`[StoreSync WS] Client connected (Total WS: ${wss.clients.size}) from ${ip}`);

    // Immediately send full current state to newly connected client
    ws.send(JSON.stringify({
      type: 'INIT_STATE',
      version: serverStore.version,
      lastUpdated: serverStore.lastUpdated,
      connectedDevices: getConnectedDeviceCount(),
      state: serverStore.state,
    }));

    broadcastPresence();

    ws.on('message', (messageRaw: string) => {
      try {
        const msg = JSON.parse(messageRaw.toString());

        if (msg.type === 'IDENTIFY') {
          ws.clientId = msg.clientId;
          return;
        }

        if (msg.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
          return;
        }

        if (msg.type === 'TEST_PING') {
          const { clientId, message } = msg;
          console.log(`[StoreSync WS] Test ping from ${clientId || 'unknown'}`);
          broadcastAll({
            type: 'TEST_SYNC_PING',
            sourceClientId: clientId,
            message: message || 'Real-time test ping successful',
            timestamp: new Date().toISOString(),
          }, { excludeWs: ws });
          return;
        }

        if (msg.type === 'MUTATION') {
          // Delta collection update (e.g. products, orders, posSales)
          let { collection, data, clientId, action, mutationId } = msg;
          if (clientId) ws.clientId = clientId;

          if (mutationId && recordMutationId(mutationId)) {
            // Already processed this mutation (e.g. sent via WS & HTTP simultaneously)
            return;
          }

          if (collection && data !== undefined) {
            if (collection === 'categories') {
              data = sanitizeServerCategories(data);
            }
            serverStore.version += 1;
            serverStore.lastUpdated = new Date().toISOString();
            serverStore.state[collection] = data;

            // When a new snapshot arrives, unpack its payload data to keep serverStore 100% in sync
            if (collection === 'driveSnapshots' && Array.isArray(data) && data[0]?.payload?.data) {
              const snap = data[0];
              saveLatestSnapshotBackup(snap);
              const snapshotData = snap.payload.data;
              for (const [key, val] of Object.entries(snapshotData)) {
                if (Array.isArray(val) && val.length > 0) {
                  serverStore.state[key] = val;
                } else if (val && typeof val === 'object' && Object.keys(val).length > 0) {
                  serverStore.state[key] = { ...serverStore.state[key], ...val };
                }
              }
              console.log(`[StoreSync WS] Auto-restored master server state from snapshot "${snap.name}" (${snap.id})`);
            }

            if (collection === 'products') {
              try {
                fs.writeFileSync(STATE_FILE, JSON.stringify(serverStore, null, 2), 'utf-8');
              } catch (err) {
                console.error('[StoreSync WS] Failed to write products state to file:', err);
              }
            } else {
              savePersistedState();
            }

            console.log(`[StoreSync WS] Mutation on "${collection}" by ${clientId || 'anon'} -> v${serverStore.version}`);

            // Broadcast mutation delta to ALL other connected devices (SSE + WS)
            broadcastAll({
              type: 'STATE_MUTATION',
              collection,
              data,
              version: serverStore.version,
              lastUpdated: serverStore.lastUpdated,
              sourceClientId: clientId,
              action: action || 'UPDATE',
            }, { excludeWs: ws, excludeClientId: clientId });
          }
          return;
        }

        if (msg.type === 'FULL_SYNC') {
          // Full state sync from a client
          const { state, clientId } = msg;
          if (clientId) ws.clientId = clientId;

          if (state && typeof state === 'object') {
            if (Array.isArray(state.categories)) {
              state.categories = sanitizeServerCategories(state.categories);
            }
            serverStore.version += 1;
            serverStore.lastUpdated = new Date().toISOString();
            serverStore.state = {
              ...serverStore.state,
              ...state,
            };
            savePersistedState();

            console.log(`[StoreSync WS] Full state sync by ${clientId || 'anon'} -> v${serverStore.version}`);

            broadcastAll({
              type: 'FULL_STATE_SYNC',
              version: serverStore.version,
              lastUpdated: serverStore.lastUpdated,
              sourceClientId: clientId,
              state: serverStore.state,
            }, { excludeWs: ws, excludeClientId: clientId });
          }
          return;
        }
      } catch (err) {
        console.error('[StoreSync WS] Error processing message:', err);
      }
    });

    ws.on('close', () => {
      console.log(`[StoreSync WS] Client disconnected (Remaining WS: ${wss.clients.size})`);
      broadcastPresence();
    });

    ws.on('error', (err: any) => {
      console.warn('[StoreSync WS] Socket error:', err.message);
    });
  });

  // REST & SSE API Endpoints for Multi-Device Real-Time Sync

  // 1. SSE Real-Time Stream (Works across all mobile & desktop browsers through Cloud Run proxy)
  app.get('/api/sync/events', (req, res) => {
    const clientId = (req.query.clientId as string) || `sse-${Math.random().toString(36).substring(2, 9)}`;
    const deviceType = (req.query.device as string) || 'unknown';
    const clientKey = `${clientId}-${Date.now()}`;
    const ip = req.socket.remoteAddress || 'unknown';

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx proxy buffering
    res.flushHeaders?.();

    const clientObj: SseClient = {
      id: clientKey,
      clientId,
      deviceType,
      res,
      ip,
      connectedAt: new Date().toISOString(),
    };
    sseClients.set(clientKey, clientObj);

    console.log(`[StoreSync SSE] New stream opened: ${clientId} (${deviceType}) - Total SSE: ${sseClients.size}`);

    // Immediately push current initial state to client
    const initPayload = JSON.stringify({
      type: 'INIT_STATE',
      version: serverStore.version,
      lastUpdated: serverStore.lastUpdated,
      connectedDevices: getConnectedDeviceCount(),
      state: serverStore.state,
    });
    res.write(`data: ${initPayload}\n\n`);

    broadcastPresence();

    req.on('close', () => {
      sseClients.delete(clientKey);
      console.log(`[StoreSync SSE] Stream closed: ${clientId} (Remaining SSE: ${sseClients.size})`);
      broadcastPresence();
    });
  });

  // 2. Ultra-Lightweight Version Check (Used for sub-second adaptive polling)
  app.get('/api/sync/version', (req, res) => {
    res.json({
      version: serverStore.version,
      lastUpdated: serverStore.lastUpdated,
      connectedDevices: getConnectedDeviceCount(),
    });
  });

  // 3. Health & Sync Status
  app.get('/api/sync/health', (req, res) => {
    res.json({
      status: 'ok',
      version: serverStore.version,
      lastUpdated: serverStore.lastUpdated,
      connectedDevices: getConnectedDeviceCount(),
      wsClients: wss.clients.size,
      sseClients: sseClients.size,
      uptime: process.uptime(),
    });
  });

  // 4. GET Full Server State (for instant boot, reconnection catch-up, and manual sync)
  app.get('/api/sync/state', (req, res) => {
    res.json({
      version: serverStore.version,
      lastUpdated: serverStore.lastUpdated,
      connectedDevices: getConnectedDeviceCount(),
      state: serverStore.state,
    });
  });

  // 5. POST Mutation (HTTP endpoint for changes - broadcasts to ALL SSE and WS clients)
  app.post('/api/sync/mutate', (req, res) => {
    let { collection, data, clientId, action, mutationId } = req.body;
    if (!collection || data === undefined) {
      return res.status(400).json({ error: 'Missing collection or data' });
    }

    if (mutationId && recordMutationId(mutationId)) {
      // Idempotent: mutation was already recorded (e.g. from WebSocket)
      return res.json({
        success: true,
        version: serverStore.version,
        lastUpdated: serverStore.lastUpdated,
        connectedDevices: getConnectedDeviceCount(),
      });
    }

    if (collection === 'categories') {
      data = sanitizeServerCategories(data);
    }

    serverStore.version += 1;
    serverStore.lastUpdated = new Date().toISOString();
    serverStore.state[collection] = data;

    // When a snapshot is posted, auto-restore all collections into serverStore.state immediately
    if (collection === 'driveSnapshots' && Array.isArray(data) && data[0]?.payload?.data) {
      const snap = data[0];
      saveLatestSnapshotBackup(snap);
      const snapshotData = snap.payload.data;
      for (const [key, val] of Object.entries(snapshotData)) {
        if (Array.isArray(val) && val.length > 0) {
          serverStore.state[key] = val;
        } else if (val && typeof val === 'object' && Object.keys(val).length > 0) {
          serverStore.state[key] = { ...serverStore.state[key], ...val };
        }
      }
      console.log(`[StoreSync HTTP] Ingested & auto-restored master server state from snapshot "${snap.name}"`);
    }

    if (collection === 'products') {
      try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(serverStore, null, 2), 'utf-8');
      } catch (err) {
        console.error('[StoreSync HTTP] Failed to immediately write products state to file:', err);
      }
    } else {
      savePersistedState();
    }

    console.log(`[StoreSync HTTP] Mutated "${collection}" by ${clientId || 'anon'} -> v${serverStore.version}`);

    // Broadcast change to all connected SSE clients and WebSockets immediately
    broadcastAll({
      type: 'STATE_MUTATION',
      collection,
      data,
      version: serverStore.version,
      lastUpdated: serverStore.lastUpdated,
      sourceClientId: clientId,
      action: action || 'UPDATE',
    }, { excludeClientId: clientId });

    res.json({
      success: true,
      version: serverStore.version,
      lastUpdated: serverStore.lastUpdated,
      connectedDevices: getConnectedDeviceCount(),
    });
  });

  // 5.1 Test Ping Endpoint (Sends live ping across all connected devices)
  app.post('/api/sync/ping', (req, res) => {
    const { clientId, message } = req.body;
    console.log(`[StoreSync HTTP] Ping received from ${clientId || 'anon'}`);
    broadcastAll({
      type: 'TEST_SYNC_PING',
      sourceClientId: clientId,
      message: message || 'Live multi-device test ping',
      timestamp: new Date().toISOString(),
    }, { excludeClientId: clientId });

    res.json({
      success: true,
      connectedDevices: getConnectedDeviceCount(),
      version: serverStore.version,
      timestamp: new Date().toISOString(),
    });
  });

  // 5.2 Latest Snapshot Endpoint (Provides newest snapshot payload for instant zero-click client restore)
  app.get('/api/sync/latest-snapshot', (req, res) => {
    const snaps = serverStore.state.driveSnapshots;
    const latest = Array.isArray(snaps) && snaps.length > 0 ? snaps[0] : null;
    res.json({
      success: true,
      snapshot: latest,
      version: serverStore.version,
      lastUpdated: serverStore.lastUpdated,
    });
  });

  // 5.3 Force Zero-Click Auto-Restore from Latest Snapshot across all devices
  app.post('/api/sync/auto-restore-snapshot', (req, res) => {
    const snaps = serverStore.state.driveSnapshots;
    const latest = Array.isArray(snaps) && snaps.length > 0 ? snaps[0] : null;
    if (!latest || !latest.payload?.data) {
      return res.status(404).json({ success: false, error: 'No snapshot with valid data available' });
    }

    const snapshotData = latest.payload.data;
    for (const [key, val] of Object.entries(snapshotData)) {
      if (Array.isArray(val)) {
        serverStore.state[key] = val;
      } else if (val && typeof val === 'object') {
        serverStore.state[key] = { ...serverStore.state[key], ...val };
      }
    }

    serverStore.version += 1;
    serverStore.lastUpdated = new Date().toISOString();
    savePersistedState();
    saveLatestSnapshotBackup(latest);

    broadcastAll({
      type: 'FULL_STATE_SYNC',
      version: serverStore.version,
      lastUpdated: serverStore.lastUpdated,
      sourceClientId: req.body?.clientId || 'auto-restore-trigger',
      state: serverStore.state,
    });

    console.log(`[StoreSync HTTP] Auto-restore broadcasted to all connected devices from snapshot "${latest.name}"`);

    res.json({
      success: true,
      message: `Successfully auto-restored state from snapshot "${latest.name}"`,
      version: serverStore.version,
      lastUpdated: serverStore.lastUpdated,
      state: serverStore.state,
    });
  });

  // 6. POST Full State (HTTP endpoint for full backup restore)
  app.post('/api/sync/state', (req, res) => {
    const { state, clientId } = req.body;
    if (!state || typeof state !== 'object') {
      return res.status(400).json({ error: 'Missing or invalid state object' });
    }

    if (Array.isArray(state.categories)) {
      state.categories = sanitizeServerCategories(state.categories);
    }

    if (Array.isArray(state.driveSnapshots) && state.driveSnapshots[0]?.payload) {
      saveLatestSnapshotBackup(state.driveSnapshots[0]);
    }

    serverStore.version += 1;
    serverStore.lastUpdated = new Date().toISOString();
    serverStore.state = {
      ...serverStore.state,
      ...state,
    };
    savePersistedState();

    console.log(`[StoreSync HTTP] Full state updated by ${clientId || 'anon'} -> v${serverStore.version}`);

    broadcastAll({
      type: 'FULL_STATE_SYNC',
      version: serverStore.version,
      lastUpdated: serverStore.lastUpdated,
      sourceClientId: clientId,
      state: serverStore.state,
    }, { excludeClientId: clientId });

    res.json({
      success: true,
      version: serverStore.version,
      lastUpdated: serverStore.lastUpdated,
      connectedDevices: getConnectedDeviceCount(),
    });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Chan Online Shop Server running on http://0.0.0.0:${PORT} with WebSocket & Real-Time Sync`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
