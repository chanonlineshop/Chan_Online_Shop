import React from 'react';
import { 
  PhoneCall, 
  ShieldCheck, 
  Truck, 
  CreditCard, 
  BadgePercent,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const HeroBanner: React.FC = () => {
  const { settings, setActiveView } = useStore();

  const bannerHeightClass = 
    settings.bannerHeight === 'compact' ? 'min-h-[280px] p-6 sm:p-8' :
    settings.bannerHeight === 'tall' ? 'min-h-[460px] p-8 sm:p-14' :
    'min-h-[360px] p-6 sm:p-10';

  const overlayOpacity = typeof settings.bannerOverlayOpacity === 'number' 
    ? settings.bannerOverlayOpacity / 100 
    : 0.65;

  const gradientTint = settings.bannerOverlayGradient === 'amber'
    ? 'from-amber-950/90 via-slate-900/85 to-slate-950/95'
    : settings.bannerOverlayGradient === 'navy'
    ? 'from-slate-950/95 via-sky-950/90 to-slate-900/90'
    : settings.bannerOverlayGradient === 'emerald'
    ? 'from-emerald-950/90 via-slate-900/90 to-slate-950/95'
    : settings.bannerOverlayGradient === 'none'
    ? 'from-slate-950/80 to-slate-950/80'
    : 'from-slate-950/95 via-slate-900/85 to-amber-950/80';

  const isSplitLayout = settings.bannerLayout === 'split' && Boolean(settings.bannerUrl);

  return (
    <div 
      className={`relative overflow-hidden text-white rounded-3xl mb-8 border border-slate-700/60 shadow-xl flex flex-col justify-between ${bannerHeightClass} ${
        !settings.bannerUrl ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950' : 'bg-slate-950'
      }`}
    >
      {/* Background Banner Image (if provided and not split) */}
      {settings.bannerUrl && !isSplitLayout && (
        <div 
          className="absolute inset-0 bg-cover bg-no-repeat transition-all duration-300 pointer-events-none"
          style={{
            backgroundImage: `url(${settings.bannerUrl})`,
            backgroundPosition: settings.bannerPosition || 'center',
            filter: settings.bannerBlur ? `blur(${settings.bannerBlur}px)` : undefined,
          }}
        />
      )}

      {/* Dynamic Overlay / Gradient Filter */}
      {settings.bannerUrl && !isSplitLayout && (
        <div 
          className={`absolute inset-0 bg-gradient-to-r ${gradientTint} pointer-events-none`}
          style={{ opacity: overlayOpacity }}
        />
      )}

      {/* Background visual accents */}
      <div className="absolute -right-20 -top-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute right-1/3 -bottom-20 w-64 h-64 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none"></div>

      {/* Content Area */}
      <div className={`relative z-10 ${isSplitLayout ? 'grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full' : 'max-w-3xl'}`}>
        <div className={isSplitLayout ? 'lg:col-span-7' : ''}>
          <div className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 text-amber-300 px-3 py-1 rounded-full text-xs font-semibold mb-4 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{settings.heroBadge || `Official ${settings.shopName} Portal`}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight mb-4 drop-shadow-xs">
            {settings.heroTitle || 'Quality Goods, Verified Gateway & Direct Hotline.'}
          </h1>

          <p className="text-slate-200 text-sm sm:text-base leading-relaxed mb-6 max-w-2xl drop-shadow-xs">
            {settings.heroSubtitle || 'Discover verified smartphones, audio gear, commuter essentials, and lifestyle products. Enjoy real-time inventory tracking, secure 256-bit payment checkout, and fast customer service.'}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <a
              href={`tel:${settings.phone.replace(/\s+/g, '')}`}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-5 py-3 rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
            >
              <PhoneCall className="w-4 h-4 text-slate-950" />
              <span>{settings.heroCallButtonText || 'Call Order'}: {settings.phone}</span>
            </a>

            <button
              onClick={() => setActiveView('inventory')}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-3 rounded-xl text-sm border border-white/15 transition-all active:scale-95 backdrop-blur-xs cursor-pointer"
            >
              <span>{settings.heroSecondaryButtonText || 'Inventory Management'}</span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        </div>

        {/* Split Layout: Banner Image Showcase */}
        {isSplitLayout && (
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-md aspect-video sm:aspect-4/3 rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl relative group">
              <img 
                src={settings.bannerUrl} 
                alt="Website promotional banner"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                style={{
                  objectPosition: settings.bannerPosition || 'center',
                  filter: settings.bannerBlur ? `blur(${settings.bannerBlur}px)` : undefined,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 right-3 text-xs font-semibold text-white/90 truncate bg-slate-950/60 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/10">
                {settings.heroBadge || settings.shopName}
              </div>
            </div>
          </div>
        )}

        {/* Feature Badges */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-slate-700/60 ${isSplitLayout ? 'lg:col-span-12' : 'w-full'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">100% Genuine</p>
              <p className="text-[11px] text-slate-400">Verified products</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">Secure Gateway</p>
              <p className="text-[11px] text-slate-400">Card &amp; KHQR Pay</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">Fast Delivery</p>
              <p className="text-[11px] text-slate-400">{settings.city || 'Phnom Penh & Prov'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <BadgePercent className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">Free Ship ${settings.freeShippingThreshold}+</p>
              <p className="text-[11px] text-slate-400">Automatic savings</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
