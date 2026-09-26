import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  RefreshCw, 
  Smartphone, 
  Laptop, 
  CheckCircle2, 
  Wifi, 
  Radio, 
  ArrowLeftRight,
  ShieldCheck,
  Server,
  Zap,
  BellRing
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { getOrCreateClientId } from '../utils/realtimeSync';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const MultiDeviceSyncModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { 
    syncStatus, 
    connectedDevicesCount, 
    lastSyncTime, 
    syncVersion, 
    triggerManualSync, 
    sendTestPing,
    products, 
    orders, 
    posSales 
  } = useStore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [pingSent, setPingSent] = useState(false);

  if (!isOpen) return null;

  const currentClientId = getOrCreateClientId();
  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const ok = await triggerManualSync();
      if (ok) {
        setSyncFeedback('Data successfully synchronized with server & all devices!');
      } else {
        setSyncFeedback('Sync check completed. State is current.');
      }
    } catch (e) {
      setSyncFeedback('Sync attempt finished.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  const handleSendPing = () => {
    sendTestPing(`Live ping from ${isMobile ? 'Mobile Phone' : 'PC'} at ${new Date().toLocaleTimeString()}`);
    setPingSent(true);
    setTimeout(() => setPingSent(false), 3000);
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 my-auto max-h-[calc(100dvh-2.5rem)] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-6 relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <ArrowLeftRight className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-white">Live Multi-Device Sync</h3>
                <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {syncStatus === 'CONNECTED' ? 'Real-Time Sync' : 'Catch-Up Polling'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Instant sync across PC register, smartphones, and tablets
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Status Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3.5 h-3.5 rounded-full ${
                syncStatus === 'CONNECTED' ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50 animate-pulse' :
                syncStatus === 'POLLING' ? 'bg-amber-500 shadow-xs shadow-amber-500/50' : 'bg-slate-400'
              }`} />
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {syncStatus === 'CONNECTED' ? 'Real-Time Stream Active (SSE & WS)' : 'Fast Adaptive Sync Active'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {connectedDevicesCount} active device{connectedDevicesCount > 1 ? 's' : ''} connected • Server state v{syncVersion}
                </p>
              </div>
            </div>

            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>

          {syncFeedback && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl p-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
          )}

          {/* Quick Connect Another Device Card */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-amber-600" />
                  Open on your Phone or another PC
                </p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Open this exact shop link on your mobile browser to see live instant updates
                </p>
              </div>
              <button
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  copiedLink
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                }`}
              >
                {copiedLink ? 'Copied Link!' : 'Copy App Link'}
              </button>
            </div>
          </div>

          {/* Quick Ping Test */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <BellRing className="w-3.5 h-3.5 text-amber-600" />
                Live Device Test
              </p>
              <p className="text-[11px] text-slate-500">
                Send an instant alert to your {isMobile ? 'PC' : 'Phone'} to verify real-time sync
              </p>
            </div>
            <button
              onClick={handleSendPing}
              disabled={pingSent}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                pingSent
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-900 text-white shadow-xs'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{pingSent ? 'Ping Broadcasted!' : 'Send Test Ping'}</span>
            </button>
          </div>

          {/* Device Architecture Diagram */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-4 rounded-2xl border text-center transition-all ${
              !isMobile ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-500/20' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center mx-auto mb-2 shadow-xs">
                <Laptop className="w-5 h-5" />
              </div>
              <p className="text-xs font-black text-slate-900">PC / Desktop</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {!isMobile ? 'This Device (Active)' : 'Connected'}
              </p>
              <span className="inline-block mt-2 text-[9px] font-mono font-bold bg-white text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                POS & Management
              </span>
            </div>

            <div className={`p-4 rounded-2xl border text-center transition-all ${
              isMobile ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-500/20' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-sky-400 flex items-center justify-center mx-auto mb-2 shadow-xs">
                <Smartphone className="w-5 h-5" />
              </div>
              <p className="text-xs font-black text-slate-900">Mobile Phone</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {isMobile ? 'This Device (Active)' : 'Connected'}
              </p>
              <span className="inline-block mt-2 text-[9px] font-mono font-bold bg-white text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                Live Storefront & POS
              </span>
            </div>
          </div>

          {/* Sync Information Details */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Device Identifier:</span>
              <span className="font-mono text-slate-800 font-bold text-[11px] truncate max-w-[200px]">{currentClientId}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Active Database Records:</span>
              <span className="font-bold text-slate-800">
                {products.length} Products • {orders.length} Orders • {posSales.length} POS Sales
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Last Synchronized:</span>
              <span className="font-semibold text-emerald-700">{lastSyncTime || 'Active in real-time'}</span>
            </div>
          </div>

          {/* How Multi-Device Sync Works Info */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed flex items-start gap-2.5">
            <Radio className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Real-time sync is fully automatic:</span> When stock is changed, sales are completed, or settings are updated on your PC, your phone immediately reflects the latest data without manual refresh. Background polling ensures mobile updates catch up even after waking up from lock screen.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
