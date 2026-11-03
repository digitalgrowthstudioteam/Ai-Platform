"use client";

import React, { useEffect, useState } from "react";
import { platformApi } from "@/lib/app-platform/api";
import StatusBadge from "@/components/app-platform/shared/StatusBadge";
import {
  Sparkles,
  HardDrive,
  CheckCircle2,
  Calendar,
  Plus,
  Shield,
  CreditCard,
  Zap,
  Download,
  AlertCircle,
  Loader2,
  Check,
  CheckCheck,
  ExternalLink,
} from "lucide-react";

export default function VendorSubscriptionPage() {
  const [data, setData] = useState<any>(null);
  const [appConfig, setAppConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasingAddonId, setPurchasingAddonId] = useState<string | null>(null);
  const [approvingApk, setApprovingApk] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadData = async () => {
    try {
      const [info, appCfg] = await Promise.all([
        platformApi.getSubscriptionInfo(),
        platformApi.getVendorAppConfig().catch(() => null),
      ]);
      setData(info);
      setAppConfig(appCfg);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

  // Buy Add-on via platform Razorpay
  const handleBuyAddon = async (addon: any) => {
    setPurchasingAddonId(addon.id);
    setNotification(null);

    try {
      const orderRes = await platformApi.createAddonOrder(addon.id);

      if (orderRes.is_mock) {
        await platformApi.verifyAddonPayment({
          addon_id: addon.id,
          razorpay_order_id: orderRes.order_id,
          razorpay_payment_id: "pay_mock_addon_" + Math.random().toString(36).substring(2, 9),
          razorpay_signature: "sig_mock_addon",
        });
        setNotification({
          type: "success",
          message: `🎉 '${addon.name}' successfully activated via Razorpay!`,
        });
        await loadData();
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setNotification({
          type: "error",
          message: "Failed to load Razorpay Checkout SDK. Please check your internet connection.",
        });
        return;
      }

      const options = {
        key: orderRes.key_id,
        amount: orderRes.amount,
        currency: orderRes.currency,
        name: "Digital Growth Studio",
        description: `Add-on: ${addon.name}`,
        order_id: orderRes.order_id,
        theme: {
          color: "#2563EB",
        },
        handler: async (response: any) => {
          try {
            await platformApi.verifyAddonPayment({
              addon_id: addon.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setNotification({
              type: "success",
              message: `🎉 '${addon.name}' successfully activated via Razorpay!`,
            });
            await loadData();
          } catch (err: any) {
            setNotification({
              type: "error",
              message: err.message || "Payment verification failed. Please contact support.",
            });
          }
        },
        modal: {
          ondismiss: () => {
            setPurchasingAddonId(null);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to initiate Razorpay checkout.",
      });
    } finally {
      setPurchasingAddonId(null);
    }
  };

  // Vendor tests and approves submitted APK
  const handleApproveApk = async () => {
    const confirmed = window.confirm(
      "Have you tested your submitted Android APK?\n\nBy approving this build, your official ₹499/month recurring auto-debit subscription will be activated to keep your app live and synced with your product catalog."
    );
    if (!confirmed) return;

    setApprovingApk(true);
    setNotification(null);
    try {
      await platformApi.approveApkAndActivateSubscription();
      setNotification({
        type: "success",
        message: "🚀 Final APK approved! Your ₹499/mo Android App subscription is now active.",
      });
      await loadData();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to activate subscription.",
      });
    } finally {
      setApprovingApk(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sub = data?.subscription;
  const plan = sub?.plan;
  const storage = data?.storage;
  const addons = data?.available_addons || [];

  const storageUsedMb = storage ? (storage.total_bytes_used / (1024 * 1024)).toFixed(1) : "0";
  const storageLimitMb = storage ? (storage.limit_bytes / (1024 * 1024)).toFixed(0) : "1024";

  const isApkReadyForApproval =
    (appConfig?.app_build_status === "BUILT" || appConfig?.app_build_status === "PUBLISHED") &&
    !appConfig?.apk_user_approved;

  const isApkApproved = Boolean(appConfig?.apk_user_approved);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subscription & Add-ons</h1>
        <p className="text-sm text-slate-500">
          Manage your SaaS platform membership, cloud quota, and optional growth add-ons with Razorpay
        </p>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm flex items-center gap-2 ${
            notification.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* APK Delivery & Approval Banner */}
      {isApkReadyForApproval && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white">
                <Zap className="w-3 h-3" /> Action Required: Review & Confirm Tested APK
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Your Branded Android APK is Compiled & Ready!
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                Our Android engineers have compiled your production APK (sent to your WhatsApp or available for download below). Test the app on your phone. Once you confirm the APK is working, enroll in your ₹499/month recurring membership to keep your app synced and initiate Google Play Store publication.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {appConfig?.apk_download_url ? (
              <a
                href={appConfig.apk_download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 shadow-2xs transition-colors"
              >
                <Download className="w-4 h-4 text-blue-600" />
                Download Android APK
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-100/80 border border-emerald-200">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                APK Sent Directly via WhatsApp
              </span>
            )}

            <button
              type="button"
              disabled={approvingApk}
              onClick={handleApproveApk}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {approvingApk ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              Confirm APK & Enroll in ₹499/mo Membership
            </button>
          </div>
        </div>
      )}

      {/* Current Plan Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                Active Membership
              </span>
              <StatusBadge status={isApkApproved ? "active" : sub?.status || "PENDING_APK_APPROVAL"} />
              {isApkApproved ? (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600" />
                  Auto-Debit Active
                </span>
              ) : (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  Pending APK Confirmation
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{plan?.name || "Starter Store Plan"}</h2>
            <p className="text-xs text-slate-500 mt-1">
              Multi-vendor storefront and branded Android mobile app solution
            </p>
          </div>

          <div className="text-left md:text-right">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">₹{sub?.monthly_price_inr || 499}</span>
            <span className="text-xs text-slate-500"> / month</span>
            <p className="text-xs text-slate-400 mt-1">
              One-Time Setup: ₹{plan?.setup_fee_inr || 2000} (Cleared)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-xs text-slate-400 block mb-1">Billing Cycle</span>
            <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              Monthly Auto-Debit
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {isApkApproved
                ? `Next renewal: ${sub?.next_renewal_date ? new Date(sub.next_renewal_date).toLocaleDateString() : "Active"}`
                : "Starts upon final APK approval"}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-xs text-slate-400 block mb-1">Cloud Storage Usage</span>
            <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5 font-mono">
              <HardDrive className="w-4 h-4 text-amber-600" />
              {storageUsedMb} MB / {storageLimitMb} MB
            </p>
            <p className="text-[11px] text-slate-500 mt-1">{storage?.product_count || 0} products uploaded</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-xs text-slate-400 block mb-1">Android Application</span>
            <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-600" />
              {appConfig?.publication_status === "PUBLISHED"
                ? "Live on Google Play Store"
                : isApkApproved
                ? "Production Build Approved"
                : "In Development Pipeline"}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {appConfig?.publication_status === "PUBLISHED" && appConfig?.playstore_url ? (
                <a
                  href={appConfig.playstore_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-semibold inline-flex items-center gap-1"
                >
                  View on Play Store <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                "Directly connects to live store feed"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Add-ons Marketplace with Razorpay Integration */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Available Growth Add-ons</h3>
            <p className="text-xs text-slate-500">
              Instant activation processed securely through Digital Growth Studio's Razorpay gateway
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <CreditCard className="w-3.5 h-3.5" />
            Razorpay Protected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addons.map((a: any) => {
            const isBuying = purchasingAddonId === a.id;
            return (
              <div
                key={a.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-blue-200 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-slate-900">{a.name}</h4>
                    <span className="text-xs font-extrabold text-blue-600 font-mono">
                      ₹{a.price_inr.toLocaleString("en-IN")}
                      <span className="text-[10px] font-normal text-slate-400">
                        {a.billing_type === "MONTHLY" ? "/mo" : " one-time"}
                      </span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {a.description || "Enhance your store capabilities."}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="button"
                    disabled={isBuying}
                    onClick={() => handleBuyAddon(a)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isBuying ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Opening Razorpay...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Buy with Razorpay</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
