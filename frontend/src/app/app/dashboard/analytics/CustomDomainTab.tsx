"use client";

import React, { useEffect, useState } from "react";
import { platformApi } from "@/lib/app-platform/api";
import { usePlatformAuth } from "@/lib/app-platform/auth";
import {
  Globe,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Lock,
  Unlock,
  Tag,
  RefreshCw,
  Clock,
  Sparkles,
  ArrowRight,
  Server,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface CustomDomainTabProps {
  onSuccessNotification?: (msg: string) => void;
  onErrorNotification?: (msg: string) => void;
}

export default function CustomDomainTab({
  onSuccessNotification,
  onErrorNotification,
}: CustomDomainTabProps) {
  const { user } = usePlatformAuth();

  const [loading, setLoading] = useState(true);
  const [domainInfo, setDomainInfo] = useState<any>(null);
  const [customDomainInput, setCustomDomainInput] = useState("");
  const [savingDomain, setSavingDomain] = useState(false);
  const [verifyingDns, setVerifyingDns] = useState(false);
  const [purchasingAddon, setPurchasingAddon] = useState(false);
  const [copiedDns, setCopiedDns] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Add-on Promo Code State
  const [addonPromoCode, setAddonPromoCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Accordion for registrar guides
  const [activeGuide, setActiveGuide] = useState<"godaddy" | "hostinger" | "namecheap" | null>("godaddy");

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await platformApi.getVendorCustomDomainInfo();
      if (data) {
        setDomainInfo(data);
        if (data.custom_domain) {
          setCustomDomainInput(data.custom_domain);
        }
      }
    } catch (err: any) {
      console.error("Failed to load custom domain info:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadRazorpayScript = () => {
    return new Promise<boolean>((resolve) => {
      if (typeof window === "undefined") return resolve(false);
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleApplyCoupon = async () => {
    if (!domainInfo?.addon_id || !addonPromoCode.trim()) return;
    setValidatingCoupon(true);
    setCouponError(null);
    try {
      const res = await platformApi.validateAddonCoupon(domainInfo.addon_id, addonPromoCode.trim());
      if (res.valid) {
        setAppliedCoupon(res);
        setCouponError(null);
      } else {
        setCouponError(res.message || "Invalid coupon code.");
      }
    } catch (err: any) {
      setCouponError(err.message || "Invalid or expired promo code.");
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handlePurchaseAddon = async () => {
    if (!domainInfo?.addon_id) {
      setMessage({ type: "error", text: "Custom domain add-on not found in catalog." });
      return;
    }
    setPurchasingAddon(true);
    setMessage(null);
    try {
      const orderRes = await platformApi.createAddonOrder(domainInfo.addon_id, appliedCoupon?.coupon_code);

      if (orderRes.is_free) {
        const refreshed = await platformApi.getVendorCustomDomainInfo();
        setDomainInfo(refreshed);
        setMessage({
          type: "success",
          text: orderRes.message || "🎉 Custom Domain unlocked for FREE with promo code! Enter your personal domain below.",
        });
        if (onSuccessNotification) onSuccessNotification("🎉 Custom Domain unlocked for FREE!");
        setPurchasingAddon(false);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setMessage({
          type: "error",
          text: "Failed to load Razorpay Checkout SDK. Please check your internet connection.",
        });
        setPurchasingAddon(false);
        return;
      }

      const options = {
        key: orderRes.key_id,
        amount: orderRes.amount,
        currency: orderRes.currency || "INR",
        name: "Digital Growth Studio",
        description: `Add-on: ${orderRes.addon_name || "Custom Domain Connection"}`,
        order_id: orderRes.order_id,
        theme: {
          color: "#4F46E5",
        },
        handler: async (response: any) => {
          try {
            await platformApi.verifyAddonPayment({
              addon_id: domainInfo.addon_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              coupon_code: appliedCoupon?.coupon_code,
            });
            const refreshed = await platformApi.getVendorCustomDomainInfo();
            setDomainInfo(refreshed);
            setMessage({
              type: "success",
              text: "🎉 Custom Domain add-on successfully activated via Razorpay! You can now enter your personal domain below.",
            });
            if (onSuccessNotification) onSuccessNotification("🎉 Custom Domain activated successfully!");
          } catch (err: any) {
            setMessage({
              type: "error",
              text: err.message || "Payment verification failed. Please contact support.",
            });
          } finally {
            setPurchasingAddon(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPurchasingAddon(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        setMessage({
          type: "error",
          text: resp?.error?.description || "Payment failed or was cancelled.",
        });
        setPurchasingAddon(false);
      });
      rzp.open();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to initiate Razorpay checkout." });
      setPurchasingAddon(false);
    }
  };

  const handleSaveDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customDomainInput.trim().toLowerCase().replace("https://", "").replace("http://", "").split("/")[0];
    setSavingDomain(true);
    setMessage(null);
    try {
      await platformApi.updateVendorStore({ custom_domain: clean || null } as any);
      const refreshed = await platformApi.getVendorCustomDomainInfo();
      setDomainInfo(refreshed);
      setMessage({
        type: "success",
        text: clean
          ? `Domain "${clean}" saved successfully! Follow the DNS setup guide below.`
          : "Custom domain disconnected successfully.",
      });
      if (onSuccessNotification) onSuccessNotification(`Custom domain "${clean}" saved!`);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to save custom domain" });
      if (onErrorNotification) onErrorNotification(err.message || "Failed to save domain");
    } finally {
      setSavingDomain(false);
    }
  };

  const handleVerifyDns = async () => {
    setVerifyingDns(true);
    setMessage(null);
    try {
      const res = await platformApi.verifyVendorCustomDomain();
      const refreshed = await platformApi.getVendorCustomDomainInfo();
      setDomainInfo(refreshed);
      setMessage({
        type: "success",
        text: res.message || "Custom domain verified! SSL certificate is active on Cloudflare edge.",
      });
      if (onSuccessNotification) onSuccessNotification("Custom domain DNS verified!");
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "DNS verification in progress. Please allow 5-15 minutes for propagation." });
    } finally {
      setVerifyingDns(false);
    }
  };

  const handleCopyDns = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDns(true);
    setTimeout(() => setCopiedDns(false), 2000);
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400 mt-3 font-medium">Loading custom domain & DNS configuration...</p>
      </div>
    );
  }

  const isUnlocked = Boolean(domainInfo?.custom_domain_enabled);
  const dnsTarget = domainInfo?.custom_domain_dns_target || "cname.digitalgrowthstudio.in";
  const vendorSubdomain = domainInfo?.subdomain || `${user?.store_slug || "store"}.digitalgrowthstudio.in`;
  const originalPrice = domainInfo?.price_inr ?? 999;
  const finalPrice = appliedCoupon ? appliedCoupon.final_price_inr : originalPrice;

  return (
    <div className="space-y-6 w-full">
      {/* Alert Banner */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. MAIN CARD: LOCKED VS UNLOCKED (MATCHING USER SCREENSHOT) */}
      {/* ──────────────────────────────────────────────────────────── */}
      {!isUnlocked ? (
        /* LOCKED STATE: ADD-ON REQUIRED (₹999 ONE-TIME) */
        <div className="p-6 sm:p-8 rounded-3xl bg-linear-to-br from-indigo-950 via-slate-900 to-slate-950 text-white border border-indigo-500/30 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-5 border-b border-white/10">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
                <Globe className="w-7 h-7" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight">Connect Your Own Custom Domain</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-xs">
                    {appliedCoupon ? (
                      appliedCoupon.is_free ? "FREE WITH PROMO" : `₹${finalPrice} DISCOUNTED`
                    ) : (
                      "₹999 ONE-TIME ADD-ON"
                    )}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
                  Replace <code className="text-indigo-300 font-mono bg-white/5 px-1.5 py-0.5 rounded">{vendorSubdomain}</code> with your personal brand domain like{" "}
                  <strong className="text-white font-mono">kcaariwork.com</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePurchaseAddon}
              disabled={purchasingAddon}
              className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
            >
              {purchasingAddon ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>{appliedCoupon && appliedCoupon.is_free ? "Unlock for FREE (₹0)" : `Unlock Custom Domain (₹${finalPrice})`}</span>
                </>
              )}
            </button>
          </div>

          {/* Promo Code Redemption */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={addonPromoCode}
                  onChange={(e) => setAddonPromoCode(e.target.value.toUpperCase())}
                  placeholder="ENTER PROMO CODE (E.G. SPECIAL999)"
                  disabled={Boolean(appliedCoupon)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-white/10 rounded-xl text-xs font-mono font-semibold text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 uppercase disabled:opacity-50"
                />
              </div>
              {appliedCoupon ? (
                <button
                  type="button"
                  onClick={() => {
                    setAppliedCoupon(null);
                    setAddonPromoCode("");
                    setCouponError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-bold border border-rose-500/30 transition-colors"
                >
                  Remove Coupon
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={validatingCoupon || !addonPromoCode.trim()}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-all disabled:opacity-50 shrink-0"
                >
                  {validatingCoupon ? "Checking..." : "Apply Code"}
                </button>
              )}
              <span className="hidden sm:inline text-[11px] text-slate-400">
                Have a Super Admin discount or free coupon code? Apply above.
              </span>
            </div>

            {appliedCoupon && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  {appliedCoupon.message || `Coupon applied! You save ₹${appliedCoupon.discount_inr}.`}
                </span>
                <span className="font-mono font-bold text-amber-300">
                  {appliedCoupon.is_free ? "Final: ₹0 FREE" : `Final: ₹${appliedCoupon.final_price_inr}`}
                </span>
              </div>
            )}

            {couponError && (
              <p className="text-xs text-rose-400 flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {couponError}
              </p>
            )}
          </div>

          {/* 3 Value Proposition Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Free Lifetime SSL (HTTPS)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                100% Free automated Let&apos;s Encrypt / Google Trust certificates with zero-maintenance auto-renewal.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Zap className="w-4 h-4" />
                <span>Cloudflare Edge Caching</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Lightning fast store load speeds and enterprise DDoS protection cached across 300+ global edge cities.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <Globe className="w-4 h-4" />
                <span>100% White-Label Identity</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Customers only see your domain in the URL bar, checkout, and invoices. Build true brand equity.
              </p>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
            <span>💡</span>
            <span>Have a VIP plan or paid offline? Contact Super Admin / Support to activate your custom domain access directly.</span>
          </div>
        </div>
      ) : (
        /* UNLOCKED STATE: DOMAIN CONFIGURATION CARD */
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">Custom Domain Connection</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Unlocked
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Point your personal domain (GoDaddy, Hostinger, Namecheap, BigRock) to your store.
                </p>
              </div>
            </div>

            <div>
              {domainInfo.custom_domain_status === "ACTIVE" ? (
                <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Active &amp; Verified (SSL Live)
                </span>
              ) : domainInfo.custom_domain ? (
                <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  DNS Verification Pending
                </span>
              ) : (
                <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600">
                  Not Configured
                </span>
              )}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSaveDomain} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Your Custom Domain Name
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                    🌐
                  </span>
                  <input
                    type="text"
                    value={customDomainInput}
                    onChange={(e) => setCustomDomainInput(e.target.value)}
                    placeholder="e.g. kcaariwork.com or shop.mybrand.in"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingDomain}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  {savingDomain ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save Domain</span>
                </button>
                {domainInfo.custom_domain && (
                  <button
                    type="button"
                    onClick={handleVerifyDns}
                    disabled={verifyingDns}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${verifyingDns ? "animate-spin" : ""}`} />
                    <span>Verify DNS Status</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Enter your apex domain (e.g. <span className="font-mono text-slate-600">kcaariwork.com</span>) or subdomain (e.g. <span className="font-mono text-slate-600">shop.kcaariwork.com</span>).
              </p>
            </div>
          </form>

          {domainInfo.custom_domain && domainInfo.custom_domain_status === "ACTIVE" && (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-emerald-900 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Your storefront is live and secured on <strong>{domainInfo.custom_domain}</strong>
              </span>
              <a
                href={`https://${domainInfo.custom_domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors shrink-0"
              >
                <span>Visit Custom Storefront</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. THE STEP-BY-STEP PROCESS GUIDE ("HOW TO POINT YOUR DOMAIN") */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                How to Point Your Custom Domain (Step-by-Step DNS Guide)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Follow these 4 simple steps to connect any domain to your Digital Growth Studio store.
              </p>
            </div>
          </div>
        </div>

        {/* Steps Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Step 1 */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                1
              </span>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Log In to Your Domain Registrar
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Open the dashboard where you purchased your domain (e.g. <strong>GoDaddy</strong>, <strong>Hostinger</strong>, <strong>Namecheap</strong>, or <strong>BigRock</strong>).
            </p>
            <p className="text-[11px] text-slate-400">
              Navigate to <strong>My Products</strong> &gt; <strong>DNS Management</strong> or <strong>Manage DNS Records</strong>.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                2
              </span>
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                Add CNAME DNS Record
              </h4>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Click <strong>&quot;Add New Record&quot;</strong> and enter the CNAME target below pointing your domain traffic to our high-speed edge proxy.
            </p>
            <div className="text-[11px] font-mono text-blue-700 bg-blue-100/60 px-2.5 py-1 rounded-lg">
              Type: CNAME | Name: www | Target: {dnsTarget}
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                3
              </span>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Save Domain in Antigravity
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              In the field above, type your custom domain name (e.g. <code>kcaariwork.com</code> or <code>shop.mybrand.in</code>) and click <strong>&quot;Save Domain&quot;</strong>.
            </p>
            <p className="text-[11px] text-slate-400">
              Our system will register the hostname with Cloudflare for SaaS.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                4
              </span>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Automated SSL &amp; Verification
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cloudflare automatically issues a 100% Free Lifetime SSL (HTTPS) certificate within 5–15 minutes.
            </p>
            <p className="text-[11px] text-slate-400">
              Click <strong>&quot;Verify DNS Status&quot;</strong> anytime to check live propagation status.
            </p>
          </div>
        </div>

        {/* DNS Record Table */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-slate-900 text-white space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>DNS Record To Copy</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
              Required
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="py-2 pr-4 font-semibold">TYPE</th>
                  <th className="py-2 pr-4 font-semibold">NAME / HOST</th>
                  <th className="py-2 pr-4 font-semibold">TARGET / DESTINATION</th>
                  <th className="py-2 font-semibold text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                <tr>
                  <td className="py-3 pr-4 font-bold text-blue-400">CNAME</td>
                  <td className="py-3 pr-4 text-amber-300">www (or @)</td>
                  <td className="py-3 pr-4 text-emerald-400">{dnsTarget}</td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleCopyDns(dnsTarget)}
                      className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-sans font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedDns ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Target</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Popular Registrars Accordion */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Click-by-Click Instructions for Popular Registrars:
          </h4>

          {/* GoDaddy */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setActiveGuide(activeGuide === "godaddy" ? null : "godaddy")}
              className="w-full p-4 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-xs font-bold text-slate-900 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                GoDaddy DNS Instructions
              </span>
              {activeGuide === "godaddy" ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
            {activeGuide === "godaddy" && (
              <div className="p-4 bg-white text-xs text-slate-600 space-y-2 border-t border-slate-200">
                <ol className="list-decimal pl-5 space-y-1.5 leading-relaxed">
                  <li>Log in to your <strong>GoDaddy Domain Portfolio</strong>.</li>
                  <li>Click on your domain name &gt; scroll down to <strong>Additional Settings</strong> &gt; select <strong>Manage DNS</strong>.</li>
                  <li>Under <strong>DNS Records</strong>, click <strong>Add New Record</strong>.</li>
                  <li>Select <strong>Type: CNAME</strong>.</li>
                  <li>In <strong>Name</strong>, enter <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold">www</code>.</li>
                  <li>In <strong>Value</strong>, enter <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold">{dnsTarget}</code>.</li>
                  <li>Leave TTL as Default (1/2 Hour) and click <strong>Save</strong>.</li>
                  <li><em>Optional (Apex Redirect):</em> Under <strong>Forwarding</strong>, add a redirect from your root domain <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">yourdomain.com</code> to <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">https://www.yourdomain.com</code>.</li>
                </ol>
              </div>
            )}
          </div>

          {/* Hostinger */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setActiveGuide(activeGuide === "hostinger" ? null : "hostinger")}
              className="w-full p-4 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-xs font-bold text-slate-900 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                Hostinger DNS Instructions
              </span>
              {activeGuide === "hostinger" ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
            {activeGuide === "hostinger" && (
              <div className="p-4 bg-white text-xs text-slate-600 space-y-2 border-t border-slate-200">
                <ol className="list-decimal pl-5 space-y-1.5 leading-relaxed">
                  <li>Log in to <strong>Hostinger hPanel</strong> and open <strong>Domains</strong>.</li>
                  <li>Select your domain and click <strong>DNS / Nameservers</strong> in the left sidebar.</li>
                  <li>Under <strong>Manage DNS records</strong>, choose <strong>CNAME</strong> in the dropdown.</li>
                  <li>In <strong>Name</strong>, enter <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold">www</code>.</li>
                  <li>In <strong>Target</strong>, enter <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold">{dnsTarget}</code>.</li>
                  <li>Click <strong>Add Record</strong>. Changes take effect within 10–15 minutes.</li>
                </ol>
              </div>
            )}
          </div>

          {/* Namecheap */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setActiveGuide(activeGuide === "namecheap" ? null : "namecheap")}
              className="w-full p-4 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-xs font-bold text-slate-900 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                Namecheap DNS Instructions
              </span>
              {activeGuide === "namecheap" ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
            {activeGuide === "namecheap" && (
              <div className="p-4 bg-white text-xs text-slate-600 space-y-2 border-t border-slate-200">
                <ol className="list-decimal pl-5 space-y-1.5 leading-relaxed">
                  <li>Sign in to your <strong>Namecheap Account</strong> &gt; <strong>Domain List</strong>.</li>
                  <li>Click <strong>Manage</strong> next to your domain, then click the <strong>Advanced DNS</strong> tab.</li>
                  <li>Under <strong>Host Records</strong>, click <strong>Add New Record</strong>.</li>
                  <li>Select <strong>CNAME Record</strong>.</li>
                  <li>In <strong>Host</strong>, enter <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold">www</code>.</li>
                  <li>In <strong>Target</strong>, enter <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold">{dnsTarget}</code>.</li>
                  <li>Set TTL to <strong>Automatic</strong> and click the green checkmark to save.</li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Helpful Tips Box */}
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-3">
          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <strong className="block text-amber-950 font-bold">DNS Propagation &amp; Troubleshooting Tip:</strong>
            DNS changes usually take between 5 to 15 minutes, but in rare cases can take up to 24–48 hours depending on your registrar. If your domain does not show &quot;Active &amp; Verified&quot; immediately, please wait a few minutes and click &quot;Verify DNS Status&quot; again.
          </div>
        </div>
      </div>
    </div>
  );
}

