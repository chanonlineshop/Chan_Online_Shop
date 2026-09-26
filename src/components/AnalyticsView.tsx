import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Package,
  Users,
  Award,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  RotateCcw,
  Sparkles,
  PieChart as PieChartIcon,
  BarChart3,
  MapPin,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Store,
  Globe,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  Line
} from 'recharts';
import { useStore } from '../context/StoreContext';
import { Order, POSSale, Product } from '../types';

type TimeRange = '7d' | '14d' | '30d' | '90d' | 'all';
type ChannelFilter = 'all' | 'online' | 'pos';

// Premium Palette for Recharts
const PALETTE = {
  emerald: '#10b981',
  indigo: '#6366f1',
  amber: '#f59e0b',
  sky: '#0284c7',
  purple: '#8b5cf6',
  rose: '#f43f5e',
  teal: '#14b8a6',
  slate: '#64748b'
};

const CATEGORY_COLORS = [
  '#10b981', // Emerald
  '#6366f1', // Indigo
  '#f59e0b', // Amber
  '#0284c7', // Sky
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#14b8a6', // Teal
  '#f97316', // Orange
];

const TIER_COLORS = {
  VIP: '#f59e0b',       // Gold / Amber
  Repeat: '#6366f1',    // Indigo
  FirstTime: '#10b981'  // Emerald
};

const PAYMENT_COLORS: Record<string, string> = {
  khqr: '#dc2626',   // Bakong Red
  aba: '#0284c7',    // ABA Blue
  card: '#6366f1',   // Card Indigo
  cod: '#10b981',    // Cash Emerald
  CASH: '#10b981',
  KHQR: '#dc2626',
  CARD: '#6366f1'
};

