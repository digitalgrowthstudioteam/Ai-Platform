"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { usePlatformAuth } from "@/lib/app-platform/auth";
import {
  Lock,
  Mail,
  Store,
  User,
  Phone,
  Tag,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CreditCard,
  Truck,
  Image as ImageIcon,
  CheckCircle2,
  Globe,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  X,
  Upload,
} from "lucide-react";

const COUNTRY_CODES = [
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+1", country: "USA / Canada", flag: "🇺🇸" },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+33", country: "France", flag: "🇫🇷" },
];

export default function PlatformRegisterPage() {
  const { register } = usePlatformAuth();

  // Wizard Stage: "signup" (Sign up first) -> "step1" (Owner details) -> "step2" (Business details)
  const [stage, setStage] = useState<"signup" | "step1" | "step2">("signup");

  // Track if user manually overrode auto-fetched fields
  const [brandNameManuallyEdited, setBrandNameManuallyEdited] = useState(false);
  const [subdomainManuallyEdited, setSubdomainManuallyEdited] = useState(false);

  const [formData, setFormData] = useState({
    // Initial Sign Up credentials
    email: "",
    password: "",

    // Step 1: Owner Details
    owner_name: "",
    country_code: "+91",
    whatsapp_number: "",

    // Step 2: Business Details
    business_name: "",
    business_phone: "",
    category: "General Retail",
    brand_name: "",
    description: "",
    logo_url: "",
    address: "",
    has_payment_gateway: "No" as "Yes" | "No",
    needs_delivery_help: "No" as "Yes" | "No",
    store_slug: "",
  });

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);
  const [isGoogleSignUp, setIsGoogleSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const handleGoogleSignUp = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(auth, provider);
      const googleUser = credential.user;
      const idToken = await googleUser.getIdToken();

      const googleName = googleUser.displayName || "";
      const googleEmail = googleUser.email || "";

      setFormData((prev) => {
        const updated = {
          ...prev,
          owner_name: googleName || prev.owner_name,
          email: googleEmail || prev.email,
          password: prev.password || "GoogleAuthSecretPass@123",
        };
        // Auto-fetch default business name from owner name if blank
        if (!updated.business_name && googleName) {
          updated.business_name = `${googleName}'s Store`;
          if (!brandNameManuallyEdited) {
            updated.brand_name = `${googleName}'s Store`;
          }
          if (!subdomainManuallyEdited) {
            updated.store_slug = slugify(googleName);
          }
        }
        return updated;
      });

      setGoogleIdToken(idToken);
      setIsGoogleSignUp(true);

      // Advance directly to Slide 1 (Owner Details)
      setStage("step1");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user" || err.message?.includes("popup-closed")) {
        return;
      }
      setError(err.message || "Google Sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === "brand_name") {
      setBrandNameManuallyEdited(true);
    }
    if (name === "store_slug") {
      setSubdomainManuallyEdited(true);
    }

    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Auto-fetch Brand Name and Subdomain from Business / Store Name!
      if (name === "business_name") {
        if (!brandNameManuallyEdited) {
          updated.brand_name = value;
        }
        if (!subdomainManuallyEdited) {
          updated.store_slug = slugify(value);
        }
      }
      return updated;
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      // Downscale to max 512x512 via HTML canvas
      const img = new Image();
      img.onload = () => {
        const maxDim = 512;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.85);
          setFormData((prev) => ({ ...prev, logo_url: compressed }));
        } else {
          setFormData((prev) => ({ ...prev, logo_url: dataUrl }));
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Stage 1 Validation: Sign up with Email + Password first
  const handleSignUpFirst = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email.trim() || !formData.email.includes("@")) {
      setError("Please enter a valid email address to sign up.");
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setStage("step1");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Step 1 Validation: Owner details
  const handleNextToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.owner_name.trim()) {
      setError("Please provide the Owner's Full Name.");
      return;
    }
    if (!formData.whatsapp_number.trim()) {
      setError("Please enter your WhatsApp Number for order updates.");
      return;
    }

    setStage("step2");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Final Submission: Business details & Account creation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.business_name.trim()) {
      setError("Please enter your Business / Store Name.");
      return;
    }
    if (!formData.brand_name.trim()) {
      setError("Please enter your Brand Name.");
      return;
    }
    if (!formData.store_slug.trim()) {
      setError("Please enter your Desired Store Subdomain.");
      return;
    }

    setLoading(true);

    const fullWhatsappNumber = `${formData.country_code} ${formData.whatsapp_number.trim()}`;
    const payload = {
      owner_name: formData.owner_name.trim(),
      email: formData.email.toLowerCase().trim(),
      password: formData.password || "GoogleAuthSecretPass@123",
      google_id_token: googleIdToken || undefined,
      whatsapp_number: fullWhatsappNumber,
      phone: fullWhatsappNumber,
      business_name: formData.business_name.trim(),
      business_phone: formData.business_phone.trim() || fullWhatsappNumber,
      category: formData.category,
      brand_name: formData.brand_name.trim(),
      description: formData.description.trim() || undefined,
      logo_url: formData.logo_url.trim() || undefined,
      address: formData.address.trim() || undefined,
      has_payment_gateway: formData.has_payment_gateway,
      needs_delivery_help: formData.needs_delivery_help,
      store_slug: formData.store_slug.trim(),
    };

    try {
      await register(payload);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please check your details.");
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold shadow-2xs mb-4">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Launch Your Online Business</span>
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900">
          Launch Your Branded Store & App
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          {stage === "signup"
            ? "Create your account to start provisioning your storefront and mobile shopping app."
            : "Complete your store setup in 2 simple steps to generate your live portal."}
        </p>

        {/* Modern Interactive Stepper Bar (Only for Step 1 & Step 2) */}
        {stage !== "signup" && (
          <div className="mt-6 max-w-md mx-auto">
            <div className="flex items-center justify-center gap-3">
              {/* Step 1 Pill */}
              <button
                type="button"
                onClick={() => setStage("step1")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  stage === "step1"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                {stage === "step2" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-white text-blue-600 text-[10px] font-bold flex items-center justify-center">
                    1
                  </span>
                )}
                <span>Owner & Contact</span>
              </button>

              {/* Connecting Divider */}
              <div
                className={`w-8 h-0.5 rounded-full transition-colors ${
                  stage === "step2" ? "bg-emerald-500" : "bg-slate-200"
                }`}
              />

              {/* Step 2 Pill */}
              <div
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  stage === "step2"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-400 border border-slate-200"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    stage === "step2" ? "bg-white text-blue-600" : "bg-slate-300 text-white"
                  }`}
                >
                  2
                </span>
                <span>Store & Brand Details</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-slate-200/90 rounded-3xl">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-3 shadow-2xs">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">
                <p className="font-semibold text-rose-900">Registration Notice</p>
                <p className="mt-0.5 text-rose-700">{error}</p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STAGE 0: SIGN UP FIRST                                   */}
          {/* ======================================================== */}
          {stage === "signup" && (
            <form onSubmit={handleSignUpFirst} className="space-y-6">
              <div>
                <button
                  type="button"
                  onClick={handleGoogleSignUp}
                  disabled={loading || googleLoading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs transition-all disabled:opacity-50 hover:border-slate-400 cursor-pointer"
                >
                  {googleLoading ? (
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M17.64 9.205c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                        fill="#4285F4"
                      />
                      <path
                        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.938 5.481 18 9 18z"
                        fill="#34A853"
                      />
                      <path
                        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.59.102-1.17.282-1.71V4.958H.957A8.995 8.995 0 0 0 0 9c0 1.451.348 2.822.957 4.042l3.007-2.332z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M9 3.58c1.32 0 2.508.454 3.44 1.345l2.582-2.58C13.463.89 11.426 0 9 0 5.481 0 2.438 2.062.957 5.958L3.964 8.29C4.672 6.163 6.656 4.58 9 3.58z"
                        fill="#EA4335"
                      />
                    </svg>
                  )}
                  <span>{googleLoading ? "Connecting with Google..." : "Sign up with Google"}</span>
                </button>
                <p className="mt-2 text-center text-[11px] text-slate-400">
                  Instant Google verification. Pre-fills your email and name.
                </p>

                <div className="relative my-6 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative bg-white px-3 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                    or sign up with email
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. vendor@example.com"
                    className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Create Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••••••"
                    className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-2xs"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">At least 6 characters.</p>
              </div>

              <button
                type="submit"
                className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <span>Continue to Step 1: Owner Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* ======================================================== */}
          {/* STEP 1: OWNER FULL NAME, EMAIL, WHATSAPP                 */}
          {/* ======================================================== */}
          {stage === "step1" && (
            <form onSubmit={handleNextToStep2} className="space-y-6">
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/60 flex items-start gap-3">
                <User className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 leading-relaxed">
                  <p className="font-bold">Merchant Ownership & Direct Alerts</p>
                  <p className="text-blue-700 mt-0.5">
                    Your contact number is used to deliver real-time order alerts, payment confirmation, and platform verification.
                  </p>
                </div>
              </div>

              {/* Owner Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Owner Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    name="owner_name"
                    value={formData.owner_name}
                    onChange={handleChange}
                    placeholder="e.g. Vikram Wadkar"
                    className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Account Email <span className="text-rose-500">*</span>
                  </label>
                  {isGoogleSignUp && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Google Verified
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    readOnly={isGoogleSignUp}
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="vendor@example.com"
                    className={`w-full h-11 pl-10 pr-4 rounded-xl text-sm transition-all shadow-2xs ${
                      isGoogleSignUp
                        ? "bg-slate-100/80 text-slate-600 border border-slate-200 cursor-not-allowed"
                        : "bg-white border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10"
                    }`}
                  />
                </div>
              </div>

              {/* WhatsApp Number with Country Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  WhatsApp Number (For Order Updates) <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative w-36">
                    <select
                      name="country_code"
                      value={formData.country_code}
                      onChange={handleChange}
                      className="w-full h-11 pl-3 pr-8 bg-white border border-slate-200 rounded-xl text-xs font-semibold appearance-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 shadow-2xs cursor-pointer"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-4 pointer-events-none" />
                  </div>
                  <div className="relative flex-1">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      required
                      name="whatsapp_number"
                      value={formData.whatsapp_number}
                      onChange={handleChange}
                      placeholder="9876543210"
                      className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-2xs"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Default: India (+91). Used for merchant notifications and customer order updates.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStage("signup")}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>

                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  <span>Continue to Step 2: Store & Brand</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* STEP 2: BUSINESS & STORE DETAILS                         */}
          {/* ======================================================== */}
          {stage === "step2" && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ─────────────────────────────────────────────────── */}
              {/* SECTION 1: STORE IDENTITY & LIVE SUBDOMAIN          */}
              {/* ─────────────────────────────────────────────────── */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-blue-600" />
                    1. Storefront & Brand Identity
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Define your customer-facing store name and dedicated web subdomain.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Business / Store Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Business / Store Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        name="business_name"
                        value={formData.business_name}
                        onChange={handleChange}
                        placeholder="e.g. DGS Fashion"
                        className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Brand Name */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Brand Name <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-slate-400" /> App & Receipt Title
                      </span>
                    </div>
                    <div className="relative">
                      <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        name="brand_name"
                        value={formData.brand_name}
                        onChange={handleChange}
                        placeholder="e.g. DGS"
                        className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Subdomain Input & Live URL Preview */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-600" />
                      Dedicated Store Subdomain
                    </label>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      ✓ Instant HTTPS Live Setup
                    </span>
                  </div>

                  <div className="flex rounded-xl shadow-2xs overflow-hidden border border-slate-200 bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                    <span className="inline-flex items-center pl-3.5 text-slate-400 text-xs font-mono select-none">
                      https://
                    </span>
                    <input
                      type="text"
                      required
                      name="store_slug"
                      value={formData.store_slug}
                      onChange={handleChange}
                      placeholder="dgs"
                      className="w-full min-w-0 flex-1 px-1.5 py-2.5 text-sm font-mono font-semibold text-blue-600 focus:outline-none"
                    />
                    <span className="inline-flex items-center px-3.5 bg-slate-100 text-slate-600 text-xs font-mono font-medium border-l border-slate-200">
                      .digitalgrowthstudio.in
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Customers will shop directly on{" "}
                    <strong className="text-slate-700 font-mono">
                      https://{formData.store_slug || "yourstore"}.digitalgrowthstudio.in
                    </strong>
                  </p>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────── */}
              {/* SECTION 2: CATEGORY, DESCRIPTION & BRAND LOGO       */}
              {/* ─────────────────────────────────────────────────── */}
              <div className="space-y-4 pt-2">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-blue-600" />
                    2. Business Profile & Branding
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Business Category */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Business Category <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full h-11 pl-3.5 pr-10 bg-white border border-slate-200 rounded-xl text-sm font-medium appearance-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-2xs cursor-pointer"
                      >
                        <option value="Clothing & Apparel">Clothing & Apparel</option>
                        <option value="Footwear & Shoes">Footwear & Shoes</option>
                        <option value="Health, Beauty & Cosmetics">Health, Beauty & Cosmetics</option>
                        <option value="Electronics & Mobile Accessories">Electronics & Mobile Accessories</option>
                        <option value="Grocery, Gourmet & Food">Grocery, Gourmet & Food</option>
                        <option value="Home, Living & Kitchen">Home, Living & Kitchen</option>
                        <option value="Jewelry & Watches">Jewelry & Watches</option>
                        <option value="General Retail">General Retail</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                    </div>
                  </div>

                  {/* Business Contact Phone */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Support Phone <span className="text-[10px] text-slate-400 font-normal">(Shown on Store)</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        name="business_phone"
                        value={formData.business_phone}
                        onChange={handleChange}
                        placeholder={formData.whatsapp_number ? `${formData.country_code} ${formData.whatsapp_number}` : "+91 9270278119"}
                        className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Business Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Store Bio / Short Description
                  </label>
                  <textarea
                    rows={2}
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Briefly describe what your store specializes in (e.g. Premium handcrafted apparel and organic accessories)..."
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-2xs resize-none"
                  />
                </div>

                {/* Brand Logo Uploader Component */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Brand Logo <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                  </label>

                  {formData.logo_url ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={formData.logo_url}
                          alt="Logo Preview"
                          className="w-14 h-14 rounded-xl object-contain bg-white border border-slate-200 shadow-2xs"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-800">Logo Uploaded</p>
                          <p className="text-[11px] text-emerald-600 font-medium">✓ Ready for Storefront & Android App icon</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold shadow-2xs transition-colors">
                          <span>Change</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setFormData((p) => ({ ...p, logo_url: "" }))}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove logo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer group flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/30 transition-all gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors shadow-2xs">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                            Upload Store / App Logo
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Square PNG, JPG or SVG (Recommended 512×512)
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs group-hover:border-blue-300">
                        Choose File
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Full Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Physical Store / Dispatch Address
                  </label>
                  <textarea
                    rows={2}
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="e.g. Shop 12, Commercial Complex, MG Road, Pune, Maharashtra - 411001"
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-2xs resize-none"
                  />
                </div>
              </div>

              {/* ─────────────────────────────────────────────────── */}
              {/* SECTION 3: OPERATIONS & PAYMENT SETUP               */}
              {/* ─────────────────────────────────────────────────── */}
              <div className="space-y-4 pt-2">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    3. Payments & Logistics Options
                  </h3>
                </div>

                {/* Payment Gateway Toggle Cards */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Online Payment Gateway Status
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, has_payment_gateway: "No" }))}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        formData.has_payment_gateway === "No"
                          ? "bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">COD & Assisted UPI</span>
                        {formData.has_payment_gateway === "No" && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Collect payment on delivery or via manual QR. No merchant gateway required.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, has_payment_gateway: "Yes" }))}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        formData.has_payment_gateway === "Yes"
                          ? "bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">Razorpay / Online PG</span>
                        {formData.has_payment_gateway === "Yes" && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        I already have or want automated online checkout via Razorpay/Paytm.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Delivery Partner Toggle Cards */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Shipping & Delivery Fulfillment
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, needs_delivery_help: "No" }))}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        formData.needs_delivery_help === "No"
                          ? "bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">Self Managed Delivery</span>
                        {formData.needs_delivery_help === "No" && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        We deliver using our own delivery staff or local courier partners.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, needs_delivery_help: "Yes" }))}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        formData.needs_delivery_help === "Yes"
                          ? "bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">Shiprocket Assistance</span>
                        {formData.needs_delivery_help === "Yes" && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Connect with Shiprocket for discounted multi-courier pickup across India.
                      </p>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStage("step1")}
                  className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Owner Details
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Register & Launch My App 🚀</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Already have an account?{" "}
              <Link href="/app/login" className="font-semibold text-blue-600 hover:text-blue-700">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
