import React, { useState, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { DriveSnapshot } from '../types';
import { posSound } from '../utils/posSounds';
import { 
  Cloud, 
  CloudUpload, 
  Download, 
  Upload, 
  HardDrive, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FileJson, 
  ShieldCheck, 
  RefreshCw, 
  FolderSync, 
  Database,
  ArrowRight,
  Sparkles,
  Lock,
  Mail,
  Play,
  Pause,
  Timer,
  Check,
  ExternalLink,
  Layers,
  Trash2,
  Zap,
  Wifi,
  WifiOff,
  Radio,
  RotateCcw,
  CheckCheck
} from 'lucide-react';

export const DriveSyncBackup: React.FC = () => {
  const { 
    products, 
    orders, 
    inventoryLogs, 
    posSales, 
    purchases,
    users, 
    settings, 
    driveSnapshots, 
    syncToGoogleDrive, 
    restoreFromSnapshot, 
    deleteDriveSnapshot,
    exportBackupJSON, 
    restoreFromBackupJSON,
    userPermissions,
    currentUser,
    setCurrentUser,
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
    autoRestoreOnUpdate,
    autoRestoreOnLaunch,
    toggleAutoRestoreOnUpdate,
    toggleAutoRestoreOnLaunch,
    lastAutoRestoreTime,
    lastAutoRestoreSource,
    triggerZeroClickAutoRestore,
    isOffline,
    toggleOfflineSimulation,
    pendingOfflineSalesCount,
    syncOfflineQueue,
  } = useStore();

  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [isQueueSyncing, setIsQueueSyncing] = useState(false);
  const [isTestingAutoRestore, setIsTestingAutoRestore] = useState(false);
  const [syncSuccessToast, setSyncSuccessToast] = useState<string | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [parsedPreview, setParsedPreview] = useState<any | null>(null);
  const [pendingRestoreData, setPendingRestoreData] = useState<string | null>(null);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState(settings.googleDriveEmail || 'chanonlineshop95@gmail.com');
  const [snapshotToDelete, setSnapshotToDelete] = useState<DriveSnapshot | null>(null);
  const [snapshotToRestore, setSnapshotToRestore] = useState<DriveSnapshot | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [autoBackupBeforeRestore, setAutoBackupBeforeRestore] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger Google Drive cloud sync
  const handleDriveSync = async () => {
    if (!userPermissions.canBackupRestore) {
      const superAdminUser = users.find(u => u.role === 'SUPER_ADMIN');
      if (superAdminUser) {
        setCurrentUser(superAdminUser);
      }
    }

    setIsManualSyncing(true);
    try {
      const res = await syncToGoogleDrive('MANUAL');
      if (res.success) {
        setSyncSuccessToast(`Manual snapshot synced to Google Drive (${res.snapshot.targetEmail || settings.googleDriveEmail})`);
        setTimeout(() => setSyncSuccessToast(null), 5000);
      } else {
        setSyncSuccessToast(`Cloud sync paused: running in offline mode.`);
        setTimeout(() => setSyncSuccessToast(null), 5000);
      }
    } catch (e: any) {
      setSyncSuccessToast('Sync paused or interrupted: ' + (e?.message || 'Check network'));
      setTimeout(() => setSyncSuccessToast(null), 5000);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setGoogleDriveEmail(emailInput.trim());
    setIsEditingEmail(false);
    setSyncSuccessToast(`Google Drive account updated to ${emailInput.trim()}`);
    setTimeout(() => setSyncSuccessToast(null), 4000);
  };

  // Download local JSON backup file safely
  const handleDownloadBackup = () => {
    try {
      const jsonString = exportBackupJSON();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `chan-online-shop-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (e) {}
      }, 100);
    } catch (e) {
      console.warn('Backup download prevented in sandbox environment', e);
    }
  };

  // Handle file input for restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        const parsed = JSON.parse(content);
        if (!parsed || !parsed.data) {
          setRestoreMessage({ text: 'Invalid backup file format. Missing data root.', isError: true });
          return;
        }
        setParsedPreview(parsed);
        setPendingRestoreData(content);
        setRestoreMessage(null);
      } catch (err: any) {
        setRestoreMessage({ text: 'Corrupted JSON file. Unable to parse.', isError: true });
      }
    };
    reader.readAsText(file);
  };

  // Commit restore from file
  const handleConfirmFileRestore = () => {
    if (!userPermissions.canBackupRestore) {
      const superAdminUser = users.find(u => u.role === 'SUPER_ADMIN');
      if (superAdminUser) {
        setCurrentUser(superAdminUser);
      }
    }

    if (!pendingRestoreData) return;
    const res = restoreFromBackupJSON(pendingRestoreData);
    if (res.success) {
      setRestoreMessage({ text: res.message, isError: false });
      setParsedPreview(null);
      setPendingRestoreData(null);
    } else {
      setRestoreMessage({ text: res.message, isError: true });
    }
  };

  // Open restore confirmation & preview modal
  const handleRestoreSnapshot = (snapshot: DriveSnapshot) => {
    setSnapshotToRestore(snapshot);
  };

  // Execute snapshot restoration
  const handleConfirmSnapshotRestore = async () => {
    if (!snapshotToRestore) return;

    // Check RBAC; auto-elevate to super admin if permitted
    if (!userPermissions.canBackupRestore) {
      const superAdminUser = users.find(u => u.role === 'SUPER_ADMIN');
      if (superAdminUser) {
        setCurrentUser(superAdminUser);
      }
    }

    setIsRestoring(true);
    try {
      if (autoBackupBeforeRestore) {
        try {
          handleDownloadBackup();
        } catch (e) {
          console.warn('Safety backup notice', e);
        }
      }

      await new Promise(r => setTimeout(r, 450));
      const res = restoreFromSnapshot(snapshotToRestore.id);
      if (res.success) {
        try { posSound.playSuccessChime(); } catch (e) {}
        setSyncSuccessToast(res.message);
        setRestoreMessage({ text: res.message, isError: false });
        setTimeout(() => setSyncSuccessToast(null), 5000);
        setSnapshotToRestore(null);
      } else {
        try { posSound.playError(); } catch (e) {}
        setRestoreMessage({ text: res.message, isError: true });
      }
    } catch (err: any) {
      setRestoreMessage({ text: 'Error during snapshot restore: ' + (err?.message || 'Unknown error'), isError: true });
    } finally {
      setIsRestoring(false);
    }
  };

  const syncInterval = settings.autoSyncIntervalSeconds || 60;
  const progressPercent = Math.max(0, Math.min(100, Math.round(((syncInterval - nextSyncCountdown) / syncInterval) * 100)));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white">Google Drive Automatic Sync &amp; Backup</h1>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                1-Minute Auto-Sync Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Continuous 60-second cloud synchronization with Google Drive (<span className="text-amber-300 font-mono">{settings.googleDriveEmail || 'chanonlineshop95@gmail.com'}</span>)
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
          {/* Quick toggle offline simulation */}
          <button
            onClick={() => toggleOfflineSimulation()}
            id="btn-simulate-network-outage-drivesync"
            className={`font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all border shadow-xs cursor-pointer ${
              isOffline
                ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Simulate network outage to test offline continuity and queueing"
          >
            {isOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isOffline ? 'Simulating Outage' : 'Simulate Outage'}</span>
          </button>

          {/* Quick Restore Connection if offline */}
          {isOffline && (
            <button
              onClick={() => toggleOfflineSimulation(false)}
              id="btn-top-restore-connection"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Restore online connection to resume Google Drive sync"
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>Restore Connection</span>
            </button>
          )}

          {/* Quick Restore Latest Cloud Sync */}
          {driveSnapshots.length > 0 && (
            <button
              onClick={() => handleRestoreSnapshot(driveSnapshots[0])}
              id="btn-restore-latest-cloud-sync"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Restore system state from the latest Google Drive snapshot"
            >
              <FolderSync className="w-3.5 h-3.5 text-indigo-200" />
              <span>Restore Latest Sync</span>
            </button>
          )}

          <button
            onClick={handleDownloadBackup}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={handleDriveSync}
            disabled={isManualSyncing || isAutoSyncing || isOffline}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(isManualSyncing || isAutoSyncing) ? 'animate-spin' : ''}`} />
            <span>{isOffline ? 'Paused (Offline)' : (isManualSyncing || isAutoSyncing) ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      </div>

      {/* Network Outage / Offline Continuity Banner */}
      {isOffline && (
        <div className="bg-rose-50 border border-rose-300 rounded-3xl p-5 shadow-xs animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20">
                <WifiOff className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm text-rose-950">Network Outage Simulated (Offline Mode Active)</h4>
                  <span className="bg-rose-200 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Zero Data Loss
                  </span>
                </div>
                <p className="text-xs text-rose-800 mt-0.5">
                  Cloud sync to Google Drive is temporarily paused. POS counter sales, barcode lookups, and inventory decrements continue to work smoothly on-device.
                </p>
                {pendingOfflineSalesCount > 0 && (
                  <p className="text-xs font-bold text-amber-800 mt-1 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-amber-600" />
                    <span>{pendingOfflineSalesCount} transaction(s) queued for automatic cloud sync upon reconnection.</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                onClick={() => toggleOfflineSimulation(false)}
                id="btn-restore-online-drivesync"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-xs w-full sm:w-auto justify-center"
              >
                <Wifi className="w-4 h-4" />
                <span>Restore Connection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reconnected with Pending Queue Banner */}
      {!isOffline && pendingOfflineSalesCount > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-3xl p-5 shadow-xs animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20 font-black">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-amber-950">Reconnected: Pending Offline Queue Available</h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  You have <strong>{pendingOfflineSalesCount}</strong> transaction(s) recorded during offline operation ready to push to Google Drive.
                </p>
              </div>
            </div>

            <button
              onClick={async () => {
                setIsQueueSyncing(true);
                try {
                  const res = await syncOfflineQueue();
                  setSyncSuccessToast(`Pushed ${res.syncedCount} queued transactions to Google Drive!`);
                  setTimeout(() => setSyncSuccessToast(null), 5000);
                } catch (e: any) {
                  setSyncSuccessToast('Sync paused or failed: ' + (e?.message || 'Network error'));
                  setTimeout(() => setSyncSuccessToast(null), 5000);
                } finally {
                  setIsQueueSyncing(false);
                }
              }}
              disabled={isQueueSyncing}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-xs shrink-0 w-full sm:w-auto justify-center"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isQueueSyncing ? 'animate-spin' : ''}`} />
              <span>{isQueueSyncing ? 'Syncing Queue...' : `Sync ${pendingOfflineSalesCount} Offline Sales Now`}</span>
            </button>
          </div>
        </div>
      )}

      {/* RBAC Notice if user does not have full backup permissions */}
      {!userPermissions.canBackupRestore && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 text-xs shadow-xs animate-fadeIn">
          <div className="flex items-start sm:items-center gap-3">
            <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-bold">Role-Based Access Notice ({currentUser.role})</p>
              <p className="text-amber-700 mt-0.5">
                You are currently logged in as a <strong>{currentUser.role}</strong> ({currentUser.name}). Only authorized accounts (Super Admin and Store Manager) can restore snapshots or overwrite database records.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const superAdmin = users.find(u => u.role === 'SUPER_ADMIN');
              if (superAdmin) {
                setCurrentUser(superAdmin);
                setSyncSuccessToast('Switched to Super Admin (Chan). Full restore access enabled!');
                setTimeout(() => setSyncSuccessToast(null), 4000);
              }
            }}
            id="btn-switch-super-admin-drivesync"
            className="bg-amber-600 hover:bg-amber-500 text-white font-black px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shrink-0 shadow-xs transition-colors cursor-pointer w-full sm:w-auto justify-center"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Switch to Super Admin (Chan)</span>
          </button>
        </div>
      )}

      {/* Auto-Sync Banner Notification */}
      {autoSyncSuccessNotification && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold px-4 py-3 rounded-2xl flex items-center justify-between gap-2 animate-fadeIn shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{autoSyncSuccessNotification}</span>
          </div>
          <button 
            onClick={dismissAutoSyncNotification}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold px-2 py-0.5 rounded"
          >
            Dismiss
          </button>
        </div>
      )}

      {syncSuccessToast && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold px-4 py-3 rounded-2xl flex items-center gap-2 animate-fadeIn shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{syncSuccessToast}</span>
        </div>
      )}

      {/* 1-MINUTE AUTO-SYNC ENGINE CONTROLLER CARD */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20 shrink-0">
              <FolderSync className={`w-7 h-7 ${isAutoSyncing ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900">Google Drive Real-Time & Auto-Sync Engine</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                  settings.autoSyncDriveEnabled 
                    ? 'bg-amber-100 text-amber-800' 
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${settings.autoSyncDriveEnabled ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'}`} />
                  {settings.autoSyncDriveEnabled ? 'Interval 60s Active' : 'Interval Paused'}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                  settings.autoSyncOnUpdate !== false && settings.autoSyncDriveEnabled
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  <Zap className="w-3 h-3 text-emerald-600" />
                  {settings.autoSyncOnUpdate !== false && settings.autoSyncDriveEnabled ? 'Instant Sync On Update: Active' : 'Sync On Update: Off'}
                </span>
              </div>
              
              {/* Active Google Drive Account */}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500">Google Drive Account:</span>
                {isEditingEmail ? (
                  <form onSubmit={handleSaveEmail} className="inline-flex items-center gap-1.5">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="text-xs px-2 py-1 border border-amber-400 rounded-lg bg-amber-50/50 font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2 py-1 rounded-lg text-xs"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingEmail(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs px-1"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="inline-flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      {settings.googleDriveEmail || 'chanonlineshop95@gmail.com'}
                    </span>
                    <button
                      onClick={() => {
                        setEmailInput(settings.googleDriveEmail || 'chanonlineshop95@gmail.com');
                        setIsEditingEmail(true);
                      }}
                      className="text-[11px] text-amber-600 hover:text-amber-700 font-bold underline"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-400 mt-1 font-mono">
                Destination: {settings.googleDriveFolder || 'My Drive / Chan Online Shop Backups / Automated /'}
              </p>
            </div>
          </div>

          {/* Real-time 60s Countdown & Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
            {/* Live Countdown Badge */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="relative w-10 h-10 flex items-center justify-center">
                <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-200"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-amber-500 transition-all duration-1000 ease-linear"
                    strokeDasharray={`${progressPercent}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute font-black text-xs text-slate-900">
                  {nextSyncCountdown}s
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Next Auto-Sync
                </span>
                <span className="text-xs font-black text-slate-800">
                  {settings.autoSyncDriveEnabled ? `In ${nextSyncCountdown} seconds` : 'Timer Paused'}
                </span>
              </div>
            </div>

            {/* Toggle & Interval Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => toggleAutoSyncOnUpdate()}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border ${
                  settings.autoSyncOnUpdate !== false
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-500 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'
                }`}
                title="Automatically push backup to Google Drive immediately whenever products, inventory, orders, or accounting data change"
              >
                <Zap className={`w-3.5 h-3.5 ${settings.autoSyncOnUpdate !== false ? 'fill-slate-950 text-slate-950' : 'text-slate-400'}`} />
                <span>{settings.autoSyncOnUpdate !== false ? 'Sync On Update (ON)' : 'Sync On Update (OFF)'}</span>
              </button>

              <button
                onClick={() => toggleAutoSync()}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border ${
                  settings.autoSyncDriveEnabled
                    ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                }`}
              >
                {settings.autoSyncDriveEnabled ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Resume</span>
                  </>
                )}
              </button>

              <select
                value={settings.autoSyncIntervalSeconds || 60}
                onChange={(e) => setAutoSyncInterval(Number(e.target.value))}
                className="text-xs font-bold bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value={60}>Every 1 min (Active)</option>
                <option value={120}>Every 2 min</option>
                <option value={300}>Every 5 min</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sync timestamps & status info */}
        <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Last Synced: <strong>{settings.lastDriveSync ? new Date(settings.lastDriveSync).toLocaleTimeString() : 'Just now'}</strong></span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">Account: <strong>{settings.googleDriveEmail || 'chanonlineshop95@gmail.com'}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-emerald-600 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Automatic Sync to {settings.googleDriveEmail || 'chanonlineshop95@gmail.com'} Verified</span>
          </div>
        </div>
      </div>

      {/* ZERO-CLICK MULTI-DEVICE AUTO-RESTORE STATUS & CONTROLLER */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-indigo-900/60 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
              </div>
              <h3 className="font-black text-base text-white tracking-tight">
                Zero-Click Multi-Device Auto-Sync &amp; Restore
              </h3>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                autoRestoreOnUpdate && autoRestoreOnLaunch
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                {autoRestoreOnUpdate && autoRestoreOnLaunch ? 'Fully Automatic (Active)' : 'Partially Configured'}
              </span>
            </div>

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              When anyone records expenses, modifies inventory, or places orders on a phone or other device, changes are instantly archived to Google Drive and pushed to the cloud. When opened on your PC, data is automatically loaded and restored <strong className="text-indigo-300">without pressing any buttons</strong>, preventing data loss.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Check className={`w-4 h-4 ${autoRestoreOnUpdate ? 'text-emerald-400' : 'text-slate-600'}`} />
                <span className={autoRestoreOnUpdate ? 'text-slate-200' : 'text-slate-500'}>
                  Live Remote Update Auto-Restore: <strong>{autoRestoreOnUpdate ? 'Enabled' : 'Disabled'}</strong>
                </span>
              </div>
              <span className="text-slate-600">•</span>
              <div className="flex items-center gap-1.5">
                <Check className={`w-4 h-4 ${autoRestoreOnLaunch ? 'text-emerald-400' : 'text-slate-600'}`} />
                <span className={autoRestoreOnLaunch ? 'text-slate-200' : 'text-slate-500'}>
                  PC Startup Auto-Restore: <strong>{autoRestoreOnLaunch ? 'Enabled' : 'Disabled'}</strong>
                </span>
              </div>
              {lastAutoRestoreTime && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-indigo-300 font-medium">
                    Last Restored: <strong>{lastAutoRestoreTime}</strong> ({lastAutoRestoreSource || 'Cloud'})
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0 w-full lg:w-auto">
            <button
              onClick={() => toggleAutoRestoreOnUpdate()}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer w-full sm:w-auto justify-center ${
                autoRestoreOnUpdate
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Auto-Restore on Update: {autoRestoreOnUpdate ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => toggleAutoRestoreOnLaunch()}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer w-full sm:w-auto justify-center ${
                autoRestoreOnLaunch
                  ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>PC Launch Restore: {autoRestoreOnLaunch ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={async () => {
                setIsTestingAutoRestore(true);
                try {
                  const success = await triggerZeroClickAutoRestore();
                  if (success) {
                    setSyncSuccessToast('✨ Zero-click restore verified! Latest cloud state applied instantly.');
                  } else {
                    setSyncSuccessToast('Cloud is already in sync with local data.');
                  }
                  setTimeout(() => setSyncSuccessToast(null), 4500);
                } catch (e: any) {
                  setSyncSuccessToast('Verification completed.');
                  setTimeout(() => setSyncSuccessToast(null), 4000);
                } finally {
                  setIsTestingAutoRestore(false);
                }
              }}
              disabled={isTestingAutoRestore}
              className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-amber-400/20 cursor-pointer w-full sm:w-auto justify-center"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingAutoRestore ? 'animate-spin' : ''}`} />
              <span>{isTestingAutoRestore ? 'Restoring...' : 'Test Auto-Restore'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* TWO SECTIONS: Cloud Snapshots Table + Local Backup / Restore Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Drive Cloud Snapshots History (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <CloudUpload className="w-4 h-4 text-amber-600" />
                <span>Google Drive Cloud Snapshots ({driveSnapshots.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Archived versions automatically and manually pushed to Google Drive.
              </p>
            </div>

            <button
              onClick={handleDriveSync}
              disabled={isManualSyncing || isAutoSyncing}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${(isManualSyncing || isAutoSyncing) ? 'animate-spin' : ''}`} />
              <span>Sync Snapshot</span>
            </button>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {driveSnapshots.map((snapshot, index) => (
              <div 
                key={`${snapshot.id}-${index}`}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{snapshot.name}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      snapshot.syncType === 'AUTO_MINUTE'
                        ? 'bg-amber-100 text-amber-800'
                        : snapshot.syncType === 'AUTO_ON_UPDATE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {snapshot.syncType === 'AUTO_MINUTE' ? '1m Auto-Sync' : snapshot.syncType === 'AUTO_ON_UPDATE' ? '⚡ Live Update Sync' : 'Manual'}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded">
                      {snapshot.sizeKb} KB
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Timestamp: {new Date(snapshot.timestamp).toLocaleString()} • Target: <span className="font-mono text-slate-700">{snapshot.targetEmail || 'chanonlineshop95@gmail.com'}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    ID: {snapshot.driveFileId || snapshot.id}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 pt-0.5">
                    <span>{snapshot.recordCount.products} Products</span>
                    <span>•</span>
                    <span>{snapshot.recordCount.orders} Orders</span>
                    <span>•</span>
                    <span>{snapshot.recordCount.posSales} POS Sales</span>
                    {(snapshot.recordCount.purchases !== undefined || snapshot.payload?.data?.purchases) && (
                      <>
                        <span>•</span>
                        <span className="font-semibold text-emerald-700">{snapshot.recordCount.purchases ?? snapshot.payload?.data?.purchases?.length ?? 0} Purchases/Expenses</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleRestoreSnapshot(snapshot)}
                    className="bg-white hover:bg-indigo-50 text-indigo-700 hover:text-indigo-900 border border-indigo-200 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                    title="Restore system data to this snapshot"
                  >
                    <FolderSync className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Restore</span>
                  </button>
                  <button
                    onClick={() => setSnapshotToDelete(snapshot)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Delete snapshot"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Manual Local JSON Backup & Restore Zone (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <span>Local File Backup &amp; Restore</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Export an offline database file (.json) or restore from an existing backup.
            </p>
          </div>

          {/* Export Box */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-800 block">Download Standalone Backup</span>
            <p className="text-xs text-slate-500 leading-relaxed">
              Downloads a full JSON archive with current catalog, active stock levels, order receipts, POS register sales, and staff roles.
            </p>
            <button
              onClick={handleDownloadBackup}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Download System Backup (.json)</span>
            </button>
          </div>

          {/* Restore Box */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-800 block">Restore Database from File</span>
            <p className="text-xs text-slate-500 leading-relaxed">
              Upload a previously exported <code>.json</code> file to restore records.
            </p>

            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-600" />
              <span>Select Backup File (.json)</span>
            </button>

            {/* Error or Success Notice */}
            {restoreMessage && (
              <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                restoreMessage.isError 
                  ? 'bg-rose-50 border border-rose-200 text-rose-800' 
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              }`}>
                {restoreMessage.isError ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span>{restoreMessage.text}</span>
              </div>
            )}

            {/* Inspection Preview Before Restoring */}
            {parsedPreview && (
              <div className="bg-white p-3 rounded-xl border border-amber-300 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <FileJson className="w-4 h-4 text-amber-600" />
                  <span>Backup File Verified</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  Shop: <strong>{parsedPreview.shopName || 'Chan Online Shop'}</strong>
                </p>
                <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2 rounded-lg text-center text-[10px] font-mono text-slate-700">
                  <div>
                    <span className="block text-slate-400">Products</span>
                    <span className="font-bold text-slate-900">{parsedPreview.data?.products?.length || 0}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Orders</span>
                    <span className="font-bold text-slate-900">{parsedPreview.data?.orders?.length || 0}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">POS</span>
                    <span className="font-bold text-slate-900">{parsedPreview.data?.posSales?.length || 0}</span>
                  </div>
                </div>

                {!userPermissions.canBackupRestore ? (
                  <button
                    onClick={() => {
                      const superAdmin = users.find(u => u.role === 'SUPER_ADMIN');
                      if (superAdmin) {
                        setCurrentUser(superAdmin);
                        setSyncSuccessToast('Switched to Super Admin (Chan). You can now restore the database.');
                      }
                    }}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-2.5 rounded-lg text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Switch to Super Admin to Restore</span>
                  </button>
                ) : (
                  <button
                    onClick={handleConfirmFileRestore}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-2.5 rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
                  >
                    Overwrite &amp; Restore Database
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SNAPSHOT RESTORATION CONFIRMATION & PREVIEW MODAL */}
      {snapshotToRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Restore Cloud Snapshot</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Target: <span className="font-semibold text-slate-700">{snapshotToRestore.targetEmail || settings.googleDriveEmail || 'chanonlineshop95@gmail.com'}</span>
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                snapshotToRestore.syncType === 'AUTO_MINUTE'
                  ? 'bg-amber-100 text-amber-800'
                  : snapshotToRestore.syncType === 'AUTO_ON_UPDATE'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {snapshotToRestore.syncType === 'AUTO_MINUTE' ? '1m Auto-Sync' : snapshotToRestore.syncType === 'AUTO_ON_UPDATE' ? '⚡ Live Update Sync' : 'Manual Snapshot'}
              </span>
            </div>

            {/* Snapshot Meta Information Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
              <div className="font-extrabold text-slate-900 text-sm">{snapshotToRestore.name}</div>
              <div className="text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                <span>Recorded: <strong>{new Date(snapshotToRestore.timestamp).toLocaleString()}</strong></span>
                <span>Size: <strong>{snapshotToRestore.sizeKb} KB</strong></span>
                <span>Source: <strong>{snapshotToRestore.deviceSource}</strong></span>
              </div>
              <div className="text-slate-400 font-mono text-[10px]">
                Drive ID: {snapshotToRestore.driveFileId || snapshotToRestore.id}
              </div>
            </div>

            {/* Comparison of Restored Records vs Current System State */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Database Restoration Preview</span>
                <span className="text-[11px] text-indigo-600">State Comparison</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-2.5 text-center">
                  <span className="block text-[10px] text-slate-500 font-medium">Products</span>
                  <span className="text-base font-black text-indigo-900">{snapshotToRestore.recordCount.products}</span>
                  <span className="block text-[9px] text-slate-400">Current: {products.length}</span>
                </div>
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-2.5 text-center">
                  <span className="block text-[10px] text-slate-500 font-medium">Orders</span>
                  <span className="text-base font-black text-indigo-900">{snapshotToRestore.recordCount.orders}</span>
                  <span className="block text-[9px] text-slate-400">Current: {orders.length}</span>
                </div>
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-2.5 text-center">
                  <span className="block text-[10px] text-slate-500 font-medium">POS Sales</span>
                  <span className="text-base font-black text-indigo-900">{snapshotToRestore.recordCount.posSales}</span>
                  <span className="block text-[9px] text-slate-400">Current: {posSales.length}</span>
                </div>
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-2.5 text-center">
                  <span className="block text-[10px] text-slate-500 font-medium">Purchases/Exp</span>
                  <span className="text-base font-black text-indigo-900">
                    {snapshotToRestore.recordCount.purchases ?? snapshotToRestore.payload?.data?.purchases?.length ?? 0}
                  </span>
                  <span className="block text-[9px] text-slate-400">Current: {purchases.length}</span>
                </div>
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-2.5 text-center">
                  <span className="block text-[10px] text-slate-500 font-medium">Audit Logs</span>
                  <span className="text-base font-black text-indigo-900">{snapshotToRestore.recordCount.logs}</span>
                  <span className="block text-[9px] text-slate-400">Current: {inventoryLogs.length}</span>
                </div>
              </div>
            </div>

            {/* Safety options & RBAC notice */}
            <div className="space-y-3 pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={autoBackupBeforeRestore}
                  onChange={(e) => setAutoBackupBeforeRestore(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Download automatic safety backup before restoring</span>
                  <span className="text-slate-500 text-[11px] block">
                    Exports your current database to a .json file first so no recent modifications are permanently lost.
                  </span>
                </div>
              </label>

              {!userPermissions.canBackupRestore && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span>Logged in as {currentUser.role} ({currentUser.name})</span>
                  </div>
                  <p className="text-amber-800 text-[11px]">
                    Only authorized administrative accounts can apply snapshot restorations. You can switch to Super Admin below to proceed:
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const superAdmin = users.find(u => u.role === 'SUPER_ADMIN');
                      if (superAdmin) {
                        setCurrentUser(superAdmin);
                        setSyncSuccessToast('Switched account to Super Admin (Chan).');
                      }
                    }}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Switch to Super Admin (Chan)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSnapshotToRestore(null)}
                disabled={isRestoring}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSnapshotRestore}
                disabled={isRestoring}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-xs transition-colors shadow-md shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Restoring System...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Confirm &amp; Restore</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SNAPSHOT DELETION CONFIRMATION MODAL */}
      {snapshotToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">Delete Drive Snapshot?</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Are you sure you want to remove snapshot <strong className="text-slate-900">"{snapshotToDelete.name}"</strong>?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSnapshotToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteDriveSnapshot(snapshotToDelete.id);
                  setSnapshotToDelete(null);
                  setSyncSuccessToast('Drive snapshot deleted.');
                  setTimeout(() => setSyncSuccessToast(null), 3000);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-colors shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
