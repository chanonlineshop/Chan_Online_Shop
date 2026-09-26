import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { DeliveryTracking, DeliveryStage, DeliveryCourier } from '../types';
import { 
  Truck, 
  MapPin, 
  Phone, 
  Clock, 
  Navigation, 
  ShieldCheck, 
  CheckCircle2, 
  Circle, 
  Search, 
  Send, 
  AlertCircle,
  Play, 
  Pause, 
  RotateCcw,
  Sparkles,
  PackageCheck,
  ChevronRight,
  Activity,
  UserPlus,
  Users,
  Radio,
  Star,
  Gauge,
  Compass,
  X,
  Plus
} from 'lucide-react';
import { AddCourierModal } from './delivery/AddCourierModal';
import { CourierFleetView } from './delivery/CourierFleetView';

export const LiveDeliveryTracking: React.FC = () => {
  const { 
    deliveryTrackings, 
    orders, 
    settings, 
    couriers,
    addCourier,
    deleteCourier,
    updateDeliveryStatus, 
    dispatchOrderDelivery,
    createQuickDelivery,
    userPermissions 
  } = useStore();

  const [activeTab, setActiveTab] = useState<'radar' | 'fleet'>('radar');
  const [selectedTrackingId, setSelectedTrackingId] = useState<string>(() => {
    return deliveryTrackings[0]?.trackingNumber || '';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSimulating, setIsSimulating] = useState(true);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [addCourierModalOpen, setAddCourierModalOpen] = useState(false);
  const [selectedPendingOrderId, setSelectedPendingOrderId] = useState('');
  const [selectedCourierIdForDispatch, setSelectedCourierIdForDispatch] = useState('');
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Fallback direct consignment fields if all orders are completed
  const [directCustomerName, setDirectCustomerName] = useState('Sokha Meng');
  const [directAddress, setDirectAddress] = useState('House #45, Street 310, BKK1');
  const [directDistrict, setDirectDistrict] = useState('BKK1, Phnom Penh');

  // Currently active selected tracking record
  const currentTracking = useMemo(() => {
    if (searchQuery.trim()) {
      const found = deliveryTrackings.find(t => 
        t.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        t.orderId.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        t.customerName.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        t.courier.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
      );
      if (found) return found;
    }
    return deliveryTrackings.find(t => t.trackingNumber === selectedTrackingId) || deliveryTrackings[0];
  }, [deliveryTrackings, selectedTrackingId, searchQuery]);

  // Keep selectedTrackingId synced if empty
  useEffect(() => {
    if (!selectedTrackingId && deliveryTrackings.length > 0) {
      setSelectedTrackingId(deliveryTrackings[0].trackingNumber);
    }
  }, [deliveryTrackings, selectedTrackingId]);

  // Orders that are pending or processing without an active delivery tracking
  const unassignedOrders = useMemo(() => {
    return orders.filter(o => 
      (o.fulfillmentStatus === 'Pending' || o.fulfillmentStatus === 'Processing') &&
      !deliveryTrackings.some(dt => dt.orderId === o.id)
    );
  }, [orders, deliveryTrackings]);

  // Automatic real-time GPS simulation ticker
  useEffect(() => {
    if (!isSimulating || !currentTracking || currentTracking.status === 'DELIVERED') return;

    const interval = setInterval(() => {
      if (currentTracking.progressPercent < 95) {
        const nextProgress = Math.min(95, currentTracking.progressPercent + 2);
        const stage: DeliveryStage = nextProgress >= 85 ? 'ARRIVING' : 'IN_TRANSIT';
        updateDeliveryStatus(currentTracking.orderId, stage, nextProgress);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isSimulating, currentTracking, updateDeliveryStatus]);

  const handleStageChange = (stage: DeliveryStage) => {
    if (!currentTracking) return;
    updateDeliveryStatus(currentTracking.orderId, stage);
  };

  const handleSelectTracking = (trackingNumber: string) => {
    setSelectedTrackingId(trackingNumber);
    setActiveTab('radar');
    setSearchQuery('');
  };

  // Courier added callback
  const handleCourierAdded = (
    courierData: Omit<DeliveryCourier, 'id'>,
    startImmediateDelivery: boolean,
    consignment?: {
      customerName: string;
      customerPhone: string;
      destinationAddress: string;
      destinationDistrict: string;
    }
  ) => {
    const newCourier = addCourier(courierData);

    if (startImmediateDelivery && consignment) {
      const newTracking = createQuickDelivery({
        customerName: consignment.customerName,
        customerPhone: consignment.customerPhone,
        destinationAddress: consignment.destinationAddress,
        destinationDistrict: consignment.destinationDistrict,
        courierId: newCourier.id,
        courierName: newCourier.name,
      });

      setSelectedTrackingId(newTracking.trackingNumber);
      setActiveTab('radar');
      setBannerNotice(`🛵 Rider ${newCourier.name} added and now tracked live on Delivery Radar!`);
    } else {
      setBannerNotice(`✅ Rider ${newCourier.name} successfully registered to delivery fleet.`);
    }

    setTimeout(() => {
      setBannerNotice(null);
    }, 6000);
  };

  // Launch a test run with a specific courier
  const handleStartTestRun = (courier: DeliveryCourier) => {
    const newTracking = createQuickDelivery({
      customerName: 'Sokha Meng (Priority)',
      customerPhone: '012 889 977',
      destinationAddress: 'Street 310, BKK1, Phnom Penh',
      destinationDistrict: 'BKK1, Phnom Penh',
      courierId: courier.id,
      courierName: courier.name,
    });

    setSelectedTrackingId(newTracking.trackingNumber);
    setActiveTab('radar');
    setBannerNotice(`🛰️ Radar tracking started for ${courier.name} on ${courier.vehicle}!`);

    setTimeout(() => {
      setBannerNotice(null);
    }, 6000);
  };

  // Dispatch from modal
  const handleDispatchNew = () => {
    const assignedCourier = couriers.find(c => c.id === selectedCourierIdForDispatch) || couriers[0];

    if (selectedPendingOrderId) {
      const newTracking = dispatchOrderDelivery(selectedPendingOrderId, assignedCourier);
      setSelectedTrackingId(newTracking.trackingNumber);
    } else {
      // Direct consignment
      const newTracking = createQuickDelivery({
        customerName: directCustomerName,
        customerPhone: '070 433 464',
        destinationAddress: directAddress,
        destinationDistrict: directDistrict,
        courierId: assignedCourier?.id,
        courierName: assignedCourier?.name,
      });
      setSelectedTrackingId(newTracking.trackingNumber);
    }

    setDispatchModalOpen(false);
    setSelectedPendingOrderId('');
    setSelectedCourierIdForDispatch('');
    setActiveTab('radar');
    setBannerNotice(`🚀 Shipment dispatched to ${assignedCourier?.name || 'Courier'} & live on Radar!`);

    setTimeout(() => {
      setBannerNotice(null);
    }, 5000);
  };

  return (
    <div className="space-y-6">
      {/* Banner Notice if set */}
      {bannerNotice && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl flex items-center justify-between shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 text-xs font-bold">
            <Radio className="w-4 h-4 animate-ping shrink-0" />
            <span>{bannerNotice}</span>
          </div>
          <button 
            onClick={() => setBannerNotice(null)}
            className="text-white/80 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20 shrink-0">
            <Navigation className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black tracking-tight text-white">Live Courier &amp; Delivery Radar</h1>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                Radar Online
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Central Hub: St. 271, Phnom Penh</span>
              <span>•</span>
              <span>Hotline: <strong className="text-amber-400">{settings.phone}</strong></span>
              <span>•</span>
              <span className="text-slate-300 font-semibold">{couriers.length} Drivers Active</span>
            </p>
          </div>
        </div>

        {/* Dispatcher & Courier Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            id="btn-add-delivery-guy"
            onClick={() => setAddCourierModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Delivery Guy</span>
          </button>

          {userPermissions.canDispatchDelivery && (
            <button
              onClick={() => {
                if (couriers.length > 0) setSelectedCourierIdForDispatch(couriers[0].id);
                setDispatchModalOpen(true);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <Truck className="w-3.5 h-3.5 text-amber-400" />
              <span>Dispatch Order ({unassignedOrders.length} Ready)</span>
            </button>
          )}

          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
              isSimulating 
                ? 'bg-slate-800 text-emerald-400 border-slate-700' 
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isSimulating ? 'GPS Auto: On' : 'Sim: Paused'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher: Radar Map vs Couriers Fleet */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('radar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold text-xs transition-all ${
            activeTab === 'radar'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Live Radar &amp; GPS Telemetry</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            activeTab === 'radar' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-200 text-slate-700'
          }`}>
            {deliveryTrackings.filter(dt => dt.status !== 'DELIVERED').length} Active
          </span>
        </button>

        <button
          onClick={() => setActiveTab('fleet')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold text-xs transition-all ${
            activeTab === 'fleet'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Delivery Guys Fleet</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            activeTab === 'fleet' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-200 text-slate-700'
          }`}>
            {couriers.length} Riders
          </span>
        </button>
      </div>

      {/* VIEW 1: LIVE RADAR & ACTIVE ROUTE TRACKING */}
      {activeTab === 'radar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Active Deliveries Selector & Search (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Tracking Search Input */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tracking, rider or customer..."
                  className="w-full bg-slate-100 text-xs text-slate-900 placeholder:text-slate-400 pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            {/* Active Deliveries List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 space-y-2">
              <div className="flex items-center justify-between px-1 pb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Tracked Consignments ({deliveryTrackings.length})
                </span>
                <button
                  onClick={() => setAddCourierModalOpen(true)}
                  className="text-[11px] text-amber-600 font-bold hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Rider</span>
                </button>
              </div>

              <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
                {deliveryTrackings.map(tracking => {
                  const isSelected = currentTracking?.trackingNumber === tracking.trackingNumber;

                  return (
                    <div
                      key={tracking.trackingNumber}
                      onClick={() => {
                        setSelectedTrackingId(tracking.trackingNumber);
                        setSearchQuery('');
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        isSelected 
                          ? 'bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/20 shadow-xs' 
                          : 'bg-slate-50/70 border-slate-200 hover:border-amber-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono font-extrabold text-xs text-slate-900">
                          {tracking.trackingNumber}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          tracking.status === 'DELIVERED' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : tracking.status === 'ARRIVING'
                              ? 'bg-amber-100 text-amber-800 animate-pulse'
                              : 'bg-sky-100 text-sky-800'
                        }`}>
                          {tracking.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-1">
                        <img 
                          src={tracking.courier.avatar} 
                          alt={tracking.courier.name}
                          className="w-5 h-5 rounded-full object-cover border border-slate-200 shrink-0" 
                        />
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {tracking.courier.name} 
                        </p>
                      </div>

                      <p className="text-[11px] text-slate-600 truncate">
                        Customer: <strong className="text-slate-800">{tracking.customerName}</strong>
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {tracking.destinationAddress}
                      </p>

                      {/* Mini progress bar */}
                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-amber-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${tracking.progressPercent}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 font-mono">
                          {tracking.progressPercent}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Live Radar Screen & Driver Telemetry (8 Cols) */}
          {currentTracking ? (
            <div className="lg:col-span-8 space-y-5">
              {/* LIVE GPS RADAR MAP CANVAS */}
              <div className="bg-slate-950 rounded-3xl p-5 border border-slate-800 shadow-xl text-white relative overflow-hidden">
                {/* Radar Grid Graphic Simulation */}
                <div className="absolute inset-0 opacity-15 pointer-events-none">
                  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="radar-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-amber-500" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#radar-grid)" />
                  </svg>
                </div>

                {/* Radar Concentric Rings & Scanning Sweep Effect */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-72 h-72 rounded-full border border-amber-500/20 pointer-events-none hidden md:flex items-center justify-center">
                  <div className="w-56 h-56 rounded-full border border-amber-500/15 flex items-center justify-center">
                    <div className="w-40 h-40 rounded-full border border-amber-500/10 flex items-center justify-center">
                      <div className="w-24 h-24 rounded-full border border-amber-500/10" />
                    </div>
                  </div>
                  {/* Rotating Scanning Beam */}
                  <div 
                    className="absolute inset-0 rounded-full border-r-2 border-amber-400/40 animate-spin" 
                    style={{ animationDuration: '6s' }}
                  />
                </div>

                {/* Header Status inside Map */}
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                      <h3 className="font-extrabold text-base text-white">
                        Live Delivery Route: {currentTracking.trackingNumber}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Order Ref: <strong className="text-white">{currentTracking.orderId}</strong> • Destination: <strong className="text-amber-400">{currentTracking.destinationDistrict}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Est. Arrival</span>
                      <span className="text-sm font-black text-amber-400">
                        {currentTracking.status === 'DELIVERED' ? 'Delivered' : `~${currentTracking.estimatedMinutesRemaining} mins`}
                      </span>
                    </div>

                    <div className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Remaining</span>
                      <span className="text-sm font-black text-emerald-400">
                        {currentTracking.status === 'DELIVERED' ? '0 km' : `${currentTracking.distanceRemainingKm} km`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interactive Vector Route Map */}
                <div className="relative z-10 my-6 bg-slate-900/90 rounded-2xl p-6 border border-slate-800">
                  {/* Visual Route Path */}
                  <div className="relative h-28 flex items-center justify-between px-6 sm:px-12">
                    {/* Background Track Line */}
                    <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 h-full rounded-full transition-all duration-700 shadow-sm shadow-amber-500/50"
                        style={{ width: `${currentTracking.progressPercent}%` }}
                      />
                    </div>

                    {/* Waypoint 1: Store Hub (Origin) */}
                    <div className="relative z-20 flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-amber-500 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-300 mt-2 whitespace-nowrap">
                        Store (St. 271)
                      </span>
                      <span className="text-[9px] text-slate-500">Dispatch Hub</span>
                    </div>

                    {/* Moving Courier Rider Marker */}
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 z-30 transition-all duration-700 flex flex-col items-center pointer-events-none"
                      style={{ left: `calc(${currentTracking.progressPercent}% - 24px)` }}
                    >
                      <div className="relative">
                        <img
                          src={currentTracking.courier.avatar}
                          alt={currentTracking.courier.name}
                          className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-400 shadow-xl shadow-amber-500/40 animate-bounce"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-0.5 rounded-full">
                          <Truck className="w-3 h-3 stroke-[3]" />
                        </div>
                      </div>
                      <div className="bg-slate-900 text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-slate-700 shadow-sm mt-1 whitespace-nowrap">
                        {currentTracking.courier.currentSpeedKmH || 35} km/h
                      </div>
                    </div>

                    {/* Waypoint 2: Destination Doorstep */}
                    <div className="relative z-20 flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                        currentTracking.status === 'DELIVERED'
                          ? 'bg-emerald-500 border-white text-white'
                          : 'bg-slate-900 border-slate-600 text-slate-400'
                      }`}>
                        {currentTracking.status === 'DELIVERED' ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <MapPin className="w-5 h-5" />
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-slate-300 mt-2 whitespace-nowrap">
                        Customer Gate
                      </span>
                      <span className="text-[9px] text-slate-500">{currentTracking.destinationDistrict}</span>
                    </div>
                  </div>

                  {/* Telemetry Footer inside Map */}
                  <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Activity className="w-4 h-4 text-amber-400" />
                      <span>Rider: <strong className="text-white">{currentTracking.courier.name}</strong></span>
                      <span className="text-slate-600">•</span>
                      <span>Vehicle: <strong className="text-slate-300">{currentTracking.courier.vehicle} ({currentTracking.courier.plateNumber})</strong></span>
                      <span className="text-slate-600">•</span>
                      <span className="text-amber-400 font-bold">{currentTracking.courier.rating?.toFixed(1) || '5.0'} ★</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>Phnom Penh City: Clear • 31°C</span>
                    </div>
                  </div>
                </div>

                {/* Quick Contact & Radar Action Bar */}
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-3">
                    <a
                      href={`tel:${currentTracking.courier.phone.replace(/\s+/g, '')}`}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Driver ({currentTracking.courier.phone})</span>
                    </a>

                    <a
                      href={`tel:${settings.phone.replace(/\s+/g, '')}`}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
                    >
                      <Phone className="w-3.5 h-3.5 text-amber-400" />
                      <span>Call Hub ({settings.phone})</span>
                    </a>
                  </div>

                  {/* Dispatcher simulation buttons */}
                  {userPermissions.canDispatchDelivery && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStageChange('ARRIVING')}
                        disabled={currentTracking.status === 'DELIVERED'}
                        className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-amber-300 px-3 py-1.5 rounded-lg border border-slate-700"
                      >
                        Set "Arriving"
                      </button>
                      <button
                        onClick={() => handleStageChange('DELIVERED')}
                        disabled={currentTracking.status === 'DELIVERED'}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-bold text-white px-3 py-1.5 rounded-lg"
                      >
                        Confirm Delivered
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* MILESTONE TIMELINE & RIDER / CONSIGNMENT SUMMARY */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Delivery Milestones Timeline */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                  <h4 className="font-extrabold text-sm text-slate-900 mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Tracking Progression Milestones</span>
                  </h4>

                  <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {currentTracking.milestones.map((milestone, idx) => (
                      <div key={idx} className="relative flex items-start gap-3 pl-1">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 z-10 ${
                          milestone.completed 
                            ? 'bg-amber-500 text-slate-950 shadow-xs' 
                            : 'bg-white border-2 border-slate-300 text-slate-300'
                        }`}>
                          {milestone.completed ? (
                            <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                          ) : (
                            <Circle className="w-2 h-2" />
                          )}
                        </div>

                        <div className="flex-1 -mt-0.5">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${
                              milestone.completed ? 'text-slate-900' : 'text-slate-400'
                            }`}>
                              {milestone.label}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {milestone.timestamp}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            {milestone.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assigned Rider & Customer Details */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <h4 className="font-extrabold text-sm text-slate-900 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <PackageCheck className="w-4 h-4 text-emerald-600" />
                      <span>Delivery Consignment Info</span>
                    </span>
                    <button
                      onClick={() => setActiveTab('fleet')}
                      className="text-xs text-amber-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <Users className="w-3 h-3" />
                      <span>View All Drivers</span>
                    </button>
                  </h4>

                  <div className="space-y-3 text-xs divide-y divide-slate-100">
                    {/* Courier Assigned Box */}
                    <div className="pt-2 first:pt-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Courier Guy Assigned</span>
                      <div className="flex items-center gap-3 mt-1.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <img
                          src={currentTracking.courier.avatar}
                          alt={currentTracking.courier.name}
                          className="w-11 h-11 rounded-full object-cover border-2 border-amber-400 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-extrabold text-slate-900 text-xs truncate">
                              {currentTracking.courier.name}
                            </p>
                            <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              {currentTracking.courier.rating?.toFixed(1) || '5.0'}
                            </span>
                          </div>
                          <p className="text-slate-500 text-[11px] truncate">
                            {currentTracking.courier.vehicle} • {currentTracking.courier.plateNumber}
                          </p>
                          <p className="text-emerald-700 font-medium text-[10px] mt-0.5">
                            Tel: {currentTracking.courier.phone}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Recipient</span>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">{currentTracking.customerName}</p>
                      <p className="text-slate-600">{currentTracking.customerPhone}</p>
                    </div>

                    <div className="pt-3">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Drop-off Address</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{currentTracking.destinationAddress}</p>
                      <p className="text-slate-500">{currentTracking.destinationDistrict}</p>
                    </div>

                    <div className="pt-3 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Express Authenticity Guarantee</span>
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        100% Insured Delivery
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-12 text-center">
              <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-800">No active delivery selected</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">Select an active consignment from the left list or dispatch a new order.</p>
              <button
                onClick={() => setAddCourierModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Delivery Guy &amp; Track</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: COURIERS FLEET MANAGEMENT */}
      {activeTab === 'fleet' && (
        <CourierFleetView
          couriers={couriers}
          deliveryTrackings={deliveryTrackings}
          onSelectTracking={handleSelectTracking}
          onOpenAddCourier={() => setAddCourierModalOpen(true)}
          onOpenDispatch={(courierId) => {
            if (courierId) setSelectedCourierIdForDispatch(courierId);
            setDispatchModalOpen(true);
          }}
          onStartTestRun={handleStartTestRun}
          onDeleteCourier={(id) => {
            if (window.confirm('Remove this delivery guy from fleet?')) {
              deleteCourier(id);
            }
          }}
        />
      )}

      {/* ADD COURIER MODAL */}
      <AddCourierModal
        isOpen={addCourierModalOpen}
        onClose={() => setAddCourierModalOpen(false)}
        onCourierAdded={handleCourierAdded}
      />

      {/* DISPATCH ORDER MODAL */}
      {dispatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-lg text-slate-900">Dispatch Order to Courier</h3>
              <button
                onClick={() => setDispatchModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-xs text-slate-500 mt-2 mb-4">
              Select customer consignment and choose which delivery guy will fulfill this order.
            </p>

            {/* Courier Selection */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-800">Assign Delivery Guy</label>
                <button
                  type="button"
                  onClick={() => {
                    setDispatchModalOpen(false);
                    setAddCourierModalOpen(true);
                  }}
                  className="text-[11px] font-bold text-amber-600 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Add New Driver</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {couriers.map(c => {
                  const isSelected = selectedCourierIdForDispatch === c.id || (!selectedCourierIdForDispatch && couriers[0]?.id === c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCourierIdForDispatch(c.id)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center gap-2.5 transition-all ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/20'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <img src={c.avatar} alt={c.name} className="w-9 h-9 rounded-xl object-cover border border-slate-200" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 truncate">{c.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{c.vehicle}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Selection or Direct Consignment */}
            <div className="mb-5">
              <label className="text-xs font-bold text-slate-800 block mb-2">Select Order to Deliver</label>

              {unassignedOrders.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-emerald-800 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>All customer orders are fulfilled! Create a direct consignment below:</span>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={directCustomerName}
                      onChange={(e) => setDirectCustomerName(e.target.value)}
                      placeholder="Customer Name"
                      className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                    />
                    <input
                      type="text"
                      value={directAddress}
                      onChange={(e) => setDirectAddress(e.target.value)}
                      placeholder="Delivery Address"
                      className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                    />
                    <input
                      type="text"
                      value={directDistrict}
                      onChange={(e) => setDirectDistrict(e.target.value)}
                      placeholder="City / District"
                      className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {unassignedOrders.map(order => (
                    <div
                      key={order.id}
                      onClick={() => setSelectedPendingOrderId(order.id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                        selectedPendingOrderId === order.id
                          ? 'bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/20'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex justify-between font-bold text-slate-900 mb-1">
                        <span>{order.id}</span>
                        <span>${order.total.toFixed(2)}</span>
                      </div>
                      <p className="text-slate-700">{order.customer.fullName} ({order.customer.phoneNumber})</p>
                      <p className="text-slate-500 text-[11px] truncate">{order.customer.address}, {order.customer.city}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDispatchModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDispatchNew}
                disabled={unassignedOrders.length > 0 && !selectedPendingOrderId}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-extrabold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5"
              >
                <Truck className="w-4 h-4" />
                <span>Launch &amp; Track on Radar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
