"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { trackInitiateCheckout, trackPurchase } from "@/lib/analytics";
import {
  Sparkles,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Check,
  ShieldCheck,
  Lock,
  ArrowRight,
} from "lucide-react";

export default function PayQuotationClient() {
  const params = useParams();
  let id = params?.id as string;
  if (typeof window !== "undefined") {
    const cleanPath = window.location.pathname.replace(/\/$/, "");
    const segments = cleanPath.split("/");
    const pathId = segments[segments.length - 1];
    if (pathId && pathId !== "pay-quotation" && pathId !== "placeholder") {
      id = pathId;
    }
  }
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [quotation, setQuotation] = useState<any>(null);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  
  // User Prefill Info
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  
  // Notification State
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const getQuotationId = () => {
    if (typeof window !== "undefined") {
      const parts = window.location.pathname.split("/");
      const lastSegment = parts[parts.length - 1];
      if (lastSegment && lastSegment !== "placeholder" && lastSegment !== "pay-quotation") {
        return lastSegment;
      }
    }
    return (id as string) || "";
  };

  const quotationId = getQuotationId();

  useEffect(() => {
    async function loadQuotation() {
      if (!quotationId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await api.getPublicQuotation(quotationId);
        setQuotation(res);
        
        // Prefill from quotation meta-request data
        setEmail(res.email || "");
        setFullName(res.name || "");
        setWhatsapp(res.phone || "");
      } catch (e: any) {
        console.error("Failed to load public quotation:", e);
        setNotification({
          type: "error",
          message: e.message || "Failed to load quotation details. Link may be invalid or expired.",
        });
      } finally {
        setLoading(false);
      }
    }
    loadQuotation();
  }, [id]);

  // Sync with logged-in user if available
  useEffect(() => {
    if (isAuthenticated && user) {
      setEmail((prev) => prev || user.email || "");
      setFullName((prev) => prev || user.displayName || "");
    }
  }, [user, isAuthenticated]);

  // Redirect to login if quotation is already paid, expired, or cancelled
  useEffect(() => {
    if (quotation && (quotation.status === "paid" || quotation.status === "expired" || quotation.status === "cancelled")) {
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            router.push("/login");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [quotation, router]);

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

  const handlePayment = async () => {
    if (!email) {
      alert("Please enter a valid email address.");
      return;
    }
    if (!whatsapp) {
      alert("Please enter your WhatsApp number.");
      return;
    }

    try {
      setPaying(true);
      setNotification(null);

      // 1. Initialize checkout
      const checkoutRes = await api.publicQuotationCheckout(quotationId, {
        email,
        name: fullName,
        phone: whatsapp,
      });

      // 2. Mock payment trigger
      if (checkoutRes.is_mock) {
        await api.publicVerifyQuotationPayment(quotationId, {
          razorpay_order_id: checkoutRes.order_id,
          razorpay_payment_id: "pay_mock_quotation",
          razorpay_signature: "sig_mock_quotation",
          email,
          name: fullName,
          phone: whatsapp,
        });
        setSuccess(true);
        return;
      }

      // 3. Live Razorpay Payment
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setNotification({
          type: "error",
          message: "Failed to load Razorpay Checkout SDK. Please check your internet connection.",
        });
        return;
      }

      const options = {
        key: checkoutRes.key_id,
        amount: checkoutRes.amount,
        currency: checkoutRes.currency,
        name: "Digital Growth Studio",
        description: `Meta Ads Onboarding Setup`,
        order_id: checkoutRes.order_id,
        handler: async (response: any) => {
          try {
            setPaying(true);
            const verifyPayload = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              email,
              name: fullName,
              phone: whatsapp,
            };

            let verified = false;
            let lastErr: any = null;

            for (let attempt = 1; attempt <= 3; attempt++) {
              try {
                await api.publicVerifyQuotationPayment(quotationId, verifyPayload);
                verified = true;
                break;
              } catch (err: any) {
                lastErr = err;
                console.warn(`Payment verification attempt ${attempt} failed:`, err);
                if (attempt < 3) {
                  await new Promise((res) => setTimeout(res, 1500 * attempt));
                }
              }
            }

            if (verified) {
              setSuccess(true);
              trackPurchase("quotation_" + quotationId, checkoutRes.amount / 100, checkoutRes.currency || "INR");
            } else {
              throw lastErr || new Error("Payment verification failed after retries.");
            }
          } catch (verifyErr: any) {
            setNotification({
              type: "error",
              message: verifyErr.message || "Payment verification failed. Please contact support on WhatsApp.",
            });
          } finally {
            setPaying(false);
          }
        },
        prefill: {
          email,
          name: fullName,
          contact: whatsapp,
        },
        theme: {
          color: "#2563EB",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      trackInitiateCheckout("quotation_" + quotationId, checkoutRes.amount / 100, checkoutRes.currency || "INR");
      rzp.open();
    } catch (err: any) {
      console.error("Payment failed:", err);
      setNotification({
        type: "error",
        message: err.message || "Failed to initialize payment checkout.",
      });
    } finally {
      setPaying(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={36} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between py-16 px-6">
        <div className="max-w-md w-full mx-auto bg-white border border-slate-200 p-8 rounded-3xl text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Payment Successful! 🎉</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Your Meta Ads campaign onboarding has been activated. We have created a secure account for your email: <b>{email}</b>.
          </p>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-2 text-slate-600">
            <p className="font-bold text-slate-700">Next Steps:</p>
            <p>• Connect with our support team on WhatsApp to start setup.</p>
            <p>• Click the link below to sign in or create your password using your email.</p>
          </div>
          
          <Link
            href={`/login?email=${encodeURIComponent(email)}`}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-1"
          >
            Access My Dashboard <ArrowRight size={16} />
          </Link>
        </div>
        <div className="text-center text-xs text-slate-400">
          Digital Growth Studio • Secure Onboarding
        </div>
      </div>
    );
  }

  if (quotation && (quotation.status === "paid" || quotation.status === "expired" || quotation.status === "cancelled")) {
    const isPaid = quotation.status === "paid";
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between py-16 px-6">
        <div className="max-w-md w-full mx-auto bg-white border border-slate-200 p-8 rounded-3xl text-center space-y-6 shadow-xl">
          <div className={`w-16 h-16 ${isPaid ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"} rounded-full flex items-center justify-center mx-auto border`}>
            {isPaid ? <CheckCircle2 size={32} /> : <AlertTriangle size={32} />}
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            {isPaid ? "Quotation Already Paid! ✅" : "Quotation Expired / Cancelled"}
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            {isPaid
              ? "This service quotation has already been successfully paid and processed."
              : "This service quotation is no longer active."}
          </p>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-600">
            Redirecting you to the login page in <span className="font-bold text-blue-600 text-sm">{countdown}</span> seconds...
          </div>
          <Link
            href="/login"
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-1 text-sm cursor-pointer"
          >
            Go to Login Page
          </Link>
        </div>
        <div className="text-center text-xs text-slate-400">
          Digital Growth Studio • Secure Portal
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 p-8 rounded-3xl text-center space-y-6 shadow-xl">
          <AlertTriangle size={48} className="text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Quotation Not Found</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            This payment link may be incorrect, expired, or cancelled. Please contact Digital Growth Studio support on WhatsApp.
          </p>
          <Link
            href="/"
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl border border-slate-200 transition block text-center text-sm"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between py-12 px-6">
      {/* Brand Header */}
      <div className="max-w-3xl w-full mx-auto mb-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-cover shadow-sm group-hover:scale-105 transition-transform" />
          <span className="font-extrabold text-sm text-slate-900 leading-none">Digital Growth Studio</span>
        </Link>
        <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
          <Lock size={12} className="text-slate-400" /> Secure Checkout
        </div>
      </div>

      <div className="max-w-3xl w-full mx-auto bg-white border border-slate-200 p-8 rounded-3xl shadow-xl grid grid-cols-1 md:grid-cols-5 gap-8 items-start relative overflow-hidden">
        {/* Left pane: Quotation details */}
        <div className="md:col-span-3 space-y-6">
          <div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Service Quotation</span>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-2">Campaign Setup & Management</h1>
            <p className="text-xs text-slate-400 mt-1">Quotation ID: {quotation.id}</p>
          </div>

          <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
            <div className="bg-slate-50 px-4 py-2.5 font-bold border-b border-slate-100 grid grid-cols-4 text-slate-700">
              <span className="col-span-2">Service Description</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Price</span>
            </div>
            <div className="divide-y divide-slate-100 bg-white">
              {quotation.items?.map((item: any, idx: number) => (
                <div key={idx} className="px-4 py-3 grid grid-cols-4 items-center">
                  <div className="col-span-2">
                    <span className="font-bold text-slate-900 block">{item.service_name}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Validity: {item.validity_days || 30} days</span>
                  </div>
                  <span className="text-center text-slate-600">{item.quantity || 1}</span>
                  <span className="text-right font-bold text-slate-900">{formatCurrency(item.offer_price)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center bg-blue-50/50 border border-blue-100/50 p-4 rounded-xl">
            <span className="text-sm font-bold text-slate-800">Total Amount Due</span>
            <span className="text-2xl font-black text-blue-700">{formatCurrency(quotation.amount)}</span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-400 leading-relaxed bg-slate-50 border border-slate-100 p-3 rounded-lg">
            <ShieldCheck size={16} className="text-emerald-500 flex-shrink-0" />
            <span>Payments are securely processed by Razorpay. Refund Policy: Service Quotations are final and non-refundable.</span>
          </div>
        </div>

        {/* Right pane: Checkout form */}
        <div className="md:col-span-2 space-y-6 md:border-l md:border-slate-100 md:pl-8 self-stretch flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Prefill Details</h3>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Email Address <span className="text-slate-400 font-bold">*</span>
              </label>
              <input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!(isAuthenticated && user?.email)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                WhatsApp Number <span className="text-slate-400 font-bold">*</span>
              </label>
              <input
                type="text"
                placeholder="WhatsApp Number"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-3 pt-6 md:pt-0">
            {notification && (
              <div className={`p-3 rounded-lg text-xs flex gap-1.5 items-start ${
                notification.type === "error" ? "bg-red-50 text-red-700 border border-red-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
              }`}>
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{notification.message}</span>
              </div>
            )}

            <button
              onClick={handlePayment}
              disabled={paying}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-750 hover:to-blue-800 text-white font-bold rounded-xl text-sm transition shadow-md shadow-blue-500/20 hover:shadow-lg flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              {paying ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  Complete Payment <ArrowRight size={14} />
                </>
              )}
            </button>
            <span className="text-[9px] text-slate-400 text-center block">Includes 30 days Starter Plan access bonus.</span>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400 mt-8">
        Digital Growth Studio © {new Date().getFullYear()} • Secure Payments Checkout
      </div>
    </div>
  );
}
