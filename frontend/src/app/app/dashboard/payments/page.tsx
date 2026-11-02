"use client";

import React, { useEffect, useState } from "react";
import { platformApi } from "@/lib/app-platform/api";
import { usePlatformAuth } from "@/lib/app-platform/auth";
import { StoreSettings } from "@/lib/app-platform/types";
import { CreditCard, Banknote, ShieldCheck, Check, AlertCircle, Save } from "lucide-react";

export default function VendorPaymentSettingsPage() {
  const { isDemo } = usePlatformAuth();
  const [store, setStore] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await platformApi.getVendorStore();
        setStore(data);
      } catch (e: any) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    setSaving(true);
    setMessage(null);
    try {
      await platformApi.updateVendorStore({
        cod_enabled: store.cod_enabled,
        razorpay_enabled: store.razorpay_enabled,
        razorpay_key_id: store.razorpay_key_id,
      });
      setMessage({ type: "success", text: "Payment configuration saved successfully!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update payment settings" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payment Settings</h1>
        <p className="text-sm text-slate-500">Configure accepted payment methods for customer checkouts on your store and Android mobile app</p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          {message.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* COD Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Cash on Delivery (COD)</h3>
                <p className="text-xs text-slate-500">Allow customers to pay cash when orders are handed over</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={store?.cod_enabled || false}
                onChange={(e) => setStore((prev) => (prev ? { ...prev, cod_enabled: e.target.checked } : null))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
          <p className="mt-3 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
            Recommended: Keep COD enabled during initial launch to increase checkout conversions across Indian mobile shoppers.
          </p>
        </div>

        {/* Razorpay Online Payment (Hidden in Dummy Store Sandbox) */}
        {!isDemo && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Razorpay Gateway Integration</h3>
                  <p className="text-xs text-slate-500">Accept UPI, Credit/Debit cards, Net Banking & Wallets</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={store?.razorpay_enabled || false}
                  onChange={(e) => setStore((prev) => (prev ? { ...prev, razorpay_enabled: e.target.checked } : null))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="pt-2 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Razorpay Key ID (Public Client Key)
                </label>
                <input
                  type="text"
                  placeholder="rzp_live_..."
                  value={store?.razorpay_key_id || ""}
                  onChange={(e) => setStore((prev) => (prev ? { ...prev, razorpay_key_id: e.target.value } : null))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start gap-2.5 text-xs text-blue-800">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Security Guarantee:</span> Razorpay Secret Keys are never exposed in frontend code. Account verification and webhook setups are handled securely by Digital Growth Studio’s backend team.
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Save Payment Settings
          </button>
        </div>
      </form>
    </div>
  );
}