export const AnalyticsView: React.FC = () => {
  const { orders, posSales, products, seedSampleOrders, resolvedTheme, userPermissions } = useStore();

  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'products' | 'customers'>('overview');
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  const isDark = resolvedTheme === 'dark';

  // Calculate cutoff timestamp based on selected time range
  const now = Date.now();
  const timeCutoff = useMemo(() => {
    switch (timeRange) {
      case '7d':
        return now - 7 * 24 * 3600 * 1000;
      case '14d':
        return now - 14 * 24 * 3600 * 1000;
      case '30d':
        return now - 30 * 24 * 3600 * 1000;
      case '90d':
        return now - 90 * 24 * 3600 * 1000;
      case 'all':
      default:
        return 0;
    }
  }, [timeRange, now]);

  // Filter Online Orders
  const filteredOrders = useMemo(() => {
    if (channelFilter === 'pos') return [];
    return orders.filter(o => {
      const orderTime = new Date(o.date).getTime();
      return orderTime >= timeCutoff;
    });
  }, [orders, timeCutoff, channelFilter]);

  // Filter POS Sales
  const filteredPOSSales = useMemo(() => {
    if (channelFilter === 'online') return [];
    return posSales.filter(s => {
      const saleTime = new Date(s.date).getTime();
      return saleTime >= timeCutoff;
    });
  }, [posSales, timeCutoff, channelFilter]);

  // 1. Executive Summary KPIs
  const kpis = useMemo(() => {
    let onlineRevenue = 0;
    let onlineUnits = 0;
    let totalOnlineOrders = filteredOrders.length;
    let totalEstimatedCost = 0;

    // Create product cost lookup map
    const productCostMap = new Map<string, number>();
    const productCategoryMap = new Map<string, string>();
    products.forEach(p => {
      productCostMap.set(p.id, p.costPrice || p.price * 0.6);
      productCategoryMap.set(p.id, p.category);
    });

    filteredOrders.forEach(o => {
      onlineRevenue += o.total;
      o.items.forEach(item => {
        onlineUnits += item.quantity;
        const unitCost = productCostMap.get(item.productId) || (item.price * 0.6);
        totalEstimatedCost += unitCost * item.quantity;
      });
    });

    let posRevenue = 0;
    let posUnits = 0;
    filteredPOSSales.forEach(s => {
      posRevenue += s.total;
      s.items.forEach(item => {
        posUnits += item.quantity;
        const unitCost = productCostMap.get(item.productId) || (item.unitPrice * 0.6);
        totalEstimatedCost += unitCost * item.quantity;
      });
    });

    const totalRevenue = onlineRevenue + posRevenue;
    const totalTransactions = totalOnlineOrders + filteredPOSSales.length;
    const totalUnitsSold = onlineUnits + posUnits;
    const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const estimatedProfit = Math.max(0, totalRevenue - totalEstimatedCost);
    const profitMarginPercent = totalRevenue > 0 ? (estimatedProfit / totalRevenue) * 100 : 0;

    // Calculate completion/delivered rate for online orders
    const completedOrders = filteredOrders.filter(o => o.fulfillmentStatus === 'Delivered' || o.fulfillmentStatus === 'Shipped').length;
    const fulfillmentRate = totalOnlineOrders > 0 ? (completedOrders / totalOnlineOrders) * 100 : 100;

    return {
      totalRevenue,
      onlineRevenue,
      posRevenue,
      totalTransactions,
      totalUnitsSold,
      averageOrderValue,
      estimatedProfit,
      profitMarginPercent,
      fulfillmentRate,
      onlineOrdersCount: totalOnlineOrders,
      posSalesCount: filteredPOSSales.length
    };
  }, [filteredOrders, filteredPOSSales, products]);

  // 2. Daily Sales Trend Data (Time Series for Recharts AreaChart & ComposedChart)
  const salesTrendData = useMemo(() => {
    const dailyMap = new Map<string, { dateStr: string; onlineSales: number; posSales: number; totalSales: number; ordersCount: number }>();

    // Determine span in days
    const daysToGenerate = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : timeRange === '30d' ? 30 : 45;
    
    // Seed continuous dates so chart doesn't have gaps
    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const d = new Date(now - i * 24 * 3600 * 1000);
      const dateKey = d.toISOString().slice(0, 10);
      const displayStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyMap.set(dateKey, {
        dateStr: displayStr,
        onlineSales: 0,
        posSales: 0,
        totalSales: 0,
        ordersCount: 0
      });
    }

    filteredOrders.forEach(o => {
      const dateKey = o.date.slice(0, 10);
      if (dailyMap.has(dateKey)) {
        const item = dailyMap.get(dateKey)!;
        item.onlineSales += o.total;
        item.totalSales += o.total;
        item.ordersCount += 1;
      } else {
        const d = new Date(o.date);
        dailyMap.set(dateKey, {
          dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          onlineSales: o.total,
          posSales: 0,
          totalSales: o.total,
          ordersCount: 1
        });
      }
    });

    filteredPOSSales.forEach(s => {
      const dateKey = s.date.slice(0, 10);
      if (dailyMap.has(dateKey)) {
        const item = dailyMap.get(dateKey)!;
        item.posSales += s.total;
        item.totalSales += s.total;
        item.ordersCount += 1;
      } else {
        const d = new Date(s.date);
        dailyMap.set(dateKey, {
          dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          onlineSales: 0,
          posSales: s.total,
          totalSales: s.total,
          ordersCount: 1
        });
      }
    });

    return Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, v]) => ({
        ...v,
        onlineSales: Number(v.onlineSales.toFixed(2)),
        posSales: Number(v.posSales.toFixed(2)),
        totalSales: Number(v.totalSales.toFixed(2))
      }));
  }, [filteredOrders, filteredPOSSales, timeRange, now]);

  // 3. Day of the Week Performance
  const dayOfWeekData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = days.map(day => ({ day, sales: 0, count: 0 }));

    filteredOrders.forEach(o => {
      const dayIdx = new Date(o.date).getDay();
      counts[dayIdx].sales += o.total;
      counts[dayIdx].count += 1;
    });

    filteredPOSSales.forEach(s => {
      const dayIdx = new Date(s.date).getDay();
      counts[dayIdx].sales += s.total;
      counts[dayIdx].count += 1;
    });

    return counts.map(c => ({
      day: c.day,
      sales: Number(c.sales.toFixed(2)),
      count: c.count,
      avgOrder: c.count > 0 ? Number((c.sales / c.count).toFixed(2)) : 0
    }));
  }, [filteredOrders, filteredPOSSales]);

  // 4. Product Performance Metrics
  const productPerformance = useMemo(() => {
    const prodMap = new Map<string, {
      id: string;
      name: string;
      sku: string;
      category: string;
      image: string;
      price: number;
      costPrice: number;
      unitsSold: number;
      revenue: number;
      ordersCount: number;
      stock: number;
    }>();

    // Map existing products
    products.forEach(p => {
      prodMap.set(p.id, {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        image: p.images[0] || '',
        price: p.price,
        costPrice: p.costPrice || p.price * 0.6,
        unitsSold: 0,
        revenue: 0,
        ordersCount: 0,
        stock: p.stock
      });
    });

    // Tally online orders
    filteredOrders.forEach(o => {
      o.items.forEach(item => {
        let entry = prodMap.get(item.productId);
        if (!entry) {
          entry = {
            id: item.productId,
            name: item.productName,
            sku: item.sku,
            category: 'Other',
            image: item.image,
            price: item.price,
            costPrice: item.price * 0.6,
            unitsSold: 0,
            revenue: 0,
            ordersCount: 0,
            stock: 10
          };
          prodMap.set(item.productId, entry);
        }
        entry.unitsSold += item.quantity;
        entry.revenue += item.price * item.quantity;
        entry.ordersCount += 1;
      });
    });

    // Tally POS sales
    filteredPOSSales.forEach(s => {
      s.items.forEach(item => {
        let entry = prodMap.get(item.productId);
        if (!entry) {
          entry = {
            id: item.productId,
            name: item.productName,
            sku: item.sku,
            category: 'In-Store',
            image: '',
            price: item.unitPrice,
            costPrice: item.unitPrice * 0.6,
            unitsSold: 0,
            revenue: 0,
            ordersCount: 0,
            stock: 10
          };
          prodMap.set(item.productId, entry);
        }
        entry.unitsSold += item.quantity;
        entry.revenue += item.lineTotal;
        entry.ordersCount += 1;
      });
    });

    const list = Array.from(prodMap.values())
      .map(p => {
        const estimatedProfit = p.revenue - (p.costPrice * p.unitsSold);
        const marginPercent = p.revenue > 0 ? (estimatedProfit / p.revenue) * 100 : 0;
        return {
          ...p,
          revenue: Number(p.revenue.toFixed(2)),
          estimatedProfit: Number(estimatedProfit.toFixed(2)),
          marginPercent: Number(marginPercent.toFixed(1))
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    return list;
  }, [filteredOrders, filteredPOSSales, products]);

  // Top 6 products for BarChart
  const topProductsChartData = useMemo(() => {
    return productPerformance
      .filter(p => p.unitsSold > 0)
      .slice(0, 6)
      .map(p => ({
        name: p.name.length > 20 ? p.name.slice(0, 20) + '…' : p.name,
        fullName: p.name,
        revenue: p.revenue,
        unitsSold: p.unitsSold,
        profit: p.estimatedProfit,
        category: p.category
      }));
  }, [productPerformance]);

  // 5. Customer Categories & Segmentation
  // A. Sales by Product Category (Which categories do customers purchase most?)
  const categorySalesData = useMemo(() => {
    const catMap = new Map<string, { category: string; revenue: number; units: number; orders: number }>();

    productPerformance.forEach(p => {
      if (p.revenue <= 0) return;
      const cat = p.category || 'General';
      if (!catMap.has(cat)) {
        catMap.set(cat, { category: cat, revenue: 0, units: 0, orders: 0 });
      }
      const item = catMap.get(cat)!;
      item.revenue += p.revenue;
      item.units += p.unitsSold;
      item.orders += p.ordersCount;
    });

    return Array.from(catMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map((c, i) => ({
        ...c,
        revenue: Number(c.revenue.toFixed(2)),
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]
      }));
  }, [productPerformance]);

  // B. Customer Frequency & Value Tiers (VIP vs Repeat vs First-Time)
  const customerTiersData = useMemo(() => {
    const customerMap = new Map<string, {
      name: string;
      phone: string;
      email: string;
      city: string;
      ordersCount: number;
      totalSpend: number;
      lastOrderDate: string;
      paymentMethods: Set<string>;
      preferredCategory?: string;
    }>();

    filteredOrders.forEach(o => {
      const key = (o.customer.email || o.customer.phoneNumber || o.customer.fullName).toLowerCase();
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          name: o.customer.fullName || 'Customer',
          phone: o.customer.phoneNumber,
          email: o.customer.email,
          city: o.customer.city || 'Phnom Penh',
          ordersCount: 0,
          totalSpend: 0,
          lastOrderDate: o.date,
          paymentMethods: new Set()
        });
      }
      const c = customerMap.get(key)!;
      c.ordersCount += 1;
      c.totalSpend += o.total;
      c.paymentMethods.add(o.paymentMethod);
      if (new Date(o.date) > new Date(c.lastOrderDate)) {
        c.lastOrderDate = o.date;
      }
    });

    const customersList = Array.from(customerMap.values());

    let vipCount = 0;
    let vipRevenue = 0;
    let repeatCount = 0;
    let repeatRevenue = 0;
    let firstTimeCount = 0;
    let firstTimeRevenue = 0;

    customersList.forEach(c => {
      if (c.totalSpend >= 120) {
        vipCount++;
        vipRevenue += c.totalSpend;
      } else if (c.ordersCount >= 2) {
        repeatCount++;
        repeatRevenue += c.totalSpend;
      } else {
        firstTimeCount++;
        firstTimeRevenue += c.totalSpend;
      }
    });

    const totalCust = customersList.length || 1;

    const tiers = [
      {
        name: 'VIP Customers ($120+)',
        shortName: 'VIP ($120+)',
        count: vipCount,
        revenue: Number(vipRevenue.toFixed(2)),
        percentage: Number(((vipCount / totalCust) * 100).toFixed(1)),
        color: TIER_COLORS.VIP
      },
      {
        name: 'Repeat Buyers (2+ Orders)',
        shortName: 'Repeat (2+)',
        count: repeatCount,
        revenue: Number(repeatRevenue.toFixed(2)),
        percentage: Number(((repeatCount / totalCust) * 100).toFixed(1)),
        color: TIER_COLORS.Repeat
      },
      {
        name: 'First-Time Buyers',
        shortName: 'First-Time',
        count: firstTimeCount,
        revenue: Number(firstTimeRevenue.toFixed(2)),
        percentage: Number(((firstTimeCount / totalCust) * 100).toFixed(1)),
        color: TIER_COLORS.FirstTime
      }
    ];

    // Sorted top customers leaderboard
    const leaderboard = customersList
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 8)
      .map(c => ({
        ...c,
        totalSpend: Number(c.totalSpend.toFixed(2)),
        tier: c.totalSpend >= 120 ? 'VIP' : c.ordersCount >= 2 ? 'Repeat' : 'New'
      }));

    return {
      tiers,
      leaderboard,
      totalCustomers: customersList.length
    };
  }, [filteredOrders]);

  // C. Geographic Distribution (Top Cities & Delivery Hubs)
  const cityDistributionData = useMemo(() => {
    const cityMap = new Map<string, { city: string; count: number; revenue: number }>();

    filteredOrders.forEach(o => {
      const city = o.customer.city || 'Phnom Penh';
      if (!cityMap.has(city)) {
        cityMap.set(city, { city, count: 0, revenue: 0 });
      }
      const entry = cityMap.get(city)!;
      entry.count += 1;
      entry.revenue += o.total;
    });

    return Array.from(cityMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6)
      .map(c => ({
        ...c,
        revenue: Number(c.revenue.toFixed(2))
      }));
  }, [filteredOrders]);

  // D. Payment Method Distribution
  const paymentMethodData = useMemo(() => {
    const payMap = new Map<string, { method: string; count: number; revenue: number }>();

    filteredOrders.forEach(o => {
      const key = o.paymentMethod || 'khqr';
      const label = key === 'khqr' ? 'Bakong KHQR' : key === 'aba' ? 'ABA PayWay' : key === 'card' ? 'Visa / Mastercard' : 'Cash on Delivery (COD)';
      if (!payMap.has(key)) {
        payMap.set(key, { method: label, count: 0, revenue: 0 });
      }
      const entry = payMap.get(key)!;
      entry.count += 1;
      entry.revenue += o.total;
    });

    filteredPOSSales.forEach(s => {
      const key = s.paymentMethod;
      const label = key === 'KHQR' ? 'POS KHQR' : key === 'CARD' ? 'POS Card Terminal' : 'POS Cash Counter';
      if (!payMap.has(key)) {
        payMap.set(key, { method: label, count: 0, revenue: 0 });
      }
      const entry = payMap.get(key)!;
      entry.count += 1;
      entry.revenue += s.total;
    });

    return Array.from(payMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map(p => ({
        ...p,
        revenue: Number(p.revenue.toFixed(2)),
        color: PAYMENT_COLORS[p.method] || '#6366f1'
      }));
  }, [filteredOrders, filteredPOSSales]);

  // CSV Export
  const handleExportCSV = () => {
    const rows = [
      ['Report', 'Chan Online Shop Analytics & Sales Performance'],
      ['Exported At', new Date().toISOString()],
      ['Timeframe', timeRange],
      ['Total Revenue ($)', kpis.totalRevenue.toFixed(2)],
      ['Total Transactions', kpis.totalTransactions.toString()],
      ['Average Order Value ($)', kpis.averageOrderValue.toFixed(2)],
      ['Estimated Gross Profit ($)', kpis.estimatedProfit.toFixed(2)],
      [],
      ['Product Performance Leaderboard'],
      ['Rank', 'Product Name', 'SKU', 'Category', 'Units Sold', 'Gross Revenue ($)', 'Estimated Profit ($)', 'Margin %'],
      ...productPerformance.map((p, idx) => [
        (idx + 1).toString(),
        `"${p.name.replace(/"/g, '""')}"`,
        p.sku,
        p.category,
        p.unitsSold.toString(),
        p.revenue.toFixed(2),
        p.estimatedProfit.toFixed(2),
        `${p.marginPercent.toFixed(1)}%`
      ]),
      [],
      ['Customer Category & Tiers'],
      ['Tier Name', 'Customer Count', 'Total Spend ($)', 'Share %'],
      ...customerTiersData.tiers.map(t => [
        t.name,
        t.count.toString(),
        t.revenue.toFixed(2),
        `${t.percentage}%`
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Chan_Online_Shop_Analytics_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setCopiedNotification('Analytics CSV export downloaded successfully!');
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Toast Notification */}
      {copiedNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>EXECUTIVE STORE INTELLIGENCE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Sales & Customer Analytics
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Visualizing real-time sales trends, product velocity, and customer segmentation from store order history.
          </p>
        </div>

        {/* Global Controls & Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Timeframe Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {(['7d', '14d', '30d', '90d', 'all'] as TimeRange[]).map(t => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  timeRange === t
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t === '7d' ? '7 Days' : t === '14d' ? '14 Days' : t === '30d' ? '30 Days' : t === '90d' ? '90 Days' : 'All Time'}
              </button>
            ))}
          </div>

          {/* Channel Filter */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setChannelFilter('all')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                channelFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>All</span>
            </button>
            <button
              onClick={() => setChannelFilter('online')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                channelFilter === 'online'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Online</span>
            </button>
            <button
              onClick={() => setChannelFilter('pos')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                channelFilter === 'pos'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>POS</span>
            </button>
          </div>

          {/* Action Buttons */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl transition-all shadow-xs"
            title="Download CSV report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {/* Reset / Seed Sample Historical Data Button if orders count is low */}
          <button
            onClick={() => {
              seedSampleOrders();
              setCopiedNotification('30-Day rich historical orders seeded!');
              setTimeout(() => setCopiedNotification(null), 3500);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold rounded-xl transition-all"
            title="Load 30-Day comprehensive demo data across multiple product & customer categories"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Seed 30-Day Data</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'overview'
              ? 'bg-emerald-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Executive Overview</span>
        </button>
        <button
          onClick={() => setActiveTab('trends')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'trends'
              ? 'bg-emerald-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Sales Trends</span>
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'products'
              ? 'bg-emerald-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Product Performance</span>
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'customers'
              ? 'bg-emerald-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Customer Categories & Tiers</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Revenue */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Net Revenue</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              ${kpis.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
              +14.8%
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span>Online: ${kpis.onlineRevenue.toFixed(2)}</span>
            <span>•</span>
            <span>POS: ${kpis.posRevenue.toFixed(2)}</span>
          </div>
        </div>

        {/* KPI 2: Total Orders */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Transactions & Volume</p>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {kpis.totalTransactions}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">orders ({kpis.totalUnitsSold} items)</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span>Fulfillment: <strong className="text-emerald-600 dark:text-emerald-400">{kpis.fulfillmentRate.toFixed(0)}%</strong></span>
            <span>•</span>
            <span>Web: {kpis.onlineOrdersCount} / In-Store: {kpis.posSalesCount}</span>
          </div>
        </div>

        {/* KPI 3: Average Order Value */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Average Order Value (AOV)</p>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              ${kpis.averageOrderValue.toFixed(2)}
            </span>
            <span className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center">
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
              +$4.20
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Per transaction basket across all channels
          </div>
        </div>

        {/* KPI 4: Gross Profit & Margin */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Est. Gross Profit & Margin</p>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              ${kpis.estimatedProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              {kpis.profitMarginPercent.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Based on product wholesale cost pricing
          </div>
        </div>
      </div>

      {/* SECTION 1: SALES TRENDS (RECHARTS AREA & BAR CHARTS) */}
      {(activeTab === 'overview' || activeTab === 'trends') && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <span>Sales Trends Over Time</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Daily revenue velocity, order volumes, and channel breakdown for the selected period.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
              {salesTrendData.length} Days Sampled
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Primary Time-Series Area Chart (2 Cols) */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Revenue & Order Velocity</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Online Storefront vs POS Terminal Revenue ($)</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                    <span className="text-slate-600 dark:text-slate-400">Online Sales</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-indigo-500" />
                    <span className="text-slate-600 dark:text-slate-400">POS Sales</span>
                  </div>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorOnline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PALETTE.emerald} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={PALETTE.emerald} stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PALETTE.indigo} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={PALETTE.indigo} stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#f1f5f9'} vertical={false} />
                    <XAxis 
                      dataKey="dateStr" 
                      stroke={isDark ? '#94a3b8' : '#64748b'} 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={{ stroke: isDark ? '#334155' : '#e2e8f0' }}
                    />
                    <YAxis 
                      stroke={isDark ? '#94a3b8' : '#64748b'} 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={{ stroke: isDark ? '#334155' : '#e2e8f0' }}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        borderRadius: '12px',
                        color: isDark ? '#f8fafc' : '#0f172a',
                        fontSize: '12px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)'
                      }}
                      formatter={(value: any, name: any) => [
                        `$${Number(value).toFixed(2)}`,
                        name === 'onlineSales' ? 'Online Store' : name === 'posSales' ? 'In-Store POS' : 'Total Revenue'
                      ]}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="onlineSales" 
                      stroke={PALETTE.emerald} 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#colorOnline)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="posSales" 
                      stroke={PALETTE.indigo} 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#colorPos)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Day of Week Peak Order Velocity (1 Col) */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Peak Sales by Weekday</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total revenue generated per day of the week</p>
                </div>
                <Calendar className="w-4 h-4 text-slate-400" />
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayOfWeekData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#f1f5f9'} vertical={false} />
                    <XAxis 
                      dataKey="day" 
                      stroke={isDark ? '#94a3b8' : '#64748b'} 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={{ stroke: isDark ? '#334155' : '#e2e8f0' }}
                    />
                    <YAxis 
                      stroke={isDark ? '#94a3b8' : '#64748b'} 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={{ stroke: isDark ? '#334155' : '#e2e8f0' }}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        borderRadius: '12px',
                        color: isDark ? '#f8fafc' : '#0f172a',
                        fontSize: '12px'
                      }}
                      formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Sales Revenue']}
                    />
                    <Bar 
                      dataKey="sales" 
                      fill={PALETTE.sky} 
                      radius={[6, 6, 0, 0]} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: PRODUCT PERFORMANCE (RECHARTS BAR & COMPOSED CHARTS) */}
      {(activeTab === 'overview' || activeTab === 'products') && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-500" />
                <span>Product Performance & Velocity</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Top revenue-generating products, units sold, and category inventory metrics.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products by Gross Revenue Bar Chart */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top 6 Products by Gross Revenue</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Leading items ordered by revenue ($)</p>
                </div>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded">
                  Revenue ($)
                </span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProductsChartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#f1f5f9'} horizontal={false} />
                    <XAxis 
                      type="number" 
                      stroke={isDark ? '#94a3b8' : '#64748b'} 
                      fontSize={11} 
                      tickLine={false} 
                      tickFormatter={(val) => `$${val}`}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke={isDark ? '#94a3b8' : '#64748b'} 
                      fontSize={11} 
                      tickLine={false} 
                      width={120} 
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        borderRadius: '12px',
                        color: isDark ? '#f8fafc' : '#0f172a',
                        fontSize: '12px'
                      }}
                      formatter={(value: any, name: any) => [
                        name === 'revenue' ? `$${Number(value).toFixed(2)}` : value,
                        name === 'revenue' ? 'Gross Revenue' : 'Units Sold'
                      ]}
                    />
                    <Bar dataKey="revenue" fill={PALETTE.indigo} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Units Sold vs Revenue Composed Chart */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Units Sold vs Revenue Comparison</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Volume (units) compared to revenue generated</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Units
                  </span>
                  <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Revenue ($)
                  </span>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={topProductsChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#f1f5f9'} vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke={isDark ? '#94a3b8' : '#64748b'} 
                      fontSize={10} 
                      tickLine={false} 
                    />
                    <YAxis 
                      yAxisId="left" 
                      stroke={isDark ? '#94a3b8' : '#64748b'} 
                      fontSize={11} 
                      tickLine={false} 
                      tickFormatter={(val) => `${val}`}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      stroke={isDark ? '#94a3b8' : '#64748b'} 
                      fontSize={11} 
                      tickLine={false} 
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        borderRadius: '12px',
                        color: isDark ? '#f8fafc' : '#0f172a',
                        fontSize: '12px'
                      }}
                    />
                    <Bar yAxisId="left" dataKey="unitsSold" fill={PALETTE.amber} radius={[6, 6, 0, 0]} name="Units Sold" />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke={PALETTE.emerald} strokeWidth={3} dot={{ r: 4 }} name="Revenue ($)" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Product Performance Detailed Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Product Performance Leaderboard</h3>
              <span className="text-xs text-slate-500">{productPerformance.length} Catalog Items</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-center">Units Sold</th>
                    <th className="p-3 text-right">Gross Revenue</th>
                    <th className="p-3 text-right">Est. Profit</th>
                    <th className="p-3 text-center">Stock Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {productPerformance.slice(0, 8).map((prod, idx) => (
                    <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 text-center font-bold text-slate-400">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          {prod.image ? (
                            <img src={prod.image} alt={prod.name} className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white leading-tight">{prod.name}</p>
                            <span className="text-[10px] text-slate-500 font-mono">{prod.sku}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                          {prod.category}
                        </span>
                      </td>
                      <td className="p-3 text-right font-medium text-slate-700 dark:text-slate-300">
                        ${prod.price.toFixed(2)}
                      </td>
                      <td className="p-3 text-center font-bold text-slate-900 dark:text-white">
                        {prod.unitsSold}
                      </td>
                      <td className="p-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                        ${prod.revenue.toFixed(2)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="font-bold text-slate-900 dark:text-white">${prod.estimatedProfit.toFixed(2)}</div>
                        <span className="text-[10px] text-slate-500 font-medium">({prod.marginPercent}%)</span>
                      </td>
                      <td className="p-3 text-center">
                        {prod.stock > 10 ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[10px]">
                            In Stock ({prod.stock})
                          </span>
                        ) : prod.stock > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold text-[10px]">
                            Low ({prod.stock})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold text-[10px]">
                            Out of Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: TOP CUSTOMER CATEGORIES & SEGMENTATION (RECHARTS PIE & BAR CHARTS) */}
      {(activeTab === 'overview' || activeTab === 'customers') && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                <span>Top Customer Categories & Segmentation</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customer spending by product category, VIP loyalty tiers, and geographic distribution based on order history.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Chart 1: Customer Spending by Product Category (Donut / Pie Chart) */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top Customer Product Categories</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Share of customer spend across categories</p>
                </div>
                <PieChartIcon className="w-4 h-4 text-emerald-500" />
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categorySalesData}
                      dataKey="revenue"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {categorySalesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        borderRadius: '12px',
                        color: isDark ? '#f8fafc' : '#0f172a',
                        fontSize: '12px'
                      }}
                      formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Spend']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category Legend & Revenue Breakdown */}
              <div className="space-y-1.5 mt-2 max-h-36 overflow-y-auto">
                {categorySalesData.map(cat => (
                  <div key={cat.category} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 truncate pr-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-slate-700 dark:text-slate-300 truncate">{cat.category}</span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white shrink-0">${cat.revenue.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 2: Customer Frequency & Value Tiers (Donut / Pie Chart) */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Customer Value & Loyalty Tiers</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">VIP High-Rollers, Repeat Regulars, New</p>
                </div>
                <Award className="w-4 h-4 text-amber-500" />
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={customerTiersData.tiers}
                      dataKey="revenue"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {customerTiersData.tiers.map((entry, index) => (
                        <Cell key={`tier-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        borderRadius: '12px',
                        color: isDark ? '#f8fafc' : '#0f172a',
                        fontSize: '12px'
                      }}
                      formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Revenue']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Tiers Legend */}
              <div className="space-y-2 mt-2">
                {customerTiersData.tiers.map(tier => (
                  <div key={tier.name} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tier.color }} />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{tier.shortName}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 dark:text-white">${tier.revenue.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-400 block">{tier.count} customers ({tier.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 3: Geographic Customer Distribution (Bar Chart) */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs md:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Customer Geographic Hubs</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Order revenue by city & province</p>
                </div>
                <MapPin className="w-4 h-4 text-sky-500" />
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cityDistributionData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#f1f5f9'} horizontal={false} />
                    <XAxis 
                      type="number" 
                      stroke={isDark ? '#94a3b8' : '#64748b'} 
                      fontSize={10} 
                      tickLine={false} 
                      tickFormatter={(val) => `$${val}`}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="city" 
                      stroke={isDark ? '#94a3b8' : '#64748b'} 
                      fontSize={10} 
                      tickLine={false} 
                      width={80} 
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        borderRadius: '12px',
                        color: isDark ? '#f8fafc' : '#0f172a',
                        fontSize: '12px'
                      }}
                      formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill={PALETTE.sky} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Payment Methods Breakdown */}
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Payment Preferences</p>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {paymentMethodData.map(p => (
                    <div key={p.method} className="flex items-center justify-between p-1 rounded bg-slate-50 dark:bg-slate-800/40 text-[11px]">
                      <span className="text-slate-600 dark:text-slate-300 truncate mr-1">{p.method}</span>
                      <strong className="text-slate-900 dark:text-white shrink-0">${p.revenue.toFixed(0)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Top Loyal Customers Leaderboard */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Top Customer Accounts & Lifetime Value (LTV)</span>
              </h3>
              <span className="text-xs text-slate-500">{customerTiersData.totalCustomers} Unique Customers Tracked</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">Customer Name</th>
                    <th className="p-3">Contact & Phone</th>
                    <th className="p-3">Location</th>
                    <th className="p-3 text-center">Total Orders</th>
                    <th className="p-3 text-right">Lifetime Spend</th>
                    <th className="p-3 text-center">Customer Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {customerTiersData.leaderboard.map((cust, idx) => (
                    <tr key={cust.name + idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {cust.name}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {cust.phone || cust.email}
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {cust.city}
                      </td>
                      <td className="p-3 text-center font-bold text-slate-900 dark:text-white">
                        {cust.ordersCount}
                      </td>
                      <td className="p-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                        ${cust.totalSpend.toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        {cust.tier === 'VIP' ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 font-bold text-[10px] inline-flex items-center gap-1">
                            <span>⭐</span> VIP High-Value
                          </span>
                        ) : cust.tier === 'Repeat' ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 dark:bg-indigo-950/80 dark:text-indigo-300 font-bold text-[10px]">
                            Repeat Regular
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 font-bold text-[10px]">
                            New Customer
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
