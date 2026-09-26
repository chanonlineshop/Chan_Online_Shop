import React, { useState, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { AppUser, UserRole, UserPermissions } from '../types';
import { ROLE_PERMISSIONS } from '../data/initialUsers';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Key, 
  Lock, 
  Check, 
  X, 
  Phone, 
  Mail, 
  Trash2, 
  Edit2, 
  Sparkles,
  ShieldAlert,
  Clock,
  Unlock,
  CheckCircle2,
  ChevronRight,
  Upload,
  Camera,
  Fingerprint,
  KeyRound,
  Eye,
  EyeOff,
  Scan,
  RefreshCw,
  Zap
} from 'lucide-react';

export const UserManagementRBAC: React.FC = () => {
  const { 
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
    openBiometricScanner
  } = useStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('CASHIER');
  const [formPin, setFormPin] = useState('1234');
  const [formPasscode, setFormPasscode] = useState('123456');
  const [showPasscode, setShowPasscode] = useState(false);
  const [formAvatar, setFormAvatar] = useState('');
  
  // Biometric State
  const [formBiometricEnabled, setFormBiometricEnabled] = useState(false);
  const [formBiometricKeyId, setFormBiometricKeyId] = useState('');
  const [formBiometricRegisteredAt, setFormBiometricRegisteredAt] = useState('');
  const [isScanningFinger, setIsScanningFinger] = useState(false);
  const [fingerScanProgress, setFingerScanProgress] = useState(0);
  const [fingerScanSuccess, setFingerScanSuccess] = useState(false);

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Quick switch notification & security prompt
  const [switchAlert, setSwitchAlert] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
  const [userFeedbackMessage, setUserFeedbackMessage] = useState<string | null>(null);

  // Biometric session verification simulation
  const [verifyingUser, setVerifyingUser] = useState<AppUser | null>(null);
  const [bioVerifyProgress, setBioVerifyProgress] = useState<number>(0);
  const [bioVerifyStatus, setBioVerifyStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);

  const playTone = (freq = 880, duration = 0.15) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  };

  const handleSwitchUser = (user: AppUser) => {
    setCurrentUser(user);
    setSwitchAlert(`Switched active session to ${user.name} (${user.role})`);
    setTimeout(() => setSwitchAlert(null), 3500);
  };

  const handleOpenAdd = () => {
    setFormName('');
    setFormUsername('');
    setFormEmail('');
    setFormPhone('');
    setFormRole('CASHIER');
    setFormPin('1234');
    setFormPasscode('123456');
    setShowPasscode(false);
    setFormAvatar('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&h=200&q=80');
    setFormBiometricEnabled(false);
    setFormBiometricKeyId('');
    setFormBiometricRegisteredAt('');
    setFingerScanProgress(0);
    setFingerScanSuccess(false);
    setIsScanningFinger(false);
    setEditingUserId(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (user: AppUser) => {
    setFormName(user.name);
    setFormUsername(user.username);
    setFormEmail(user.email);
    setFormPhone(user.phone);
    setFormRole(user.role);
    setFormPin(user.pin);
    setFormPasscode(user.passcode || '123456');
    setShowPasscode(false);
    setFormAvatar(user.avatar || '');
    setFormBiometricEnabled(!!user.biometricEnabled);
    setFormBiometricKeyId(user.biometricKeyId || '');
    setFormBiometricRegisteredAt(user.biometricRegisteredAt || '');
    setFingerScanProgress(user.biometricEnabled ? 100 : 0);
    setFingerScanSuccess(!!user.biometricEnabled);
    setIsScanningFinger(false);
    setEditingUserId(user.id);
    setIsAddModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormAvatar(event.target.result as string);
        playTone(600, 0.1);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStartFingerprintScan = () => {
    openBiometricScanner({
      mode: 'enroll',
      title: 'Enroll Staff Biometric Fingerprint',
      subtitle: `Scanning real fingerprint for ${formName || 'Staff Account'}`,
      userName: formName || 'Staff Member',
      userRole: formRole,
      onSuccess: (keyId) => {
        setFormBiometricEnabled(true);
        setFormBiometricKeyId(keyId);
        setFormBiometricRegisteredAt(new Date().toISOString().slice(0, 10));
        setFingerScanProgress(100);
        setFingerScanSuccess(true);
        setIsScanningFinger(false);
      }
    });
  };

  const handleClearBiometric = () => {
    setFormBiometricEnabled(false);
    setFormBiometricKeyId('');
    setFormBiometricRegisteredAt('');
    setFingerScanProgress(0);
    setFingerScanSuccess(false);
  };

  const handleGeneratePasscode = () => {
    const generated = String(Math.floor(100000 + Math.random() * 900000));
    setFormPasscode(generated);
    setShowPasscode(true);
    playTone(700, 0.1);
  };

  const handleSubmitUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formUsername) {
      alert('Please fill in required name and username');
      return;
    }

    const fallbackAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&h=200&q=80';

    if (editingUserId) {
      updateUser(editingUserId, {
        name: formName,
        username: formUsername,
        email: formEmail,
        phone: formPhone,
        role: formRole,
        pin: formPin,
        passcode: formPasscode,
        avatar: formAvatar || fallbackAvatar,
        biometricEnabled: formBiometricEnabled,
        biometricKeyId: formBiometricEnabled ? (formBiometricKeyId || `BIO-FP-${Math.floor(1000 + Math.random() * 9000)}-KH`) : undefined,
        biometricRegisteredAt: formBiometricEnabled ? (formBiometricRegisteredAt || new Date().toISOString().slice(0, 10)) : undefined,
      });
      setUserFeedbackMessage(`Staff account "${formName}" updated with biometric & passcode security.`);
    } else {
      addUser({
        name: formName,
        username: formUsername,
        email: formEmail || `${formUsername}@chanonline.kh`,
        phone: formPhone || '070 433 464',
        role: formRole,
        avatar: formAvatar || fallbackAvatar,
        pin: formPin || '0000',
        passcode: formPasscode || '123456',
        biometricEnabled: formBiometricEnabled,
        biometricKeyId: formBiometricEnabled ? (formBiometricKeyId || `BIO-FP-${Math.floor(1000 + Math.random() * 9000)}-KH`) : undefined,
        biometricRegisteredAt: formBiometricEnabled ? (formBiometricRegisteredAt || new Date().toISOString().slice(0, 10)) : undefined,
        isActive: true,
      });
      setUserFeedbackMessage(`New staff account "${formName}" created successfully.`);
    }

    setTimeout(() => setUserFeedbackMessage(null), 3500);
    setIsAddModalOpen(false);
  };

  // Biometric / Passcode Quick Verification Handler
  const startBiometricVerification = (user: AppUser) => {
    openBiometricScanner({
      mode: 'verify',
      title: 'Biometric Login & Session Switch',
      subtitle: `Scanning real fingerprint for ${user.name} (${user.role})`,
      userName: user.name,
      userRole: user.role,
      existingKeyId: user.biometricKeyId,
      onSuccess: () => {
        handleSwitchUser(user);
        setVerifyingUser(null);
      }
    });
  };

  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingUser) return;
    const correctPasscode = verifyingUser.passcode || verifyingUser.pin || '1234';
    if (passcodeInput === correctPasscode || passcodeInput === verifyingUser.pin) {
      playTone(900, 0.2);
      handleSwitchUser(verifyingUser);
      setVerifyingUser(null);
    } else {
      playTone(300, 0.3);
      setPasscodeError(true);
      setTimeout(() => setPasscodeError(false), 2000);
    }
  };

  const handleDeleteUser = (user: AppUser) => {
    setUserToDelete(user);
  };

  const getRoleBadgeColor = (role: UserRole) => {
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
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white">User Management &amp; RBAC Security</h1>
              <span className="bg-purple-500/20 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-500/30">
                RBAC Enforced
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Role-Based Access Control matrix &amp; staff credential management for Chan Online Shop.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openBiometricScanner({
              mode: 'test',
              title: 'Biometric Fingerprint Scanner (Real Scan)',
              subtitle: 'Capacitive screen touch on phone & Windows Hello / Touch ID on PC',
              userName: currentUser.name,
              userRole: currentUser.role,
              existingKeyId: currentUser.biometricKeyId,
              onSuccess: () => {
                setSwitchAlert(`Biometric fingerprint scanned and verified for ${currentUser.name}!`);
                setTimeout(() => setSwitchAlert(null), 3500);
              }
            })}
            className="bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            title="Open real biometric fingerprint scanner"
          >
            <Fingerprint className="w-4 h-4 text-emerald-400" />
            <span>Test Biometrics</span>
          </button>

          {userPermissions.canManageUsers && (
            <button
              onClick={handleOpenAdd}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Staff Account</span>
            </button>
          )}
        </div>
      </div>

      {/* Switch Alert Notification */}
      {switchAlert && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold px-4 py-3 rounded-2xl flex items-center gap-2 animate-fadeIn shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{switchAlert}</span>
        </div>
      )}

      {/* ACTIVE USER SESSION SWITCHER BANNER */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Active Terminal Session
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <h3 className="text-base font-extrabold text-slate-900">{currentUser.name}</h3>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getRoleBadgeColor(currentUser.role)}`}>
                {currentUser.role.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Click on any staff member card below to switch active role.
          </div>
        </div>

        {/* Quick Staff User Cards with Biometric & Passcode Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {users.map(user => {
            const isActiveUser = currentUser.id === user.id;

            return (
              <div
                key={user.id}
                onClick={() => {
                  if (isActiveUser) return;
                  if (user.biometricEnabled) {
                    startBiometricVerification(user);
                  } else {
                    handleSwitchUser(user);
                  }
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none relative group ${
                  isActiveUser 
                    ? 'bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/20 shadow-xs' 
                    : 'bg-slate-50/70 border-slate-200 hover:border-amber-400 hover:bg-white hover:shadow-md'
                }`}
                title={user.biometricEnabled ? 'Click to verify with Biometric Fingerprint' : 'Click to switch session'}
              >
                {isActiveUser && (
                  <span className="absolute top-2.5 right-2.5 bg-amber-500 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                    Current
                  </span>
                )}

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
                    />
                    {user.biometricEnabled && (
                      <span 
                        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs border-2 border-white"
                        title="Biometric Fingerprint Enrolled"
                      >
                        <Fingerprint className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-slate-900 truncate">{user.name}</p>
                    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded border mt-0.5 ${getRoleBadgeColor(user.role)}`}>
                      {user.role.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] text-slate-400 font-mono">PIN: ****</span>
                      {user.passcode && (
                        <span className="text-[9px] bg-sky-50 text-sky-700 font-bold px-1.5 py-0.2 rounded border border-sky-200 flex items-center gap-0.5">
                          <KeyRound className="w-2.5 h-2.5" />
                          <span>Passcode</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!isActiveUser && (
                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 group-hover:text-amber-700 font-bold">
                    <span>{user.biometricEnabled ? 'Touch for Bio Scan' : 'Switch User'}</span>
                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* STAFF DIRECTORY TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-600" />
              <span>Staff Accounts &amp; Access Directory</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Authorized personnel with POS terminal, biometric fingerprint verification, and store management privileges.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-y border-slate-200">
              <tr>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Role / RBAC</th>
                <th className="py-3 px-4">Security &amp; Credentials</th>
                <th className="py-3 px-4">Biometric Fingerprint</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-2xs"
                      />
                      <div>
                        <span className="font-bold text-slate-900 block">{user.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">@{user.username}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeColor(user.role)}`}>
                      {user.role.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="space-y-1 text-[11px] font-mono">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Key className="w-3 h-3 text-slate-400" />
                        <span>PIN: {user.pin ? '••••' : 'Not set'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <KeyRound className="w-3 h-3 text-amber-500" />
                        <span>Passcode: {user.passcode ? '••••••' : 'Default'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {user.biometricEnabled ? (
                      <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xl text-[11px] font-bold">
                        <Fingerprint className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Enrolled</span>
                        <span className="text-[9px] text-emerald-600 font-mono font-normal">({user.biometricKeyId || 'FP-OK'})</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 text-slate-400 text-[11px]">
                        <Fingerprint className="w-3.5 h-3.5 text-slate-300" />
                        <span>Not Enrolled</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5 text-[11px]">
                      <div className="flex items-center gap-1 text-slate-700">
                        <Phone className="w-3 h-3 text-amber-600" />
                        <span>{user.phone}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <Mail className="w-3 h-3" />
                        <span>{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Active</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {user.biometricEnabled && (
                        <button
                          type="button"
                          onClick={() => startBiometricVerification(user)}
                          title="Verify Fingerprint & Switch"
                          className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                        >
                          <Fingerprint className="w-4 h-4" />
                        </button>
                      )}
                      {userPermissions.canManageUsers && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Edit profile"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {users.length > 1 && (
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete staff account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RBAC PERMISSIONS MATRIX VIEWER */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-600" />
              <span>Role-Based Access Control (RBAC) Permissions Matrix</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live role permission controls. Super Admin and Store Manager have full administrative authority across all modules.
            </p>
          </div>
          {userPermissions.canManageUsers && (
            <button
              onClick={() => resetRolePermissions()}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all self-start sm:self-auto flex items-center gap-1.5 cursor-pointer"
              title="Reset all role permissions to recommended defaults"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Permissions</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-900 text-white text-[11px]">
              <tr>
                <th className="py-3 px-4 font-bold">System Feature / Capability</th>
                <th className="py-3 px-4 font-bold text-center">Super Admin</th>
                <th className="py-3 px-4 font-bold text-center">Store Manager</th>
                <th className="py-3 px-4 font-bold text-center">Cashier</th>
                <th className="py-3 px-4 font-bold text-center">Dispatcher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {[
                { name: 'POS Cash Register Terminal', key: 'canAccessPOS' as keyof UserPermissions, desc: 'Scan items, barcode lookup, payments & receipts' },
                { name: 'Inventory & Stock Restock Adjustments', key: 'canManageInventory' as keyof UserPermissions, desc: 'Add/edit products, stock in/out, purchase orders' },
                { name: 'Customer Orders Fulfillment Queue', key: 'canManageOrders' as keyof UserPermissions, desc: 'Process storefront orders and mark fulfillment' },
                { name: 'Live Courier Dispatch & GPS Radar', key: 'canDispatchDelivery' as keyof UserPermissions, desc: 'Assign couriers and track live dispatch' },
                { name: 'User Management & Staff Accounts', key: 'canManageUsers' as keyof UserPermissions, desc: 'Add/edit staff accounts, PINs & biometrics' },
                { name: 'Google Drive Sync & Database Backup', key: 'canBackupRestore' as keyof UserPermissions, desc: 'Sync data to Drive cloud, export/import JSON, restore DB' },
                { name: 'Financial Margins & Cost Pricing Visibility', key: 'canViewFinancials' as keyof UserPermissions, desc: 'View cost prices, profit margins, and reports' },
                { name: 'Website & Storefront Settings', key: 'canEditSettings' as keyof UserPermissions, desc: 'Configure hotlines, delivery fees, and rates' },
              ].map((row, idx) => {
                const isSuperAdminAllowed = true;
                const isManagerAllowed = rolePermissions?.STORE_MANAGER?.[row.key] ?? true;
                const isCashierAllowed = rolePermissions?.CASHIER?.[row.key] ?? false;
                const isDispatcherAllowed = rolePermissions?.DISPATCHER?.[row.key] ?? false;

                return (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">{row.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{row.desc}</p>
                    </td>

                    {/* SUPER ADMIN (Fixed Full Access) */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200" title="Super Admin has immutable full system authority">
                        <Check className="w-4 h-4" />
                      </span>
                    </td>

                    {/* STORE MANAGER */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        disabled={!userPermissions.canManageUsers}
                        onClick={() => updateRolePermissions('STORE_MANAGER', { [row.key]: !isManagerAllowed })}
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition-all ${
                          isManagerAllowed
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-500 border border-rose-200 hover:bg-rose-100'
                        } ${userPermissions.canManageUsers ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
                        title={userPermissions.canManageUsers ? `Click to toggle Store Manager permission for ${row.name}` : undefined}
                      >
                        {isManagerAllowed ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </button>
                    </td>

                    {/* CASHIER */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        disabled={!userPermissions.canManageUsers}
                        onClick={() => updateRolePermissions('CASHIER', { [row.key]: !isCashierAllowed })}
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition-all ${
                          isCashierAllowed
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-500 border border-rose-200 hover:bg-rose-100'
                        } ${userPermissions.canManageUsers ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
                        title={userPermissions.canManageUsers ? `Click to toggle Cashier permission for ${row.name}` : undefined}
                      >
                        {isCashierAllowed ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </button>
                    </td>

                    {/* DISPATCHER */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        disabled={!userPermissions.canManageUsers}
                        onClick={() => updateRolePermissions('DISPATCHER', { [row.key]: !isDispatcherAllowed })}
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition-all ${
                          isDispatcherAllowed
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-500 border border-rose-200 hover:bg-rose-100'
                        } ${userPermissions.canManageUsers ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
                        title={userPermissions.canManageUsers ? `Click to toggle Dispatcher permission for ${row.name}` : undefined}
                      >
                        {isDispatcherAllowed ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT USER MODAL WITH FILE UPLOAD, BIOMETRIC SCAN & PASSCODE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-500" />
                  <span>{editingUserId ? 'Edit Staff Account' : 'Add New Staff Account'}</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Configure staff profile photo, credentials, passcode, and biometric fingerprint.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitUser} className="space-y-4 mt-4 text-xs">
              
              {/* 1. FILE UPLOAD FOR PROFILE */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <label className="font-bold text-slate-800 block mb-2">Staff Profile Picture</label>
                <div className="flex items-center gap-4">
                  {/* Avatar Circular Preview */}
                  <div className="relative group shrink-0">
                    <img
                      src={formAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&h=200&q=80'}
                      alt="Avatar Preview"
                      className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 shadow-sm bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-slate-900/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                      title="Click to change profile picture"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {/* Upload Actions & Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl border border-slate-300 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-amber-600" />
                        <span>Upload File</span>
                      </button>
                      
                      {formAvatar && (
                        <button
                          type="button"
                          onClick={() => setFormAvatar('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&h=200&q=80')}
                          className="px-2.5 py-1.5 text-slate-500 hover:text-rose-600 font-bold rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Upload employee photo (PNG, JPG, WebP). File will be saved securely.
                    </p>
                  </div>
                </div>
              </div>

              {/* Name and Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Sothea Keo"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    placeholder="sothea_pos"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Role & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Assigned Role *</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="SUPER_ADMIN">SUPER_ADMIN (All Permissions)</option>
                    <option value="STORE_MANAGER">STORE_MANAGER (Inventory &amp; POs)</option>
                    <option value="CASHIER">CASHIER (POS Register &amp; Sales)</option>
                    <option value="DISPATCHER">DISPATCHER (Logistics &amp; Courier)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="012 345 678"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="sothea@chanonline.kh"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* 2. PASSCODE & TERMINAL PIN */}
              <div className="bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    <span>Security PIN &amp; Passcode</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleGeneratePasscode}
                    className="text-[10px] text-amber-800 hover:text-amber-900 font-bold underline flex items-center gap-1 cursor-pointer"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Generate Passcode</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Terminal PIN (4 Digits)</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={formPin}
                      onChange={(e) => setFormPin(e.target.value)}
                      placeholder="1234"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Account Passcode (4-6 Digits) *</label>
                    <div className="relative">
                      <input
                        type={showPasscode ? 'text' : 'password'}
                        maxLength={8}
                        value={formPasscode}
                        onChange={(e) => setFormPasscode(e.target.value)}
                        placeholder="123456"
                        className="w-full bg-white border border-slate-300 rounded-xl pl-3 pr-9 py-2 text-slate-900 font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasscode(!showPasscode)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                      >
                        {showPasscode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. BIOMETRIC FINGERPRINT SCANNER */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-xs">Biometric Fingerprint Scanner</span>
                  </div>
                  {formBiometricEnabled && (
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Enrolled</span>
                    </span>
                  )}
                </div>

                <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Visual Fingerprint Sensor Box */}
                    <div 
                      onClick={handleStartFingerprintScan}
                      className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden cursor-pointer transition-all border ${
                        isScanningFinger 
                          ? 'border-emerald-400 bg-emerald-950/40 ring-4 ring-emerald-500/20' 
                          : formBiometricEnabled 
                            ? 'border-emerald-500/60 bg-emerald-900/20' 
                            : 'border-slate-700 bg-slate-900 hover:border-amber-400'
                      }`}
                      title="Tap to scan & register fingerprint"
                    >
                      <Fingerprint className={`w-7 h-7 transition-all ${
                        isScanningFinger ? 'text-emerald-400 scale-110 animate-pulse' : formBiometricEnabled ? 'text-emerald-400' : 'text-slate-400'
                      }`} />
                      
                      {/* Laser scanner line during scanning */}
                      {isScanningFinger && (
                        <div className="absolute inset-x-0 h-0.5 bg-emerald-400 shadow-sm shadow-emerald-400 animate-bounce" />
                      )}
                    </div>

                    <div className="space-y-1">
                      {isScanningFinger ? (
                        <div>
                          <p className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Scanning Fingerprint... {fingerScanProgress}%</span>
                          </p>
                          <p className="text-[10px] text-slate-400">Keep finger on sensor...</p>
                        </div>
                      ) : formBiometricEnabled ? (
                        <div>
                          <p className="font-bold text-slate-200 text-xs">Fingerprint Registered</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            ID: {formBiometricKeyId} • {formBiometricRegisteredAt}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-bold text-slate-200 text-xs">No Fingerprint Registered</p>
                          <p className="text-[10px] text-slate-400">Tap sensor to enroll staff fingerprint</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {formBiometricEnabled ? (
                      <button
                        type="button"
                        onClick={handleClearBiometric}
                        className="px-2.5 py-1 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStartFingerprintScan}
                        disabled={isScanningFinger}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Scan className="w-3 h-3" />
                        <span>Scan Finger</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 px-4 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  {editingUserId ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BIOMETRIC & PASSCODE VERIFICATION MODAL */}
      {verifyingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 sm:p-7 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="text-center space-y-2">
              <img
                src={verifyingUser.avatar}
                alt={verifyingUser.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 mx-auto shadow-md"
              />
              <h3 className="text-base font-black text-white">{verifyingUser.name}</h3>
              <p className="text-xs text-slate-400">
                Switching active session to <span className="text-amber-400 font-bold">{verifyingUser.role}</span>
              </p>
            </div>

            {/* Fingerprint Sensor Prompt */}
            <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 text-center space-y-3">
              <div 
                onClick={() => startBiometricVerification(verifyingUser)}
                className={`w-20 h-20 rounded-full mx-auto flex flex-col items-center justify-center relative overflow-hidden cursor-pointer transition-all border-2 ${
                  bioVerifyStatus === 'scanning'
                    ? 'border-emerald-400 bg-emerald-950/50 ring-4 ring-emerald-500/20'
                    : bioVerifyStatus === 'success'
                      ? 'border-emerald-500 bg-emerald-900/40'
                      : 'border-slate-700 bg-slate-900 hover:border-emerald-400'
                }`}
              >
                <Fingerprint className={`w-10 h-10 ${
                  bioVerifyStatus === 'scanning' ? 'text-emerald-400 animate-pulse' : bioVerifyStatus === 'success' ? 'text-emerald-400' : 'text-slate-400'
                }`} />
                {bioVerifyStatus === 'scanning' && (
                  <div className="absolute inset-x-0 h-0.5 bg-emerald-400 shadow-sm shadow-emerald-400 animate-bounce" />
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-slate-200">
                  {bioVerifyStatus === 'scanning' 
                    ? `Verifying Fingerprint... ${bioVerifyProgress}%`
                    : bioVerifyStatus === 'success'
                      ? 'Identity Confirmed! Logging in...'
                      : 'Scan Fingerprint on Sensor'}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Biometric ID: {verifyingUser.biometricKeyId || 'FP-MATCH'}
                </p>
              </div>
            </div>

            {/* Passcode alternative fallback */}
            <form onSubmit={handleVerifyPasscode} className="space-y-2 pt-1">
              <label className="text-[11px] font-bold text-slate-400 block text-center">
                Or Enter Staff Passcode / PIN
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  placeholder="Passcode or PIN"
                  className={`flex-1 bg-slate-950 border rounded-xl px-3 py-2 text-center text-white font-mono tracking-widest text-sm focus:outline-none ${
                    passcodeError ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-700 focus:border-amber-400'
                  }`}
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Verify
                </button>
              </div>
              {passcodeError && (
                <p className="text-[10px] text-rose-400 text-center font-bold">Incorrect passcode. Try again.</p>
              )}
            </form>

            <button
              type="button"
              onClick={() => setVerifyingUser(null)}
              className="w-full py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* USER DELETION CONFIRMATION MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">Delete Staff User?</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Are you sure you want to delete staff account <strong className="text-slate-900">{userToDelete.name}</strong> (@{userToDelete.username} - {userToDelete.role})?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const name = userToDelete.name;
                  const res = deleteUser(userToDelete.id);
                  setUserToDelete(null);
                  if (res) {
                    setUserFeedbackMessage(`Staff account "${name}" has been deleted.`);
                    setTimeout(() => setUserFeedbackMessage(null), 3500);
                  }
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-colors shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Yes, Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK TOAST */}
      {userFeedbackMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <span>{userFeedbackMessage}</span>
        </div>
      )}
    </div>
  );
};
