"use client";

import React, { useState } from "react";
import { platformApi } from "@/lib/app-platform/api";
import { usePlatformAuth } from "@/lib/app-platform/auth";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Loader2,
  AlertCircle,
  Smartphone,
  Globe,
  Package,
  Headphones,
  LogOut,
  RefreshCw,
} from "lucide-react";

export default function SubscriptionExpiredGate() {
  const { user, refreshUser, logout } = usePlatformAuth();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRenewPayment = async () => {
    setError(null);
    setPaying(true);

    try {
      // 1. Create Subscription Renewal Order
      const orderRes = await platformApi.createSubscriptionOrder();

      // If mock test mode
      if (orderRes.is_mock) {
        await platformApi.verifySubscriptionPayment({
          razorpay_order_id: orderRes.order_id,
          razorpay_payment_id: `pay_mock_sub_${Date.now()}`,
          razorpay_signature: "mock_signature_approved",
        });
        await refreshUser();
        return;
      }

      // 2. Load Razorpay SDK
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError("Failed to load Razorpay Checkout SDK. Please check your internet connection.");
        setPaying(false);
        return;
      }

      // 3. Open Razorpay Checkout Dialog
      const options = {
        key: orderRes.key_id,
        amount: orderRes.amount,
        currency: orderRes.currency,
        name: "Digital Growth Studio",
        description: "Starter Store Membership (₹499/mo Renewal)",
        order_id: orderRes.order_id,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        theme: {
          color: "#2563EB",
        },
        handler: async (response: any) => {
          try {
            await platformApi.verifySubscriptionPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            await refreshUser();
          } catch (err: any) {
            setError(err.message || "Payment verification failed. Please contact platform support.");
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setError(err.message || "Failed to initiate Razorpay checkout.");
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Glow Header Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 p-6 sm:p-7 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 translate-x-6 -translate-y-6 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold mb-3">
            <Lock className="w-3.5 h-3.5" />
            <span>Monthly Subscription Expired</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Renew Your Starter Store Plan
          </h2>
          <p className="text-blue-100 text-xs sm:text-sm mt-1.5 max-w-md mx-auto">
            Your 30-day billing cycle for {user?.store_name || "your store"} has ended. Renew to restore full access to orders, products, and your Android app.
          </p>
        </div>

        <div className="p-6 sm:p-7 space-y-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Pricing Box */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Monthly Renewal Fee
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-slate-900">₹499</span>
                <span className="text-xs font-semibold text-slate-500">/ 30 days</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Starter Store Plan • Includes continuous Android app hosting & cloud CDN
              </p>
            </div>
            <div className="shrink-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Secured by Razorpay</span>
              </div>
            </div>
          </div>

          {/* Plan Highlights */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Included with Your Active Membership
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-slate-700">
                <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-medium">Live Android App Sync</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-slate-700">
                <Globe className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-medium">Custom Storefront Domain</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-slate-700">
                <Package className="w-4 h-4 text-violet-600 shrink-0" />
                <span className="font-medium">Unlimited Products & Orders</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">1GB High-Speed Cloud CDN</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleRenewPayment}
              disabled={paying}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-600/25 transition-all disabled:opacity-60 cursor-pointer"
            >
              {paying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Connecting to Razorpay...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Pay ₹499 with Razorpay & Unlock Dashboard</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 px-1">
              <a
                href={`https://wa.me/919270278119?text=${encodeURIComponent(
                  `Hi DGS Support, I need assistance with my store subscription renewal for: ${user?.store_name || user?.vendor_code || ""}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-slate-600 hover:text-blue-600 transition-colors"
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>Contact WhatsApp Support</span>
              </a>

              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

