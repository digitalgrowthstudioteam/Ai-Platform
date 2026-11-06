"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { platformApi } from "@/lib/app-platform/api";
import { VendorListItem } from "@/lib/app-platform/types";
import {
  Layers,
  CreditCard,
  MessageSquare,
  Globe,
  Truck,
  MessageCircle,
  MapPin,
  Search,
  Check,
  Lock,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Zap,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Filter,
  RefreshCw,
} from "lucide-react";

interface AppDefinition {
  code: string;
  name: string;
  category: string;
  icon: any;
  color: string;
  description: string;
  features: string[];
}

const APPS: AppDefinition[] = [
  {
    code: "hyperlocal",
    name: "Hyperlocal Quick-Commerce",
    category: "Quick Commerce & Delivery",
    icon: MapPin,
    color: "from-rose-500 to-amber-600",
    description: "On-demand local radius delivery, GPS geofencing, distance fee slabs, and serviceable pincode restrictions.",
    features: ["Radius Geofencing (1-50 km)", "Live Mobile GPS Check", "Distance-Based Slabs (₹/km)", "Custom Pincode Whitelist"],
  },
  {
    code: "razorpay",
    name: "Razorpay Payments",
    category: "Payment Gateway",
    icon: CreditCard,
    color: "from-blue-600 to-indigo-700",
    description: "Accept instant UPI (GPay, PhonePe, Paytm), Cards, Netbanking & Wallets with automated webhooks.",
    features: ["Instant UPI & QR Code", "Cards & Netbanking", "Merchant Direct Settlements", "Auto Webhook Verification"],
  },
  {
    code: "sms_gateway",
    name: "SMS Gateway Engine",
    category: "Communication",
    icon: MessageSquare,
    color: "from-emerald-600 to-teal-700",
    description: "Multi-provider Indian SMS engine (Fast2SMS, MSG91, Way2SMS) for order alerts, tracking & OTPs.",
    features: ["Way2SMS / Custom HTTP URL", "Fast2SMS Quick & DLT", "Order Placed & Shipped SMS", "Customer OTP Verification"],
  },
  {
    code: "custom_domain",
    name: "Custom Domain & SSL",
    category: "Branding & Hosting",
    icon: Globe,
    color: "from-purple-600 to-violet-800",
    description: "Cloudflare for SaaS edge integration allowing vendors to point apex domains (e.g. kcaariwork.com).",
    features: ["Automated Free SSL", "Apex & Subdomain Support", "Cloudflare Global Edge", "Zero Subdomain Leakage"],
  },
  {
    code: "shiprocket",
    name: "Shiprocket Logistics",
    category: "Fulfillment",
    icon: Truck,
    color: "from-amber-600 to-orange-700",
    description: "Automate Delhivery, Bluedart, India Post courier pickup, label printing, and live AWB tracking.",
    features: ["Multi-Courier Integration", "Auto AWB Generation", "Doorstep Pickup Request", "Real-Time Tracking"],
  },
  {
    code: "whatsapp",
    name: "WhatsApp Notifications",
    category: "Marketing & Alerts",
    icon: MessageCircle,
    color: "from-teal-600 to-emerald-700",
    description: "Automated WhatsApp messages for order dispatch alerts, COD verification, and cart recovery.",
    features: ["Instant Dispatch Alerts", "COD Order Confirmation", "Cart Abandonment Recovery", "1-Click Vendor Chat"],
  },
];

