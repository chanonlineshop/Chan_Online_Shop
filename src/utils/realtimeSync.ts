import { safeStorage } from './safeStorage';

export type SyncStatus = 'CONNECTED' | 'CONNECTING' | 'POLLING' | 'OFFLINE' | 'SYNCED';

export interface SyncMessage {
  type: 'INIT_STATE' | 'STATE_MUTATION' | 'FULL_STATE_SYNC' | 'PRESENCE_UPDATE' | 'PONG' | 'TEST_SYNC_PING';
  collection?: string;
  data?: any;
  state?: Record<string, any>;
  version?: number;
  lastUpdated?: string;
  sourceClientId?: string;
  connectedDevices?: number;
  action?: string;
  mutationId?: string;
  message?: string;
  timestamp?: number | string;
}

export interface RealtimeSyncCallbacks {
  onInitState: (state: Record<string, any>, version: number, devices: number) => void;
  onMutation: (collection: string, data: any, version: number, sourceClientId?: string) => void;
  onFullSync: (state: Record<string, any>, version: number, sourceClientId?: string) => void;
  onPresenceUpdate: (devices: number, version: number) => void;
  onStatusChange: (status: SyncStatus, details?: string) => void;
  onTestPing?: (sourceClientId: string, message: string) => void;
}

const CLIENT_ID_KEY = 'chan_shop_realtime_client_id_v2';

// Generate or retrieve unique device client ID
export function getOrCreateClientId(): string {
  try {
    const existing = safeStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
  } catch (e) {
    // ignore
  }

  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const prefix = isMobile ? 'mob' : 'pc';
  const newId = `${prefix}-${Math.random().toString(36).substring(2, 9)}-${Date.now().toString(36)}`;
  
  try {
    safeStorage.setItem(CLIENT_ID_KEY, newId);
  } catch (e) {
    // ignore
  }
  return newId;
}

export class RealtimeSyncManager {
  private ws: WebSocket | null = null;
  private sse: EventSource | null = null;
  private clientId: string;
  private callbacks: RealtimeSyncCallbacks | null = null;
  private reconnectTimer: any = null;
  private sseReconnectTimer: any = null;
  private heartbeatTimer: any = null;
  private pollingTimer: any = null;
  private isDestroyed = false;
  private reconnectAttempts = 0;
  private sseReconnectAttempts = 0;
  private currentVersion = 0;
  private isWsConnected = false;
  private isSseConnected = false;
  private lastVersionCheckTime = 0;
  public status: SyncStatus = 'CONNECTING';
  public connectedDevices = 1;

  constructor() {
    this.clientId = getOrCreateClientId();
  }

  public getClientId(): string {
    return this.clientId;
  }

  public getCurrentVersion(): number {
    return this.currentVersion;
  }

  public init(callbacks: RealtimeSyncCallbacks) {
    this.callbacks = callbacks;
    this.isDestroyed = false;

    // 1. Immediately fetch latest server state via HTTP for instant zero-lag boot
    this.fetchInitialState();

    // 2. Connect to Server-Sent Events (SSE) stream (works 100% across Cloud Run, mobile, & iframes)
    this.connectSSE();

    // 3. Connect to WebSocket in parallel
    this.connectWebSocket();

    // 4. Setup smart adaptive polling and instant wakeup handlers
    this.setupAdaptivePollingAndWakeupHandlers();
  }

