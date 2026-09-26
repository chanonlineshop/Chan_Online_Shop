import React, { useState, useMemo } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { UserPermissions } from './types';
import { fuzzySearchProducts } from './utils/fuzzySearch';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { CategoryFilter } from './components/CategoryFilter';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderConfirmationModal } from './components/OrderConfirmationModal';
import { InventoryManagement } from './components/InventoryManagement';
import { POSTerminal } from './components/POSTerminal';
import { LiveDeliveryTracking } from './components/LiveDeliveryTracking';
import { DriveSyncBackup } from './components/DriveSyncBackup';
import { UserManagementRBAC } from './components/UserManagementRBAC';
import { WebsiteSettingsView } from './components/WebsiteSettingsView';
import { AnalyticsView } from './components/AnalyticsView';
import { BiometricFingerprintScanner } from './components/BiometricFingerprintScanner';
import { Footer } from './components/Footer';
import { 
  ShoppingBag, 
  Search, 
  Sparkles, 
  Boxes, 
  ShieldCheck, 
  Truck, 
  PhoneCall, 
  ArrowRight,
  ReceiptText,
  Lock,
  Unlock,
  KeyRound,
  ShieldAlert,
  UserCheck,
  ArrowLeftRight,
  X,
  Maximize2,
  Minimize2,
  Wifi,
  WifiOff,
  RotateCcw
} from 'lucide-react';

