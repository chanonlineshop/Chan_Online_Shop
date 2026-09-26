import React, { useState } from 'react';
import { DeliveryCourier } from '../../types';
import { UserPlus, X, Truck, Phone, Star, Gauge, MapPin, Sparkles, Check } from 'lucide-react';

interface AddCourierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCourierAdded: (
    courierData: Omit<DeliveryCourier, 'id'>,
    startImmediateDelivery: boolean,
    consignment?: {
      customerName: string;
      customerPhone: string;
      destinationAddress: string;
      destinationDistrict: string;
    }
  ) => void;
}

const PRESET_AVATARS = [
  {
    label: 'Rider Dara (Helmet)',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80',
  },
  {
    label: 'Rider Sophea (Pro)',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&h=200&q=80',
  },
  {
    label: 'Rider Kosal (Express)',
    url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=200&h=200&q=80',
  },
  {
    label: 'Rider Bopha (Fast)',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
  },
  {
    label: 'Rider Vireak (Urban)',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&h=200&q=80',
  },
];

const VEHICLE_OPTIONS = [
  'Honda Dream 125 (Motorbike)',
  'Honda Wave 110i (Motorbike)',
  'Honda PCX 160 (Scooter)',
  'Honda Scoopy-i (Scooter)',
  'Bajaj Qute (TukTuk)',
  'Electric Express Scooter',
  'Delivery Mini Van',
];

const DISTRICT_OPTIONS = [
  'BKK1, Chamkarmon',
  'Toul Kork, Phnom Penh',
  'Daun Penh (Riverside)',
  'Sen Sok, Phnom Penh',
  'Chbar Ampov, Phnom Penh',
  'Mean Chey, Phnom Penh',
  'Russey Keo, Phnom Penh',
];

export const AddCourierModal: React.FC<AddCourierModalProps> = ({
  isOpen,
  onClose,
  onCourierAdded,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState(VEHICLE_OPTIONS[0]);
  const [customVehicle, setCustomVehicle] = useState('');
  const [plateNumber, setPlateNumber] = useState(`PP-${Math.floor(1 + Math.random() * 9)}K-${Math.floor(1000 + Math.random() * 9000)}`);
  const [avatar, setAvatar] = useState(PRESET_AVATARS[0].url);
  const [customAvatar, setCustomAvatar] = useState('');
  const [speedKmH, setSpeedKmH] = useState(38);
  const [rating, setRating] = useState(5.0);

  // Immediate dispatch option
  const [startImmediateDelivery, setStartImmediateDelivery] = useState(true);
  const [customerName, setCustomerName] = useState('Sokha Meng');
  const [customerPhone, setCustomerPhone] = useState('012 889 977');
  const [destinationAddress, setDestinationAddress] = useState('House #45, Street 310');
  const [destinationDistrict, setDestinationDistrict] = useState(DISTRICT_OPTIONS[0]);

  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Please enter the delivery driver\'s full name.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Please enter a valid contact phone number.');
      return;
    }

    const finalVehicle = vehicle === 'Other' ? (customVehicle.trim() || 'Motorbike') : vehicle;
    const finalAvatar = customAvatar.trim() || avatar;

    const courierData: Omit<DeliveryCourier, 'id'> = {
      name: name.trim(),
      phone: phone.trim(),
      vehicle: finalVehicle,
      plateNumber: plateNumber.trim().toUpperCase() || 'PP-1K-8821',
      avatar: finalAvatar,
      currentSpeedKmH: Number(speedKmH) || 35,
      rating: Number(rating) || 5.0,
    };

    const consignment = startImmediateDelivery
      ? {
          customerName: customerName.trim() || 'Valued Customer',
          customerPhone: customerPhone.trim() || '012 889 977',
          destinationAddress: destinationAddress.trim() || 'Street 310',
          destinationDistrict: destinationDistrict || 'Phnom Penh',
        }
      : undefined;

    onCourierAdded(courierData, startImmediateDelivery, consignment);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        id="add-delivery-guy-modal"
        className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900">Add New Delivery Guy</h3>
              <p className="text-xs text-slate-500">Register courier driver to fleet and enable radar GPS tracking</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {formError && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Driver Avatar Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Select Driver Avatar / Photo</label>
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
              {PRESET_AVATARS.map((p, idx) => {
                const isSelected = avatar === p.url && !customAvatar;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAvatar(p.url);
                      setCustomAvatar('');
                    }}
                    className={`relative rounded-2xl overflow-hidden shrink-0 transition-all ${
                      isSelected
                        ? 'ring-3 ring-amber-500 shadow-md scale-105'
                        : 'opacity-70 hover:opacity-100 border border-slate-200'
                    }`}
                  >
                    <img src={p.url} alt={p.label} className="w-12 h-12 object-cover" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-amber-500/30 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Kosal Heng (Express)"
                required
                className="w-full bg-slate-50 text-xs text-slate-900 px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g., 096 887 234"
                  required
                  className="w-full bg-slate-50 text-xs text-slate-900 pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Vehicle & Plate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Vehicle</label>
              <select
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                className="w-full bg-slate-50 text-xs text-slate-900 px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-amber-500"
              >
                {VEHICLE_OPTIONS.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
                <option value="Other">Other Custom Vehicle...</option>
              </select>
              {vehicle === 'Other' && (
                <input
                  type="text"
                  value={customVehicle}
                  onChange={(e) => setCustomVehicle(e.target.value)}
                  placeholder="Enter vehicle model"
                  className="mt-2 w-full bg-slate-50 text-xs text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-amber-500"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">License Plate Number</label>
              <input
                type="text"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                placeholder="e.g., PP-1K-4492"
                className="w-full bg-slate-50 text-xs text-slate-900 uppercase font-mono px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-amber-500"
              />
            </div>
          </div>

          {/* Speed & Initial Rating */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                <span className="flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-amber-500" />
                  Speed: {speedKmH} km/h
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="65"
                value={speedKmH}
                onChange={(e) => setSpeedKmH(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  Rating: {rating.toFixed(1)} ★
                </span>
              </div>
              <input
                type="range"
                min="4.0"
                max="5.0"
                step="0.1"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Option: Launch Immediate Delivery & Track in Radar */}
          <div className="p-4 bg-amber-500/10 border border-amber-400/40 rounded-2xl space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={startImmediateDelivery}
                onChange={(e) => setStartImmediateDelivery(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-amber-500 cursor-pointer"
              />
              <div>
                <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Start Live Shipment &amp; Track on Radar Now
                </span>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Immediately dispatches a live delivery assignment to this rider and opens the radar view.
                </p>
              </div>
            </label>

            {startImmediateDelivery && (
              <div className="space-y-2 pt-2 border-t border-amber-300/40">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Recipient Customer Name"
                    className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Customer Phone"
                    className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={destinationAddress}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                    placeholder="Street / Building Address"
                    className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                  />
                  <select
                    value={destinationDistrict}
                    onChange={(e) => setDestinationDistrict(e.target.value)}
                    className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    {DISTRICT_OPTIONS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{startImmediateDelivery ? 'Add & Track on Radar' : 'Save to Fleet'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
