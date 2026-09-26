import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  WifiOff, 
  Wifi, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Database, 
  HardDrive, 
  Radio, 
  X,
  Info,
  Power
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface NetworkOutageSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NetworkOutageSimulatorModal: React.FC<NetworkOutageSimulatorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    isOffline,
    toggleOfflineSimulation,
    pendingOfflineSalesCount,
    syncOfflineQueue,
    posSales,
    settings,
    products,
    inventoryLogs,
  } = useStore();

  const [isSyncingQueue, setIsSyncingQueue] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  if (!isOpen || typeof document === 'undefined') return null;

  const offlineSales = posSales.filter(s => s.isOfflineSyncPending);

  const handleManualSyncQueue = async () => {
    if (isOffline) {
      alert('Cannot sync queue while in simulated offline mode. Please restore network connection first.');
      return;
    }
    setIsSyncingQueue(true);
    try {
      const res = await syncOfflineQueue();
      setSyncFeedback(`Successfully synced ${res.syncedCount} queued transactions to Cloud!`);
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch (err: any) {
      alert('Failed to sync queue: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSyncingQueue(false);
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[calc(100dvh-2.5rem)] my-auto animate-in zoom-in-95 duration-150 relative"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`p-5 flex items-center justify-between border-b shrink-0 ${
          isOffline 
            ? 'bg-rose-50 border-rose-200 text-rose-950' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-950'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
              isOffline 
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' 
                : 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
            }`}>
              {isOffline ? <WifiOff className="w-6 h-6 animate-pulse" /> : <Wifi className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black">
                  Network Outage Simulator
                </h3>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isOffline ? 'bg-rose-200 text-rose-900 border border-rose-300' : 'bg-emerald-200 text-emerald-900 border border-emerald-300'
                }`}>
                  {isOffline ? 'Offline Active' : 'Online (Normal)'}
                </span>
              </div>
              <p className="text-xs opacity-80 mt-0.5">
                Zero-data-loss POS cash register & local caching continuity
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            id="btn-close-outage-modal-x"
            className="p-2 rounded-xl hover:bg-black/10 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            title="Close simulator"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto min-h-0 flex-1">
          {/* PRIMARY INSTANT ACTION CARD */}
          {isOffline ? (
            <div className="bg-gradient-to-br from-rose-600 to-rose-700 text-white rounded-2xl p-4 shadow-md space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-black text-sm text-white">
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                    <span>Outage Simulation is Currently ACTIVE</span>
                  </div>
                  <p className="text-xs text-rose-100 leading-relaxed">
                    Google Drive cloud synchronization and remote APIs are paused. The POS register and local storage are operating in 100% offline continuity mode.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-rose-500/60">
                <span className="text-xs text-rose-200 font-bold">
                  {pendingOfflineSalesCount} pending offline receipt{pendingOfflineSalesCount !== 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    toggleOfflineSimulation(false);
                    setSyncFeedback('Network restored! Google Drive automated sync will resume.');
                    setTimeout(() => setSyncFeedback(null), 4000);
                  }}
                  id="btn-modal-restore-online"
                  className="bg-white text-rose-700 hover:bg-rose-50 font-black px-4 py-2 rounded-xl text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Wifi className="w-4 h-4 text-emerald-600" />
                  <span>Restore Online Connection</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-black text-sm text-white">
                    <Radio className="w-4 h-4 text-emerald-400" />
                    <span>System is Online &amp; Synchronized</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Cloud sync is operating normally. Click the button below to simulate an ISP or cellular data outage and verify that your POS register continues ringing sales offline without losing data.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <span className="text-[11px] text-slate-400">
                  Target: Google Drive Cloud Backup
                </span>
                <button
                  type="button"
                  onClick={() => {
                    toggleOfflineSimulation(true);
                    setSyncFeedback('Outage simulation activated! Cloud sync is paused.');
                    setTimeout(() => setSyncFeedback(null), 4000);
                  }}
                  id="btn-modal-start-outage"
                  className="bg-rose-500 hover:bg-rose-600 text-white font-black px-4 py-2 rounded-xl text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <WifiOff className="w-4 h-4" />
                  <span>Simulate Network Outage</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Toggle Switch Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800">
              <Power className={`w-4 h-4 ${isOffline ? 'text-rose-500' : 'text-emerald-600'}`} />
              <span>Offline Mode Switch:</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${isOffline ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {isOffline ? 'OFFLINE' : 'ONLINE'}
              </span>
            </div>

            <button
              onClick={() => toggleOfflineSimulation()}
              id="btn-toggle-network-outage-modal"
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                isOffline ? 'bg-rose-600' : 'bg-slate-300'
              }`}
              title={isOffline ? 'Click to restore online connection' : 'Click to simulate network outage'}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isOffline ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Offline Continuity Architecture Stats */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-1 shadow-2xs">
              <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
                <span>Local Device Storage</span>
              </div>
              <div className="text-lg font-black text-slate-900">
                {products.length} Products
              </div>
              <div className="text-[11px] text-slate-500">
                Cached locally ({inventoryLogs.length} audit logs)
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-1 shadow-2xs">
              <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                <Database className="w-3.5 h-3.5 text-amber-500" />
                <span>Pending Outbox Queue</span>
              </div>
              <div className={`text-lg font-black ${pendingOfflineSalesCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                {pendingOfflineSalesCount} Sale{pendingOfflineSalesCount !== 1 ? 's' : ''}
              </div>
              <div className="text-[11px] text-slate-500">
                Awaiting cloud transmission
              </div>
            </div>
          </div>

          {/* Test Instructions for Continuity */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 space-y-2">
            <div className="font-extrabold flex items-center gap-1.5 text-blue-950">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>How to test offline continuity:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-blue-800 leading-relaxed">
              <li>Click <strong>Simulate Network Outage</strong> above.</li>
              <li>Navigate to <strong>POS Register</strong> and process a sale (Cash or KHQR).</li>
              <li>Notice stock decrements instantly and the thermal receipt generates with an <em>Offline Stored</em> badge.</li>
              <li>Return here or click <strong>Restore Online</strong> — all sales transmit with 0% data loss!</li>
            </ol>
          </div>

          {/* Pending Sales List */}
          {offlineSales.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Offline Queued Transactions</span>
                <span className="text-amber-600 font-bold">{offlineSales.length} pending</span>
              </div>
              <div className="border border-slate-200 rounded-xl max-h-36 overflow-y-auto divide-y divide-slate-100 bg-slate-50 text-xs">
                {offlineSales.map(sale => (
                  <div key={sale.id} className="p-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-slate-800">{sale.receiptNumber}</span>
                      <span className="text-slate-500 text-[11px] block">{sale.customerName} • {sale.items.length} item(s)</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-900">${sale.total.toFixed(2)}</span>
                      <span className="block text-[10px] text-amber-600 font-bold">Unsynced</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {syncFeedback && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
          )}
        </div>

        {/* Modal Footer (Sticky at bottom of modal) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 text-center sm:text-left">
            Target Drive: <span className="font-semibold text-slate-700">{settings.googleDriveEmail || 'chanonlineshop95@gmail.com'}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {isOffline && (
              <button
                type="button"
                onClick={() => {
                  toggleOfflineSimulation(false);
                  setSyncFeedback('Network connection restored! Reconnecting to Google Drive...');
                  setTimeout(() => setSyncFeedback(null), 3500);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>Restore Connection</span>
              </button>
            )}

            {pendingOfflineSalesCount > 0 && !isOffline && (
              <button
                type="button"
                onClick={handleManualSyncQueue}
                disabled={isSyncingQueue}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingQueue ? 'animate-spin' : ''}`} />
                <span>Sync Queue Now ({pendingOfflineSalesCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              id="btn-footer-close-outage-modal"
              className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
