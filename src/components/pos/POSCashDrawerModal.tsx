import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  CheckCircle, 
  Coins, 
  Sparkles, 
  ArrowRight, 
  Wallet,
  RotateCcw
} from 'lucide-react';
import { posSound } from '../../utils/posSounds';

interface POSCashDrawerModalProps {
  grandTotalUSD: number;
  onPaymentSuccess: (details: {
    tenderCurrency: 'USD' | 'KHR';
    amountTenderedUSD: number;
    amountTenderedKHR: number;
    changeGivenUSD: number;
    changeGivenKHR: number;
  }) => void;
  onCancel: () => void;
}

export const POSCashDrawerModal: React.FC<POSCashDrawerModalProps> = ({
  grandTotalUSD,
  onPaymentSuccess,
  onCancel,
}) => {
  const exchangeRate = 4100;
  const grandTotalKHR = Math.round(grandTotalUSD * exchangeRate);

  const [tenderCurrency, setTenderCurrency] = useState<'USD' | 'KHR'>('USD');
  const [tenderedInput, setTenderedInput] = useState<string>(grandTotalUSD.toFixed(2));
  const [drawerPopped, setDrawerPopped] = useState(false);

  // Derived values
  const numericTendered = parseFloat(tenderedInput) || 0;

  // Change calculations
  const { changeUSD, changeKHR, isSufficient } = useMemo(() => {
    if (tenderCurrency === 'USD') {
      const diff = numericTendered - grandTotalUSD;
      const chgUSD = Math.max(0, diff);
      const chgKHR = Math.round(chgUSD * exchangeRate);
      return {
        changeUSD: chgUSD,
        changeKHR: chgKHR,
        isSufficient: numericTendered >= grandTotalUSD - 0.001,
      };
    } else {
      const tenderedInUSD = numericTendered / exchangeRate;
      const diffUSD = tenderedInUSD - grandTotalUSD;
      const chgUSD = Math.max(0, diffUSD);
      const chgKHR = Math.max(0, numericTendered - grandTotalKHR);
      return {
        changeUSD: chgUSD,
        changeKHR: chgKHR,
        isSufficient: numericTendered >= grandTotalKHR,
      };
    }
  }, [tenderCurrency, numericTendered, grandTotalUSD, grandTotalKHR, exchangeRate]);

  // Handle bill click
  const handleSelectDenomination = (val: number, isExact: boolean = false) => {
    if (isExact) {
      setTenderedInput(tenderCurrency === 'USD' ? grandTotalUSD.toFixed(2) : grandTotalKHR.toString());
    } else {
      setTenderedInput(val.toString());
    }
  };

  // Add bill to current total
  const handleAddBill = (val: number) => {
    const current = parseFloat(tenderedInput) || 0;
    setTenderedInput((current + val).toString());
  };

  // Trigger cash drawer sound and finalize
  const handleCompleteCashSale = () => {
    if (!isSufficient) return;

    setDrawerPopped(true);
    posSound.playCashDrawer();

    setTimeout(() => {
      posSound.playSuccessChime();
      const tenderedUSD = tenderCurrency === 'USD' ? numericTendered : (numericTendered / exchangeRate);
      const tenderedKHR = tenderCurrency === 'KHR' ? numericTendered : Math.round(numericTendered * exchangeRate);

      onPaymentSuccess({
        tenderCurrency,
        amountTenderedUSD: tenderedUSD,
        amountTenderedKHR: tenderedKHR,
        changeGivenUSD: changeUSD,
        changeGivenKHR: changeKHR,
      });
    }, 700);
  };

  return (
    <div className="space-y-4">
      {/* Currency Switcher & Due Banner */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
            Total Due
          </span>
          <div className="text-2xl font-black text-white">
            ${grandTotalUSD.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400">
            ≈ {grandTotalKHR.toLocaleString()} KHR (1$ = 4,100៛)
          </p>
        </div>

        {/* Currency Switch Buttons */}
        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => {
              setTenderCurrency('USD');
              setTenderedInput(grandTotalUSD.toFixed(2));
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              tenderCurrency === 'USD'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            USD ($)
          </button>
          <button
            type="button"
            onClick={() => {
              setTenderCurrency('KHR');
              setTenderedInput(grandTotalKHR.toString());
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              tenderCurrency === 'KHR'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            KHR (៛)
          </button>
        </div>
      </div>

      {/* Tendered Input Field */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
        <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
          <span>Customer Tendered ({tenderCurrency})</span>
          <span className="text-[10px] text-slate-500">Enter cash handed by customer</span>
        </label>

        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-extrabold text-slate-400">
            {tenderCurrency === 'USD' ? '$' : '៛'}
          </span>
          <input
            type="number"
            step={tenderCurrency === 'USD' ? '0.01' : '100'}
            value={tenderedInput}
            onChange={(e) => setTenderedInput(e.target.value)}
            className="w-full text-2xl font-black bg-slate-50 text-slate-950 pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
          />
        </div>

        {/* Quick Denomination Bill Buttons */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5 font-semibold">
            <span>Quick Bill Denominations:</span>
            <button
              type="button"
              onClick={() => handleSelectDenomination(0, true)}
              className="text-amber-700 hover:underline font-bold"
            >
              Exact Cash
            </button>
          </div>

          {tenderCurrency === 'USD' ? (
            <div className="grid grid-cols-6 gap-1.5">
              {[1, 5, 10, 20, 50, 100].map((bill) => (
                <button
                  key={bill}
                  type="button"
                  onClick={() => handleSelectDenomination(bill)}
                  className="bg-slate-100 hover:bg-slate-200 active:bg-amber-100 text-slate-900 font-bold py-2 rounded-lg text-xs transition-colors border border-slate-200"
                >
                  ${bill}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {[4000, 10000, 20000, 50000, 100000, 200000].map((bill) => (
                <button
                  key={bill}
                  type="button"
                  onClick={() => handleSelectDenomination(bill)}
                  className="bg-slate-100 hover:bg-slate-200 active:bg-amber-100 text-slate-900 font-bold py-2 rounded-lg text-[11px] transition-colors border border-slate-200"
                >
                  {bill.toLocaleString()}៛
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Change Due Display */}
      <div className={`p-4 rounded-2xl border transition-all ${
        isSufficient 
          ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
          : 'bg-rose-50 border-rose-200 text-rose-900'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className={`w-5 h-5 ${isSufficient ? 'text-emerald-600' : 'text-rose-500'}`} />
            <div>
              <span className="text-xs uppercase font-bold tracking-wider block">
                {isSufficient ? 'Change Due to Customer' : 'Insufficient Tender'}
              </span>
              <span className="text-[11px] text-slate-600">
                {isSufficient 
                  ? 'Return change in USD bills or KHR Riel' 
                  : `Customer still owes $${Math.abs(numericTendered - grandTotalUSD).toFixed(2)}`}
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className={`text-2xl font-black ${isSufficient ? 'text-emerald-700' : 'text-rose-600'}`}>
              ${changeUSD.toFixed(2)}
            </div>
            <div className="text-xs font-bold text-slate-600">
              ≈ {changeKHR.toLocaleString()} ៛ KHR
            </div>
          </div>
        </div>
      </div>

      {/* Complete Cash Payment Button */}
      <button
        type="button"
        disabled={!isSufficient || drawerPopped}
        onClick={handleCompleteCashSale}
        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-xl text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2"
      >
        <CheckCircle className="w-4 h-4" />
        <span>
          {drawerPopped ? 'Opening Cash Drawer...' : `Accept Cash & Pop Drawer ($${numericTendered.toFixed(2)})`}
        </span>
      </button>
    </div>
  );
};
