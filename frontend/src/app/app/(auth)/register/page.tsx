"use client";

import React, { useState } from "react";
import Link from "next/link";
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
  const { register, loginWithGoogle } = usePlatformAuth();

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
      await loginWithGoogle();
    } catch (err: any) {
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

      // Downscale to max 512x512 via HTML canvas to ensure fast and lightweight transfer
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
      password: formData.password,
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
    <div className="flex-1 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-2xl shadow-sm mb-4">
          D
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Launch Your Branded Android App
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          {stage === "signup"
            ? "Sign up with your email to start setting up your customized mobile app and storefront."
            : "Get your customized mobile shopping app and online storefront in 2 simple steps."}
        </p>

        {/* Multi-Step Indicator Bar (Only for Step 1 & Step 2) */}
        {stage !== "signup" && (
          <div className="mt-6 max-w-xs mx-auto">
            <div className="flex items-center justify-center gap-2">
              <div
                className={`flex-1 h-1.5 rounded-full transition-all ${
                  stage === "step1" ? "bg-blue-600" : "bg-emerald-500"
                }`}
              />
              <div
                className={`flex-1 h-1.5 rounded-full transition-all ${
                  stage === "step2" ? "bg-blue-600" : "bg-slate-200"
                }`}
              />
            </div>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {stage === "step1" ? "Step 1 of 2: Owner Details" : "Step 2 of 2: Business & App Details"}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-3xl sm:px-10">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* STAGE 0: SIGN UP FIRST                                   */}
          {/* ======================================================== */}
          {stage === "signup" && (
            <form onSubmit={handleSignUpFirst} className="space-y-5">
              <div>
                <button
                  type="button"
                  onClick={handleGoogleSignUp}
                  disabled={loading || googleLoading}
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs transition-all disabled:opacity-50 hover:border-slate-400 cursor-pointer"
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

                <div className="relative my-5 flex items-center justify-center">
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
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">At least 6 characters.</p>
              </div>

              <button
                type="submit"
                className="w-full mt-6 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors cursor-pointer"
              >
                Sign Up & Start Setup
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* ======================================================== */}
          {/* STEP 1: OWNER FULL NAME, EMAIL, WHATSAPP                 */}
          {/* ======================================================== */}
          {stage === "step1" && (
            <form onSubmit={handleNextToStep2} className="space-y-5">
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
                    placeholder="e.g. Ananya Sharma"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Email Address (Pre-filled from Sign up) */}
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
                    placeholder="vendor@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* WhatsApp Number with Country Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  WhatsApp Number (with Country Code) <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    name="country_code"
                    value={formData.country_code}
                    onChange={handleChange}
                    className="w-36 px-2.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code} ({c.country})
                      </option>
                    ))}
                  </select>
                  <div className="relative flex-1">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      required
                      name="whatsapp_number"
                      value={formData.whatsapp_number}
                      onChange={handleChange}
                      placeholder="9876543210"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Default: India (+91). For real-time WhatsApp order alerts & customer chat.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setStage("signup")}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>

                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors cursor-pointer"
                >
                  Continue to Business Details
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* STEP 2: BUSINESS & STORE DETAILS                         */}
          {/* ======================================================== */}
          {stage === "step2" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Business/Store Name */}
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
                      placeholder="e.g. ABC Fashion"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Brand Name (Fetched from Business Name + Editable + Admin Approval Notice) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Brand Name <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Changing requires Admin Approval
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
                      placeholder="e.g. ABC Fashion"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-amber-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-[10px] text-amber-800 mt-1">
                    Auto-fetched from Store Name. Editable now, but changing Brand Name later will need Admin Approval.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Business Number (Website support) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Business Number <span className="text-[11px] text-slate-400 font-normal">(shown on website)</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      name="business_phone"
                      value={formData.business_phone}
                      onChange={handleChange}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Business Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Business Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                </div>
              </div>

              {/* Business Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Business Description
                </label>
                <textarea
                  rows={2}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Briefly describe what your store specializes in..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Brand Logo Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Brand Logo
                </label>
                <div className="flex items-center gap-3">
                  {formData.logo_url ? (
                    <div className="w-12 h-12 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 shrink-0">
                      <img
                        src={formData.logo_url}
                        alt="Logo Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&q=80";
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 bg-slate-50 shrink-0">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors">
                        <span>Upload Logo Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[10px] text-slate-400">PNG, JPG, SVG square recommended</span>
                    </div>
                    {formData.logo_url && (
                      <p className="text-[10px] text-emerald-600 font-medium truncate">
                        ✓ Logo photo uploaded successfully
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Address Full */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Business Address
                </label>
                <textarea
                  rows={2}
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="e.g. Shop 12, Phoenix Marketcity, Kurla West, Mumbai, Maharashtra - 400070"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Dropdown 1: Do You have any Payment Gateway? (1 question on 1 line) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                  Do You have any Payment Gateway?
                </label>
                <select
                  name="has_payment_gateway"
                  value={formData.has_payment_gateway}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="No">No (COD / Assisted)</option>
                  <option value="Yes">Yes (Razorpay / Paytm / PhonePe)</option>
                </select>
              </div>

              {/* Dropdown 2: Will you need help to register with any Delivery Partner? (1 question on 1 line) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  Will you need help to register with any Delivery Partner?
                </label>
                <select
                  name="needs_delivery_help"
                  value={formData.needs_delivery_help}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="No">No (Self managed / Own delivery)</option>
                  <option value="Yes">Yes (Shiprocket / Delivery Partner help)</option>
                </select>
              </div>

              {/* Desired Store Subdomain (Auto-fetched from Business Name + Editable) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Desired Store Subdomain <span className="text-rose-500">*</span>
                </label>
                <div className="flex rounded-xl shadow-xs">
                  <input
                    type="text"
                    required
                    name="store_slug"
                    value={formData.store_slug}
                    onChange={handleChange}
                    placeholder="abc"
                    className="w-full min-w-0 flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-l-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="inline-flex items-center px-3.5 rounded-r-xl border border-l-0 border-slate-200 bg-slate-100 text-slate-600 text-xs font-mono font-medium">
                    .digitalgrowthstudio.in
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Auto-fetched from Store Name and fully editable.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setStage("step1")}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Register & Launch My App 🚀
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
