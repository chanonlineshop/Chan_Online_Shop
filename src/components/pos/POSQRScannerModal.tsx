import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, 
  CheckCircle, 
  Camera, 
  Smartphone, 
  ShieldCheck, 
  RefreshCw, 
  Clock, 
  Sparkles, 
  Copy, 
  Check, 
  AlertCircle,
  Volume2,
  ZoomIn,
  Download,
  X
} from 'lucide-react';
import { posSound } from '../../utils/posSounds';

interface POSQRScannerModalProps {
  amountUSD: number;
  shopName: string;
  shopPhone: string;
  customQrCodeUrl?: string;
  abaQrCodeUrl?: string;
  onPaymentSuccess: (details: {
    khqrRef: string;
    khqrPayerBank: string;
    amountUSD: number;
    amountKHR: number;
  }) => void;
  onCancel: () => void;
}

export const POSQRScannerModal: React.FC<POSQRScannerModalProps> = ({
  amountUSD,
  shopName,
  shopPhone,
  customQrCodeUrl,
  abaQrCodeUrl,
  onPaymentSuccess,
  onCancel,
}) => {
  // Mode: 'CUSTOMER_SCAN' (Display KHQR for customer to scan) or 'CASHIER_SCAN' (Cashier scans customer QR wallet)
  const [activeTab, setActiveTab] = useState<'CUSTOMER_SCAN' | 'CASHIER_SCAN'>('CUSTOMER_SCAN');
  const [qrSource, setQrSource] = useState<'khqr' | 'aba'>('khqr');
  const [isEnlarged, setIsEnlarged] = useState(false);
  
  // Dynamic KHQR data
  const exchangeRate = 4100;
  const amountKHR = Math.round(amountUSD * exchangeRate);
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'KHR'>('USD');
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(300); // 5 minutes
  const [copiedRef, setCopiedRef] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [selectedPayerBank, setSelectedPayerBank] = useState('ABA Mobile');

  // Customer QR scan mode
  const [customerQrInput, setCustomerQrInput] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Generate unique transaction reference
  const txnRef = useRef(`KHQR-${Date.now().toString().slice(-8)}`).current;

  // Countdown timer for KHQR code expiry
  useEffect(() => {
    if (verificationSuccess) return;
    const timer = setInterval(() => {
      setTimeLeftSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [verificationSuccess]);

  // Handle Camera activation for scanning customer QR
  useEffect(() => {
    if (activeTab === 'CASHIER_SCAN' && cameraActive) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
          .then(stream => {
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          })
          .catch(err => {
            console.warn('Camera access denied or unavailable', err);
            setScannerError('Camera preview unavailable in this browser. Use scanner input below.');
          });
      } else {
        setScannerError('Camera not supported. Use manual input or simulated scan.');
      }
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [activeTab, cameraActive]);

  // Simulate payment confirmation from customer scanning KHQR
  const handleSimulatePaymentReceived = (bankName: string = selectedPayerBank) => {
    setIsVerifying(true);
    posSound.playScanBeep();

    setTimeout(() => {
      posSound.playSuccessChime();
      setIsVerifying(false);
      setVerificationSuccess(true);

      setTimeout(() => {
        onPaymentSuccess({
          khqrRef: txnRef,
          khqrPayerBank: bankName,
          amountUSD,
          amountKHR,
        });
      }, 900);
    }, 1200);
  };

  // Cashier scans customer's digital wallet QR
  const handleCustomerWalletSubmit = (walletToken: string, bank: string) => {
    if (!walletToken.trim()) return;
    setIsVerifying(true);
    posSound.playScanBeep();

    setTimeout(() => {
      posSound.playSuccessChime();
      setIsVerifying(false);
      setVerificationSuccess(true);

      setTimeout(() => {
        onPaymentSuccess({
          khqrRef: `WALLET-${Date.now().toString().slice(-6)}`,
          khqrPayerBank: bank,
          amountUSD,
          amountKHR,
        });
      }, 800);
    }, 1100);
  };

  const copyTxnRef = () => {
    navigator.clipboard.writeText(txnRef);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-4">
      {/* Tab Switcher: Customer Scans KHQR vs Cashier Scans Customer QR */}
      <div className="flex bg-slate-100 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('CUSTOMER_SCAN')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'CUSTOMER_SCAN'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <QrCode className="w-4 h-4 text-rose-600" />
          <span>Customer Scans KHQR</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CASHIER_SCAN')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'CASHIER_SCAN'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Camera className="w-4 h-4 text-amber-600" />
          <span>Scan Customer QR / Wallet</span>
        </button>
      </div>

      {/* TAB 1: CUSTOMER SCANS MERCHANT KHQR */}
      {activeTab === 'CUSTOMER_SCAN' && (
        <div className="space-y-4">
          {/* Official Bakong KHQR Style Card */}
          <div className="bg-white rounded-2xl border-2 border-rose-500/80 shadow-md overflow-hidden text-center">
            {/* KHQR Header Banner */}
            <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white py-2.5 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-left">
                <div className="bg-white text-rose-600 px-2 py-0.5 rounded font-black text-xs tracking-wider">
                  KHQR
                </div>
                <div className="text-[11px] font-bold text-rose-100">
                  National Bank of Cambodia • Bakong
                </div>
              </div>

              {/* Expiry Timer Pill */}
              <div className="flex items-center gap-1 bg-rose-900/40 text-rose-100 text-[10px] font-mono px-2 py-0.5 rounded-full border border-rose-400/30">
                <Clock className="w-3 h-3" />
                <span>{formatTimer(timeLeftSeconds)}</span>
              </div>
            </div>

            {/* Merchant Info */}
            <div className="pt-3 pb-1 px-4">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                {shopName}
              </h4>
              <p className="text-[11px] text-slate-500">
                Merchant ID: <span className="font-mono font-semibold text-slate-700">CHAN-PP-271</span> • Tel: {shopPhone}
              </p>
            </div>

            {/* Amount display with currency toggle */}
            <div className="my-2 bg-rose-50/70 mx-4 py-2 px-3 rounded-xl border border-rose-100 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold text-rose-700 tracking-wider block">
                  Amount Due
                </span>
                <div className="text-xl font-black text-slate-950">
                  {selectedCurrency === 'USD' ? `$${amountUSD.toFixed(2)}` : `៛${amountKHR.toLocaleString()}`}
                </div>
                <div className="text-[10px] text-slate-500">
                  {selectedCurrency === 'USD' ? `≈ ៛${amountKHR.toLocaleString()} KHR` : `≈ $${amountUSD.toFixed(2)} USD`}
                </div>
              </div>

              {/* Currency Selector and QR Selector */}
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5">
                {abaQrCodeUrl && customQrCodeUrl && (
                  <div className="flex bg-white rounded-lg p-0.5 border border-rose-200 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setQrSource('khqr')}
                      className={`px-2 py-0.5 rounded ${qrSource === 'khqr' ? 'bg-rose-600 text-white' : 'text-slate-600'}`}
                    >
                      KHQR
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrSource('aba')}
                      className={`px-2 py-0.5 rounded ${qrSource === 'aba' ? 'bg-sky-600 text-white' : 'text-slate-600'}`}
                    >
                      ABA
                    </button>
                  </div>
                )}

                <div className="flex bg-white rounded-lg p-0.5 border border-rose-200 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setSelectedCurrency('USD')}
                    className={`px-2 py-1 rounded ${selectedCurrency === 'USD' ? 'bg-rose-600 text-white' : 'text-slate-600'}`}
                  >
                    USD
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCurrency('KHR')}
                    className={`px-2 py-1 rounded ${selectedCurrency === 'KHR' ? 'bg-rose-600 text-white' : 'text-slate-600'}`}
                  >
                    KHR
                  </button>
                </div>
              </div>
            </div>

            {/* QR Graphic: Custom Uploaded QR or Simulated Vector */}
            <div className="p-3 flex flex-col items-center justify-center">
              <div className="relative p-2.5 bg-white border-2 border-slate-900 rounded-xl shadow-xs inline-block group">
                {(qrSource === 'aba' && abaQrCodeUrl) || customQrCodeUrl ? (
                  <div 
                    onClick={() => setIsEnlarged(true)}
                    className="w-44 h-44 flex items-center justify-center cursor-pointer relative overflow-hidden rounded-lg bg-white"
                    title="Click to enlarge QR code"
                  >
                    <img
                      src={qrSource === 'aba' && abaQrCodeUrl ? abaQrCodeUrl : (customQrCodeUrl || abaQrCodeUrl)}
                      alt="Merchant QR Code"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity gap-1">
                      <ZoomIn className="w-4 h-4" /> Enlarge
                    </div>
                  </div>
                ) : (
                  /* SVG Bakong QR Code Simulation */
                  <svg className="w-44 h-44 text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                    {/* Outer corner squares (Finder patterns) */}
                    <rect x="5" y="5" width="26" height="26" rx="4" />
                    <rect x="9" y="9" width="18" height="18" fill="white" rx="2" />
                    <rect x="13" y="13" width="10" height="10" rx="1" />

                    <rect x="69" y="5" width="26" height="26" rx="4" />
                    <rect x="73" y="9" width="18" height="18" fill="white" rx="2" />
                    <rect x="77" y="13" width="10" height="10" rx="1" />

                    <rect x="5" y="69" width="26" height="26" rx="4" />
                    <rect x="9" y="73" width="18" height="18" fill="white" rx="2" />
                    <rect x="13" y="77" width="10" height="10" rx="1" />

                    {/* QR Data Matrix grid simulation */}
                    <rect x="36" y="8" width="5" height="5" />
                    <rect x="45" y="8" width="5" height="5" />
                    <rect x="55" y="8" width="5" height="5" />
                    <rect x="36" y="18" width="5" height="5" />
                    <rect x="48" y="18" width="6" height="5" />
                    <rect x="58" y="18" width="5" height="5" />

                    <rect x="8" y="36" width="5" height="5" />
                    <rect x="18" y="36" width="5" height="5" />
                    <rect x="8" y="46" width="5" height="5" />
                    <rect x="18" y="54" width="5" height="5" />

                    <rect x="70" y="36" width="6" height="5" />
                    <rect x="82" y="36" width="5" height="5" />
                    <rect x="74" y="46" width="5" height="5" />
                    <rect x="85" y="54" width="5" height="5" />

                    <rect x="36" y="70" width="5" height="5" />
                    <rect x="46" y="70" width="5" height="5" />
                    <rect x="56" y="70" width="5" height="5" />
                    <rect x="36" y="82" width="6" height="5" />
                    <rect x="48" y="82" width="5" height="5" />
                    <rect x="58" y="82" width="5" height="5" />

                    {/* Center Bakong KHQR Emblem */}
                    <circle cx="50" cy="50" r="14" fill="white" stroke="#e11d48" strokeWidth="2" />
                    <circle cx="50" cy="50" r="10" fill="#e11d48" />
                    <text x="50" y="53" fill="white" fontSize="7" fontWeight="bold" textAnchor="middle">
                      KH
                    </text>
                  </svg>
                )}

                {/* Animated Scan Line Overlay */}
                {!verificationSuccess && !isVerifying && (
                  <div className="absolute inset-x-2.5 top-2.5 bottom-2.5 overflow-hidden pointer-events-none rounded-lg">
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-bounce" />
                  </div>
                )}

                {/* Verification Overlay */}
                {(isVerifying || verificationSuccess) && (
                  <div className="absolute inset-0 bg-white/95 rounded-xl flex flex-col items-center justify-center p-3 animate-fadeIn">
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-10 h-10 text-rose-600 animate-spin mb-2" />
                        <span className="text-xs font-extrabold text-slate-900">Verifying KHQR Payment...</span>
                        <span className="text-[10px] text-slate-500">Checking Bakong Clearing Gateway</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-12 h-12 text-emerald-500 mb-2 animate-scaleIn" />
                        <span className="text-sm font-black text-emerald-700">Payment Confirmed!</span>
                        <span className="text-[11px] font-bold text-slate-700">{selectedPayerBank}</span>
                        <span className="text-[10px] font-mono text-slate-500 mt-1">{txnRef}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bill Reference and Copy */}
            <div className="pb-3 px-4 flex items-center justify-center gap-2 text-[11px] text-slate-600">
              <span className="font-mono">Ref: {txnRef}</span>
              <button
                type="button"
                onClick={copyTxnRef}
                className="text-slate-400 hover:text-rose-600 p-1"
                title="Copy reference"
              >
                {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Supported Bank Logos / Badges */}
            <div className="bg-slate-50 border-t border-slate-200 py-2 px-3 flex items-center justify-center gap-2 text-[10px] text-slate-600 font-semibold flex-wrap">
              <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-sky-700 font-bold">ABA Mobile</span>
              <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-emerald-700 font-bold">Wing Bank</span>
              <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-blue-800 font-bold">ACLEDA</span>
              <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-purple-700 font-bold">Bakong</span>
              <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-rose-700 font-bold">Sathapana</span>
            </div>
          </div>

          {/* Cashier Simulator Controls */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Simulate Customer Bank App Scan</span>
              </span>
              <span className="text-[10px] text-slate-500">Test Trigger</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {[
                { name: 'ABA Mobile', color: 'hover:border-sky-500 hover:bg-sky-50 text-sky-900' },
                { name: 'Wing Bank', color: 'hover:border-emerald-500 hover:bg-emerald-50 text-emerald-900' },
                { name: 'ACLEDA ToanChet', color: 'hover:border-blue-500 hover:bg-blue-50 text-blue-900' },
              ].map(bank => (
                <button
                  key={bank.name}
                  type="button"
                  disabled={isVerifying || verificationSuccess}
                  onClick={() => {
                    setSelectedPayerBank(bank.name);
                    handleSimulatePaymentReceived(bank.name);
                  }}
                  className={`py-2 px-2 rounded-lg bg-white border border-slate-200 text-[11px] font-bold transition-all disabled:opacity-50 ${bank.color}`}
                >
                  Pay via {bank.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CASHIER SCANS CUSTOMER DIGITAL WALLET / QR */}
      {activeTab === 'CASHIER_SCAN' && (
        <div className="space-y-4">
          {/* Camera Viewfinder / Scanner target */}
          <div className="bg-slate-950 rounded-2xl p-4 text-center text-white relative overflow-hidden">
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Camera Barcode / 2D Scanner</span>
              </span>
              <button
                type="button"
                onClick={() => setCameraActive(!cameraActive)}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold px-2 py-0.5 rounded border border-slate-700"
              >
                {cameraActive ? 'Stop Camera' : 'Start Camera'}
              </button>
            </div>

            {/* Video or High-Tech Scanner Frame */}
            <div className="relative aspect-video max-h-48 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
              {cameraActive ? (
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <Smartphone className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Aim camera or 2D scanner gun at customer's phone</p>
                  <p className="text-[10px] text-slate-600 mt-1">Supports ABA KHQR Pay, Wing Token, or Bakong Personal QR</p>
                </div>
              )}

              {/* Aiming Crosshair */}
              <div className="absolute inset-6 border-2 border-dashed border-amber-400/70 rounded-lg pointer-events-none flex items-center justify-center">
                <div className="w-full h-0.5 bg-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,1)] animate-bounce" />
              </div>
            </div>

            {scannerError && (
              <p className="text-[11px] text-amber-300 mt-2 bg-amber-950/40 p-1.5 rounded border border-amber-800/40">
                {scannerError}
              </p>
            )}
          </div>

          {/* Manual / USB Gun 2D Barcode Reader Input */}
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Customer Wallet Token or Barcode Input
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customerQrInput}
                onChange={(e) => setCustomerQrInput(e.target.value)}
                placeholder="Scan or paste customer QR token (e.g. ABA-PAY-9821)..."
                className="flex-1 text-xs bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
              />
              <button
                type="button"
                onClick={() => handleCustomerWalletSubmit(customerQrInput || 'ABA-PAY-MANUAL', 'ABA Mobile')}
                disabled={!customerQrInput.trim() || isVerifying}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-bold px-3 py-2 rounded-lg transition-colors"
              >
                Charge
              </button>
            </div>
          </div>

          {/* Quick Preset Customer Wallets (Click to Scan Instantly) */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 block">
              Quick Customer Wallets (Click to simulate scan):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { name: 'Bopha Ly (ABA Pay)', token: 'ABA-KHQR-9821849', bank: 'ABA Mobile' },
                { name: 'Vireak Chan (Wing Wallet)', token: 'WING-PAY-441092', bank: 'Wing Bank' },
                { name: 'Sokha Meng (Bakong ID)', token: 'BAKONG-ID-110294', bank: 'Bakong App' },
                { name: 'VIP Member Card (10% Off)', token: 'VIP-MEM-883921', bank: 'Member Wallet' },
              ].map(wallet => (
                <button
                  key={wallet.token}
                  type="button"
                  onClick={() => {
                    setCustomerQrInput(wallet.token);
                    handleCustomerWalletSubmit(wallet.token, wallet.bank);
                  }}
                  disabled={isVerifying || verificationSuccess}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-xl text-left transition-all disabled:opacity-50"
                >
                  <div className="text-xs font-bold text-slate-900">{wallet.name}</div>
                  <div className="text-[10px] font-mono text-slate-500">{wallet.token}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* POS Enlarged QR Code Lightbox Modal */}
      {isEnlarged && ((qrSource === 'aba' && abaQrCodeUrl) || customQrCodeUrl) && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4"
          onClick={() => setIsEnlarged(false)}
        >
          <div 
            className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-extrabold text-slate-900">{shopName}</h4>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {qrSource === 'aba' ? 'ABA PayWay' : 'Bakong KHQR'} • ${amountUSD.toFixed(2)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEnlarged(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-white rounded-2xl border-2 border-rose-500 shadow-inner inline-block">
              <img
                src={qrSource === 'aba' && abaQrCodeUrl ? abaQrCodeUrl : (customQrCodeUrl || abaQrCodeUrl)}
                alt="Enlarged POS QR"
                className="w-64 h-64 object-contain rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <a
                href={qrSource === 'aba' && abaQrCodeUrl ? abaQrCodeUrl : (customQrCodeUrl || abaQrCodeUrl)}
                download="pos-merchant-qr.png"
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Image</span>
              </a>
              <button
                type="button"
                onClick={() => setIsEnlarged(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
