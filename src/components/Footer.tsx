import React from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Phone, 
  Send, 
  MapPin, 
  Mail, 
  Clock, 
  ShieldCheck, 
  CreditCard, 
  ShoppingBag,
  ArrowUp
} from 'lucide-react';

export const Footer: React.FC = () => {
  const { settings, setActiveView } = useStore();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 pt-12 pb-8 mt-16 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand & Hotline */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              {settings.logoUrl ? (
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 p-1 border border-slate-700 flex items-center justify-center shrink-0">
                  <img src={settings.logoUrl} alt={settings.shopName} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              )}
              <span className="font-extrabold text-xl text-white tracking-tight">
                {settings.shopName}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {settings.footerAboutText || 'Your trusted online shop in Cambodia for smartphones, smart wearables, lifestyle gadgets, and authentic accessories with instant delivery.'}
            </p>

            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/80">
              <p className="text-[11px] uppercase font-bold text-amber-400 tracking-wider mb-1">
                Direct Hotline &amp; Orders:
              </p>
              <a
                href={`tel:${settings.phone.replace(/\s+/g, '')}`}
                className="text-lg font-black text-white hover:text-amber-400 transition-colors flex items-center gap-2"
              >
                <Phone className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>{settings.phone}</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-white uppercase tracking-wider">Quick Access</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button 
                  onClick={() => { setActiveView('shop'); scrollToTop(); }}
                  className="hover:text-amber-400 transition-colors"
                >
                  Store Catalog &amp; Deals
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { setActiveView('inventory'); scrollToTop(); }}
                  className="hover:text-amber-400 transition-colors"
                >
                  Product Inventory Management
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { setActiveView('orders'); scrollToTop(); }}
                  className="hover:text-amber-400 transition-colors"
                >
                  Track Customer Orders
                </button>
              </li>
              <li>
                <a 
                  href={`https://t.me/${settings.telegramUsername}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="hover:text-amber-400 transition-colors flex items-center gap-1"
                >
                  <Send className="w-3 h-3 text-sky-400" />
                  <span>Telegram: @{settings.telegramUsername}</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Contact & Hours */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-white uppercase tracking-wider">Store Info</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>{settings.address}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Tel: <strong>{settings.phone}</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{settings.email}</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{settings.workingHours || '8:00 AM – 9:00 PM (Monday – Sunday)'}</span>
              </li>
            </ul>
          </div>

          {/* Security & Gateways */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-white uppercase tracking-wider">Payment &amp; Security</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {settings.warrantyText || 'Equipped with end-to-end 256-bit SSL encryption and verified national KHQR & Card payment gateways.'}
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              <span className="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-300">
                Bakong KHQR
              </span>
              <span className="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-300">
                Visa / MasterCard
              </span>
              <span className="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-300">
                ABA Pay
              </span>
              <span className="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-300">
                Cash On Delivery
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-emerald-400 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>PCI-DSS Level 1 Compliant</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {settings.shopName}. {settings.copyrightText || 'All rights reserved.'} Hotline: {settings.phone}</p>
          
          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
          >
            <span>Back to top</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