export default function AdminAppCenterPage() {
  const [vendors, setVendors] = useState<VendorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedAppFilter, setSelectedAppFilter] = useState<string>("ALL");
  const [togglingMap, setTogglingMap] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadVendors = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const data = await platformApi.getAdminVendors();
        setVendors(data || []);
        setLoading(false);
        return;
      } catch (err: any) {
        attempts++;
        console.error(`Attempt ${attempts} failed to load vendors for App Center:`, err);
        if (attempts >= maxAttempts) {
          setFetchError(err?.message || "Failed to load vendors from platform server. Click retry to reconnect.");
          setLoading(false);
        } else {
          await new Promise((res) => setTimeout(res, 1500 * attempts));
        }
      }
    }
  }, []);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const handleToggle = async (vendorId: string, appCode: string, currentEnabled: boolean) => {
    const key = `${vendorId}_${appCode}`;
    setTogglingMap((prev) => ({ ...prev, [key]: true }));
    setToastMessage(null);

    const target = !currentEnabled;
    try {
      const res = await platformApi.toggleVendorApp(vendorId, appCode, target);
      setVendors((prev) =>
        prev.map((v) => {
          if (v.id === vendorId) {
            const copy: any = { ...v };
            if (appCode === "hyperlocal") copy.hyperlocal_enabled = target;
            if (appCode === "razorpay") copy.razorpay_enabled = target;
            if (appCode === "sms_gateway") copy.sms_gateway_enabled = target;
            if (appCode === "custom_domain") copy.custom_domain_enabled = target;
            if (appCode === "shiprocket") copy.shiprocket_enabled = target;
            if (appCode === "whatsapp") copy.whatsapp_alerts_enabled = target;
            return copy;
          }
          return v;
        })
      );
      setToastMessage({
        type: "success",
        text: res.message || `App entitlement updated!`,
      });
    } catch (err: any) {
      setToastMessage({
        type: "error",
        text: err.message || "Failed to toggle app entitlement.",
      });
    } finally {
      setTogglingMap((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Metrics
  const totalVendors = vendors.length;
  const hyperlocalCount = vendors.filter((v) => v.hyperlocal_enabled).length;
  const razorpayCount = vendors.filter((v) => v.razorpay_enabled).length;
  const smsCount = vendors.filter((v) => v.sms_gateway_enabled).length;
  const customDomainCount = vendors.filter((v) => v.custom_domain_enabled).length;
  const shiprocketCount = vendors.filter((v) => v.shiprocket_enabled).length;
  const whatsappCount = vendors.filter((v) => v.whatsapp_alerts_enabled).length;

  const filteredVendors = vendors.filter((v) => {
    const q = (search || "").toLowerCase().trim();
    if (q) {
      const bName = (v.business_name || "").toLowerCase();
      const vCode = (v.vendor_code || "").toLowerCase();
      const sSlug = (v.store_slug || "").toLowerCase();
      const email = (v.email || "").toLowerCase();
      const matchesSearch = bName.includes(q) || vCode.includes(q) || sSlug.includes(q) || email.includes(q);
      if (!matchesSearch) return false;
    }

    if (selectedAppFilter === "hyperlocal") return !!v.hyperlocal_enabled;
    if (selectedAppFilter === "razorpay") return !!v.razorpay_enabled;
    if (selectedAppFilter === "sms_gateway") return !!v.sms_gateway_enabled;
    if (selectedAppFilter === "custom_domain") return !!v.custom_domain_enabled;
    if (selectedAppFilter === "shiprocket") return !!v.shiprocket_enabled;
    if (selectedAppFilter === "whatsapp") return !!v.whatsapp_alerts_enabled;

    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-6 h-6 text-indigo-600" />
              Platform App Center & Entitlements
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase">
              Super Admin Control
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage platform integrations across all vendors. Inactive apps remain completely hidden from the vendor's dashboard until activated.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadVendors()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
          <span>{loading ? "Refreshing..." : "Refresh Matrix"}</span>
        </button>
      </div>

      {/* Fetch Error Banner */}
      {fetchError && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">Unable to load live vendor matrix</p>
              <p className="text-amber-700 mt-0.5">{fetchError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadVendors()}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between shadow-2xs ${
            toastMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-xs font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hyperlocal Active</span>
          <p className="text-xl font-black text-rose-600 mt-1">
            {loading ? <span className="text-slate-300">...</span> : hyperlocalCount}{" "}
            <span className="text-xs font-semibold text-slate-400">/ {loading ? "..." : totalVendors}</span>
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Razorpay Active</span>
          <p className="text-xl font-black text-blue-600 mt-1">
            {loading ? <span className="text-slate-300">...</span> : razorpayCount}{" "}
            <span className="text-xs font-semibold text-slate-400">/ {loading ? "..." : totalVendors}</span>
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SMS Gateway</span>
          <p className="text-xl font-black text-emerald-600 mt-1">
            {loading ? <span className="text-slate-300">...</span> : smsCount}{" "}
            <span className="text-xs font-semibold text-slate-400">/ {loading ? "..." : totalVendors}</span>
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Custom Domains</span>
          <p className="text-xl font-black text-purple-600 mt-1">
            {loading ? <span className="text-slate-300">...</span> : customDomainCount}{" "}
            <span className="text-xs font-semibold text-slate-400">/ {loading ? "..." : totalVendors}</span>
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Shiprocket</span>
          <p className="text-xl font-black text-amber-600 mt-1">
            {loading ? <span className="text-slate-300">...</span> : shiprocketCount}{" "}
            <span className="text-xs font-semibold text-slate-400">/ {loading ? "..." : totalVendors}</span>
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">WhatsApp Alerts</span>
          <p className="text-xl font-black text-teal-600 mt-1">
            {loading ? <span className="text-slate-300">...</span> : whatsappCount}{" "}
            <span className="text-xs font-semibold text-slate-400">/ {loading ? "..." : totalVendors}</span>
          </p>
        </div>
      </div>

      {/* App Directory Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {APPS.map((app) => {
          const Icon = app.icon;
          const count =
            app.code === "hyperlocal"
              ? hyperlocalCount
              : app.code === "razorpay"
              ? razorpayCount
              : app.code === "sms_gateway"
              ? smsCount
              : app.code === "custom_domain"
              ? customDomainCount
              : app.code === "shiprocket"
              ? shiprocketCount
              : whatsappCount;

          return (
            <div
              key={app.code}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${app.color} text-white flex items-center justify-center shadow-xs shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{app.name}</h3>
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{app.category}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                    {count} Active
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                  {app.description}
                </p>

                <div className="mt-3.5 space-y-1.5">
                  {app.features.map((feat) => (
                    <div key={feat} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAppFilter(app.code)}
                className={`w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  selectedAppFilter === app.code
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                }`}
              >
                <span>Filter Vendors ({count})</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Vendor Entitlements Management Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden mt-8">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h2 className="font-bold text-slate-900 text-sm">Vendor Modular Integration Matrix</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Toggle specific apps for each vendor. Changes apply immediately in their dashboard.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search vendor or slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-56"
              />
            </div>

            {/* Filter Pill */}
            {selectedAppFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => setSelectedAppFilter("ALL")}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>Clear Filter ({selectedAppFilter})</span>
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-5">Vendor Account</th>
                <th className="py-3 px-3 text-center">Hyperlocal</th>
                <th className="py-3 px-3 text-center">Razorpay</th>
                <th className="py-3 px-3 text-center">SMS Gateway</th>
                <th className="py-3 px-3 text-center">Custom Domain</th>
                <th className="py-3 px-3 text-center">Shiprocket</th>
                <th className="py-3 px-3 text-center">WhatsApp</th>
                <th className="py-3 px-5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-xs text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                      <span className="font-semibold text-slate-700">Loading vendor entitlements...</span>
                      <span className="text-[11px] text-slate-400">Connecting to secure platform database</span>
                    </div>
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-xs text-rose-600 bg-rose-50/40">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-6 h-6 text-rose-500" />
                      <span className="font-semibold">{fetchError}</span>
                      <button
                        type="button"
                        onClick={() => loadVendors()}
                        className="mt-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry Loading Vendors</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-xs text-slate-400">
                    No vendors matched the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredVendors.map((v) => {
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-5">
                        <Link
                          href={`/app/admin/vendors/${v.id}`}
                          className="font-bold text-slate-900 hover:text-indigo-600 hover:underline block text-xs"
                        >
                          {v.business_name || "Unnamed Store"}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[10px] text-purple-700 font-semibold bg-purple-50 px-1.5 py-0.2 rounded">
                            {v.vendor_code || "VND"}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono truncate max-w-[150px]">
                            {v.store_slug || "store"}.digitalgrowthstudio.in
                          </span>
                        </div>
                      </td>

                      {/* Hyperlocal Toggle */}
                      <td className="py-4 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggle(v.id, "hyperlocal", !!v.hyperlocal_enabled)}
                          disabled={togglingMap[`${v.id}_hyperlocal`]}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                            v.hyperlocal_enabled
                              ? "bg-rose-100 text-rose-800 hover:bg-rose-200"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {togglingMap[`${v.id}_hyperlocal`] ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : v.hyperlocal_enabled ? (
                            <>
                              <Check className="w-3 h-3 text-rose-600" />
                              Active
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 text-slate-400" />
                              Locked
                            </>
                          )}
                        </button>
                      </td>

                      {/* Razorpay Toggle */}
                      <td className="py-4 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggle(v.id, "razorpay", !!v.razorpay_enabled)}
                          disabled={togglingMap[`${v.id}_razorpay`]}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                            v.razorpay_enabled
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {togglingMap[`${v.id}_razorpay`] ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : v.razorpay_enabled ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              Active
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 text-slate-400" />
                              Locked
                            </>
                          )}
                        </button>
                      </td>

                      {/* SMS Gateway Toggle */}
                      <td className="py-4 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggle(v.id, "sms_gateway", !!v.sms_gateway_enabled)}
                          disabled={togglingMap[`${v.id}_sms_gateway`]}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                            v.sms_gateway_enabled
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {togglingMap[`${v.id}_sms_gateway`] ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : v.sms_gateway_enabled ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              Active
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 text-slate-400" />
                              Locked
                            </>
                          )}
                        </button>
                      </td>

                      {/* Custom Domain Toggle */}
                      <td className="py-4 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggle(v.id, "custom_domain", !!v.custom_domain_enabled)}
                          disabled={togglingMap[`${v.id}_custom_domain`]}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                            v.custom_domain_enabled
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {togglingMap[`${v.id}_custom_domain`] ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : v.custom_domain_enabled ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              Active
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 text-slate-400" />
                              Locked
                            </>
                          )}
                        </button>
                      </td>

                      {/* Shiprocket Toggle */}
                      <td className="py-4 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggle(v.id, "shiprocket", !!v.shiprocket_enabled)}
                          disabled={togglingMap[`${v.id}_shiprocket`]}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                            v.shiprocket_enabled
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {togglingMap[`${v.id}_shiprocket`] ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : v.shiprocket_enabled ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              Active
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 text-slate-400" />
                              Locked
                            </>
                          )}
                        </button>
                      </td>

                      {/* WhatsApp Toggle */}
                      <td className="py-4 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggle(v.id, "whatsapp", !!v.whatsapp_alerts_enabled)}
                          disabled={togglingMap[`${v.id}_whatsapp`]}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                            v.whatsapp_alerts_enabled
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {togglingMap[`${v.id}_whatsapp`] ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : v.whatsapp_alerts_enabled ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              Active
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 text-slate-400" />
                              Locked
                            </>
                          )}
                        </button>
                      </td>

                      {/* Vendor Page Link */}
                      <td className="py-4 px-5 text-right">
                        <Link
                          href={`/app/admin/vendors/${v.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                        >
                          <span>Manage</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

