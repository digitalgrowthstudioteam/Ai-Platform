"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePlatformAuth } from "@/lib/app-platform/auth";
import { Sparkles, ArrowRight, Store, AlertCircle, ShieldCheck } from "lucide-react";

export default function PlatformLoginPage() {
  const { loginWithGoogle, enterDemoSandbox } = usePlatformAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
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

  const handleLaunchDemo = () => {
    setError(null);
    enterDemoSandbox();
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-14 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <img
          src="/logo.jpg"
          alt="Digital Growth Studio"
          className="inline-block w-14 h-14 rounded-2xl object-contain shadow-sm mb-4 border border-slate-200 bg-white"
        />
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Sign in to Digital Growth Studio
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Multi-Vendor E-Commerce SaaS & Branded Android Apps
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Action: Google Sign-in Only */}
          <div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
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
              <span>{googleLoading ? "Connecting with Google..." : "Continue with Google"}</span>
            </button>
            <p className="mt-2 text-[11px] text-center text-slate-400">
              Instant access for Super Admin & registered vendors
            </p>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative bg-white px-3 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              or try live sandbox
            </div>
          </div>

          {/* Interactive Demo Sandbox Experience Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-100 text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[11px] font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              1-Click Interactive Demo
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Experience Vendor Dashboard
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Test-drive adding products, reordering multi-photo galleries, and managing orders in a full interactive sandbox.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLaunchDemo}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors cursor-pointer"
            >
              <Store className="w-4 h-4" />
              Launch Demo Store Dashboard
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <p className="text-[10px] text-slate-400 leading-tight">
              Temporary demo session • Changes reset automatically and never alter live stores
            </p>
          </div>

          <div className="pt-2 text-center">
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