const MainShopContent: React.FC = () => {
  const { 
    products, 
    selectedCategory, 
    setSelectedCategory,
    searchQuery, 
    setSearchQuery,
    activeView, 
    setActiveView,
    selectedProductForDetail,
    setSelectedProductForDetail,
    lastPlacedOrder,
    setLastPlacedOrder,
    settings,
    currentUser,
    userPermissions,
    setCurrentUser,
    users,
    remoteSyncNotification,
    dismissRemoteSyncNotification,
    productImageFit,
    setProductImageFit,
    updateRolePermissions,
    isOffline,
    toggleOfflineSimulation,
    pendingOfflineSalesCount,
    isOfflineModalOpen,
    setIsOfflineModalOpen,
    isBiometricScannerOpen,
    closeBiometricScanner,
    biometricScannerConfig
  } = useStore();

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrderConfirmationOpen, setIsOrderConfirmationOpen] = useState(false);

  // Multi-field typo-tolerant fuzzy search for storefront catalog
  const searchOutcome = useMemo(() => {
    return fuzzySearchProducts(products, searchQuery, selectedCategory);
  }, [products, searchQuery, selectedCategory]);

  const filteredProducts = searchOutcome.results;

  // Check RBAC permission for the active view
  const isViewAuthorized = (): boolean => {
    switch (activeView) {
      case 'pos':
        return userPermissions.canAccessPOS;
      case 'inventory':
        return userPermissions.canManageInventory;
      case 'orders':
        return userPermissions.canManageOrders;
      case 'delivery':
        return userPermissions.canDispatchDelivery;
      case 'users':
        return userPermissions.canManageUsers;
      case 'backup':
        return userPermissions.canBackupRestore;
      case 'settings':
        return userPermissions.canEditSettings;
      case 'shop':
      default:
        return true;
    }
  };

  const handleSwitchToAdmin = () => {
    const adminUser = users.find(u => u.role === 'SUPER_ADMIN') || users[0];
    setCurrentUser(adminUser);
  };

  const handleSwitchToManager = () => {
    const managerUser = users.find(u => u.role === 'STORE_MANAGER') || users[1] || users[0];
    setCurrentUser(managerUser);
  };

  const handleGrantRolePermission = () => {
    const viewToPermissionMap: Record<string, keyof UserPermissions> = {
      pos: 'canAccessPOS',
      inventory: 'canManageInventory',
      orders: 'canManageOrders',
      delivery: 'canDispatchDelivery',
      users: 'canManageUsers',
      backup: 'canBackupRestore',
      settings: 'canEditSettings',
    };
    const permKey = viewToPermissionMap[activeView];
    if (permKey) {
      updateRolePermissions(currentUser.role, { [permKey]: true });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      {/* Network Outage Mode Active Banner */}
      {isOffline && (
        <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-rose-800 text-white px-4 py-2.5 shadow-md flex items-center justify-between flex-wrap gap-2 text-xs z-30">
          <div className="flex items-center gap-2 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping shrink-0" />
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>Simulated Network Outage Active: Operating in Offline Continuity Mode</span>
            {pendingOfflineSalesCount > 0 && (
              <span className="bg-rose-950/60 border border-rose-400/50 text-rose-100 text-[10px] px-2 py-0.5 rounded-full font-mono">
                {pendingOfflineSalesCount} offline receipt{pendingOfflineSalesCount !== 1 ? 's' : ''} queued
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOfflineModalOpen(true)}
              id="btn-banner-open-simulator"
              className="bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              Open Simulator
            </button>
            <button
              onClick={() => toggleOfflineSimulation(false)}
              id="btn-banner-restore-online"
              className="bg-white text-rose-700 hover:bg-rose-50 font-black text-[11px] px-3 py-1 rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-1"
            >
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              <span>Restore Online</span>
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* RBAC PERMISSION GATE IF USER LACKS ACCESS */}
        {!isViewAuthorized() ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto my-12 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mb-2">
              Access Restricted by RBAC Policy
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Your active role <span className="font-bold text-slate-900">({currentUser.role})</span> does not currently have permission to access the <strong>{activeView.toUpperCase()}</strong> module.
            </p>

            <div className="flex flex-col gap-3 max-w-md mx-auto">
              <button
                onClick={handleGrantRolePermission}
                id="btn-grant-role-permission"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Unlock className="w-4 h-4 text-emerald-200" />
                <span>Grant {activeView.toUpperCase()} Access to {currentUser.role.replace('_', ' ')}</span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={handleSwitchToAdmin}
                  id="btn-switch-admin"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  <span>Switch to Super Admin</span>
                </button>

                <button
                  onClick={handleSwitchToManager}
                  id="btn-switch-manager"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-200" />
                  <span>Switch to Store Manager</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setActiveView('pos')}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Return to POS Terminal
                </button>

                <button
                  onClick={() => setActiveView('shop')}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Return to Storefront
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* VIEW 1: STOREFRONT */}
            {activeView === 'shop' && (
              <div>
                {/* Hero Promotional Banner */}
                {!searchQuery && selectedCategory === 'All' && <HeroBanner />}

                {/* Catalog Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <span>{searchQuery ? `Search: "${searchQuery}"` : 'Shop Catalog & Deals'}</span>
                      <span className="text-xs font-bold text-slate-400 font-mono">
                        ({filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'})
                      </span>
                      {searchQuery.trim() && searchOutcome.hasFuzzyMatches && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300/80 px-2 py-0.5 rounded-full shadow-2xs">
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          <span>Fuzzy Typo Match</span>
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {searchQuery ? (
                        <span>
                          Showing catalog results with intelligent typo tolerance. Live stock updated in real time.
                        </span>
                      ) : (
                        <span>
                          Live inventory available for direct checkout or instant phone order at <strong className="text-amber-700">{settings.phone}</strong>.
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Quick POS or Inventory Jump */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveView('pos')}
                      className="text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Launch POS</span>
                    </button>

                    <button
                      onClick={() => setActiveView('inventory')}
                      className="text-xs font-bold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Boxes className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Inventory &amp; Stock</span>
                    </button>
                  </div>
                </div>

                {/* In-Catalog Dedicated Search Bar with Typo-Tolerant Feature */}
                <div className="mb-4 bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      id="catalog-inline-search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by product name, SKU, brand, features (minor typos tolerated)..."
                      className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all font-medium"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        id="btn-catalog-clear-search"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-full transition-colors"
                        title="Clear search"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 px-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/80 text-[11px] font-bold select-none shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Typo-Tolerant Fuzzy Search</span>
                    </span>

                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-xs font-bold text-slate-500 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* "Did you mean?" Suggestion Banner */}
                {searchQuery.trim() && searchOutcome.suggestion && searchOutcome.isCorrectedQueryDifferent && (
                  <div 
                    id="search-did-you-mean-banner"
                    className="mb-4 bg-amber-50/90 border border-amber-300/80 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-fadeIn"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-slate-900 font-semibold">
                          Did you mean:{' '}
                          <button
                            type="button"
                            id="btn-search-suggestion"
                            onClick={() => setSearchQuery(searchOutcome.suggestion!)}
                            className="font-black text-amber-800 underline underline-offset-2 hover:text-amber-950 cursor-pointer"
                          >
                            "{searchOutcome.suggestion}"
                          </button>
                          ?
                        </p>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'result' : 'results'} matching your query with typo tolerance.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => setSearchQuery(searchOutcome.suggestion!)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-2xs transition-transform active:scale-95 flex items-center gap-1.5"
                      >
                        <span>Search "{searchOutcome.suggestion}"</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Category Filter Pills */}
                <CategoryFilter />

                {/* Storefront View Controls & Image Fit Selector */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5 px-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <span>Showing <strong className="text-slate-900">{filteredProducts.length}</strong> items</span>
                    {selectedCategory !== 'All' && (
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium text-[11px]">
                        in {selectedCategory}
                      </span>
                    )}
                    {searchQuery.trim() && (
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-bold text-[11px]">
                        query: "{searchQuery}"
                      </span>
                    )}
                  </div>

                  {/* Image Fit Control */}
                  <div className="flex items-center gap-1 bg-white border border-slate-200/90 rounded-xl p-1 shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-400 px-2 hidden sm:inline">Photo Fit:</span>
                    <button
                      type="button"
                      id="btn-photo-fit-contain"
                      onClick={() => setProductImageFit('contain')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                        productImageFit === 'contain'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                      title="Fit entire product inside frame without cropping"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Fit Product</span>
                    </button>
                    <button
                      type="button"
                      id="btn-photo-fit-cover"
                      onClick={() => setProductImageFit('cover')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                        productImageFit === 'cover'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                      title="Fill card edges with product photo"
                    >
                      <Minimize2 className="w-3.5 h-3.5" />
                      <span>Fill Card</span>
                    </button>
                  </div>
                </div>

                {/* Products Grid */}
                {filteredProducts.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center my-6 shadow-xs">
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                      <Search className="w-8 h-8" />
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-lg mb-1">
                      {searchQuery ? `No products found for "${searchQuery}"` : 'No products found'}
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                      {searchOutcome.suggestion ? (
                        <span>
                          We couldn't find matches for "{searchQuery}". Did you mean{' '}
                          <button 
                            type="button" 
                            onClick={() => setSearchQuery(searchOutcome.suggestion!)}
                            className="text-amber-700 font-bold underline cursor-pointer hover:text-amber-900"
                          >
                            "{searchOutcome.suggestion}"
                          </button>?
                        </span>
                      ) : (
                        <span>We searched product names, brands, categories, SKUs, and features with typo tolerance, but found no matching items.</span>
                      )}
                    </p>

                    {searchOutcome.suggestion && (
                      <div className="mb-5">
                        <button
                          type="button"
                          onClick={() => setSearchQuery(searchOutcome.suggestion!)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-xs transition-transform active:scale-95"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Search for "{searchOutcome.suggestion}" instead</span>
                        </button>
                      </div>
                    )}

                    {/* Popular search quick-tags */}
                    <div className="pt-4 border-t border-slate-100 max-w-md mx-auto mb-6">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Try searching popular catalog items:</p>
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {['Earbuds', 'Smart Watch', 'Fast Charger', 'Power Bank', 'Backpack', 'Linen Shirt', 'Tumbler', 'Serum', 'Sunscreen'].map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              setSearchQuery(tag);
                              setSelectedCategory('All');
                            }}
                            className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 font-semibold transition-colors"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('All');
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2.5 rounded-xl transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Clear Filters &amp; Show All</span>
                      </button>

                      <button
                        onClick={() => setActiveView('inventory')}
                        className="inline-flex items-center gap-1.5 text-xs font-bold bg-slate-900 text-white px-4 py-2.5 rounded-xl hover:bg-amber-500 hover:text-slate-950 transition-colors"
                      >
                        <Boxes className="w-4 h-4" />
                        <span>Add Product in Inventory</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                    {filteredProducts.map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                )}

                {/* Trust and Hotline Banner */}
                <div className="mt-14 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 rounded-3xl p-6 sm:p-8 text-slate-950 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-amber-500/10">
                  <div className="space-y-2 text-center md:text-left">
                    <span className="bg-slate-950 text-amber-300 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">
                      Customer Assistance
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                      Prefer to order via Phone or Telegram?
                    </h3>
                    <p className="text-sm text-slate-900/90 font-medium max-w-xl">
                      Our customer service at <strong>{settings.shopName}</strong> is standing by to accept phone inquiries, order customizations, or delivery coordination.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <a
                      href={`tel:${settings.phone.replace(/\s+/g, '')}`}
                      className="bg-slate-950 hover:bg-slate-800 text-white font-extrabold px-6 py-3.5 rounded-2xl text-sm flex items-center gap-2.5 shadow-lg active:scale-95 transition-all"
                    >
                      <PhoneCall className="w-4 h-4 text-amber-400 animate-bounce" />
                      <span>Call {settings.phone}</span>
                    </a>

                    <a
                      href={`https://t.me/${settings.telegramUsername}`}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-white/90 hover:bg-white text-slate-950 font-bold px-5 py-3.5 rounded-2xl text-sm border border-slate-950/10 shadow-sm transition-all"
                    >
                      Telegram: @{settings.telegramUsername}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: POINT OF SALE (POS) */}
            {activeView === 'pos' && (
              <POSTerminal />
            )}

            {/* VIEW 3: INVENTORY MANAGEMENT & ORDERS */}
            {(activeView === 'inventory' || activeView === 'orders') && (
              <InventoryManagement />
            )}

            {/* VIEW 4: LIVE DELIVERY TRACKING */}
            {activeView === 'delivery' && (
              <LiveDeliveryTracking />
            )}

            {/* VIEW: ANALYTICS & SALES PERFORMANCE */}
            {activeView === 'analytics' && (
              <AnalyticsView />
            )}

            {/* VIEW 5: USER MANAGEMENT & RBAC */}
            {activeView === 'users' && (
              <UserManagementRBAC />
            )}

            {/* VIEW 6: GOOGLE DRIVE BACKUP & RESTORE */}
            {activeView === 'backup' && (
              <DriveSyncBackup />
            )}

            {/* VIEW 7: WEBSITE & STOREFRONT SETTINGS */}
            {activeView === 'settings' && (
              <WebsiteSettingsView />
            )}
          </>
        )}
      </main>

      <Footer />

      {/* Cart Drawer */}
      <CartDrawer onOpenCheckout={() => setIsCheckoutOpen(true)} />

      {/* Product Detail Modal */}
      {selectedProductForDetail && (
        <ProductDetailModal
          product={selectedProductForDetail}
          onClose={() => setSelectedProductForDetail(null)}
        />
      )}

      {/* Checkout Modal (Secure Payment Gateway) */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={() => {
          setIsOrderConfirmationOpen(true);
        }}
      />

      {/* Order Confirmation Modal (Invoice & Confetti) */}
      <OrderConfirmationModal
        isOpen={isOrderConfirmationOpen}
        onClose={() => {
          setIsOrderConfirmationOpen(false);
          setLastPlacedOrder(null);
        }}
      />

      {/* Real Biometric Fingerprint Scanner for Phone Screen & PC */}
      <BiometricFingerprintScanner
        isOpen={isBiometricScannerOpen}
        onClose={closeBiometricScanner}
        mode={biometricScannerConfig.mode}
        title={biometricScannerConfig.title}
        subtitle={biometricScannerConfig.subtitle}
        userName={biometricScannerConfig.userName}
        userRole={biometricScannerConfig.userRole}
        existingKeyId={biometricScannerConfig.existingKeyId}
        onSuccess={biometricScannerConfig.onSuccess}
      />

      {/* Real-Time Multi-Device Sync Toast Notification */}
      {remoteSyncNotification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-3 max-w-md">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <ArrowLeftRight className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex-1 pr-1">
              <p className="text-xs font-semibold text-slate-100">{remoteSyncNotification}</p>
              <p className="text-[10px] text-slate-400">All connected phones & PCs updated instantly</p>
            </div>
            <button
              onClick={dismissRemoteSyncNotification}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <MainShopContent />
    </StoreProvider>
  );
}