  // Fetch full server state immediately on startup
  private async fetchInitialState() {
    try {
      const res = await fetch('/api/sync/state');
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.state && typeof data.version === 'number') {
        if (data.version >= this.currentVersion) {
          this.currentVersion = data.version;
          if (typeof data.connectedDevices === 'number') {
            this.connectedDevices = data.connectedDevices;
          }
          this.callbacks?.onInitState(data.state, data.version, this.connectedDevices);
        }
      }
    } catch (err) {
      console.warn('[RealtimeSync] Initial HTTP state fetch failed:', err);
    }
  }

  // Connect to Server-Sent Events (SSE) stream
  private connectSSE() {
    if (this.isDestroyed) return;
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    if (this.sse) {
      try {
        this.sse.close();
      } catch (e) {}
      this.sse = null;
    }

    try {
      const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      const sseUrl = `/api/sync/events?clientId=${encodeURIComponent(this.clientId)}&device=${isMobile ? 'phone' : 'pc'}`;
      this.sse = new EventSource(sseUrl);

      this.sse.onopen = () => {
        this.isSseConnected = true;
        this.sseReconnectAttempts = 0;
        this.updateOverallStatus();
      };

      this.sse.onmessage = (event) => {
        try {
          if (!event.data || event.data.trim() === '') return;
          const msg: SyncMessage = JSON.parse(event.data);
          this.handleIncomingMessage(msg, 'SSE');
        } catch (err) {
          console.warn('[RealtimeSync SSE] Error parsing message:', err);
        }
      };

      this.sse.onerror = () => {
        this.isSseConnected = false;
        this.updateOverallStatus();
        if (this.sse) {
          try {
            this.sse.close();
          } catch (e) {}
          this.sse = null;
        }
        this.scheduleSseReconnect();
      };
    } catch (err) {
      console.warn('[RealtimeSync] Failed to initialize SSE:', err);
      this.scheduleSseReconnect();
    }
  }

  private scheduleSseReconnect() {
    if (this.isDestroyed || this.sseReconnectTimer) return;
    this.sseReconnectAttempts += 1;
    const delay = Math.min(1000 * Math.pow(1.3, this.sseReconnectAttempts), 5000);
    this.sseReconnectTimer = setTimeout(() => {
      this.sseReconnectTimer = null;
      if (!this.isDestroyed && !this.isSseConnected) {
        this.connectSSE();
      }
    }, delay);
  }

  private getWebSocketUrl(): string {
    if (typeof window === 'undefined') return '';
    const loc = window.location;
    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${loc.host}/ws`;
  }

  private connectWebSocket() {
    if (this.isDestroyed) return;
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') return;

    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }

    try {
      const url = this.getWebSocketUrl();
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isWsConnected = true;
        this.reconnectAttempts = 0;
        this.updateOverallStatus();
        this.startHeartbeat();

        // Identify self to the WebSocket server
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'IDENTIFY',
            clientId: this.clientId,
          }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: SyncMessage = JSON.parse(event.data);
          this.handleIncomingMessage(msg, 'WS');
        } catch (err) {
          console.warn('[RealtimeSync WS] Could not parse message:', err);
        }
      };

      this.ws.onclose = () => {
        this.isWsConnected = false;
        this.stopHeartbeat();
        this.updateOverallStatus();
        if (!this.isDestroyed) {
          this.scheduleWsReconnect();
        }
      };

      this.ws.onerror = () => {
        this.isWsConnected = false;
        if (this.ws) {
          try {
            this.ws.close();
          } catch (e) {}
        }
      };
    } catch (err) {
      this.isWsConnected = false;
      this.updateOverallStatus();
      this.scheduleWsReconnect();
    }
  }

  private updateOverallStatus() {
    if (this.isWsConnected || this.isSseConnected) {
      this.setStatus('CONNECTED', this.isWsConnected ? 'Connected via WebSocket' : 'Connected via Real-Time SSE');
    } else {
      this.setStatus('POLLING', 'Connecting / Polling Active');
    }
  }

  private handleIncomingMessage(msg: SyncMessage, sourceChannel: 'WS' | 'SSE') {
    if (typeof msg.connectedDevices === 'number') {
      this.connectedDevices = msg.connectedDevices;
    }

    switch (msg.type) {
      case 'INIT_STATE':
        if (msg.version && msg.version >= this.currentVersion) {
          this.currentVersion = msg.version;
        }
        if (msg.state) {
          this.callbacks?.onInitState(msg.state, msg.version || this.currentVersion, this.connectedDevices);
        }
        break;

      case 'STATE_MUTATION':
        // Only apply if mutation originated from another device
        if (msg.sourceClientId !== this.clientId && msg.collection && msg.data !== undefined) {
          if (msg.version && msg.version > this.currentVersion) {
            this.currentVersion = msg.version;
          }
          console.log(`[RealtimeSync] Received mutation on "${msg.collection}" from ${msg.sourceClientId || 'unknown'} (via ${sourceChannel})`);
          this.callbacks?.onMutation(msg.collection, msg.data, msg.version || this.currentVersion, msg.sourceClientId);
        }
        break;

      case 'FULL_STATE_SYNC':
        if (msg.sourceClientId !== this.clientId && msg.state) {
          if (msg.version && msg.version > this.currentVersion) {
            this.currentVersion = msg.version;
          }
          console.log(`[RealtimeSync] Received full sync from ${msg.sourceClientId || 'unknown'} (via ${sourceChannel})`);
          this.callbacks?.onFullSync(msg.state, msg.version || this.currentVersion, msg.sourceClientId);
        }
        break;

      case 'PRESENCE_UPDATE':
        if (typeof msg.connectedDevices === 'number') {
          this.connectedDevices = msg.connectedDevices;
          this.callbacks?.onPresenceUpdate(msg.connectedDevices, msg.version || this.currentVersion);
        }
        break;

      case 'TEST_SYNC_PING':
        if (msg.sourceClientId !== this.clientId) {
          console.log(`[RealtimeSync] Test ping received from ${msg.sourceClientId || 'remote device'}`);
          this.callbacks?.onTestPing?.(msg.sourceClientId || 'another device', msg.message || 'Real-time test ping');
        }
        break;

      case 'PONG':
        // Heartbeat ACK
        break;
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING', clientId: this.clientId }));
      }
    }, 20000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleWsReconnect() {
    if (this.reconnectTimer || this.isDestroyed) return;
    this.reconnectAttempts += 1;
    const delay = Math.min(1000 * Math.pow(1.4, this.reconnectAttempts), 6000);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isDestroyed && !this.isWsConnected) {
        this.connectWebSocket();
      }
    }, delay);
  }

  // Setup smart adaptive polling and instant wakeup handlers
  private setupAdaptivePollingAndWakeupHandlers() {
    if (typeof window === 'undefined') return;

    // Fast adaptive version polling: every 1500ms when page is visible for sub-second synchronization
    this.pollingTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.checkServerVersionAndCatchUp();
      }
    }, 1500);

    // Instant Wakeup Triggers
    const triggerInstantCheck = () => {
      this.checkServerVersionAndCatchUp();
      // If streams are disconnected, attempt reconnect immediately
      if (!this.isSseConnected) this.connectSSE();
      if (!this.isWsConnected) this.connectWebSocket();
    };

    // 1. Visibility change (critical when user unlocks phone or switches tabs)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        triggerInstantCheck();
      }
    });

    // 2. Window focus
    window.addEventListener('focus', triggerInstantCheck);

    // 3. Network online event
    window.addEventListener('online', triggerInstantCheck);

    // 4. Touch/Click throttle check: if user interacts and last check was > 2s ago, check version
    const onUserInteraction = () => {
      const now = Date.now();
      if (now - this.lastVersionCheckTime > 2000) {
        this.checkServerVersionAndCatchUp();
      }
    };
    window.addEventListener('pointerdown', onUserInteraction, { passive: true });
    window.addEventListener('touchstart', onUserInteraction, { passive: true });
  }

  // Check version endpoint (~60 bytes); if server version has advanced, fetch full state
  public async checkServerVersionAndCatchUp(): Promise<boolean> {
    this.lastVersionCheckTime = Date.now();
    try {
      const res = await fetch('/api/sync/version');
      if (!res.ok) return false;
      const data = await res.json();

      if (data && typeof data.version === 'number') {
        if (typeof data.connectedDevices === 'number' && data.connectedDevices !== this.connectedDevices) {
          this.connectedDevices = data.connectedDevices;
          this.callbacks?.onPresenceUpdate(data.connectedDevices, data.version);
        }

        // If server has a newer version than we have locally, fetch state and sync immediately!
        if (data.version > this.currentVersion) {
          console.log(`[RealtimeSync] Newer server v${data.version} detected (local was v${this.currentVersion}). Pulling delta...`);
          return await this.pollLatestState(true);
        }
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  // HTTP state fetch catch-up
  public async pollLatestState(force = false): Promise<boolean> {
    try {
      const res = await fetch('/api/sync/state');
      if (!res.ok) return false;
      const data = await res.json();

      if (data && typeof data.version === 'number') {
        if (typeof data.connectedDevices === 'number') {
          this.connectedDevices = data.connectedDevices;
          this.callbacks?.onPresenceUpdate(data.connectedDevices, data.version);
        }

        if ((force || data.version > this.currentVersion) && data.state) {
          console.log(`[RealtimeSync] Full sync applied from server v${data.version} (local was v${this.currentVersion})`);
          this.currentVersion = data.version;
          this.callbacks?.onFullSync(data.state, data.version);
          return true;
        }
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  // Push single collection mutation (e.g. products, orders, posSales)
  public sendMutation(collection: string, data: any, action = 'UPDATE') {
    const mutationId = `mut-${this.clientId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const payload = {
      type: 'MUTATION',
      clientId: this.clientId,
      mutationId,
      collection,
      data,
      action,
      timestamp: Date.now(),
    };

    // Optimistically advance local version tracking
    this.currentVersion += 1;

    // Send via WebSocket if open
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(payload));
      } catch (err) {
        console.warn('[RealtimeSync] WS send error:', err);
      }
    }

    // Always send via HTTP POST to ensure delivery & trigger SSE broadcast (server deduplicates by mutationId)
    try {
      fetch('/api/sync/mutate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          if (res.ok) {
            const json = await res.json();
            if (json && json.version && json.version > this.currentVersion) {
              this.currentVersion = json.version;
            }
          }
        })
        .catch((err) => {
          console.warn('[RealtimeSync] HTTP mutation sync error:', err);
        });
    } catch (err) {
      console.warn('[RealtimeSync] Fetch dispatch failed:', err);
    }
  }

  // Dispatch a real-time test ping across all connected devices
  public sendTestPing(message = 'Real-time test ping from device') {
    const payload = {
      type: 'TEST_PING',
      clientId: this.clientId,
      message,
      timestamp: Date.now(),
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(payload));
      } catch (err) {
        // ignore
      }
    }

    fetch('/api/sync/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }

  // Push full state (on manual backup restore or initial push)
  public sendFullSync(state: Record<string, any>) {
    const payload = {
      type: 'FULL_SYNC',
      clientId: this.clientId,
      state,
      timestamp: Date.now(),
    };

    this.currentVersion += 1;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(payload));
      } catch (err) {
        console.warn('[RealtimeSync] WS full sync error:', err);
      }
    }

    fetch('/api/sync/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then(async (res) => {
        if (res.ok) {
          const json = await res.json();
          if (json && json.version && json.version > this.currentVersion) {
            this.currentVersion = json.version;
          }
        }
      })
      .catch((err) => {
        console.warn('[RealtimeSync] HTTP full sync error:', err);
      });
  }

  public setStatus(status: SyncStatus, details?: string) {
    this.status = status;
    this.callbacks?.onStatusChange(status, details);
  }

  public destroy() {
    this.isDestroyed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.sseReconnectTimer) clearTimeout(this.sseReconnectTimer);
    if (this.pollingTimer) clearInterval(this.pollingTimer);

    if (this.sse) {
      try {
        this.sse.close();
      } catch (e) {}
      this.sse = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
  }
}

export const realtimeSyncManager = new RealtimeSyncManager();
