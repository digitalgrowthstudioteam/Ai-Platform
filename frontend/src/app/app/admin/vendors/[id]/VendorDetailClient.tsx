"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { platformApi } from "@/lib/app-platform/api";
import StatusBadge from "@/components/app-platform/shared/StatusBadge";
import {
  ArrowLeft,
  Store,
  HardDrive,
  Smartphone,
  CreditCard,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Users,
  Lock,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Layers,
  ShoppingBag,
  Zap,
  Loader2,
  Check,
  RefreshCw,
  Globe,
  Trash2,
  AlertTriangle,
} from "lucide-react";

export default function VendorDetailClient() {
  const params = useParams();
  const router = useRouter();

  // Resolve true vendor identifier (UUID or VND code)
  const [vendorIdentifier, setVendorIdentifier] = useState<string>(() => {
    let raw = (params?.id as string) || "";
    if (typeof window !== "undefined") {
      const parts = window.location.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("vendors");
      if (idx !== -1 && parts.length > idx + 1) {
        const fromPath = decodeURIComponent(parts[idx + 1]);
        if (fromPath && fromPath !== "placeholder") {
          raw = fromPath;
        }
      }
    }
    return raw;
  });

  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingSetupFee, setUpdatingSetupFee] = useState(false);
  const [customPriceInput, setCustomPriceInput] = useState<string>("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingStore, setDeletingStore] = useState(false);

  // Load vendor details
  const loadVendorData = async (identifier: string) => {
    if (!identifier || identifier === "placeholder") {
      setLoading(false);
      return;
    }
    try {
      let data: any = null;
      try {
        data = await platformApi.getAdminVendorDetail(identifier);
      } catch {
        // Fallback search through vendor listing
        const list = await platformApi.getAdminVendors().catch(() => []);
        const found = list.find((v: any) => v.id === identifier || v.vendor_code === identifier);
        if (found) {
          data = await platformApi.getAdminVendorDetail(found.id).catch(() => found);
        }
      }

      if (data) {
        setVendor(data);
        if (data.setup_fee_custom_price_inr !== undefined && data.setup_fee_custom_price_inr !== null) {
          setCustomPriceInput(String(data.setup_fee_custom_price_inr));
        }
      } else {
        setMessage({ type: "error", text: "Vendor not found in directory." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to load vendor details" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let resolved = vendorIdentifier;
    if (typeof window !== "undefined") {
      const parts = window.location.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("vendors");
      if (idx !== -1 && parts.length > idx + 1) {
        const fromPath = decodeURIComponent(parts[idx + 1]);
        if (fromPath && fromPath !== "placeholder") {
          resolved = fromPath;
          setVendorIdentifier(fromPath);
        }
      }
    }
    loadVendorData(resolved);
  }, [vendorIdentifier]);

  // Handle Account Status (active, suspended, inactive)
  const handleUpdateStatus = async (newStatus: string) => {
    if (!vendor) return;
    setUpdatingStatus(true);
    setMessage(null);
    try {
      await platformApi.updateVendorStatus(vendor.id, newStatus);
      setVendor((prev: any) => (prev ? { ...prev, status: newStatus } : null));
      setMessage({ type: "success", text: `Account status updated to "${newStatus}" successfully!` });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update vendor status" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle Setup Fee Waiver
  const handleWaiveSetupFee = async () => {
    if (!vendor) return;
    if (!confirm(`Are you sure you want to waive the setup fee for "${vendor.business_name}"? This grants immediate dashboard access.`)) return;

    setUpdatingSetupFee(true);
    setMessage(null);
    try {
      await platformApi.updateVendorSetupFeeByAdmin(vendor.id, { waive_fee: true });
      setVendor((prev: any) => (prev ? { ...prev, setup_fee_waived: true } : null));
      setMessage({ type: "success", text: "One-time setup fee successfully waived off for this vendor!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to waive setup fee" });
    } finally {
      setUpdatingSetupFee(false);
    }
  };

  // Handle Custom Setup Price Override
  const handleSaveCustomPrice = async () => {
    if (!vendor) return;
    const price = parseFloat(customPriceInput);
    if (isNaN(price) || price < 0) {
      alert("Please enter a valid price in INR.");
      return;
    }
    setUpdatingSetupFee(true);
    setMessage(null);
    try {
      await platformApi.updateVendorSetupFeeByAdmin(vendor.id, { custom_price_inr: price });
      setVendor((prev: any) => (prev ? { ...prev, setup_fee_custom_price_inr: price } : null));
      setMessage({ type: "success", text: `Custom setup fee of ₹${price} assigned to this vendor!` });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to set custom price" });
    } finally {
      setUpdatingSetupFee(false);
    }
  };

  // Handle Permanent Store Deletion
  const handleDeleteStore = async () => {
    if (!vendor) return;
    const targetId = vendor.id || vendor.vendor_code;
    setDeletingStore(true);
    setMessage(null);
    try {
      await platformApi.deleteVendor(targetId);
      setDeleteModalOpen(false);
      setMessage({
        type: "success",
        text: `Store '${vendor.business_name || vendor.vendor_code}' has been permanently deleted. Redirecting...`,
      });
      setTimeout(() => {
        router.push("/app/admin/vendors");
      }, 1500);
    } catch (err: any) {
      setDeleteModalOpen(false);
      setMessage({ type: "error", text: err.message || "Failed to delete store" });
    } finally {
      setDeletingStore(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading vendor records...</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <Store className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Vendor Not Found</h2>
        <p className="text-sm text-slate-500">
          The requested vendor could not be located in the platform directory.
        </p>
        <Link
          href="/app/admin/vendors"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Vendors Directory
        </Link>
      </div>
    );
  }

  const liveStoreUrl = vendor.subdomain
    ? `https://${vendor.subdomain}`
    : `/app/store/${vendor.store_slug || "demo"}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <Link
            href="/app/admin/vendors"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Vendors Directory
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 border border-purple-200">
              {vendor.vendor_code}
            </span>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              {vendor.business_name}
            </h1>
            <StatusBadge status={vendor.status} />
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Registered on {new Date(vendor.created_at).toLocaleDateString("en-IN", { dateStyle: "long" })}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={liveStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 shadow-2xs transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            Preview Storefront
          </a>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-sm flex items-center justify-between gap-3 ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium text-xs sm:text-sm">{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Quick Status Control Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-slate-500 font-semibold text-xs block">Current Account Status</span>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={vendor.status} />
            <span className="text-xs text-slate-400">
              {vendor.status === "active"
                ? "Full access to platform and storefront"
                : vendor.status === "suspended"
                ? "Suspended by Super Admin"
                : "Inactive / Pending Setup"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {vendor.status !== "active" && (
            <button
              onClick={() => handleUpdateStatus("active")}
              disabled={updatingStatus}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              Activate Account
            </button>
          )}
          {vendor.status !== "suspended" && (
            <button
              onClick={() => handleUpdateStatus("suspended")}
              disabled={updatingStatus}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              Suspend Account
            </button>
          )}
          {vendor.status !== "inactive" && (
            <button
              onClick={() => handleUpdateStatus("inactive")}
              disabled={updatingStatus}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-700 text-white hover:bg-slate-800 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              Deactivate
            </button>
          )}

          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            disabled={updatingStatus || deletingStore}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Store
          </button>
        </div>
      </div>

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: 1. Business Info & 2. Storefront */}
        <div className="space-y-6">
          {/* 1. Business Information */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-2 pb-2 border-b border-slate-100">
              <Store className="w-4 h-4 text-purple-600" />
              1. Business Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Owner Name</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{vendor.owner_name}</p>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Business Category</span>
                <p className="font-semibold text-slate-900 mt-0.5">{vendor.category}</p>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Email Address</span>
                <a href={`mailto:${vendor.email}`} className="text-blue-600 hover:underline mt-0.5 block truncate">
                  {vendor.email}
                </a>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Phone Number</span>
                <a href={`tel:${vendor.phone}`} className="font-mono text-slate-800 mt-0.5 block">
                  {vendor.phone}
                </a>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">GST Number</span>
                <p className="font-mono text-slate-800 mt-0.5">{vendor.gst_number || "Not provided"}</p>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Brand Name</span>
                <p className="font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                  {vendor.brand_name || vendor.business_name}
                  {vendor.brand_name_locked && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                      Locked
                    </span>
                  )}
                </p>
              </div>

              <div className="sm:col-span-2">
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Full Address</span>
                <p className="text-slate-800 mt-0.5 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {vendor.address || "N/A"}
                </p>
              </div>

              {vendor.description && (
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block text-[11px] uppercase font-bold">Business Description</span>
                  <p className="text-slate-600 mt-0.5 italic">{vendor.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* 2. Storefront & Quota */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-2 pb-2 border-b border-slate-100">
              <HardDrive className="w-4 h-4 text-blue-600" />
              2. Storefront & Quota
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Dedicated Subdomain</span>
                <a
                  href={`https://${vendor.subdomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono font-bold text-blue-600 hover:underline mt-0.5 flex items-center gap-1"
                >
                  {vendor.subdomain}
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Catalog Size</span>
                <p className="font-bold text-slate-900 mt-0.5">
                  {vendor.total_products} products • {vendor.total_orders} orders
                </p>
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase mb-1">
                  <span>Cloud Storage CDN Consumption</span>
                  <span>{vendor.storage_used_mb} MB / {vendor.storage_limit_mb} MB</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.round(((vendor.storage_used_mb || 0) / (vendor.storage_limit_mb || 1024)) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Theme Branding Colors</span>
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className="w-5 h-5 rounded-full border border-slate-300 shadow-xs"
                    style={{ backgroundColor: vendor.primary_color || "#2563EB" }}
                    title={`Primary: ${vendor.primary_color}`}
                  />
                  <span
                    className="w-5 h-5 rounded-full border border-slate-300 shadow-xs"
                    style={{ backgroundColor: vendor.secondary_color || "#1E293B" }}
                    title={`Secondary: ${vendor.secondary_color}`}
                  />
                  <span className="font-mono text-[11px] text-slate-500">
                    {vendor.primary_color} / {vendor.secondary_color}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Payment Methods</span>
                <p className="font-semibold text-slate-800 mt-1">
                  COD: {vendor.cod_enabled ? "✓ Enabled" : "✗ Disabled"} • Razorpay: {vendor.razorpay_enabled ? "✓ Active" : "✗ Inactive"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 3. Android App, 4. Setup Fee & 5. Subscriptions */}
        <div className="space-y-6">
          {/* 3. Android Mobile App Configuration */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-2 pb-2 border-b border-slate-100">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              3. Android Mobile App Configuration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">App Display Name</span>
                <p className="font-bold text-slate-900 mt-0.5">{vendor.app_name}</p>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Package Name</span>
                <p className="font-mono text-slate-700 mt-0.5">{vendor.package_id}</p>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">App Build Status</span>
                <div className="mt-1">
                  <StatusBadge status={vendor.app_build_status} />
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Play Store Status</span>
                <div className="mt-1">
                  <StatusBadge status={vendor.publication_status} />
                </div>
              </div>

              {vendor.apk_download_url && (
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block text-[11px] uppercase font-bold">APK Download URL</span>
                  <a
                    href={vendor.apk_download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 font-mono text-[11px] hover:underline break-all mt-0.5 block"
                  >
                    {vendor.apk_download_url}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* 4. One-Time Setup Fee & Custom Pricing Waiver */}
          <div className="bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-white rounded-2xl border border-indigo-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
              <h3 className="font-bold text-indigo-950 uppercase tracking-wider text-xs flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                4. Setup Fee Waiver & Custom Pricing
              </h3>
              {vendor.setup_fee_paid || vendor.setup_fee_waived ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {vendor.setup_fee_waived ? "Waived Off" : "Paid (Cleared)"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Pending
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Waive Fee Card */}
              <div className="bg-white p-3.5 rounded-xl border border-indigo-100 flex flex-col justify-between">
                <div>
                  <p className="font-bold text-slate-800 text-xs">Secret Setup Fee Waiver</p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {vendor.setup_fee_waived
                      ? "✓ One-time setup fee has been waived. Vendor has full dashboard access."
                      : vendor.setup_fee_paid
                      ? "✓ Vendor already paid the setup fee."
                      : "Click below to waive the fee and unlock the vendor dashboard immediately."}
                  </p>
                </div>

                {!vendor.setup_fee_paid && !vendor.setup_fee_waived && (
                  <button
                    onClick={handleWaiveSetupFee}
                    disabled={updatingSetupFee}
                    className="mt-3 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {updatingSetupFee ? "Waiving..." : "Waive Setup Fee for Vendor"}
                  </button>
                )}
              </div>

              {/* Custom Price Card */}
              <div className="bg-white p-3.5 rounded-xl border border-indigo-100 flex flex-col justify-between">
                <div>
                  <p className="font-bold text-slate-800 text-xs">Custom Price Override</p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Set a specific discounted price in INR for this user instead of the standard rate.
                  </p>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                    <input
                      type="number"
                      placeholder="e.g. 499"
                      value={customPriceInput}
                      onChange={(e) => setCustomPriceInput(e.target.value)}
                      className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                    />
                  </div>
                  <button
                    onClick={handleSaveCustomPrice}
                    disabled={updatingSetupFee}
                    className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Set Price
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Android Monthly Subscription & APK Release */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 text-xs">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-2 pb-2 border-b border-slate-100">
              <Zap className="w-4 h-4 text-purple-600" />
              5. Monthly Android App Subscription & APK Release
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Plan & Billing:</span>
                <span className="font-bold text-slate-900">{vendor.plan_name || "Starter Store Plan"} (₹499/mo)</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Auto-Debit Subscription:</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${vendor.apk_user_approved ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                  {vendor.apk_user_approved ? "ACTIVE (Auto-Debit)" : "Awaiting User APK Approval"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Subscription Status:</span>
                <span className="font-semibold text-slate-800">{vendor.subscription_status || "Active"}</span>
              </div>

              {vendor.renewal_date && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Next Renewal:</span>
                  <span className="font-mono text-slate-800">
                    {new Date(vendor.renewal_date).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Permanent Delete Store Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-rose-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">
                  Permanently Delete Store?
                </h3>
                <p className="text-xs text-slate-500">
                  You are about to permanently delete <strong className="text-slate-800">{vendor.business_name}</strong> (<span className="font-mono text-purple-700">{vendor.vendor_code}</span>).
                </p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-900 space-y-2">
              <p className="font-bold text-rose-950">⚠️ Danger: This operation is permanent and irreversible.</p>
              <ul className="list-disc pl-4 space-y-1 text-rose-800">
                <li>Store subdomain (<strong>{vendor.subdomain || `${vendor.store_slug}.digitalgrowthstudio.in`}</strong>) will be unmapped immediately.</li>
                <li>All <strong>{vendor.total_products || 0}</strong> products, variants, and product images will be wiped.</li>
                <li>All <strong>{vendor.total_orders || 0}</strong> customer orders and customer records will be deleted.</li>
                <li>Android App package configuration and subscription plans will be destroyed.</li>
                <li>The vendor admin credentials will be permanently closed.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deletingStore}
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingStore}
                onClick={handleDeleteStore}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-sm transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
              >
                {deletingStore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting Store Records...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Yes, Permanently Delete Store
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
