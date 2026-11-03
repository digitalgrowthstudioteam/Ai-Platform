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
  Edit3,
  User,
  Building2,
  FileText,
  Shield,
  RotateCcw,
  Truck,
  MessageCircle,
  X,
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
  const [editingSubdomain, setEditingSubdomain] = useState(false);
  const [subdomainInput, setSubdomainInput] = useState("");
  const [updatingSubdomain, setUpdatingSubdomain] = useState(false);
  const [updatingSetupFee, setUpdatingSetupFee] = useState(false);
  const [customPriceInput, setCustomPriceInput] = useState<string>("");
  const [grantMonthsInput, setGrantMonthsInput] = useState<string>("1");
  const [grantingAccess, setGrantingAccess] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingStore, setDeletingStore] = useState(false);

  // Modals for Super Admin editing
  const [editOwnerModalOpen, setEditOwnerModalOpen] = useState(false);
  const [editBusinessModalOpen, setEditBusinessModalOpen] = useState(false);
  const [editStoreModalOpen, setEditStoreModalOpen] = useState(false);
  const [activePolicyTab, setActivePolicyTab] = useState<"terms" | "privacy" | "shipping" | "refund">("terms");
  const [savingDetails, setSavingDetails] = useState(false);

  // Forms
  const [ownerForm, setOwnerForm] = useState({
    owner_name: "",
    owner_email: "",
    owner_phone: "",
  });

  const [businessForm, setBusinessForm] = useState({
    business_name: "",
    brand_name: "",
    category: "",
    gst_number: "",
    business_email: "",
    business_phone: "",
    whatsapp_number: "",
    address: "",
    description: "",
  });

  const [storeForm, setStoreForm] = useState({
    store_name: "",
    primary_color: "",
    secondary_color: "",
    cod_enabled: true,
    razorpay_enabled: false,
    razorpay_key_id: "",
    razorpay_key_secret: "",
    shipping_charge: 0,
    free_shipping_min_order: 999,
    estimated_delivery_days: "3-5 Business Days",
    terms_and_conditions: "",
    privacy_policy: "",
    shipping_policy: "",
    refund_policy: "",
  });

  const openEditOwner = () => {
    if (!vendor) return;
    setOwnerForm({
      owner_name: vendor.owner_name || "",
      owner_email: vendor.owner_email || vendor.email || "",
      owner_phone: vendor.owner_phone || vendor.phone || "",
    });
    setEditOwnerModalOpen(true);
  };

  const openEditBusiness = () => {
    if (!vendor) return;
    setBusinessForm({
      business_name: vendor.business_name || "",
      brand_name: vendor.brand_name || vendor.business_name || "",
      category: vendor.category || "General",
      gst_number: vendor.gst_number || "",
      business_email: vendor.business_email || vendor.email || "",
      business_phone: vendor.business_phone || vendor.phone || "",
      whatsapp_number: vendor.whatsapp_number || vendor.phone || "",
      address: vendor.address || "",
      description: vendor.description || "",
    });
    setEditBusinessModalOpen(true);
  };

  const openEditStore = () => {
    if (!vendor) return;
    setStoreForm({
      store_name: vendor.store_name || vendor.business_name || "",
      primary_color: vendor.primary_color || "#2563EB",
      secondary_color: vendor.secondary_color || "#1E293B",
      cod_enabled: Boolean(vendor.cod_enabled),
      razorpay_enabled: Boolean(vendor.razorpay_enabled),
      razorpay_key_id: vendor.razorpay_key_id || "",
      razorpay_key_secret: vendor.razorpay_key_secret || "",
      shipping_charge: vendor.shipping_charge || 0,
      free_shipping_min_order: vendor.free_shipping_min_order || 999,
      estimated_delivery_days: vendor.estimated_delivery_days || "3-5 Business Days",
      terms_and_conditions: vendor.terms_and_conditions || "",
      privacy_policy: vendor.privacy_policy || "",
      shipping_policy: vendor.shipping_policy || "",
      refund_policy: vendor.refund_policy || "",
    });
    setEditStoreModalOpen(true);
  };

  const handleSaveDetails = async (payload: any) => {
    if (!vendor) return;
    setSavingDetails(true);
    setMessage(null);
    try {
      const updated = await platformApi.updateVendorDetailsByAdmin(vendor.id, payload);
      setVendor(updated);
      setMessage({ type: "success", text: "Vendor details successfully updated!" });
      setEditOwnerModalOpen(false);
      setEditBusinessModalOpen(false);
      setEditStoreModalOpen(false);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update vendor details" });
    } finally {
      setSavingDetails(false);
    }
  };

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
        if (data.store_slug) {
          setSubdomainInput(data.store_slug);
        } else if (data.subdomain) {
          setSubdomainInput(data.subdomain.split(".")[0]);
        }
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
      setVendor((prev: any) => (prev ? { ...prev, status: newStatus, subscription_status: newStatus } : null));
      setMessage({ type: "success", text: `Account status updated to "${newStatus}" successfully!` });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update vendor status" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle Granting Specific Months of Platform Access
  const handleGrantAccess = async (monthsToGrant: number) => {
    if (!vendor) return;
    setGrantingAccess(true);
    setMessage(null);
    try {
      const res = await platformApi.grantVendorAccessMonths(vendor.id, monthsToGrant);
      setVendor((prev: any) =>
        prev
          ? {
              ...prev,
              status: "active",
              subscription_status: "active",
              renewal_date: res.expires_at,
              apk_user_approved: true,
            }
          : null
      );
      setMessage({
        type: "success",
        text: res.message || `Granted ${monthsToGrant} month(s) of access!`,
      });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to grant access" });
    } finally {
      setGrantingAccess(false);
    }
  };

  // Handle Dedicated Subdomain Update
  const handleSaveSubdomain = async () => {
    if (!vendor) return;
    const cleanSlug = subdomainInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "");
    if (!cleanSlug || cleanSlug.length < 2) {
      setMessage({ type: "error", text: "Subdomain slug must contain at least 2 alphanumeric characters." });
      return;
    }
    setUpdatingSubdomain(true);
    setMessage(null);
    try {
      const res = await platformApi.updateVendorSubdomain(vendor.id, cleanSlug);
      const updatedSubdomain = res.subdomain || `${cleanSlug}.digitalgrowthstudio.in`;
      setVendor((prev: any) =>
        prev
          ? {
              ...prev,
              store_slug: cleanSlug,
              subdomain: updatedSubdomain,
            }
          : null
      );
      setSubdomainInput(cleanSlug);
      setEditingSubdomain(false);
      setMessage({
        type: "success",
        text: res.message || `Subdomain successfully updated to "${updatedSubdomain}"!`,
      });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update vendor subdomain" });
    } finally {
      setUpdatingSubdomain(false);
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
        {/* LEFT COLUMN: 1. Owner Info, 2. Business Info & 3. Storefront & Policies */}
        <div className="space-y-6">
          {/* 1. Owner Information (Personal Account) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-2">
                <User className="w-4 h-4 text-purple-600" />
                1. Owner Information (Personal Account)
              </h3>
              <button
                type="button"
                onClick={openEditOwner}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit Owner</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Owner Full Name</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{vendor.owner_name || "N/A"}</p>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Personal Mobile / Phone</span>
                <a href={`tel:${vendor.owner_phone || vendor.phone}`} className="font-mono text-slate-900 font-bold mt-0.5 block hover:underline">
                  {vendor.owner_phone || vendor.phone || "N/A"}
                </a>
              </div>

              <div className="sm:col-span-2">
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Dashboard Login / Personal Email</span>
                <a href={`mailto:${vendor.owner_email || vendor.email}`} className="text-blue-600 hover:underline font-semibold mt-0.5 block truncate">
                  {vendor.owner_email || vendor.email}
                </a>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Used by the store owner to log in and receive personal billing notifications.
                </p>
              </div>
            </div>
          </div>

          {/* 2. Business & Brand Information */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                2. Business & Brand Information
              </h3>
              <button
                type="button"
                onClick={openEditBusiness}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit Business</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Business Legal Name</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{vendor.business_name}</p>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Brand Display Name</span>
                <p className="font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                  {vendor.brand_name || vendor.business_name}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Business Category</span>
                <p className="font-semibold text-slate-900 mt-0.5">{vendor.category}</p>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">GST Number</span>
                <p className="font-mono text-slate-800 mt-0.5">{vendor.gst_number || "Not provided"}</p>
              </div>

              {/* Dedicated Business WhatsApp with Callout */}
              <div className="sm:col-span-2 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-900 block text-[11px] uppercase font-bold flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Business WhatsApp Chat Number
                  </span>
                  <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full">
                    Active on Storefront & App
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-mono font-bold text-slate-900 text-sm">
                    {vendor.whatsapp_number || vendor.phone || "N/A"}
                  </p>
                  <a
                    href={`https://wa.me/${(vendor.whatsapp_number || vendor.phone || "").replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-emerald-700 hover:underline font-semibold"
                  >
                    (Test WhatsApp Chat ↗)
                  </a>
                </div>
                <p className="text-[10px] text-emerald-800">
                  All &quot;Order on WhatsApp&quot;, designer consultation, and support buttons on <strong>{vendor.subdomain || vendor.store_slug}</strong> strictly dial this exact number.
                </p>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Customer Support Phone</span>
                <a href={`tel:${vendor.business_phone || vendor.phone}`} className="font-mono text-slate-800 mt-0.5 block font-semibold hover:underline">
                  {vendor.business_phone || vendor.phone}
                </a>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Customer Support Email</span>
                <a href={`mailto:${vendor.business_email || vendor.email}`} className="text-blue-600 hover:underline mt-0.5 block truncate font-medium">
                  {vendor.business_email || vendor.email}
                </a>
              </div>

              <div className="sm:col-span-2">
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Full Registered Business Address</span>
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

          {/* 3. Storefront, Theme & Policies */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-indigo-600" />
                3. Storefront, Theme & Policies
              </h3>
              <button
                type="button"
                onClick={openEditStore}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit Storefront & Policies</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {editingSubdomain ? (
                <div className="sm:col-span-2 p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 block text-[11px] uppercase font-bold">
                      Edit Dedicated Store Subdomain
                    </span>
                    <span className="text-[10px] text-blue-700 font-semibold bg-blue-100/70 px-2 py-0.5 rounded">
                      Super Admin Override
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-blue-500 flex-1">
                      <span className="text-xs text-slate-400 font-mono">https://</span>
                      <input
                        type="text"
                        value={subdomainInput}
                        onChange={(e) => setSubdomainInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                        placeholder="e.g. dgs"
                        className="text-xs font-mono font-bold text-slate-900 outline-none flex-1 px-1 bg-transparent"
                      />
                      <span className="text-xs text-slate-500 font-mono">.digitalgrowthstudio.in</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleSaveSubdomain}
                        disabled={updatingSubdomain}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        {updatingSubdomain ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Save Subdomain</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const currentSlug = vendor.store_slug || (vendor.subdomain ? vendor.subdomain.split(".")[0] : "");
                          setSubdomainInput(currentSlug);
                          setEditingSubdomain(false);
                        }}
                        disabled={updatingSubdomain}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Changing this updates the live storefront link and Android package identifier immediately.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 block text-[11px] uppercase font-bold">Dedicated Subdomain</span>
                    <button
                      type="button"
                      onClick={() => {
                        const currentSlug = vendor.store_slug || (vendor.subdomain ? vendor.subdomain.split(".")[0] : "");
                        setSubdomainInput(currentSlug);
                        setEditingSubdomain(true);
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Edit Subdomain
                    </button>
                  </div>
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
              )}

              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Store Display Name</span>
                <p className="font-bold text-slate-900 mt-0.5">
                  {vendor.store_name || vendor.business_name}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Catalog Size</span>
                <p className="font-bold text-slate-900 mt-0.5">
                  {vendor.total_products} products • {vendor.total_orders} orders
                </p>
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

              <div className="sm:col-span-2">
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Payment Methods</span>
                <p className="font-semibold text-slate-800 mt-1">
                  COD: {vendor.cod_enabled ? "✓ Enabled" : "✗ Disabled"} • Razorpay: {vendor.razorpay_enabled ? "✓ Active" : "✗ Inactive"}
                  {vendor.razorpay_key_id && (
                    <span className="ml-2 font-mono text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      Key: {vendor.razorpay_key_id}
                    </span>
                  )}
                </p>
              </div>

              {/* Legal Policies Quick Status */}
              <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-500 font-bold text-[11px] uppercase flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Brand Legal Policies
                  </span>
                  <button
                    type="button"
                    onClick={openEditStore}
                    className="text-[11px] text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Edit All Policies
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: "Terms & Conditions", hasCustom: Boolean(vendor.terms_and_conditions) },
                    { label: "Privacy Policy", hasCustom: Boolean(vendor.privacy_policy) },
                    { label: "Shipping Policy", hasCustom: Boolean(vendor.shipping_policy) },
                    { label: "Return & Refund", hasCustom: Boolean(vendor.refund_policy) },
                  ].map((pol, idx) => (
                    <div key={idx} className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <p className="text-[10px] font-bold text-slate-700 truncate">{pol.label}</p>
                      <span className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded ${pol.hasCustom ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"}`}>
                        {pol.hasCustom ? "Custom" : "Standard"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 4. Android App, 5. Setup Fee & 6. Subscriptions */}
        <div className="space-y-6">
          {/* 4. Android Mobile App Configuration */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-2 pb-2 border-b border-slate-100">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              4. Android Mobile App Configuration
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

          {/* 5. One-Time Setup Fee & Custom Pricing Waiver */}
          <div className="bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-white rounded-2xl border border-indigo-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
              <h3 className="font-bold text-indigo-950 uppercase tracking-wider text-xs flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                5. Setup Fee Waiver & Custom Pricing
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

          {/* 6. Android Monthly Subscription & APK Release */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 text-xs">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-2 pb-2 border-b border-slate-100">
              <Zap className="w-4 h-4 text-purple-600" />
              6. Monthly Android App Subscription & APK Release
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

            {/* Grant Specific Months Access Controls */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-[11px] uppercase flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  Grant Platform Access / Months
                </span>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  Super Admin Control
                </span>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Add specific months of active service to this account. Sets subscription to active and extends validity.
              </p>

              <div className="flex flex-wrap items-center gap-1.5">
                {[1, 2, 3, 6, 12].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleGrantAccess(m)}
                    disabled={grantingAccess}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    +{m} {m === 1 ? "Month" : "Months"}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={grantMonthsInput}
                    onChange={(e) => setGrantMonthsInput(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">months</span>
                </div>
                <button
                  type="button"
                  disabled={grantingAccess}
                  onClick={() => {
                    const m = parseInt(grantMonthsInput, 10);
                    if (!m || m < 1) {
                      alert("Please enter a valid number of months.");
                      return;
                    }
                    handleGrantAccess(m);
                  }}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {grantingAccess ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                  <span>Grant Access</span>
                </button>
              </div>

              {/* Status Toggle Button */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Account Access Status:</span>
                <div className="flex items-center gap-2">
                  {vendor.status === "active" ? (
                    <button
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => handleUpdateStatus("inactive")}
                      className="px-3 py-1 rounded-lg text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      {updatingStatus ? "Updating..." : "Mark Inactive / Lock"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => handleUpdateStatus("active")}
                      className="px-3 py-1 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      {updatingStatus ? "Updating..." : "Mark Active"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1. EDIT OWNER DETAILS MODAL */}
      {editOwnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Owner Information</h3>
                  <p className="text-xs text-slate-500">Personal account owner & login credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditOwnerModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Owner Full Name</label>
                <input
                  type="text"
                  value={ownerForm.owner_name}
                  onChange={(e) => setOwnerForm({ ...ownerForm, owner_name: e.target.value })}
                  placeholder="e.g. Abhishek Rathod"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Owner Login Email</label>
                <input
                  type="email"
                  value={ownerForm.owner_email}
                  onChange={(e) => setOwnerForm({ ...ownerForm, owner_email: e.target.value })}
                  placeholder="e.g. abhishek@example.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                />
                <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Updating this email modifies the vendor's dashboard sign-in credentials.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Owner Personal Phone / Mobile</label>
                <input
                  type="tel"
                  value={ownerForm.owner_phone}
                  onChange={(e) => setOwnerForm({ ...ownerForm, owner_phone: e.target.value })}
                  placeholder="e.g. +91 8999899577"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Private account mobile number used for security verifications.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={savingDetails}
                onClick={() => setEditOwnerModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingDetails}
                onClick={() => handleSaveDetails(ownerForm)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
              >
                {savingDetails ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Owner Details</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. EDIT BUSINESS & BRAND DETAILS MODAL */}
      {editBusinessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Business & Brand Details</h3>
                  <p className="text-xs text-slate-500">Commercial identity, customer contacts & store profile</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditBusinessModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Business / Legal Name</label>
                <input
                  type="text"
                  value={businessForm.business_name}
                  onChange={(e) => setBusinessForm({ ...businessForm, business_name: e.target.value })}
                  placeholder="e.g. Abhishek Rathod's Store"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Brand Name (Customer Facing)</label>
                <input
                  type="text"
                  value={businessForm.brand_name}
                  onChange={(e) => setBusinessForm({ ...businessForm, brand_name: e.target.value })}
                  placeholder="e.g. KC Aari Work"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Business Category</label>
                <input
                  type="text"
                  value={businessForm.category}
                  onChange={(e) => setBusinessForm({ ...businessForm, category: e.target.value })}
                  placeholder="e.g. Clothing & Apparel"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">GSTIN Number (Optional)</label>
                <input
                  type="text"
                  value={businessForm.gst_number}
                  onChange={(e) => setBusinessForm({ ...businessForm, gst_number: e.target.value })}
                  placeholder="e.g. 27ABCDE1234F1Z5"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  Official Business WhatsApp
                </label>
                <input
                  type="tel"
                  value={businessForm.whatsapp_number}
                  onChange={(e) => setBusinessForm({ ...businessForm, whatsapp_number: e.target.value })}
                  placeholder="+91 8999899577"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <p className="text-[10px] text-emerald-700 mt-1 font-medium">
                  Used by customer WhatsApp buttons on this brand's website.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  Customer Support Calling Phone
                </label>
                <input
                  type="tel"
                  value={businessForm.business_phone}
                  onChange={(e) => setBusinessForm({ ...businessForm, business_phone: e.target.value })}
                  placeholder="+91 8999899577"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  Public Support Email
                </label>
                <input
                  type="email"
                  value={businessForm.business_email}
                  onChange={(e) => setBusinessForm({ ...businessForm, business_email: e.target.value })}
                  placeholder="contact@brand.in"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  Studio / Registered Business Address
                </label>
                <textarea
                  rows={2}
                  value={businessForm.address}
                  onChange={(e) => setBusinessForm({ ...businessForm, address: e.target.value })}
                  placeholder="e.g. Swamiraj Sunkul, Manajinagar, Narhe 411041 Pune"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">Business Description / About Us</label>
                <textarea
                  rows={3}
                  value={businessForm.description}
                  onChange={(e) => setBusinessForm({ ...businessForm, description: e.target.value })}
                  placeholder="Describe your brand, heritage, craftsmanship and offerings..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={savingDetails}
                onClick={() => setEditBusinessModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingDetails}
                onClick={() => handleSaveDetails(businessForm)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
              >
                {savingDetails ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Business Details</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. EDIT STOREFRONT & POLICIES MODAL */}
      {editStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Storefront & Brand Policies</h3>
                  <p className="text-xs text-slate-500">Theme colors, checkout payments, delivery charges & legal policies</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditStoreModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 text-xs">
              {/* Section A: Store Appearance & Theme */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-100">
                  Storefront Branding & Appearance
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block text-slate-700 font-bold mb-1">Store Display Title</label>
                    <input
                      type="text"
                      value={storeForm.store_name}
                      onChange={(e) => setStoreForm({ ...storeForm, store_name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={storeForm.primary_color || "#2563EB"}
                        onChange={(e) => setStoreForm({ ...storeForm, primary_color: e.target.value })}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                      />
                      <input
                        type="text"
                        value={storeForm.primary_color}
                        onChange={(e) => setStoreForm({ ...storeForm, primary_color: e.target.value })}
                        className="flex-1 px-2.5 py-1.5 font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Secondary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={storeForm.secondary_color || "#1E293B"}
                        onChange={(e) => setStoreForm({ ...storeForm, secondary_color: e.target.value })}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                      />
                      <input
                        type="text"
                        value={storeForm.secondary_color}
                        onChange={(e) => setStoreForm({ ...storeForm, secondary_color: e.target.value })}
                        className="flex-1 px-2.5 py-1.5 font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Estimated Delivery</label>
                    <input
                      type="text"
                      value={storeForm.estimated_delivery_days}
                      onChange={(e) => setStoreForm({ ...storeForm, estimated_delivery_days: e.target.value })}
                      placeholder="e.g. 3-5 Business Days"
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Section B: Delivery & Charges */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-100">
                  Shipping & Delivery Rules
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Standard Shipping Charge (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={storeForm.shipping_charge}
                      onChange={(e) => setStoreForm({ ...storeForm, shipping_charge: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Free Shipping Threshold (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={storeForm.free_shipping_min_order}
                      onChange={(e) => setStoreForm({ ...storeForm, free_shipping_min_order: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section C: Payment Methods */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-100">
                  Payment Methods & Gateway Credentials
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={storeForm.cod_enabled}
                      onChange={(e) => setStoreForm({ ...storeForm, cod_enabled: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded border-slate-300"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Cash on Delivery (COD)</span>
                      <span className="text-[10px] text-slate-500">Allow customers to pay cash at delivery</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={storeForm.razorpay_enabled}
                      onChange={(e) => setStoreForm({ ...storeForm, razorpay_enabled: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded border-slate-300"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Razorpay Online Gateway</span>
                      <span className="text-[10px] text-slate-500">Accept UPI, Cards, NetBanking</span>
                    </div>
                  </label>

                  <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Razorpay Key ID</label>
                      <input
                        type="text"
                        value={storeForm.razorpay_key_id}
                        onChange={(e) => setStoreForm({ ...storeForm, razorpay_key_id: e.target.value })}
                        placeholder="rzp_live_..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Razorpay Key Secret</label>
                      <input
                        type="text"
                        value={storeForm.razorpay_key_secret}
                        onChange={(e) => setStoreForm({ ...storeForm, razorpay_key_secret: e.target.value })}
                        placeholder="Leave blank to keep unchanged"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section D: Legal & Policies */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-purple-600" />
                    Brand Legal Policies
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Empty text automatically uses clean standard template
                  </span>
                </div>

                {/* Policy Tabs */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
                  {[
                    { id: "terms", label: "Terms & Conditions", icon: FileText },
                    { id: "privacy", label: "Privacy Policy", icon: Shield },
                    { id: "shipping", label: "Shipping Policy", icon: Truck },
                    { id: "refund", label: "Return & Refund", icon: RotateCcw },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activePolicyTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActivePolicyTab(tab.id as any)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                          isActive
                            ? "bg-white text-purple-700 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Policy Editor Textarea based on active tab */}
                <div>
                  {activePolicyTab === "terms" && (
                    <div className="space-y-1">
                      <textarea
                        rows={7}
                        value={storeForm.terms_and_conditions}
                        onChange={(e) => setStoreForm({ ...storeForm, terms_and_conditions: e.target.value })}
                        placeholder="Leave blank to use default auto-generated standard Terms & Conditions..."
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none leading-relaxed"
                      />
                    </div>
                  )}

                  {activePolicyTab === "privacy" && (
                    <div className="space-y-1">
                      <textarea
                        rows={7}
                        value={storeForm.privacy_policy}
                        onChange={(e) => setStoreForm({ ...storeForm, privacy_policy: e.target.value })}
                        placeholder="Leave blank to use default auto-generated Privacy Policy..."
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none leading-relaxed"
                      />
                    </div>
                  )}

                  {activePolicyTab === "shipping" && (
                    <div className="space-y-1">
                      <textarea
                        rows={7}
                        value={storeForm.shipping_policy}
                        onChange={(e) => setStoreForm({ ...storeForm, shipping_policy: e.target.value })}
                        placeholder="Leave blank to use default auto-generated Shipping & Delivery Policy..."
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none leading-relaxed"
                      />
                    </div>
                  )}

                  {activePolicyTab === "refund" && (
                    <div className="space-y-1">
                      <textarea
                        rows={7}
                        value={storeForm.refund_policy}
                        onChange={(e) => setStoreForm({ ...storeForm, refund_policy: e.target.value })}
                        placeholder="Leave blank to use default auto-generated Return & Refund Policy..."
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none leading-relaxed"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={savingDetails}
                onClick={() => setEditStoreModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingDetails}
                onClick={() => handleSaveDetails(storeForm)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
              >
                {savingDetails ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Store & Policies...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Storefront & Policies</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
