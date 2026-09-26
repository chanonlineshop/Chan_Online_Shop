export type ProductCategory = string;

export const DEFAULT_CATEGORIES: string[] = [
  'Smartphones & Tech',
  'Audio & Wearables',
  'Fashion & Accessories',
  'Home & Lifestyle',
  'Beauty & Care',
];

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  price: number;
  originalPrice?: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  weight?: number;
  weightUnit?: 'kg' | 'g' | 'lb' | 'oz' | 'ml' | 'L';
  description: string;
  images: string[];
  features?: string[];
  rating: number;
  reviewsCount: number;
  isFeatured?: boolean;
  brand?: string;
  barcode?: string;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
}

export interface CustomerInfo {
  fullName: string;
  phoneNumber: string;
  email: string;
  address: string;
  city: string;
  notes?: string;
}

export type PaymentMethod = 'card' | 'khqr' | 'aba' | 'cod';

export type PaymentStatus = 'Paid' | 'Processing' | 'Pending Verification' | 'Pending COD';

export type FulfillmentStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  date: string;
  customer: CustomerInfo;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  transactionId: string;
  paymentGatewayProvider: string;
  trackingNumber?: string;
  notes?: string;
}

export interface InventoryLog {
  id: string;
  timestamp: string;
  productId: string;
  productName: string;
  sku: string;
  type: 'Restock' | 'Sale' | 'Adjustment' | 'Creation' | 'Deletion';
  quantityChange: number;
  stockAfter: number;
  note: string;
}

// ================= PURCHASE & STOCK IN / OUT ACCOUNTING =================
export type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCostPrice: number;
  totalCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  supplierPhone?: string;
  supplierEmail?: string;
  orderDate: string;
  expectedDate: string;
  status: PurchaseOrderStatus;
  paymentStatus: 'UNPAID' | 'PAID' | 'PARTIAL';
  items: PurchaseOrderItem[];
  totalAmount: number;
  totalQuantity: number;
  notes?: string;
  createdAt: string;
  receivedAt?: string;
  recordedBy: string;
}

export interface PurchaseRecord {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCostPrice: number;
  totalCost: number;
  supplierName: string;
  invoiceNumber: string;
  date: string;
  notes?: string;
  recordedBy: string;
  createdAt: string;
  poId?: string;
}

export type StockOutReason = 
  | 'Supplier Return'
  | 'Damaged' 
  | 'Sample / Gift' 
  | 'Internal Use' 
  | 'Expired' 
  | 'Lost / Theft' 
  | 'Other';

export interface StockOutRecord {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  reason: StockOutReason;
  costImpact: number;
  date: string;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ShopSettings {
  shopName: string;
  theme?: ThemeMode;
  phone: string;
  email: string;
  address: string;
  currency: string;
  taxRate: number;
  freeShippingThreshold: number;
  standardShippingFee: number;
  telegramUsername: string;
  googleDriveLinked: boolean;
  googleDriveEmail: string;
  lastDriveSync?: string;
  autoSyncDriveEnabled: boolean;
  autoSyncIntervalSeconds: number;
  autoSyncOnUpdate?: boolean;
  autoRestoreOnUpdate?: boolean; // Zero-click automatic restore when another device updates
  autoRestoreOnLaunch?: boolean; // Zero-click automatic restore on initial app launch
  googleDriveFolder: string;
  // Extended Website & Storefront Customization
  // Logo Customization & Adjustments
  logoUrl?: string;
  logoShape?: 'circle' | 'rounded' | 'squircle' | 'square' | 'none';
  logoSize?: 'sm' | 'md' | 'lg' | 'xl';
  logoFit?: 'contain' | 'cover';
  logoBg?: 'transparent' | 'light' | 'dark' | 'amber' | 'gradient';
  showShopNameWithLogo?: boolean;
  // Banner Customization & Adjustments
  bannerUrl?: string;
  bannerLayout?: 'overlay' | 'split' | 'minimal';
  bannerHeight?: 'compact' | 'standard' | 'tall';
  bannerOverlayOpacity?: number; // 0 to 95
  bannerOverlayGradient?: 'dark' | 'amber' | 'navy' | 'emerald' | 'none';
  bannerPosition?: 'center' | 'top' | 'bottom';
  bannerBlur?: number;
  tagline?: string;
  city?: string;
  workingHours?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  heroBadge?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroCallButtonText?: string;
  heroSecondaryButtonText?: string;
  topBarAnnouncement?: string;
  khrExchangeRate?: number;
  deliveryEstimateText?: string;
  footerAboutText?: string;
  warrantyText?: string;
  copyrightText?: string;
  khqrMerchantName?: string;
  khqrMerchantAccount?: string;
  customQrCodeUrl?: string;
  abaQrCodeUrl?: string;
  enabledPaymentMethods?: {
    card: boolean;
    khqr: boolean;
    aba: boolean;
    cod: boolean;
  };
}

// ================= USER MANAGEMENT & RBAC =================
export type UserRole = 'SUPER_ADMIN' | 'STORE_MANAGER' | 'CASHIER' | 'DISPATCHER';

export interface UserPermissions {
  canAccessPOS: boolean;
  canManageInventory: boolean;
  canManageOrders: boolean;
  canDispatchDelivery: boolean;
  canManageUsers: boolean;
  canBackupRestore: boolean;
  canEditSettings: boolean;
  canViewFinancials: boolean;
}

export interface AppUser {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar: string;
  pin: string;
  passcode?: string;
  biometricEnabled?: boolean;
  biometricKeyId?: string;
  biometricRegisteredAt?: string;
  isActive: boolean;
  theme?: ThemeMode;
  createdAt: string;
  lastLogin?: string;
  customPermissions?: Partial<UserPermissions>;
}

// ================= POS (POINT OF SALE) =================
export interface POSCartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number; // in percentage or fixed
  discountType?: 'percent' | 'fixed';
}

