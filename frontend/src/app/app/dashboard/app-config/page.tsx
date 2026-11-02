"use client";

import React, { useEffect, useState } from "react";
import { platformApi } from "@/lib/app-platform/api";
import { AppConfig, StoreSettings } from "@/lib/app-platform/types";
import StatusBadge from "@/components/app-platform/shared/StatusBadge";
import {
  Smartphone,
  Check,
  AlertCircle,
  Save,
  ExternalLink,
  Layers,
  Sparkles,
  ShieldCheck,
  Palette,
} from "lucide-react";

export default function VendorAppConfigPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [store, setStore] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [appCfg, storeData] = await Promise.all([
          platformApi.getVendorAppConfig(),
          platformApi.getVendorStore(),
        ]);
        setConfig(appCfg);
        setStore(storeData);
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
    if (!config) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await platformApi.updateVendorAppConfig({
        app_name: config.app_name,
        app_logo_url: config.app_logo_url,
        splash_screen_url: config.splash_screen_url,
        primary_color: config.primary_color,
        secondary_color: config.secondary_color,
      });
      setConfig(updated);
      setMessage({ type: "success", text: "App branding configuration updated successfully!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update configuration" });
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
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Branded Android Mobile Application</h1>
        <p className="text-sm text-slate-500">
          Configure assets and track the development and publication of your official Android shopping app
        </p>
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

      {/* Build & Publication Status Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Build Pipeline Status
          </span>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">{config?.app_name}</h2>
            <StatusBadge status={config?.app_build_status || "NOT_REQUESTED"} />
            <StatusBadge status={config?.publication_status || "UNPUBLISHED"} />
          </div>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Package ID: <span className="text-slate-800">{config?.package_id}</span> • Version: {config?.app_version}
          </p>
        </div>

        {config?.playstore_url ? (
          <a
            href={config.playstore_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-xs hover:bg-emerald-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open on Google Play Store
          </a>
        ) : (
          <div className="text-xs text-slate-400 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            Android APK build will be compiled & deployed by Digital Growth Studio’s developer.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Configuration */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            App Branding & Visual Assets
          </h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                App Display Name
              </label>
              <input
                type="text"
                required
                value={config?.app_name || ""}
                onChange={(e) => setConfig((prev) => (prev ? { ...prev, app_name: e.target.value } : null))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                App Launcher Icon URL (512x512 png)
              </label>
              <input
                type="url"
                value={config?.app_logo_url || ""}
                onChange={(e) => setConfig((prev) => (prev ? { ...prev, app_logo_url: e.target.value } : null))}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Splash Screen Graphic URL
              </label>
              <input
                type="url"
                value={config?.splash_screen_url || ""}
                onChange={(e) => setConfig((prev) => (prev ? { ...prev, splash_screen_url: e.target.value } : null))}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Primary App Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config?.primary_color || "#2563EB"}
                    onChange={(e) => setConfig((prev) => (prev ? { ...prev, primary_color: e.target.value } : null))}
                    className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={config?.primary_color || "#2563EB"}
                    onChange={(e) => setConfig((prev) => (prev ? { ...prev, primary_color: e.target.value } : null))}
                    className="w-24 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Secondary App Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config?.secondary_color || "#1E293B"}
                    onChange={(e) => setConfig((prev) => (prev ? { ...prev, secondary_color: e.target.value } : null))}
                    className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={config?.secondary_color || "#1E293B"}
                    onChange={(e) => setConfig((prev) => (prev ? { ...prev, secondary_color: e.target.value } : null))}
                    className="w-24 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                Save App Assets
              </button>
            </div>
          </form>
        </div>

        {/* Mobile Device Mockup Preview */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col items-center justify-center">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Mobile Screen Mockup</h4>

          {/* Phone Frame */}
          <div className="w-64 h-[440px] rounded-[36px] border-4 border-slate-800 bg-slate-900 p-2 shadow-xl flex flex-col relative overflow-hidden">
            {/* Speaker notch */}
            <div className="w-20 h-3.5 bg-slate-800 rounded-full mx-auto mb-2 shrink-0" />

            {/* Screen Content */}
            <div className="flex-1 bg-slate-50 rounded-[24px] overflow-hidden flex flex-col text-slate-900">
              {/* App Bar */}
              <div
                className="px-4 py-3 text-white text-xs font-bold flex items-center justify-between"
                style={{ backgroundColor: config?.primary_color || "#2563EB" }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                    🛍️
                  </div>
                  <span className="truncate max-w-[120px]">{config?.app_name}</span>
                </div>
                <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded">COD</span>
              </div>

              {/* Mock App Feed */}
              <div className="p-3 space-y-2.5 flex-1 overflow-y-auto text-[10px]">
                {/* Banner Mock */}
                <div
                  className="w-full h-20 rounded-xl p-2.5 text-white flex flex-col justify-end"
                  style={{
                    backgroundColor: config?.secondary_color || "#1E293B",
                    backgroundImage: `url(${config?.splash_screen_url || ""})`,
                    backgroundSize: "cover",
                  }}
                >
                  <span className="font-bold">Exclusive Mobile Offers</span>
                  <span className="text-[8px] opacity-80">Syncs live from your store</span>
                </div>

                <div className="font-bold text-slate-800">Featured Products</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                    <div className="w-full h-12 bg-slate-100 rounded-md mb-1" />
                    <p className="font-medium truncate">Product A</p>
                    <p className="font-bold text-blue-600">₹999</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                    <div className="w-full h-12 bg-slate-100 rounded-md mb-1" />
                    <p className="font-medium truncate">Product B</p>
                    <p className="font-bold text-blue-600">₹1,499</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

