"use client";

import React, { useState, useEffect } from "react";
import { platformApi } from "@/lib/app-platform/api";
import { usePlatformAuth } from "@/lib/app-platform/auth";
import { SetupFeeQuote } from "@/lib/app-platform/types";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Tag,
  CreditCard,
  Smartphone,
  ArrowRight,
  Lock,
  Loader2,
  AlertCircle,
  HardDrive,
  Globe,
} from "lucide-react";

export default function SetupFeeGate() {
  const { user, refreshUser } = usePlatformAuth();
  const [quote, setQuote] = useState<SetupFeeQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadQuote() {
      try {
        const q = await platformApi.getSetupFeeQuote();
        setQuote(q);
      } catch (err: any) {
        setError(err.message || "Failed to load setup fee quotation.");
      } finally {
        setLoading(false);
      }
    }
    loadQuote();
  }, []);

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

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await platformApi.validateCoupon(couponCode.trim());
      setAppliedCoupon(res);
    } catch (err: any) {
      setCouponError(err.message || "Invalid coupon code.");
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const currentPayable = appliedCoupon
    ? appliedCoupon.new_total_inr
    : quote?.final_price_inr ?? 999;

  const handlePayment = async () => {
    setError(null);
    setPaying(true);

    try {
      // 1. Create Order
      const orderRes = await platformApi.createSetupFeeOrder(
        appliedCoupon ? appliedCoupon.code : undefined
      );

      // If 100% free via coupon
      if (orderRes.is_free) {
        await refreshUser();
        return;
      }

      // If mock test mode
      if (orderRes.is_mock) {
        await platformApi.verifySetupFeePayment({
          razorpay_order_id: orderRes.order_id,
          razorpay_payment_id: "pay_mock_setup_" + Math.random().toString(36).substring(2, 9),
          razorpay_signature: "sig_mock_setup",
          coupon_code: appliedCoupon ? appliedCoupon.code : undefined,
        });
        await refreshUser();
        return;
      }

      // 2. Load Razorpay Checkout SDK
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError("Failed to load Razorpay payment gateway. Please check your internet connection.");
        setPaying(false);
        return;
      }

      // 3. Trigger Razorpay Modal
      const options = {
        key: orderRes.key_id,
        amount: orderRes.amount,
        currency: orderRes.currency,
        name: "Digital Growth Studio",
        description: "One-Time Account & Android App Setup Fee",
        order_id: orderRes.order_id,
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: "#2563EB",
        },
        handler: async (response: any) => {
          try {
            setPaying(true);
            await platformApi.verifySetupFeePayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              coupon_code: appliedCoupon ? appliedCoupon.code : undefined,
            });
            await refreshUser();
          } catch (verifyErr: any) {
            setError(verifyErr.message || "Payment verification failed. Please contact support.");
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
      rzp.on("payment.failed", (resp: any) => {
        setError(resp.error?.description || "Payment was declined or failed. Please try again.");
        setPaying(false);
      });
      rzp.open();
    } catch (err: any) {
      setError(err.message || "Failed to initiate payment. Please try again.");
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto my-8 p-6 sm:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm">
      {/* Brand & Lock Badge */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white font-bold text-2xl shadow-sm mb-4">
          D
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 mb-3">
          <Lock className="w-3.5 h-3.5 text-amber-600" />
          <span>One-Time Setup Required</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Activate Your Store & App
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          Welcome, <span className="font-semibold text-slate-800">{user?.name}</span>! Complete your one-time onboarding setup fee to generate your dedicated store and start Android compilation.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Setup Package Details */}
      <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-5 mb-6 space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {quote?.plan_name || "Starter Store Plan"}
            </h3>
            <p className="text-xs text-slate-500">Official One-Time Merchant Onboarding</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 line-through mr-1.5 font-mono">
              ₹{quote?.base_price_inr?.toLocaleString("en-IN") || "2,000"}
            </span>
            <span className="text-xl font-extrabold text-blue-600 font-mono">
              ₹{currentPayable.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        <ul className="space-y-2 text-xs text-slate-600">
          {quote?.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Coupon Code Section */}
      <div className="mb-6">
        <form onSubmit={handleApplyCoupon} className="flex gap-2">
          <div className="relative flex-1">
            <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="HAVE A COUPON CODE?"
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={couponLoading || !couponCode.trim()}
            className="px-4 py-2.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {couponLoading ? "Checking..." : "Apply"}
          </button>
        </form>

        {appliedCoupon && (
          <div className="mt-2 text-xs text-emerald-700 font-medium flex items-center gap-1.5 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{appliedCoupon.message}</span>
          </div>
        )}

        {couponError && (
          <p className="mt-1.5 text-xs text-rose-600 font-medium">{couponError}</p>
        )}
      </div>

      {/* Payment Action */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-blue-50/60 rounded-2xl border border-blue-100">
          <div>
            <span className="text-xs text-slate-500 block">Total Amount Due</span>
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              ₹{currentPayable.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-blue-700 font-semibold bg-white px-3 py-1.5 rounded-xl border border-blue-200 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Secured by Razorpay</span>
          </div>
        </div>

        <button
          type="button"
          disabled={paying}
          onClick={handlePayment}
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-colors disabled:opacity-50 cursor-pointer"
        >
          {paying ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Connecting to Razorpay...</span>
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              <span>
                {currentPayable === 0
                  ? "Claim 100% Free Setup & Unlock Dashboard"
                  : `Pay ₹${currentPayable.toLocaleString("en-IN")} with Razorpay 🚀`}
              </span>
            </>
          )}
        </button>

        <p className="text-[11px] text-center text-slate-400">
          Official Digital Growth Studio onboarding. Supports UPI, Cards, Net Banking & Wallets.
        </p>
      </div>
    </div>
  );
}

