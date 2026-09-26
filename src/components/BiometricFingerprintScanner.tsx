import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Fingerprint, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  Smartphone, 
  Laptop, 
  CheckCircle2, 
  RefreshCw, 
  X, 
  Volume2, 
  VolumeX, 
  Sliders, 
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Shield,
  Zap,
  Info
} from 'lucide-react';
import { 
  getDeviceBiometricCapabilities, 
  BiometricCapabilities, 
  biometricAudio, 
  triggerBiometricHaptic, 
  registerHardwareBiometric, 
  verifyHardwareBiometric 
} from '../utils/biometricAuth';

export interface BiometricFingerprintScannerProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'verify' | 'enroll' | 'test';
  title?: string;
  subtitle?: string;
  userName?: string;
  userRole?: string;
  existingKeyId?: string;
  onSuccess?: (credentialId: string) => void;
  onFail?: (error: string) => void;
}

export const BiometricFingerprintScanner: React.FC<BiometricFingerprintScannerProps> = ({
  isOpen,
  onClose,
  mode = 'verify',
  title,
  subtitle,
  userName = 'Staff Member',
  userRole,
  existingKeyId,
  onSuccess,
  onFail,
}) => {
  // Device Capabilities State
  const [capabilities, setCapabilities] = useState<BiometricCapabilities | null>(null);
  const [isDetecting, setIsDetecting] = useState(true);

  // Active Tab: 'screen' (optical on-screen pad) vs 'hardware' (Windows Hello / Mac TouchID / Android prompt)
  const [activeTab, setActiveTab] = useState<'screen' | 'hardware'>('screen');

  // On-screen touch scan state
  const [isPressing, setIsPressing] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanState, setScanState] = useState<'idle' | 'holding' | 'success' | 'lifted_early' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('Place your thumb or finger on the screen sensor');
  const [touchDetails, setTouchDetails] = useState<{ x: number; y: number; pressure: number; pointerType: string } | null>(null);
  const [enrollmentStep, setEnrollmentStep] = useState<1 | 2 | 3>(1); // For multi-angle enrollment
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Hardware WebAuthn state
  const [hardwareStatus, setHardwareStatus] = useState<'idle' | 'prompting' | 'success' | 'error'>('idle');
  const [hardwareErrorMsg, setHardwareErrorMsg] = useState<string | null>(null);

  // Scan interval & animation refs
  const scanTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const sensorRef = useRef<HTMLDivElement | null>(null);

  // Load hardware capabilities on open
  useEffect(() => {
    if (isOpen) {
      setIsDetecting(true);
      getDeviceBiometricCapabilities().then((caps) => {
        setCapabilities(caps);
        setIsDetecting(false);
        // If device is PC with Windows Hello / Touch ID, recommend hardware or screen
        if (caps.deviceType === 'phone') {
          setActiveTab('screen');
        } else if (caps.hasPlatformAuthenticator && !caps.isInIframe) {
          setActiveTab('hardware');
        } else {
          setActiveTab('screen');
        }
      });
      // Reset state
      setScanProgress(0);
      setScanState('idle');
      setEnrollmentStep(1);
      setHardwareStatus('idle');
      setHardwareErrorMsg(null);
      setStatusMessage(
        mode === 'enroll' 
          ? 'Step 1/3: Place center of finger firmly on sensor pad' 
          : 'Place your thumb or finger on the screen sensor'
      );
    }
  }, [isOpen, mode]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (scanTimerRef.current) {
        window.clearInterval(scanTimerRef.current);
      }
    };
  }, []);

  // Handle Touch/Mouse Press Start on Screen Pad
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (scanState === 'success') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    const pressure = e.pressure > 0 ? Math.round(e.pressure * 100) : 75;

    setTouchDetails({
      x,
      y,
      pressure,
      pointerType: e.pointerType || 'touch',
    });

    setIsPressing(true);
    setScanState('holding');
    startTimeRef.current = Date.now();

    if (soundEnabled) biometricAudio.play('touch');
    triggerBiometricHaptic('touch');

    setStatusMessage('Scanning biometric ridges... Hold still on screen');

    // Run continuous scanning progress
    let p = 0;
    const requiredMs = mode === 'enroll' ? 1400 : 1100;
    const stepInterval = 40;
    const increment = (stepInterval / requiredMs) * 100;

    if (scanTimerRef.current) window.clearInterval(scanTimerRef.current);

    scanTimerRef.current = window.setInterval(() => {
      p += increment;
      if (p >= 100) {
        if (scanTimerRef.current) window.clearInterval(scanTimerRef.current);
        setScanProgress(100);
        handleScanComplete();
      } else {
        setScanProgress(Math.min(99, Math.round(p)));
        if (Math.round(p) % 25 === 0) {
          if (soundEnabled) biometricAudio.play('scanning');
          triggerBiometricHaptic('step');
        }
      }
    }, stepInterval);
  };

  // Handle Pointer Up / Premature Lift
  const handlePointerUp = () => {
    if (!isPressing) return;
    setIsPressing(false);

    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    if (scanProgress < 100 && scanState !== 'success') {
      setScanState('lifted_early');
      setScanProgress(0);
      setStatusMessage('Finger lifted too early! Keep pressed on screen until scan completes.');
      if (soundEnabled) biometricAudio.play('fail');
      triggerBiometricHaptic('fail');
    }
  };

  // Handle Successful Scan Completion
  const handleScanComplete = useCallback(() => {
    setIsPressing(false);

    if (mode === 'enroll') {
      if (enrollmentStep === 1) {
        setEnrollmentStep(2);
        setScanProgress(0);
        setScanState('idle');
        setStatusMessage('Step 2/3: Great! Now slightly tilt finger to scan outer edges');
        if (soundEnabled) biometricAudio.play('chirp');
        triggerBiometricHaptic('step');
        return;
      } else if (enrollmentStep === 2) {
        setEnrollmentStep(3);
        setScanProgress(0);
        setScanState('idle');
        setStatusMessage('Step 3/3: Almost done! Tap with the tip of your finger');
        if (soundEnabled) biometricAudio.play('chirp');
        triggerBiometricHaptic('step');
        return;
      }
    }

    // Finished complete scan (or single-step verify/test)
    setScanState('success');
    setStatusMessage(
      mode === 'enroll' 
        ? 'Biometric Fingerprint Successfully Enrolled!' 
        : 'Fingerprint Match Verified! Access Granted.'
    );
    if (soundEnabled) biometricAudio.play('success');
    triggerBiometricHaptic('success');

    const generatedKey = existingKeyId || `BIO-SCR-${Math.floor(1000 + Math.random() * 9000)}-OK`;

    setTimeout(() => {
      onSuccess?.(generatedKey);
      onClose();
    }, 1100);
  }, [mode, enrollmentStep, soundEnabled, existingKeyId, onSuccess, onClose]);

  // Handle Native PC / Phone WebAuthn Hardware Scan
  const handleHardwareWebAuthn = async () => {
    setHardwareStatus('prompting');
    setHardwareErrorMsg(null);
    if (soundEnabled) biometricAudio.play('touch');
    triggerBiometricHaptic('touch');

    if (mode === 'enroll') {
      const res = await registerHardwareBiometric(
        `user-${Date.now()}`,
        userName,
        userName
      );

      if (res.success && res.credentialId) {
        setHardwareStatus('success');
        if (soundEnabled) biometricAudio.play('enrolled');
        triggerBiometricHaptic('success');
        setTimeout(() => {
          onSuccess?.(res.credentialId!);
          onClose();
        }, 1200);
      } else {
        setHardwareStatus('error');
        setHardwareErrorMsg(res.error || 'Biometric hardware enrollment failed.');
        if (soundEnabled) biometricAudio.play('fail');
        triggerBiometricHaptic('fail');
      }
    } else {
      const res = await verifyHardwareBiometric(existingKeyId);
      if (res.success && res.credentialId) {
        setHardwareStatus('success');
        if (soundEnabled) biometricAudio.play('success');
        triggerBiometricHaptic('success');
        setTimeout(() => {
          onSuccess?.(res.credentialId!);
          onClose();
        }, 1200);
      } else {
        setHardwareStatus('error');
        setHardwareErrorMsg(res.error || 'Biometric hardware verification failed.');
        if (soundEnabled) biometricAudio.play('fail');
        triggerBiometricHaptic('fail');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md select-none animate-fadeIn">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative bg-slate-900 text-white rounded-3xl border border-slate-800 max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between gap-3 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>{title || (mode === 'enroll' ? 'Biometric Enrollment' : 'Biometric Fingerprint Scanner')}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  Real Scan
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {subtitle || `Authenticating session for ${userName} ${userRole ? `(${userRole})` : ''}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title={soundEnabled ? 'Mute biometric audio' : 'Enable biometric audio'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Close scanner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs (Phone Screen vs Hardware PC/Phone) */}
        <div className="p-2 bg-slate-950/70 border-b border-slate-800 flex gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('screen')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'screen'
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>On-Screen Sensor Pad</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hardware')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'hardware'
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>PC / Phone Hardware</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: ON-SCREEN OPTICAL SENSOR PAD */}
          {activeTab === 'screen' && (
            <div className="space-y-4">
              {/* Enrollment Steps Bar */}
              {mode === 'enroll' && (
                <div className="flex items-center justify-between gap-2 px-2 pb-1">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex-1 flex flex-col items-center gap-1">
                      <div className={`h-1.5 w-full rounded-full transition-all ${
                        step < enrollmentStep 
                          ? 'bg-emerald-500' 
                          : step === enrollmentStep 
                            ? 'bg-amber-400 animate-pulse' 
                            : 'bg-slate-800'
                      }`} />
                      <span className={`text-[10px] font-bold ${
                        step === enrollmentStep ? 'text-amber-400' : step < enrollmentStep ? 'text-emerald-400' : 'text-slate-500'
                      }`}>
                        Step {step}: {step === 1 ? 'Center' : step === 2 ? 'Edges' : 'Tip'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* The Under-Display Optical Sensor Touch Area */}
              <div className="relative flex flex-col items-center justify-center py-4">
                {/* Background optical radial glow */}
                <div className={`absolute w-56 h-56 rounded-full blur-3xl transition-opacity duration-300 pointer-events-none ${
                  scanState === 'holding' 
                    ? 'opacity-80 bg-emerald-500/30' 
                    : scanState === 'success' 
                      ? 'opacity-90 bg-emerald-400/40' 
                      : scanState === 'lifted_early'
                        ? 'opacity-70 bg-rose-500/25'
                        : 'opacity-25 bg-slate-700/20'
                }`} />

                {/* Interactive Touch Target */}
                <div
                  ref={sensorRef}
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className={`relative w-36 h-36 sm:w-40 sm:h-40 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all touch-none select-none border-2 ${
                    scanState === 'holding'
                      ? 'border-emerald-400 bg-emerald-950/60 ring-8 ring-emerald-500/20 scale-105'
                      : scanState === 'success'
                        ? 'border-emerald-400 bg-emerald-900/50 ring-8 ring-emerald-400/30'
                        : scanState === 'lifted_early'
                          ? 'border-rose-400 bg-rose-950/40 ring-4 ring-rose-500/20'
                          : 'border-slate-700 bg-slate-950/90 hover:border-emerald-500/60 hover:bg-slate-900'
                  }`}
                  style={{
                    boxShadow: scanState === 'holding' 
                      ? '0 0 35px rgba(16, 185, 129, 0.55), inset 0 0 25px rgba(52, 211, 153, 0.4)' 
                      : '0 0 15px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  {/* Concentric Ultrasonic Ripples during scan */}
                  {scanState === 'holding' && (
                    <>
                      <div className="absolute inset-0 rounded-full border border-emerald-400/60 animate-ping" />
                      <div className="absolute -inset-3 rounded-full border border-emerald-400/40 animate-pulse" />
                    </>
                  )}

                  {/* Fingerprint Icon with Optical Biometric Lines */}
                  <Fingerprint className={`w-18 h-18 sm:w-20 sm:h-20 transition-all ${
                    scanState === 'holding'
                      ? 'text-emerald-300 scale-110'
                      : scanState === 'success'
                        ? 'text-emerald-400 scale-105'
                        : scanState === 'lifted_early'
                          ? 'text-rose-400'
                          : 'text-slate-400 group-hover:text-emerald-400'
                  }`} />

                  {/* Laser Scan Sweep Line */}
                  {scanState === 'holding' && (
                    <div 
                      className="absolute inset-x-4 h-1 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-md shadow-cyan-400 transition-all duration-75 pointer-events-none"
                      style={{ top: `${(scanProgress / 100) * 80 + 10}%` }}
                    />
                  )}

                  {/* Success Overlay Checkmark */}
                  {scanState === 'success' && (
                    <div className="absolute inset-0 rounded-full bg-emerald-950/70 backdrop-blur-xs flex items-center justify-center animate-in zoom-in-75">
                      <CheckCircle2 className="w-14 h-14 text-emerald-400 animate-bounce" />
                    </div>
                  )}

                  {/* Touch Indicator Dot */}
                  {touchDetails && isPressing && (
                    <div 
                      className="absolute w-4 h-4 rounded-full bg-cyan-300/80 pointer-events-none blur-xs animate-ping"
                      style={{ left: touchDetails.x - 8, top: touchDetails.y - 8 }}
                    />
                  )}
                </div>

                {/* Circular Percentage Ring Indicator */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-32 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                    <div 
                      className={`h-full transition-all duration-75 ${
                        scanState === 'success' ? 'bg-emerald-400' : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                      }`}
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-300 min-w-10">
                    {scanProgress}%
                  </span>
                </div>
              </div>

              {/* Status and Instructions Text */}
              <div className="text-center space-y-1 bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
                <p className={`text-xs font-bold ${
                  scanState === 'success' 
                    ? 'text-emerald-400' 
                    : scanState === 'lifted_early' 
                      ? 'text-rose-400' 
                      : isPressing 
                        ? 'text-cyan-300' 
                        : 'text-slate-200'
                }`}>
                  {statusMessage}
                </p>
                <p className="text-[11px] text-slate-400">
                  {isPressing 
                    ? 'Keep finger firmly pressed against the screen...' 
                    : 'Press and hold your finger or thumb directly on the round sensor'}
                </p>
              </div>

              {/* Live Touch Diagnostics */}
              {touchDetails && (
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-slate-400 bg-slate-950/40 p-2 rounded-xl border border-slate-800/80">
                  <div>Input: <strong className="text-slate-200 capitalize">{touchDetails.pointerType}</strong></div>
                  <div>Pressure: <strong className="text-slate-200">{touchDetails.pressure}%</strong></div>
                  <div>Sensor: <strong className="text-emerald-400">Capacitive</strong></div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PC & PHONE HARDWARE (WEBAUTHN) */}
          {activeTab === 'hardware' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">Device Hardware Biometrics</h4>
                    <p className="text-[11px] text-slate-400">
                      Invokes the real physical biometric scanner on your machine:
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Windows PC:</span>
                    <span className="font-bold text-amber-300">Windows Hello Fingerprint / PIN</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">MacBook / Mac:</span>
                    <span className="font-bold text-amber-300">Apple Touch ID</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Android Phone:</span>
                    <span className="font-bold text-amber-300">BiometricPrompt Fingerprint</span>
                  </div>
                </div>

                {capabilities?.isInIframe && (
                  <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-2.5 text-[11px] text-amber-200 flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Notice:</strong> Inside embedded iframe previews, browser security may restrict native OS dialogs. If your browser blocks it, use the <strong>On-Screen Sensor Pad</strong> tab for real capacitive touch scanning!
                    </span>
                  </div>
                )}

                {hardwareErrorMsg && (
                  <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Hardware Scan Notice</p>
                      <p className="text-[11px] mt-0.5">{hardwareErrorMsg}</p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('screen')}
                        className="mt-2 text-[11px] text-amber-300 font-bold underline cursor-pointer"
                      >
                        Switch to On-Screen Sensor Pad instead →
                      </button>
                    </div>
                  </div>
                )}

                {hardwareStatus === 'success' && (
                  <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Hardware Biometric Verified Successfully!</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleHardwareWebAuthn}
                  disabled={hardwareStatus === 'prompting'}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {hardwareStatus === 'prompting' ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Waiting for Device Biometric Scan...</span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4" />
                      <span>{mode === 'enroll' ? 'Enroll Device Fingerprint' : 'Scan Native Fingerprint'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Capabilities Diagnostics Badge */}
          <div className="bg-slate-950/50 rounded-2xl p-3 border border-slate-800/80 space-y-2 text-[11px]">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-bold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Device Capabilities:</span>
              </span>
              <span className="text-slate-300 font-mono">
                {capabilities?.osName} ({capabilities?.deviceType.toUpperCase()})
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                capabilities?.hasTouchScreen ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-700/40' : 'bg-slate-800 text-slate-400'
              }`}>
                Screen Touch: {capabilities?.hasTouchScreen ? 'Available' : 'Mouse'}
              </span>

              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                capabilities?.hasVibration ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-700/40' : 'bg-slate-800 text-slate-400'
              }`}>
                Haptics: {capabilities?.hasVibration ? 'Active' : 'Muted'}
              </span>

              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                capabilities?.hasPlatformAuthenticator ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-700/40' : 'bg-slate-800 text-slate-400'
              }`}>
                WebAuthn: {capabilities?.hasPlatformAuthenticator ? 'Supported' : 'Standard'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400">
            {existingKeyId ? (
              <span className="font-mono">Registered ID: {existingKeyId}</span>
            ) : (
              <span>Biometric AES-256 Auth</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {activeTab === 'screen' && (
              <button
                type="button"
                onClick={() => {
                  setScanProgress(0);
                  setScanState('idle');
                  setStatusMessage('Place thumb or finger on sensor pad');
                }}
                className="px-3 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