export interface POSSale {
  id: string;
  receiptNumber: string;
  date: string;
  cashierId: string;
  cashierName: string;
  customerName: string;
  customerPhone?: string;
  items: {
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'CASH' | 'KHQR' | 'CARD';
  amountTendered: number;
  changeGiven: number;
  paymentDetails?: {
    cardBrand?: string;
    cardLast4?: string;
    authCode?: string;
    cardEntryMethod?: 'TAP' | 'CHIP' | 'SWIPE';
    khqrRef?: string;
    khqrPayerBank?: string;
    tenderCurrency?: 'USD' | 'KHR';
    tenderedKHR?: number;
    changeGivenKHR?: number;
  };
  notes?: string;
  isOfflineSyncPending?: boolean;
}

// ================= LIVE DELIVERY TRACKING =================
export type DeliveryStage = 
  | 'ORDER_PLACED' 
  | 'PACKED' 
  | 'RIDER_PICKED_UP' 
  | 'IN_TRANSIT' 
  | 'ARRIVING' 
  | 'DELIVERED';

export interface DeliveryCourier {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  vehicle: string;
  plateNumber: string;
  rating: number;
  currentSpeedKmH: number;
}

export interface DeliveryMilestone {
  stage: DeliveryStage;
  label: string;
  timestamp: string;
  completed: boolean;
  description: string;
}

export interface DeliveryTracking {
  orderId: string;
  trackingNumber: string;
  customerName: string;
  customerPhone: string;
  destinationAddress: string;
  destinationDistrict: string;
  courier: DeliveryCourier;
  status: DeliveryStage;
  progressPercent: number;
  estimatedMinutesRemaining: number;
  distanceRemainingKm: number;
  milestones: DeliveryMilestone[];
  storeHotline: string;
}

// ================= DRIVE SYNC & BACKUP/RESTORE =================
export interface DriveSnapshot {
  id: string;
  timestamp: string;
  name: string;
  sizeKb: number;
  deviceSource: string;
  targetEmail?: string;
  syncType?: 'MANUAL' | 'AUTO_MINUTE' | 'AUTO_ON_UPDATE';
  recordCount: {
    products: number;
    orders: number;
    posSales: number;
    logs: number;
    users: number;
    purchases?: number;
    stockOuts?: number;
    purchaseOrders?: number;
  };
  syncedToGoogleDrive: boolean;
  driveFileId?: string;
  payload?: SystemBackupPayload;
}

export interface SystemBackupPayload {
  version: string;
  exportedAt: string;
  shopName: string;
  hotline: string;
  data: {
    products: Product[];
    orders: Order[];
    inventoryLogs: InventoryLog[];
    posSales: POSSale[];
    users: AppUser[];
    settings: ShopSettings;
    categories?: string[];
    purchases?: PurchaseRecord[];
    stockOuts?: StockOutRecord[];
    purchaseOrders?: PurchaseOrder[];
    couriers?: DeliveryCourier[];
    deliveryTrackings?: DeliveryTracking[];
  };
}

export type ActiveViewType = 'shop' | 'pos' | 'inventory' | 'orders' | 'delivery' | 'analytics' | 'users' | 'backup' | 'settings';

