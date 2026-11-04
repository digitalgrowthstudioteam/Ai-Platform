"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { platformApi } from "@/lib/app-platform/api";
import { useVendorCart } from "@/lib/app-platform/cart-store";
import { useVendorWishlist, StoreWishlistItem } from "@/lib/app-platform/wishlist-store";
import { useSavedAddresses, CustomerSavedAddress } from "@/lib/app-platform/customer-address-store";
import StoreHeader from "@/components/app-platform/store/StoreHeader";
import StoreFooter from "@/components/app-platform/store/StoreFooter";
import { getStoreRouteParams, getStoreHref } from "@/lib/app-platform/store-route-helper";
import { auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import {
  User,
  Package,
  Search,
  Phone,
  Clock,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  ShoppingBag,
  ShieldCheck,
  Heart,
  MapPin,
  Truck,
  CheckCircle2,
  Plus,
  Trash2,
  Edit3,
  MessageSquare,
  HelpCircle,
  Check,
  AlertCircle,
  Building2,
  Mail,
  Zap,
  ShoppingCart,
  X,
  ChevronRight,
  Home,
  Briefcase,
  LogOut,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
} from "lucide-react";

type AccountTab = "orders" | "wishlist" | "addresses" | "profile" | "help";

export default function AccountClient() {
  const params = useParams();
  const router = useRouter();

  const [slug, setSlug] = useState<string>(() => getStoreRouteParams(params as any).slug);
  const [activeTab, setActiveTab] = useState<AccountTab>("orders");

  const [config, setConfig] = useState<any>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authPhone, setAuthPhone] = useState("");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submittingAuth, setSubmittingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Google 1-Click Login State
  const [googleSigningIn, setGoogleSigningIn] = useState(false);
  const [showGooglePhoneModal, setShowGooglePhoneModal] = useState(false);
  const [googlePendingData, setGooglePendingData] = useState<{
    email: string;
    name: string;
    google_id: string;
    id_token?: string;
  } | null>(null);
  const [googlePhoneInput, setGooglePhoneInput] = useState("");
  const [submittingGooglePhone, setSubmittingGooglePhone] = useState(false);
  const [googlePhoneError, setGooglePhoneError] = useState<string | null>(null);

  // Forgot Password Modal State
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [submittingForgot, setSubmittingForgot] = useState(false);
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Customer Profile State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [searchingOrders, setSearchingOrders] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [showAltPhoneInput, setShowAltPhoneInput] = useState(false);
  const [altPhone, setAltPhone] = useState("");

  // Stores & Hooks
  const { addItem } = useVendorCart(slug);
  const { items: wishlistItems, removeItem: removeWishlistItem, clear: clearWishlist } = useVendorWishlist(slug);
  const {
    addresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefault: setDefaultAddress,
  } = useSavedAddresses(slug);

  // Address Modal State
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({
    name: "",
    phone: "",
    email: "",
    street_address: "",
    city: "",
    state: "",
    pincode: "",
    tag: "HOME" as "HOME" | "WORK" | "OTHER",
    is_default: false,
  });

  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({});

  // Sync tab with URL search parameter if it exists
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get("tab") as AccountTab;
      if (tabParam && ["orders", "wishlist", "addresses", "profile", "help"].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  useEffect(() => {
    const resolvedSlug = getStoreRouteParams(params as any).slug;
    setSlug(resolvedSlug);

    async function loadConfig() {
      try {
        const cfg = await platformApi.getPublicStoreConfig(resolvedSlug);
        setConfig(cfg);
      } catch (e) {
        console.error("Failed to load store config:", e);
      } finally {
        setLoadingConfig(false);
      }
    }
    if (resolvedSlug) {
      loadConfig();
    }

    // Inspect customer session from localStorage
    try {
      const sessStr = localStorage.getItem(`dgs_customer_session_${resolvedSlug}`);
      if (sessStr) {
        const sess = JSON.parse(sessStr);
        if (sess?.isLoggedIn && sess?.phone) {
          setIsLoggedIn(true);
          setCustomerName(sess.name || "");
          setCustomerPhone(sess.phone || "");
          setCustomerEmail(sess.email || "");
          setAuthPhone(sess.phone || "");
          fetchOrders(sess.phone, resolvedSlug);
          setCheckingAuth(false);
          return;
        }
      }

      // Pre-fill phone if saved from previous action, but strictly require password sign-in
      const savedPhone = localStorage.getItem("dgs_customer_phone");
      if (savedPhone && savedPhone.trim().length >= 8) {
        setAuthPhone(savedPhone.trim());
      }

      setIsLoggedIn(false);
    } catch (e) {
      setIsLoggedIn(false);
    } finally {
      setCheckingAuth(false);
    }
  }, [slug]);

  useEffect(() => {
    if (typeof document !== "undefined" && config?.store_name) {
      document.title = `My Account & Hub | ${config.store_name}`;
      if (config.logo_url) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (link) link.href = config.logo_url;
      }
    }
  }, [config]);

  const fetchOrders = async (phoneToSearch: string, storeSlug = slug) => {
    if (!phoneToSearch || phoneToSearch.trim().length < 6) return;
    setSearchingOrders(true);
    setHasSearched(true);
    try {
      const result = await platformApi.getPublicCustomerOrders(storeSlug, phoneToSearch.trim());
      setOrders(result || []);
    } catch (e) {
      console.error("Failed to fetch customer orders:", e);
      setOrders([]);
    } finally {
      setSearchingOrders(false);
    }
  };

  const handleAuthSuccess = (cust: any, token?: string) => {
    const sessionData = {
      isLoggedIn: true,
      id: cust.id,
      name: cust.name,
      phone: cust.phone,
      email: cust.email || "",
      token: token || "token_" + Date.now(),
      loginAt: new Date().toISOString(),
    };

    localStorage.setItem(`dgs_customer_session_${slug}`, JSON.stringify(sessionData));
    localStorage.setItem("dgs_customer_name", cust.name);
    localStorage.setItem("dgs_customer_phone", cust.phone);
    if (cust.email) {
      localStorage.setItem("dgs_customer_email", cust.email);
    }

    // Notify header and any listening tabs
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("dgs_customer_auth_changed"));

    setCustomerName(cust.name);
    setCustomerPhone(cust.phone);
    setCustomerEmail(cust.email || "");
    setIsLoggedIn(true);

    fetchOrders(cust.phone, slug);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const cleanPhone = authPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setAuthError("Please enter a valid 10-digit mobile phone number.");
      return;
    }

    if (authMode === "register") {
      if (!authName || authName.trim().length < 2) {
        setAuthError("Your full name is mandatory to create an account.");
        return;
      }

      if (!authEmail || !authEmail.trim().includes("@") || !authEmail.trim().includes(".")) {
        setAuthError("A valid email address is mandatory to create an account.");
        return;
      }

      if (!authPassword || authPassword.trim().length < 6) {
        setAuthError("Password creation is mandatory (minimum 6 characters).");
        return;
      }
    } else {
      if (!authPassword || !authPassword.trim()) {
        setAuthError("Password is mandatory to sign in.");
        return;
      }
    }

    setSubmittingAuth(true);
    try {
      const res = await platformApi.customerAuth(slug, {
        action: authMode,
        phone: cleanPhone,
        name: authMode === "register" ? authName.trim() : undefined,
        email: authMode === "register" ? authEmail.trim() : undefined,
        password: authPassword.trim(),
      });

      if (!res.success && res.detail) {
        setAuthError(res.detail || "Authentication failed. Please try again.");
        return;
      }

      const cust = res.customer || {
        id: "cust_" + cleanPhone,
        name: authName.trim() || "Valued Customer",
        phone: cleanPhone,
        email: authEmail.trim() || "",
      };

      handleAuthSuccess(cust, res.token);
    } catch (err: any) {
      console.error("Auth error:", err);
      setAuthError(err.message || "Failed to log in. Please check your phone number and try again.");
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setGoogleSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const idToken = await user.getIdToken();

      const authRes = await platformApi.customerGoogleAuth(slug, {
        email: user.email || "",
        name: user.displayName || "Google Shopper",
        google_id: user.uid,
        id_token: idToken,
      });

      if (authRes.requires_phone) {
        setGooglePendingData({
          email: user.email || "",
          name: user.displayName || "Google Shopper",
          google_id: user.uid,
          id_token: idToken,
        });
        setShowGooglePhoneModal(true);
        return;
      }

      if (authRes.success && authRes.customer) {
        handleAuthSuccess(authRes.customer, authRes.token);
      } else {
        setAuthError(authRes.detail || "Google authentication failed. Please try again.");
      }
    } catch (err: any) {
      console.error("Google login error:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setAuthError(err.message || "Failed to sign in with Google.");
      }
    } finally {
      setGoogleSigningIn(false);
    }
  };

  const handleCompleteGooglePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setGooglePhoneError(null);
    const cleanPhone = googlePhoneInput.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setGooglePhoneError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!googlePendingData) return;

    setSubmittingGooglePhone(true);
    try {
      const authRes = await platformApi.customerGoogleAuth(slug, {
        ...googlePendingData,
        phone: cleanPhone,
      });
      if (authRes.success && authRes.customer) {
        setShowGooglePhoneModal(false);
        setGooglePendingData(null);
        setGooglePhoneInput("");
        handleAuthSuccess(authRes.customer, authRes.token);
      } else {
        setGooglePhoneError(authRes.detail || "Failed to link phone number. Please try again.");
      }
    } catch (err: any) {
      setGooglePhoneError(err.message || "Failed to link phone number. Please try again.");
    } finally {
      setSubmittingGooglePhone(false);
    }
  };

  const handleRequestPasswordResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccessMsg(null);
    if (!forgotIdentifier || forgotIdentifier.trim().length < 3) {
      setForgotError("Please enter your registered phone number or email address.");
      return;
    }
    setSubmittingForgot(true);
    try {
      const res = await platformApi.customerForgotPassword(slug, forgotIdentifier.trim());
      if (res.success) {
        setForgotSuccessMsg(res.message || "6-digit OTP sent to your registered email!");
        setForgotStep(2);
      } else {
        setForgotError(res.detail || "Failed to send reset code.");
      }
    } catch (err: any) {
      setForgotError(err.message || "Account not found or no verified email linked to this account.");
    } finally {
      setSubmittingForgot(false);
    }
  };

  const handleConfirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccessMsg(null);

    if (!forgotOtp || forgotOtp.trim().length !== 6) {
      setForgotError("Please enter the 6-digit OTP sent to your email.");
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.trim().length < 6) {
      setForgotError("New password must be at least 6 characters.");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Passwords do not match. Please re-enter.");
      return;
    }

    setSubmittingForgot(true);
    try {
      const res = await platformApi.customerResetPassword(slug, {
        identifier: forgotIdentifier.trim(),
        otp: forgotOtp.trim(),
        new_password: forgotNewPassword.trim(),
      });
      if (res.success) {
        setShowForgotPasswordModal(false);
        setForgotStep(1);
        setForgotOtp("");
        setForgotNewPassword("");
        setForgotConfirmPassword("");
        setAuthPhone(res.customer?.phone || forgotIdentifier.trim());
        setAuthPassword(forgotNewPassword.trim());
        if (res.customer && res.token) {
          handleAuthSuccess(res.customer, res.token);
        } else {
          setAuthMode("login");
          setAuthError(null);
        }
      } else {
        setForgotError(res.detail || "Invalid or expired OTP. Please try again.");
      }
    } catch (err: any) {
      setForgotError(err.message || "Failed to reset password. Please check the OTP.");
    } finally {
      setSubmittingForgot(false);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem(`dgs_customer_session_${slug}`);
      localStorage.removeItem("dgs_customer_name");
      localStorage.removeItem("dgs_customer_phone");
      localStorage.removeItem("dgs_customer_email");
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("dgs_customer_auth_changed"));
    } catch (e) {}

    setIsLoggedIn(false);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setAuthPhone("");
    setAuthName("");
    setAuthEmail("");
    setAuthPassword("");
    setOrders([]);
    setHasSearched(false);
    setActiveTab("orders");
  };

  const handleAltPhoneSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = altPhone.replace(/\D/g, "");
    if (clean.length >= 8) {
      fetchOrders(clean, slug);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      if (customerName.trim()) localStorage.setItem("dgs_customer_name", customerName.trim());
      if (customerPhone.trim()) localStorage.setItem("dgs_customer_phone", customerPhone.trim());
      if (customerEmail.trim()) localStorage.setItem("dgs_customer_email", customerEmail.trim());

      const sessStr = localStorage.getItem(`dgs_customer_session_${slug}`);
      if (sessStr) {
        const sess = JSON.parse(sessStr);
        sess.name = customerName.trim();
        sess.phone = customerPhone.trim();
        sess.email = customerEmail.trim();
        localStorage.setItem(`dgs_customer_session_${slug}`, JSON.stringify(sess));
      }

      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("dgs_customer_auth_changed"));

      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 2500);

      if (customerPhone.trim()) {
        fetchOrders(customerPhone.trim());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingProfile(false);
    }
  };

  // Wishlist Actions
  const handleWishlistAddToCart = (item: StoreWishlistItem) => {
    addItem({
      id: item.id,
      product_id: item.product_id,
      name: item.name,
      slug: item.slug,
      price: item.regular_price,
      effective_price: item.effective_price,
      thumbnail_url: item.thumbnail_url,
      quantity: 1,
      stock_quantity: 99,
    });
    setAddedMap((prev) => ({ ...prev, [item.id]: true }));
    setTimeout(() => {
      setAddedMap((prev) => ({ ...prev, [item.id]: false }));
    }, 1800);
  };

  const handleWishlistBuyNow = (item: StoreWishlistItem) => {
    addItem({
      id: item.id,
      product_id: item.product_id,
      name: item.name,
      slug: item.slug,
      price: item.regular_price,
      effective_price: item.effective_price,
      thumbnail_url: item.thumbnail_url,
      quantity: 1,
      stock_quantity: 99,
    });
    router.push(getStoreHref(slug, "/checkout"));
  };

  // Address Modal Helpers
  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    setAddressForm({
      name: customerName || "",
      phone: customerPhone || "",
      email: customerEmail || "",
      street_address: "",
      city: "",
      state: "",
      pincode: "",
      tag: "HOME",
      is_default: addresses.length === 0,
    });
    setAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr: CustomerSavedAddress) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      name: addr.name,
      phone: addr.phone,
      email: addr.email || "",
      street_address: addr.street_address,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      tag: addr.tag,
      is_default: addr.is_default,
    });
    setAddressModalOpen(true);
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.name || !addressForm.phone || !addressForm.street_address || !addressForm.city || !addressForm.pincode) {
      alert("Please fill in all required address fields.");
      return;
    }

    if (editingAddressId) {
      updateAddress(editingAddressId, addressForm);
    } else {
      addAddress(addressForm);
    }
    setAddressModalOpen(false);
  };

  const primaryColor = config?.primary_color || "#062817";

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    let list = [...orders];
    if (orderStatusFilter !== "ALL") {
      list = list.filter((o) => (o.order_status || "").toUpperCase() === orderStatusFilter);
    }
    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.trim().toLowerCase();
      list = list.filter(
        (o) =>
          (o.order_number || "").toLowerCase().includes(q) ||
          (o.customer_name || "").toLowerCase().includes(q) ||
          (o.items || []).some((it: any) => (it.product_name || "").toLowerCase().includes(q))
      );
    }
    return list;
  }, [orders, orderStatusFilter, orderSearchQuery]);

  const getStatusBadge = (status: string) => {
    const s = (status || "NEW").toUpperCase();
    switch (s) {
      case "NEW":
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">New Order</span>;
      case "CONFIRMED":
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">Confirmed</span>;
      case "PROCESSING":
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Packed & Ready</span>;
      case "SHIPPED":
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1"><Truck className="w-3 h-3" /> In Transit</span>;
      case "DELIVERED":
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Delivered</span>;
      case "CANCELLED":
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">{s}</span>;
    }
  };

  const getStepIndex = (status: string) => {
    const s = (status || "NEW").toUpperCase();
    if (s === "NEW") return 0;
    if (s === "CONFIRMED") return 1;
    if (s === "PROCESSING") return 2;
    if (s === "SHIPPED") return 3;
    if (s === "DELIVERED") return 4;
    return 1;
  };

  // ─────────────────────────────────────────────────────────────
  // LOADING VIEW (While verifying session)
  // ─────────────────────────────────────────────────────────────
  if (checkingAuth || loadingConfig) {
    return (
      <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col font-sans">
        <StoreHeader slug={slug} config={config} backHref={getStoreHref(slug)} backLabel="Back to Store" />
        <main className="max-w-md mx-auto px-4 py-24 flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl border-4 border-slate-200 border-t-emerald-600 animate-spin" />
          <h2 className="text-sm font-bold text-slate-800 mt-4">Verifying Customer Account...</h2>
          <p className="text-xs text-slate-500 mt-1">
            Loading shopper details for {config?.store_name || "this store"}
          </p>
        </main>
        <StoreFooter slug={slug} config={config} />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // AUTHENTICATION GATE (When user is not signed in)
  // ─────────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 text-slate-900 flex flex-col font-sans">
        <StoreHeader slug={slug} config={config} backHref={getStoreHref(slug)} backLabel="Back to Store" />

        <main className="max-w-md mx-auto px-4 py-8 sm:py-12 flex-1 w-full space-y-6">
          {/* Back link */}
          <div>
            <Link
              href={getStoreHref(slug)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to {config?.store_name || "Store"}</span>
            </Link>
          </div>

          {/* Auth Portal Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            {/* Store Brand Header */}
            <div className="text-center space-y-2">
              {config?.logo_url ? (
                <img
                  src={config.logo_url}
                  alt={config.store_name}
                  className="w-14 h-14 mx-auto rounded-2xl object-cover border border-slate-200 shadow-xs"
                />
              ) : (
                <div
                  className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-xs uppercase"
                  style={{ backgroundColor: primaryColor }}
                >
                  {config?.store_name ? config.store_name[0] : "S"}
                </div>
              )}
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Customer Account
              </h1>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {authMode === "login"
                  ? "Sign in with your mobile number to view past orders, track shipments, and manage saved delivery addresses."
                  : "Create your personal shopper account to track purchases and enjoy 1-click checkouts."}
              </p>
            </div>

            {/* Google 1-Click Login Button */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleSigningIn}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
              >
                {googleSigningIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
                    <span>Signing in with Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google (1-Click)</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Or Sign In with Phone
                </span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError(null);
                }}
                className={`py-2 rounded-xl transition-all cursor-pointer ${
                  authMode === "login" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setAuthError(null);
                }}
                className={`py-2 rounded-xl transition-all cursor-pointer ${
                  authMode === "register" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-tight">{authError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
              {authMode === "register" && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Your Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Mobile Phone Number *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-500">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="9876543210"
                    className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:outline-blue-600"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  All past and new order invoices are linked directly to this phone number.
                </p>
              </div>

              {authMode === "register" && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email Address *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="e.g. priya@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Mandatory for digital order receipts and dispatch notifications.
                  </p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 block">
                    {authMode === "register" ? "Create Password *" : "Password *"}
                  </label>
                  {authMode === "register" ? (
                    <span className="text-[10px] text-slate-400 font-semibold">Min. 6 chars</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPasswordModal(true);
                        setForgotStep(1);
                        setForgotIdentifier(authPhone || "");
                        setForgotError(null);
                        setForgotSuccessMsg(null);
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={authMode === "register" ? 6 : 1}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder={
                      authMode === "register"
                        ? "Create secure password (min. 6 characters)"
                        : "Enter your account password"
                    }
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {authMode === "register"
                    ? "Mandatory security: Your password protects your orders, invoices, and saved addresses."
                    : "Password protected: Enter your password to view orders and manage personal details."}
                </span>
              </div>

              <button
                type="submit"
                disabled={submittingAuth}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                style={{ backgroundColor: primaryColor }}
              >
                {submittingAuth ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>{authMode === "login" ? "Sign In to My Account" : "Create Account & Sign In"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center text-xs text-slate-500">
              {authMode === "login" ? (
                <p>
                  Don't have an account yet?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("register");
                      setAuthError(null);
                    }}
                    className="font-bold text-slate-900 underline hover:text-blue-600 cursor-pointer"
                  >
                    Create Account
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setAuthError(null);
                    }}
                    className="font-bold text-slate-900 underline hover:text-blue-600 cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* Trust Highlights */}
          <div className="grid grid-cols-3 gap-3 text-center text-[11px] text-slate-600">
            <div className="p-3 bg-white rounded-2xl border border-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <p className="font-semibold text-slate-800">100% Secure</p>
              <p className="text-[10px] text-slate-400">Encrypted portal</p>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-slate-200">
              <Truck className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <p className="font-semibold text-slate-800">Live Tracking</p>
              <p className="text-[10px] text-slate-400">Real-time status</p>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-slate-200">
              <MapPin className="w-4 h-4 text-purple-600 mx-auto mb-1" />
              <p className="font-semibold text-slate-800">1-Click Checkout</p>
              <p className="text-[10px] text-slate-400">Saved addresses</p>
            </div>
          </div>
        </main>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* GOOGLE SIGN-IN PHONE REQUIREMENT MODAL */}
        {/* ───────────────────────────────────────────────────────────── */}
        {showGooglePhoneModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Phone className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-slate-900">1 Final Step for Delivery Updates</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Indian courier & logistics partners require a 10-digit mobile number for dispatch OTPs and tracking updates.
                </p>
              </div>

              {googlePhoneError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{googlePhoneError}</span>
                </div>
              )}

              <form onSubmit={handleCompleteGooglePhone} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Phone Number *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-500">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      autoFocus
                      value={googlePhoneInput}
                      onChange={(e) => setGooglePhoneInput(e.target.value.replace(/\D/g, ""))}
                      placeholder="9876543210"
                      className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:outline-blue-600"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowGooglePhoneModal(false);
                      setGooglePendingData(null);
                    }}
                    className="w-1/3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingGooglePhone}
                    className="w-2/3 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {submittingGooglePhone ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <span>Complete Setup</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* FORGOT PASSWORD MODAL (2-STEP OTP & RESET) */}
        {/* ───────────────────────────────────────────────────────────── */}
        {showForgotPasswordModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Reset Your Password</h3>
                    <p className="text-[11px] text-slate-500">
                      {forgotStep === 1 ? "Step 1 of 2: Verification Code" : "Step 2 of 2: Create New Password"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {forgotError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}

              {forgotSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{forgotSuccessMsg}</span>
                </div>
              )}

              {forgotStep === 1 ? (
                <form onSubmit={handleRequestPasswordResetOtp} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Registered Mobile Number or Email *
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      placeholder="e.g. 9876543210 or yourname@gmail.com"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      We'll email a secure 6-digit verification code to the email address registered with this account.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotPasswordModal(false)}
                      className="w-1/3 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingForgot}
                      className="w-2/3 py-2.5 rounded-xl font-bold text-white shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {submittingForgot ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Sending OTP...</span>
                        </>
                      ) : (
                        <>
                          <span>Send 6-Digit OTP</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleConfirmPasswordReset} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Enter 6-Digit Verification Code *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      autoFocus
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center text-sm font-bold tracking-widest focus:bg-white focus:outline-blue-600"
                    />
                    <div className="flex items-center justify-between mt-1 text-[10px]">
                      <span className="text-slate-400">Valid for 15 minutes</span>
                      <button
                        type="button"
                        onClick={() => setForgotStep(1)}
                        className="text-blue-600 hover:underline"
                      >
                        Change Phone/Email
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      New Password (Min. 6 chars) *
                    </label>
                    <div className="relative">
                      <input
                        type={showForgotNewPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="Enter new secure password"
                        className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="w-1/3 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={submittingForgot}
                      className="w-2/3 py-2.5 rounded-xl font-bold text-white shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {submittingForgot ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <span>Reset & Sign In</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        <StoreFooter slug={slug} config={config} />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // AUTHENTICATED CUSTOMER HUB (When user is logged in)
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 text-slate-900 flex flex-col font-sans">
      <StoreHeader slug={slug} config={config} backHref={getStoreHref(slug)} backLabel="Back to Store" />

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8 flex-1 w-full max-w-full overflow-hidden space-y-6">
        {/* Customer Header Bar */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-md shrink-0 uppercase"
              style={{ backgroundColor: primaryColor }}
            >
              {customerName ? customerName.slice(0, 2) : "ME"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                  {customerName ? `Welcome back, ${customerName}!` : "My Customer Hub"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Verified Customer
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {config?.store_name || "Online Store"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                <span className="font-mono text-slate-700 font-semibold flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" /> +91 {customerPhone}
                </span>
                {customerEmail && (
                  <span className="text-slate-400 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" /> {customerEmail}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar + Sign Out */}
          <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto justify-between sm:justify-start border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
            <button
              onClick={() => setActiveTab("orders")}
              className="text-center px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <span className="block text-lg font-black text-slate-900 font-mono leading-none">
                {orders.length}
              </span>
              <span className="text-[11px] text-slate-500 font-medium mt-1 block">Orders</span>
            </button>
            <div className="h-8 w-px bg-slate-200" />
            <button
              onClick={() => setActiveTab("wishlist")}
              className="text-center px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <span className="block text-lg font-black text-rose-600 font-mono leading-none">
                {wishlistItems.length}
              </span>
              <span className="text-[11px] text-slate-500 font-medium mt-1 block">Wishlist</span>
            </button>
            <div className="h-8 w-px bg-slate-200" />
            <button
              onClick={() => setActiveTab("addresses")}
              className="text-center px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <span className="block text-lg font-black text-blue-600 font-mono leading-none">
                {addresses.length}
              </span>
              <span className="text-[11px] text-slate-500 font-medium mt-1 block">Addresses</span>
            </button>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <button
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer ml-1"
              title="Sign out of account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 scrollbar-none">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === "orders"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>My Orders & Tracking</span>
            {orders.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === "orders" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"}`}>
                {orders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("wishlist")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === "wishlist"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Heart className={`w-4 h-4 ${activeTab === "wishlist" ? "fill-white" : "text-rose-500"}`} />
            <span>My Wishlist</span>
            {wishlistItems.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === "wishlist" ? "bg-white/20 text-white" : "bg-rose-100 text-rose-700"}`}>
                {wishlistItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("addresses")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === "addresses"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Saved Delivery Addresses</span>
            {addresses.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === "addresses" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"}`}>
                {addresses.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === "profile"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile & Details</span>
          </button>

          <button
            onClick={() => setActiveTab("help")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === "help"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Help & Support</span>
          </button>
        </div>

        {/* ───────────────────────────────────────────────────────── */}
        {/* TAB 1: MY ORDERS & TRACKING */}
        {/* ───────────────────────────────────────────────────────── */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            {/* Orders Summary Bar */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  Your Orders & Live Tracking
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing purchases and shipments placed with <strong className="font-mono text-slate-700 font-semibold">+91 {customerPhone}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-start">
                <button
                  type="button"
                  onClick={() => fetchOrders(customerPhone)}
                  disabled={searchingOrders}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Refresh order statuses"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${searchingOrders ? "animate-spin text-blue-600" : ""}`} />
                  <span>{searchingOrders ? "Updating..." : "Refresh"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAltPhoneInput(!showAltPhoneInput)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer"
                >
                  {showAltPhoneInput ? "Hide Search" : "Search Another Phone"}
                </button>
              </div>
            </div>

            {/* Optional Alternate Phone Lookup Form if toggled */}
            {showAltPhoneInput && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2 animate-in fade-in duration-150">
                <p className="text-xs font-semibold text-slate-700">Lookup orders placed with a different mobile phone number:</p>
                <form onSubmit={handleAltPhoneSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">+91</span>
                    <input
                      type="tel"
                      value={altPhone}
                      onChange={(e) => setAltPhone(e.target.value)}
                      placeholder="Enter 10-digit phone"
                      className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-blue-600"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searchingOrders}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Search
                  </button>
                </form>
              </div>
            )}

            {/* Orders List & Controls */}
            <div className="space-y-4">
              {/* Search & Filter Pills */}
              {orders.length > 0 && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
                    {["ALL", "NEW", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"].map((st) => (
                      <button
                        key={st}
                        onClick={() => setOrderStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          orderStatusFilter === st
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {st === "ALL" ? "All Orders" : st}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      placeholder="Search order # or item"
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-blue-600"
                    />
                  </div>
                </div>
              )}

              {/* Orders Content */}
              {filteredOrders.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
                    <Package className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {orders.length === 0 ? "No Orders Placed Yet" : "No Orders Matching Filter"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {orders.length === 0
                      ? `We haven't recorded any completed orders for phone number +91 ${customerPhone} under ${config?.store_name || "this store"}. Start exploring our products below.`
                      : "Try selecting another status tab or clearing your search query."}
                  </p>
                  <div className="pt-2">
                    <Link
                      href={getStoreHref(slug)}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs hover:opacity-95"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Start Shopping
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((ord) => {
                    const stepIdx = getStepIndex(ord.order_status);
                    const isCancelled = (ord.order_status || "").toUpperCase() === "CANCELLED";

                    return (
                      <div
                        key={ord.id}
                        className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5 hover:border-blue-300 transition-colors"
                      >
                        {/* Order Header */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-slate-900 text-sm font-mono tracking-tight">
                                {ord.order_number}
                              </span>
                              {getStatusBadge(ord.order_status)}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              Placed on: {new Date(ord.created_at).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>

                          <div className="sm:text-right">
                            <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
                              ₹{Number(ord.total_amount || 0).toLocaleString("en-IN")}
                            </span>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Payment: <span className="font-semibold text-slate-700">{ord.payment_method}</span> ({ord.payment_status})
                            </p>
                          </div>
                        </div>

                        {/* Live Tracking Progress Bar */}
                        {!isCancelled ? (
                          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                <Truck className="w-4 h-4 text-blue-600" />
                                Live Delivery Status
                              </span>
                              <span className="text-[11px] font-semibold text-slate-500">
                                {ord.courier_name
                                  ? `Courier: ${ord.courier_name} (${ord.tracking_number || "In Transit"})`
                                  : "Preparing Package"}
                              </span>
                            </div>

                            <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                              {[
                                { label: "Order Placed", step: 0 },
                                { label: "Confirmed", step: 1 },
                                { label: "In Transit", step: 3 },
                                { label: "Delivered", step: 4 },
                              ].map((s, idx) => {
                                const completed = stepIdx >= s.step;
                                return (
                                  <div key={idx} className="space-y-1.5">
                                    <div
                                      className={`h-2 rounded-full transition-all ${
                                        completed ? "bg-emerald-500" : "bg-slate-200"
                                      }`}
                                    />
                                    <p
                                      className={`text-[10px] font-semibold ${
                                        completed ? "text-emerald-700 font-bold" : "text-slate-400"
                                      }`}
                                    >
                                      {s.label}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>This order was cancelled. Please contact store support if you have questions.</span>
                          </div>
                        )}

                        {/* Items Breakdown */}
                        <div className="space-y-2">
                          {(ord.items || []).map((it: any) => (
                            <div
                              key={it.id}
                              className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 last:border-0"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs shrink-0">
                                  {it.quantity}×
                                </div>
                                <span className="font-semibold text-slate-800 line-clamp-1">
                                  {it.product_name}
                                  {it.variant_name && (
                                    <span className="text-[11px] text-slate-400 font-normal ml-1">
                                      ({it.variant_name})
                                    </span>
                                  )}
                                </span>
                              </div>
                              <span className="font-mono font-bold text-slate-800">
                                ₹{Number(it.total || it.price * it.quantity).toLocaleString("en-IN")}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Bottom Row / Actions */}
                        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
                          <span className="line-clamp-1 text-[11px]">
                            Deliver to: <strong className="text-slate-700">{ord.customer_name}</strong> • {ord.shipping_address}
                          </span>
                          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                            <Link
                              href={getStoreHref(slug, `/order/${ord.id || ord.order_number}`)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity"
                              style={{ backgroundColor: primaryColor }}
                            >
                              View Digital Receipt
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* TAB 2: MY WISHLIST */}
        {/* ───────────────────────────────────────────────────────── */}
        {activeTab === "wishlist" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                  Your Saved Wishlist
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Keep track of items you love. You have <strong>{wishlistItems.length}</strong> items saved.
                </p>
              </div>

              {wishlistItems.length > 0 && (
                <button
                  type="button"
                  onClick={clearWishlist}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  Clear Wishlist
                </button>
              )}
            </div>

            {wishlistItems.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto shadow-xs">
                  <Heart className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Your Wishlist is Empty</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Explore the catalog and tap the heart icon on any product to save it here for later.
                </p>
                <div className="pt-2">
                  <Link
                    href={getStoreHref(slug)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Browse Catalog
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {wishlistItems.map((item) => {
                  const isAdded = Boolean(addedMap[item.id]);

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:border-rose-300 transition-all flex flex-col justify-between group"
                    >
                      <div className="p-4 space-y-3">
                        {/* Image Container */}
                        <div className="relative aspect-square w-full rounded-2xl bg-slate-100 overflow-hidden">
                          <img
                            src={item.thumbnail_url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80"}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <button
                            type="button"
                            onClick={() => removeWishlistItem(item.product_id)}
                            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-500 hover:text-rose-600 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                            title="Remove from wishlist"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {item.sale_price && item.sale_price > 0 && (
                            <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold shadow-xs">
                              SALE
                            </span>
                          )}
                        </div>

                        {/* Title & Category */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {item.category_name || "Catalog"}
                          </span>
                          <Link href={getStoreHref(slug, `/products/${item.product_id}`)}>
                            <h4 className="text-sm font-bold text-slate-900 line-clamp-1 hover:text-blue-600 transition-colors mt-0.5">
                              {item.name}
                            </h4>
                          </Link>
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-2">
                          <span className="text-base font-black text-slate-900 font-mono">
                            ₹{item.effective_price.toLocaleString("en-IN")}
                          </span>
                          {item.sale_price && item.sale_price > 0 && (
                            <span className="text-xs text-slate-400 line-through font-mono">
                              ₹{item.regular_price}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleWishlistAddToCart(item)}
                          className="py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 hover:bg-slate-50 cursor-pointer"
                          style={{ borderColor: primaryColor, color: primaryColor }}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Added!</span>
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>Add to Cart</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleWishlistBuyNow(item)}
                          className="py-2.5 px-3 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Buy Now</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* TAB 3: SAVED DELIVERY ADDRESSES */}
        {/* ───────────────────────────────────────────────────────── */}
        {activeTab === "addresses" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Saved Delivery Addresses
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Save your home, office, and family delivery addresses for instant 1-click checkouts.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddAddress}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
                style={{ backgroundColor: primaryColor }}
              >
                <Plus className="w-4 h-4" />
                <span>Add New Address</span>
              </button>
            </div>

            {addresses.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
                  <MapPin className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">No Saved Addresses Yet</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Add your shipping destination once, and we will auto-fill your delivery details every time you place an order.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleOpenAddAddress}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs cursor-pointer"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Plus className="w-4 h-4" />
                    Add Your First Address
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`bg-white rounded-3xl border p-5 shadow-xs space-y-3 relative transition-all ${
                      addr.is_default ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* Header Tags */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 flex items-center gap-1">
                          {addr.tag === "HOME" ? <Home className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
                          {addr.tag}
                        </span>
                        {addr.is_default && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Default Address
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditAddress(addr)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Edit Address"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteAddress(addr.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete Address"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Recipient Details */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{addr.name}</h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">+91 {addr.phone}</p>
                    </div>

                    {/* Address Line */}
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {addr.street_address}, {addr.city}, {addr.state} - <strong className="font-mono text-slate-800">{addr.pincode}</strong>
                    </p>

                    {/* Set as default button */}
                    {!addr.is_default && (
                      <div className="pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setDefaultAddress(addr.id)}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                        >
                          Set as Default Address
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* TAB 4: PROFILE & CONTACT PREFERENCES */}
        {/* ───────────────────────────────────────────────────────── */}
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Customer Personal Details
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update your contact details to auto-fill checkouts and receive WhatsApp order tracking alerts.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>

              {profileSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Profile information successfully saved!</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Primary Mobile Number</label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-blue-600"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Used to retrieve your order invoices & shipments</p>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="e.g. rahul@example.com"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Receive PDF invoices via email</p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {savingProfile ? "Saving Profile..." : "Save Profile Details"}
                  </button>
                </div>
              </form>
            </div>

            {/* Account Perks Sidebar */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-md space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-blue-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Shopper Account Perks</h4>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Instant 1-Click Checkout with your Saved Address book</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Persistent Wishlist synchronized across your devices</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Direct WhatsApp updates on your courier dispatch</span>
                </li>
              </ul>

              <div className="pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-600/20 border border-rose-500/30 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of Account</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* TAB 5: HELP & STORE SUPPORT */}
        {/* ───────────────────────────────────────────────────────── */}
        {activeTab === "help" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Direct Merchant Contact */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                  Direct Merchant Support
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Have questions about your order, delivery timeline, or returns? Contact {config?.store_name} directly.
                </p>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                {config?.contact_phone && (
                  <a
                    href={`https://wa.me/${config.contact_phone.replace(/\D/g, "")}?text=Hi%20${encodeURIComponent(config.store_name || "Store")}%2C%20I%20have%20an%20inquiry%20regarding%20my%20order.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 hover:bg-emerald-100 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                        WA
                      </div>
                      <div>
                        <p className="font-bold text-xs">Chat on WhatsApp</p>
                        <p className="text-[11px] text-emerald-700">{config.contact_phone}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-700" />
                  </a>
                )}

                {config?.contact_email && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                    <Mail className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="font-bold text-xs text-slate-800">Email Support</p>
                      <p className="text-[11px] text-slate-500">{config.contact_email}</p>
                    </div>
                  </div>
                )}

                {config?.business_address && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-slate-500 shrink-0" />
                    <div>
                      <p className="font-bold text-xs text-slate-800">Store / Dispatch Address</p>
                      <p className="text-[11px] text-slate-500">{config.business_address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Shipping & Returns FAQ */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  Store Shipping & Returns Policy
                </h3>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <h5 className="font-bold text-slate-900">How long does shipping take?</h5>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Standard delivery typically takes <strong>{config?.estimated_delivery_days || "3-5 Business Days"}</strong> depending on your pincode.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <h5 className="font-bold text-slate-900">Is Cash on Delivery (COD) supported?</h5>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {config?.cod_enabled !== false
                      ? "Yes, Cash on Delivery is supported for all verified customer addresses."
                      : "Only prepaid orders are supported currently."}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <h5 className="font-bold text-slate-900">How can I track my shipment?</h5>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Your orders and live courier statuses are automatically loaded in the <strong>My Orders & Tracking</strong> tab above.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ───────────────────────────────────────────────────────── */}
      {/* ADDRESS ADD / EDIT MODAL */}
      {/* ───────────────────────────────────────────────────────── */}
      {addressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                {editingAddressId ? "Edit Delivery Address" : "Add New Delivery Address"}
              </h3>
              <button
                type="button"
                onClick={() => setAddressModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Recipient Name *</label>
                  <input
                    type="text"
                    required
                    value={addressForm.name}
                    onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                    placeholder="10-digit mobile"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Flat / House No. / Building / Street *</label>
                <textarea
                  required
                  rows={2}
                  value={addressForm.street_address}
                  onChange={(e) => setAddressForm({ ...addressForm, street_address: e.target.value })}
                  placeholder="e.g. Flat 402, Green Valley Apartments, MG Road"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">City / Town *</label>
                  <input
                    type="text"
                    required
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    placeholder="e.g. Mumbai"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    placeholder="e.g. Maharashtra"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Pincode *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={addressForm.pincode}
                    onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                    placeholder="6 digits"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  {(["HOME", "WORK", "OTHER"] as const).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setAddressForm({ ...addressForm, tag })}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-colors ${
                        addressForm.tag === tag
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addressForm.is_default}
                    onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Set as default</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddressModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <StoreFooter slug={slug} config={config} />
    </div>
  );
}
