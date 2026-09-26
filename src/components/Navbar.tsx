import React, { useState } from 'react';
import { 
  Phone, 
  ShoppingBag, 
  Search, 
  Boxes, 
  ReceiptText, 
  Store, 
  X,
  AlertTriangle,
  Send,
  Receipt,
  Navigation,
  Cloud,
  Users,
  ShieldCheck,
  ChevronDown,
  Lock,
  UserCheck,
  Settings,
  Wifi,
  WifiOff,
  Radio,
  ArrowLeftRight,
  Sun,
  Moon,
  Monitor,
  Fingerprint,
  BarChart3
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { NetworkOutageSimulatorModal } from './NetworkOutageSimulatorModal';
import { MultiDeviceSyncModal } from './MultiDeviceSyncModal';

export const Navbar: React.FC = () => {
  const { 
    settings, 
    cartCount, 
    setIsCartOpen, 
    activeView, 
    setActiveView, 
    searchQuery, 
    setSearchQuery, 
    products, 
    orders, 
    deliveryTrackings, 
    currentUser, 
    users, 
    setCurrentUser, 
    userPermissions, 
    nextSyncCountdown, 
    isAutoSyncing, 
    isOffline, 
    toggleOfflineSimulation, 
    pendingOfflineSalesCount, 
    syncOfflineQueue, 
    isOfflineModalOpen, 
    setIsOfflineModalOpen, 
    syncStatus, 
    connectedDevicesCount, 
    syncVersion, 
    theme, 
    resolvedTheme, 
    setTheme, 
    toggleTheme,
    openBiometricScanner
  } = useStore();

  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Count products with low or out of stock for alert badge
  const lowStockCount = products.filter(p => p.stock <= p.lowStockThreshold).length;
  const pendingOrdersCount = orders.filter(o => o.fulfillmentStatus === 'Pending').length;
  const activeDeliveriesCount = deliveryTrackings.filter(d => d.status !== 'DELIVERED').length;

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'STORE_MANAGER':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CASHIER':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'DISPATCHER':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-200">
      {/* Top Announcement & Direct Hotline Bar */}
      <div className="bg-slate-900 dark:bg-slate-950 text-slate-100 text-xs py-2 px-4 border-b border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2 font-medium">
            <span className={`inline-block w-2 h-2 rounded-full ${isOffline ? 'bg-rose-500 animate-ping' : 'bg-emerald-400 animate-pulse'}`}></span>
            <span>{settings.topBarAnnouncement || `Welcome to ${settings.shopName} — Fast Delivery & 100% Genuine Guaranteed`}</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-slate-300 flex-wrap justify-center sm:justify-end">
            {/* Multi-Device Live Sync Status Pill */}
            <button
              onClick={() => setIsSyncModalOpen(true)}
              id="btn-navbar-realtime-sync"
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold transition-all border ${
                syncStatus === 'CONNECTED'
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50 hover:border-emerald-400'
                  : syncStatus === 'POLLING'
                  ? 'bg-amber-950/70 text-amber-300 border-amber-500/50 hover:border-amber-400'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
              title="Click to view real-time sync across mobile & PC devices"
            >
              <span className={`w-2 h-2 rounded-full ${
                syncStatus === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' :
                syncStatus === 'POLLING' ? 'bg-amber-400 animate-pulse' : 'bg-slate-400'
              }`} />
              <ArrowLeftRight className="w-3 h-3 text-amber-400" />
              <span>
                {syncStatus === 'CONNECTED' ? `Live Sync (${connectedDevicesCount} Dev)` : 'Auto Polling'}
              </span>
            </button>

            {/* Quick Network Outage & Offline Simulation Pill */}
            <div className="inline-flex items-center gap-1">
              <button
                onClick={() => setIsOfflineModalOpen(true)}
                id="btn-navbar-network-status"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black transition-all border cursor-pointer ${
                  isOffline
                    ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-500/40 animate-pulse'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-emerald-400/80 hover:bg-slate-750'
                }`}
                title="Click to open Network Outage & Continuity Simulator"
              >
                {isOffline ? (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-white" />
                    <span>SIMULATING OUTAGE</span>
                    {pendingOfflineSalesCount > 0 && (
                      <span className="bg-black/30 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                        {pendingOfflineSalesCount} Queued
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300 font-extrabold">Online</span>
                    <span className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-md transition-colors ml-0.5 shadow-2xs">
                      Simulate Outage
                    </span>
                  </>
                )}
              </button>
              {isOffline && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOfflineSimulation(false);
                  }}
                  id="btn-navbar-quick-end-outage"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold px-2 py-1 rounded-full border border-emerald-400 shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                  title="Quick End Outage (Restore Online)"
                >
                  <Wifi className="w-3 h-3" />
                  <span>Go Online</span>
                </button>
              )}
            </div>

            {/* Prominent Hotline */}
            <a 
              href={`tel:${settings.phone.replace(/\s+/g, '')}`} 
              className="inline-flex items-center gap-1.5 font-bold text-amber-400 hover:text-amber-300 transition-colors bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700 hover:border-amber-500/50"
              title="Click to call shop hotline"
            >
              <Phone className="w-3.5 h-3.5 text-amber-400" />
              <span>Hotline: {settings.phone}</span>
            </a>

            {/* Direct Telegram Chat */}
            <a 
              href={`https://t.me/${settings.telegramUsername}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-white transition-colors"
              title="Chat with shop on Telegram"
            >
              <Send className="w-3 h-3 text-sky-400" />
              <span className="hidden md:inline">Telegram: @{settings.telegramUsername}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 gap-3">
          {/* Logo & Brand */}
          <div 
            onClick={() => setActiveView('shop')}
            className="flex items-center gap-3 cursor-pointer group select-none shrink-0"
          >
            {settings.logoUrl ? (
              <div 
                className={`flex items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-105 shrink-0 ${
                  settings.logoShape === 'circle' ? 'rounded-full' :
                  settings.logoShape === 'squircle' ? 'rounded-2xl' :
                  settings.logoShape === 'square' || settings.logoShape === 'none' ? 'rounded-none' : 'rounded-xl'
                } ${
                  settings.logoBg === 'transparent' ? 'bg-transparent' :
                  settings.logoBg === 'light' ? 'bg-white p-1 border border-slate-200 dark:border-slate-700 shadow-2xs' :
                  settings.logoBg === 'dark' ? 'bg-slate-900 p-1 border border-slate-700 shadow-2xs' :
                  settings.logoBg === 'amber' ? 'bg-amber-500 p-1 shadow-md shadow-amber-500/20' :
                  'bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 p-1 shadow-md shadow-amber-500/20'
                } ${
                  settings.logoSize === 'sm' ? 'w-9 h-9 sm:w-9 sm:h-9' :
                  settings.logoSize === 'lg' ? 'w-12 h-12 sm:w-13 sm:h-13' :
                  settings.logoSize === 'xl' ? 'w-14 h-14 sm:w-16 sm:h-16' :
                  'w-10 h-10 sm:w-11 sm:h-11'
                }`}
              >
                <img 
                  src={settings.logoUrl} 
                  alt={settings.shopName}
                  className={`w-full h-full ${settings.logoFit === 'cover' ? 'object-cover' : 'object-contain'}`}
                  onError={(e) => {
                    // Fallback to store icon if image fails to load
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform duration-200 shrink-0">
                <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
              </div>
            )}

            {settings.showShopNameWithLogo !== false && (
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg sm:text-2xl text-slate-900 dark:text-slate-100 tracking-tight leading-none group-hover:text-amber-500 transition-colors">
                    {settings.shopName}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-700/60 hidden sm:inline-block">
                    Official
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                  <span>Tel:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{settings.phone}</span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="truncate max-w-[140px]">{settings.city || settings.address || 'Phnom Penh'}</span>
                </p>
              </div>
            )}
          </div>

          {/* Search Bar for Storefront */}
          <div className="hidden md:flex flex-1 max-w-xs xl:max-w-sm mx-2">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                id="navbar-storefront-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products (typos tolerated)..."
                className="w-full bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
                title="Fuzzy typo-tolerant search enabled"
              />
              {searchQuery && (
                <button
                  type="button"
                  id="navbar-clear-search-btn"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded-full"
                  title="Clear search query"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Action Navigation Tabs */}
          <div className="flex items-center gap-2">
            {/* View Switchers Grid (Desktop) */}
            <div className="hidden lg:flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
              <button
                id="nav-shop-tab"
                onClick={() => setActiveView('shop')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeView === 'shop'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Store className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Store</span>
              </button>

              <button
                id="nav-pos-tab"
                onClick={() => setActiveView('pos')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeView === 'pos'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>POS</span>
              </button>

              <button
                id="nav-inventory-tab"
                onClick={() => setActiveView('inventory')}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeView === 'inventory'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Boxes className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Inventory</span>
                {lowStockCount > 0 && (
                  <span className="flex items-center justify-center bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full min-w-4 h-4" title={`${lowStockCount} items low or out of stock`}>
                    {lowStockCount}
                  </span>
                )}
              </button>

              <button
                id="nav-orders-tab"
                onClick={() => setActiveView('orders')}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeView === 'orders'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ReceiptText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Orders</span>
                {pendingOrdersCount > 0 && (
                  <span className="flex items-center justify-center bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full min-w-4 h-4">
                    {pendingOrdersCount}
                  </span>
                )}
              </button>

              <button
                id="nav-delivery-tab"
                onClick={() => setActiveView('delivery')}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeView === 'delivery'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Navigation className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Delivery</span>
                {activeDeliveriesCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                )}
              </button>

              <button
                id="nav-analytics-tab"
                onClick={() => setActiveView('analytics')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeView === 'analytics'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Analytics</span>
              </button>

              <button
                id="nav-users-tab"
                onClick={() => setActiveView('users')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeView === 'users'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Users</span>
              </button>

              <button
                id="nav-backup-tab"
                onClick={() => setActiveView('backup')}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeView === 'backup'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isOffline ? (
                  <WifiOff className="w-3.5 h-3.5 text-rose-500" />
                ) : (
                  <Cloud className={`w-3.5 h-3.5 ${isAutoSyncing ? 'animate-spin text-amber-500' : 'text-amber-600 dark:text-amber-400'}`} />
                )}
                <span>Drive Sync</span>
                {isOffline ? (
                  <span className="bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border border-rose-200 dark:border-rose-800">
                    Paused
                  </span>
                ) : (
                  settings.autoSyncDriveEnabled && (
                    <span className="flex items-center gap-1 bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 text-[10px] font-mono font-extrabold px-1.5 py-0.2 rounded-full border border-amber-200 dark:border-amber-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{nextSyncCountdown}s</span>
                    </span>
                  )
                )}
              </button>

              <button
                id="nav-settings-tab"
                onClick={() => setActiveView('settings')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeView === 'settings'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Configure website information, hotlines, hero banner, rates, and policies"
              >
                <Settings className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                <span>Settings</span>
              </button>
            </div>

            {/* Biometric Fingerprint Scanner (Real Scan on Screen & PC) */}
            <button
              id="biometric-scanner-btn"
              onClick={() => openBiometricScanner({
                mode: 'test',
                title: 'Biometric Fingerprint Scanner',
                subtitle: 'Real capacitive screen touch on phone & Windows Hello / Touch ID on PC',
                userName: currentUser.name,
                userRole: currentUser.role,
                existingKeyId: currentUser.biometricKeyId
              })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold transition-all shadow-xs active:scale-95 shrink-0 cursor-pointer"
              title="Biometric Fingerprint Scanner (Real scan on phone screen and PC)"
            >
              <Fingerprint className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span className="hidden xl:inline">Biometrics</span>
            </button>

            {/* Theme Mode Toggle Button */}
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-amber-400 transition-all shadow-xs active:scale-95 shrink-0"
              title={`Theme: ${theme.toUpperCase()} (${resolvedTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}). Click to toggle.`}
              aria-label="Toggle light/dark mode"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-90 duration-300" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700 hover:text-amber-600 transition-transform hover:-rotate-12 duration-300" />
              )}
            </button>

            {/* Active User RBAC Pill with Quick Switch Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded-xl text-xs transition-colors border border-slate-200 dark:border-slate-700"
                title="Current active staff user"
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-6 h-6 rounded-full object-cover border border-slate-300 dark:border-slate-600"
                />
                <div className="hidden sm:block text-left">
                  <span className="font-extrabold text-slate-900 dark:text-slate-100 block leading-tight text-[11px] truncate max-w-[80px]">
                    {currentUser.name}
                  </span>
                  <span className={`text-[9px] font-bold px-1 py-0.2 rounded ${getRoleBadgeClass(currentUser.role)}`}>
                    {currentUser.role.replace(/_/g, ' ')}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* User Dropdown Menu */}
              {isUserDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Switch Active Staff</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Simulate role permissions in real time</p>
                  </div>

                  <div className="py-1 space-y-1">
                    {users.map(u => (
                      <button
                        key={u.id}
                        onClick={() => {
                          if (u.biometricEnabled && currentUser.id !== u.id) {
                            setIsUserDropdownOpen(false);
                            openBiometricScanner({
                              mode: 'verify',
                              title: 'Biometric Login & Session Switch',
                              subtitle: `Scanning real fingerprint for ${u.name} (${u.role})`,
                              userName: u.name,
                              userRole: u.role,
                              existingKeyId: u.biometricKeyId,
                              onSuccess: () => {
                                setCurrentUser(u);
                              }
                            });
                          } else {
                            setCurrentUser(u);
                            setIsUserDropdownOpen(false);
                          }
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-colors text-left ${
                          currentUser.id === u.id ? 'bg-amber-50 dark:bg-amber-950/40 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                            {u.biometricEnabled && (
                              <span 
                                className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center"
                                title="Biometrics enrolled"
                              >
                                <Fingerprint className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-slate-900 dark:text-slate-100 leading-tight">{u.name}</p>
                            <span className={`text-[9px] font-bold px-1 py-0.2 rounded ${getRoleBadgeClass(u.role)}`}>
                              {u.role}
                            </span>
                          </div>
                        </div>

                        {currentUser.id === u.id && (
                          <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Biometric Scanner Quick Trigger in User Dropdown */}
                  <div className="pt-2 px-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        openBiometricScanner({
                          mode: 'test',
                          title: 'Biometric Fingerprint Scanner',
                          subtitle: 'Real capacitive screen touch on phone & Windows Hello / Touch ID on PC',
                          userName: currentUser.name,
                          userRole: currentUser.role,
                          existingKeyId: currentUser.biometricKeyId
                        });
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Fingerprint className="w-3.5 h-3.5" />
                      <span>Real Biometric Scanner</span>
                    </button>
                  </div>

                  {/* Theme Mode Selector in User Dropdown */}
                  <div className="pt-2 pb-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="px-2 pb-1 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Theme Mode</span>
                      <span className="text-amber-500 capitalize">{theme}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 px-1">
                      <button
                        type="button"
                        onClick={() => setTheme('light')}
                        className={`flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-xs font-semibold transition-all ${
                          theme === 'light'
                            ? 'bg-amber-500 text-white shadow-xs font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <Sun className="w-3 h-3" />
                        <span>Light</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme('dark')}
                        className={`flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-xs font-semibold transition-all ${
                          theme === 'dark'
                            ? 'bg-amber-500 text-white shadow-xs font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <Moon className="w-3 h-3" />
                        <span>Dark</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme('system')}
                        className={`flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-xs font-semibold transition-all ${
                          theme === 'system'
                            ? 'bg-amber-500 text-white shadow-xs font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <Monitor className="w-3 h-3" />
                        <span>Auto</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setActiveView('users');
                        setIsUserDropdownOpen(false);
                      }}
                      className="w-full text-center text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 py-1"
                    >
                      Manage Staff &amp; RBAC Matrix →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Cart Button (for customer store purchases) */}
            <button
              id="header-cart-button"
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 shrink-0"
            >
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 ? (
                <span className="bg-amber-400 text-slate-950 text-xs font-extrabold px-1.5 py-0.5 rounded-full min-w-5 text-center">
                  {cartCount}
                </span>
              ) : (
                <span className="text-xs text-slate-400">0</span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Navigation Tabs Bar */}
        <div className="lg:hidden pb-2 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              onClick={() => setActiveView('shop')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap ${
                activeView === 'shop' 
                  ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              Store
            </button>
            <button
              onClick={() => setActiveView('pos')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap ${
                activeView === 'pos' 
                  ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              POS Register
            </button>
            <button
              onClick={() => setActiveView('inventory')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap flex items-center gap-1 ${
                activeView === 'inventory' 
                  ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span>Inventory</span>
              {lowStockCount > 0 && (
                <span className="bg-rose-500 text-white text-[9px] px-1 rounded-full">{lowStockCount}</span>
              )}
            </button>
            <button
              onClick={() => setActiveView('orders')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap flex items-center gap-1 ${
                activeView === 'orders' 
                  ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span>Orders</span>
              {pendingOrdersCount > 0 && (
                <span className="bg-emerald-500 text-white text-[9px] px-1 rounded-full">{pendingOrdersCount}</span>
              )}
            </button>
            <button
              onClick={() => setActiveView('delivery')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap ${
                activeView === 'delivery' 
                  ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              Live Delivery
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap flex items-center gap-1.5 ${
                activeView === 'analytics' 
                  ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Analytics</span>
            </button>
            <button
              onClick={() => setActiveView('users')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap ${
                activeView === 'users' 
                  ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              Users &amp; RBAC
            </button>
            <button
              onClick={() => setActiveView('backup')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap flex items-center gap-1.5 ${
                activeView === 'backup' 
                  ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span>Drive Sync</span>
              {isOffline ? (
                <span className="text-[9px] font-bold bg-rose-500 text-white px-1.5 py-0.2 rounded-full">
                  Offline
                </span>
              ) : (
                settings.autoSyncDriveEnabled && (
                  <span className="text-[9px] font-mono font-bold bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full">
                    {nextSyncCountdown}s
                  </span>
                )
              )}
            </button>
            <button
              id="mobile-nav-settings-tab"
              onClick={() => setActiveView('settings')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap flex items-center gap-1.5 ${
                activeView === 'settings' 
                  ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
            {/* Mobile Biometric Scan Button */}
            <button
              id="mobile-nav-biometric-btn"
              onClick={() => openBiometricScanner({
                mode: 'test',
                title: 'Biometric Fingerprint Scanner',
                subtitle: 'Real capacitive screen touch on phone screen',
                userName: currentUser.name,
                userRole: currentUser.role,
                existingKeyId: currentUser.biometricKeyId
              })}
              className="px-3 py-1.5 rounded-lg font-bold whitespace-nowrap flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
              title="Touch screen fingerprint scanner"
            >
              <Fingerprint className="w-3.5 h-3.5 text-emerald-500" />
              <span>Biometrics</span>
            </button>

            {/* Mobile Theme Toggle Button */}
            <button
              id="mobile-nav-theme-toggle"
              onClick={toggleTheme}
              className="px-3 py-1.5 rounded-lg font-bold whitespace-nowrap flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title={`Toggle theme (${resolvedTheme})`}
            >
              {resolvedTheme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-700" />
                  <span>Dark</span>
                </>
              )}
            </button>
            {/* Mobile Simulate Outage Quick Tab */}
            <button
              id="mobile-nav-outage-toggle"
              onClick={() => setIsOfflineModalOpen(true)}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap flex items-center gap-1.5 cursor-pointer transition-all ${
                isOffline 
                  ? 'bg-rose-600 text-white shadow-xs animate-pulse' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title="Simulate network outage & offline continuity"
            >
              {isOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-white" />
                  <span>Offline Active</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Simulate Outage</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar for Storefront (screens below md) */}
        {activeView === 'shop' && (
          <div className="md:hidden pb-2.5 pt-0.5">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                id="mobile-storefront-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products (typos tolerated)..."
                className="w-full bg-slate-100 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  id="mobile-clear-search-btn"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Network Outage Simulator & Continuity Modal */}
      <NetworkOutageSimulatorModal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
      />

      {/* Multi-Device Real-Time Sync Modal */}
      <MultiDeviceSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />
    </header>
  );
};
