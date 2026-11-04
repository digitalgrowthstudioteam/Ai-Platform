"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { platformApi } from "@/lib/app-platform/api";
import { usePlatformAuth } from "@/lib/app-platform/auth";
import { VendorSmsSettings } from "@/lib/app-platform/types";
import {
  MessageSquare,
  ShieldCheck,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Key,
  Globe,
  Lock,
  Sparkles,
  Info,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";

export default function VendorSmsPage() {
  const router = useRouter();
  const { user, isDemo } = usePlatformAuth();

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<VendorSmsSettings | null>(null);
  const [provider, setProvider] = useState<"FAST2SMS" | "MSG91" | "CUSTOM_HTTP">("FAST2SMS");
  const [apiKey, setApiKey] = useState("");
  const [senderId, setSenderId] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [showKey, setShowKey] = useState(false);

  // Event Toggles
  const [orderPlacedActive, setOrderPlacedActive] = useState(true);
  const [orderDispatchedActive, setOrderDispatchedActive] = useState(true);
  const [welcomeActive, setWelcomeActive] = useState(true);
  const [otpActive, setOtpActive] = useState(true);

  // Test SMS State
  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Save State
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        const data = await platformApi.getVendorSmsSettings();
        if (mounted && data) {
          setSettings(data);
          setProvider((data.sms_provider as any) || "FAST2SMS");
          setApiKey(data.sms_api_key || "");
          setSenderId(data.sms_sender_id || "");
          setCustomUrl(data.sms_custom_url || "");
          setOrderPlacedActive(data.sms_order_placed_active ?? true);
          setOrderDispatchedActive(data.sms_order_dispatched_active ?? true);
          setWelcomeActive(data.sms_welcome_active ?? true);
          setOtpActive(data.sms_otp_active ?? true);
        }
      } catch (err: any) {
        if (err.status === 403 || err.message?.includes("403") || err.message?.includes("not activated")) {
          // If not entitled, redirect to dashboard as per inactive-hidden rule
          router.replace("/app/dashboard");
        } else {
          console.error("Failed to load SMS settings", err);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSettings();
    return () => {
      mounted = false;
    };
  }, [router]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await platformApi.updateVendorSmsSettings({
        sms_provider: provider,
        sms_api_key: apiKey || null,
        sms_sender_id: senderId || null,
        sms_custom_url: customUrl || null,
        sms_order_placed_active: orderPlacedActive,
        sms_order_dispatched_active: orderDispatchedActive,
        sms_welcome_active: welcomeActive,
        sms_otp_active: otpActive,
      });
      setSettings(res);
      setSaveMessage({
        type: "success",
        text: "SMS Gateway configuration saved successfully!",
      });
    } catch (err: any) {
      setSaveMessage({
        type: "error",
        text: err.message || "Failed to save SMS settings",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestSms = async () => {
    const clean = testPhone.replace(/\D/g, "");
    if (clean.length < 10) {
      setTestResult({
        success: false,
        message: "Please enter a valid 10-digit Indian mobile number.",
      });
      return;
    }

    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await platformApi.sendVendorTestSms(clean);
      setTestResult({
        success: true,
        message: res.message || `Test SMS successfully sent to +91 ${clean}!`,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Failed to dispatch test SMS. Please verify your API Key and Provider.",
      });
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading SMS Gateway settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-emerald-600" />
              SMS Gateway Notifications
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Active Integration
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dispatch automated transactional SMS to Indian mobile numbers via Fast2SMS, MSG91, or custom HTTP URL (Way2SMS / Gupshup).
          </p>
        </div>
      </div>

      {/* Save Notification */}
      {saveMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 shadow-2xs ${
            saveMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {saveMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{saveMessage.text}</span>
        </div>
      )}

      {/* Main Configuration Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Step 1: Provider Selection */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-xs">
              1. Select SMS Gateway Provider
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose your Indian SMS engine. Fast2SMS works instantly without complex DLT approval for testing.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Fast2SMS */}
            <button
              type="button"
              onClick={() => setProvider("FAST2SMS")}
              className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                provider === "FAST2SMS"
                  ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-slate-900">Fast2SMS</span>
                {provider === "FAST2SMS" && <Check className="w-4 h-4 text-emerald-600" />}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Recommended for fast delivery. Supports Quick SMS Route and DLT templates with high inbox rate.
              </p>
            </button>

            {/* MSG91 */}
            <button
              type="button"
              onClick={() => setProvider("MSG91")}
              className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                provider === "MSG91"
                  ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-slate-900">MSG91</span>
                {provider === "MSG91" && <Check className="w-4 h-4 text-emerald-600" />}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Enterprise SMS gateway supporting high volume, international routing, and verified DLT sender IDs.
              </p>
            </button>

            {/* Custom HTTP URL / Way2SMS */}
            <button
              type="button"
              onClick={() => setProvider("CUSTOM_HTTP")}
              className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                provider === "CUSTOM_HTTP"
                  ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-slate-900">Custom HTTP URL / Way2SMS</span>
                {provider === "CUSTOM_HTTP" && <Check className="w-4 h-4 text-emerald-600" />}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Connect any gateway (Way2SMS, Gupshup, Textlocal) using a customizable URL template.
              </p>
            </button>
          </div>
        </div>

        {/* Step 2: Credentials & Connection Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-xs">
              2. Credentials & Connection
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your authentication tokens provided by your SMS provider dashboard.
            </p>
          </div>

          {provider === "CUSTOM_HTTP" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Custom HTTP Gateway URL Template *
                </label>
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://api.gateway.com/send?apikey={api_key}&mobile={phone}&message={message}&sender={sender_id}"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <p className="font-bold text-slate-800">Supported Placeholders in URL:</p>
                  <p><code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">{"{phone}"}</code> : 10-digit recipient phone number (e.g. 9876543210)</p>
                  <p><code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">{"{phone_with_code}"}</code> : Phone with country code (919876543210)</p>
                  <p><code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">{"{message}"}</code> : Automatically URL-encoded message text</p>
                  <p><code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">{"{api_key}"}</code> : Value from API Key field below</p>
                  <p><code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">{"{sender_id}"}</code> : Approved DLT sender header</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">API Key / Token (Optional)</label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter API Key or Auth Token"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sender ID / DLT Header (Optional)</label>
                  <input
                    type="text"
                    value={senderId}
                    onChange={(e) => setSenderId(e.target.value.toUpperCase())}
                    placeholder="e.g. KCAARI"
                    maxLength={10}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono uppercase"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {provider === "FAST2SMS" ? "Fast2SMS API Key *" : "MSG91 Auth Key *"}
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={provider === "FAST2SMS" ? "Paste Fast2SMS authorization key" : "Paste MSG91 auth key"}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Found in your {provider === "FAST2SMS" ? "Fast2SMS > Dev API" : "MSG91 Dashboard"} panel.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  DLT Sender ID / Header (Optional)
                </label>
                <input
                  type="text"
                  value={senderId}
                  onChange={(e) => setSenderId(e.target.value.toUpperCase())}
                  placeholder={provider === "FAST2SMS" ? "e.g. FSTSMS or your DLT header" : "e.g. DGSAPP"}
                  maxLength={10}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono uppercase"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Leave blank on Fast2SMS to use the default instant Quick SMS route.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Automated Event Triggers */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-xs">
              3. Automated SMS Notification Triggers
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select which events automatically send SMS alerts to your store customers.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {/* Trigger 1: Order Placed */}
            <div className="py-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Order Placed Confirmation</p>
                <p className="text-[11px] text-slate-500">
                  Sends customer order number, total bill amount, and confirmation immediately after purchase.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={orderPlacedActive}
                  onChange={(e) => setOrderPlacedActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Trigger 2: Order Dispatched */}
            <div className="py-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Order Shipped & Live Tracking</p>
                <p className="text-[11px] text-slate-500">
                  Sends courier partner name, AWB tracking number, and live tracking URL when order is marked Shipped.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={orderDispatchedActive}
                  onChange={(e) => setOrderDispatchedActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Trigger 3: Welcome SMS */}
            <div className="py-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Customer Registration / Welcome</p>
                <p className="text-[11px] text-slate-500">
                  Welcomes new shoppers and delivers store links when they create an account or sign in with Google.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={welcomeActive}
                  onChange={(e) => setWelcomeActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Trigger 4: OTP Verification */}
            <div className="py-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Password Reset OTP</p>
                <p className="text-[11px] text-slate-500">
                  Dispatches secure 6-digit one-time verification password when customer requests account recovery.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={otpActive}
                  onChange={(e) => setOtpActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Configuration...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save SMS Settings</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Test SMS Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 mt-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-600" />
              Send Live Test SMS
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify your integration by sending an immediate test SMS to your personal mobile number.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">
              +91
            </span>
            <input
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="9876543210"
              maxLength={10}
              className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="button"
            onClick={handleSendTestSms}
            disabled={sendingTest || testPhone.length < 10}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {sendingTest ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                <span>Dispatching SMS...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 text-emerald-700" />
                <span>Send Test SMS</span>
              </>
            )}
          </button>
        </div>

        {testResult && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
              testResult.success
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{testResult.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
