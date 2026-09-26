import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Product, 
  CartItem, 
  Order, 
  InventoryLog, 
  ShopSettings, 
  ProductCategory,
  DEFAULT_CATEGORIES,
  PurchaseRecord,
  StockOutRecord,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  FulfillmentStatus,
  AppUser,
  UserRole,
  UserPermissions,
  POSSale,
  DeliveryCourier,
  DeliveryTracking,
  DeliveryStage,
  DriveSnapshot,
  SystemBackupPayload,
  ActiveViewType,
  ThemeMode,
} from '../types';
import { INITIAL_PRODUCTS, INITIAL_SHOP_SETTINGS, INITIAL_PURCHASES, INITIAL_STOCK_OUTS, INITIAL_PURCHASE_ORDERS } from '../data/initialProducts';
import { INITIAL_ORDERS } from '../data/initialOrders';
import { INITIAL_USERS, ROLE_PERMISSIONS } from '../data/initialUsers';
import { INITIAL_COURIERS, INITIAL_DELIVERY_TRACKINGS } from '../data/initialCouriers';
import { safeStorage } from '../utils/safeStorage';
import { realtimeSyncManager, SyncStatus } from '../utils/realtimeSync';

interface StoreContextType {
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  inventoryLogs: InventoryLog[];
  settings: ShopSettings;
  activeView: ActiveViewType;
  setActiveView: (view: ActiveViewType) => void;
  selectedCategory: ProductCategory;
  setSelectedCategory: (category: ProductCategory) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Category Management
  categories: string[];
  addCategory: (categoryName: string) => boolean;
  deleteCategory: (categoryName: string) => void;

  // Barcode / SKU Product Lookup
  findProductByBarcodeOrSku: (query: string) => Product | undefined;

  // Purchase and Stock In / Out Accounting
  purchaseOrders: PurchaseOrder[];
  purchases: PurchaseRecord[];
  stockOuts: StockOutRecord[];
  createPurchaseOrder: (poData: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt'>) => PurchaseOrder;
  updatePurchaseOrderStatus: (poId: string, status: PurchaseOrderStatus) => void;
  receivePurchaseOrder: (poId: string, receivedItems?: { productId: string; quantityReceived: number }[]) => { success: boolean; message: string };
  deletePurchaseOrder: (poId: string) => void;
  addPurchase: (purchaseData: Omit<PurchaseRecord, 'id' | 'createdAt'>) => PurchaseRecord;
  deletePurchase: (purchaseId: string) => void;
  addStockOut: (stockOutData: Omit<StockOutRecord, 'id' | 'createdAt'>) => StockOutRecord;
  deleteStockOut: (stockOutId: string) => void;
  clearPurchases: () => void;
  clearStockOuts: () => void;
  clearSalesIncome: () => void;
  clearAllAccountingRecords: () => void;
  
  // Cart Actions & Discount Adjustment
  addToCart: (product: Product, quantity?: number) => { success: boolean; message: string };
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  cartDiscountType: 'percent' | 'fixed';
  cartDiscountValue: number;
  cartDiscountAmount: number;
  setCartDiscount: (value: number, type?: 'percent' | 'fixed') => void;
  clearCartDiscount: () => void;
  
  // Inventory Management Actions
  addProduct: (productData: Omit<Product, 'id' | 'createdAt'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (productId: string, delta: number, note?: string) => void;
  resetToDefaults: () => void;
  
  // Order Actions
  placeOrder: (
    customer: Order['customer'],
    paymentMethod: Order['paymentMethod'],
    paymentGatewayProvider: string,
    discountAmount?: number
  ) => Promise<Order>;
  updateOrderStatus: (orderId: string, fulfillmentStatus: FulfillmentStatus, trackingNumber?: string) => void;
  updateOrderDiscount: (orderId: string, discountAmount: number) => void;
  deleteOrder: (orderId: string) => void;
  seedSampleOrders: () => void;
  
  // Settings Actions
  updateSettings: (updates: Partial<ShopSettings>) => void;
  
  // Theme & Appearance (Light / Dark Mode)
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  
  // User Management & RBAC
  users: AppUser[];
  currentUser: AppUser;
  setCurrentUser: (user: AppUser) => void;
  addUser: (userData: Omit<AppUser, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, updates: Partial<AppUser>) => void;
  deleteUser: (id: string) => boolean;
  userPermissions: UserPermissions;
  rolePermissions: Record<UserRole, UserPermissions>;
  updateRolePermissions: (role: UserRole, permissions: Partial<UserPermissions>) => void;
  resetRolePermissions: () => void;
  
  // POS System
  posSales: POSSale[];
  completePOSSale: (saleData: Omit<POSSale, 'id' | 'receiptNumber' | 'date'>) => POSSale;
  
  // Live Delivery Tracking & Couriers Fleet
  couriers: DeliveryCourier[];
  addCourier: (courierData: Omit<DeliveryCourier, 'id'>) => DeliveryCourier;
  updateCourier: (id: string, updates: Partial<DeliveryCourier>) => void;
  deleteCourier: (id: string) => void;
  deliveryTrackings: DeliveryTracking[];
  activeDeliveryOrder: DeliveryTracking | null;
  setActiveDeliveryOrder: (tracking: DeliveryTracking | null) => void;
  updateDeliveryStatus: (orderId: string, stage: DeliveryStage, progressPercent?: number) => void;
  dispatchOrderDelivery: (orderId: string, courier?: DeliveryCourier | string) => DeliveryTracking;
  createQuickDelivery: (deliveryData: {
    customerName?: string;
    customerPhone?: string;
    destinationAddress?: string;
    destinationDistrict?: string;
    courierId?: string;
    courierName?: string;
    orderId?: string;
  }) => DeliveryTracking;
  
  // Drive Sync & Backup / Restore
  driveSnapshots: DriveSnapshot[];
  syncToGoogleDrive: (syncType?: 'MANUAL' | 'AUTO_MINUTE' | 'AUTO_ON_UPDATE') => Promise<{ success: boolean; snapshot: DriveSnapshot }>;
  restoreFromSnapshot: (snapshotId: string) => { success: boolean; message: string; details?: any };
  deleteDriveSnapshot: (snapshotId: string) => void;
  exportBackupJSON: () => string;
  restoreFromBackupJSON: (jsonString: string) => { success: boolean; message: string; details?: any };
  
  // 1-Minute & Real-Time Auto-Sync with Google Drive
  nextSyncCountdown: number;
  isAutoSyncing: boolean;
  autoSyncStatus: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR';
  lastAutoSyncTime: string | null;
  autoSyncSuccessNotification: string | null;
  dismissAutoSyncNotification: () => void;
  toggleAutoSync: (enabled?: boolean) => void;
  toggleAutoSyncOnUpdate: (enabled?: boolean) => void;
  setAutoSyncInterval: (seconds: number) => void;
  setGoogleDriveEmail: (email: string) => void;

  // Zero-Click Automatic Restore across Devices (Instant sync without pressing anything)
  autoRestoreOnUpdate: boolean;
  autoRestoreOnLaunch: boolean;
  toggleAutoRestoreOnUpdate: (enabled?: boolean) => void;
  toggleAutoRestoreOnLaunch: (enabled?: boolean) => void;
  lastAutoRestoreTime: string | null;
  lastAutoRestoreSource: string | null;
  triggerZeroClickAutoRestore: () => Promise<boolean>;

  // Offline Simulation & Network Outage Continuity
  isOffline: boolean;
  setIsOffline: (offline: boolean) => void;
  toggleOfflineSimulation: (forced?: boolean) => void;
  pendingOfflineSalesCount: number;
  syncOfflineQueue: () => Promise<{ syncedCount: number; success: boolean }>;
  isOfflineModalOpen: boolean;
  setIsOfflineModalOpen: (open: boolean) => void;

  // Real-Time Multi-Device Sync (WebSocket + Polling)
  syncStatus: SyncStatus;
  connectedDevicesCount: number;
  lastSyncTime: string | null;
  syncVersion: number;
  triggerManualSync: () => Promise<boolean>;
  sendTestPing: (message?: string) => void;
  remoteSyncNotification: string | null;
  dismissRemoteSyncNotification: () => void;
  
  // Modal controllers
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  selectedProductForDetail: Product | null;
  setSelectedProductForDetail: (product: Product | null) => void;
  lastPlacedOrder: Order | null;
  setLastPlacedOrder: (order: Order | null) => void;
  lastPOSSale: POSSale | null;
  setLastPOSSale: (sale: POSSale | null) => void;

  // Biometric Fingerprint Scanner Modal
  isBiometricScannerOpen: boolean;
  setIsBiometricScannerOpen: (open: boolean) => void;
  biometricScannerConfig: {
    mode: 'verify' | 'enroll' | 'test';
    title?: string;
    subtitle?: string;
    userName?: string;
    userRole?: string;
    existingKeyId?: string;
    onSuccess?: (keyId: string) => void;
  };
  openBiometricScanner: (config?: {
    mode?: 'verify' | 'enroll' | 'test';
    title?: string;
    subtitle?: string;
    userName?: string;
    userRole?: string;
    existingKeyId?: string;
    onSuccess?: (keyId: string) => void;
  }) => void;
  closeBiometricScanner: () => void;

  // Product Image Display Mode
  productImageFit: 'contain' | 'cover';
  setProductImageFit: (fit: 'contain' | 'cover') => void;
}

const STORAGE_KEYS = {
  PRODUCTS: 'chan_shop_products_v3',
  ORDERS: 'chan_shop_orders_v3',
  LOGS: 'chan_shop_logs_v3',
  INVENTORY_LOGS: 'chan_shop_logs_v3',
  SETTINGS: 'chan_shop_settings_v3',
  CART: 'chan_shop_cart_v3',
  USERS: 'chan_shop_users_v3',
  CURRENT_USER_ID: 'chan_shop_current_user_id_v3',
  POS_SALES: 'chan_shop_pos_sales_v3',
  DELIVERIES: 'chan_shop_deliveries_v3',
  DELIVERY_TRACKINGS: 'chan_shop_deliveries_v3',
  COURIERS: 'chan_shop_couriers_v3',
  DRIVE_SNAPSHOTS: 'chan_shop_drive_snapshots_v3',
  CATEGORIES: 'chan_shop_categories_v3',
  PURCHASES: 'chan_shop_purchases_v3',
  STOCK_OUTS: 'chan_shop_stock_outs_v3',
  PURCHASE_ORDERS: 'chan_shop_purchase_orders_v3',
  OFFLINE_SIMULATION: 'chan_shop_offline_sim_v3',
  THEME: 'chan_shop_theme_v3',
  IMAGE_FIT: 'chan_shop_product_image_fit_v3',
  ROLE_PERMISSIONS: 'chan_shop_role_permissions_v3',
};

export const createLogId = (prefix = 'log'): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const deduplicateLogs = (logs: InventoryLog[]): InventoryLog[] => {
  const seen = new Set<string>();
  const result: InventoryLog[] = [];
  for (let i = 0; i < logs.length; i++) {
    const item = logs[i];
    if (!item) continue;
    let id = item.id;
    if (!id || seen.has(id)) {
      id = `${id || 'log'}-${Math.random().toString(36).substring(2, 8)}-${i}`;
      result.push({ ...item, id });
    } else {
      result.push(item);
    }
    seen.add(id);
  }
  return result;
};

export const sanitizeCategories = (cats: unknown): string[] => {
  if (!Array.isArray(cats)) return DEFAULT_CATEGORIES;
  const cleaned: string[] = [];
  const seen = new Set<string>();

  for (const item of cats) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (trimmed.toLowerCase() === 'all') continue;
    const lower = trimmed.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      cleaned.push(trimmed);
    }
  }

