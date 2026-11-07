"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { platformApi } from "@/lib/app-platform/api";
import { usePlatformAuth } from "@/lib/app-platform/auth";
import { StoreSettings } from "@/lib/app-platform/types";
import {
  Banknote,
  Check,
  AlertCircle,
  Save,
  CreditCard,
  Key,
  Lock,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  Copy,
  CheckCircle2,
  Zap,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";

export default function VendorPaymentSettingsPage() {
  const router = useRouter();
  const { user, isDemo } = usePlatformAuth();
  const [store, setStore] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [codCharge, setCodCharge] = useState<number>(0);
  const [verifyStatus, setVerifyStatus] = useState<{
    tested: boolean;
    valid?: boolean;
    message?: string;
    mode?: "live" | "test";
  }>({ tested: false });
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (isDemo) {
      router.replace("/app/dashboard");
      return;
    }
    async function load() {
      try {
        const data = await platformApi.getVendorStore();
        setStore(data);
        if (data.razorpay_key_id) setKeyId(data.razorpay_key_id);
        if (data.razorpay_key_secret) setKeySecret(data.razorpay_key_secret);
        if (data.cod_charge !== undefined) setCodCharge(data.cod_charge);
        if (data.razorpay_verified) {
          const mode = data.razorpay_key_id?.startsWith("rzp_live_") ? "live" : "test";
          setVerifyStatus({
            tested: true,
            valid: true,
            mode,
            message: `Razorpay ${mode.toUpperCase()} credentials are active and verified.`,
          });
        }
      } catch (e: any) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleVerify = async () => {
    const cleanKey = keyId.trim();
    if (!cleanKey) {
      setMessage({ type: "error", text: "Please enter your Razorpay Key ID first." });
      return;
    }
    if (!cleanKey.startsWith("rzp_live_") && !cleanKey.startsWith("rzp_test_")) {
      setMessage({
        type: "error",
        text: "Invalid Key ID format. Razorpay Key ID must start with 'rzp_live_' or 'rzp_test_'.",
      });
      return;
    }

    setVerifying(true);
    setMessage(null);
    try {
      const res = await platformApi.verifyRazorpay({
        key_id: cleanKey,
        key_secret: keySecret.trim() || undefined,
      });

      setVerifyStatus({
        tested: true,
        valid: true,
        mode: res.mode,
        message: res.message,
      });

      setStore((prev) =>
        prev
          ? {
              ...prev,
              razorpay_enabled: true,
              razorpay_key_id: cleanKey,
              razorpay_key_secret: keySecret.trim() || prev.razorpay_key_secret,
              razorpay_verified: true,
            }
          : null
      );

      setMessage({
        type: "success",
        text: res.message || "Razorpay credentials verified and activated successfully!",
      });
    } catch (err: any) {
      setVerifyStatus({
        tested: true,
        valid: false,
        message: err.message || "Failed to verify Razorpay credentials.",
      });
      setMessage({
        type: "error",
        text: err.message || "Razorpay verification failed. Please check your Key ID and Secret.",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload: any = {
        cod_enabled: store.cod_enabled,
        cod_charge: codCharge || 0,
      };

      // Only include Razorpay credentials if activated by Admin
      if (store.razorpay_enabled) {
        const cleanKey = keyId.trim();
        const cleanSecret = keySecret.trim();
        if (cleanKey) payload.razorpay_key_id = cleanKey;
        if (cleanSecret) payload.razorpay_key_secret = cleanSecret;
        payload.razorpay_verified = verifyStatus.valid || store.razorpay_verified || false;
      }

      const updated = await platformApi.updateVendorStore(payload);

      setStore(updated);
      setMessage({
        type: "success",
        text: "Payment configuration saved successfully! Your storefront and Android app are updated.",
      });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update payment settings" });
    } finally {
      setSaving(false);
    }
  };

  const copyWebhookUrl = () => {
    const webhookUrl = "https://digitalgrowthstudio.in/api/store/webhook/razorpay";
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  const detectedMode = keyId.trim().startsWith("rzp_live_")
    ? "LIVE"
    : keyId.trim().startsWith("rzp_test_")
    ? "TEST"
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-blue-600" />
            Payment Gateway Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure accepted payment methods (COD & Razorpay) for customer checkouts on your online store and Android mobile app
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            Direct Merchant Settlements
          </span>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm flex items-start gap-2.5 ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
              : "bg-rose-50 border border-rose-200 text-rose-900"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Razorpay Payment Gateway Card (Strictly Hidden unless Activated by Super Admin) */}
        {Boolean(store?.razorpay_enabled) && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-linear-to-r from-blue-50/50 to-indigo-50/30">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" />
                    <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">Razorpay Online Payment Gateway</h2>
                    {store?.razorpay_enabled && store?.razorpay_verified ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified & Active
                      </span>
                    ) : store?.razorpay_enabled ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        Needs Verification
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Accept UPI (Google Pay, PhonePe, Paytm, BHIM), Credit/Debit Cards, Net Banking & Wallets directly into your own merchant bank account.
                  </p>
                </div>
              </div>

              {/* Master Toggle */}
              <div className="flex items-center gap-3 self-end sm:self-center">
                <span className="text-xs font-bold text-slate-700">
                  {store?.razorpay_enabled ? "Enabled" : "Disabled"}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={store?.razorpay_enabled || false}
                    onChange={(e) =>
                      setStore((prev) => (prev ? { ...prev, razorpay_enabled: e.target.checked } : null))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Accepted Payment Methods Chips */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Included Payment Methods (When Activated)
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  "UPI (Google Pay, PhonePe, Paytm, BHIM)",
                  "Credit & Debit Cards (Visa, MasterCard, RuPay)",
                  "Net Banking (50+ Indian Banks)",
                  "Wallets & PayLater",
                ].map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    <Check className="w-3.5 h-3.5 text-blue-600" />
                    {m}
                  </span>
                ))}
              </div>
            </div>

            {/* API Credentials Inputs */}
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Razorpay Key ID */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-blue-600" />
                      Razorpay Key ID <span className="text-rose-500">*</span>
                    </label>
                    {detectedMode && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          detectedMode === "LIVE"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {detectedMode} Mode
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={keyId}
                      onChange={(e) => {
                        setKeyId(e.target.value);
                        setVerifyStatus({ tested: false });
                      }}
                      placeholder="e.g. rzp_live_xxxxxxxxxxxxxx"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs text-slate-900 focus:bg-white focus:outline-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Starts with <code className="font-mono font-bold text-blue-700">rzp_live_</code> (for real payments) or <code className="font-mono text-amber-700">rzp_test_</code> (for testing).
                  </p>
                </div>

                {/* Razorpay Key Secret */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-blue-600" />
                      Razorpay Key Secret <span className="text-slate-400 font-normal">(Recommended)</span>
                    </label>
                    <span className="text-[11px] text-slate-400">Kept Securely</span>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showSecret ? "text" : "password"}
                      value={keySecret}
                      onChange={(e) => {
                        setKeySecret(e.target.value);
                        setVerifyStatus({ tested: false });
                      }}
                      placeholder="e.g. xxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs text-slate-900 focus:bg-white focus:outline-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      title={showSecret ? "Hide secret" : "Show secret"}
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Used securely on the server to verify customer payment signatures.
                  </p>
                </div>
              </div>

              {/* Verify Button & Status Alert */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  {verifyStatus.tested ? (
                    verifyStatus.valid ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Credentials verified successfully
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        {verifyStatus.message || "Verification failed"}
                      </span>
                    )
                  ) : (
                    <span className="text-xs text-slate-600 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-slate-400" />
                      Test your credentials to ensure checkout works smoothly
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={verifying || !keyId.trim()}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      <span>Verifying with Razorpay...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Test & Verify Credentials</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Collapsible Step-by-Step Instructions */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-100/60 transition-colors cursor-pointer"
              >
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  How to generate your Razorpay API Keys (Step-by-Step Guide)
                </span>
                {showGuide ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>

              {showGuide && (
                <div className="p-4 pt-1 border-t border-slate-200 space-y-3 text-xs text-slate-600">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>
                      Log in to your{" "}
                      <a
                        href="https://dashboard.razorpay.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        Razorpay Dashboard
                        <ExternalLink className="w-3 h-3 inline" />
                      </a>
                      .
                    </li>
                    <li>
                      In the bottom left navigation, click <strong>Account & Settings</strong>.
                    </li>
                    <li>
                      Under the <em>API Keys</em> section, select <strong>API Keys</strong>.
                    </li>
                    <li>
                      Click <strong>Generate Key</strong> (or copy your existing active key).
                    </li>
                    <li>
                      Copy the <strong>Key ID</strong> (starts with <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">rzp_live_</code>) and <strong>Key Secret</strong>, and paste them into the fields above.
                    </li>
                    <li>
                      Click <strong>Test & Verify Credentials</strong> and then <strong>Save Payment Settings</strong>.
                    </li>
                  </ol>
                  <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200">
                    All consumer payments will be deposited directly to your bank account as per your Razorpay settlement cycle (T+1 or T+2 days).
                  </p>
                </div>
              )}
            </div>

            {/* Advanced: Webhook Integration */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Store Webhook URL (For Real-Time Payment Updates)
                </span>
                <span className="text-[10px] text-slate-500">Optional</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value="https://digitalgrowthstudio.in/api/store/webhook/razorpay"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs text-slate-700 select-all"
                />
                <button
                  type="button"
                  onClick={copyWebhookUrl}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  {copiedWebhook ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                In Razorpay Settings &gt; Webhooks, add this URL and subscribe to event <code className="font-mono font-bold text-slate-700">payment.captured</code>.
              </p>
            </div>
          </div>
        </div>
        )}

        {/* 2. Cash on Delivery (COD) Options */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Cash on Delivery (COD)</h3>
                <p className="text-xs text-slate-500">Allow customers to pay cash when orders arrive at their doorstep</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={store?.cod_enabled || false}
                onChange={(e) =>
                  setStore((prev) => (prev ? { ...prev, cod_enabled: e.target.checked } : null))
                }
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {store?.cod_enabled && (
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block">COD Handling Fee (₹)</label>
                <p className="text-[11px] text-slate-400">Optional extra charge added only when buyer selects Cash on Delivery</p>
              </div>
              <div className="flex items-center gap-1.5 w-36">
                <span className="text-xs font-bold text-slate-500">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={codCharge}
                  onChange={(e) => setCodCharge(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-blue-600 text-right"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. Live Checkout Preview */}
        <div className="bg-slate-100/70 rounded-2xl border border-slate-200 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-blue-600" />
              Live Customer Checkout Preview
            </span>
            <span className="text-[11px] text-slate-500 font-medium">How shoppers see this at checkout</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            {store?.cod_enabled && (
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 bg-white" />
                  <div>
                    <span className="text-xs font-bold text-slate-800">Cash on Delivery (COD)</span>
                    <p className="text-[10px] text-slate-500">Pay cash when package arrives</p>
                  </div>
                </div>
                {codCharge > 0 && (
                  <span className="text-[11px] font-bold text-slate-600">+₹{codCharge} fee</span>
                )}
              </div>
            )}

            {Boolean(store?.razorpay_enabled) && (
              <div className="p-3 rounded-lg border border-blue-500 bg-blue-50/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full border-4 border-blue-600 bg-white" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">Online Payment (Razorpay Secure)</span>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                        Instant Confirmation
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      UPI (GPay, PhonePe, Paytm), Cards, Net Banking & Wallets
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-blue-600">FREE</span>
              </div>
            )}
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">
            Changes will take effect immediately across your online store and Android shopping app.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Settings...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Payment Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
