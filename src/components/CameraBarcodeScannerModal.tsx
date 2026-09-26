import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Barcode, Check, AlertCircle, RefreshCw, Zap, Sparkles } from 'lucide-react';
import { posSound } from '../utils/posSounds';

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanBarcode: (scannedBarcode: string) => void;
  currentBarcode?: string;
}

export const CameraBarcodeScannerModal: React.FC<CameraBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanBarcode,
  currentBarcode = '',
}) => {
  const [cameraActive, setCameraActive] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // Initialize camera when open
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setDetectedBarcode(null);
      setCameraError(null);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    setCameraActive(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported in this browser environment. You can enter or test a barcode below.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Check if torch/flashlight is supported
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as { torch?: boolean } | undefined;
      if (capabilities?.torch) {
        setHasTorch(true);
      }

      // Initialize Native BarcodeDetector if available
      if ('BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
          });

          scanIntervalRef.current = window.setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0) {
                  const code = barcodes[0].rawValue;
                  if (code && code.trim()) {
                    handleBarcodeCaptured(code.trim());
                  }
                }
              } catch {
                // frame detection error ignored
              }
            }
          }, 350);
        } catch (e) {
          console.log('BarcodeDetector initialization skipped:', e);
        }
      }
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError(
        'Camera is not accessible. Please ensure camera permissions are allowed, or type/select a barcode below.'
      );
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setTorchOn(false);
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const nextState = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState } as any],
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn('Torch toggle failed:', err);
      }
    }
  };

  const handleBarcodeCaptured = (code: string) => {
    posSound.playScanBeep();
    setDetectedBarcode(code);

    // Apply barcode and close modal after brief visual feedback
    setTimeout(() => {
      onScanBarcode(code);
      onClose();
    }, 600);
  };

  const handleApplyManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcodeCaptured(manualCode.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <span>Scan Barcode with Camera</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Point camera at the retail barcode or EAN label
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Frame */}
        <div className="relative aspect-4/3 bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 flex items-center justify-center shadow-inner">
          {cameraActive && !cameraError ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-6 text-slate-400 max-w-xs">
              <Camera className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-xs text-slate-300 leading-relaxed">
                {cameraError || 'Camera preview is currently inactive.'}
              </p>
            </div>
          )}

          {/* Aiming Reticle & Animated Scan Laser */}
          <div className="absolute inset-8 border-2 border-dashed border-amber-400/70 rounded-xl pointer-events-none flex items-center justify-center">
            {/* Animated Laser line */}
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_rgba(239,68,68,1)] animate-pulse" />
          </div>

          {/* Torch toggle button if supported */}
          {hasTorch && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-colors ${
                torchOn ? 'bg-amber-400 text-slate-950' : 'bg-slate-900/60 text-white hover:bg-slate-900/80'
              }`}
              title="Toggle Flashlight"
            >
              <Zap className="w-4 h-4" />
            </button>
          )}

          {/* Success Overlay when Barcode is Detected */}
          {detectedBarcode && (
            <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-white text-center animate-in fade-in duration-200">
              <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white mb-2 shadow-lg animate-bounce">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <span className="text-xs uppercase tracking-wider font-bold text-emerald-300">
                Barcode Captured!
              </span>
              <span className="text-lg font-mono font-black mt-1 text-white bg-black/40 px-3 py-1 rounded-lg border border-emerald-400/40">
                {detectedBarcode}
              </span>
              <span className="text-[11px] text-emerald-200 mt-2">Applying to product...</span>
            </div>
          )}
        </div>

        {/* Current / Existing Barcode Indicator */}
        {currentBarcode && !detectedBarcode && (
          <div className="text-[11px] text-slate-500 flex items-center justify-between px-1">
            <span>Current Barcode:</span>
            <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              {currentBarcode}
            </span>
          </div>
        )}

        {/* Manual Barcode Input & Test Barcodes for Quick Testing */}
        <div className="space-y-2.5 pt-1">
          <form onSubmit={handleApplyManual} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Or type / paste barcode (e.g. 8851234567890)"
                className="w-full text-xs p-2.5 pl-8 bg-slate-50 border border-slate-300 rounded-xl font-mono outline-none focus:bg-white focus:border-amber-500"
              />
              <Barcode className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-3.5 py-2 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-colors shrink-0 cursor-pointer"
            >
              Apply
            </button>
          </form>

          {/* Instant Test Barcodes for fast preview / testing */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5 px-0.5">
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Test retail barcodes (click to scan):</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'EAN-13 Tech', code: '8859012345671' },
                { label: 'UPC-A Audio', code: '012345678905' },
                { label: 'EAN-8 Drink', code: '88501234' },
                { label: 'Code-128', code: 'COS-TECH-2026' },
              ].map((sample) => (
                <button
                  key={sample.code}
                  type="button"
                  onClick={() => handleBarcodeCaptured(sample.code)}
                  className="text-[11px] font-mono bg-slate-100 hover:bg-amber-100 hover:border-amber-300 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                >
                  <span className="font-sans text-[10px] text-slate-400 mr-1">{sample.label}:</span>
                  <span className="font-bold text-slate-800">{sample.code}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={startCamera}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restart Camera</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