  return cleaned.length > 0 ? cleaned : DEFAULT_CATEGORIES;
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 0. THEME & APPEARANCE (LIGHT / DARK MODE)
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.THEME);
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved as ThemeMode;
      const savedSettings = safeStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed && (parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system')) {
          return parsed.theme;
        }
      }
    } catch (e) {
      console.error('Error initializing theme', e);
    }
    return 'light';
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const resolvedTheme: 'light' | 'dark' = useMemo(() => {
    if (theme === 'system') {
      return systemPrefersDark ? 'dark' : 'light';
    }
    return theme === 'dark' ? 'dark' : 'light';
  }, [theme, systemPrefersDark]);

  // Update CSS Variables, HTML classes, and colorScheme on root document
  useEffect(() => {
    const isDark = resolvedTheme === 'dark';
    const root = document.documentElement;

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    root.setAttribute('data-theme', resolvedTheme);
    root.style.colorScheme = resolvedTheme;

    // Explicitly update application CSS variables on root
    const themeVariables: Record<string, string> = isDark
      ? {
          '--theme-mode': 'dark',
          '--bg-app': '#090d16',
          '--bg-surface': '#0f172a',
          '--bg-card': '#141e33',
          '--bg-subtle': '#1e293b',
          '--bg-muted': '#334155',
          '--bg-input': '#0b0f19',
          '--bg-popover': '#141e33',
          '--bg-dropdown': '#141e33',
          '--text-primary': '#f8fafc',
          '--text-secondary': '#cbd5e1',
          '--text-muted': '#94a3b8',
          '--text-subtle': '#64748b',
          '--text-inverse': '#0f172a',
          '--border-color': '#1e293b',
          '--border-subtle': '#192231',
          '--border-card': '#222f46',
          '--border-input': '#334155',
          '--accent': '#f59e0b',
          '--accent-hover': '#fbbf24',
          '--accent-subtle': 'rgba(245, 158, 11, 0.15)',
          '--accent-foreground': '#ffffff',
          '--header-bg': 'rgba(15, 23, 42, 0.95)',
          '--header-border': '#1e293b',
          '--shadow-card': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
          '--shadow-modal': '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        }
      : {
          '--theme-mode': 'light',
          '--bg-app': '#f8fafc',
          '--bg-surface': '#ffffff',
          '--bg-card': '#ffffff',
          '--bg-subtle': '#f1f5f9',
          '--bg-muted': '#e2e8f0',
          '--bg-input': '#ffffff',
          '--bg-popover': '#ffffff',
          '--bg-dropdown': '#ffffff',
          '--text-primary': '#0f172a',
          '--text-secondary': '#334155',
          '--text-muted': '#64748b',
          '--text-subtle': '#94a3b8',
          '--text-inverse': '#ffffff',
          '--border-color': '#e2e8f0',
          '--border-subtle': '#f1f5f9',
          '--border-card': '#e2e8f0',
          '--border-input': '#cbd5e1',
          '--accent': '#f59e0b',
          '--accent-hover': '#d97706',
          '--accent-subtle': '#fef3c7',
          '--accent-foreground': '#0f172a',
          '--header-bg': 'rgba(255, 255, 255, 0.95)',
          '--header-border': '#e2e8f0',
          '--shadow-card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
          '--shadow-modal': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        };

    Object.entries(themeVariables).forEach(([prop, val]) => {
      root.style.setProperty(prop, val);
    });
  }, [resolvedTheme]);

  // 1. PRODUCTS
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading products from local storage', e);
    }
    return INITIAL_PRODUCTS;
  });

  // 2. ORDERS
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.ORDERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading orders from local storage', e);
    }
    return INITIAL_ORDERS;
  });

  // 3. INVENTORY LOGS
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.LOGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return deduplicateLogs(parsed);
        }
      }
    } catch (e) {
      console.error('Error loading logs from local storage', e);
    }
    return [
      {
        id: 'log-seed-1',
        timestamp: new Date().toISOString(),
        productId: 'prod-001',
        productName: 'Pro ANC Wireless Earbuds (Spatial Audio)',
        sku: 'COS-AUD-001',
        type: 'Restock',
        quantityChange: 24,
        stockAfter: 24,
        note: 'Initial inventory stock batch',
      }
    ];
  });

  // 4. SETTINGS
  const [settings, setSettings] = useState<ShopSettings>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        const resolvedEmail = parsed.googleDriveEmail === 'chanonlineshopping95@gmail.com'
          ? 'chanonlineshop95@gmail.com'
          : (parsed.googleDriveEmail || 'chanonlineshop95@gmail.com');
        return {
          ...INITIAL_SHOP_SETTINGS,
          ...parsed,
          googleDriveEmail: resolvedEmail,
          autoSyncDriveEnabled: parsed.autoSyncDriveEnabled !== undefined ? parsed.autoSyncDriveEnabled : true,
          autoSyncIntervalSeconds: parsed.autoSyncIntervalSeconds || 60,
          autoSyncOnUpdate: parsed.autoSyncOnUpdate !== undefined ? parsed.autoSyncOnUpdate : true,
          autoRestoreOnUpdate: parsed.autoRestoreOnUpdate !== undefined ? parsed.autoRestoreOnUpdate : true,
          autoRestoreOnLaunch: parsed.autoRestoreOnLaunch !== undefined ? parsed.autoRestoreOnLaunch : true,
          googleDriveFolder: parsed.googleDriveFolder || 'My Drive / Chan Online Shop Backups / Automated /',
        };
      }
    } catch (e) {
      console.error('Error loading settings', e);
    }
    return INITIAL_SHOP_SETTINGS;
  });

  // 5. CART
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.CART);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading cart', e);
    }
    return [];
  });

  // Cart-level discount adjustment
  const [cartDiscountType, setCartDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [cartDiscountValue, setCartDiscountValue] = useState<number>(0);

  // 6. USERS & RBAC
  const [users, setUsers] = useState<AppUser[]>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.USERS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading users', e);
    }
    return INITIAL_USERS;
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      if (saved) return saved;
    } catch (e) {
      console.error('Error loading current user', e);
    }
    return INITIAL_USERS[0].id;
  });

  const currentUser = useMemo(() => {
    return users.find(u => u.id === currentUserId) || users[0] || INITIAL_USERS[0];
  }, [users, currentUserId]);

  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, UserPermissions>>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.ROLE_PERMISSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...ROLE_PERMISSIONS,
          ...parsed,
          STORE_MANAGER: {
            ...ROLE_PERMISSIONS.STORE_MANAGER,
            ...(parsed.STORE_MANAGER || {}),
            canManageUsers: parsed.STORE_MANAGER?.canManageUsers ?? true,
            canBackupRestore: parsed.STORE_MANAGER?.canBackupRestore ?? true,
          }
        };
      }
    } catch (e) {
      console.error('Error loading role permissions', e);
    }
    return ROLE_PERMISSIONS;
  });

  const updateRolePermissions = useCallback((role: UserRole, permissions: Partial<UserPermissions>) => {
    setRolePermissions(prev => {
      const updated = {
        ...prev,
        [role]: {
          ...(prev[role] || ROLE_PERMISSIONS[role]),
          ...permissions,
        }
      };
      safeStorage.setItem(STORAGE_KEYS.ROLE_PERMISSIONS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const resetRolePermissions = useCallback(() => {
    setRolePermissions(ROLE_PERMISSIONS);
    safeStorage.setItem(STORAGE_KEYS.ROLE_PERMISSIONS, JSON.stringify(ROLE_PERMISSIONS));
  }, []);

  const userPermissions = useMemo(() => {
    const roleBase = rolePermissions[currentUser.role] || ROLE_PERMISSIONS[currentUser.role] || ROLE_PERMISSIONS.CASHIER;
    if (currentUser.customPermissions) {
      return { ...roleBase, ...currentUser.customPermissions };
    }
    return roleBase;
  }, [currentUser, rolePermissions]);

  // 7. POS SALES
  const [posSales, setPosSales] = useState<POSSale[]>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.POS_SALES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading POS sales', e);
    }
    return [
      {
        id: 'pos-sale-demo-1',
        receiptNumber: 'POS-2026-0842',
        date: new Date(Date.now() - 3600 * 4 * 1000).toISOString(),
        cashierId: 'usr-003',
        cashierName: 'Bopha Ly',
        customerName: 'Walk-in Customer',
        customerPhone: '012 334 556',
        items: [
          {
            productId: 'prod-003',
            productName: 'Magnetic 15W Qi2 Fast Wireless Power Bank (10,000mAh)',
            sku: 'COS-POW-003',
            quantity: 1,
            unitPrice: 38.0,
            lineTotal: 38.0,
          },
        ],
        subtotal: 38.0,
        discount: 0,
        tax: 0,
        total: 38.0,
        paymentMethod: 'CASH',
        amountTendered: 40.0,
        changeGiven: 2.0,
      }
    ];
  });

  // 7.5 DELIVERY COURIERS FLEET
  const [couriers, setCouriers] = useState<DeliveryCourier[]>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.COURIERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading couriers', e);
    }
    return INITIAL_COURIERS;
  });

  // 8. DELIVERY TRACKINGS
  const [deliveryTrackings, setDeliveryTrackings] = useState<DeliveryTracking[]>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.DELIVERIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading deliveries', e);
    }
    return INITIAL_DELIVERY_TRACKINGS;
  });

  const [activeDeliveryOrder, setActiveDeliveryOrder] = useState<DeliveryTracking | null>(null);

  // 9. DRIVE SNAPSHOTS
  const deduplicateSnapshots = (snapshots: DriveSnapshot[]): DriveSnapshot[] => {
    const seen = new Set<string>();
    const result: DriveSnapshot[] = [];
    for (const s of snapshots) {
      if (s && s.id && !seen.has(s.id)) {
        seen.add(s.id);
        result.push(s);
      }
    }
    return result;
  };

  const [driveSnapshots, setDriveSnapshots] = useState<DriveSnapshot[]>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.DRIVE_SNAPSHOTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const sanitized = parsed.filter(s => s && typeof s === 'object').map(s => ({
            ...s,
            targetEmail: s.targetEmail === 'chanonlineshopping95@gmail.com' ? 'chanonlineshop95@gmail.com' : s.targetEmail,
            deviceSource: typeof s.deviceSource === 'string' ? s.deviceSource.replace('chanonlineshopping95@gmail.com', 'chanonlineshop95@gmail.com') : s.deviceSource,
            name: typeof s.name === 'string' ? s.name.replace('chanonlineshopping95@gmail.com', 'chanonlineshop95@gmail.com') : s.name,
          }));
          return deduplicateSnapshots(sanitized);
        }
      }
    } catch (e) {
      console.error('Error loading drive snapshots', e);
    }
    return [
      {
        id: 'snap-cloud-001',
        timestamp: new Date(Date.now() - 3600 * 24 * 2 * 1000).toISOString(),
        name: 'Auto-Sync: Pre-weekend Catalog & POS State',
        sizeKb: 48,
        deviceSource: 'Chan Online Shop Main Terminal (PP)',
        recordCount: {
          products: 8,
          orders: 1,
          posSales: 1,
          logs: 1,
          users: 4,
        },
        syncedToGoogleDrive: true,
        driveFileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        payload: {
          version: '2.4.0',
          exportedAt: new Date(Date.now() - 3600 * 24 * 2 * 1000).toISOString(),
          shopName: 'Chan Online Shop',
          hotline: '070 433 464',
          data: {
            products: INITIAL_PRODUCTS,
            orders: [
              {
                id: 'COS-ORD-1094',
                date: new Date(Date.now() - 3600 * 24 * 1000).toISOString(),
                customer: {
                  fullName: 'Sokha Meng',
                  phoneNumber: '012 889 977',
                  email: 'sokha.meng@example.com',
                  address: 'House #45, Street 310, BKK1',
                  city: 'Phnom Penh',
                  notes: 'Call before delivery please',
                },
                items: [
                  {
                    productId: 'prod-001',
                    productName: 'Pro ANC Wireless Earbuds (Spatial Audio)',
                    sku: 'COS-AUD-001',
                    price: 49.0,
                    quantity: 1,
                    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
                  },
                ],
                subtotal: 49.0,
                discount: 0,
                shippingFee: 2.0,
                total: 51.0,
                paymentMethod: 'khqr',
                paymentStatus: 'Paid',
                fulfillmentStatus: 'Shipped',
                transactionId: 'TXN-KHQR-984210',
                paymentGatewayProvider: 'Bakong KHQR Gateway',
                trackingNumber: 'VET-PHN-8841',
              }
            ],
            inventoryLogs: [
              {
                id: 'log-init-001',
                timestamp: new Date(Date.now() - 3600 * 24 * 2 * 1000).toISOString(),
                productId: 'prod-001',
                productName: 'Pro ANC Wireless Earbuds (Spatial Audio)',
                sku: 'COS-AUD-001',
                type: 'Restock',
                quantityChange: 50,
                stockAfter: 50,
                note: 'Initial catalog intake',
              }
            ],
            posSales: [
              {
                id: 'pos-sale-demo-1',
                receiptNumber: 'POS-2026-0842',
                date: new Date(Date.now() - 3600 * 4 * 1000).toISOString(),
                cashierId: 'usr-003',
                cashierName: 'Dara (Cashier)',
                customerName: 'Walk-in Customer',
                items: [
                  {
                    productId: 'prod-004',
                    productName: 'Ergonomic Vertical Wireless Mouse',
                    sku: 'COS-ACC-004',
                    quantity: 1,
                    unitPrice: 22.0,
                    lineTotal: 22.0,
                  },
                ],
                subtotal: 22.0,
                discount: 0,
                tax: 0,
                discountPercent: 0,
                taxPercent: 0,
                total: 22.0,
                paymentMethod: 'CASH',
                amountTendered: 25.0,
                changeGiven: 3.0,
              }
            ],
            users: INITIAL_USERS,
            settings: INITIAL_SHOP_SETTINGS,
            categories: DEFAULT_CATEGORIES,
            purchases: INITIAL_PURCHASES,
            stockOuts: INITIAL_STOCK_OUTS,
            purchaseOrders: INITIAL_PURCHASE_ORDERS,
          }
        }
      },
    ];
  });

  // 10. DYNAMIC PRODUCT CATEGORIES
  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        return sanitizeCategories(parsed);
      }
    } catch (e) {
      console.error('Error loading categories', e);
    }
    return DEFAULT_CATEGORIES;
  });

  // 11. PURCHASES (STOCK IN & COST ACCOUNTING)
  const [purchases, setPurchases] = useState<PurchaseRecord[]>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.PURCHASES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading purchases', e);
    }
    return INITIAL_PURCHASES;
  });

  // 12. STOCK OUTS (DISPATCH / DAMAGE / SAMPLES)
  const [stockOuts, setStockOuts] = useState<StockOutRecord[]>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.STOCK_OUTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading stock outs', e);
    }
    return INITIAL_STOCK_OUTS;
  });

  // 13. PURCHASE ORDERS (SUPPLIER PROCUREMENT)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.PURCHASE_ORDERS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading purchase orders', e);
    }
    return INITIAL_PURCHASE_ORDERS;
  });

  // UI States
  const [activeView, setActiveView] = useState<ActiveViewType>('shop');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);
  const [lastPOSSale, setLastPOSSale] = useState<POSSale | null>(null);

  // Biometric Fingerprint Scanner Modal States
  const [isBiometricScannerOpen, setIsBiometricScannerOpen] = useState(false);
  const [biometricScannerConfig, setBiometricScannerConfig] = useState<{
    mode: 'verify' | 'enroll' | 'test';
    title?: string;
    subtitle?: string;
    userName?: string;
    userRole?: string;
    existingKeyId?: string;
    onSuccess?: (keyId: string) => void;
  }>({
    mode: 'test',
    title: 'Biometric Fingerprint Scanner',
  });

  const openBiometricScanner = useCallback((config?: {
    mode?: 'verify' | 'enroll' | 'test';
    title?: string;
    subtitle?: string;
    userName?: string;
    userRole?: string;
    existingKeyId?: string;
    onSuccess?: (keyId: string) => void;
  }) => {
    setBiometricScannerConfig({
      mode: config?.mode || 'test',
      title: config?.title,
      subtitle: config?.subtitle,
      userName: config?.userName || currentUser.name,
      userRole: config?.userRole || currentUser.role,
      existingKeyId: config?.existingKeyId || currentUser.biometricKeyId,
      onSuccess: config?.onSuccess,
    });
    setIsBiometricScannerOpen(true);
  }, [currentUser]);

  const closeBiometricScanner = useCallback(() => {
    setIsBiometricScannerOpen(false);
  }, []);

  // 1-Minute Automatic Google Drive Sync Engine
  const [nextSyncCountdown, setNextSyncCountdown] = useState<number>(() => settings.autoSyncIntervalSeconds || 60);
  const [isAutoSyncing, setIsAutoSyncing] = useState<boolean>(false);
  const [autoSyncStatus, setAutoSyncStatus] = useState<'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [lastAutoSyncTime, setLastAutoSyncTime] = useState<string | null>(() => settings.lastDriveSync || null);
  const [autoSyncSuccessNotification, setAutoSyncSuccessNotification] = useState<string | null>(null);

  const dismissAutoSyncNotification = useCallback(() => {
    setAutoSyncSuccessNotification(null);
  }, []);

  const toggleAutoSync = useCallback((enabled?: boolean) => {
    setSettings(prev => {
      const nextVal = enabled !== undefined ? enabled : !prev.autoSyncDriveEnabled;
      return { ...prev, autoSyncDriveEnabled: nextVal };
    });
  }, []);

  const toggleAutoSyncOnUpdate = useCallback((enabled?: boolean) => {
    setSettings(prev => {
      const currentVal = prev.autoSyncOnUpdate !== false;
      const nextVal = enabled !== undefined ? enabled : !currentVal;
      return { ...prev, autoSyncOnUpdate: nextVal };
    });
  }, []);

  const toggleAutoRestoreOnUpdate = useCallback((enabled?: boolean) => {
    setSettings(prev => {
      const currentVal = prev.autoRestoreOnUpdate !== false;
      const nextVal = enabled !== undefined ? enabled : !currentVal;
      return { ...prev, autoRestoreOnUpdate: nextVal };
    });
  }, []);

  const toggleAutoRestoreOnLaunch = useCallback((enabled?: boolean) => {
    setSettings(prev => {
      const currentVal = prev.autoRestoreOnLaunch !== false;
      const nextVal = enabled !== undefined ? enabled : !currentVal;
      return { ...prev, autoRestoreOnLaunch: nextVal };
    });
  }, []);

  const setAutoSyncInterval = useCallback((seconds: number) => {
    setSettings(prev => ({ ...prev, autoSyncIntervalSeconds: seconds }));
    setNextSyncCountdown(seconds);
  }, []);

  const setGoogleDriveEmail = useCallback((email: string) => {
    setSettings(prev => ({ ...prev, googleDriveEmail: email, googleDriveLinked: true }));
  }, []);

  // ================= NETWORK OUTAGE SIMULATION & OFFLINE CONTINUITY =================
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.OFFLINE_SIMULATION);
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading offline simulation state', e);
    }
    // Check actual browser navigator online status
    return typeof navigator !== 'undefined' ? !navigator.onLine : false;
  });

  // Keep safeStorage updated with offline mode toggle
  useEffect(() => {
    try {
      safeStorage.setItem(STORAGE_KEYS.OFFLINE_SIMULATION, JSON.stringify(isOffline));
    } catch (e) {
      console.error('Error saving offline simulation state', e);
    }
  }, [isOffline]);

  // Listen to browser online/offline events, unless overridden by user simulation
  useEffect(() => {
    const handleBrowserOnline = () => {
      // Check if user manually forced offline simulation
      const savedSim = safeStorage.getItem(STORAGE_KEYS.OFFLINE_SIMULATION);
      if (savedSim === 'true') return; // User wants simulation to stay active
      setIsOffline(false);
    };

    const handleBrowserOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleBrowserOnline);
    window.addEventListener('offline', handleBrowserOffline);
    return () => {
      window.removeEventListener('online', handleBrowserOnline);
      window.removeEventListener('offline', handleBrowserOffline);
    };
  }, []);

  const toggleOfflineSimulation = useCallback((forced?: boolean) => {
    setIsOffline(prev => {
      const next = forced !== undefined ? forced : !prev;
      return next;
    });
  }, []);

  // ================= MULTI-DEVICE REAL-TIME SYNC (WEBSOCKET + POLLING) =================
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('CONNECTING');
  const [connectedDevicesCount, setConnectedDevicesCount] = useState<number>(1);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncVersion, setSyncVersion] = useState<number>(1);
  const [remoteSyncNotification, setRemoteSyncNotification] = useState<string | null>(null);

  const hasInitializedFromServerRef = useRef(false);
  const isApplyingRemoteUpdateRef = useRef(false);
  const lastSerializedStateRef = useRef<Record<string, string>>({});
  const remoteClearTimerRef = useRef<NodeJS.Timeout | null>(null);
  const triggerImmediateSnapshotRef = useRef<(() => void) | null>(null);

  // Synchronously updated state references to prevent race conditions during sync & network events
  const productsRef = useRef(products);
  productsRef.current = products;

  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  const posSalesRef = useRef(posSales);
  posSalesRef.current = posSales;

  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;

  const purchasesRef = useRef(purchases);
  purchasesRef.current = purchases;

  const stockOutsRef = useRef(stockOuts);
  stockOutsRef.current = stockOuts;

  const inventoryLogsRef = useRef(inventoryLogs);
  inventoryLogsRef.current = inventoryLogs;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const purchaseOrdersRef = useRef(purchaseOrders);
  purchaseOrdersRef.current = purchaseOrders;

  const deliveryTrackingsRef = useRef(deliveryTrackings);
  deliveryTrackingsRef.current = deliveryTrackings;

  const couriersRef = useRef(couriers);
  couriersRef.current = couriers;

  const usersRef = useRef(users);
  usersRef.current = users;

  const driveSnapshotsRef = useRef(driveSnapshots);
  driveSnapshotsRef.current = driveSnapshots;

  const [lastAutoRestoreTime, setLastAutoRestoreTime] = useState<string | null>(null);
  const [lastAutoRestoreSource, setLastAutoRestoreSource] = useState<string | null>(null);

  const markApplyingRemote = (duration = 300) => {
    isApplyingRemoteUpdateRef.current = true;
    if (remoteClearTimerRef.current) clearTimeout(remoteClearTimerRef.current);
    remoteClearTimerRef.current = setTimeout(() => {
      isApplyingRemoteUpdateRef.current = false;
    }, duration);
  };

  // Comprehensive Zero-Click Auto-Restore Engine: Restores all 13 collections from snapshot/server state instantly
  const applyCompleteRestoredState = useCallback((data: any, snapshotInfo?: DriveSnapshot, isInitialLaunch = false) => {
    if (!data || typeof data !== 'object') return;
    markApplyingRemote(500);

    // 1. PRODUCTS: Sync stock, costPrice, images, and catalog
    if (Array.isArray(data.products) && data.products.length > 0) {
      productsRef.current = data.products;
      lastSerializedStateRef.current.products = JSON.stringify(data.products);
      setProducts(data.products);
      safeStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data.products));
    }

    // 2. PURCHASES: Sync stock-in supplier invoices & cost records
    if (Array.isArray(data.purchases)) {
      purchasesRef.current = data.purchases;
      lastSerializedStateRef.current.purchases = JSON.stringify(data.purchases);
      setPurchases(data.purchases);
      safeStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(data.purchases));
    }

    // 3. STOCK OUTS: Sync stock write-offs, damages, and sample dispatch
    if (Array.isArray(data.stockOuts)) {
      stockOutsRef.current = data.stockOuts;
      lastSerializedStateRef.current.stockOuts = JSON.stringify(data.stockOuts);
      setStockOuts(data.stockOuts);
      safeStorage.setItem(STORAGE_KEYS.STOCK_OUTS, JSON.stringify(data.stockOuts));
    }

    // 4. PURCHASE ORDERS: Sync procurement orders & supplier tracking
    if (Array.isArray(data.purchaseOrders)) {
      purchaseOrdersRef.current = data.purchaseOrders;
      lastSerializedStateRef.current.purchaseOrders = JSON.stringify(data.purchaseOrders);
      setPurchaseOrders(data.purchaseOrders);
      safeStorage.setItem(STORAGE_KEYS.PURCHASE_ORDERS, JSON.stringify(data.purchaseOrders));
    }

    // 5. CUSTOMER ORDERS: Sync e-commerce orders & statuses
    if (Array.isArray(data.orders)) {
      ordersRef.current = data.orders;
      lastSerializedStateRef.current.orders = JSON.stringify(data.orders);
      setOrders(data.orders);
      safeStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(data.orders));
    }

    // 6. POS SALES: Sync live cash register receipts
    if (Array.isArray(data.posSales)) {
      posSalesRef.current = data.posSales;
      lastSerializedStateRef.current.posSales = JSON.stringify(data.posSales);
      setPosSales(data.posSales);
      safeStorage.setItem(STORAGE_KEYS.POS_SALES, JSON.stringify(data.posSales));
    }

    // 7. INVENTORY AUDIT LOGS
    if (Array.isArray(data.inventoryLogs)) {
      const cleanLogs = deduplicateLogs(data.inventoryLogs);
      inventoryLogsRef.current = cleanLogs;
      lastSerializedStateRef.current.inventoryLogs = JSON.stringify(cleanLogs);
      setInventoryLogs(cleanLogs);
      safeStorage.setItem(STORAGE_KEYS.INVENTORY_LOGS, JSON.stringify(cleanLogs));
    }

    // 8. CATEGORIES
    if (Array.isArray(data.categories) && data.categories.length > 0) {
      const cleanCats = sanitizeCategories(data.categories);
      categoriesRef.current = cleanCats;
      lastSerializedStateRef.current.categories = JSON.stringify(cleanCats);
      setCategories(cleanCats);
      safeStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(cleanCats));
    }

    // 9. SETTINGS
    if (data.settings && typeof data.settings === 'object') {
      const merged = { ...settingsRef.current, ...data.settings };
      settingsRef.current = merged;
      lastSerializedStateRef.current.settings = JSON.stringify(merged);
      setSettings(merged);
      safeStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
    }

    // 10. COURIERS
    if (Array.isArray(data.couriers) && data.couriers.length > 0) {
      couriersRef.current = data.couriers;
      lastSerializedStateRef.current.couriers = JSON.stringify(data.couriers);
      setCouriers(data.couriers);
      safeStorage.setItem(STORAGE_KEYS.COURIERS, JSON.stringify(data.couriers));
    }

    // 11. DELIVERIES
    if (Array.isArray(data.deliveryTrackings)) {
      deliveryTrackingsRef.current = data.deliveryTrackings;
      lastSerializedStateRef.current.deliveryTrackings = JSON.stringify(data.deliveryTrackings);
      setDeliveryTrackings(data.deliveryTrackings);
      safeStorage.setItem(STORAGE_KEYS.DELIVERY_TRACKINGS, JSON.stringify(data.deliveryTrackings));
    }

    // 12. USERS
    if (Array.isArray(data.users) && data.users.length > 0) {
      usersRef.current = data.users;
      lastSerializedStateRef.current.users = JSON.stringify(data.users);
      setUsers(data.users);
      safeStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(data.users));
    }

    const restoreTime = new Date().toLocaleTimeString();
    setLastAutoRestoreTime(restoreTime);
    const sourceLabel = snapshotInfo?.deviceSource || 'Cloud Drive Auto-Sync';
    setLastAutoRestoreSource(sourceLabel);

    const notifyMsg = isInitialLaunch
      ? `✨ Auto-Restored: Connected & restored latest state from Cloud (${restoreTime})`
      : `✨ Auto-Restored: Updated catalog, expenses & orders from other device (${restoreTime})`;
    setRemoteSyncNotification(notifyMsg);
    setTimeout(() => {
      setRemoteSyncNotification(prev => prev === notifyMsg ? null : prev);
    }, 4500);
  }, []);

  // Initialize Real-Time Multi-Device Sync Engine (SSE + WebSocket + Fast Polling)
  useEffect(() => {
    realtimeSyncManager.init({
      onInitState: (serverState, version, devices) => {
        hasInitializedFromServerRef.current = true;
        if (serverState) {
          markApplyingRemote(400);

          // ZERO-CLICK AUTO-RESTORE ON LAUNCH:
          // Check if server provides a recent Drive snapshot with full payload data
          const latestSnap = Array.isArray(serverState.driveSnapshots) && serverState.driveSnapshots[0]?.payload?.data
            ? serverState.driveSnapshots[0]
            : null;

          if (settingsRef.current.autoRestoreOnLaunch !== false && latestSnap?.payload?.data) {
            console.log(`[StoreSync] Zero-click auto-restoring state from latest snapshot on launch: "${latestSnap.name}"`);
            applyCompleteRestoredState(latestSnap.payload.data, latestSnap, true);
          } else {
            // Apply standard server collections
            if (Array.isArray(serverState.products)) {
              lastSerializedStateRef.current.products = JSON.stringify(serverState.products);
              productsRef.current = serverState.products;
              setProducts(serverState.products);
              safeStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(serverState.products));
            }
            if (Array.isArray(serverState.orders)) {
              lastSerializedStateRef.current.orders = JSON.stringify(serverState.orders);
              ordersRef.current = serverState.orders;
              setOrders(serverState.orders);
              safeStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(serverState.orders));
            }
            if (Array.isArray(serverState.inventoryLogs)) {
              const cleanLogs = deduplicateLogs(serverState.inventoryLogs);
              lastSerializedStateRef.current.inventoryLogs = JSON.stringify(cleanLogs);
              inventoryLogsRef.current = cleanLogs;
              setInventoryLogs(cleanLogs);
              safeStorage.setItem(STORAGE_KEYS.INVENTORY_LOGS, JSON.stringify(cleanLogs));
            }
            if (serverState.settings && typeof serverState.settings === 'object') {
              lastSerializedStateRef.current.settings = JSON.stringify(serverState.settings);
              settingsRef.current = serverState.settings;
              setSettings(serverState.settings);
              safeStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(serverState.settings));
            }
            if (Array.isArray(serverState.categories)) {
              const cleanCats = sanitizeCategories(serverState.categories);
              lastSerializedStateRef.current.categories = JSON.stringify(cleanCats);
              categoriesRef.current = cleanCats;
              setCategories(cleanCats);
              safeStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(cleanCats));
            }
            if (Array.isArray(serverState.purchases)) {
              lastSerializedStateRef.current.purchases = JSON.stringify(serverState.purchases);
              purchasesRef.current = serverState.purchases;
              setPurchases(serverState.purchases);
              safeStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(serverState.purchases));
            }
            if (Array.isArray(serverState.stockOuts)) {
              lastSerializedStateRef.current.stockOuts = JSON.stringify(serverState.stockOuts);
              stockOutsRef.current = serverState.stockOuts;
              setStockOuts(serverState.stockOuts);
              safeStorage.setItem(STORAGE_KEYS.STOCK_OUTS, JSON.stringify(serverState.stockOuts));
            }
            if (Array.isArray(serverState.purchaseOrders)) {
              lastSerializedStateRef.current.purchaseOrders = JSON.stringify(serverState.purchaseOrders);
              purchaseOrdersRef.current = serverState.purchaseOrders;
              setPurchaseOrders(serverState.purchaseOrders);
              safeStorage.setItem(STORAGE_KEYS.PURCHASE_ORDERS, JSON.stringify(serverState.purchaseOrders));
            }
            if (Array.isArray(serverState.posSales)) {
              lastSerializedStateRef.current.posSales = JSON.stringify(serverState.posSales);
              posSalesRef.current = serverState.posSales;
              setPosSales(serverState.posSales);
              safeStorage.setItem(STORAGE_KEYS.POS_SALES, JSON.stringify(serverState.posSales));
            }
            if (Array.isArray(serverState.deliveryTrackings)) {
              lastSerializedStateRef.current.deliveryTrackings = JSON.stringify(serverState.deliveryTrackings);
              deliveryTrackingsRef.current = serverState.deliveryTrackings;
              setDeliveryTrackings(serverState.deliveryTrackings);
              safeStorage.setItem(STORAGE_KEYS.DELIVERY_TRACKINGS, JSON.stringify(serverState.deliveryTrackings));
            }
            if (Array.isArray(serverState.couriers)) {
              lastSerializedStateRef.current.couriers = JSON.stringify(serverState.couriers);
              couriersRef.current = serverState.couriers;
              setCouriers(serverState.couriers);
              safeStorage.setItem(STORAGE_KEYS.COURIERS, JSON.stringify(serverState.couriers));
            }
            if (Array.isArray(serverState.users)) {
              lastSerializedStateRef.current.users = JSON.stringify(serverState.users);
              usersRef.current = serverState.users;
              setUsers(serverState.users);
              safeStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(serverState.users));
            }
          }

          // In all cases, preserve synced snapshots
          if (Array.isArray(serverState.driveSnapshots)) {
            const cleanSnapshots = deduplicateSnapshots(serverState.driveSnapshots);
            lastSerializedStateRef.current.driveSnapshots = JSON.stringify(cleanSnapshots);
            driveSnapshotsRef.current = cleanSnapshots;
            setDriveSnapshots(cleanSnapshots);
            safeStorage.setItem(STORAGE_KEYS.DRIVE_SNAPSHOTS, JSON.stringify(cleanSnapshots));
          }
        }
        setSyncVersion(version);
        setConnectedDevicesCount(devices);
        setLastSyncTime(new Date().toLocaleTimeString());
      },

      onMutation: (collection, data, version, sourceClientId) => {
        hasInitializedFromServerRef.current = true;
        markApplyingRemote(300);
        lastSerializedStateRef.current[collection] = JSON.stringify(data);

        switch (collection) {
          case 'products':
            if (Array.isArray(data)) {
              productsRef.current = data;
              setProducts(data);
              safeStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data));
            }
            break;
          case 'orders':
            if (Array.isArray(data)) {
              ordersRef.current = data;
              setOrders(data);
              safeStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(data));
            }
            break;
          case 'inventoryLogs':
            if (Array.isArray(data)) {
              const clean = deduplicateLogs(data);
              lastSerializedStateRef.current.inventoryLogs = JSON.stringify(clean);
              inventoryLogsRef.current = clean;
              setInventoryLogs(clean);
              safeStorage.setItem(STORAGE_KEYS.INVENTORY_LOGS, JSON.stringify(clean));
            }
            break;
          case 'settings':
            if (data && typeof data === 'object') {
              setSettings(prev => {
                const merged = { ...prev, ...data };
                settingsRef.current = merged;
                lastSerializedStateRef.current.settings = JSON.stringify(merged);
                safeStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
                return merged;
              });
            }
            break;
          case 'categories':
            if (Array.isArray(data)) {
              const clean = sanitizeCategories(data);
              categoriesRef.current = clean;
              lastSerializedStateRef.current.categories = JSON.stringify(clean);
              setCategories(clean);
              safeStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(clean));
            }
            break;
          case 'purchases':
            if (Array.isArray(data)) {
              purchasesRef.current = data;
              setPurchases(data);
              safeStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(data));
            }
            break;
          case 'stockOuts':
            if (Array.isArray(data)) {
              stockOutsRef.current = data;
              setStockOuts(data);
              safeStorage.setItem(STORAGE_KEYS.STOCK_OUTS, JSON.stringify(data));
            }
            break;
          case 'purchaseOrders':
            if (Array.isArray(data)) {
              purchaseOrdersRef.current = data;
              setPurchaseOrders(data);
              safeStorage.setItem(STORAGE_KEYS.PURCHASE_ORDERS, JSON.stringify(data));
            }
            break;
          case 'posSales':
            if (Array.isArray(data)) {
              posSalesRef.current = data;
              setPosSales(data);
              safeStorage.setItem(STORAGE_KEYS.POS_SALES, JSON.stringify(data));
            }
            break;
          case 'deliveryTrackings':
            if (Array.isArray(data)) {
              deliveryTrackingsRef.current = data;
              setDeliveryTrackings(data);
              safeStorage.setItem(STORAGE_KEYS.DELIVERY_TRACKINGS, JSON.stringify(data));
            }
            break;
          case 'couriers':
            if (Array.isArray(data)) {
              couriersRef.current = data;
              setCouriers(data);
              safeStorage.setItem(STORAGE_KEYS.COURIERS, JSON.stringify(data));
            }
            break;
          case 'users':
            if (Array.isArray(data)) {
              usersRef.current = data;
              setUsers(data);
              safeStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(data));
            }
            break;
          case 'driveSnapshots':
            if (Array.isArray(data)) {
              const cleanSnapshots = deduplicateSnapshots(data);
              driveSnapshotsRef.current = cleanSnapshots;
              lastSerializedStateRef.current.driveSnapshots = JSON.stringify(cleanSnapshots);
              setDriveSnapshots(cleanSnapshots);
              safeStorage.setItem(STORAGE_KEYS.DRIVE_SNAPSHOTS, JSON.stringify(cleanSnapshots));

              // ZERO-CLICK AUTO-RESTORE ON REMOTE SNAPSHOT:
              // If another device pushed a snapshot, automatically restore all collections immediately!
              if (settingsRef.current.autoRestoreOnUpdate !== false && cleanSnapshots[0]?.payload?.data) {
                console.log(`[StoreSync] Zero-click auto-restoring store state from incoming snapshot "${cleanSnapshots[0].name}"`);
                applyCompleteRestoredState(cleanSnapshots[0].payload.data, cleanSnapshots[0]);
              }
            }
            break;
        }

        setSyncVersion(version);
        setLastSyncTime(new Date().toLocaleTimeString());

        const deviceLabel = sourceClientId?.startsWith('mob') ? 'Mobile phone' : 'PC / Register';
        const label = collection === 'products' ? 'Products & Stock'
          : collection === 'posSales' ? 'POS Register Sales'
          : collection === 'orders' ? 'Customer Orders'
          : collection === 'purchases' ? 'Purchase Expenses'
          : collection === 'stockOuts' ? 'Stock Out Expenses'
          : collection === 'purchaseOrders' ? 'Purchase Orders'
          : collection === 'driveSnapshots' ? 'Cloud Drive Snapshots'
          : collection === 'settings' ? 'Storefront Settings'
          : collection;

        setRemoteSyncNotification(`Live update: ${label} automatically synced from ${deviceLabel}`);
        setTimeout(() => {
          setRemoteSyncNotification(prev => prev?.includes(label) ? null : prev);
        }, 4000);
      },

      onFullSync: (serverState, version, sourceClientId) => {
        hasInitializedFromServerRef.current = true;
        if (serverState) {
          const snapshotInfo = Array.isArray(serverState.driveSnapshots) ? serverState.driveSnapshots[0] : undefined;
          applyCompleteRestoredState(serverState, snapshotInfo);
        }
        setSyncVersion(version);
        setLastSyncTime(new Date().toLocaleTimeString());
        if (sourceClientId) {
          const deviceLabel = sourceClientId.startsWith('mob') ? 'Mobile phone' : 'PC';
          setRemoteSyncNotification(`✨ Store data automatically synced and restored from ${deviceLabel}`);
          setTimeout(() => setRemoteSyncNotification(null), 3000);
        }
      },

      onPresenceUpdate: (devices, version) => {
        setConnectedDevicesCount(devices);
        setSyncVersion(version);
      },

      onTestPing: (sourceClientId, message) => {
        const deviceLabel = sourceClientId.startsWith('mob') ? 'Mobile phone' : 'PC';
        setRemoteSyncNotification(`🔔 Live Ping from ${deviceLabel}: ${message}`);
        setTimeout(() => setRemoteSyncNotification(null), 4000);
      },

      onStatusChange: (status) => {
        setSyncStatus(status);
      },
    });

    return () => {
      realtimeSyncManager.destroy();
    };
  }, []);

  const triggerManualSync = useCallback(async (): Promise<boolean> => {
    setSyncStatus('CONNECTING');
    const success = await realtimeSyncManager.pollLatestState(true);
    setSyncStatus(success ? 'CONNECTED' : 'POLLING');
    if (success) {
      hasInitializedFromServerRef.current = true;
      setLastSyncTime(new Date().toLocaleTimeString());
      setRemoteSyncNotification('Store data is up to date across all devices');
      setTimeout(() => setRemoteSyncNotification(null), 3000);
    }
    return success;
  }, []);

  const sendTestPing = useCallback((message?: string) => {
    realtimeSyncManager.sendTestPing(message);
    setRemoteSyncNotification('Sent live test ping to other devices');
    setTimeout(() => setRemoteSyncNotification(null), 3000);
  }, []);

  const dismissRemoteSyncNotification = useCallback(() => {
    setRemoteSyncNotification(null);
  }, []);

  // Sync state to local storage and real-time sync manager
  useEffect(() => {
    const serialized = JSON.stringify(products);
    safeStorage.setItem(STORAGE_KEYS.PRODUCTS, serialized);
    if (lastSerializedStateRef.current.products === serialized) {
      return;
    }
    lastSerializedStateRef.current.products = serialized;
    if (isApplyingRemoteUpdateRef.current) {
      return;
    }
    if (hasInitializedFromServerRef.current) {
      realtimeSyncManager.sendMutation('products', products);
    }
  }, [products]);

  useEffect(() => {
    const serialized = JSON.stringify(orders);
    safeStorage.setItem(STORAGE_KEYS.ORDERS, serialized);
    if (lastSerializedStateRef.current.orders === serialized) {
      return;
    }
    lastSerializedStateRef.current.orders = serialized;
    if (isApplyingRemoteUpdateRef.current) {
      return;
    }
    if (hasInitializedFromServerRef.current) {
      realtimeSyncManager.sendMutation('orders', orders);
    }
  }, [orders]);

  useEffect(() => {
    const serialized = JSON.stringify(inventoryLogs);
    safeStorage.setItem(STORAGE_KEYS.LOGS, serialized);
    if (lastSerializedStateRef.current.inventoryLogs === serialized) {
      return;
    }
    lastSerializedStateRef.current.inventoryLogs = serialized;
    if (isApplyingRemoteUpdateRef.current) {
      return;
    }
    if (hasInitializedFromServerRef.current) {
      realtimeSyncManager.sendMutation('inventoryLogs', inventoryLogs);
    }
  }, [inventoryLogs]);

  useEffect(() => {
    const serialized = JSON.stringify(settings);
    safeStorage.setItem(STORAGE_KEYS.SETTINGS, serialized);
    if (lastSerializedStateRef.current.settings === serialized) {
      return;
    }
    lastSerializedStateRef.current.settings = serialized;
    if (isApplyingRemoteUpdateRef.current) {
      return;
    }
    if (hasInitializedFromServerRef.current) {
      realtimeSyncManager.sendMutation('settings', settings);
    }
  }, [settings]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const serialized = JSON.stringify(users);
    safeStorage.setItem(STORAGE_KEYS.USERS, serialized);
    if (lastSerializedStateRef.current.users === serialized) {
      return;
    }
    lastSerializedStateRef.current.users = serialized;
    if (isApplyingRemoteUpdateRef.current) {
      return;
    }
    if (hasInitializedFromServerRef.current) {
      realtimeSyncManager.sendMutation('users', users);
    }
  }, [users]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    const serialized = JSON.stringify(posSales);
    safeStorage.setItem(STORAGE_KEYS.POS_SALES, serialized);
    if (lastSerializedStateRef.current.posSales === serialized) {
      return;
    }
    lastSerializedStateRef.current.posSales = serialized;
    if (isApplyingRemoteUpdateRef.current) {
      return;
    }
    if (hasInitializedFromServerRef.current) {
      realtimeSyncManager.sendMutation('posSales', posSales);
    }
  }, [posSales]);

  useEffect(() => {
    const serialized = JSON.stringify(deliveryTrackings);
    safeStorage.setItem(STORAGE_KEYS.DELIVERIES, serialized);
    if (lastSerializedStateRef.current.deliveryTrackings === serialized) {
      return;
    }
    lastSerializedStateRef.current.deliveryTrackings = serialized;
    if (isApplyingRemoteUpdateRef.current) {
      return;
    }
    if (hasInitializedFromServerRef.current) {
      realtimeSyncManager.sendMutation('deliveryTrackings', deliveryTrackings);
    }
  }, [deliveryTrackings]);

  useEffect(() => {
    const serialized = JSON.stringify(couriers);
    safeStorage.setItem(STORAGE_KEYS.COURIERS, serialized);
    if (lastSerializedStateRef.current.couriers === serialized) {
      return;
    }
    lastSerializedStateRef.current.couriers = serialized;
    if (isApplyingRemoteUpdateRef.current) {
      return;
    }
    if (hasInitializedFromServerRef.current) {
      realtimeSyncManager.sendMutation('couriers', couriers);
    }
  }, [couriers]);

  useEffect(() => {
    try {
      // Keep payloads for the 8 most recent snapshots to stay well within storage quotas
      const optimized = deduplicateSnapshots(driveSnapshots).map((snap, idx) => {
        if (idx < 8) return snap;
        const { payload: _, ...rest } = snap;
        return rest;
      });
      safeStorage.setItem(STORAGE_KEYS.DRIVE_SNAPSHOTS, JSON.stringify(optimized));
    } catch (e) {
      console.warn('Could not save full drive snapshots payload to storage, falling back to metadata', e);
      try {
        const metadataOnly = driveSnapshots.map(({ payload: _, ...rest }) => rest);
        safeStorage.setItem(STORAGE_KEYS.DRIVE_SNAPSHOTS, JSON.stringify(metadataOnly));
      } catch (err) {
        console.error('Failed to save drive snapshots', err);
      }
    }
  }, [driveSnapshots]);

  useEffect(() => {
    const serialized = JSON.stringify(categories);
    safeStorage.setItem(STORAGE_KEYS.CATEGORIES, serialized);
    if (lastSerializedStateRef.current.categories === serialized) {
      return;
    }
    lastSerializedStateRef.current.categories = serialized;
    if (isApplyingRemoteUpdateRef.current) {
      return;
    }
    if (hasInitializedFromServerRef.current) {
      realtimeSyncManager.sendMutation('categories', categories);
    }
  }, [categories]);

  useEffect(() => {
    const serialized = JSON.stringify(purchases);
    safeStorage.setItem(STORAGE_KEYS.PURCHASES, serialized);
    if (lastSerializedStateRef.current.purchases === serialized) {
      return;
    }
    lastSerializedStateRef.current.purchases = serialized;
    if (isApplyingRemoteUpdateRef.current) {
      return;
    }
    if (hasInitializedFromServerRef.current) {
      realtimeSyncManager.sendMutation('purchases', purchases);
    }
  }, [purchases]);

  useEffect(() => {
    const serialized = JSON.stringify(stockOuts);
    safeStorage.setItem(STORAGE_KEYS.STOCK_OUTS, serialized);
    if (lastSerializedStateRef.current.stockOuts === serialized) {
      return;
    }
    lastSerializedStateRef.current.stockOuts = serialized;
    if (isApplyingRemoteUpdateRef.current) {
      return;
    }
    if (hasInitializedFromServerRef.current) {
      realtimeSyncManager.sendMutation('stockOuts', stockOuts);
    }
  }, [stockOuts]);

  useEffect(() => {
    const serialized = JSON.stringify(purchaseOrders);
    safeStorage.setItem(STORAGE_KEYS.PURCHASE_ORDERS, serialized);
    if (lastSerializedStateRef.current.purchaseOrders === serialized) {
      return;
    }
    lastSerializedStateRef.current.purchaseOrders = serialized;
    if (isApplyingRemoteUpdateRef.current) {
      return;
    }
    if (hasInitializedFromServerRef.current) {
      realtimeSyncManager.sendMutation('purchaseOrders', purchaseOrders);
    }
  }, [purchaseOrders]);

  // Cart Calculations
  const cartCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }, [cart]);

  const cartDiscountAmount = useMemo(() => {
    if (cartDiscountValue <= 0 || cartSubtotal <= 0) return 0;
    if (cartDiscountType === 'percent') {
      const clamped = Math.min(100, Math.max(0, cartDiscountValue));
      return (cartSubtotal * clamped) / 100;
    } else {
      return Math.min(cartSubtotal, Math.max(0, cartDiscountValue));
    }
  }, [cartSubtotal, cartDiscountType, cartDiscountValue]);

  const setCartDiscount = useCallback((value: number, type: 'percent' | 'fixed' = 'percent') => {
    setCartDiscountType(type);
    setCartDiscountValue(Math.max(0, value));
  }, []);

  const clearCartDiscount = useCallback(() => {
    setCartDiscountValue(0);
    setCartDiscountType('percent');
  }, []);

  const addToCart = useCallback((product: Product, quantity: number = 1) => {
    const existing = cart.find(item => item.product.id === product.id);
    const currentInCart = existing ? existing.quantity : 0;
    const availableStock = product.stock;

    if (availableStock <= 0) {
      return { success: false, message: 'This item is currently out of stock.' };
    }

    if (currentInCart + quantity > availableStock) {
      return { 
        success: false, 
        message: `Only ${availableStock} items available in stock. You already have ${currentInCart} in cart.` 
      };
    }

    setCart(prev => {
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });

    return { success: true, message: `Added ${product.name} to cart.` };
  }, [cart]);

  const updateCartQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.product.id !== productId));
      return;
    }

    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    if (quantity > prod.stock) {
      alert(`Cannot add more than available stock (${prod.stock} units)`);
      return;
    }

    setCart(prev => 
      prev.map(item => 
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  }, [products]);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    clearCartDiscount();
  }, [clearCartDiscount]);

  // Product CRUD with Immediate Multi-Layer Persistence (State + SafeStorage + IndexedDB + Server Sync)
  const addProduct = useCallback((productData: Omit<Product, 'id' | 'createdAt'>): Product => {
    const newId = `prod-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
    const newProduct: Product = {
      ...productData,
      id: newId,
      createdAt: new Date().toISOString(),
    };

    const nextProducts = [newProduct, ...productsRef.current];
    productsRef.current = nextProducts;
    setProducts(nextProducts);

    // 1. Immediate local persistence (localStorage + IndexedDB + MemoryStore)
    const serialized = JSON.stringify(nextProducts);
    safeStorage.setItem(STORAGE_KEYS.PRODUCTS, serialized);
    lastSerializedStateRef.current.products = serialized;

    // 2. Immediate real-time cloud sync to server
    realtimeSyncManager.sendMutation('products', nextProducts, 'ADD_PRODUCT');

    // 3. Log inventory entry
    const log: InventoryLog = {
      id: createLogId('log-create'),
      timestamp: new Date().toISOString(),
      productId: newProduct.id,
      productName: newProduct.name,
      sku: newProduct.sku,
      type: 'Creation',
      quantityChange: newProduct.stock,
      stockAfter: newProduct.stock,
      note: `New product created with initial stock of ${newProduct.stock}`,
    };
    const nextLogs = [log, ...(inventoryLogsRef.current || [])];
    inventoryLogsRef.current = nextLogs;
    setInventoryLogs(nextLogs);
    safeStorage.setItem(STORAGE_KEYS.INVENTORY_LOGS, JSON.stringify(nextLogs));

    triggerImmediateSnapshotRef.current?.();
    return newProduct;
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    const existing = productsRef.current.find(p => p.id === id);
    if (existing && updates.stock !== undefined && updates.stock !== existing.stock) {
      const diff = updates.stock - existing.stock;
      const log: InventoryLog = {
        id: createLogId('log-update'),
        timestamp: new Date().toISOString(),
        productId: existing.id,
        productName: updates.name || existing.name,
        sku: updates.sku || existing.sku,
        type: diff > 0 ? 'Restock' : 'Adjustment',
        quantityChange: diff,
        stockAfter: updates.stock,
        note: `Stock updated manually via Product Editor`,
      };
      const nextLogs = [log, ...(inventoryLogsRef.current || [])];
      inventoryLogsRef.current = nextLogs;
      setInventoryLogs(nextLogs);
      safeStorage.setItem(STORAGE_KEYS.INVENTORY_LOGS, JSON.stringify(nextLogs));
    }

    const nextProducts = productsRef.current.map(p => (p.id === id ? { ...p, ...updates } : p));
    productsRef.current = nextProducts;
    setProducts(nextProducts);

    const serialized = JSON.stringify(nextProducts);
    safeStorage.setItem(STORAGE_KEYS.PRODUCTS, serialized);
    lastSerializedStateRef.current.products = serialized;
    realtimeSyncManager.sendMutation('products', nextProducts, 'UPDATE_PRODUCT');
    triggerImmediateSnapshotRef.current?.();
  }, []);

  const deleteProduct = useCallback((id: string) => {
    const productToDelete = productsRef.current.find(p => p.id === id);
    if (productToDelete) {
      const log: InventoryLog = {
        id: createLogId('log-delete'),
        timestamp: new Date().toISOString(),
        productId: id,
        productName: productToDelete.name,
        sku: productToDelete.sku,
        type: 'Deletion',
        quantityChange: -productToDelete.stock,
        stockAfter: 0,
        note: `Product deleted from catalog`,
      };
      const nextLogs = [log, ...(inventoryLogsRef.current || [])];
      inventoryLogsRef.current = nextLogs;
      setInventoryLogs(nextLogs);
      safeStorage.setItem(STORAGE_KEYS.INVENTORY_LOGS, JSON.stringify(nextLogs));
    }

    const nextProducts = productsRef.current.filter(p => p.id !== id);
    productsRef.current = nextProducts;
    setProducts(nextProducts);

    const serialized = JSON.stringify(nextProducts);
    safeStorage.setItem(STORAGE_KEYS.PRODUCTS, serialized);
    lastSerializedStateRef.current.products = serialized;
    realtimeSyncManager.sendMutation('products', nextProducts, 'DELETE_PRODUCT');
    triggerImmediateSnapshotRef.current?.();

    setCart(prev => prev.filter(item => item.product.id !== id));
  }, []);

  const adjustStock = useCallback((productId: string, delta: number, note?: string) => {
    const prod = productsRef.current.find(p => p.id === productId);
    if (!prod) return;

    const newStock = Math.max(0, prod.stock + delta);
    const actualDelta = newStock - prod.stock;

    const log: InventoryLog = {
      id: createLogId('log-adj'),
      timestamp: new Date().toISOString(),
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      type: actualDelta > 0 ? 'Restock' : 'Adjustment',
      quantityChange: actualDelta,
      stockAfter: newStock,
      note: note || (actualDelta > 0 ? `Quick restock +${actualDelta}` : `Stock reduction ${actualDelta}`),
    };
    const nextLogs = [log, ...(inventoryLogsRef.current || [])];
    inventoryLogsRef.current = nextLogs;
    setInventoryLogs(nextLogs);
    safeStorage.setItem(STORAGE_KEYS.INVENTORY_LOGS, JSON.stringify(nextLogs));

    const nextProducts = productsRef.current.map(p => (p.id === productId ? { ...p, stock: newStock } : p));
    productsRef.current = nextProducts;
    setProducts(nextProducts);

    const serialized = JSON.stringify(nextProducts);
    safeStorage.setItem(STORAGE_KEYS.PRODUCTS, serialized);
    lastSerializedStateRef.current.products = serialized;
    realtimeSyncManager.sendMutation('products', nextProducts, 'ADJUST_STOCK');
  }, []);

  // Category Management Handlers
  const addCategory = useCallback((categoryName: string): boolean => {
    const trimmed = categoryName.trim();
    if (!trimmed || trimmed.toLowerCase() === 'all') return false;
    
    // Check if category already exists (case-insensitive)
    const exists = categories.some(c => c.toLowerCase() === trimmed.toLowerCase());
    if (exists) return false;

    setCategories(prev => sanitizeCategories([...prev, trimmed]));
    return true;
  }, [categories]);

  const deleteCategory = useCallback((categoryName: string) => {
    setCategories(prev => prev.filter(c => c.toLowerCase() !== categoryName.toLowerCase()));
    if (selectedCategory === categoryName) {
      setSelectedCategory('All');
    }
  }, [selectedCategory]);

  // Barcode / SKU Product Lookup
  const findProductByBarcodeOrSku = useCallback((query: string): Product | undefined => {
    if (!query) return undefined;
    const clean = query.trim().toLowerCase();
    return products.find(p => 
      (p.barcode && p.barcode.toLowerCase() === clean) ||
      (p.sku && p.sku.toLowerCase() === clean) ||
      (p.id && p.id.toLowerCase() === clean) ||
      (p.name && p.name.toLowerCase().includes(clean))
    );
  }, [products]);

  // Purchase Accounting (Stock IN & Supplier Cost)
  const addPurchase = useCallback((purchaseData: Omit<PurchaseRecord, 'id' | 'createdAt'>): PurchaseRecord => {
    const newPurchase: PurchaseRecord = {
      ...purchaseData,
      id: `pur-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    setPurchases(prev => {
      const nextPurchases = [newPurchase, ...prev];
      purchasesRef.current = nextPurchases;
      lastSerializedStateRef.current.purchases = JSON.stringify(nextPurchases);
      safeStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(nextPurchases));
      realtimeSyncManager.sendMutation('purchases', nextPurchases, 'ADD_PURCHASE');
      return nextPurchases;
    });

    // Increase product stock in REAL TIME and update costPrice if positive
    setProducts(prev => {
      const nextProducts = prev.map(p => {
        if (p.id === purchaseData.productId) {
          const nextStock = p.stock + purchaseData.quantity;
          return {
            ...p,
            stock: nextStock,
            costPrice: purchaseData.unitCostPrice > 0 ? purchaseData.unitCostPrice : p.costPrice,
          };
        }
        return p;
      });
      productsRef.current = nextProducts;
      lastSerializedStateRef.current.products = JSON.stringify(nextProducts);
      safeStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(nextProducts));
      realtimeSyncManager.sendMutation('products', nextProducts, 'PURCHASE_STOCK_IN');
      return nextProducts;
    });

    const prod = productsRef.current.find(p => p.id === purchaseData.productId);
    const currentStock = prod?.stock || 0;

    // Record in inventory audit trail
    const newLog: InventoryLog = {
      id: createLogId('log-pur'),
      timestamp: new Date().toISOString(),
      productId: purchaseData.productId,
      productName: purchaseData.productName,
      sku: purchaseData.sku,
      type: 'Restock',
      quantityChange: purchaseData.quantity,
      stockAfter: currentStock + purchaseData.quantity,
      note: `Purchase Stock In: Inv #${purchaseData.invoiceNumber} from ${purchaseData.supplierName} ($${purchaseData.totalCost.toFixed(2)})`,
    };

    setInventoryLogs(prev => {
      const nextLogs = deduplicateLogs([newLog, ...prev]);
      inventoryLogsRef.current = nextLogs;
      lastSerializedStateRef.current.inventoryLogs = JSON.stringify(nextLogs);
      safeStorage.setItem(STORAGE_KEYS.INVENTORY_LOGS, JSON.stringify(nextLogs));
      realtimeSyncManager.sendMutation('inventoryLogs', nextLogs, 'PURCHASE_LOG');
      return nextLogs;
    });

    triggerImmediateSnapshotRef.current?.();
    return newPurchase;
  }, []);

  // Delete Purchase (Reverses stock in real time)
  const deletePurchase = useCallback((purchaseId: string) => {
    const pur = purchasesRef.current.find(p => p.id === purchaseId);
    if (pur) {
      const prod = productsRef.current.find(p => p.id === pur.productId);
      const currentStock = prod?.stock || 0;

      // Reverse stock in real time
      setProducts(currProducts => {
        const nextProducts = currProducts.map(p => {
          if (p.id === pur.productId) {
            return {
              ...p,
              stock: Math.max(0, p.stock - pur.quantity),
            };
          }
          return p;
        });
        productsRef.current = nextProducts;
        lastSerializedStateRef.current.products = JSON.stringify(nextProducts);
        safeStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(nextProducts));
        realtimeSyncManager.sendMutation('products', nextProducts, 'REVERSE_PURCHASE_STOCK');
        return nextProducts;
      });

      const newLog: InventoryLog = {
        id: createLogId('log-pur-del'),
        timestamp: new Date().toISOString(),
        productId: pur.productId,
        productName: pur.productName,
        sku: pur.sku,
        type: 'Adjustment',
        quantityChange: -pur.quantity,
        stockAfter: Math.max(0, currentStock - pur.quantity),
        note: `Purchase Invoice #${pur.invoiceNumber} deleted/reversed (-${pur.quantity} units)`,
      };

      setInventoryLogs(logs => {
        const nextLogs = deduplicateLogs([newLog, ...logs]);
        inventoryLogsRef.current = nextLogs;
        lastSerializedStateRef.current.inventoryLogs = JSON.stringify(nextLogs);
        safeStorage.setItem(STORAGE_KEYS.INVENTORY_LOGS, JSON.stringify(nextLogs));
        realtimeSyncManager.sendMutation('inventoryLogs', nextLogs, 'DELETE_PURCHASE_LOG');
        return nextLogs;
      });
    }

    setPurchases(prev => {
      const nextPurchases = prev.filter(p => p.id !== purchaseId);
      purchasesRef.current = nextPurchases;
      lastSerializedStateRef.current.purchases = JSON.stringify(nextPurchases);
      safeStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(nextPurchases));
      realtimeSyncManager.sendMutation('purchases', nextPurchases, 'DELETE_PURCHASE');
      triggerImmediateSnapshotRef.current?.();
      return nextPurchases;
    });
  }, []);

  // Stock Out Accounting (Dispatch / Loss / Samples)
  const addStockOut = useCallback((stockOutData: Omit<StockOutRecord, 'id' | 'createdAt'>): StockOutRecord => {
    const newStockOut: StockOutRecord = {
      ...stockOutData,
      id: `so-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    setStockOuts(prev => {
      const nextStockOuts = [newStockOut, ...prev];
      stockOutsRef.current = nextStockOuts;
      lastSerializedStateRef.current.stockOuts = JSON.stringify(nextStockOuts);
      safeStorage.setItem(STORAGE_KEYS.STOCK_OUTS, JSON.stringify(nextStockOuts));
      realtimeSyncManager.sendMutation('stockOuts', nextStockOuts, 'ADD_STOCK_OUT');
      return nextStockOuts;
    });

    // Reduce product stock in REAL TIME
    setProducts(prev => {
      const nextProducts = prev.map(p => {
        if (p.id === stockOutData.productId) {
          const nextStock = Math.max(0, p.stock - stockOutData.quantity);
          return {
            ...p,
            stock: nextStock,
          };
        }
        return p;
      });
      productsRef.current = nextProducts;
      lastSerializedStateRef.current.products = JSON.stringify(nextProducts);
      safeStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(nextProducts));
      realtimeSyncManager.sendMutation('products', nextProducts, 'STOCK_OUT_DEDUCT');
      return nextProducts;
    });

    // Record in inventory audit trail
    const currentStock = productsRef.current.find(p => p.id === stockOutData.productId)?.stock || 0;
    const newLog: InventoryLog = {
      id: createLogId('log-so'),
      timestamp: new Date().toISOString(),
      productId: stockOutData.productId,
      productName: stockOutData.productName,
      sku: stockOutData.sku,
      type: 'Adjustment',
      quantityChange: -stockOutData.quantity,
      stockAfter: Math.max(0, currentStock - stockOutData.quantity),
      note: `Stock Out (${stockOutData.reason}): ${stockOutData.notes || 'Warehouse adjustment'} (-$${stockOutData.costImpact.toFixed(2)})`,
    };

    setInventoryLogs(prev => {
      const nextLogs = deduplicateLogs([newLog, ...prev]);
      inventoryLogsRef.current = nextLogs;
      lastSerializedStateRef.current.inventoryLogs = JSON.stringify(nextLogs);
      safeStorage.setItem(STORAGE_KEYS.INVENTORY_LOGS, JSON.stringify(nextLogs));
      realtimeSyncManager.sendMutation('inventoryLogs', nextLogs, 'STOCK_OUT_LOG');
      return nextLogs;
    });

    triggerImmediateSnapshotRef.current?.();
    return newStockOut;
  }, []);

  // Delete Stock Out (Restores stock in real time)
  const deleteStockOut = useCallback((stockOutId: string) => {
    const so = stockOutsRef.current.find(s => s.id === stockOutId);
    if (so) {
      const prod = productsRef.current.find(p => p.id === so.productId);
      const currentStock = prod?.stock || 0;

      // Restore stock in real time
      setProducts(currProducts => {
        const nextProducts = currProducts.map(prodItem => {
          if (prodItem.id === so.productId) {
            return {
              ...prodItem,
              stock: prodItem.stock + so.quantity,
            };
          }
          return prodItem;
        });
        productsRef.current = nextProducts;
        lastSerializedStateRef.current.products = JSON.stringify(nextProducts);
        safeStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(nextProducts));
        realtimeSyncManager.sendMutation('products', nextProducts, 'RESTORE_STOCK_OUT');
        return nextProducts;
      });

      const newLog: InventoryLog = {
        id: createLogId('log-so-del'),
        timestamp: new Date().toISOString(),
        productId: so.productId,
        productName: so.productName,
        sku: so.sku,
        type: 'Adjustment',
        quantityChange: so.quantity,
        stockAfter: currentStock + so.quantity,
        note: `Stock Out record (${so.reason}) deleted/reversed (+${so.quantity} units)`,
      };

      setInventoryLogs(logs => {
        const nextLogs = deduplicateLogs([newLog, ...logs]);
        inventoryLogsRef.current = nextLogs;
        lastSerializedStateRef.current.inventoryLogs = JSON.stringify(nextLogs);
        safeStorage.setItem(STORAGE_KEYS.INVENTORY_LOGS, JSON.stringify(nextLogs));
        realtimeSyncManager.sendMutation('inventoryLogs', nextLogs, 'DELETE_STOCK_OUT_LOG');
        return nextLogs;
      });
    }

    setStockOuts(prev => {
      const nextStockOuts = prev.filter(s => s.id !== stockOutId);
      stockOutsRef.current = nextStockOuts;
      lastSerializedStateRef.current.stockOuts = JSON.stringify(nextStockOuts);
      safeStorage.setItem(STORAGE_KEYS.STOCK_OUTS, JSON.stringify(nextStockOuts));
      realtimeSyncManager.sendMutation('stockOuts', nextStockOuts, 'DELETE_STOCK_OUT');
      triggerImmediateSnapshotRef.current?.();
      return nextStockOuts;
    });
  }, []);

  // Clear Accounting Records Handlers
  const clearPurchases = useCallback(() => {
    purchasesRef.current = [];
    lastSerializedStateRef.current.purchases = JSON.stringify([]);
    setPurchases([]);
    safeStorage.removeItem(STORAGE_KEYS.PURCHASES);
    realtimeSyncManager.sendMutation('purchases', [], 'CLEAR_PURCHASES');
    triggerImmediateSnapshotRef.current?.();
  }, []);

  const clearStockOuts = useCallback(() => {
    stockOutsRef.current = [];
    lastSerializedStateRef.current.stockOuts = JSON.stringify([]);
    setStockOuts([]);
    safeStorage.removeItem(STORAGE_KEYS.STOCK_OUTS);
    realtimeSyncManager.sendMutation('stockOuts', [], 'CLEAR_STOCK_OUTS');
    triggerImmediateSnapshotRef.current?.();
  }, []);

  const clearSalesIncome = useCallback(() => {
    ordersRef.current = [];
    posSalesRef.current = [];
    lastSerializedStateRef.current.orders = JSON.stringify([]);
    lastSerializedStateRef.current.posSales = JSON.stringify([]);
    setOrders([]);
    setPosSales([]);
    safeStorage.removeItem(STORAGE_KEYS.ORDERS);
    safeStorage.removeItem(STORAGE_KEYS.POS_SALES);
    realtimeSyncManager.sendMutation('orders', [], 'CLEAR_ORDERS');
    realtimeSyncManager.sendMutation('posSales', [], 'CLEAR_POS_SALES');
    triggerImmediateSnapshotRef.current?.();
  }, []);

  const clearAllAccountingRecords = useCallback(() => {
    purchasesRef.current = [];
    stockOutsRef.current = [];
    purchaseOrdersRef.current = [];
    ordersRef.current = [];
    posSalesRef.current = [];
    lastSerializedStateRef.current.purchases = JSON.stringify([]);
    lastSerializedStateRef.current.stockOuts = JSON.stringify([]);
    lastSerializedStateRef.current.purchaseOrders = JSON.stringify([]);
    lastSerializedStateRef.current.orders = JSON.stringify([]);
    lastSerializedStateRef.current.posSales = JSON.stringify([]);
    setPurchases([]);
    setStockOuts([]);
    setPurchaseOrders([]);
    setOrders([]);
    setPosSales([]);
    safeStorage.removeItem(STORAGE_KEYS.PURCHASES);
    safeStorage.removeItem(STORAGE_KEYS.STOCK_OUTS);
    safeStorage.removeItem(STORAGE_KEYS.PURCHASE_ORDERS);
    safeStorage.removeItem(STORAGE_KEYS.ORDERS);
    safeStorage.removeItem(STORAGE_KEYS.POS_SALES);
    realtimeSyncManager.sendMutation('purchases', [], 'CLEAR_PURCHASES');
    realtimeSyncManager.sendMutation('stockOuts', [], 'CLEAR_STOCK_OUTS');
    realtimeSyncManager.sendMutation('purchaseOrders', [], 'CLEAR_PURCHASE_ORDERS');
    realtimeSyncManager.sendMutation('orders', [], 'CLEAR_ORDERS');
    realtimeSyncManager.sendMutation('posSales', [], 'CLEAR_POS_SALES');
    triggerImmediateSnapshotRef.current?.();
  }, []);

  // ================= PURCHASE ORDERS & REAL-TIME STOCK IN =================
  const createPurchaseOrder = useCallback((poData: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt'>): PurchaseOrder => {
    const poNumber = `PO-${new Date().getFullYear()}-${String(purchaseOrders.length + 1).padStart(3, '0')}`;
    const newPO: PurchaseOrder = {
      ...poData,
      id: `po-${Date.now()}`,
      poNumber,
      createdAt: new Date().toISOString(),
    };

    setPurchaseOrders(prev => {
      const nextPOs = [newPO, ...prev];
      purchaseOrdersRef.current = nextPOs;
      lastSerializedStateRef.current.purchaseOrders = JSON.stringify(nextPOs);
      safeStorage.setItem(STORAGE_KEYS.PURCHASE_ORDERS, JSON.stringify(nextPOs));
      realtimeSyncManager.sendMutation('purchaseOrders', nextPOs, 'CREATE_PURCHASE_ORDER');
      return nextPOs;
    });

    // If created with status 'RECEIVED', automatically trigger Stock In
    if (poData.status === 'RECEIVED') {
      setTimeout(() => {
        receivePurchaseOrder(newPO.id);
      }, 0);
    }

    triggerImmediateSnapshotRef.current?.();
    return newPO;
  }, [purchaseOrders]);

  const updatePurchaseOrderStatus = useCallback((poId: string, status: PurchaseOrderStatus) => {
    setPurchaseOrders(prev => {
      const nextPOs = prev.map(po => {
        if (po.id === poId) {
          return {
            ...po,
            status,
            receivedAt: status === 'RECEIVED' ? (po.receivedAt || new Date().toISOString()) : po.receivedAt,
          };
        }
        return po;
      });
      purchaseOrdersRef.current = nextPOs;
      lastSerializedStateRef.current.purchaseOrders = JSON.stringify(nextPOs);
      safeStorage.setItem(STORAGE_KEYS.PURCHASE_ORDERS, JSON.stringify(nextPOs));
      realtimeSyncManager.sendMutation('purchaseOrders', nextPOs, 'UPDATE_PO_STATUS');
      triggerImmediateSnapshotRef.current?.();
      return nextPOs;
    });
  }, []);

  const receivePurchaseOrder = useCallback((poId: string, receivedItems?: { productId: string; quantityReceived: number }[]): { success: boolean; message: string } => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return { success: false, message: 'Purchase order not found.' };

    const itemsToProcess = receivedItems && receivedItems.length > 0
      ? receivedItems
      : po.items.map(i => ({ productId: i.productId, quantityReceived: i.quantityOrdered - (i.quantityReceived || 0) }));

    const validReceives = itemsToProcess.filter(i => i.quantityReceived > 0);
    if (validReceives.length === 0) {
      return { success: false, message: 'All items in this purchase order have already been received.' };
    }

    // 1. Update product stock in REAL TIME
    setProducts(prevProducts => {
      const nextProducts = prevProducts.map(prod => {
        const match = validReceives.find(r => r.productId === prod.id);
        if (match) {
          const poItem = po.items.find(i => i.productId === prod.id);
          const newStock = prod.stock + match.quantityReceived;
          const newCost = poItem && poItem.unitCostPrice > 0 ? poItem.unitCostPrice : prod.costPrice;
          return {
            ...prod,
            stock: newStock,
            costPrice: newCost,
          };
        }
        return prod;
      });
      productsRef.current = nextProducts;
      lastSerializedStateRef.current.products = JSON.stringify(nextProducts);
      safeStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(nextProducts));
      realtimeSyncManager.sendMutation('products', nextProducts, 'PO_RECEIVE_STOCK');
      return nextProducts;
    });

    // 2. Create Purchase Records (Purchase In ledger entries)
    const nowIso = new Date().toISOString();
    const todayDate = nowIso.split('T')[0];
    const newPurchases: PurchaseRecord[] = validReceives.map(rec => {
      const poItem = po.items.find(i => i.productId === rec.productId);
      const prod = products.find(p => p.id === rec.productId);
      const unitCost = poItem?.unitCostPrice || prod?.costPrice || 0;
      return {
        id: `pur-${Date.now()}-${rec.productId}`,
        productId: rec.productId,
        productName: poItem?.productName || prod?.name || 'Product',
        sku: poItem?.sku || prod?.sku || 'SKU',
        quantity: rec.quantityReceived,
        unitCostPrice: unitCost,
        totalCost: unitCost * rec.quantityReceived,
        supplierName: po.supplierName,
        invoiceNumber: `${po.poNumber}-REC`,
        date: todayDate,
        notes: `Received from Purchase Order ${po.poNumber}.`,
        recordedBy: currentUser?.name || 'Authorized Staff',
        createdAt: nowIso,
        poId: po.id,
      };
    });

    setPurchases(prev => {
      const nextPurchases = [...newPurchases, ...prev];
      purchasesRef.current = nextPurchases;
      lastSerializedStateRef.current.purchases = JSON.stringify(nextPurchases);
      safeStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(nextPurchases));
      realtimeSyncManager.sendMutation('purchases', nextPurchases, 'PO_RECEIVE_PURCHASES');
      return nextPurchases;
    });

    // 3. Add inventory logs in real time
    const newLogs: InventoryLog[] = validReceives.map((rec, idx) => {
      const prod = products.find(p => p.id === rec.productId);
      const currentStock = prod?.stock || 0;
      return {
        id: createLogId(`log-po-rec-${rec.productId}-${idx}`),
        timestamp: nowIso,
        productId: rec.productId,
        productName: prod?.name || 'Product',
        sku: prod?.sku || 'SKU',
        type: 'Restock' as const,
        quantityChange: rec.quantityReceived,
        stockAfter: currentStock + rec.quantityReceived,
        note: `PO Stock In (${po.poNumber}) from ${po.supplierName} (+${rec.quantityReceived} units)`,
      };
    });

    setInventoryLogs(prev => {
      const nextLogs = deduplicateLogs([...newLogs, ...prev]);
      inventoryLogsRef.current = nextLogs;
      lastSerializedStateRef.current.inventoryLogs = JSON.stringify(nextLogs);
      safeStorage.setItem(STORAGE_KEYS.INVENTORY_LOGS, JSON.stringify(nextLogs));
      realtimeSyncManager.sendMutation('inventoryLogs', nextLogs, 'PO_RECEIVE_LOGS');
      return nextLogs;
    });

    // 4. Update the PO status and received quantities
    setPurchaseOrders(prev => {
      const nextPOs = prev.map(p => {
        if (p.id === poId) {
          const updatedItems = p.items.map(item => {
            const rec = validReceives.find(r => r.productId === item.productId);
            if (rec) {
              return {
                ...item,
                quantityReceived: (item.quantityReceived || 0) + rec.quantityReceived,
              };
            }
            return item;
          });

          const allFullyReceived = updatedItems.every(i => (i.quantityReceived || 0) >= i.quantityOrdered);
          const newStatus: PurchaseOrderStatus = allFullyReceived ? 'RECEIVED' : 'ORDERED';
          return {
            ...p,
            items: updatedItems,
            status: newStatus,
            receivedAt: nowIso,
          };
        }
        return p;
      });
      purchaseOrdersRef.current = nextPOs;
      lastSerializedStateRef.current.purchaseOrders = JSON.stringify(nextPOs);
      safeStorage.setItem(STORAGE_KEYS.PURCHASE_ORDERS, JSON.stringify(nextPOs));
      realtimeSyncManager.sendMutation('purchaseOrders', nextPOs, 'PO_RECEIVE_STATUS');
      return nextPOs;
    });

    triggerImmediateSnapshotRef.current?.();
    const totalUnits = validReceives.reduce((sum, i) => sum + i.quantityReceived, 0);
    return { 
      success: true, 
      message: `Successfully received ${totalUnits} units for PO ${po.poNumber}. Real-time inventory stock updated!` 
    };
  }, [purchaseOrders, products, currentUser]);

  const deletePurchaseOrder = useCallback((poId: string) => {
    setPurchaseOrders(prev => {
      const nextPOs = prev.filter(po => po.id !== poId);
      purchaseOrdersRef.current = nextPOs;
      lastSerializedStateRef.current.purchaseOrders = JSON.stringify(nextPOs);
      safeStorage.setItem(STORAGE_KEYS.PURCHASE_ORDERS, JSON.stringify(nextPOs));
      realtimeSyncManager.sendMutation('purchaseOrders', nextPOs, 'DELETE_PURCHASE_ORDER');
      triggerImmediateSnapshotRef.current?.();
      return nextPOs;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setProducts(INITIAL_PRODUCTS);
    setSettings(INITIAL_SHOP_SETTINGS);
    setUsers(INITIAL_USERS);
    setCurrentUserId(INITIAL_USERS[0].id);
    setCouriers(INITIAL_COURIERS);
    setDeliveryTrackings(INITIAL_DELIVERY_TRACKINGS);
    setPurchaseOrders(INITIAL_PURCHASE_ORDERS);
    setPurchases(INITIAL_PURCHASES);
    setStockOuts(INITIAL_STOCK_OUTS);
    safeStorage.clear();
  }, []);

  // Online Storefront Order Placement
  const placeOrder = useCallback(async (
    customer: Order['customer'],
    paymentMethod: Order['paymentMethod'],
    paymentGatewayProvider: string,
    discountAmount?: number
  ): Promise<Order> => {
    const subtotal = cartSubtotal;
    const effectiveDiscount = discountAmount !== undefined ? discountAmount : cartDiscountAmount;
    const shippingFee = subtotal >= settings.freeShippingThreshold ? 0 : settings.standardShippingFee;
    const discount = Math.min(subtotal, Math.max(0, effectiveDiscount));
    const total = Math.max(0, subtotal - discount + shippingFee);

    const orderId = `COS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const transactionId = `TXN-${paymentMethod.toUpperCase()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    const orderItems: Order['items'] = cart.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      sku: item.product.sku,
      price: item.product.price,
      quantity: item.quantity,
      image: item.product.images[0],
    }));

    const newOrder: Order = {
      id: orderId,
      date: new Date().toISOString(),
      customer,
      items: orderItems,
      subtotal,
      discount,
      shippingFee,
      total,
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'Pending COD' : 'Paid',
      fulfillmentStatus: 'Pending',
      transactionId,
      paymentGatewayProvider,
      notes: customer.notes,
    };

    // Reduce stock
    setProducts(prevProducts => {
      const nextProds = prevProducts.map(prod => {
        const cartItem = cart.find(ci => ci.product.id === prod.id);
        if (cartItem) {
          const newStock = Math.max(0, prod.stock - cartItem.quantity);
          return { ...prod, stock: newStock };
        }
        return prod;
      });
      productsRef.current = nextProds;
      lastSerializedStateRef.current.products = JSON.stringify(nextProds);
      safeStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(nextProds));
      realtimeSyncManager.sendMutation('products', nextProds, 'ORDER_STOCK_DECREMENT');
      return nextProds;
    });

    // Record logs
    const newLogs: InventoryLog[] = cart.map((item, idx) => {
      const prod = products.find(p => p.id === item.product.id);
      const stockAfter = prod ? Math.max(0, prod.stock - item.quantity) : 0;
      return {
        id: createLogId(`log-sale-${item.product.id}-${idx}`),
        timestamp: new Date().toISOString(),
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        type: 'Sale',
        quantityChange: -item.quantity,
        stockAfter,
        note: `Online Order ${orderId} (${customer.fullName})`,
      };
    });

    setInventoryLogs(prev => {
      const nextLogs = deduplicateLogs([...newLogs, ...prev]);
      inventoryLogsRef.current = nextLogs;
      lastSerializedStateRef.current.inventoryLogs = JSON.stringify(nextLogs);
      safeStorage.setItem(STORAGE_KEYS.INVENTORY_LOGS, JSON.stringify(nextLogs));
      realtimeSyncManager.sendMutation('inventoryLogs', nextLogs, 'ORDER_LOGS');
      return nextLogs;
    });

    setOrders(prev => {
      const nextOrders = [newOrder, ...prev];
      ordersRef.current = nextOrders;
      lastSerializedStateRef.current.orders = JSON.stringify(nextOrders);
      safeStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(nextOrders));
      realtimeSyncManager.sendMutation('orders', nextOrders, 'PLACE_ORDER');
      return nextOrders;
    });

    clearCart();
    setLastPlacedOrder(newOrder);

    return newOrder;
  }, [cart, cartSubtotal, cartDiscountAmount, settings, products, clearCart]);

  // Order Fulfillment & Tracking connection
  const updateOrderStatus = useCallback((
    orderId: string, 
    fulfillmentStatus: FulfillmentStatus, 
    trackingNumber?: string
  ) => {
    setOrders(prev => {
      const nextOrders = prev.map(o => {
        if (o.id === orderId) {
          const updatedTracking = trackingNumber !== undefined ? trackingNumber : o.trackingNumber;
          return {
            ...o,
            fulfillmentStatus,
            trackingNumber: updatedTracking,
          };
        }
        return o;
      });
      ordersRef.current = nextOrders;
      lastSerializedStateRef.current.orders = JSON.stringify(nextOrders);
      safeStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(nextOrders));
      realtimeSyncManager.sendMutation('orders', nextOrders, 'UPDATE_ORDER_STATUS');
      return nextOrders;
    });

    // If order was moved to Shipped, ensure it has a delivery tracking entry
    if (fulfillmentStatus === 'Shipped') {
      const order = orders.find(o => o.id === orderId);
      if (order && !deliveryTrackings.some(d => d.orderId === orderId)) {
        const generatedTrackingNum = trackingNumber || `VET-PHN-${Math.floor(1000 + Math.random() * 9000)}`;
        const newTracking: DeliveryTracking = {
          orderId,
          trackingNumber: generatedTrackingNum,
          customerName: order.customer.fullName,
          customerPhone: order.customer.phoneNumber,
          destinationAddress: order.customer.address,
          destinationDistrict: order.customer.city || 'Phnom Penh',
          courier: {
            id: 'cour-01',
            name: 'Rithy Chhun (Express)',
            phone: '077 445 667',
            avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&h=200&q=80',
            vehicle: 'Honda Wave 110i (Motorbike)',
            plateNumber: 'PP-1BC-4492',
            rating: 4.9,
            currentSpeedKmH: 32,
          },
          status: 'IN_TRANSIT',
          progressPercent: 30,
          estimatedMinutesRemaining: 25,
          distanceRemainingKm: 4.5,
          storeHotline: settings.phone,
          milestones: [
            {
              stage: 'ORDER_PLACED',
              label: 'Order Confirmed',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              completed: true,
              description: 'Customer order placed & verified by Chan Online Shop.',
            },
            {
              stage: 'PACKED',
              label: 'Packed & Dispatched',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              completed: true,
              description: 'Item packed in tamper-proof seal and handed to courier.',
            },
            {
              stage: 'IN_TRANSIT',
              label: 'Courier In Transit',
              timestamp: 'In Progress',
              completed: true,
              description: 'Courier en route with live GPS route guidance.',
            },
            {
              stage: 'DELIVERED',
              label: 'Delivered to Customer',
              timestamp: 'Pending',
              completed: false,
              description: 'Signed delivery with cash receipt.',
            },
          ],
        };
        setDeliveryTrackings(prev => {
          const nextTrackings = [newTracking, ...prev];
          deliveryTrackingsRef.current = nextTrackings;
          lastSerializedStateRef.current.deliveryTrackings = JSON.stringify(nextTrackings);
          safeStorage.setItem(STORAGE_KEYS.DELIVERY_TRACKINGS, JSON.stringify(nextTrackings));
          realtimeSyncManager.sendMutation('deliveryTrackings', nextTrackings, 'ADD_DELIVERY_TRACKING');
          return nextTrackings;
        });
      }
    }
  }, [orders, deliveryTrackings, settings.phone]);

  const deleteOrder = useCallback((orderId: string) => {
    setOrders(prev => {
      const nextOrders = prev.filter(o => o.id !== orderId);
      ordersRef.current = nextOrders;
      lastSerializedStateRef.current.orders = JSON.stringify(nextOrders);
      safeStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(nextOrders));
      realtimeSyncManager.sendMutation('orders', nextOrders, 'DELETE_ORDER');
      return nextOrders;
    });
    setDeliveryTrackings(prev => {
      const nextTrackings = prev.filter(t => t.orderId !== orderId);
      deliveryTrackingsRef.current = nextTrackings;
      lastSerializedStateRef.current.deliveryTrackings = JSON.stringify(nextTrackings);
      safeStorage.setItem(STORAGE_KEYS.DELIVERY_TRACKINGS, JSON.stringify(nextTrackings));
      realtimeSyncManager.sendMutation('deliveryTrackings', nextTrackings, 'DELETE_DELIVERY_TRACKING');
      return nextTrackings;
    });
  }, []);

  const seedSampleOrders = useCallback(() => {
    setOrders(INITIAL_ORDERS);
    safeStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
    realtimeSyncManager.sendMutation('orders', INITIAL_ORDERS, 'SEED_SAMPLE_ORDERS');
  }, []);

  const updateOrderDiscount = useCallback((orderId: string, discountAmount: number) => {
    setOrders(prev => {
      const next = prev.map(o => {
        if (o.id === orderId) {
          const clamped = Math.min(o.subtotal, Math.max(0, Number(discountAmount.toFixed(2))));
          const newTotal = Math.max(0, o.subtotal - clamped + o.shippingFee);
          return {
            ...o,
            discount: clamped,
            total: newTotal,
          };
        }
        return o;
      });
      // Direct real-time dispatch for zero-latency multi-device sync
      realtimeSyncManager.sendMutation('orders', next, 'UPDATE_DISCOUNT');
      return next;
    });
  }, []);

  const updateSettings = useCallback((updates: Partial<ShopSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      if (updates.theme && (updates.theme === 'light' || updates.theme === 'dark' || updates.theme === 'system')) {
        setThemeState(updates.theme);
        safeStorage.setItem(STORAGE_KEYS.THEME, updates.theme);
      }
      return next;
    });
  }, []);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    safeStorage.setItem(STORAGE_KEYS.THEME, newTheme);

    // Persist in shop settings
    setSettings(prev => {
      const updated = { ...prev, theme: newTheme };
      safeStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      realtimeSyncManager.sendMutation('settings', updated);
      return updated;
    });

    // Also persist in active user profile
    setUsers(prev => {
      const updatedUsers = prev.map(u => (u.id === currentUserId ? { ...u, theme: newTheme } : u));
      safeStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
      realtimeSyncManager.sendMutation('users', updatedUsers);
      return updatedUsers;
    });
  }, [currentUserId]);

  const toggleTheme = useCallback(() => {
    const next: ThemeMode = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  // ================= POS SYSTEM ACTIONS =================
  const completePOSSale = useCallback((
    saleData: Omit<POSSale, 'id' | 'receiptNumber' | 'date'>
  ): POSSale => {
    const saleId = `pos-sale-${Date.now()}`;
    const receiptNumber = `POS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const date = new Date().toISOString();

    const newSale: POSSale = {
      ...saleData,
      id: saleId,
      receiptNumber,
      date,
      isOfflineSyncPending: isOffline || undefined,
    };

    // 1. Decrement products stock in real-time
    setProducts(prevProducts => {
      return prevProducts.map(prod => {
        const itemSold = saleData.items.find(it => it.productId === prod.id);
        if (itemSold) {
          const newStock = Math.max(0, prod.stock - itemSold.quantity);
          return { ...prod, stock: newStock };
        }
        return prod;
      });
    });

    // 2. Generate Inventory Logs for each sold item
    const newLogs: InventoryLog[] = saleData.items.map((item, idx) => {
      const prod = products.find(p => p.id === item.productId);
      const stockAfter = prod ? Math.max(0, prod.stock - item.quantity) : 0;
      return {
        id: createLogId(`log-pos-${item.productId}-${idx}`),
        timestamp: date,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        type: 'Sale',
        quantityChange: -item.quantity,
        stockAfter,
        note: `POS Counter Sale (${receiptNumber}) by Cashier ${saleData.cashierName}`,
      };
    });

    setInventoryLogs(prev => [...newLogs, ...prev]);
    setPosSales(prev => [newSale, ...prev]);
    setLastPOSSale(newSale);

    return newSale;
  }, [products, isOffline]);

  // ================= USER MANAGEMENT & RBAC =================
  const setCurrentUser = useCallback((user: AppUser) => {
    setCurrentUserId(user.id);
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, lastLogin: 'Just now' } : u));
    if (user.theme && (user.theme === 'light' || user.theme === 'dark' || user.theme === 'system')) {
      setThemeState(user.theme);
      safeStorage.setItem(STORAGE_KEYS.THEME, user.theme);
    }
  }, []);

  const addUser = useCallback((userData: Omit<AppUser, 'id' | 'createdAt'>) => {
    const newUser: AppUser = {
      ...userData,
      id: `usr-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      lastLogin: 'Never',
    };
    setUsers(prev => [...prev, newUser]);
  }, []);

  const updateUser = useCallback((id: string, updates: Partial<AppUser>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  }, []);

  const deleteUser = useCallback((id: string): boolean => {
    const target = users.find(u => u.id === id);
    if (!target) return false;
    
    // Prevent deleting last active super admin
    const superAdmins = users.filter(u => u.role === 'SUPER_ADMIN' && u.isActive);
    if (target.role === 'SUPER_ADMIN' && superAdmins.length <= 1) {
      alert('Cannot delete the only Super Admin account.');
      return false;
    }

    setUsers(prev => prev.filter(u => u.id !== id));
    if (currentUserId === id) {
      const remaining = users.find(u => u.id !== id);
      if (remaining) setCurrentUserId(remaining.id);
    }
    return true;
  }, [users, currentUserId]);

  // ================= LIVE DELIVERY ACTIONS =================
  const updateDeliveryStatus = useCallback((
    orderId: string, 
    stage: DeliveryStage, 
    progressPercent?: number
  ) => {
    setDeliveryTrackings(prev => 
      prev.map(item => {
        if (item.orderId === orderId) {
          const newProgress = progressPercent !== undefined 
            ? progressPercent 
            : stage === 'DELIVERED' ? 100 
            : stage === 'ARRIVING' ? 90 
            : stage === 'IN_TRANSIT' ? 65 
            : stage === 'RIDER_PICKED_UP' ? 40 
            : 20;

          const updatedMilestones = item.milestones.map(m => {
            if (m.stage === stage) {
              return { 
                ...m, 
                completed: true, 
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
              };
            }
            return m;
          });

          return {
            ...item,
            status: stage,
            progressPercent: newProgress,
            estimatedMinutesRemaining: stage === 'DELIVERED' ? 0 : Math.max(2, Math.round((100 - newProgress) * 0.4)),
            distanceRemainingKm: stage === 'DELIVERED' ? 0 : Number(((100 - newProgress) * 0.05).toFixed(1)),
            milestones: updatedMilestones,
          };
        }
        return item;
      })
    );

    // If marked delivered, also sync to Order fulfillment status
    if (stage === 'DELIVERED') {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, fulfillmentStatus: 'Delivered' } : o));
    }
  }, []);

  const addCourier = useCallback((courierData: Omit<DeliveryCourier, 'id'>): DeliveryCourier => {
    const newCourier: DeliveryCourier = {
      ...courierData,
      id: `cour-${Date.now()}`,
      rating: courierData.rating || 5.0,
      currentSpeedKmH: courierData.currentSpeedKmH || 35,
    };
    setCouriers(prev => [newCourier, ...prev]);
    return newCourier;
  }, []);

  const updateCourier = useCallback((id: string, updates: Partial<DeliveryCourier>) => {
    setCouriers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    setDeliveryTrackings(prev => prev.map(dt => dt.courier.id === id ? { ...dt, courier: { ...dt.courier, ...updates } } : dt));
  }, []);

  const deleteCourier = useCallback((id: string) => {
    setCouriers(prev => prev.filter(c => c.id !== id));
  }, []);

  const dispatchOrderDelivery = useCallback((orderId: string, courier?: DeliveryCourier | string): DeliveryTracking => {
    const order = orders.find(o => o.id === orderId);
    const trackingNum = `VET-PHN-${Math.floor(2000 + Math.random() * 8000)}`;
    
    let assignedCourier: DeliveryCourier;
    if (courier && typeof courier === 'object' && courier.id) {
      assignedCourier = courier;
    } else if (typeof courier === 'string' && courier.trim()) {
      const found = couriers.find(c => c.id === courier || c.name.toLowerCase() === courier.toLowerCase());
      assignedCourier = found || {
        id: `cour-${Date.now()}`,
        name: courier,
        phone: '085 332 119',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80',
        vehicle: 'Honda Dream 125 (Motorbike)',
        plateNumber: 'PP-1K-4492',
        rating: 4.95,
        currentSpeedKmH: 35,
      };
    } else {
      assignedCourier = couriers[0] || {
        id: 'cour-01',
        name: 'Dara Sok (Express Delivery)',
        phone: '085 332 119',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80',
        vehicle: 'Honda Dream 125 (Motorbike)',
        plateNumber: 'PP-1K-4492',
        rating: 4.95,
        currentSpeedKmH: 35,
      };
    }

    const newTracking: DeliveryTracking = {
      orderId,
      trackingNumber: trackingNum,
      customerName: order ? order.customer.fullName : 'Valued Customer',
      customerPhone: order ? order.customer.phoneNumber : '070 433 464',
      destinationAddress: order ? order.customer.address : 'Phnom Penh Downtown',
      destinationDistrict: order?.customer.city || 'Phnom Penh',
      courier: assignedCourier,
      status: 'RIDER_PICKED_UP',
      progressPercent: 35,
      estimatedMinutesRemaining: 18,
      distanceRemainingKm: 3.4,
      storeHotline: settings.phone,
      milestones: [
        {
          stage: 'ORDER_PLACED',
          label: 'Order Verified',
          timestamp: '10:00 AM',
          completed: true,
          description: 'Payment checked and packaging cleared.',
        },
        {
          stage: 'PACKED',
          label: 'Dispatched to Rider',
          timestamp: '10:15 AM',
          completed: true,
          description: `Package handed to ${assignedCourier.name} (${assignedCourier.vehicle}) at Street 271 warehouse.`,
        },
        {
          stage: 'RIDER_PICKED_UP',
          label: 'Rider Picked Up',
          timestamp: '10:20 AM',
          completed: true,
          description: 'Courier en route to delivery address with live radar telemetry.',
        },
        {
          stage: 'DELIVERED',
          label: 'Customer Handover',
          timestamp: 'Pending',
          completed: false,
          description: 'Recipient signature and payment receipt.',
        },
      ],
    };

    setDeliveryTrackings(prev => [newTracking, ...prev]);
    updateOrderStatus(orderId, 'Shipped', trackingNum);
    return newTracking;
  }, [orders, couriers, settings.phone, updateOrderStatus]);

  const createQuickDelivery = useCallback((deliveryData: {
    customerName?: string;
    customerPhone?: string;
    destinationAddress?: string;
    destinationDistrict?: string;
    courierId?: string;
    courierName?: string;
    orderId?: string;
  }): DeliveryTracking => {
    const assignedCourier = couriers.find(c => c.id === deliveryData.courierId) ||
      couriers.find(c => c.name === deliveryData.courierName) ||
      couriers[0] || {
        id: 'cour-01',
        name: 'Dara Sok (Express Delivery)',
        phone: '085 332 119',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80',
        vehicle: 'Honda Dream 125 (Motorbike)',
        plateNumber: 'PP-1K-4492',
        rating: 4.95,
        currentSpeedKmH: 35,
      };

    const trackingNum = `VET-PHN-${Math.floor(2000 + Math.random() * 8000)}`;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newTracking: DeliveryTracking = {
      orderId: deliveryData.orderId || `DIR-${Date.now().toString().slice(-4)}`,
      trackingNumber: trackingNum,
      customerName: deliveryData.customerName || 'Direct Customer',
      customerPhone: deliveryData.customerPhone || '070 433 464',
      destinationAddress: deliveryData.destinationAddress || 'Phnom Penh Downtown',
      destinationDistrict: deliveryData.destinationDistrict || 'Phnom Penh',
      courier: assignedCourier,
      status: 'IN_TRANSIT',
      progressPercent: 30,
      estimatedMinutesRemaining: 18,
      distanceRemainingKm: 3.2,
      storeHotline: settings.phone,
      milestones: [
        {
          stage: 'ORDER_PLACED',
          label: 'Order Verified',
          timestamp: nowTime,
          completed: true,
          description: 'Direct consignment registered at Store Hub St. 271.',
        },
        {
          stage: 'PACKED',
          label: 'Dispatched to Rider',
          timestamp: nowTime,
          completed: true,
          description: `Package assigned to ${assignedCourier.name} (${assignedCourier.vehicle}).`,
        },
        {
          stage: 'RIDER_PICKED_UP',
          label: 'Rider Picked Up',
          timestamp: nowTime,
          completed: true,
          description: 'Courier departed hub en route to destination.',
        },
        {
          stage: 'IN_TRANSIT',
          label: 'In Transit',
          timestamp: 'Live GPS',
          completed: true,
          description: 'Active radar telemetry tracking rider in motion.',
        },
        {
          stage: 'ARRIVING',
          label: 'Arriving at Destination',
          timestamp: 'Pending',
          completed: false,
          description: 'Driver approaching delivery coordinates.',
        },
        {
          stage: 'DELIVERED',
          label: 'Customer Handover',
          timestamp: 'Pending',
          completed: false,
          description: 'Recipient signature and completed delivery.',
        },
      ],
    };

    setDeliveryTrackings(prev => [newTracking, ...prev]);
    return newTracking;
  }, [couriers, settings.phone]);

  // ================= DRIVE SYNC & BACKUP / RESTORE =================
  const exportBackupJSON = useCallback((): string => {
    const backup: SystemBackupPayload = {
      version: '3.0.0',
      exportedAt: new Date().toISOString(),
      shopName: settings.shopName,
      hotline: settings.phone,
      data: {
        products,
        orders,
        inventoryLogs,
        posSales,
        users,
        settings,
        categories,
        purchases,
        stockOuts,
        purchaseOrders,
        deliveryTrackings,
        couriers,
      },
    };
    return JSON.stringify(backup, null, 2);
  }, [products, orders, inventoryLogs, posSales, users, settings, categories, purchases, stockOuts, purchaseOrders, deliveryTrackings, couriers]);

  const isOfflineRef = useRef(isOffline);
  useEffect(() => {
    isOfflineRef.current = isOffline;
  }, [isOffline]);

  const syncToGoogleDrive = useCallback(async (syncType: 'MANUAL' | 'AUTO_MINUTE' | 'AUTO_ON_UPDATE' = 'MANUAL'): Promise<{ success: boolean; snapshot: DriveSnapshot }> => {
    // Guard against network outage / offline mode
    if (isOfflineRef.current) {
      setIsAutoSyncing(false);
      setAutoSyncStatus('ERROR');
      const offlineMsg = 'Network Offline: Google Drive cloud sync paused. Local data saved safely on device.';
      console.warn(offlineMsg);
      return {
        success: false,
        snapshot: {
          id: 'offline-blocked',
          timestamp: new Date().toISOString(),
          name: 'Sync Paused (Offline Mode)',
          sizeKb: 0,
          deviceSource: 'Local Offline Device',
          targetEmail: settings.googleDriveEmail || 'chanonlineshop95@gmail.com',
          syncType,
          recordCount: { products: 0, orders: 0, posSales: 0, logs: 0, users: 0 },
          syncedToGoogleDrive: false,
        }
      };
    }

    setIsAutoSyncing(true);
    setAutoSyncStatus('SYNCING');

    // Simulate high-reliability Google Drive API push with snapshot payload
    await new Promise(r => setTimeout(r, 600));

    const randomEntropy = Math.random().toString(36).substring(2, 9);
    const snapshotId = `gdrive-snap-${Date.now()}-${randomEntropy}`;
    const timestamp = new Date().toISOString();
    const driveFileId = `1GDrive_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
    const targetEmail = settings.googleDriveEmail || 'chanonlineshop95@gmail.com';

    let snapshotName = `Manual Cloud Snapshot • ${targetEmail}`;
    let toastMsg = `Manual snapshot synced to Google Drive (${targetEmail})`;

    if (syncType === 'AUTO_MINUTE') {
      snapshotName = `Auto-Sync (1 min) • ${targetEmail}`;
      toastMsg = `Auto-synced data snapshot to Google Drive (${targetEmail})`;
    } else if (syncType === 'AUTO_ON_UPDATE') {
      snapshotName = `Auto-Sync (Data Update) • ${targetEmail}`;
      toastMsg = `Auto-synced to Google Drive on data update (${targetEmail})`;
    }

    const payload: SystemBackupPayload = {
      version: '2.4.0',
      exportedAt: timestamp,
      shopName: settings.shopName,
      hotline: settings.phone,
      data: {
        products,
        orders,
        inventoryLogs,
        posSales,
        users,
        settings,
        categories,
        purchases,
        stockOuts,
        purchaseOrders,
        couriers,
        deliveryTrackings,
      },
    };

    const newSnapshot: DriveSnapshot = {
      id: snapshotId,
      timestamp,
      name: snapshotName,
      sizeKb: Math.max(1, Math.round(JSON.stringify(payload).length / 1024)),
      deviceSource: `Google Drive Sync Engine (${targetEmail})`,
      targetEmail,
      syncType,
      recordCount: {
        products: products.length,
        orders: orders.length,
        posSales: posSales.length,
        logs: inventoryLogs.length,
        users: users.length,
        purchases: purchases.length,
        stockOuts: stockOuts.length,
        purchaseOrders: purchaseOrders.length,
      },
      syncedToGoogleDrive: true,
      driveFileId,
      payload,
    };

    // Cache payload individually in safeStorage for instant restore
    try {
      safeStorage.setItem(`chan_snapshot_payload_${snapshotId}`, JSON.stringify(payload));
    } catch (e) {
      console.warn('Could not cache snapshot payload to safeStorage', e);
    }

    setDriveSnapshots(prev => {
      const filtered = prev.filter(s => s.id !== snapshotId);
      const nextSnapshots = deduplicateSnapshots([newSnapshot, ...filtered]).slice(0, 30);
      driveSnapshotsRef.current = nextSnapshots;
      lastSerializedStateRef.current.driveSnapshots = JSON.stringify(nextSnapshots);
      safeStorage.setItem(STORAGE_KEYS.DRIVE_SNAPSHOTS, JSON.stringify(nextSnapshots));
      realtimeSyncManager.sendMutation('driveSnapshots', nextSnapshots, 'SNAPSHOT_CREATED');
      return nextSnapshots;
    });
    setSettings(prev => ({
      ...prev,
      lastDriveSync: timestamp,
      googleDriveLinked: true,
      googleDriveEmail: targetEmail,
    }));
    setLastAutoSyncTime(timestamp);
    setIsAutoSyncing(false);
    setAutoSyncStatus('SUCCESS');

    // Reset countdown after sync
    setNextSyncCountdown(settings.autoSyncIntervalSeconds || 60);

    setAutoSyncSuccessNotification(toastMsg);

    setTimeout(() => {
      setAutoSyncSuccessNotification(prev => (prev === toastMsg ? null : prev));
      setAutoSyncStatus('IDLE');
    }, 4500);

    return { success: true, snapshot: newSnapshot };
  }, [
    products, 
    orders, 
    posSales, 
    inventoryLogs, 
    users, 
    settings, 
    categories, 
    purchases, 
    stockOuts, 
    purchaseOrders,
    couriers,
    deliveryTrackings
  ]);

  const syncToGoogleDriveRef = useRef(syncToGoogleDrive);
  useEffect(() => {
    syncToGoogleDriveRef.current = syncToGoogleDrive;
  }, [syncToGoogleDrive]);

  // Ref guard to prevent concurrent execution of auto-sync
  const isAutoSyncTriggeringRef = useRef(false);
  const isInitialMountRef = useRef(true);
  const autoSyncDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fast immediate snapshot trigger (used after explicit user actions)
  const triggerImmediateAutoSnapshot = useCallback(() => {
    if (!settingsRef.current.autoSyncDriveEnabled || settingsRef.current.autoSyncOnUpdate === false || isOffline) {
      return;
    }
    if (autoSyncDebounceTimerRef.current) {
      clearTimeout(autoSyncDebounceTimerRef.current);
      autoSyncDebounceTimerRef.current = null;
    }
    if (!isAutoSyncTriggeringRef.current) {
      isAutoSyncTriggeringRef.current = true;
      syncToGoogleDriveRef.current('AUTO_ON_UPDATE')
        .catch(err => {
          console.error('Immediate snapshot sync error:', err);
        })
        .finally(() => {
          isAutoSyncTriggeringRef.current = false;
        });
    }
  }, [isOffline]);

  useEffect(() => {
    triggerImmediateSnapshotRef.current = triggerImmediateAutoSnapshot;
  }, [triggerImmediateAutoSnapshot]);

  // Flush pending auto-sync immediately if tab hides or user switches apps / locks phone
  useEffect(() => {
    const handleFlushSync = () => {
      if (autoSyncDebounceTimerRef.current) {
        clearTimeout(autoSyncDebounceTimerRef.current);
        autoSyncDebounceTimerRef.current = null;
        if (!isAutoSyncTriggeringRef.current && settingsRef.current.autoSyncDriveEnabled && !isOffline) {
          isAutoSyncTriggeringRef.current = true;
          syncToGoogleDriveRef.current('AUTO_ON_UPDATE')
            .catch(() => {})
            .finally(() => {
              isAutoSyncTriggeringRef.current = false;
            });
        }
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        handleFlushSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handleFlushSync);
    window.addEventListener('beforeunload', handleFlushSync);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handleFlushSync);
      window.removeEventListener('beforeunload', handleFlushSync);
    };
  }, [isOffline]);

  // Real-time automatic sync whenever data updates occur with fast 350ms window
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    if (!settings.autoSyncDriveEnabled || settings.autoSyncOnUpdate === false || isOffline) {
      return;
    }

    // Clear any existing pending debounced sync
    if (autoSyncDebounceTimerRef.current) {
      clearTimeout(autoSyncDebounceTimerRef.current);
    }

    // Rapid batching with responsive 350ms window
    autoSyncDebounceTimerRef.current = setTimeout(() => {
      if (!isAutoSyncTriggeringRef.current) {
        isAutoSyncTriggeringRef.current = true;
        syncToGoogleDriveRef.current('AUTO_ON_UPDATE')
          .catch(err => {
            console.error('Auto-sync on update failed:', err);
            setAutoSyncStatus('ERROR');
            setIsAutoSyncing(false);
          })
          .finally(() => {
            isAutoSyncTriggeringRef.current = false;
          });
      }
    }, 350);

    return () => {
      if (autoSyncDebounceTimerRef.current) {
        clearTimeout(autoSyncDebounceTimerRef.current);
      }
    };
  }, [
    products,
    orders,
    inventoryLogs,
    posSales,
    users,
    categories,
    purchases,
    stockOuts,
    purchaseOrders,
    settings.autoSyncDriveEnabled,
    settings.autoSyncOnUpdate,
    isOffline,
  ]);

  // Programmatic Zero-Click Auto-Restore invocation
  const triggerZeroClickAutoRestore = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/sync/latest-snapshot');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.snapshot?.payload?.data) {
          applyCompleteRestoredState(json.snapshot.payload.data, json.snapshot);
          return true;
        }
      }
      return await realtimeSyncManager.pollLatestState(true);
    } catch (e) {
      console.warn('Auto-restore failed:', e);
      return false;
    }
  }, [applyCompleteRestoredState]);

  // 1-minute automatic sync interval with clean timer
  useEffect(() => {
    if (!settings.autoSyncDriveEnabled || isOffline) return;

    const intervalSeconds = settings.autoSyncIntervalSeconds || 60;

    const intervalId = setInterval(() => {
      setNextSyncCountdown(prev => {
        if (prev <= 1) {
          if (!isAutoSyncTriggeringRef.current) {
            isAutoSyncTriggeringRef.current = true;
            Promise.resolve().then(() => {
              syncToGoogleDriveRef.current('AUTO_MINUTE')
                .catch(err => {
                  console.error('Auto-sync failed:', err);
                  setAutoSyncStatus('ERROR');
                  setIsAutoSyncing(false);
                })
                .finally(() => {
                  isAutoSyncTriggeringRef.current = false;
                });
            });
          }
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [settings.autoSyncDriveEnabled, settings.autoSyncIntervalSeconds, isOffline]);

  const restoreFromSnapshot = useCallback((snapshotId: string): { success: boolean; message: string; details?: any } => {
    const snapshot = driveSnapshots.find(s => s.id === snapshotId);
    if (!snapshot) {
      return { success: false, message: `Snapshot "${snapshotId}" not found in Cloud Sync record.` };
    }

    // Attempt to load snapshot payload
    let payload = snapshot.payload;
    if (!payload) {
      try {
        const cached = safeStorage.getItem(`chan_snapshot_payload_${snapshotId}`);
        if (cached) {
          payload = JSON.parse(cached);
        }
      } catch (e) {
        console.warn('Failed to load cached snapshot payload', e);
      }
    }

    // If legacy snapshot or snap-cloud-001 with no payload, assemble default state
    if (!payload || !payload.data) {
      payload = {
        version: '2.4.0',
        exportedAt: snapshot.timestamp,
        shopName: settings.shopName || 'Chan Online Shop',
        hotline: settings.phone || '070 433 464',
        data: {
          products: INITIAL_PRODUCTS,
          orders: orders.slice(0, snapshot.recordCount?.orders || 1),
          inventoryLogs: inventoryLogs.slice(0, snapshot.recordCount?.logs || 1),
          posSales: posSales.slice(0, snapshot.recordCount?.posSales || 1),
          users: INITIAL_USERS,
          settings: INITIAL_SHOP_SETTINGS,
          categories: DEFAULT_CATEGORIES,
          purchases: INITIAL_PURCHASES,
          stockOuts: INITIAL_STOCK_OUTS,
          purchaseOrders: INITIAL_PURCHASE_ORDERS,
        }
      };
    }

    const { data } = payload;
    if (Array.isArray(data.products) && data.products.length > 0) {
      setProducts(data.products);
      try { safeStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data.products)); } catch (e) {}
    }
    if (Array.isArray(data.orders)) {
      setOrders(data.orders);
      try { safeStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(data.orders)); } catch (e) {}
    }
    if (Array.isArray(data.inventoryLogs)) {
      const deduped = deduplicateLogs(data.inventoryLogs);
      setInventoryLogs(deduped);
      try { safeStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(deduped)); } catch (e) {}
    }
    if (Array.isArray(data.posSales)) {
      setPosSales(data.posSales);
      try { safeStorage.setItem(STORAGE_KEYS.POS_SALES, JSON.stringify(data.posSales)); } catch (e) {}
    }
    if (Array.isArray(data.users) && data.users.length > 0) {
      setUsers(data.users);
      try { safeStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(data.users)); } catch (e) {}
    }
    if (Array.isArray(data.categories) && data.categories.length > 0) {
      const sanitized = sanitizeCategories(data.categories);
      setCategories(sanitized);
      try { safeStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(sanitized)); } catch (e) {}
    }
    if (Array.isArray(data.purchases)) {
      setPurchases(data.purchases);
      try { safeStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(data.purchases)); } catch (e) {}
    }
    if (Array.isArray(data.stockOuts)) {
      setStockOuts(data.stockOuts);
      try { safeStorage.setItem(STORAGE_KEYS.STOCK_OUTS, JSON.stringify(data.stockOuts)); } catch (e) {}
    }
    if (Array.isArray(data.purchaseOrders)) {
      setPurchaseOrders(data.purchaseOrders);
      try { safeStorage.setItem(STORAGE_KEYS.PURCHASE_ORDERS, JSON.stringify(data.purchaseOrders)); } catch (e) {}
    }
    if (Array.isArray(data.couriers) && data.couriers.length > 0) {
      setCouriers(data.couriers);
      try { safeStorage.setItem(STORAGE_KEYS.COURIERS, JSON.stringify(data.couriers)); } catch (e) {}
    }
    if (Array.isArray(data.deliveryTrackings)) {
      setDeliveryTrackings(data.deliveryTrackings);
      try { safeStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(data.deliveryTrackings)); } catch (e) {}
    }
    if (data.settings && typeof data.settings === 'object') {
      const mergedSettings = { ...settings, ...data.settings };
      setSettings(mergedSettings);
      try { safeStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(mergedSettings)); } catch (e) {}
    }

    // Log restoration in audit logs
    const restoreLog: InventoryLog = {
      id: createLogId('log-restore'),
      timestamp: new Date().toISOString(),
      productId: 'SYSTEM',
      productName: 'System Database',
      sku: 'RESTORE',
      type: 'Adjustment',
      quantityChange: 0,
      stockAfter: data.products?.length || products.length,
      note: `Restored snapshot "${snapshot.name}" (${snapshot.id})`,
    };
    const finalLogs = [restoreLog, ...(data.inventoryLogs ? deduplicateLogs(data.inventoryLogs) : inventoryLogs)];
    setInventoryLogs(finalLogs);
    try { safeStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(finalLogs)); } catch (e) {}

    // Broadcast full restored state to all connected devices in real time
    realtimeSyncManager.sendFullSync({
      products: data.products || products,
      orders: data.orders || orders,
      inventoryLogs: finalLogs,
      posSales: data.posSales || posSales,
      users: data.users || users,
      settings: (data.settings && typeof data.settings === 'object') ? { ...settings, ...data.settings } : settings,
      categories: data.categories || categories,
      purchases: data.purchases || purchases,
      stockOuts: data.stockOuts || stockOuts,
      purchaseOrders: data.purchaseOrders || purchaseOrders,
      couriers: data.couriers || couriers,
      deliveryTrackings: data.deliveryTrackings || deliveryTrackings,
      driveSnapshots: driveSnapshotsRef.current,
    });

    return {
      success: true,
      message: `System successfully restored to snapshot "${snapshot.name}". All records rolled back to ${new Date(snapshot.timestamp).toLocaleString()}.`,
      details: {
        productsCount: data.products?.length || 0,
        ordersCount: data.orders?.length || 0,
        posSalesCount: data.posSales?.length || 0,
        usersCount: data.users?.length || 0,
        purchasesCount: data.purchases?.length || 0,
      }
    };
  }, [driveSnapshots, settings, orders, inventoryLogs, posSales, products, users, categories, purchases, stockOuts, purchaseOrders, couriers, deliveryTrackings]);

  const deleteDriveSnapshot = useCallback((snapshotId: string) => {
    setDriveSnapshots(prev => {
      const nextSnapshots = prev.filter(s => s.id !== snapshotId);
      driveSnapshotsRef.current = nextSnapshots;
      lastSerializedStateRef.current.driveSnapshots = JSON.stringify(nextSnapshots);
      safeStorage.setItem(STORAGE_KEYS.DRIVE_SNAPSHOTS, JSON.stringify(nextSnapshots));
      realtimeSyncManager.sendMutation('driveSnapshots', nextSnapshots, 'SNAPSHOT_DELETED');
      return nextSnapshots;
    });
  }, []);

  const restoreFromBackupJSON = useCallback((jsonString: string): { success: boolean; message: string; details?: any } => {
    try {
      const parsed = JSON.parse(jsonString) as SystemBackupPayload;
      if (!parsed || !parsed.data) {
        return { success: false, message: 'Invalid backup file format. Missing data root.' };
      }

      const { data } = parsed;
      if (Array.isArray(data.products)) setProducts(data.products);
      if (Array.isArray(data.orders)) setOrders(data.orders);
      if (Array.isArray(data.inventoryLogs)) setInventoryLogs(deduplicateLogs(data.inventoryLogs));
      if (Array.isArray(data.posSales)) setPosSales(data.posSales);
      if (Array.isArray(data.users)) setUsers(data.users);
      if (Array.isArray(data.categories)) setCategories(sanitizeCategories(data.categories));
      if (Array.isArray(data.purchases)) setPurchases(data.purchases);
      if (Array.isArray(data.stockOuts)) setStockOuts(data.stockOuts);
      if (Array.isArray(data.purchaseOrders)) setPurchaseOrders(data.purchaseOrders);
      if (Array.isArray(data.couriers) && data.couriers.length > 0) setCouriers(data.couriers);
      if (Array.isArray(data.deliveryTrackings)) setDeliveryTrackings(data.deliveryTrackings);
      if (data.settings && typeof data.settings === 'object') {
        setSettings(prev => ({ ...prev, ...data.settings }));
      }

      // Broadcast restored full state to all connected devices in real time
      realtimeSyncManager.sendFullSync(data);

      return {
        success: true,
        message: `Successfully restored backup from ${parsed.exportedAt || 'archive'}.`,
        details: {
          productsCount: data.products?.length || 0,
          ordersCount: data.orders?.length || 0,
          posSalesCount: data.posSales?.length || 0,
          purchasesCount: data.purchases?.length || 0,
        }
      };
    } catch (e: any) {
      return { success: false, message: `Failed to parse backup JSON: ${e?.message || 'Syntax error'}` };
    }
  }, []);

  // Pending offline sales queue count
  const pendingOfflineSalesCount = useMemo(() => {
    return posSales.filter(s => s.isOfflineSyncPending).length;
  }, [posSales]);

  // Bulk sync queued offline sales once connection is restored
  const syncOfflineQueue = useCallback(async (): Promise<{ syncedCount: number; success: boolean }> => {
    const pendingSales = posSales.filter(s => s.isOfflineSyncPending);
    if (pendingSales.length === 0) {
      return { syncedCount: 0, success: true };
    }

    // Mark all pending sales as synced in the local store
    setPosSales(prev => prev.map(sale => {
      if (sale.isOfflineSyncPending) {
        return { ...sale, isOfflineSyncPending: false };
      }
      return sale;
    }));

    // Trigger Google Drive cloud sync if Drive sync is enabled
    if (settings.autoSyncDriveEnabled) {
      try {
        await syncToGoogleDrive('AUTO_ON_UPDATE');
      } catch (err) {
        console.warn('Google Drive sync after offline reconnection had warning:', err);
      }
    }

    return { syncedCount: pendingSales.length, success: true };
  }, [posSales, settings.autoSyncDriveEnabled, syncToGoogleDrive]);

  // Product Image Fit Mode ('contain' = whole product cleanly visible with neutral padding, 'cover' = fill edge-to-edge)
  const [productImageFit, setProductImageFitState] = useState<'contain' | 'cover'>(() => {
    try {
      const stored = safeStorage.getItem(STORAGE_KEYS.IMAGE_FIT);
      if (stored === 'contain' || stored === 'cover') return stored;
    } catch (e) {}
    return 'contain';
  });

  const setProductImageFit = useCallback((fit: 'contain' | 'cover') => {
    setProductImageFitState(fit);
    try {
      safeStorage.setItem(STORAGE_KEYS.IMAGE_FIT, fit);
    } catch (e) {}
  }, []);

  return (
    <StoreContext.Provider
      value={{
        products,
        cart,
        orders,
        inventoryLogs,
        settings,
        activeView,
        setActiveView,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        cartCount,
        cartSubtotal,
        cartDiscountType,
        cartDiscountValue,
        cartDiscountAmount,
        setCartDiscount,
        clearCartDiscount,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        resetToDefaults,
        placeOrder,
        updateOrderStatus,
        updateOrderDiscount,
        deleteOrder,
        seedSampleOrders,
        updateSettings,
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
        
        // User & RBAC
        users,
        currentUser,
        setCurrentUser,
        addUser,
        updateUser,
        deleteUser,
        userPermissions,
        rolePermissions,
        updateRolePermissions,
        resetRolePermissions,

        // POS
        posSales,
        completePOSSale,

        // Live Delivery & Courier Fleet
        couriers,
        addCourier,
        updateCourier,
        deleteCourier,
        deliveryTrackings,
        activeDeliveryOrder,
        setActiveDeliveryOrder,
        updateDeliveryStatus,
        dispatchOrderDelivery,
        createQuickDelivery,

        // Drive Sync & Backup
        driveSnapshots,
        syncToGoogleDrive,
        restoreFromSnapshot,
        deleteDriveSnapshot,
        exportBackupJSON,
        restoreFromBackupJSON,

        // Category Management
        categories,
        addCategory,
        deleteCategory,

        // Barcode / SKU Product Lookup
        findProductByBarcodeOrSku,

        // Purchases & Stock In / Out Accounting & Purchase Orders
        purchases,
        stockOuts,
        purchaseOrders,
        createPurchaseOrder,
        updatePurchaseOrderStatus,
        receivePurchaseOrder,
        deletePurchaseOrder,
        addPurchase,
        deletePurchase,
        addStockOut,
        deleteStockOut,
        clearPurchases,
        clearStockOuts,
        clearSalesIncome,
        clearAllAccountingRecords,

        // 1-Minute & Real-Time Auto-Sync Google Drive
        nextSyncCountdown,
        isAutoSyncing,
        autoSyncStatus,
        lastAutoSyncTime,
        autoSyncSuccessNotification,
        dismissAutoSyncNotification,
        toggleAutoSync,
        toggleAutoSyncOnUpdate,
        setAutoSyncInterval,
        setGoogleDriveEmail,

        // Zero-Click Automatic Restore across Devices
        autoRestoreOnUpdate: settings.autoRestoreOnUpdate !== false,
        autoRestoreOnLaunch: settings.autoRestoreOnLaunch !== false,
        toggleAutoRestoreOnUpdate,
        toggleAutoRestoreOnLaunch,
        lastAutoRestoreTime,
        lastAutoRestoreSource,
        triggerZeroClickAutoRestore,

        // Offline Simulation & Network Outage Continuity
        isOffline,
        setIsOffline,
        toggleOfflineSimulation,
        pendingOfflineSalesCount,
        syncOfflineQueue,
        isOfflineModalOpen,
        setIsOfflineModalOpen,

        // Real-Time Multi-Device Sync (WebSocket + Polling)
        syncStatus,
        connectedDevicesCount,
        lastSyncTime,
        syncVersion,
        triggerManualSync,
        sendTestPing,
        remoteSyncNotification,
        dismissRemoteSyncNotification,

        // Modals
        isCartOpen,
        setIsCartOpen,
        selectedProductForDetail,
        setSelectedProductForDetail,
        lastPlacedOrder,
        setLastPlacedOrder,
        lastPOSSale,
        setLastPOSSale,

        // Biometric Fingerprint Scanner
        isBiometricScannerOpen,
        setIsBiometricScannerOpen,
        biometricScannerConfig,
        openBiometricScanner,
        closeBiometricScanner,

        // Product Image Display Mode
        productImageFit,
        setProductImageFit,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
