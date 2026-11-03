"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { platformApi } from "@/lib/app-platform/api";
import {
  AdminDetailedAnalytics,
  AdminVendorSalesPerformance,
  AdminTopSellingProduct,
  AdminCategoryDistribution,
  AdminVendorOnboardingTrend,
} from "@/lib/app-platform/types";
import {
  TrendingUp,
  Users,
  Package,
  ShoppingCart,
  Award,
  Search,
  Filter,
  ArrowUpRight,
  ExternalLink,
  Eye,
  MessageCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Layers,
  Store,
  Flame,
  Globe,
  Radio,
  BarChart3,
  Sparkles,
  Phone,
  Mail,
  SlidersHorizontal,
} from "lucide-react";

export default function AdminAnalyticsClient() {
  const [data, setData] = useState<AdminDetailedAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<string>("30d");
  const [searchQuery, setSearchQuery] = useState("");
  const [salesFilter, setSalesFilter] = useState<"all" | "with_sales" | "no_sales">("all");
  const [sortBy, setSortBy] = useState<"revenue" | "units" | "orders" | "products" | "visits">("revenue");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  async function loadAnalytics(range: string = dateRange, showRefreshSpinner = false) {
    if (showRefreshSpinner) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await platformApi.getAdminDetailedAnalytics(range);
      setData(res);
    } catch (err) {
      console.error("Failed to load admin analytics:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAnalytics(dateRange);
  }, [dateRange]);

  // Filter and sort vendor leaderboard
  const filteredVendors = useMemo(() => {
    if (!data?.vendor_leaderboard) return [];

    return data.vendor_leaderboard
      .filter((v) => {
        // Sales status filter
        if (salesFilter === "with_sales" && !v.has_sales) return false;
        if (salesFilter === "no_sales" && v.has_sales) return false;

        // Text search
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          v.vendor_code.toLowerCase().includes(q) ||
          v.business_name.toLowerCase().includes(q) ||
          v.owner_name.toLowerCase().includes(q) ||
          v.store_slug.toLowerCase().includes(q) ||
          v.email.toLowerCase().includes(q) ||
          v.phone.includes(q)
        );
      })
      .sort((a, b) => {
        let fieldA = 0;
        let fieldB = 0;

        switch (sortBy) {
          case "revenue":
            fieldA = a.gross_revenue_inr;
            fieldB = b.gross_revenue_inr;
            break;
          case "units":
            fieldA = a.units_sold;
            fieldB = b.units_sold;
            break;
          case "orders":
            fieldA = a.total_orders;
            fieldB = b.total_orders;
            break;
          case "products":
            fieldA = a.total_products;
            fieldB = b.total_products;
            break;
          case "visits":
            fieldA = a.store_visits;
            fieldB = b.store_visits;
            break;
        }

        return sortDirection === "desc" ? fieldB - fieldA : fieldA - fieldB;
      });
  }, [data, salesFilter, searchQuery, sortBy, sortDirection]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
        <div className="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-700">Aggregating platform catalog & sales intelligence...</p>
        <p className="text-xs text-slate-400 mt-1">Calculating multi-vendor metrics, revenue rankings, and catalog analytics</p>
      </div>
    );
  }

  const topRevVendor = data?.top_vendor_by_revenue;
  const topUnitsVendor = data?.top_vendor_by_units;

  return (
    <div className="space-y-8 pb-12 w-full max-w-full overflow-x-hidden">
      {/* ────────────────────────────────────────────── */}
      {/* 1. Header & Controls */}
      {/* ────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 rounded-2xl p-6 md:p-8 text-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 border border-purple-900/40">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-400/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Platform Intelligence Center
            </span>
            <span className="text-xs text-purple-300 font-medium hidden sm:inline">• Live Multi-Vendor Aggregation</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Platform Sales & Vendor Analytics</h1>
          <p className="mt-1 text-sm text-purple-200/90 max-w-2xl">
            Real-time tracking of vendor onboarding, catalog inventory, sales leaderboards, maximum volume sellers, and marketing pixel adoption.
          </p>
        </div>

        {/* Date Filter & Refresh */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-white/10 p-1.5 rounded-xl border border-white/10">
          <div className="flex items-center gap-1">
            {[
              { id: "7d", label: "Last 7 Days" },
              { id: "30d", label: "Last 30 Days" },
              { id: "90d", label: "Last 90 Days" },
              { id: "all", label: "All Time" },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setDateRange(btn.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  dateRange === btn.id
                    ? "bg-purple-600 text-white shadow-sm font-bold"
                    : "text-purple-200 hover:text-white hover:bg-white/5"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => loadAnalytics(dateRange, true)}
            disabled={refreshing}
            className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors border-l border-white/15 pl-2.5 ml-1"
            title="Refresh Platform Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-amber-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────── */}
      {/* 2. Spotlight Leaderboards: Top Revenue & Max Products Sold */}
      {/* ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Top Vendor by Revenue */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white border border-amber-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              #1 Vendor by Revenue
            </span>
            <span className="text-xs font-semibold text-slate-500">Gross Sales</span>
          </div>

          {topRevVendor && topRevVendor.gross_revenue_inr > 0 ? (
            <div className="space-y-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-black text-slate-900">
                    ₹{topRevVendor.gross_revenue_inr.toLocaleString("en-IN")}
                  </p>
                  <span className="text-xs font-semibold text-emerald-600">
                    {topRevVendor.total_orders} order{topRevVendor.total_orders === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                    {topRevVendor.vendor_code}
                  </span>
                  <p className="text-sm font-bold text-slate-800 truncate">{topRevVendor.business_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-white/70 p-2.5 rounded-xl border border-amber-100">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Owner</span>
                  <span className="font-semibold text-slate-700 truncate block">{topRevVendor.owner_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Avg Order Value</span>
                  <span className="font-semibold text-slate-900">₹{topRevVendor.average_order_value_inr.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-500">
                  Last sale: <span className="font-medium text-slate-700">{topRevVendor.last_sale_date || "Recent"}</span>
                </span>
                <Link
                  href={`/app/admin/vendors/${topRevVendor.vendor_id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 hover:underline"
                >
                  Manage Vendor <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm font-medium text-slate-500">No vendor orders recorded yet</p>
              <p className="text-xs text-slate-400 mt-1">Sales will rank vendors as customer orders are placed</p>
            </div>
          )}
        </div>

        {/* Top Vendor by Volume (Sold Maximum Products) */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white border border-emerald-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
              <Flame className="w-3.5 h-3.5 text-emerald-600" />
              #1 Vendor by Units Sold
            </span>
            <span className="text-xs font-semibold text-slate-500">Max Products Sold</span>
          </div>

          {topUnitsVendor && topUnitsVendor.units_sold > 0 ? (
            <div className="space-y-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-black text-slate-900">
                    {topUnitsVendor.units_sold} <span className="text-base font-bold text-slate-600">Units Sold</span>
                  </p>
                  <span className="text-xs font-semibold text-purple-700">
                    {topUnitsVendor.total_products} listed
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                    {topUnitsVendor.vendor_code}
                  </span>
                  <p className="text-sm font-bold text-slate-800 truncate">{topUnitsVendor.business_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-white/70 p-2.5 rounded-xl border border-emerald-100">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Orders</span>
                  <span className="font-semibold text-slate-900">{topUnitsVendor.total_orders} orders</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Gross Volume</span>
                  <span className="font-semibold text-slate-900">₹{topUnitsVendor.gross_revenue_inr.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-500">
                  Conv. Rate: <span className="font-semibold text-emerald-700">{topUnitsVendor.conversion_rate}%</span>
                </span>
                <Link
                  href={`/app/admin/vendors/${topUnitsVendor.vendor_id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
                >
                  Manage Vendor <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm font-medium text-slate-500">No products sold across vendors yet</p>
              <p className="text-xs text-slate-400 mt-1">Volume leaderboards update with checkout conversions</p>
            </div>
          )}
        </div>

        {/* Marketing Tracking Adoption */}
        <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-white border border-indigo-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
              <Radio className="w-3.5 h-3.5 text-indigo-600" />
              Omnichannel Tracking
            </span>
            <span className="text-xs font-semibold text-indigo-600">Ad & Pixel Stack</span>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-2xl font-black text-slate-900">
                {(data?.total_tracking_events_logged || 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Total storefront analytics events logged platform-wide</p>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  Meta Pixel (FB/IG Ads)
                </span>
                <span className="font-bold text-slate-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {data?.meta_pixels_connected || 0} stores
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Google Analytics 4 (GA4)
                </span>
                <span className="font-bold text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {data?.ga4_connected || 0} stores
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Google Tag Manager (GTM)
                </span>
                <span className="font-bold text-slate-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {data?.gtm_connected || 0} stores
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────── */}
      {/* 3. Core Platform KPIs: 4 Main Pillars */}
      {/* ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Vendors Onboarded */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Vendors Onboarded</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{data?.total_vendors || 0}</div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              {data?.active_vendors || 0} Active
            </span>
            <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              {data?.trial_vendors || 0} Trial
            </span>
            <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
              {data?.inactive_vendors || 0} Inactive
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            <strong className="text-purple-700">{data?.vendors_with_sales || 0}</strong> with sales •{" "}
            <span>{data?.vendors_without_sales || 0} zero sales yet</span>
          </p>
        </div>

        {/* KPI 2: Products Listed Platform-Wide */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Products Listed</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{data?.total_products || 0}</div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              {data?.in_stock_products || 0} In Stock
            </span>
            <span className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              {data?.out_of_stock_products || 0} Out of Stock
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Avg <strong className="text-slate-800">{data?.avg_products_per_vendor || 0}</strong> products per vendor catalog
          </p>
        </div>

        {/* KPI 3: Gross Merchandise Value (GMV) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Platform GMV (Revenue)</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₹{(data?.total_platform_gmv_inr || 0).toLocaleString("en-IN")}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Platform AOV:</span>
            <strong className="text-slate-900 font-bold">
              ₹{(data?.platform_average_order_value_inr || 0).toLocaleString("en-IN")}
            </strong>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Across {data?.total_orders_platform || 0} completed transactions
          </p>
        </div>

        {/* KPI 4: Orders & Engagement */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Orders & Units Sold</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {data?.total_units_sold_platform || 0} <span className="text-sm font-semibold text-slate-500">units</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Storefront Visits:</span>
            <strong className="text-slate-900 font-bold">
              {(data?.total_store_visits || 0).toLocaleString()}
            </strong>
          </div>
          <p className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>WhatsApp Leads:</span>
            <strong className="text-emerald-700 font-bold">
              {data?.total_whatsapp_leads || 0} clicks
            </strong>
          </p>
        </div>
      </div>

      {/* ────────────────────────────────────────────── */}
      {/* 4. Detailed Vendor Leaderboard & Sales Performance */}
      {/* ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-5 md:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Vendor Sales & Performance Leaderboard</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                {filteredVendors.length} of {data?.total_vendors || 0} Vendors
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Detailed tracking of sales volume, units sold, products listed, store visits, and revenue per vendor.
            </p>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search vendor, code, store..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-600"
              >
                <option value="revenue">Gross Revenue (₹)</option>
                <option value="units">Units Sold (Volume)</option>
                <option value="orders">Total Orders</option>
                <option value="products">Products Listed</option>
                <option value="visits">Store Visits</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100 bg-white">
          <button
            onClick={() => setSalesFilter("all")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
              salesFilter === "all"
                ? "bg-purple-600 text-white"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            All Vendors ({data?.total_vendors || 0})
          </button>
          <button
            onClick={() => setSalesFilter("with_sales")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              salesFilter === "with_sales"
                ? "bg-emerald-600 text-white"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Vendors with Sales ({data?.vendors_with_sales || 0})
          </button>
          <button
            onClick={() => setSalesFilter("no_sales")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              salesFilter === "no_sales"
                ? "bg-amber-600 text-white"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Zero Sales Yet ({data?.vendors_without_sales || 0})
          </button>
        </div>

        {/* Leaderboard Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Vendor ID</th>
                <th className="py-3 px-4">Store / Business Name</th>
                <th className="py-3 px-4">Owner Contact</th>
                <th className="py-3 px-4 text-center">Catalog</th>
                <th className="py-3 px-4 text-right">Orders</th>
                <th className="py-3 px-4 text-right">Units Sold</th>
                <th className="py-3 px-4 text-right">Gross Revenue</th>
                <th className="py-3 px-4 text-right">AOV</th>
                <th className="py-3 px-4 text-center">Visits / Conv%</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredVendors.length > 0 ? (
                filteredVendors.map((vendor, idx) => {
                  const isTopRevenue = topRevVendor?.vendor_id === vendor.vendor_id && vendor.gross_revenue_inr > 0;
                  const isTopUnits = topUnitsVendor?.vendor_id === vendor.vendor_id && vendor.units_sold > 0;

                  return (
                    <tr
                      key={vendor.vendor_id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isTopRevenue ? "bg-amber-50/20" : isTopUnits ? "bg-emerald-50/20" : ""
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3 px-4 font-bold">
                        {idx === 0 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-slate-950 text-xs font-black">
                            1
                          </span>
                        ) : idx === 1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-900 text-xs font-bold">
                            2
                          </span>
                        ) : idx === 2 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20 text-amber-900 text-xs font-bold">
                            3
                          </span>
                        ) : (
                          <span className="text-slate-400 font-semibold pl-2">#{idx + 1}</span>
                        )}
                      </td>

                      {/* Vendor Code */}
                      <td className="py-3 px-4 font-mono font-bold text-purple-700">
                        {vendor.vendor_code}
                      </td>

                      {/* Store & Subdomain */}
                      <td className="py-3 px-4 max-w-[220px]">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-900 truncate">{vendor.business_name}</p>
                          {isTopRevenue && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                              ₹ Top
                            </span>
                          )}
                          {isTopUnits && !isTopRevenue && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              🔥 Volume
                            </span>
                          )}
                        </div>
                        {vendor.subdomain && (
                          <a
                            href={`https://${vendor.subdomain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <span>{vendor.subdomain}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </td>

                      {/* Owner Contact */}
                      <td className="py-3 px-4 max-w-[180px]">
                        <p className="font-semibold text-slate-800 truncate">{vendor.owner_name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          {vendor.phone && (
                            <span className="flex items-center gap-0.5 truncate">
                              <Phone className="w-2.5 h-2.5 text-slate-400" />
                              {vendor.phone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Products */}
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-slate-900">{vendor.total_products}</span>
                        <span className="text-[10px] text-slate-500 block">
                          ({vendor.in_stock_products} in-stock)
                        </span>
                      </td>

                      {/* Orders */}
                      <td className="py-3 px-4 text-right font-bold text-slate-800">
                        {vendor.total_orders}
                      </td>

                      {/* Units Sold */}
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-black ${
                            vendor.units_sold > 0 ? "text-emerald-700" : "text-slate-400"
                          }`}
                        >
                          {vendor.units_sold}
                        </span>
                      </td>

                      {/* Gross Revenue */}
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-black ${
                            vendor.gross_revenue_inr > 0 ? "text-slate-900" : "text-slate-400"
                          }`}
                        >
                          ₹{vendor.gross_revenue_inr.toLocaleString("en-IN")}
                        </span>
                      </td>

                      {/* AOV */}
                      <td className="py-3 px-4 text-right text-slate-600 font-medium">
                        {vendor.average_order_value_inr > 0
                          ? `₹${vendor.average_order_value_inr.toLocaleString("en-IN")}`
                          : "—"}
                      </td>

                      {/* Visits & Conversion */}
                      <td className="py-3 px-4 text-center">
                        <span className="font-semibold text-slate-800">{vendor.store_visits} visits</span>
                        <span className="text-[10px] text-slate-500 block">
                          {vendor.conversion_rate > 0 ? `${vendor.conversion_rate}% conv.` : "0% conv."}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            vendor.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : vendor.status === "trial"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {vendor.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/app/admin/vendors/${vendor.vendor_id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-500">
                    No vendors matching filter criteria &quot;{searchQuery}&quot;
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ────────────────────────────────────────────── */}
      {/* 5. Top 10 Best-Selling Products Platform-Wide */}
      {/* ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 md:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              Top 10 Best-Selling Products Platform-Wide
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Cross-store catalog leaderboard showing highest-converting individual products across all vendors.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">Ranked by Units Sold</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Vendor & Store</th>
                <th className="py-3 px-4 text-right">Price</th>
                <th className="py-3 px-4 text-center">In Stock</th>
                <th className="py-3 px-4 text-right">Units Sold</th>
                <th className="py-3 px-4 text-right">Revenue Generated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {data?.top_selling_products && data.top_selling_products.length > 0 ? (
                data.top_selling_products.map((prod, idx) => (
                  <tr key={prod.product_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-500">#{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 max-w-[260px] truncate">
                      {prod.product_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-purple-700">{prod.vendor_code}</span>
                      <span className="text-slate-600 ml-1.5">({prod.vendor_business_name})</span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700">
                      ₹{prod.price_inr.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`font-semibold ${
                          prod.stock_quantity > 0 ? "text-emerald-700" : "text-rose-600"
                        }`}
                      >
                        {prod.stock_quantity > 0 ? `${prod.stock_quantity} left` : "Out of stock"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700">
                      {prod.units_sold} units
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      ₹{prod.revenue_inr.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No product purchases logged yet. Best sellers will populate dynamically as transactions occur.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ────────────────────────────────────────────── */}
      {/* 6. Onboarding Trend & Category Distribution */}
      {/* ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 6-Month Vendor Onboarding & Growth Trend */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 md:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                6-Month Vendor Onboarding Growth
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Cumulative vendors and platform GMV progression</p>
            </div>
          </div>

          <div className="space-y-3">
            {data?.growth_trend && data.growth_trend.length > 0 ? (
              data.growth_trend.map((trend) => (
                <div
                  key={trend.period}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800">{trend.period}</span>
                    <span className="text-slate-400 block text-[11px]">
                      +{trend.new_vendors} new vendor{trend.new_vendors === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-purple-700">
                      {trend.total_cumulative_vendors} total vendors
                    </span>
                    <span className="text-slate-500 block text-[11px]">
                      {trend.orders} orders • ₹{trend.gmv_inr.toLocaleString("en-IN")} GMV
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No historical monthly buckets available</p>
            )}
          </div>
        </div>

        {/* Business Category Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 md:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Business Category Breakdown
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Vendor and product distribution across industry verticals</p>
            </div>
          </div>

          <div className="space-y-3">
            {data?.category_distribution && data.category_distribution.length > 0 ? (
              data.category_distribution.map((cat) => (
                <div
                  key={cat.category}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800 capitalize">{cat.category}</span>
                    <span className="text-slate-500 block text-[11px]">
                      {cat.vendor_count} vendor{cat.vendor_count === 1 ? "" : "s"} • {cat.product_count} product{cat.product_count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">
                      ₹{cat.total_revenue_inr.toLocaleString("en-IN")}
                    </span>
                    <span className="text-slate-400 block text-[11px]">Category GMV</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No categorized vendors listed yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

