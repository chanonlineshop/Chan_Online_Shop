import React, { useState } from 'react';
import { 
  CreditCard, 
  CheckCircle, 
  Wifi, 
  ShieldCheck, 
  RefreshCw, 
  Sparkles, 
  Lock,
  ArrowRight
} from 'lucide-react';
import { posSound } from '../../utils/posSounds';

interface POSCardTerminalModalProps {
  grandTotalUSD: number;
  onPaymentSuccess: (details: {
    cardBrand: string;
    cardLast4: string;
    authCode: string;
    cardEntryMethod: 'TAP' | 'CHIP' | 'SWIPE';
  }) => void;
  onCancel: () => void;
}

export const POSCardTerminalModal: React.FC<POSCardTerminalModalProps> = ({
  grandTotalUSD,
  onPaymentSuccess,
  onCancel,
}) => {
  type EntryMethod = 'TAP' | 'CHIP' | 'SWIPE';
  type TerminalState = 'AWAITING_CARD' | 'READING_CHIP' | 'CONNECTING_ACQUIRER' | 'APPROVED';

  const [entryMethod, setEntryMethod] = useState<EntryMethod>('TAP');
  const [terminalState, setTerminalState] = useState<TerminalState>('AWAITING_CARD');
  
  const [selectedBrand, setSelectedBrand] = useState('Visa');
  const [cardLast4, setCardLast4] = useState('4242');
  const [cardHolder, setCardHolder] = useState('VALUED CUSTOMER');
  const [authCode, setAuthCode] = useState('');

  // Preset quick test cards
  const presetCards = [
    { brand: 'Visa', last4: '4242', holder: 'BOPHA LY', badge: 'Contactless Tap', bg: 'from-blue-600 to-indigo-800' },
    { brand: 'Mastercard', last4: '8812', holder: 'CHAN VIREAK', badge: 'EMV Smart Chip', bg: 'from-amber-600 to-rose-700' },
    { brand: 'UnionPay', last4: '9901', holder: 'KEO KOLVIRAK', badge: 'Dual Interface', bg: 'from-emerald-600 to-teal-800' },
  ];

  const handleTriggerCardTransaction = (
    brand: string = selectedBrand, 
    last4: string = cardLast4, 
    holder: string = cardHolder,
    method: EntryMethod = entryMethod
  ) => {
    setSelectedBrand(brand);
    setCardLast4(last4);
    setCardHolder(holder);
    setEntryMethod(method);

    // Play NFC / Card insert beep
    posSound.playCardTapTone();
    setTerminalState('READING_CHIP');

    // Stage 1: Reading chip
    setTimeout(() => {
      setTerminalState('CONNECTING_ACQUIRER');

      // Stage 2: Gateway response
      setTimeout(() => {
        const generatedAuth = `AUTH-${Math.floor(100000 + Math.random() * 900000)}`;
        setAuthCode(generatedAuth);
        setTerminalState('APPROVED');
        posSound.playSuccessChime();

        // Stage 3: Complete callback
        setTimeout(() => {
          onPaymentSuccess({
            cardBrand: brand,
            cardLast4: last4,
            authCode: generatedAuth,
            cardEntryMethod: method,
          });
        }, 900);
      }, 1100);
    }, 900);
  };

  return (
    <div className="space-y-4">
      {/* Interactive Physical Card Reader Simulation */}
      <div className="bg-slate-950 text-white rounded-3xl p-5 border-4 border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Terminal Brand Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 font-black text-white">
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span className="tracking-wider">PAX A920 PRO TERMINAL</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
              <Wifi className="w-3 h-3 animate-pulse" />
              ONLINE 4G
            </span>
          </div>
        </div>

        {/* Terminal Screen Glass Display */}
        <div className="my-4 bg-slate-900 border-2 border-slate-800 rounded-2xl p-4 text-center relative overflow-hidden">
          {terminalState === 'AWAITING_CARD' && (
            <div className="space-y-2 py-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Total Transaction
              </span>
              <div className="text-3xl font-black text-amber-400">
                ${grandTotalUSD.toFixed(2)}
              </div>
              <p className="text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5 mt-2">
                <Wifi className="w-4 h-4 text-sky-400 rotate-90" />
                <span>Please Tap, Insert, or Swipe Card</span>
              </p>
            </div>
          )}

          {terminalState === 'READING_CHIP' && (
            <div className="space-y-2 py-3 animate-fadeIn">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
              <div className="text-sm font-black text-white">Reading EMV Chip...</div>
              <p className="text-[11px] text-slate-400">Do not remove card from reader</p>
            </div>
          )}

          {terminalState === 'CONNECTING_ACQUIRER' && (
            <div className="space-y-2 py-3 animate-fadeIn">
              <ShieldCheck className="w-8 h-8 text-sky-400 animate-pulse mx-auto" />
              <div className="text-sm font-black text-white">Authorizing with Acquirer...</div>
              <p className="text-[11px] text-slate-400">Canadia / ABA Bank Payment Switch</p>
            </div>
          )}

          {terminalState === 'APPROVED' && (
            <div className="space-y-1 py-2 animate-scaleIn">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
              <div className="text-base font-black text-emerald-400">TRANSACTION APPROVED</div>
              <p className="text-xs font-mono text-slate-300">
                {selectedBrand} •••• {cardLast4}
              </p>
              <p className="text-[10px] font-mono text-amber-300">
                Appr Code: {authCode}
              </p>
            </div>
          )}
        </div>

        {/* Entry Method Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <button
            type="button"
            disabled={terminalState !== 'AWAITING_CARD'}
            onClick={() => setEntryMethod('TAP')}
            className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-all ${
              entryMethod === 'TAP'
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850'
            }`}
          >
            <Wifi className="w-4 h-4 rotate-90" />
            <span>NFC Tap</span>
          </button>

          <button
            type="button"
            disabled={terminalState !== 'AWAITING_CARD'}
            onClick={() => setEntryMethod('CHIP')}
            className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-all ${
              entryMethod === 'CHIP'
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Chip Insert</span>
          </button>

          <button
            type="button"
            disabled={terminalState !== 'AWAITING_CARD'}
            onClick={() => setEntryMethod('SWIPE')}
            className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-all ${
              entryMethod === 'SWIPE'
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Mag Swipe</span>
          </button>
        </div>
      </div>

      {/* Quick Test Cards (Click to tap card on terminal) */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-700 block">
          Select Customer Card to Process:
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {presetCards.map((c) => (
            <button
              key={c.brand}
              type="button"
              disabled={terminalState !== 'AWAITING_CARD'}
              onClick={() => handleTriggerCardTransaction(c.brand, c.last4, c.holder, entryMethod)}
              className={`p-3 rounded-2xl bg-gradient-to-br ${c.bg} text-white text-left shadow-sm hover:scale-[1.02] active:scale-98 transition-all disabled:opacity-50`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-black uppercase tracking-wider">{c.brand}</span>
                <Wifi className="w-3.5 h-3.5 opacity-80 rotate-90" />
              </div>
              <div className="text-xs font-mono font-bold tracking-widest my-1">
                •••• {c.last4}
              </div>
              <div className="text-[10px] text-white/80 uppercase truncate">
                {c.holder}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
