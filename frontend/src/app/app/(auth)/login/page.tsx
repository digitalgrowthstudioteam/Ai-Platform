"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePlatformAuth } from "@/lib/app-platform/auth";
import { Lock, Mail, ArrowRight, Shield, Store, AlertCircle } from "lucide-react";

export default function PlatformLoginPage() {
  const { login } = usePlatformAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please verify email and password.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white font-bold text-2xl shadow-sm mb-4">
          D
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sign in to your platform account</h2>
        <p className="mt-2 text-sm text-slate-600">
          Manage your online store, products, orders & Android mobile app
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vendor@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-xs transition-colors disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-2.5 text-center">One-Click Demonstration Logins:</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleQuickLogin("abcfashion@digitalgrowthstudio.in", "Vendor@123")}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-blue-600" />
                  ABC Fashion (Vendor VND0001)
                </span>
                <span className="font-mono text-[10px] text-blue-500">abcfashion@...</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("xyzcosmetics@digitalgrowthstudio.in", "Vendor@123")}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-emerald-600" />
                  XYZ Cosmetics (Vendor VND0002)
                </span>
                <span className="font-mono text-[10px] text-emerald-500">xyzcosmetics@...</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("admin@digitalgrowthstudio.in", "Admin@DGS2026!")}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg border border-purple-200 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-purple-600" />
                  Super Admin
                </span>
                <span className="font-mono text-[10px] text-purple-500">admin@...</span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              New business owner?{" "}
              <Link href="/app/register" className="font-semibold text-blue-600 hover:text-blue-700">
                Register store now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

