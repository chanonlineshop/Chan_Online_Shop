import React, { useState, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { ShopSettings } from '../types';
import { optimizeImage } from '../utils/imageOptimizer';
import { 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  Sliders, 
  Sparkles, 
  Eye, 
  Monitor, 
  Tablet, 
  Smartphone, 
  Check, 
  CheckCircle2, 
  RefreshCw, 
  RotateCcw, 
  ShoppingBag, 
  PhoneCall, 
  ShieldCheck, 
  Truck, 
  CreditCard, 
  BadgePercent, 
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkle
} from 'lucide-react';

// Curated high-resolution e-commerce banner presets
export const BANNER_PRESETS = [
  {
    id: 'tech-audio',
    name: 'Modern Tech & Audio Gear',
    category: 'Electronics',
    url: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=300&q=70',
    recommendedTint: 'navy' as const,
    recommendedOpacity: 70,
  },
  {
    id: 'dark-studio',
    name: 'Minimalist Dark Luxe Studio',
    category: 'Premium Audio',
    url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=300&q=70',
    recommendedTint: 'dark' as const,
    recommendedOpacity: 65,
  },
  {
    id: 'smart-wearables',
    name: 'Smart Wearables & Gadgets',
    category: 'Smart Life',
    url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=300&q=70',
    recommendedTint: 'amber' as const,
    recommendedOpacity: 60,
  },
  {
    id: 'logistics-warehouse',
    name: 'Phnom Penh Express Logistics',
    category: 'Fast Delivery',
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=300&q=70',
    recommendedTint: 'dark' as const,
    recommendedOpacity: 75,
  },
  {
    id: 'neon-cyber',
    name: 'Cyberpunk Neon Storefront',
    category: 'Gaming & Gadgets',
    url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=300&q=70',
    recommendedTint: 'navy' as const,
    recommendedOpacity: 65,
  },
  {
    id: 'clean-workspace',
    name: 'Modern Clean Workspace',
    category: 'Work & Lifestyle',
    url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=300&q=70',
    recommendedTint: 'emerald' as const,
    recommendedOpacity: 70,
  },
];

// Curated logo presets
export const LOGO_PRESETS = [
  {
    id: 'gold-bag',
    name: 'Amber Gold Monogram',
    url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=400&q=80',
    thumb: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=120&q=70',
  },
  {
    id: 'tech-sphere',
    name: 'Cyber Geometric Tech',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    thumb: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=70',
  },
  {
    id: 'neon-glow',
    name: 'Electric Neon Emblem',
    url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80',
    thumb: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=120&q=70',
  },
  {
    id: 'luxury-crest',
    name: 'Luxury Royal Crown',
    url: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=400&q=80',
    thumb: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=120&q=70',
  },
];

interface LogoBannerStudioProps {
  onSavedNotification?: () => void;
}

export const LogoBannerStudio: React.FC<LogoBannerStudioProps> = ({ onSavedNotification }) => {
  const { settings, updateSettings, setActiveView } = useStore();

  // Local working settings for live tweaking
  const [localSettings, setLocalSettings] = useState<ShopSettings>({ ...settings });
  const [liveAutoApply, setLiveAutoApply] = useState(true);
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeSubTab, setActiveSubTab] = useState<'logo' | 'banner' | 'text'>('logo');

  // Upload state
  const logoFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [directLogoUrl, setDirectLogoUrl] = useState('');
  const [directBannerUrl, setDirectBannerUrl] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Update a single setting
  const updateField = <K extends keyof ShopSettings>(key: K, value: ShopSettings[K]) => {
    const next = { ...localSettings, [key]: value };
    setLocalSettings(next);
    if (liveAutoApply) {
      updateSettings({ [key]: value });
    }
  };

  // Upload Logo handler
  const handleLogoUpload = async (file: File) => {
    try {
      setIsUploadingLogo(true);
      setLogoError(null);
      const dataUrl = await optimizeImage(file, {
        maxDimension: 512,
        preserveTransparency: true,
        quality: 0.95,
      });
      updateField('logoUrl', dataUrl);
      setSaveSuccessMsg('Logo uploaded successfully! Preview updated.');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (e: any) {
      setLogoError(e?.message || 'Failed to upload logo.');
      setTimeout(() => setLogoError(null), 4000);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Upload Banner handler
  const handleBannerUpload = async (file: File) => {
    try {
      setIsUploadingBanner(true);
      setBannerError(null);
      const dataUrl = await optimizeImage(file, {
        maxDimension: 1600,
        preserveTransparency: false,
        quality: 0.88,
        mimeType: 'image/jpeg',
      });
      updateField('bannerUrl', dataUrl);
      setSaveSuccessMsg('Hero banner uploaded successfully! Preview updated.');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (e: any) {
      setBannerError(e?.message || 'Failed to upload hero banner.');
      setTimeout(() => setBannerError(null), 4000);
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleApplyLogoUrl = () => {
    if (!directLogoUrl.trim()) return;
    updateField('logoUrl', directLogoUrl.trim());
    setDirectLogoUrl('');
    setSaveSuccessMsg('Logo image URL applied!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleApplyBannerUrl = () => {
    if (!directBannerUrl.trim()) return;
    updateField('bannerUrl', directBannerUrl.trim());
    setDirectBannerUrl('');
    setSaveSuccessMsg('Banner image URL applied!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleRemoveLogo = () => {
    updateField('logoUrl', '');
    if (logoFileRef.current) logoFileRef.current.value = '';
    setSaveSuccessMsg('Custom logo cleared. Restored default shop icon.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleRemoveBanner = () => {
    updateField('bannerUrl', '');
    if (bannerFileRef.current) bannerFileRef.current.value = '';
    setSaveSuccessMsg('Custom banner cleared. Restored default ambient gradient.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleSaveAll = () => {
    updateSettings(localSettings);
    setSaveSuccessMsg('✨ Logo & Banner saved and synced across all devices!');
    onSavedNotification?.();
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Preview dimensions & classes
  const bannerOverlayOpacity = typeof localSettings.bannerOverlayOpacity === 'number'
    ? localSettings.bannerOverlayOpacity
    : 65;

  const gradientTint = localSettings.bannerOverlayGradient === 'amber'
    ? 'from-amber-950/90 via-slate-900/85 to-slate-950/95'
    : localSettings.bannerOverlayGradient === 'navy'
    ? 'from-slate-950/95 via-sky-950/90 to-slate-900/90'
    : localSettings.bannerOverlayGradient === 'emerald'
    ? 'from-emerald-950/90 via-slate-900/90 to-slate-950/95'
    : localSettings.bannerOverlayGradient === 'none'
    ? 'from-slate-950/80 to-slate-950/80'
    : 'from-slate-950/95 via-slate-900/85 to-amber-950/80';

  const isSplitLayout = localSettings.bannerLayout === 'split' && Boolean(localSettings.bannerUrl);

  const previewHeightClass = 
    localSettings.bannerHeight === 'compact' ? 'min-h-[240px] p-5 sm:p-7' :
    localSettings.bannerHeight === 'tall' ? 'min-h-[380px] p-7 sm:p-10' :
    'min-h-[300px] p-6 sm:p-8';

  return (
    <div className="space-y-6">
      {/* Top Banner Alert / Success Toast */}
      {saveSuccessMsg && (
        <div className="bg-emerald-500 text-slate-950 font-black text-xs px-4 py-3 rounded-2xl flex items-center justify-between shadow-md shadow-emerald-500/20 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-slate-950" />
            <span>{saveSuccessMsg}</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-950/15 px-2 py-0.5 rounded">
            Live Synchronized
          </span>
        </div>
      )}

      {/* HEADER CARD */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Logo &amp; Banner Studio</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200">
                    Real-Time Live Preview
                  </span>
                </h1>
                <p className="text-xs text-slate-500">
                  Upload your brand logo and hero banner with instant live responsive preview and multi-device cloud synchronization.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Live Auto-Apply Toggle */}
            <button
              onClick={() => setLiveAutoApply(!liveAutoApply)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all cursor-pointer ${
                liveAutoApply
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
              title="When enabled, tweaks apply immediately to the website in real-time"
            >
              <div className={`w-2 h-2 rounded-full ${liveAutoApply ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>{liveAutoApply ? 'Live Auto-Apply: ON' : 'Live Auto-Apply: OFF'}</span>
            </button>

            <button
              onClick={handleSaveAll}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-95 ml-auto sm:ml-0"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Save &amp; Push to All Devices</span>
            </button>
          </div>
        </div>
      </div>

      {/* REAL-TIME LIVE PREVIEW SCREEN */}
      <div className="bg-slate-950 text-white rounded-3xl border border-slate-800 p-4 sm:p-6 shadow-2xl relative overflow-hidden">
        {/* Viewport Control Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-300 tracking-tight">Real-Time Interactive Storefront Preview</span>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {previewViewport === 'desktop' ? '100% Desktop View' : previewViewport === 'tablet' ? '768px Tablet View' : '390px Mobile View'}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setPreviewViewport('desktop')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                previewViewport === 'desktop'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>

            <button
              onClick={() => setPreviewViewport('tablet')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                previewViewport === 'tablet'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>Tablet</span>
            </button>

            <button
              onClick={() => setPreviewViewport('mobile')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                previewViewport === 'mobile'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile</span>
            </button>
          </div>
        </div>

        {/* Viewport Frame Container */}
        <div className="flex justify-center w-full overflow-hidden transition-all duration-300">
          <div 
            className={`w-full transition-all duration-300 ${
              previewViewport === 'mobile' ? 'max-w-[400px] border-x border-slate-800 px-2 py-1 bg-slate-900/60 rounded-3xl' :
              previewViewport === 'tablet' ? 'max-w-[768px] border-x border-slate-800 px-3 py-1 bg-slate-900/40 rounded-3xl' :
              'max-w-full'
            }`}
          >
            {/* 1. PREVIEW: Top Announcement Bar */}
            <div className="bg-slate-900 text-slate-300 text-[11px] py-1.5 px-3 rounded-t-2xl flex items-center justify-between border-b border-slate-800 mb-2">
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                <span className="truncate">{localSettings.topBarAnnouncement || `Welcome to ${localSettings.shopName}`}</span>
              </div>
              <span className="text-amber-400 font-bold shrink-0 ml-2">
                Tel: {localSettings.phone}
              </span>
            </div>

            {/* 2. PREVIEW: Navigation Header Bar with Live Logo */}
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 mb-3 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                {/* Live Logo */}
                {localSettings.logoUrl ? (
                  <div
                    className={`flex items-center justify-center overflow-hidden shrink-0 transition-all ${
                      localSettings.logoShape === 'circle' ? 'rounded-full' :
                      localSettings.logoShape === 'squircle' ? 'rounded-2xl' :
                      localSettings.logoShape === 'square' || localSettings.logoShape === 'none' ? 'rounded-none' : 'rounded-xl'
                    } ${
                      localSettings.logoBg === 'transparent' ? 'bg-transparent' :
                      localSettings.logoBg === 'light' ? 'bg-white p-1 border border-slate-700 shadow-xs' :
                      localSettings.logoBg === 'dark' ? 'bg-slate-950 p-1 border border-slate-700 shadow-xs' :
                      localSettings.logoBg === 'amber' ? 'bg-amber-500 p-1 shadow-md shadow-amber-500/20' :
                      'bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 p-1 shadow-md shadow-amber-500/20'
                    } ${
                      localSettings.logoSize === 'sm' ? 'w-8 h-8' :
                      localSettings.logoSize === 'lg' ? 'w-12 h-12' :
                      localSettings.logoSize === 'xl' ? 'w-14 h-14' :
                      'w-10 h-10'
                    }`}
                  >
                    <img
                      src={localSettings.logoUrl}
                      alt="Brand Logo"
                      className={`w-full h-full ${localSettings.logoFit === 'cover' ? 'object-cover' : 'object-contain'}`}
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 shrink-0">
                    <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
                  </div>
                )}

                {/* Brand Name */}
                {localSettings.showShopNameWithLogo !== false && (
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-sm sm:text-base text-white tracking-tight leading-none">
                        {localSettings.shopName}
                      </span>
                      <span className="text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded">
                        Official
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {localSettings.phone} • {localSettings.city || 'Phnom Penh'}
                    </p>
                  </div>
                )}
              </div>

              {/* Mock Nav Elements */}
              <div className="flex items-center gap-2 text-xs">
                <span className="hidden sm:inline-block text-slate-400 font-semibold hover:text-white">Shop</span>
                <span className="hidden sm:inline-block text-slate-400 font-semibold hover:text-white">POS</span>
                <div className="bg-amber-500 text-slate-950 font-black px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1">
                  <ShoppingBag className="w-3 h-3" />
                  <span>Cart (0)</span>
                </div>
              </div>
            </div>

            {/* 3. PREVIEW: Live Hero Banner */}
            <div
              className={`relative overflow-hidden text-white rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between ${previewHeightClass} ${
                !localSettings.bannerUrl ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950' : 'bg-slate-950'
              }`}
            >
              {/* Background Image (when not in split mode) */}
              {localSettings.bannerUrl && !isSplitLayout && (
                <div
                  className="absolute inset-0 bg-cover bg-no-repeat pointer-events-none transition-all duration-300"
                  style={{
                    backgroundImage: `url(${localSettings.bannerUrl})`,
                    backgroundPosition: localSettings.bannerPosition || 'center',
                    filter: localSettings.bannerBlur ? `blur(${localSettings.bannerBlur}px)` : undefined,
                  }}
                />
              )}

              {/* Dynamic Overlay Filter */}
              {localSettings.bannerUrl && !isSplitLayout && (
                <div
                  className={`absolute inset-0 bg-gradient-to-r ${gradientTint} pointer-events-none transition-all duration-300`}
                  style={{ opacity: bannerOverlayOpacity / 100 }}
                />
              )}

              {/* Decorative Glow */}
              <div className="absolute -right-10 -top-10 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Banner Content Layout */}
              <div className={`relative z-10 ${isSplitLayout ? 'grid grid-cols-1 sm:grid-cols-12 gap-6 items-center w-full' : 'max-w-xl'}`}>
                <div className={isSplitLayout ? 'sm:col-span-7' : ''}>
                  <div className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 px-2.5 py-0.5 rounded-full text-[10px] font-semibold mb-2 backdrop-blur-xs">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>{localSettings.heroBadge || `Official ${localSettings.shopName} Portal`}</span>
                  </div>

                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight mb-2 drop-shadow-xs">
                    {localSettings.heroTitle || 'Quality Goods, Verified Gateway & Direct Hotline.'}
                  </h2>

                  <p className="text-slate-200 text-xs sm:text-sm leading-relaxed mb-4 line-clamp-2 drop-shadow-xs">
                    {localSettings.heroSubtitle || 'Discover verified smartphones, audio gear, commuter essentials, and lifestyle products.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm">
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>{localSettings.heroCallButtonText || 'Call Order'}: {localSettings.phone}</span>
                    </div>

                    <div className="bg-white/10 text-white font-semibold px-3 py-2 rounded-xl text-xs border border-white/10 flex items-center gap-1 backdrop-blur-xs">
                      <span>{localSettings.heroSecondaryButtonText || 'Inventory'}</span>
                      <ArrowRight className="w-3 h-3 text-amber-400" />
                    </div>
                  </div>
                </div>

                {/* Split Mode Image Card */}
                {isSplitLayout && (
                  <div className="sm:col-span-5 flex justify-center">
                    <div className="w-full aspect-video rounded-xl overflow-hidden border border-slate-700/80 shadow-lg relative group">
                      <img
                        src={localSettings.bannerUrl}
                        alt="Banner Preview"
                        className="w-full h-full object-cover"
                        style={{
                          objectPosition: localSettings.bannerPosition || 'center',
                          filter: localSettings.bannerBlur ? `blur(${localSettings.bannerBlur}px)` : undefined,
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2 text-[10px] font-semibold text-white/90 truncate bg-slate-950/70 px-2 py-1 rounded">
                        {localSettings.heroBadge || localSettings.shopName}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Feature Bar */}
              <div className="relative z-10 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[10px] text-slate-300 gap-2 mt-4">
                <span>✓ 100% Genuine Guaranteed</span>
                <span>✓ Free Ship over ${localSettings.freeShippingThreshold}</span>
                <span>✓ Delivery: {localSettings.city || 'Phnom Penh'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLS AREA: TABS TO ADJUST LOGO VS BANNER VS TEXT */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Sub-Tabs Selector */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
          <button
            onClick={() => setActiveSubTab('logo')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'logo'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-amber-500" />
            <span>1. Website Logo Controls</span>
          </button>

          <button
            onClick={() => setActiveSubTab('banner')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'banner'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-500" />
            <span>2. Hero Banner Controls</span>
          </button>

          <button
            onClick={() => setActiveSubTab('text')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'text'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4 text-amber-500" />
            <span>3. Headlines &amp; Copy</span>
          </button>
        </div>

        {/* ================= SECTION 1: LOGO CONTROLS ================= */}
        {activeSubTab === 'logo' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-amber-500" />
                <span>Logo Upload &amp; Styling Adjustments</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload your brand emblem or select from curated presets. Adjust size, shape, background, and fit.
              </p>
            </div>

            {logoError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
                {logoError}
              </div>
            )}

            {/* Logo Upload Box & Current Preview */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Dropzone & File Input (7 cols) */}
              <div className="md:col-span-7 space-y-4">
                <div 
                  onClick={() => logoFileRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-amber-500 bg-slate-50/70 hover:bg-amber-50/20 rounded-2xl p-6 text-center transition-all cursor-pointer group"
                >
                  <input
                    ref={logoFileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(file);
                    }}
                  />
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    {isUploadingLogo ? 'Processing & Optimizing...' : 'Click to Upload Logo Image'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Supports PNG (with transparency), SVG vector, WebP, or JPG
                  </p>
                </div>

                {/* Direct Image URL input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Or paste Logo Image URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={directLogoUrl}
                      onChange={(e) => setDirectLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                    <button
                      type="button"
                      onClick={handleApplyLogoUrl}
                      disabled={!directLogoUrl.trim()}
                      className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {/* Curated Logo Presets */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">Curated Logo Presets</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {LOGO_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => updateField('logoUrl', p.url)}
                        className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          localSettings.logoUrl === p.url
                            ? 'bg-amber-50 border-amber-400 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                          <img src={p.thumb} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Current Logo Status & Quick Clear (5 cols) */}
              <div className="md:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <span className="text-xs font-bold text-slate-700 block">Current Logo State</span>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 p-2 flex items-center justify-center overflow-hidden shadow-xs">
                    {localSettings.logoUrl ? (
                      <img
                        src={localSettings.logoUrl}
                        alt="Current Logo"
                        className={`w-full h-full ${localSettings.logoFit === 'cover' ? 'object-cover' : 'object-contain'}`}
                      />
                    ) : (
                      <ShoppingBag className="w-10 h-10 text-amber-500" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-extrabold text-slate-900">
                      {localSettings.logoUrl ? 'Custom Logo Active' : 'Default Emblem Active'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Shape: <strong>{localSettings.logoShape || 'rounded'}</strong>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Size: <strong>{localSettings.logoSize || 'md'}</strong>
                    </p>
                    {localSettings.logoUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 mt-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove &amp; Use Default</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Adjustments: Shape, Size, Background, Fit, Brand Text */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
              {/* Logo Shape */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Logo Shape</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['rounded', 'circle', 'squircle', 'square'] as const).map((shape) => (
                    <button
                      key={shape}
                      type="button"
                      onClick={() => updateField('logoShape', shape)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-all cursor-pointer ${
                        (localSettings.logoShape || 'rounded') === shape
                          ? 'bg-amber-500 text-slate-950 border-amber-600 font-black'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {shape}
                    </button>
                  ))}
                </div>
              </div>

              {/* Logo Size */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Logo Size</label>
                <div className="grid grid-cols-4 gap-1">
                  {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => updateField('logoSize', size)}
                      className={`py-1.5 rounded-lg text-xs font-semibold uppercase border transition-all cursor-pointer ${
                        (localSettings.logoSize || 'md') === size
                          ? 'bg-amber-500 text-slate-950 border-amber-600 font-black'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Container Background */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Container Background</label>
                <select
                  value={localSettings.logoBg || 'gradient'}
                  onChange={(e) => updateField('logoBg', e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="gradient">Amber Gold Gradient</option>
                  <option value="amber">Solid Amber</option>
                  <option value="light">Clean White Box</option>
                  <option value="dark">Dark Slate Box</option>
                  <option value="transparent">Transparent</option>
                </select>
              </div>

              {/* Image Fit & Text Toggle */}
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Image Fit</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateField('logoFit', 'contain')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        (localSettings.logoFit || 'contain') === 'contain'
                          ? 'bg-amber-500 text-slate-950 border-amber-600 font-black'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      Contain
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('logoFit', 'cover')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        localSettings.logoFit === 'cover'
                          ? 'bg-amber-500 text-slate-950 border-amber-600 font-black'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      Cover
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={localSettings.showShopNameWithLogo !== false}
                    onChange={(e) => updateField('showShopNameWithLogo', e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-xs text-slate-700 font-medium">Show name next to logo</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION 2: BANNER CONTROLS ================= */}
        {activeSubTab === 'banner' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-500" />
                <span>Hero Banner Upload &amp; Styling Adjustments</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload your main promotional banner image or choose high-res presets. Adjust height, overlay darkness, tint, and layout.
              </p>
            </div>

            {bannerError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
                {bannerError}
              </div>
            )}

            {/* Banner Upload Box */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-7 space-y-4">
                <div 
                  onClick={() => bannerFileRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-amber-500 bg-slate-50/70 hover:bg-amber-50/20 rounded-2xl p-6 text-center transition-all cursor-pointer group"
                >
                  <input
                    ref={bannerFileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleBannerUpload(file);
                    }}
                  />
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    {isUploadingBanner ? 'Optimizing High-Res Banner...' : 'Click to Upload Custom Hero Banner'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Recommended 1600x600px or larger. Auto-compressed for maximum speed.
                  </p>
                </div>

                {/* Direct Banner URL */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Or paste Banner Image URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={directBannerUrl}
                      onChange={(e) => setDirectBannerUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                    <button
                      type="button"
                      onClick={handleApplyBannerUrl}
                      disabled={!directBannerUrl.trim()}
                      className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>

              {/* Current Banner Status */}
              <div className="md:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <span className="text-xs font-bold text-slate-700 block">Current Banner State</span>
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200 relative">
                  {localSettings.bannerUrl ? (
                    <img
                      src={localSettings.bannerUrl}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                      style={{ objectPosition: localSettings.bannerPosition || 'center' }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 flex items-center justify-center text-amber-400 text-xs font-bold">
                      Default Ambient Gradient Active
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500">
                    Layout: <strong>{localSettings.bannerLayout || 'overlay'}</strong>
                  </span>
                  {localSettings.bannerUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveBanner}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear Banner</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Curated Banner Presets */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-slate-700">Curated High-Res Banner Presets</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {BANNER_PRESETS.map((bp) => (
                  <div
                    key={bp.id}
                    onClick={() => {
                      updateField('bannerUrl', bp.url);
                      updateField('bannerOverlayGradient', bp.recommendedTint);
                      updateField('bannerOverlayOpacity', bp.recommendedOpacity);
                    }}
                    className={`rounded-2xl border p-2 cursor-pointer transition-all ${
                      localSettings.bannerUrl === bp.url
                        ? 'bg-amber-50 border-amber-500 shadow-sm ring-2 ring-amber-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="aspect-video rounded-lg overflow-hidden bg-slate-100 mb-1.5">
                      <img src={bp.thumb} alt={bp.name} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-[10px] font-extrabold text-slate-800 truncate">{bp.name}</p>
                    <span className="text-[9px] text-slate-400 block">{bp.category}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Adjustments: Layout, Height, Overlay Darkness, Tint, Position, Blur */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
              {/* Layout Mode */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Banner Layout Mode</label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => updateField('bannerLayout', 'overlay')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      (localSettings.bannerLayout || 'overlay') === 'overlay'
                        ? 'bg-amber-500 text-slate-950 border-amber-600'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Full Overlay
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('bannerLayout', 'split')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      localSettings.bannerLayout === 'split'
                        ? 'bg-amber-500 text-slate-950 border-amber-600'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Split Card
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('bannerLayout', 'minimal')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      localSettings.bannerLayout === 'minimal'
                        ? 'bg-amber-500 text-slate-950 border-amber-600'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Minimal
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  {localSettings.bannerLayout === 'split'
                    ? 'Showcases picture on right side with headline on left'
                    : 'Spans full width with contrast-protected headline'}
                </p>
              </div>

              {/* Banner Height */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Banner Height</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['compact', 'standard', 'tall'] as const).map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => updateField('bannerHeight', h)}
                      className={`py-2 rounded-xl text-xs font-bold capitalize border transition-all cursor-pointer ${
                        (localSettings.bannerHeight || 'standard') === h
                          ? 'bg-amber-500 text-slate-950 border-amber-600'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              {/* Overlay Tint */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Overlay Color Tint</label>
                <select
                  value={localSettings.bannerOverlayGradient || 'dark'}
                  onChange={(e) => updateField('bannerOverlayGradient', e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="dark">Deep Charcoal Dark</option>
                  <option value="amber">Warm Golden Amber</option>
                  <option value="navy">Midnight Navy Blue</option>
                  <option value="emerald">Forest Emerald</option>
                  <option value="none">Neutral Dark Solid</option>
                </select>
              </div>

              {/* Overlay Darkness Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Overlay Darkness</span>
                  <span className="text-amber-600 font-mono">{bannerOverlayOpacity}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={90}
                  step={5}
                  value={bannerOverlayOpacity}
                  onChange={(e) => updateField('bannerOverlayOpacity', Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">
                  Higher darkness guarantees white typography stays 100% readable.
                </p>
              </div>

              {/* Focal Position */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Focal Alignment</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['top', 'center', 'bottom'] as const).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => updateField('bannerPosition', pos)}
                      className={`py-2 rounded-xl text-xs font-bold capitalize border transition-all cursor-pointer ${
                        (localSettings.bannerPosition || 'center') === pos
                          ? 'bg-amber-500 text-slate-950 border-amber-600'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              {/* Soft Blur Filter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Background Soft Blur</span>
                  <span className="text-amber-600 font-mono">{localSettings.bannerBlur || 0}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={8}
                  step={1}
                  value={localSettings.bannerBlur || 0}
                  onChange={(e) => updateField('bannerBlur', Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">
                  Softens detailed photos so text pops with premium studio depth.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION 3: HEADLINES & COPY ================= */}
        {activeSubTab === 'text' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-500" />
                <span>Storefront Headlines &amp; Call to Action</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tweak the headline and button labels shown on top of the hero banner.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Top Announcement Bar</label>
                <input
                  type="text"
                  value={localSettings.topBarAnnouncement || ''}
                  onChange={(e) => updateField('topBarAnnouncement', e.target.value)}
                  placeholder="Welcome notice..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Hero Pill Badge</label>
                <input
                  type="text"
                  value={localSettings.heroBadge || ''}
                  onChange={(e) => updateField('heroBadge', e.target.value)}
                  placeholder="Official Shop Portal..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Main Hero Headline</label>
              <input
                type="text"
                value={localSettings.heroTitle || ''}
                onChange={(e) => updateField('heroTitle', e.target.value)}
                placeholder="Quality Goods, Verified Gateway..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Hero Subtitle</label>
              <textarea
                rows={2}
                value={localSettings.heroSubtitle || ''}
                onChange={(e) => updateField('heroSubtitle', e.target.value)}
                placeholder="Discover verified products..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Hotline Button Text</label>
                <input
                  type="text"
                  value={localSettings.heroCallButtonText || 'Call Order'}
                  onChange={(e) => updateField('heroCallButtonText', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Secondary Button Text</label>
                <input
                  type="text"
                  value={localSettings.heroSecondaryButtonText || 'Inventory Management'}
                  onChange={(e) => updateField('heroSecondaryButtonText', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM ACTION BAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Changes reflect immediately in the live preview and on your storefront.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setLocalSettings({ ...settings });
                setSaveSuccessMsg('Reverted preview to last saved settings.');
                setTimeout(() => setSaveSuccessMsg(null), 3000);
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer w-full sm:w-auto text-center"
            >
              Reset to Saved
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer w-full sm:w-auto"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Save &amp; Broadcast Live</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
