import React, { useState, useMemo } from 'react';
import { DeliveryCourier, DeliveryTracking } from '../../types';
import { 
  Users, 
  UserPlus, 
  Navigation, 
  Phone, 
  Star, 
  Gauge, 
  Search, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Play, 
  MapPin,
  ShieldCheck
} from 'lucide-react';

interface CourierFleetViewProps {
  couriers: DeliveryCourier[];
  deliveryTrackings: DeliveryTracking[];
  onSelectTracking: (trackingNumber: string) => void;
  onOpenAddCourier: () => void;
  onOpenDispatch: (courierId?: string) => void;
  onStartTestRun: (courier: DeliveryCourier) => void;
  onDeleteCourier: (courierId: string) => void;
}

export const CourierFleetView: React.FC<CourierFleetViewProps> = ({
  couriers,
  deliveryTrackings,
  onSelectTracking,
  onOpenAddCourier,
  onOpenDispatch,
  onStartTestRun,
  onDeleteCourier,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'AVAILABLE'>('ALL');

  // Map couriers to their active deliveries
  const couriersWithStatus = useMemo(() => {
    return couriers.map(courier => {
      // Find active delivery for this courier that is not completed
      const activeDelivery = deliveryTrackings.find(
        dt => dt.courier.id === courier.id && dt.status !== 'DELIVERED'
      );
      return {
        courier,
        activeDelivery,
        isDelivering: !!activeDelivery,
      };
    });
  }, [couriers, deliveryTrackings]);

  // Filtered couriers
  const filteredCouriers = useMemo(() => {
    return couriersWithStatus.filter(({ courier, isDelivering }) => {
      if (statusFilter === 'ACTIVE' && !isDelivering) return false;
      if (statusFilter === 'AVAILABLE' && isDelivering) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        courier.name.toLowerCase().includes(term) ||
        courier.phone.includes(term) ||
        courier.vehicle.toLowerCase().includes(term) ||
        courier.plateNumber.toLowerCase().includes(term)
      );
    });
  }, [couriersWithStatus, searchTerm, statusFilter]);

  const activeCount = couriersWithStatus.filter(c => c.isDelivering).length;
  const availableCount = couriers.length - activeCount;

  return (
    <div className="space-y-6">
      {/* Top Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Fleet</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{couriers.length}</p>
          <span className="text-[11px] text-slate-500">Registered couriers</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">On Radar</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          </div>
          <p className="text-2xl font-black text-emerald-600">{activeCount}</p>
          <span className="text-[11px] text-emerald-700 font-medium">Actively on delivery</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">At Hub</span>
            <Truck className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl font-black text-sky-600">{availableCount}</p>
          <span className="text-[11px] text-slate-500">Ready for dispatch</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Fleet Avg Rating</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {couriers.length > 0
              ? (couriers.reduce((sum, c) => sum + (c.rating || 5), 0) / couriers.length).toFixed(2)
              : '5.00'} ★
          </p>
          <span className="text-[11px] text-slate-500">Customer feedback</span>
        </div>
      </div>

      {/* Control Bar: Search, Status filter & Add Courier Button */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by driver name, vehicle, or plate..."
              className="w-full bg-slate-50 text-xs text-slate-900 pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({couriers.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                statusFilter === 'ACTIVE' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('AVAILABLE')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                statusFilter === 'AVAILABLE' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Available ({availableCount})
            </button>
          </div>

          <button
            onClick={onOpenAddCourier}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Delivery Guy</span>
          </button>
        </div>
      </div>

      {/* Couriers Grid */}
      {filteredCouriers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="font-extrabold text-sm text-slate-800">No couriers match your search</h4>
          <p className="text-xs text-slate-500 mt-1 mb-4">Try clearing filters or add a new delivery driver to the fleet.</p>
          <button
            onClick={onOpenAddCourier}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Delivery Guy Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCouriers.map(({ courier, activeDelivery, isDelivering }) => (
            <div
              key={courier.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-amber-300 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header: Driver Photo, Name, and Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={courier.avatar}
                        alt={courier.name}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-xs"
                      />
                      <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        isDelivering ? 'bg-emerald-500 animate-pulse' : 'bg-sky-400'
                      }`} />
                    </div>

                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                        {courier.name}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{courier.phone}</span>
                      </p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                    isDelivering
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-sky-100 text-sky-800 border border-sky-300'
                  }`}>
                    {isDelivering ? 'On Delivery' : 'Available'}
                  </span>
                </div>

                {/* Details: Vehicle, Plate, Speed & Rating */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Vehicle:</span>
                    <span className="font-bold text-slate-800">{courier.vehicle}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Plate Number:</span>
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                      {courier.plateNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Speed / Rating:</span>
                    <span className="font-medium text-slate-800 flex items-center gap-2">
                      <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                        <Gauge className="w-3.5 h-3.5" />
                        {courier.currentSpeedKmH || 35} km/h
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-500" />
                        {courier.rating?.toFixed(1) || '5.0'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Active Delivery Card preview (if on delivery) */}
                {isDelivering && activeDelivery && (
                  <div className="mt-3 p-3 bg-amber-500/10 rounded-xl border border-amber-300/60 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                      <span className="flex items-center gap-1 text-amber-700">
                        <Navigation className="w-3.5 h-3.5" />
                        {activeDelivery.trackingNumber}
                      </span>
                      <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-md">
                        ~{activeDelivery.estimatedMinutesRemaining} min left
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{activeDelivery.customerName} • {activeDelivery.destinationDistrict}</span>
                    </p>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mt-1">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all"
                        style={{ width: `${activeDelivery.progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                {isDelivering && activeDelivery ? (
                  <button
                    onClick={() => onSelectTracking(activeDelivery.trackingNumber)}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Track on Radar 🛰️</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => onOpenDispatch(courier.id)}
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
                    >
                      <Truck className="w-3.5 h-3.5 text-amber-400" />
                      <span>Dispatch Order</span>
                    </button>
                    <button
                      onClick={() => onStartTestRun(courier)}
                      title="Launch an instant test consignment to track this rider on radar"
                      className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 font-bold py-2 px-2.5 rounded-xl text-xs transition-colors flex items-center gap-1 border border-amber-300"
                    >
                      <Play className="w-3.5 h-3.5 fill-amber-700" />
                      <span>Radar Test</span>
                    </button>
                  </>
                )}

                <a
                  href={`tel:${courier.phone.replace(/\s+/g, '')}`}
                  className="p-2 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 transition-colors"
                  title="Call Courier"
                >
                  <Phone className="w-4 h-4" />
                </a>

                <button
                  onClick={() => onDeleteCourier(courier.id)}
                  className="p-2 rounded-xl border border-slate-200 hover:border-rose-300 text-slate-400 hover:text-rose-600 transition-colors"
                  title="Remove from fleet"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
