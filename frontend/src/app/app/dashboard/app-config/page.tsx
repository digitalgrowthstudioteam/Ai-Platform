"use client";

import React, { useEffect, useState, useRef } from "react";
import { platformApi } from "@/lib/app-platform/api";
import { AppConfig, StoreSettings, VendorProfile } from "@/lib/app-platform/types";
import StatusBadge from "@/components/app-platform/shared/StatusBadge";
import {
  Smartphone,
  Check,
  AlertCircle,
  Save,
  ExternalLink,
  Lock,
  UploadCloud,
  Image as ImageIcon,
  Sparkles,
  ShieldCheck,
  Palette,
  RefreshCw,
  Send,
  Building2,
} from "lucide-react";

export default function VendorAppConfigPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [store, setStore] = useState<StoreSettings | null>(null);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submittingDev, setSubmittingDev] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingSplash, setUploadingSplash] = useState(false);
  const [iconImgError, setIconImgError] = useState(false);
  const [splashImgError, setSplashImgError] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const iconInputRef = useRef<HTMLInputElement>(null);
  const splashInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const [appCfg, storeData, profileData] = await Promise.all([
          platformApi.getVendorAppConfig(),
          platformApi.getVendorStore(),
          platformApi.getVendorProfile().catch(() => null),
        ]);
        setConfig(appCfg);
        setStore(storeData);
        setProfile(profileData);
      } catch (e: any) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Check if development is set / locked
  const isDevelopmentSet = Boolean(
    config?.is_locked ||
    (config?.app_build_status && ["QUEUED", "IN_DEVELOPMENT", "BUILT", "PUBLISHED"].includes(config.app_build_status))
  );

  // Handle image upload for App Launcher Icon
  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDevelopmentSet) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIcon(true);
    setMessage(null);
    try {
      // 1. Guaranteed local base64 fallback so it always renders without broken icons
      const reader = new FileReader();
      const localDataUrl = await new Promise<string>((resolve) => {
        reader.onload = (event) => resolve((event.target?.result as string) || "");
        reader.readAsDataURL(file);
      });

      let iconUrl = localDataUrl;
      if (!platformApi.isDemoMode()) {
        try {
          const uploadRes = await platformApi.uploadFile(file, "app-assets");
          if (uploadRes?.url && !uploadRes.url.includes("images.digitalgrowthstudio.in")) {
            iconUrl = uploadRes.url;
          }
        } catch (upErr) {
          console.warn("Upload fallback to base64 data URI:", upErr);
        }
      }

      if (iconUrl) {
        setIconImgError(false);
        // Update local state
        setConfig((prev) => (prev ? { ...prev, app_logo_url: iconUrl } : null));

        // Sync with personal vendor profile & store data
        await Promise.all([
          platformApi.updateVendorAppConfig({ app_logo_url: iconUrl }),
          platformApi.updateVendorStore({ logo_url: iconUrl }).catch(() => null),
          platformApi.updateVendorProfile({ logo_url: iconUrl }).catch(() => null),
        ]);

        if (store) setStore({ ...store, logo_url: iconUrl });
        if (profile) setProfile({ ...profile, logo_url: iconUrl });

        setMessage({
          type: "success",
          text: "App Launcher Icon uploaded and synced with your personal store profile!",
        });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to upload launcher icon." });
    } finally {
      setUploadingIcon(false);
      if (iconInputRef.current) iconInputRef.current.value = "";
    }
  };

  // Quick use store logo as app icon
  const handleUseStoreLogo = async () => {
    if (isDevelopmentSet) return;
    const existingLogo = store?.logo_url || profile?.logo_url;
    if (!existingLogo || existingLogo.includes("images.digitalgrowthstudio.in")) {
      setMessage({
        type: "error",
        text: "Store logo not uploaded yet. Click 'Replace Image' to upload your launcher icon.",
      });
      return;
    }

    setIconImgError(false);
    setConfig((prev) => (prev ? { ...prev, app_logo_url: existingLogo } : null));
    try {
      await platformApi.updateVendorAppConfig({ app_logo_url: existingLogo });
      setMessage({
        type: "success",
        text: "Store logo applied as App Launcher Icon!",
      });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to apply store logo." });
    }
  };

  // Handle image upload for Splash Screen Graphic
  const handleSplashUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDevelopmentSet) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSplash(true);
    setMessage(null);
    try {
      const reader = new FileReader();
      const localDataUrl = await new Promise<string>((resolve) => {
        reader.onload = (event) => resolve((event.target?.result as string) || "");
        reader.readAsDataURL(file);
      });

      let splashUrl = localDataUrl;
      if (!platformApi.isDemoMode()) {
        try {
          const uploadRes = await platformApi.uploadFile(file, "app-assets");
          if (uploadRes?.url && !uploadRes.url.includes("images.digitalgrowthstudio.in")) {
            splashUrl = uploadRes.url;
          }
        } catch (upErr) {
          console.warn("Upload fallback to base64 data URI:", upErr);
        }
      }

      if (splashUrl) {
        setSplashImgError(false);
        setConfig((prev) => (prev ? { ...prev, splash_screen_url: splashUrl } : null));
        await platformApi.updateVendorAppConfig({ splash_screen_url: splashUrl });
        setMessage({
          type: "success",
          text: "Splash screen graphic uploaded successfully!",
        });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to upload splash graphic." });
    } finally {
      setUploadingSplash(false);
      if (splashInputRef.current) splashInputRef.current.value = "";
    }
  };

  // Save Draft Assets (when not yet locked)
  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config || isDevelopmentSet) return;
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
      setMessage({ type: "success", text: "App branding draft saved successfully!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update configuration" });
    } finally {
      setSaving(false);
    }
  };

  // Submit Assets for Development & Lock Configuration
  const handleSubmitForDevelopment = async () => {
    if (!config || isDevelopmentSet) return;

    if (!config.app_name?.trim()) {
      setMessage({ type: "error", text: "Please enter an App Display Name before submitting." });
      return;
    }
    if (!config.app_logo_url?.trim()) {
      setMessage({ type: "error", text: "Please upload an App Launcher Icon before submitting." });
      return;
    }

    const confirmSubmit = window.confirm(
      "Are you sure you want to submit your assets for Android App Development?\n\nOnce submitted, your App Display Name, Launcher Icon, Splash Graphic, and Colors will be PERMANENTLY LOCKED to compile your production Android APK and Play Store release."
    );
    if (!confirmSubmit) return;

    setSubmittingDev(true);
    setMessage(null);
    try {
      const updated = await platformApi.submitVendorAppForDevelopment();
      setConfig(updated);
      setMessage({
        type: "success",
        text: "🚀 App assets submitted to development team! Configuration is now locked for production build compilation.",
      });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to submit app configuration." });
    } finally {
      setSubmittingDev(false);
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
          Configure branding assets, upload visuals, and track the development and publication of your official Android shopping app
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
          {message.type === "success" ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Build & Publication Status Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Build Pipeline Status
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">{config?.app_name}</h2>
            <StatusBadge status={config?.app_build_status || "NOT_REQUESTED"} />
            <StatusBadge status={config?.publication_status || "UNPUBLISHED"} />
            {isDevelopmentSet && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                <Lock className="w-3 h-3" />
                Assets Locked
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Package ID: <span className="text-slate-800 font-semibold">{config?.package_id}</span> • Version: {config?.app_version}
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
        ) : config?.apk_download_url ? (
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={config.apk_download_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs shadow-xs hover:bg-slate-800 transition-colors"
            >
              <Smartphone className="w-4 h-4 text-emerald-400" />
              Download APK
            </a>
            {!config.apk_user_approved ? (
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm("Approve this Android APK build and activate the ₹499/mo recurring subscription?")) {
                    await platformApi.approveApkAndActivateSubscription();
                    const updated = await platformApi.getVendorAppConfig();
                    setConfig(updated);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Approve APK & Start ₹499/mo Plan
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                APK Approved • ₹499/mo Active
              </span>
            )}
          </div>
        ) : (
          <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed max-w-sm">
            Android APK build compiled and published by Digital Growth Studio's Android engineers.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Configuration */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                App Branding & Visual Assets
              </h3>
              <p className="text-xs text-slate-500">
                Integrated directly into your Android app package, splash screen, and personal store identity
              </p>
            </div>
            {isDevelopmentSet ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                Locked & Frozen
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                <Sparkles className="w-3 h-3" />
                Ready to Configure
              </span>
            )}
          </div>

          {/* Locked Notice Banner */}
          {isDevelopmentSet && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold flex items-center gap-2">
                  <span>Development Set & Assets Locked</span>
                  <span className="bg-amber-200 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold uppercase">
                    {config?.app_build_status}
                  </span>
                </div>
                <p className="text-amber-800 leading-relaxed">
                  Your Android application build is set and development is underway. To maintain reproducible Google Play Store signatures, app manifest credentials, and keystore security, branding visual assets cannot be changed once development is set.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSaveDraft} className="space-y-6">
            {/* App Display Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>App Display Name</span>
                {isDevelopmentSet && (
                  <span className="text-[11px] font-normal text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Permanent (Build Set)
                  </span>
                )}
              </label>
              <input
                type="text"
                required
                disabled={isDevelopmentSet}
                value={config?.app_name || ""}
                onChange={(e) => setConfig((prev) => (prev ? { ...prev, app_name: e.target.value } : null))}
                placeholder="e.g. ABC Fashion Store"
                className={`w-full px-4 py-2.5 rounded-xl text-sm border ${
                  isDevelopmentSet
                    ? "bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed font-medium"
                    : "bg-slate-50 border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                }`}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                This is the name users see below your app icon on their Android home screen and in notifications.
              </p>
            </div>

            {/* App Launcher Icon (Image Upload Only - No Links) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  App Launcher Icon (512×512 PNG)
                </label>
                {!isDevelopmentSet && (store?.logo_url || profile?.logo_url) && (
                  <button
                    type="button"
                    onClick={handleUseStoreLogo}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Building2 className="w-3 h-3" />
                    Use Personal Store Logo
                  </button>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={iconInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={isDevelopmentSet || uploadingIcon}
                onChange={handleIconUpload}
                className="hidden"
              />

              {config?.app_logo_url && !config.app_logo_url.includes("images.digitalgrowthstudio.in") && !iconImgError ? (
                <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  {/* Android Adaptive Icon Preview */}
                  <div className="relative shrink-0">
                    <img
                      src={config.app_logo_url}
                      alt="App Icon"
                      onError={() => setIconImgError(true)}
                      className="w-18 h-18 rounded-2xl object-cover shadow-md border-2 border-white ring-1 ring-slate-200"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-1 rounded-full shadow-xs">
                      <Smartphone className="w-2.5 h-2.5" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      Android Adaptive Launcher Icon
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      512×512 PNG • Auto-scaled for Android MDPI to XXXHDPI screen densities
                    </p>
                    <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Saved in personal vendor data & store profile
                    </p>
                  </div>

                  {!isDevelopmentSet && (
                    <button
                      type="button"
                      disabled={uploadingIcon}
                      onClick={() => iconInputRef.current?.click()}
                      className="shrink-0 px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {uploadingIcon ? "Uploading..." : "Replace Image"}
                    </button>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => !isDevelopmentSet && !uploadingIcon && iconInputRef.current?.click()}
                  className={`border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center transition-colors ${
                    isDevelopmentSet
                      ? "bg-slate-100 cursor-not-allowed opacity-60"
                      : "bg-slate-50/50 hover:bg-blue-50/40 hover:border-blue-300 cursor-pointer"
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
                    {uploadingIcon ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <UploadCloud className="w-6 h-6" />
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    {uploadingIcon ? "Uploading Icon..." : "Click or drag to add App Launcher Icon"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    PNG recommended (512×512) • Stored securely in your personal vendor data
                  </p>
                </div>
              )}
            </div>

            {/* Splash Screen Graphic (Image Upload Only - No Links) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Splash Screen Graphic (1080×1920)
              </label>

              {/* Hidden file input */}
              <input
                ref={splashInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={isDevelopmentSet || uploadingSplash}
                onChange={handleSplashUpload}
                className="hidden"
              />

              {config?.splash_screen_url && !config.splash_screen_url.includes("images.digitalgrowthstudio.in") && !splashImgError ? (
                <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  {/* Portrait Splash Preview */}
                  <div className="w-14 h-24 rounded-xl overflow-hidden shrink-0 border border-slate-300 shadow-xs bg-slate-800">
                    <img
                      src={config.splash_screen_url}
                      alt="Splash Screen Graphic"
                      onError={() => setSplashImgError(true)}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900">
                      Mobile App Launch & Loading Splash
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      High-resolution portrait screen graphic shown while app loads
                    </p>
                    <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Applied to dynamic Android splash activity
                    </p>
                  </div>

                  {!isDevelopmentSet && (
                    <button
                      type="button"
                      disabled={uploadingSplash}
                      onClick={() => splashInputRef.current?.click()}
                      className="shrink-0 px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {uploadingSplash ? "Uploading..." : "Replace Image"}
                    </button>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => !isDevelopmentSet && !uploadingSplash && splashInputRef.current?.click()}
                  className={`border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center transition-colors ${
                    isDevelopmentSet
                      ? "bg-slate-100 cursor-not-allowed opacity-60"
                      : "bg-slate-50/50 hover:bg-blue-50/40 hover:border-blue-300 cursor-pointer"
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
                    {uploadingSplash ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <UploadCloud className="w-6 h-6" />
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    {uploadingSplash ? "Uploading Graphic..." : "Click or drag to add Splash Screen Graphic"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    1080×1920 Portrait PNG/JPEG recommended
                  </p>
                </div>
              )}
            </div>

            {/* Colors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Primary App Color</span>
                  {isDevelopmentSet && <Lock className="w-3 h-3 text-slate-400" />}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    disabled={isDevelopmentSet}
                    value={config?.primary_color || "#2563EB"}
                    onChange={(e) => setConfig((prev) => (prev ? { ...prev, primary_color: e.target.value } : null))}
                    className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white disabled:cursor-not-allowed"
                  />
                  <input
                    type="text"
                    disabled={isDevelopmentSet}
                    value={config?.primary_color || "#2563EB"}
                    onChange={(e) => setConfig((prev) => (prev ? { ...prev, primary_color: e.target.value } : null))}
                    className="w-28 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono disabled:bg-slate-100 disabled:text-slate-500 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Secondary App Color</span>
                  {isDevelopmentSet && <Lock className="w-3 h-3 text-slate-400" />}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    disabled={isDevelopmentSet}
                    value={config?.secondary_color || "#1E293B"}
                    onChange={(e) => setConfig((prev) => (prev ? { ...prev, secondary_color: e.target.value } : null))}
                    className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white disabled:cursor-not-allowed"
                  />
                  <input
                    type="text"
                    disabled={isDevelopmentSet}
                    value={config?.secondary_color || "#1E293B"}
                    onChange={(e) => setConfig((prev) => (prev ? { ...prev, secondary_color: e.target.value } : null))}
                    className="w-28 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono disabled:bg-slate-100 disabled:text-slate-500 uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              {isDevelopmentSet ? (
                <div className="w-full flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Assets set for Android development pipeline</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    {config?.app_build_status}
                  </span>
                </div>
              ) : (
                <>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? (
                      <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 text-slate-500" />
                    )}
                    Save Draft Assets
                  </button>

                  <button
                    type="button"
                    disabled={submittingDev}
                    onClick={handleSubmitForDevelopment}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {submittingDev ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Submit & Freeze for App Development 🚀
                  </button>
                </>
              )}
            </div>
          </form>
        </div>

        {/* Mobile Device Mockup Preview */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col items-center justify-center">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Live App Mockup</h4>
          <p className="text-[11px] text-slate-400 mb-4 text-center">
            Synchronized with your personal store visual branding
          </p>

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
                <div className="flex items-center gap-2 min-w-0">
                  {config?.app_logo_url ? (
                    <img
                      src={config.app_logo_url}
                      alt="Icon"
                      className="w-5 h-5 rounded-full object-cover bg-white/20"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                      🛍️
                    </div>
                  )}
                  <span className="truncate max-w-[120px]">{config?.app_name || "Store App"}</span>
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
                    backgroundImage: config?.splash_screen_url ? `url(${config.splash_screen_url})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <span className="font-bold">Exclusive Mobile Offers</span>
                  <span className="text-[8px] opacity-80">Live store synchronization</span>
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
