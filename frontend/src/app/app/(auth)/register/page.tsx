"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePlatformAuth } from "@/lib/app-platform/auth";
import { Lock, Mail, Store, User, Phone, Tag, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

export default function PlatformRegisterPage() {
  const { register, loginWithGoogle } = usePlatformAuth();
  const [formData, setFormData] = useState({
    business_name: "",
    owner_name: "",
    email: "",
    phone: "",
    password: "",
    category: "General Retail",
    store_slug: "",
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "business_name" && !prev.store_slug) {
        updated.store_slug = value.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(formData);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white font-bold text-2xl shadow-sm mb-4">
          D
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Launch Your Online Store & Branded Android App</h2>
        <p className="mt-2 text-sm text-slate-600">
          Join Digital Growth Studio’s multi-vendor platform. Create your store in 60 seconds.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Google 1-Click Registration */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={loading || googleLoading}
            className="w-full mb-6 flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs transition-all disabled:opacity-50 hover:border-slate-400 cursor-pointer"
          >
            {googleLoading ? (
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.205c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.938 5.481 18 9 18z" fill="#34A853" />
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.59.102-1.17.282-1.71V4.958H.957A8.995 8.995 0 0 0 0 9c0 1.451.348 2.822.957 4.042l3.007-2.332z" fill="#FBBC05" />
                <path d="M9 3.58c1.32 0 2.508.454 3.44 1.345l2.582-2.58C13.463.89 11.426 0 9 0 5.481 0 2.438 2.062.957 5.958L3.964 8.29C4.672 6.163 6.656 4.58 9 3.58z" fill="#EA4335" />
              </svg>
            )}
            <span>{googleLoading ? "Connecting with Google..." : "Sign up with Google"}</span>
          </button>

          <div className="relative mb-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative bg-white px-3 text-xs uppercase tracking-wider text-slate-400 font-medium">
              or register with email
            </div>
          </div>

          {/* Membership Tier Banner */}
          <div className="mb-6 p-4 rounded-xl bg-blue-50/80 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Initial Membership</span>
                <h4 className="text-base font-bold text-slate-900 mt-0.5">Starter Store Plan</h4>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-700">₹499<span className="text-xs font-normal text-slate-500">/mo</span></p>
                <p className="text-[11px] text-slate-500">+ ₹2,000 one-time setup</p>
              </div>
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Branded Online Storefront</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Dedicated Store Subdomain</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Android Shopping App Config</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 1GB High-Speed Bunny CDN</li>
            </ul>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Business / Store Name
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    name="business_name"
                    value={formData.business_name}
                    onChange={handleChange}
                    placeholder="ABC Fashion"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Owner Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    name="owner_name"
                    value={formData.owner_name}
                    onChange={handleChange}
                    placeholder="Ananya Sharma"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    required
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 9876543210"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Business Category
                </label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Clothing & Apparel">Clothing & Apparel</option>
                    <option value="Health & Beauty">Health & Beauty</option>
                    <option value="Electronics & Gadgets">Electronics & Gadgets</option>
                    <option value="Home & Kitchen">Home & Kitchen</option>
                    <option value="Grocery & Gourmet">Grocery & Gourmet</option>
                    <option value="Jewelry & Accessories">Jewelry & Accessories</option>
                    <option value="General Retail">General Retail</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Desired Store Subdomain
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
                <span className="inline-flex items-center px-3.5 rounded-r-xl border border-l-0 border-slate-200 bg-slate-100 text-slate-600 text-xs font-mono">
                  .digitalgrowthstudio.in
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Register & Create Store
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
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

