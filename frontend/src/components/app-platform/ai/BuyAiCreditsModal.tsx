"use client";

import React, { useState, useEffect } from "react";
import { platformApi } from "@/lib/app-platform/api";
import { AiCreditPack } from "@/lib/app-platform/types";
import {
  Sparkles,
  X,
  Check,
  AlertCircle,
  Loader2,
  Zap,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

interface BuyAiCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCredits: number;
  creditPacks: AiCreditPack[];
  onSuccess: (newCredits: number) => void;
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function BuyAiCreditsModal({
  isOpen,
  onClose,
  currentCredits,
  creditPacks,
  onSuccess,
}: BuyAiCreditsModalProps) {
  const [selectedPackId, setSelectedPackId] = useState<string>(
    creditPacks.find((p) => p.popular)?.id || creditPacks[0]?.id || "pack_growth"
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadRazorpayScript();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePurchase = async (pack: AiCreditPack) => {
    setError(null);
    setIsProcessing(true);

    try {
      // 1. Ensure Razorpay Checkout SDK is ready
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady || typeof window === "undefined" || !(window as any).Razorpay) {
        throw new Error("Unable to load Razorpay payment gateway. Please check your internet connection.");
      }

      // 2. Create official Razorpay order from backend
      const order = await platformApi.createCreditPurchaseOrder(pack.id);

      // 3. Launch official Razorpay Checkout Gateway modal
      const options = {
        key: order.key_id,
        amount: order.amount_paise,
        currency: "INR",
        name: "Digital Growth Studio",
        description: `${pack.name} — ${pack.credits} AI Credits`,
        order_id: order.order_id,
        theme: {
          color: "#2563EB",
        },
        handler: async (response: any) => {
          try {
            setIsProcessing(true);
            const verifyRes = await platformApi.verifyCreditPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              pack_id: pack.id,
            });

            setSuccessMsg(verifyRes.message);
            onSuccess(verifyRes.new_balance);
            setTimeout(() => {
              onClose();
            }, 2000);
          } catch (err: any) {
            setError(err.message || "Payment verification failed. If your payment was deducted, please contact support.");
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        setIsProcessing(false);
        setError(response.error?.description || "Payment failed or was cancelled. Please try again.");
      });
      rzp.open();
    } catch (err: any) {
      console.error("Razorpay Checkout Error:", err);
      setError(err.message || "Failed to initiate Razorpay payment. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-amber-50/60 via-yellow-50/40 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Buy AI Credits</h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 rounded-full">
                  Instant Recharge
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Current Balance: <span className="font-bold text-slate-800">{currentCredits} Credits</span> • Never expire
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Credit Packs Grid */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {creditPacks.map((pack) => {
              const isSelected = selectedPackId === pack.id;
              const perCreditPrice = (pack.price_inr / pack.credits).toFixed(2);
              return (
                <div
                  key={pack.id}
                  onClick={() => setSelectedPackId(pack.id)}
                  className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/40 shadow-md ring-2 ring-blue-100"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  {pack.popular && (
                    <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-xs">
                      ★ MOST POPULAR
                    </span>
                  )}
                  {pack.tag && !pack.popular && (
                    <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-white shadow-xs">
                      {pack.tag}
                    </span>
                  )}

                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{pack.name}</h4>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">₹{pack.price_inr}</span>
                      <span className="text-xs text-slate-400">incl. GST</span>
                    </div>

                    <div className="mt-3 py-1 px-2.5 rounded-lg bg-white border border-slate-200/80 inline-flex items-center gap-1.5 text-xs font-bold text-blue-700">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      {pack.credits} Credits
                    </div>

                    <p className="mt-2 text-[11px] text-slate-500">
                      Only ₹{perCreditPrice} per credit
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePurchase(pack);
                    }}
                    className={`mt-4 w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    {isProcessing && selectedPackId === pack.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        Recharge ₹{pack.price_inr}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Secure Payment Footer */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Instant UPI (GPay, PhonePe, Paytm), Cards & Netbanking powered by Razorpay</span>
            </div>
            <span className="font-semibold text-slate-700">100% Secure</span>
          </div>
        </div>
      </div>
    </div>
  );
}
