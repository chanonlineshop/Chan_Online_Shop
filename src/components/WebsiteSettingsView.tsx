import React, { useState, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { ShopSettings } from '../types';
import { INITIAL_SHOP_SETTINGS } from '../data/initialProducts';
import { 
  Store, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Send, 
  DollarSign, 
  Truck, 
  ShieldCheck, 
  Check, 
  RotateCcw, 
  Sparkles, 
  Eye, 
  Globe, 
  CreditCard, 
  FileText, 
  Save, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  BadgePercent,
  CheckCircle2,
  Lock,
  QrCode,
  Upload,
  Image as ImageIcon,
  Trash2,
  ZoomIn,
  Download,
  X,
  RefreshCw,
  FileUp,
  Layers,
  Sun,
  Moon,
  Monitor,
  Palette,
  ArrowRight
} from 'lucide-react';
import { LogoBannerStudio } from './LogoBannerStudio';

// Optimized client-side image compression for QR codes to keep localStorage fast and durable
const optimizeImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please upload an image file (PNG, JPG, WebP, or SVG).'));
      return;
    }

    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // High resolution limit while ensuring base64 payload remains compact
        const maxDim = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/png', 0.92);
        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve(e.target?.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Ready-to-use realistic sample templates for fast testing
const SAMPLE_KHQR_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
  <rect width="300" height="300" fill="#ffffff" rx="16"/>
  <rect x="25" y="25" width="70" height="70" rx="12" fill="#e11d48"/>
  <rect x="37" y="37" width="46" height="46" rx="8" fill="#ffffff"/>
  <rect x="47" y="47" width="26" height="26" rx="4" fill="#e11d48"/>
  <rect x="205" y="25" width="70" height="70" rx="12" fill="#e11d48"/>
  <rect x="217" y="37" width="46" height="46" rx="8" fill="#ffffff"/>
  <rect x="227" y="47" width="26" height="26" rx="4" fill="#e11d48"/>
  <rect x="25" y="205" width="70" height="70" rx="12" fill="#e11d48"/>
  <rect x="37" y="217" width="46" height="46" rx="8" fill="#ffffff"/>
  <rect x="47" y="227" width="26" height="26" rx="4" fill="#e11d48"/>
  <rect x="110" y="35" width="16" height="16" rx="3" fill="#1e293b"/>
  <rect x="140" y="35" width="16" height="16" rx="3" fill="#1e293b"/>
  <rect x="170" y="35" width="16" height="16" rx="3" fill="#1e293b"/>
  <rect x="110" y="65" width="20" height="20" rx="4" fill="#e11d48"/>
  <rect x="150" y="65" width="20" height="20" rx="4" fill="#1e293b"/>
  <rect x="35" y="115" width="18" height="18" rx="3" fill="#1e293b"/>
  <rect x="65" y="115" width="18" height="18" rx="3" fill="#1e293b"/>
  <rect x="35" y="150" width="18" height="18" rx="3" fill="#1e293b"/>
  <rect x="65" y="165" width="18" height="18" rx="3" fill="#e11d48"/>
  <rect x="215" y="115" width="22" height="18" rx="3" fill="#1e293b"/>
  <rect x="245" y="115" width="18" height="18" rx="3" fill="#1e293b"/>
  <rect x="225" y="150" width="22" height="18" rx="3" fill="#e11d48"/>
  <rect x="110" y="215" width="18" height="18" rx="3" fill="#1e293b"/>
  <rect x="140" y="215" width="18" height="18" rx="3" fill="#1e293b"/>
  <rect x="170" y="215" width="18" height="18" rx="3" fill="#1e293b"/>
  <rect x="110" y="245" width="20" height="20" rx="4" fill="#1e293b"/>
  <rect x="150" y="245" width="20" height="20" rx="4" fill="#e11d48"/>
  <rect x="215" y="215" width="20" height="20" rx="4" fill="#1e293b"/>
  <rect x="245" y="245" width="20" height="20" rx="4" fill="#1e293b"/>
  <circle cx="150" cy="150" r="34" fill="#ffffff" stroke="#e11d48" stroke-width="4"/>
  <circle cx="150" cy="150" r="26" fill="#e11d48"/>
  <text x="150" y="157" fill="#ffffff" font-size="16" font-family="sans-serif" font-weight="900" text-anchor="middle">KHQR</text>
</svg>
`)}`;

const SAMPLE_ABA_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
  <rect width="300" height="300" fill="#ffffff" rx="16"/>
  <rect x="25" y="25" width="70" height="70" rx="12" fill="#005a9c"/>
  <rect x="37" y="37" width="46" height="46" rx="8" fill="#ffffff"/>
  <rect x="47" y="47" width="26" height="26" rx="4" fill="#005a9c"/>
  <rect x="205" y="25" width="70" height="70" rx="12" fill="#005a9c"/>
  <rect x="217" y="37" width="46" height="46" rx="8" fill="#ffffff"/>
  <rect x="227" y="47" width="26" height="26" rx="4" fill="#005a9c"/>
  <rect x="25" y="205" width="70" height="70" rx="12" fill="#005a9c"/>
  <rect x="37" y="217" width="46" height="46" rx="8" fill="#ffffff"/>
  <rect x="47" y="227" width="26" height="26" rx="4" fill="#005a9c"/>
  <rect x="110" y="35" width="16" height="16" rx="3" fill="#005a9c"/>
  <rect x="140" y="35" width="16" height="16" rx="3" fill="#1e293b"/>
  <rect x="170" y="35" width="16" height="16" rx="3" fill="#005a9c"/>
  <rect x="110" y="65" width="20" height="20" rx="4" fill="#0284c7"/>
  <rect x="150" y="65" width="20" height="20" rx="4" fill="#005a9c"/>
  <rect x="35" y="115" width="18" height="18" rx="3" fill="#005a9c"/>
  <rect x="65" y="115" width="18" height="18" rx="3" fill="#0284c7"/>
  <rect x="35" y="150" width="18" height="18" rx="3" fill="#1e293b"/>
  <rect x="65" y="165" width="18" height="18" rx="3" fill="#005a9c"/>
  <rect x="215" y="115" width="22" height="18" rx="3" fill="#0284c7"/>
  <rect x="245" y="115" width="18" height="18" rx="3" fill="#005a9c"/>
  <rect x="225" y="150" width="22" height="18" rx="3" fill="#005a9c"/>
  <rect x="110" y="215" width="18" height="18" rx="3" fill="#005a9c"/>
  <rect x="140" y="215" width="18" height="18" rx="3" fill="#1e293b"/>
  <rect x="170" y="215" width="18" height="18" rx="3" fill="#005a9c"/>
  <rect x="110" y="245" width="20" height="20" rx="4" fill="#0284c7"/>
  <rect x="150" y="245" width="20" height="20" rx="4" fill="#005a9c"/>
  <rect x="215" y="215" width="20" height="20" rx="4" fill="#005a9c"/>
  <rect x="245" y="245" width="20" height="20" rx="4" fill="#0284c7"/>
  <circle cx="150" cy="150" r="34" fill="#ffffff" stroke="#005a9c" stroke-width="4"/>
  <circle cx="150" cy="150" r="26" fill="#005a9c"/>
  <text x="150" y="157" fill="#ffffff" font-size="16" font-family="sans-serif" font-weight="900" text-anchor="middle">ABA</text>
</svg>
`)}`;

export const WebsiteSettingsView: React.FC = () => {
  const { settings, updateSettings, setActiveView, userPermissions, theme, setTheme, resolvedTheme } = useStore();

  // Local working copy of settings for form editing
  const [formData, setFormData] = useState<ShopSettings>({
    ...INITIAL_SHOP_SETTINGS,
    ...settings,
  });

  const [activeTab, setActiveTab] = useState<'branding' | 'profile' | 'appearance' | 'storefront' | 'commerce' | 'footer' | 'preview'>('branding');
  const [savedNotification, setSavedNotification] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // QR Code Upload & Customization State
  const qrFileInputRef = useRef<HTMLInputElement>(null);
  const abaQrFileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingQr, setIsDraggingQr] = useState(false);
  const [isDraggingAbaQr, setIsDraggingAbaQr] = useState(false);
  const [qrUploadError, setQrUploadError] = useState<string | null>(null);
  const [isProcessingQr, setIsProcessingQr] = useState(false);
  const [enlargedQrUrl, setEnlargedQrUrl] = useState<{ url: string; title: string } | null>(null);
  const [directQrUrlInput, setDirectQrUrlInput] = useState('');
  const [directAbaUrlInput, setDirectAbaUrlInput] = useState('');

  const handleQrFileUpload = async (file: File, target: 'khqr' | 'aba' = 'khqr') => {
    if (!file.type.startsWith('image/')) {
      setQrUploadError('Please select a valid image file (PNG, JPG, JPEG, WebP, or SVG).');
      setTimeout(() => setQrUploadError(null), 4500);
      return;
    }

    try {
      setIsProcessingQr(true);
      setQrUploadError(null);
      const dataUrl = await optimizeImageFile(file);
      if (target === 'khqr') {
        handleChange('customQrCodeUrl', dataUrl);
      } else {
        handleChange('abaQrCodeUrl', dataUrl);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process QR code image file.';
      setQrUploadError(message);
      setTimeout(() => setQrUploadError(null), 4500);
    } finally {
      setIsProcessingQr(false);
    }
  };

  const handleRemoveQr = (target: 'khqr' | 'aba' = 'khqr') => {
    if (target === 'khqr') {
      handleChange('customQrCodeUrl', '');
      setDirectQrUrlInput('');
      if (qrFileInputRef.current) qrFileInputRef.current.value = '';
    } else {
      handleChange('abaQrCodeUrl', '');
      setDirectAbaUrlInput('');
      if (abaQrFileInputRef.current) abaQrFileInputRef.current.value = '';
    }
  };

  const handleApplyDirectUrl = (target: 'khqr' | 'aba' = 'khqr') => {
    if (target === 'khqr') {
      if (!directQrUrlInput.trim()) return;
      handleChange('customQrCodeUrl', directQrUrlInput.trim());
      setDirectQrUrlInput('');
    } else {
      if (!directAbaUrlInput.trim()) return;
      handleChange('abaQrCodeUrl', directAbaUrlInput.trim());
      setDirectAbaUrlInput('');
    }
  };

  const handleLoadPreset = (type: 'khqr' | 'aba') => {
    if (type === 'khqr') {
      handleChange('customQrCodeUrl', SAMPLE_KHQR_SVG);
    } else {
      handleChange('abaQrCodeUrl', SAMPLE_ABA_SVG);
    }
  };

  const handleChange = <K extends keyof ShopSettings>(key: K, value: ShopSettings[K]) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePaymentToggle = (method: 'card' | 'khqr' | 'aba' | 'cod') => {
    setFormData(prev => ({
      ...prev,
      enabledPaymentMethods: {
        card: prev.enabledPaymentMethods?.card ?? true,
        khqr: prev.enabledPaymentMethods?.khqr ?? true,
        aba: prev.enabledPaymentMethods?.aba ?? true,
        cod: prev.enabledPaymentMethods?.cod ?? true,
        [method]: !prev.enabledPaymentMethods?.[method]
      }
    }));
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateSettings(formData);
    if (formData.theme) {
      setTheme(formData.theme);
    }
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 3500);
  };

  const handleResetToDefaults = () => {
    setFormData({ ...INITIAL_SHOP_SETTINGS });
    updateSettings({ ...INITIAL_SHOP_SETTINGS });
    setTheme(INITIAL_SHOP_SETTINGS.theme || 'light');
    setShowResetConfirm(false);
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 3500);
  };

  // Check if modified compared to store context
  const isDirty = JSON.stringify(formData) !== JSON.stringify(settings);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <Store className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Website &amp; Storefront Settings
                </h1>
                <span className="bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                  Live Sync
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
                Edit all information shown across the website — including business identity, contact hotlines, storefront hero banners, checkout currencies, delivery rates, and footer policies.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveView('shop')}
              className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors"
              title="View how the storefront looks with these settings"
            >
              <Eye className="w-4 h-4 text-slate-500" />
              <span>Preview Storefront</span>
            </button>

            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="inline-flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={!userPermissions.canEditSettings}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-extrabold shadow-md transition-all active:scale-95 ${
                isDirty 
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 ring-2 ring-amber-400/50' 
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{isDirty ? 'Save All Changes *' : 'Save Settings'}</span>
            </button>
          </div>
        </div>

        {/* Status Toast Alert */}
        {savedNotification && (
          <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-emerald-800 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2.5 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Settings successfully saved! All storefront pages, header navigation, hero banners, and footers have been updated immediately.</span>
            </div>
            <button 
              onClick={() => setSavedNotification(false)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-extrabold px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {isDirty && !savedNotification && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-amber-900 text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>You have unsaved changes. Click <strong>"Save All Changes"</strong> to apply them across your live website.</span>
          </div>
        )}
      </div>

      {/* Main Grid: Navigation Tabs + Active Section Form */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="bg-white rounded-3xl border border-slate-200 p-3 shadow-xs space-y-1 lg:sticky lg:top-24">
          <button
            onClick={() => setActiveTab('branding')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left ${
              activeTab === 'branding'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <ImageIcon className={`w-4 h-4 ${activeTab === 'branding' ? 'text-slate-950' : 'text-amber-500'}`} />
            <div className="flex-1">
              <p className="leading-tight">Logo &amp; Banner Studio</p>
              <p className={`text-[10px] font-normal ${activeTab === 'branding' ? 'text-slate-950 font-semibold' : 'text-slate-400'}`}>
                Upload, adjust &amp; live preview
              </p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left ${
              activeTab === 'profile'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Store className={`w-4 h-4 ${activeTab === 'profile' ? 'text-amber-400' : 'text-slate-400'}`} />
            <div className="flex-1">
              <p className="leading-tight">Store Identity &amp; Contact</p>
              <p className={`text-[10px] font-normal ${activeTab === 'profile' ? 'text-slate-300' : 'text-slate-400'}`}>
                Name, hotline, email &amp; socials
              </p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left ${
              activeTab === 'appearance'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Palette className={`w-4 h-4 ${activeTab === 'appearance' ? 'text-amber-400' : 'text-slate-400'}`} />
            <div className="flex-1">
              <p className="leading-tight">Theme &amp; Appearance</p>
              <p className={`text-[10px] font-normal ${activeTab === 'appearance' ? 'text-slate-300' : 'text-slate-400'}`}>
                Light, Dark &amp; CSS variables
              </p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            onClick={() => setActiveTab('storefront')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left ${
              activeTab === 'storefront'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Sparkles className={`w-4 h-4 ${activeTab === 'storefront' ? 'text-amber-400' : 'text-slate-400'}`} />
            <div className="flex-1">
              <p className="leading-tight">Storefront &amp; Hero Banner</p>
              <p className={`text-[10px] font-normal ${activeTab === 'storefront' ? 'text-slate-300' : 'text-slate-400'}`}>
                Headlines, notices &amp; buttons
              </p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            onClick={() => setActiveTab('commerce')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left ${
              activeTab === 'commerce'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <DollarSign className={`w-4 h-4 ${activeTab === 'commerce' ? 'text-amber-400' : 'text-slate-400'}`} />
            <div className="flex-1">
              <p className="leading-tight">Commerce &amp; Shipping</p>
              <p className={`text-[10px] font-normal ${activeTab === 'commerce' ? 'text-slate-300' : 'text-slate-400'}`}>
                Currency, shipping &amp; KHQR
              </p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            onClick={() => setActiveTab('footer')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left ${
              activeTab === 'footer'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <FileText className={`w-4 h-4 ${activeTab === 'footer' ? 'text-amber-400' : 'text-slate-400'}`} />
            <div className="flex-1">
              <p className="leading-tight">Footer &amp; Policies</p>
              <p className={`text-[10px] font-normal ${activeTab === 'footer' ? 'text-slate-300' : 'text-slate-400'}`}>
                Warranty, about &amp; copyright
              </p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left ${
              activeTab === 'preview'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Eye className={`w-4 h-4 ${activeTab === 'preview' ? 'text-amber-400' : 'text-slate-400'}`} />
            <div className="flex-1">
              <p className="leading-tight">Real-Time Live Preview</p>
              <p className={`text-[10px] font-normal ${activeTab === 'preview' ? 'text-slate-300' : 'text-slate-400'}`}>
                Inspect live website header &amp; banner
              </p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* SECTION 0: LOGO & BANNER STUDIO */}
          {activeTab === 'branding' && (
            <LogoBannerStudio onSavedNotification={() => setSavedNotification(true)} />
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* SECTION 1: STORE IDENTITY & CONTACT */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Store className="w-5 h-5 text-amber-500" />
                    <span>Store Identity &amp; Contact Details</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    These details appear in the top navbar, store brand header, order invoices, and contact sections.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Shop Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Store / Website Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.shopName}
                      onChange={(e) => handleChange('shopName', e.target.value)}
                      placeholder="e.g., Chan Online Shop"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-semibold"
                      required
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Displayed prominently on the top navigation bar and browser tab.</p>
                  </div>

                  {/* Slogan / Tagline */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Tagline / Brand Slogan
                    </label>
                    <input
                      type="text"
                      value={formData.tagline || ''}
                      onChange={(e) => handleChange('tagline', e.target.value)}
                      placeholder="e.g., Official Warranty & Fast Delivery Across Cambodia"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>

                  {/* Phone Hotline */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Customer Service Hotline <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        placeholder="e.g., 070 433 464"
                        className="w-full pl-10 bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono font-bold"
                        required
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Direct click-to-call number on navbar, hero, and invoice receipts.</p>
                  </div>

                  {/* Support Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Official Contact Email <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder="e.g., chan.onlineshop.kh@gmail.com"
                        className="w-full pl-10 bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Physical Address */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Physical Store Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        placeholder="e.g., Street 271, Sangkat Boeung Tumpun, Khan Mean Chey, Phnom Penh"
                        className="w-full pl-10 bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* City & Country */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      City &amp; Country
                    </label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder="e.g., Phnom Penh, Cambodia"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>

                  {/* Working Hours */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Working &amp; Support Hours
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formData.workingHours || ''}
                        onChange={(e) => handleChange('workingHours', e.target.value)}
                        placeholder="e.g., 8:00 AM – 9:00 PM (Monday – Sunday)"
                        className="w-full pl-10 bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Telegram Username */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Telegram Username (Without @)
                    </label>
                    <div className="relative">
                      <Send className="w-4 h-4 text-sky-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formData.telegramUsername}
                        onChange={(e) => handleChange('telegramUsername', e.target.value.replace(/^@/, ''))}
                        placeholder="e.g., chan_onlineshop_070"
                        className="w-full pl-10 bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Generates direct chat link: https://t.me/{formData.telegramUsername}</p>
                  </div>

                  {/* Facebook URL */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Facebook Page URL
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        value={formData.facebookUrl || ''}
                        onChange={(e) => handleChange('facebookUrl', e.target.value)}
                        placeholder="https://facebook.com/yourshop"
                        className="w-full pl-10 bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION: THEME & APPEARANCE */}
            {activeTab === 'appearance' && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                        <Palette className="w-5 h-5 text-amber-500" />
                        <span>Theme &amp; Appearance Preferences</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Configure the application color scheme. Changes update CSS variables and persist in user settings and localStorage.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                      <span className="text-slate-500">Active Mode:</span>
                      <span className="text-amber-600 uppercase font-black">{resolvedTheme} MODE</span>
                    </div>
                  </div>
                </div>

                {/* Theme Mode Selector Cards */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-3">
                    Select Default Theme
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Light Mode Card */}
                    <button
                      type="button"
                      onClick={() => {
                        handleChange('theme', 'light');
                        setTheme('light');
                      }}
                      className={`flex flex-col items-start p-4 rounded-2xl border text-left transition-all relative ${
                        (formData.theme || 'light') === 'light'
                          ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/30'
                          : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mb-3">
                        <Sun className="w-5 h-5 text-amber-500" />
                      </div>
                      <span className="text-sm font-extrabold text-slate-900">Light Mode</span>
                      <p className="text-xs text-slate-500 mt-1">
                        Clean daylight aesthetic with bright white surfaces, high-contrast dark slate text, and amber accents.
                      </p>
                      {(formData.theme || 'light') === 'light' && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </button>

                    {/* Dark Mode Card */}
                    <button
                      type="button"
                      onClick={() => {
                        handleChange('theme', 'dark');
                        setTheme('dark');
                      }}
                      className={`flex flex-col items-start p-4 rounded-2xl border text-left transition-all relative ${
                        formData.theme === 'dark'
                          ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/30'
                          : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 shadow-xs flex items-center justify-center mb-3">
                        <Moon className="w-5 h-5 text-amber-400" />
                      </div>
                      <span className="text-sm font-extrabold text-slate-900">Dark Mode</span>
                      <p className="text-xs text-slate-500 mt-1">
                        Sleek low-light experience featuring deep slate backgrounds, reduced glare, and high contrast typography.
                      </p>
                      {formData.theme === 'dark' && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </button>

                    {/* System Auto Card */}
                    <button
                      type="button"
                      onClick={() => {
                        handleChange('theme', 'system');
                        setTheme('system');
                      }}
                      className={`flex flex-col items-start p-4 rounded-2xl border text-left transition-all relative ${
                        formData.theme === 'system'
                          ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/30'
                          : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-200 to-slate-800 border border-slate-300 shadow-xs flex items-center justify-center mb-3 text-white">
                        <Monitor className="w-5 h-5 text-amber-400" />
                      </div>
                      <span className="text-sm font-extrabold text-slate-900">System (Auto)</span>
                      <p className="text-xs text-slate-500 mt-1">
                        Automatically mirrors your operating system preference. Adapts as your device switches between day and night.
                      </p>
                      {formData.theme === 'system' && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                {/* CSS Variables & Tokens Visualizer */}
                <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Injected CSS Variables &amp; Design Tokens</span>
                    </h3>
                    <span className="text-[11px] font-mono font-bold text-slate-500">
                      :root[{resolvedTheme}]
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    The following root CSS variables are actively injected into the DOM stylesheet and react in real-time:
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-500">--bg-primary</span>
                      <span className="font-bold text-slate-900">{resolvedTheme === 'dark' ? '#0f172a' : '#ffffff'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-500">--bg-surface</span>
                      <span className="font-bold text-slate-900">{resolvedTheme === 'dark' ? '#1e293b' : '#f8fafc'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-500">--text-primary</span>
                      <span className="font-bold text-slate-900">{resolvedTheme === 'dark' ? '#f8fafc' : '#0f172a'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-500">--text-secondary</span>
                      <span className="font-bold text-slate-900">{resolvedTheme === 'dark' ? '#94a3b8' : '#64748b'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-500">--border-color</span>
                      <span className="font-bold text-slate-900">{resolvedTheme === 'dark' ? '#334155' : '#e2e8f0'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-500">--accent-color</span>
                      <span className="font-bold text-amber-500">#f59e0b</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: STOREFRONT & HERO BANNER */}
            {activeTab === 'storefront' && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <span>Storefront Hero &amp; Promotional Content</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Customize the marketing headlines, promotional badge, action buttons, and top announcement banner.
                  </p>
                </div>

                {/* Banner & Logo Studio Direct Link */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-xs">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-amber-950">Looking to upload and adjust Logo &amp; Hero Banner?</h4>
                      <p className="text-amber-800 text-[11px] mt-0.5">Use the interactive Logo &amp; Banner Studio for drag-and-drop uploads, shape/size sliders, and real-time live preview.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('branding')}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-xs cursor-pointer"
                  >
                    <span>Open Logo &amp; Banner Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Top Bar Announcement */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Top Announcement Bar Notice
                    </label>
                    <input
                      type="text"
                      value={formData.topBarAnnouncement || ''}
                      onChange={(e) => handleChange('topBarAnnouncement', e.target.value)}
                      placeholder="e.g., Official Cambodia Store • 100% Authentic Quality Warranty • Free Delivery over $50"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Displayed in the dark notification strip at the very top of every page.</p>
                  </div>

                  {/* Hero Badge */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Hero Pill Badge Text
                    </label>
                    <input
                      type="text"
                      value={formData.heroBadge || ''}
                      onChange={(e) => handleChange('heroBadge', e.target.value)}
                      placeholder="e.g., Official Chan Online Shop Portal"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>

                  {/* Hero Title */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Main Hero Headline <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.heroTitle || ''}
                      onChange={(e) => handleChange('heroTitle', e.target.value)}
                      placeholder="e.g., Quality Goods, Verified Gateway & Direct Hotline."
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-bold"
                      required
                    />
                  </div>

                  {/* Hero Subtitle */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Hero Subtitle / Description
                    </label>
                    <textarea
                      rows={3}
                      value={formData.heroSubtitle || ''}
                      onChange={(e) => handleChange('heroSubtitle', e.target.value)}
                      placeholder="e.g., Discover verified smartphones, audio gear, commuter essentials, and lifestyle products..."
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all leading-relaxed"
                    />
                  </div>

                  {/* Button Labels */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Primary Button Label (Hotline)
                      </label>
                      <input
                        type="text"
                        value={formData.heroCallButtonText || ''}
                        onChange={(e) => handleChange('heroCallButtonText', e.target.value)}
                        placeholder="e.g., Call Order"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Secondary Button Label
                      </label>
                      <input
                        type="text"
                        value={formData.heroSecondaryButtonText || ''}
                        onChange={(e) => handleChange('heroSecondaryButtonText', e.target.value)}
                        placeholder="e.g., Inventory Management"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: COMMERCE & SHIPPING */}
            {activeTab === 'commerce' && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-amber-500" />
                    <span>Commerce, Currency, Shipping &amp; Payment Gateways</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure pricing currencies, delivery pricing thresholds, delivery promises, and accepted payment rails.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Currency Symbol */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Store Currency Symbol
                    </label>
                    <input
                      type="text"
                      value={formData.currency}
                      onChange={(e) => handleChange('currency', e.target.value)}
                      placeholder="e.g., $"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono font-bold"
                    />
                  </div>

                  {/* KHR Exchange Rate */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      USD to KHR (Riels) Exchange Rate
                    </label>
                    <input
                      type="number"
                      value={formData.khrExchangeRate || 4100}
                      onChange={(e) => handleChange('khrExchangeRate', parseFloat(e.target.value) || 4100)}
                      placeholder="e.g., 4100"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono font-bold"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Used for POS KHQR dual currency receipts and cash conversion.</p>
                  </div>

                  {/* Standard Shipping Fee */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Standard Shipping Fee ({formData.currency})
                    </label>
                    <div className="relative">
                      <Truck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="number"
                        step="0.1"
                        value={formData.standardShippingFee}
                        onChange={(e) => handleChange('standardShippingFee', parseFloat(e.target.value) || 0)}
                        className="w-full pl-10 bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Free Shipping Threshold */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Free Shipping Threshold ({formData.currency})
                    </label>
                    <div className="relative">
                      <BadgePercent className="w-4 h-4 text-amber-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="number"
                        step="1"
                        value={formData.freeShippingThreshold}
                        onChange={(e) => handleChange('freeShippingThreshold', parseFloat(e.target.value) || 0)}
                        className="w-full pl-10 bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono font-bold"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Orders at or above this amount receive $0.00 free delivery.</p>
                  </div>

                  {/* Delivery Estimate Text */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Delivery Promise &amp; Speed Text
                    </label>
                    <input
                      type="text"
                      value={formData.deliveryEstimateText || ''}
                      onChange={(e) => handleChange('deliveryEstimateText', e.target.value)}
                      placeholder="e.g., 1-2 Business Days in Phnom Penh, 2-3 Days Nationwide"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>

                  {/* Tax / VAT */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Default VAT / Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.taxRate}
                      onChange={(e) => handleChange('taxRate', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono font-bold"
                    />
                  </div>

                  {/* KHQR Merchant Account */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      KHQR Display Merchant Account / ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.khqrMerchantAccount || ''}
                      onChange={(e) => handleChange('khqrMerchantAccount', e.target.value)}
                      placeholder="e.g., 001 234 567 or phone number"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Displays on customer checkout screen and POS scanner footer.</p>
                  </div>

                  {/* KHQR Merchant Display Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      KHQR Merchant / Business Display Title
                    </label>
                    <input
                      type="text"
                      value={formData.khqrMerchantName || ''}
                      onChange={(e) => handleChange('khqrMerchantName', e.target.value)}
                      placeholder="e.g., CHAN SOKHA ONLINE STORE"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-bold"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Official bank account name shown above the QR code.</p>
                  </div>

                  {/* Accepted Payment Rails */}
                  <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Active Payment Methods on Checkout
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <button
                        type="button"
                        onClick={() => handlePaymentToggle('card')}
                        className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                          formData.enabledPaymentMethods?.card !== false
                            ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                            : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                        }`}
                      >
                        <CreditCard className="w-5 h-5 text-amber-600" />
                        <span>Credit / Debit Card</span>
                        <span className="text-[10px] font-normal">
                          {formData.enabledPaymentMethods?.card !== false ? 'Enabled' : 'Disabled'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePaymentToggle('khqr')}
                        className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                          formData.enabledPaymentMethods?.khqr !== false
                            ? 'bg-rose-50/80 border-rose-300 text-rose-950'
                            : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                        }`}
                      >
                        <span className="w-5 h-5 font-black text-rose-600 flex items-center justify-center">QR</span>
                        <span>Bakong KHQR</span>
                        <span className="text-[10px] font-normal">
                          {formData.enabledPaymentMethods?.khqr !== false ? 'Enabled' : 'Disabled'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePaymentToggle('aba')}
                        className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                          formData.enabledPaymentMethods?.aba !== false
                            ? 'bg-sky-50/80 border-sky-300 text-sky-950'
                            : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                        }`}
                      >
                        <span className="w-5 h-5 font-black text-sky-600 flex items-center justify-center">ABA</span>
                        <span>ABA PayWay</span>
                        <span className="text-[10px] font-normal">
                          {formData.enabledPaymentMethods?.aba !== false ? 'Enabled' : 'Disabled'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePaymentToggle('cod')}
                        className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                          formData.enabledPaymentMethods?.cod !== false
                            ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                            : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                        }`}
                      >
                        <Truck className="w-5 h-5 text-emerald-600" />
                        <span>Cash On Delivery</span>
                        <span className="text-[10px] font-normal">
                          {formData.enabledPaymentMethods?.cod !== false ? 'Enabled' : 'Disabled'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* DEDICATED QR CODE UPLOAD & CUSTOMIZATION SECTION */}
                  <div className="sm:col-span-2 pt-4 border-t border-slate-100 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                            <QrCode className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-extrabold text-slate-900">
                              Payment QR Code (Bakong KHQR / Bank Pay)
                            </h3>
                            <p className="text-[11px] text-slate-500">
                              Upload your bank QR image file so customers scan your real merchant account.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Status indicator */}
                      <div className="flex items-center gap-2">
                        {formData.customQrCodeUrl ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Custom QR Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                            <Layers className="w-3.5 h-3.5" />
                            <span>System Vector QR</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Upload error banner if any */}
                    {qrUploadError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>{qrUploadError}</span>
                      </div>
                    )}

                    {/* Main QR Code Manager Layout: Left Upload/Options, Right Live Frame Preview */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 bg-slate-50/70 p-4 sm:p-5 rounded-3xl border border-slate-200/80">
                      
                      {/* Left: Upload Dropzone & Controls (7 cols) */}
                      <div className="lg:col-span-7 space-y-4">
                        
                        {/* Hidden File Input */}
                        <input
                          type="file"
                          ref={qrFileInputRef}
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleQrFileUpload(e.target.files[0], 'khqr');
                            }
                          }}
                          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                          className="hidden"
                          id="khqr-file-upload-input"
                        />

                        {/* Drag and Drop Zone */}
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingQr(true);
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            setIsDraggingQr(false);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingQr(false);
                            if (e.dataTransfer.files?.[0]) {
                              handleQrFileUpload(e.dataTransfer.files[0], 'khqr');
                            }
                          }}
                          onClick={() => qrFileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group ${
                            isDraggingQr
                              ? 'border-rose-500 bg-rose-50/60 scale-[1.01]'
                              : 'border-slate-300 hover:border-rose-400 bg-white hover:bg-rose-50/20'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            {isProcessingQr ? (
                              <RefreshCw className="w-6 h-6 animate-spin text-rose-600" />
                            ) : (
                              <Upload className="w-6 h-6" />
                            )}
                          </div>

                          <div>
                            <p className="text-xs font-extrabold text-slate-800">
                              {isProcessingQr ? 'Optimizing Image...' : 'Click or Drag & Drop QR Image File'}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Supports PNG, JPG, WebP, or SVG (Square 1:1 recommended, max 10MB)
                            </p>
                          </div>

                          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-xl border border-rose-200 mt-1">
                            <FileUp className="w-3.5 h-3.5" />
                            <span>Browse Device Files</span>
                          </div>
                        </div>

                        {/* Quick Presets & Image URL Option */}
                        <div className="space-y-2">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Quick Templates &amp; Sample QR
                          </label>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleLoadPreset('khqr')}
                              className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 rounded-xl text-xs font-bold text-slate-700 hover:text-rose-700 flex items-center gap-1.5 transition-colors shadow-2xs"
                            >
                              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                              <span>Sample Bakong KHQR</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleLoadPreset('aba')}
                              className="px-3 py-1.5 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-xl text-xs font-bold text-slate-700 hover:text-sky-700 flex items-center gap-1.5 transition-colors shadow-2xs"
                            >
                              <span className="w-2 h-2 rounded-full bg-sky-600"></span>
                              <span>Sample ABA PayWay QR</span>
                            </button>

                            {formData.customQrCodeUrl && (
                              <button
                                type="button"
                                onClick={() => handleRemoveQr('khqr')}
                                className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-rose-200 text-rose-600 hover:text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Reset to Default</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Direct Image URL Alternative */}
                        <div className="space-y-1.5 pt-1">
                          <label className="block text-[11px] font-bold text-slate-600">
                            Or Paste Direct Image URL (Cloud / CDN link)
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              value={directQrUrlInput}
                              onChange={(e) => setDirectQrUrlInput(e.target.value)}
                              placeholder="https://example.com/my-merchant-khqr.png"
                              className="flex-1 bg-white border border-slate-200 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => handleApplyDirectUrl('khqr')}
                              disabled={!directQrUrlInput.trim()}
                              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors shrink-0"
                            >
                              Apply URL
                            </button>
                          </div>
                        </div>

                      </div>

                      {/* Right: Live Interactive KHQR Preview Frame (5 cols) */}
                      <div className="lg:col-span-5 flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-slate-200/90 shadow-sm">
                        <div className="w-full text-center pb-2 border-b border-slate-100 mb-3 flex items-center justify-between px-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Live Checkout Frame
                          </span>
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                            {formData.customQrCodeUrl ? 'Custom Image' : 'Vector Standard'}
                          </span>
                        </div>

                        {/* KHQR Card Replica */}
                        <div className="w-48 bg-white p-3 rounded-2xl border-2 border-rose-500 shadow-sm flex flex-col items-center">
                          <div className="w-full bg-rose-600 text-white py-1 text-[10px] font-black tracking-wider uppercase rounded-md mb-2 flex items-center justify-center gap-1">
                            <QrCode className="w-3 h-3" />
                            <span>KHQR Pay</span>
                          </div>

                          {/* QR Code Container */}
                          <div className="w-36 h-36 bg-slate-50 rounded-lg p-1.5 flex items-center justify-center border border-slate-200 relative group overflow-hidden">
                            {formData.customQrCodeUrl ? (
                              <>
                                <img
                                  src={formData.customQrCodeUrl}
                                  alt="Custom Merchant QR"
                                  className="w-full h-full object-contain rounded"
                                />
                                <div
                                  onClick={() => setEnlargedQrUrl({ url: formData.customQrCodeUrl!, title: formData.khqrMerchantName || formData.shopName })}
                                  className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer text-white text-[10px] font-bold gap-1"
                                >
                                  <ZoomIn className="w-3.5 h-3.5" /> Enlarge
                                </div>
                              </>
                            ) : (
                              /* Default Vector KHQR Simulation */
                              <div className="w-full h-full bg-white flex flex-col items-center justify-center p-1 rounded relative">
                                <div className="grid grid-cols-5 gap-1 w-full h-full">
                                  {[...Array(25)].map((_, i) => (
                                    <div
                                      key={i}
                                      className={`rounded-xs ${
                                        i === 0 || i === 4 || i === 20 || i === 12 || i === 7 || i === 18 || i === 24
                                          ? 'bg-rose-700'
                                          : (i % 2 === 0 ? 'bg-slate-900' : 'bg-slate-200')
                                      }`}
                                    />
                                  ))}
                                </div>
                                <div className="absolute inset-0 m-auto w-7 h-7 rounded-full bg-white border border-rose-600 flex items-center justify-center text-[8px] font-black text-rose-600">
                                  $
                                </div>
                              </div>
                            )}
                          </div>

                          <p className="text-xs font-black text-slate-900 mt-2 text-center truncate max-w-full px-1">
                            {formData.khqrMerchantName || formData.shopName || 'MERCHANT NAME'}
                          </p>
                          <p className="text-[11px] font-bold text-rose-600 font-mono">$10.00 USD</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-full">
                            Acc: {formData.khqrMerchantAccount || formData.phone || '001 234 567'}
                          </p>
                        </div>

                        {/* Action buttons under preview */}
                        <div className="mt-3 flex items-center gap-2">
                          {formData.customQrCodeUrl ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setEnlargedQrUrl({ url: formData.customQrCodeUrl!, title: formData.khqrMerchantName || formData.shopName })}
                                className="text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors"
                              >
                                <ZoomIn className="w-3.5 h-3.5 text-slate-500" />
                                <span>Preview Zoom</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveQr('khqr')}
                                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Clear Image</span>
                              </button>
                            </>
                          ) : (
                            <p className="text-[11px] text-slate-400 text-center italic">
                              Upload an image above to replace this frame.
                            </p>
                          )}
                        </div>

                      </div>
                    </div>

                    {/* OPTIONAL: ABA PAYWAY SECONDARY QR UPLOAD */}
                    <div className="p-4 bg-sky-50/50 rounded-2xl border border-sky-200/70 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center text-[10px] font-black">
                            ABA
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">
                              Secondary ABA PayWay QR (Optional)
                            </h4>
                            <p className="text-[10px] text-slate-500">
                              If you have a dedicated ABA Mobile QR separate from general KHQR, upload it here.
                            </p>
                          </div>
                        </div>

                        {formData.abaQrCodeUrl && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQr('aba')}
                            className="text-[10px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 self-start sm:self-auto"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove ABA QR</span>
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <input
                          type="file"
                          ref={abaQrFileInputRef}
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleQrFileUpload(e.target.files[0], 'aba');
                            }
                          }}
                          accept="image/*"
                          className="hidden"
                          id="aba-qr-file-upload-input"
                        />

                        <button
                          type="button"
                          onClick={() => abaQrFileInputRef.current?.click()}
                          className="w-full sm:w-auto px-3.5 py-2 bg-white hover:bg-sky-50 border border-sky-300 text-sky-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <Upload className="w-3.5 h-3.5 text-sky-600" />
                          <span>{formData.abaQrCodeUrl ? 'Replace ABA QR File' : 'Upload ABA QR File'}</span>
                        </button>

                        <div className="flex-1 flex gap-2 w-full">
                          <input
                            type="url"
                            value={directAbaUrlInput}
                            onChange={(e) => setDirectAbaUrlInput(e.target.value)}
                            placeholder="Or paste ABA QR image URL"
                            className="flex-1 bg-white border border-sky-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleApplyDirectUrl('aba')}
                            disabled={!directAbaUrlInput.trim()}
                            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors shrink-0"
                          >
                            Apply
                          </button>
                        </div>

                        {formData.abaQrCodeUrl && (
                          <div 
                            onClick={() => setEnlargedQrUrl({ url: formData.abaQrCodeUrl!, title: 'ABA PayWay QR' })}
                            className="w-8 h-8 rounded-lg border border-sky-300 bg-white p-0.5 cursor-pointer hover:scale-105 transition-transform shrink-0"
                            title="Click to view ABA QR"
                          >
                            <img src={formData.abaQrCodeUrl} alt="ABA QR" className="w-full h-full object-contain rounded" />
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* SECTION 4: FOOTER & POLICIES */}
            {activeTab === 'footer' && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-500" />
                    <span>Footer, Customer Trust &amp; Legal Policies</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Information displayed at the bottom of the website and customer receipts.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* About Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      About Us Summary (Footer)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.footerAboutText || ''}
                      onChange={(e) => handleChange('footerAboutText', e.target.value)}
                      placeholder="e.g., Your trusted online shop in Cambodia for smartphones, smart wearables..."
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all leading-relaxed"
                    />
                  </div>

                  {/* Warranty & Guarantee */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Warranty &amp; Security Statement
                    </label>
                    <input
                      type="text"
                      value={formData.warrantyText || ''}
                      onChange={(e) => handleChange('warrantyText', e.target.value)}
                      placeholder="e.g., 7 Days Replacement Guarantee & 12 Months Official Manufacturer Warranty."
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>

                  {/* Copyright Notice */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Copyright Notice Text
                    </label>
                    <input
                      type="text"
                      value={formData.copyrightText || ''}
                      onChange={(e) => handleChange('copyrightText', e.target.value)}
                      placeholder="e.g., All rights reserved."
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 5: REAL-TIME PREVIEW */}
            {activeTab === 'preview' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">Live Header &amp; Announcement Bar Preview</h2>
                      <p className="text-xs text-slate-500">Updates dynamically in real time as you adjust settings.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('branding')}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Adjust Logo &amp; Banner</span>
                      </button>
                      <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                        Live Mockup
                      </span>
                    </div>
                  </div>

                  {/* Simulated Announcement Bar */}
                  <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4 rounded-xl mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>{formData.topBarAnnouncement || `Welcome to ${formData.shopName}`}</span>
                    </div>
                    <span className="text-amber-400 font-bold">Hotline: {formData.phone}</span>
                  </div>

                  {/* Simulated Navbar Header */}
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {(formData.logoUrl || settings.logoUrl) ? (
                        <div className={`w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center p-1 ${
                          (formData.logoBg || settings.logoBg) === 'transparent' ? 'bg-transparent' :
                          (formData.logoBg || settings.logoBg) === 'light' ? 'bg-white border border-slate-200 shadow-2xs' :
                          (formData.logoBg || settings.logoBg) === 'dark' ? 'bg-slate-900 border border-slate-700 shadow-2xs' :
                          'bg-amber-500 text-slate-950'
                        }`}>
                          <img 
                            src={formData.logoUrl || settings.logoUrl} 
                            alt="Logo" 
                            className="w-full h-full object-contain" 
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black">
                          <Store className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-lg text-slate-900 leading-none">{formData.shopName}</span>
                          <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">Official</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Tel: <strong>{formData.phone}</strong> • {formData.city || formData.address}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">Telegram: @{formData.telegramUsername}</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Hero Banner */}
                <div 
                  className="relative overflow-hidden text-white rounded-3xl p-6 sm:p-8 border border-slate-700/60 shadow-xl space-y-4"
                  style={{
                    backgroundImage: (formData.bannerUrl || settings.bannerUrl) ? `url(${formData.bannerUrl || settings.bannerUrl})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: (formData.bannerPosition || settings.bannerPosition || 'center'),
                  }}
                >
                  {/* Dynamic Dark Backdrop Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${
                    (formData.bannerUrl || settings.bannerUrl)
                      ? 'from-slate-950/90 via-slate-900/80 to-amber-950/70'
                      : 'from-slate-900 via-slate-800 to-amber-950'
                  }`} />

                  <div className="relative z-10 space-y-4">
                    <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-1 rounded-full text-xs font-semibold">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>{formData.heroBadge || `Official ${formData.shopName} Portal`}</span>
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                      {formData.heroTitle || 'Quality Goods, Verified Gateway & Direct Hotline.'}
                    </h3>

                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-xl">
                    {formData.heroSubtitle || 'Discover verified smartphones, audio gear, commuter essentials, and lifestyle products.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <div className="bg-amber-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{formData.heroCallButtonText || 'Call Order'}: {formData.phone}</span>
                    </div>
                    <div className="bg-white/10 text-white font-semibold px-4 py-2.5 rounded-xl text-xs">
                      {formData.heroSecondaryButtonText || 'Inventory Management'}
                    </div>
                  </div>

                    <div className="pt-4 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300">
                      <div>✓ 100% Genuine Guaranteed</div>
                      <div>✓ Free Ship over ${formData.freeShippingThreshold}</div>
                      <div>✓ Delivery: {formData.city || 'Phnom Penh'}</div>
                      <div>✓ Direct Hotline: {formData.phone}</div>
                    </div>
                  </div>
                </div>

                {/* Simulated Checkout Payment Rails & KHQR Preview */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-rose-600" />
                      <h4 className="text-sm font-black text-slate-900">Customer Checkout Gateway Mockup</h4>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      Live Customer View
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-700">Active Payment Methods on Checkout:</p>
                      <div className="flex flex-wrap gap-2">
                        {formData.enabledPaymentMethods?.card !== false && (
                          <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-xl font-bold">
                            <CreditCard className="w-3.5 h-3.5 text-amber-600" /> Visa / Mastercard
                          </span>
                        )}
                        {formData.enabledPaymentMethods?.khqr !== false && (
                          <span className="inline-flex items-center gap-1 text-xs bg-rose-50 text-rose-900 border border-rose-200 px-3 py-1.5 rounded-xl font-bold">
                            <QrCode className="w-3.5 h-3.5 text-rose-600" /> Bakong KHQR
                          </span>
                        )}
                        {formData.enabledPaymentMethods?.aba !== false && (
                          <span className="inline-flex items-center gap-1 text-xs bg-sky-50 text-sky-900 border border-sky-200 px-3 py-1.5 rounded-xl font-bold">
                            <span className="w-2 h-2 rounded-full bg-sky-600"></span> ABA PayWay
                          </span>
                        )}
                        {formData.enabledPaymentMethods?.cod !== false && (
                          <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-900 border border-emerald-200 px-3 py-1.5 rounded-xl font-bold">
                            <Truck className="w-3.5 h-3.5 text-emerald-600" /> Cash On Delivery
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 pt-1">
                        Merchant: <strong>{formData.khqrMerchantName || formData.shopName}</strong> (Acc: {formData.khqrMerchantAccount || formData.phone})
                      </p>
                    </div>

                    <div className="flex justify-center">
                      <div className="w-44 bg-white p-3 rounded-2xl border-2 border-rose-500 shadow-sm flex flex-col items-center">
                        <div className="w-full bg-rose-600 text-white py-0.5 text-[9px] font-black tracking-wider uppercase rounded text-center mb-2">
                          KHQR Pay
                        </div>
                        <div className="w-32 h-32 bg-slate-50 rounded p-1 flex items-center justify-center border border-slate-200">
                          {formData.customQrCodeUrl ? (
                            <img src={formData.customQrCodeUrl} alt="QR Preview" className="w-full h-full object-contain rounded" />
                          ) : (
                            <QrCode className="w-20 h-20 text-slate-800" />
                          )}
                        </div>
                        <p className="text-[10px] font-black text-slate-900 mt-1 truncate max-w-full">
                          {formData.khqrMerchantName || formData.shopName}
                        </p>
                        <p className="text-[10px] font-bold text-rose-600 font-mono">$10.00 USD</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Form Actions Bar */}
            <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>All settings automatically persist to your local store and cloud backup.</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveView('shop')}
                  className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors text-center"
                >
                  Back to Store
                </button>

                <button
                  type="submit"
                  disabled={!userPermissions.canEditSettings}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>Save All Settings</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Enlarged QR Code Lightbox Modal */}
      {enlargedQrUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4"
          onClick={() => setEnlargedQrUrl(null)}
        >
          <div 
            className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 max-w-sm w-full shadow-2xl space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-extrabold text-slate-900">{enlargedQrUrl.title || 'Payment QR Code'}</h4>
                  <p className="text-[10px] text-slate-500 font-mono">Bakong KHQR / Bank Pay</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEnlargedQrUrl(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-white rounded-2xl border-2 border-rose-500 shadow-inner inline-block">
              <img
                src={enlargedQrUrl.url}
                alt="Enlarged QR Code"
                className="w-64 h-64 object-contain rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <a
                href={enlargedQrUrl.url}
                download="merchant-payment-qr.png"
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Image</span>
              </a>
              <button
                type="button"
                onClick={() => setEnlargedQrUrl(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">Reset to Factory Settings?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                This will reset the store name, contact numbers, hero banner content, and commerce rates back to default values.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetToDefaults}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-black py-2.5 rounded-xl text-xs transition-colors shadow-md shadow-rose-600/20"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
