// Safe localStorage wrapper with IndexedDB secondary persistence and memory fallback
// Completely prevents DOMException / QuotaExceededError / SecurityError from throwing in sandboxed iframes or private modes

const memoryStore = new Map<string, string>();

const DB_NAME = 'chan_shop_persistence_db_v1';
const STORE_NAME = 'app_key_value_store';

let dbInstance: IDBDatabase | null = null;
let isDbReady = false;

// Initialize IndexedDB in background
if (typeof window !== 'undefined' && 'indexedDB' in window) {
  try {
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e: any) => {
      dbInstance = e.target.result;
      isDbReady = true;
      // Preload keys from IndexedDB into memoryStore to guarantee zero data loss
      try {
        const tx = dbInstance!.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const getAllReq = store.openCursor();
        getAllReq.onsuccess = (event: any) => {
          const cursor = event.target.result;
          if (cursor) {
            const k = cursor.key as string;
            const v = cursor.value as string;
            if (!memoryStore.has(k)) {
              memoryStore.set(k, v);
            }
            try {
              if (typeof window !== 'undefined' && window.localStorage && !window.localStorage.getItem(k)) {
                window.localStorage.setItem(k, v);
              }
            } catch {}
            cursor.continue();
          }
        };
      } catch {
        // ignore
      }
    };
    request.onerror = () => {
      isDbReady = false;
    };
  } catch {
    // IndexedDB blocked
  }
}

const writeToIndexedDB = (key: string, value: string) => {
  if (!dbInstance || !isDbReady) return;
  try {
    const tx = dbInstance.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
  } catch {
    // ignore
  }
};

const deleteFromIndexedDB = (key: string) => {
  if (!dbInstance || !isDbReady) return;
  try {
    const tx = dbInstance.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
  } catch {
    // ignore
  }
};

const clearIndexedDB = () => {
  if (!dbInstance || !isDbReady) return;
  try {
    const tx = dbInstance.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  } catch {
    // ignore
  }
};

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {
      // Storage access blocked or restricted
    }
    return memoryStore.get(key) ?? null;
  },

  setItem: (key: string, value: string): boolean => {
    memoryStore.set(key, value);
    writeToIndexedDB(key, value);

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return true;
      }
    } catch (e) {
      console.warn(`[SafeStorage] Could not persist key "${key}" to localStorage, attempting quota recovery:`, e);
      // Attempt quota recovery: prune large non-critical cache entries like old snapshots or heavy logs
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem('chan_shop_drive_snapshots_v3');
          window.localStorage.removeItem('chan_shop_logs_v3');
          window.localStorage.setItem(key, value);
          return true;
        }
      } catch {
        // Memory and IndexedDB will still safeguard the data
      }
    }
    return false;
  },

  removeItem: (key: string): void => {
    memoryStore.delete(key);
    deleteFromIndexedDB(key);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }
  },

  clear: (): void => {
    memoryStore.clear();
    clearIndexedDB();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch {
      // Ignore
    }
  }
};
