"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { platformApi } from "@/lib/app-platform/api";
import { usePlatformAuth } from "@/lib/app-platform/auth";
import { VendorAnalyticsSummary, VendorPixelConfig } from "@/lib/app-platform/types";
import {
  BarChart3,
  TrendingUp,
  Target,
  DollarSign,
  ShoppingCart,
  Users,
  Eye,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  ExternalLink,
  Smartphone,
  Laptop,
  Tablet,
  Globe,
  Share2,
  MessageCircle,
  Percent,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  Zap,
} from "lucide-react";
import CustomDomainTab from "./CustomDomainTab";

type AnalyticsTab = "performance" | "pixels" | "domain";
type DateRange = "7d" | "30d" | "90d" | "all";

export default function AnalyticsClient() {
  const { user } = usePlatformAuth();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("performance");
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const [analytics, setAnalytics] = useState<VendorAnalyticsSummary | null>(null);
  const [pixels, setPixels] = useState<VendorPixelConfig>({
    meta_pixel_id: "",
    gtm_id: "",
    ga4_id: "",
    tracking_enabled: true,
  });

  const [loading, setLoading] = useState(true);
  const [savingPixels, setSavingPixels] = useState(false);
  const [testingEvent, setTestingEvent] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async (range: DateRange = dateRange) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [analyticsData, pixelData] = await Promise.all([
        platformApi.getVendorAnalytics(range),
        platformApi.getVendorPixelConfig(),
      ]);
      setAnalytics(analyticsData);
      setPixels({
        meta_pixel_id: pixelData?.meta_pixel_id || "",
        gtm_id: pixelData?.gtm_id || "",
        ga4_id: pixelData?.ga4_id || "",
        tracking_enabled: pixelData?.tracking_enabled ?? true,
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(dateRange);
  }, [dateRange]);

  const handleSavePixels = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPixels(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const updated = await platformApi.updateVendorPixelConfig({
        meta_pixel_id: pixels.meta_pixel_id?.trim() || "",
        gtm_id: pixels.gtm_id?.trim() || "",
        ga4_id: pixels.ga4_id?.trim() || "",
        tracking_enabled: pixels.tracking_enabled,
      });
      setPixels({
        meta_pixel_id: updated.meta_pixel_id || "",
        gtm_id: updated.gtm_id || "",
        ga4_id: updated.ga4_id || "",
        tracking_enabled: updated.tracking_enabled,
      });
      setSuccessMsg("Tracking pixel settings saved successfully! Storefront tags are now live.");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update pixel configurations");
    } finally {
      setSavingPixels(false);
    }
  };

  const handleSendTestEvent = async (eventName: string = "test_event") => {
    if (!user?.store_slug) return;
    setTestingEvent(true);
    setTestResult(null);
    try {
      await platformApi.trackStoreEvent(user.store_slug, {
        event_type: eventName,
        product_name: "Test Diagnostic Probe",
        value: 100,
      });
      setTestResult(`Event "${eventName}" dispatched successfully to internal data pipeline & verified!`);
      // Reload analytics to reflect test event
      loadData(dateRange);
    } catch (e: any) {
      setTestResult("Test dispatch encountered an error. Check store slug configuration.");
    } finally {
      setTestingEvent(false);
    }
  };

  const storeSlug = user?.store_slug || "kcaariwork";
  const publicStoreUrl = `/app/store/${storeSlug}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Analytics & Tracking Pixels</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time sales performance, conversion funnels, and marketing tag integrations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Selector */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            {(["7d", "30d", "90d", "all"] as DateRange[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  dateRange === r
                    ? "bg-white text-blue-600 shadow-xs font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : r === "90d" ? "90 Days" : "All Time"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => loadData(dateRange)}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <Link
            href={publicStoreUrl}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs"
          >
            <span>Live Store</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab("performance")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "performance"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Store Performance & Sales Funnel</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pixels")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "pixels"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Pixel & Tag Tracking (Meta, GA4, GTM)</span>
          {(pixels.meta_pixel_id || pixels.ga4_id || pixels.gtm_id) && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("domain")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "domain"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Custom Domain & DNS Setup</span>
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 1: STORE PERFORMANCE & FUNNEL */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === "performance" && (
        <div className="space-y-6">
          {/* 4 Hero KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Gross Sales */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Gross Revenue</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                ₹{(analytics?.gross_revenue || 0).toLocaleString("en-IN")}
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 text-slate-500">
                <span>Orders: <strong className="text-slate-900">{analytics?.total_orders || 0}</strong></span>
                <span>Net: <strong className="text-emerald-700">₹{(analytics?.net_revenue || 0).toLocaleString("en-IN")}</strong></span>
              </div>
            </div>

            {/* Card 2: Conversion Rate */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Store Conversion Rate</span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-blue-600 font-mono">
                {analytics?.conversion_rate || 0}%
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 text-slate-500">
                <span>Add to Cart: <strong className="text-slate-900">{analytics?.add_to_cart_rate || 0}%</strong></span>
                <span>Checkout: <strong className="text-slate-900">{analytics?.checkout_rate || 0}%</strong></span>
              </div>
            </div>

            {/* Card 3: Average Order Value (AOV) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Average Order Value</span>
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                ₹{(analytics?.average_order_value || 0).toLocaleString("en-IN")}
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 text-slate-500">
                <span>Units Sold: <strong className="text-slate-900">{analytics?.total_units_sold || 0}</strong></span>
                <span>Per Order: <strong className="text-purple-700">{analytics?.total_orders ? (analytics.total_units_sold / analytics.total_orders).toFixed(1) : 0}</strong></span>
              </div>
            </div>

            {/* Card 4: Store Traffic & Leads */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Store Traffic & Leads</span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {(analytics?.store_visits || 0).toLocaleString("en-IN")} <span className="text-xs font-normal text-slate-500">visits</span>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 text-slate-500">
                <span>Views: <strong className="text-slate-900">{analytics?.product_views || 0}</strong></span>
                <span>WhatsApp: <strong className="text-emerald-700">{analytics?.whatsapp_clicks || 0} clicks</strong></span>
              </div>
            </div>
          </div>

          {/* Full Conversion Funnel Visualization */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  Full Customer Conversion Funnel
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track shopper progression and pinpoint where customers drop off across the buying journey.
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Overall: {analytics?.conversion_rate || 0}% Conversion
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {(analytics?.funnel_steps || []).map((step, idx) => {
                const colors = [
                  "bg-blue-600",
                  "bg-indigo-600",
                  "bg-amber-500",
                  "bg-purple-600",
                  "bg-emerald-600",
                ];
                const color = colors[idx % colors.length];

                return (
                  <div key={step.stage} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 font-bold text-[10px] flex items-center justify-center text-slate-700">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-800">{step.stage}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-900">{step.count.toLocaleString("en-IN")}</span>
                        <span className="font-mono text-[11px] text-slate-500 w-12 text-right">
                          {step.percentage}%
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${color}`}
                        style={{ width: `${Math.max(2, Math.min(100, step.percentage))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 30-Day Sales & Traffic Trend Visualization */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Sales & Revenue Timeline
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daily sales volume and store engagement trends.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-3 h-3 rounded bg-blue-600" />
                  Sales (₹)
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-3 h-3 rounded bg-emerald-500" />
                  Visits
                </span>
              </div>
            </div>

            {/* Simple Bar Chart */}
            <div className="pt-4">
              {analytics?.sales_trend && analytics.sales_trend.length > 0 ? (
                <div className="h-48 flex items-end gap-2 sm:gap-4 overflow-x-auto pb-4 pt-2 border-b border-slate-200">
                  {(() => {
                    const maxVal = Math.max(...analytics.sales_trend.map((s) => s.sales), 1000);
                    return analytics.sales_trend.map((item, idx) => {
                      const heightPercent = Math.max(10, Math.min(100, Math.round((item.sales / maxVal) * 100)));
                      const displayDate = item.date.slice(5); // MM-DD
                      return (
                        <div key={idx} className="flex-1 min-w-[38px] flex flex-col items-center gap-2 group relative">
                          {/* Tooltip */}
                          <div className="absolute -top-12 bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                            <p className="font-bold">₹{item.sales.toLocaleString("en-IN")}</p>
                            <p className="text-slate-300">{item.orders} orders · {item.visits} visits</p>
                          </div>
                          {/* Bar */}
                          <div className="w-full bg-slate-100 rounded-t-lg h-36 flex items-end justify-center p-1">
                            <div
                              className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-md transition-all group-hover:from-blue-500 group-hover:to-indigo-400"
                              style={{ height: `${heightPercent}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono truncate">{displayDate}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  No sales timeline data available for this range.
                </div>
              )}
            </div>
          </div>

          {/* 2-Column Grid: Top Products & Traffic Attribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Top Performing Products */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-purple-600" />
                  Top Performing Products
                </h2>
                <span className="text-[11px] text-slate-500">By Revenue</span>
              </div>

              <div className="divide-y divide-slate-100">
                {(analytics?.top_products || []).length > 0 ? (
                  analytics?.top_products.map((p, i) => (
                    <div key={p.id || i} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                          #{i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {p.units_sold} units sold · {p.views} views
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono font-bold text-slate-900">₹{p.revenue.toLocaleString("en-IN")}</p>
                        <span className="text-[10px] text-emerald-600 font-semibold">{p.conversion_rate}% conv</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No product sales recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* Right: Traffic Attribution & Device Breakdown */}
            <div className="space-y-6">
              {/* Traffic Sources */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-600" />
                    Traffic Source Attribution
                  </h2>
                  <span className="text-[11px] text-slate-500">Channel Share</span>
                </div>

                <div className="space-y-3">
                  {(analytics?.traffic_sources || []).map((source) => (
                    <div key={source.source} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">{source.source}</span>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-slate-900 font-bold">{source.visits} visits</span>
                          <span className="text-slate-400">({source.percentage}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full"
                          style={{ width: `${Math.min(100, source.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Device Breakdown */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    Device Breakdown
                  </h2>
                  <span className="text-[11px] text-slate-500">Mobile First</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {(analytics?.device_breakdown || []).map((d) => {
                    const isMobile = d.device.toLowerCase().includes("mobile");
                    const isDesktop = d.device.toLowerCase().includes("desktop");
                    return (
                      <div key={d.device} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center space-y-1">
                        <div className="w-7 h-7 rounded-lg bg-white shadow-2xs flex items-center justify-center mx-auto text-slate-700">
                          {isMobile ? <Smartphone className="w-4 h-4" /> : isDesktop ? <Laptop className="w-4 h-4" /> : <Tablet className="w-4 h-4" />}
                        </div>
                        <p className="text-[11px] font-medium text-slate-600 truncate">{d.device}</p>
                        <p className="text-base font-black text-slate-900 font-mono">{d.percentage}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Customer Geographic Demand */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-600" />
              Customer Geographic Demand (Top Cities)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {(analytics?.customer_locations || []).map((loc) => (
                <div key={loc.city} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <p className="text-xs font-bold text-slate-900">{loc.city}</p>
                  <p className="text-[11px] text-slate-500">{loc.orders} orders placed</p>
                  <p className="text-xs font-mono font-bold text-emerald-700">₹{loc.revenue.toLocaleString("en-IN")}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 2: PIXEL & TAG TRACKING */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === "pixels" && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-950 p-6 rounded-2xl text-white space-y-3 shadow-md">
            <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Omnichannel Event Tracking Suite</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold">
              Connect Meta Pixel, Google Tag Manager & Google Analytics 4
            </h2>
            <p className="text-xs text-blue-100/80 max-w-2xl leading-relaxed">
              Once connected, your store automatically fires real-time conversion events (PageView, ViewContent, AddToCart, AddToWishlist, InitiateCheckout, Purchase, and WhatsApp chats) to optimize your Meta/Instagram Ad campaigns and Google Ads ROAS.
            </p>

            {/* Status Pills */}
            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xs border border-white/20">
                <span className={`w-2 h-2 rounded-full ${pixels.meta_pixel_id ? "bg-emerald-400 animate-pulse" : "bg-slate-400"}`} />
                <span>Meta Pixel: {pixels.meta_pixel_id ? "Connected" : "Not Set"}</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xs border border-white/20">
                <span className={`w-2 h-2 rounded-full ${pixels.ga4_id ? "bg-emerald-400 animate-pulse" : "bg-slate-400"}`} />
                <span>Google Analytics 4: {pixels.ga4_id ? "Connected" : "Not Set"}</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xs border border-white/20">
                <span className={`w-2 h-2 rounded-full ${pixels.gtm_id ? "bg-emerald-400 animate-pulse" : "bg-slate-400"}`} />
                <span>Google Tag Manager: {pixels.gtm_id ? "Connected" : "Not Set"}</span>
              </div>
            </div>
          </div>

          {/* Configuration Form */}
          <form onSubmit={handleSavePixels} className="space-y-6">
            {/* Master Tracking Switch */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Enable Storefront Event Tracking</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  When enabled, all pixel tracking tags fire across your store pages and checkout.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={pixels.tracking_enabled}
                  onChange={(e) => setPixels({ ...pixels, tracking_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
              </label>
            </div>

            {/* 3 Main Integration Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 1. Meta Pixel */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      f
                    </div>
                    {pixels.meta_pixel_id ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        Optional
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Meta Pixel (Facebook & Instagram)</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Tracks conversions from Instagram and Facebook ads. Enables Lookalike audiences and catalog sales retargeting.
                  </p>

                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-semibold text-slate-700">Meta Pixel ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 123456789012345"
                      value={pixels.meta_pixel_id || ""}
                      onChange={(e) => setPixels({ ...pixels, meta_pixel_id: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <p className="text-[10px] text-slate-400">
                      Find in Meta Events Manager &gt; Data Sources &gt; Pixel ID.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">Automatically Tracked Events:</p>
                  <p className="text-[10px] text-slate-500">
                    PageView, ViewContent, AddToCart, AddToWishlist, InitiateCheckout, Purchase, WhatsApp Click
                  </p>
                </div>
              </div>

              {/* 2. Google Analytics 4 */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      G
                    </div>
                    {pixels.ga4_id ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        Optional
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Google Analytics 4 (GA4)</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Industry standard web analytics tracking session metrics, bounce rates, customer traffic acquisition, and e-commerce transactions.
                  </p>

                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-semibold text-slate-700">GA4 Measurement ID</label>
                    <input
                      type="text"
                      placeholder="e.g. G-ABC123XYZ"
                      value={pixels.ga4_id || ""}
                      onChange={(e) => setPixels({ ...pixels, ga4_id: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <p className="text-[10px] text-slate-400">
                      Find in GA4 Admin &gt; Data Streams &gt; Web Stream ID.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">GA4 E-Commerce Events:</p>
                  <p className="text-[10px] text-slate-500">
                    page_view, view_item, add_to_cart, begin_checkout, purchase, whatsapp_chat_click
                  </p>
                </div>
              </div>

              {/* 3. Google Tag Manager */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                      GTM
                    </div>
                    {pixels.gtm_id ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        Optional
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Google Tag Manager (GTM)</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Deploy custom marketing pixels, hotjar, affiliate links, and custom remarketing scripts without writing any code.
                  </p>

                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-semibold text-slate-700">GTM Container ID</label>
                    <input
                      type="text"
                      placeholder="e.g. GTM-XXXXXXX"
                      value={pixels.gtm_id || ""}
                      onChange={(e) => setPixels({ ...pixels, gtm_id: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <p className="text-[10px] text-slate-400">
                      Find in Tag Manager Header (format: GTM-XXXXXXX).
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">dataLayer Integration:</p>
                  <p className="text-[10px] text-slate-500">
                    Pushes full e-commerce payload to window.dataLayer for each conversion action.
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingPixels}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{savingPixels ? "Saving Settings..." : "Save Pixel Configurations"}</span>
              </button>
            </div>
          </form>

          {/* Live Test Event Simulator & Diagnostics */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Live Event Simulator & Pixel Diagnostics
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dispatch a real test event to verify your backend telemetry and pixel tracking pipeline.
              </p>
            </div>

            {testResult && (
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600" />
                <span>{testResult}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleSendTestEvent("page_view")}
                disabled={testingEvent}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {testingEvent ? "Dispatching..." : "Simulate PageView Event"}
              </button>
              <button
                type="button"
                onClick={() => handleSendTestEvent("add_to_cart")}
                disabled={testingEvent}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {testingEvent ? "Dispatching..." : "Simulate AddToCart Event"}
              </button>
              <button
                type="button"
                onClick={() => handleSendTestEvent("whatsapp_click")}
                disabled={testingEvent}
                className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {testingEvent ? "Dispatching..." : "Simulate WhatsApp Lead Click"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 3: CUSTOM DOMAIN & DNS SETUP */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === "domain" && (
        <CustomDomainTab
          onSuccessNotification={(msg) => setSuccessMsg(msg)}
          onErrorNotification={(msg) => setErrorMsg(msg)}
        />
      )}
    </div>
  );
}

