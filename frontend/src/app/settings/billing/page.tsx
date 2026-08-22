"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  CreditCard,
  Check,
  ShieldCheck,
  Zap,
  Activity,
  Loader2,
  Lock,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  Users,
  Database,
  Layers,
  Star,
  Building2,
  TrendingUp,
} from "lucide-react";
import { trackPurchase, trackInitiateCheckout } from "@/lib/analytics";

export default function BillingPage() {
  const { user } = useAuth();
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({
    additional_account: 1,
    additional_team_member: 1,
    additional_optimization_campaign: 1,
  });
  const [notification, setNotification] = useState<{
    type: "success" | "warning" | "error";
    message: string;
  } | null>(null);

  const fetchSubscription = async () => {
    const cacheKey = "dgs_cached_subscription";

    // Load cached subscription instantly to bypass loading spinner
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setSub(JSON.parse(cached));
        setLoading(false);
      } catch (e) {}
    } else {
      // Fallback default starter subscription state instantly if no cache exists
      setSub({
        plan: "starter",
        status: "active",
        resolved_entitlements: {
          max_meta_accounts: 1,
          historical_days: 30,
          sync_interval_hours: 48,
          max_team_members: 1,
        },
        active_addons_list: [],
        monthly_total_cost: 99,
      });
      setLoading(false);
    }

    try {
      const res = await api.getSubscription();
      setSub(res);
      sessionStorage.setItem(cacheKey, JSON.stringify(res));
    } catch (err) {
      console.error("Failed to load subscription details:", err);
    }
  };

  const [starterAvailable, setStarterAvailable] = useState(true);

  useEffect(() => {
    fetchSubscription();
    loadRazorpayScript();

    async function checkAvailability() {
      try {
        const res = await api.getPlansAvailability();
        setStarterAvailable(res.starter_available);
      } catch (e) {
        console.error("Failed to check plan availability:", e);
      }
    }
    checkAvailability();
  }, [user]);

  // Load Razorpay checkout script dynamically
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

  // Handle plan checkout / upgrade
  const handlePlanCheckout = async (planId: string) => {
    if (planId === "free") return;
    try {
      setActionLoading(`plan_${planId}`);
      setNotification(null);

      const order = await api.createBillingOrder(planId);
      trackInitiateCheckout(planId, order.amount / 100, order.currency || "INR");
      
      if (order.is_mock) {
        await api.verifyBillingPayment(
          order.order_id,
          "pay_mock_" + Math.random().toString(36).substring(7),
          "sig_mock_" + Math.random().toString(36).substring(7),
          planId
        );
        
        setNotification({
          type: "warning",
          message: `Simulated checkout successful! Upgraded to ${planId.toUpperCase()} plan.`,
        });
        
        await fetchSubscription();
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setNotification({
          type: "error",
          message: "Failed to load Razorpay Payment Gateway script.",
        });
        return;
      }

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Digital Growth Studio",
        description: `Upgrade to ${planId.toUpperCase()} Plan`,
        order_id: order.order_id,
        handler: async (response: any) => {
          try {
            setLoading(true);
            await api.verifyBillingPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
              planId
            );
            setNotification({
              type: "success",
              message: `Payment verification successful! Subscription upgraded to ${planId.toUpperCase()} plan.`,
            });
            trackPurchase(planId, order.amount / 100, order.currency || "INR");
            await fetchSubscription();
          } catch (err: any) {
            console.error("Payment verification failed:", err);
            setNotification({
              type: "error",
              message: "Payment verification failed. Please contact support.",
            });
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          email: user?.email || "",
          name: user?.displayName || "",
        },
        theme: {
          color: "#2563EB",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      console.error("Billing checkout failed:", err);
      setNotification({
        type: "error",
        message: err?.message || "Failed to initialize subscription checkout. Please verify the backend API is running.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle add-on purchase
  const handleAddonCheckout = async (addonId: string) => {
    try {
      setActionLoading(`addon_${addonId}`);
      setNotification(null);

      const qty = addonQuantities[addonId] || 1;
      const order = await api.createAddonBillingOrder(addonId, qty);
      trackInitiateCheckout(addonId, order.amount / 100, order.currency || "INR");
      
      if (order.is_mock) {
        await api.verifyAddonBillingPayment(
          order.order_id,
          "pay_mock_" + Math.random().toString(36).substring(7),
          "sig_mock_" + Math.random().toString(36).substring(7),
          addonId,
          qty
        );
        
        setNotification({
          type: "success",
          message: `Add-on activated! Bypassed live gateway in development mode.`,
        });
        
        await fetchSubscription();
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setNotification({
          type: "error",
          message: "Failed to load Razorpay Payment Gateway script.",
        });
        return;
      }

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Digital Growth Studio",
        description: `Add-on Purchase: ${addonId}`,
        order_id: order.order_id,
        handler: async (response: any) => {
          try {
            setLoading(true);
            await api.verifyAddonBillingPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
              addonId,
              qty
            );
            setNotification({
              type: "success",
              message: `Add-on successfully activated for your account!`,
            });
            trackPurchase(addonId, order.amount / 100, order.currency || "INR");
            await fetchSubscription();
          } catch (err: any) {
            console.error("Addon payment verification failed:", err);
            setNotification({
              type: "error",
              message: "Add-on payment verification failed. Please try again.",
            });
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          email: user?.email || "",
          name: user?.displayName || "",
        },
        theme: {
          color: "#2563EB",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      console.error("Addon checkout failed:", err);
      setNotification({
        type: "error",
        message: "Failed to initialize add-on checkout. Please try again.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle add-on cancellation
  const handleCancelAddon = async (addonId: string) => {
    try {
      setActionLoading(`cancel_${addonId}`);
      await api.cancelAddon(addonId);
      setNotification({
        type: "warning",
        message: `Auto-renewal for add-on successfully cancelled. Access remains active until the end of your billing cycle.`,
      });
      await fetchSubscription();
    } catch (err: any) {
      console.error("Failed to cancel addon:", err);
      setNotification({
        type: "error",
        message: "Failed to cancel add-on auto-renewal.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getPlanDetails = (planId: string) => {
    if (sub?.status === "trialing") {
      return { name: "7-Day Free Trial", price: "₹0/mo", color: "text-blue-700 bg-blue-50 border-blue-200" };
    }
    if (sub?.status === "expired") {
      return { name: "Trial Expired", price: "₹99/mo", color: "text-rose-700 bg-rose-50 border-rose-200" };
    }

    switch (planId?.toLowerCase()) {
      case "agency":
        return { name: "Agency Plan", price: "₹4,999/mo", color: "text-purple-700 bg-purple-50 border-purple-200" };
      case "pro":
        return { name: "Pro Plan", price: "₹2,999/mo", color: "text-indigo-700 bg-indigo-50 border-indigo-200" };
      case "growth":
        return { name: "Growth Plan", price: "₹999/mo", color: "text-blue-700 bg-blue-50 border-blue-200" };
      case "starter":
        return { name: "Starter Plan", price: "₹99/mo", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
      default:
        return { name: "Free Tier", price: "₹0/mo", color: "text-slate-700 bg-slate-100 border-slate-200" };
    }
  };

  const activePlanInfo = sub ? getPlanDetails(sub.plan) : null;

  return (
    <div className="animate-fade-in space-y-8 w-full pb-16">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title text-2xl font-bold text-slate-900">Billing & Subscription Management</h1>
          <p className="page-subtitle text-sm text-slate-500 mt-1">
            Configure your Meta Ads intelligence plan, active add-ons, and payment preferences
          </p>
        </div>
      </div>

      {/* Floating Notifications */}
      {notification && (
        <div className={`p-4 rounded-xl border text-sm flex items-start gap-3 shadow-sm animate-fade-in ${
          notification.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
            : notification.type === "warning"
            ? "bg-amber-50 text-amber-800 border-amber-200"
            : "bg-rose-50 text-rose-800 border-rose-200"
        }`}>
          <ShieldCheck size={18} className="shrink-0 mt-0.5" />
          <div className="font-medium leading-relaxed">{notification.message}</div>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <span className="ml-3 text-sm text-slate-500 font-semibold">Loading billing details...</span>
        </div>
      ) : (
        <>
          {/* Active Subscription & Invoice Summary Banner */}
          {sub && (
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-150">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shrink-0 flex items-center justify-center border border-blue-100">
                    <CreditCard size={28} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Current Plan & Entitlements</h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`text-xs font-bold px-2.5 py-0.5 border rounded-full uppercase tracking-wider ${activePlanInfo?.color}`}>
                        {activePlanInfo?.name}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {sub.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-left md:text-right">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Monthly Total</div>
                  <div className="text-2xl font-extrabold text-slate-950 mt-0.5">
                    ₹{sub.monthly_total_cost} <span className="text-xs text-slate-400 font-semibold">/ month</span>
                  </div>
                </div>
              </div>

              {/* Resolved Entitlements Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold text-slate-700">
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meta Accounts</div>
                  <div className="text-base font-extrabold text-slate-900">
                    {sub.resolved_entitlements?.max_meta_accounts} Connected
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Historical Window</div>
                  <div className="text-base font-extrabold text-slate-900">
                    {sub.resolved_entitlements?.historical_days > 3000 ? "Lifetime History" : `${sub.resolved_entitlements?.historical_days} Days`}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sync Interval</div>
                  <div className="text-base font-extrabold text-slate-900">
                    Every {sub.resolved_entitlements?.sync_interval_hours} Hours
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Team Members</div>
                  <div className="text-base font-extrabold text-slate-900">
                    {sub.resolved_entitlements?.max_team_members} Seats
                  </div>
                </div>
              </div>

              {/* Active Add-Ons List */}
              {sub.active_addons_list && sub.active_addons_list.length > 0 && (
                <div className="pt-4 border-t border-slate-150 space-y-3">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">Active Purchased Add-Ons</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sub.active_addons_list.map((addon: any) => (
                      <div key={addon.addon_id} className="p-3.5 bg-blue-50/50 border border-blue-200/80 rounded-xl flex items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="font-bold text-slate-900">{addon.name}</div>
                          <div className="text-slate-500 text-[11px]">
                            Qty: {addon.quantity} • +₹{addon.price_monthly * addon.quantity}/mo
                          </div>
                        </div>
                        <button
                          disabled={actionLoading === `cancel_${addon.addon_id}`}
                          onClick={() => handleCancelAddon(addon.addon_id)}
                          className="px-2.5 py-1 text-[11px] font-bold text-rose-600 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg transition"
                        >
                          {actionLoading === `cancel_${addon.addon_id}` ? "Cancelling..." : "Cancel"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 1: SUBSCRIPTION PLANS GRID */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-950">Subscription Plans</h2>
              <p className="text-xs text-slate-500 font-medium">Select the right intelligence level for your Meta advertising scale</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. STARTER PLAN (₹99/mo) */}
              {(starterAvailable || sub?.plan === "starter") && (
                <div className={`bg-white border-2 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between relative ${
                  sub?.plan === "starter" ? "ring-2 ring-blue-600 border-blue-600" : "border-slate-200"
                }`}>
                  {sub?.status === "trialing" && (
                    <div className="bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wider text-center py-1">
                      ⚡ Active Free Trial
                    </div>
                  )}
                  {sub?.status !== "trialing" && (
                    <div className="bg-slate-100 text-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-center py-1">
                      Starter Tier
                    </div>
                  )}
                  <div className="p-5 space-y-3">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">Starter</h4>
                      <p className="text-[11px] text-slate-500">Low-cost entry for advertisers</p>
                    </div>
                    <div className="text-2xl font-extrabold text-slate-950">
                      ₹99<span className="text-xs text-slate-400 font-normal">/mo</span>
                    </div>

                    <div className="space-y-2 border-t border-slate-150 pt-3 text-[11px] font-medium text-slate-600">
                      <div className="flex items-center gap-1.5 font-bold text-blue-700">
                        <Check size={13} className="text-blue-600 shrink-0" />
                        <span>1 Meta Ad Account</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-bold text-emerald-600">
                        <Check size={13} className="text-emerald-600 shrink-0" />
                        <span>1 AI Optimization Campaign</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Check size={13} className="text-blue-600 shrink-0" />
                        <span>30 Days historical data</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check size={13} className="text-blue-600 shrink-0" />
                        <span>Every 48 Hours data sync</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check size={13} className="text-blue-600 shrink-0" />
                        <span>Full Ad & Creative Analysis</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check size={13} className="text-blue-600 shrink-0" />
                        <span>Headline & Copy Analysis</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check size={13} className="text-blue-600 shrink-0" />
                        <span>Account Health Score</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check size={13} className="text-blue-600 shrink-0" />
                        <span>PDF/CSV Export</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t border-slate-100 bg-slate-50">
                    <button
                      disabled={(sub?.plan === "starter" && sub?.status === "active") || actionLoading !== null}
                      onClick={() => handlePlanCheckout("starter")}
                      className="w-full py-2 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed text-white transition flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      {actionLoading === "plan_starter" && <Loader2 size={12} className="animate-spin" />}
                      {sub?.plan === "starter" && sub?.status === "active"
                        ? "Current Plan"
                        : sub?.plan === "starter" && sub?.status === "trialing"
                        ? "Upgrade Trial to Paid"
                        : "Subscribe to Starter"}
                    </button>
                  </div>
                </div>
              )}

              {/* 3. GROWTH PLAN (₹999/mo) */}
              <div className={`bg-white border-2 rounded-2xl overflow-hidden shadow-md flex flex-col justify-between relative ${
                sub?.plan === "growth" ? "ring-2 ring-blue-600 border-blue-600" : "border-blue-600"
              }`}>
                <div className="bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wider text-center py-1 flex items-center justify-center gap-1">
                  <Star size={11} className="fill-white" /> Recommended Plan
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Growth</h4>
                    <p className="text-[11px] text-slate-500">For active scaling advertisers</p>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-950">
                    ₹999<span className="text-xs text-slate-400 font-normal">/mo</span>
                  </div>

                  <div className="space-y-2 border-t border-slate-150 pt-3 text-[11px] font-medium text-slate-600">
                    <div className="flex items-center gap-1.5 font-bold text-blue-700">
                      <Check size={13} className="text-blue-600 shrink-0" />
                      <span>3 Meta Ad Accounts</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold text-emerald-600">
                      <Check size={13} className="text-emerald-600 shrink-0" />
                      <span>3 AI Optimization Campaigns</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Check size={13} className="text-blue-600 shrink-0" />
                      <span>90 Days historical data</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold text-blue-700">
                      <Check size={13} className="text-blue-600 shrink-0" />
                      <span>Every 12 Hours data sync</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check size={13} className="text-blue-600 shrink-0" />
                      <span>Advanced Creative Intelligence</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check size={13} className="text-blue-600 shrink-0" />
                      <span>Demographic & Placement Analysis</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check size={13} className="text-blue-600 shrink-0" />
                      <span>Campaign & Creative Comparison</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check size={13} className="text-blue-600 shrink-0" />
                      <span>Fatigue & Anomaly Detection</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check size={13} className="text-blue-600 shrink-0" />
                      <span>3 Team Members</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50">
                  <button
                    disabled={sub?.plan === "growth" || actionLoading !== null}
                    onClick={() => handlePlanCheckout("growth")}
                    className="w-full py-2 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {actionLoading === "plan_growth" && <Loader2 size={12} className="animate-spin" />}
                    {sub?.plan === "growth" ? "Current Plan" : "Upgrade to ₹999"}
                  </button>
                </div>
              </div>

              {/* 4. PRO PLAN (₹2,999/mo) */}
              <div className={`bg-white border rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between ${
                sub?.plan === "pro" ? "ring-2 ring-indigo-600 border-indigo-600" : "border-slate-200"
              }`}>
                <div className="p-5 space-y-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Pro</h4>
                    <p className="text-[11px] text-slate-500">For marketing teams & brands</p>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-950">
                    ₹2,999<span className="text-xs text-slate-400 font-normal">/mo</span>
                  </div>

                  <div className="space-y-2 border-t border-slate-150 pt-3 text-[11px] font-medium text-slate-600">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-700">
                      <Check size={13} className="text-indigo-600 shrink-0" />
                      <span>10 Meta Ad Accounts</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold text-emerald-600">
                      <Check size={13} className="text-emerald-600 shrink-0" />
                      <span>5 AI Optimization Campaigns</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Check size={13} className="text-indigo-600 shrink-0" />
                      <span>180 Days historical data</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold text-indigo-700">
                      <Check size={13} className="text-indigo-600 shrink-0" />
                      <span>Every 6 Hours data sync</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check size={13} className="text-indigo-600 shrink-0" />
                      <span>Cross-Account Analysis</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check size={13} className="text-indigo-600 shrink-0" />
                      <span>Performance Forecasting</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check size={13} className="text-indigo-600 shrink-0" />
                      <span>Industry Benchmarking</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check size={13} className="text-indigo-600 shrink-0" />
                      <span>10 Team Members</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50">
                  <button
                    disabled={sub?.plan === "pro" || actionLoading !== null}
                    onClick={() => handlePlanCheckout("pro")}
                    className="w-full py-2 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center justify-center gap-1.5"
                  >
                    {actionLoading === "plan_pro" && <Loader2 size={12} className="animate-spin" />}
                    {sub?.plan === "pro" ? "Current Plan" : "Upgrade to ₹2,999"}
                  </button>
                </div>
              </div>

              {/* 5. AGENCY PLAN (₹4,999/mo) */}
              <div className={`bg-white border rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between ${
                sub?.plan === "agency" ? "ring-2 ring-purple-600 border-purple-600" : "border-slate-200"
              }`}>
                <div className="p-5 space-y-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Agency</h4>
                    <p className="text-[11px] text-slate-500">For agencies & client portfolios</p>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-950">
                    ₹4,999<span className="text-xs text-slate-400 font-normal">/mo</span>
                  </div>

                  <div className="space-y-2 border-t border-slate-150 pt-3 text-[11px] font-medium text-slate-600">
                    <div className="flex items-center gap-1.5 font-bold text-purple-700">
                      <Check size={13} className="text-purple-600 shrink-0" />
                      <span>25 Meta Ad Accounts</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold text-emerald-600">
                      <Check size={13} className="text-emerald-600 shrink-0" />
                      <span>10 AI Optimization Campaigns</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Check size={13} className="text-purple-600 shrink-0" />
                      <span>365 Days historical data</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold text-purple-700">
                      <Check size={13} className="text-purple-600 shrink-0" />
                      <span>Every 6 Hours data sync</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check size={13} className="text-purple-600 shrink-0" />
                      <span>White-Label Client Reports</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check size={13} className="text-purple-600 shrink-0" />
                      <span>Cross-Client Portfolio Analytics</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check size={13} className="text-purple-600 shrink-0" />
                      <span>25 Team Members</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50">
                  <button
                    disabled={sub?.plan === "agency" || actionLoading !== null}
                    onClick={() => handlePlanCheckout("agency")}
                    className="w-full py-2 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white transition flex items-center justify-center gap-1.5"
                  >
                    {actionLoading === "plan_agency" && <Loader2 size={12} className="animate-spin" />}
                    {sub?.plan === "agency" ? "Current Plan" : "Upgrade to ₹4,999"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: CUSTOMIZE YOUR PLAN WITH PAID ADD-ONS */}
          <div className="space-y-4 pt-6 border-t border-slate-200">
            <div>
              <h2 className="text-lg font-extrabold text-slate-950">Customize Your Plan — Paid Add-Ons</h2>
              <p className="text-xs text-slate-500 font-medium">Add capacity or faster sync cycles without upgrading your base plan</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Addon 1: Additional Meta Account */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl w-fit">
                    <Building2 size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Additional Meta Ad Account</h3>
                  <div className="text-xl font-extrabold text-slate-950">
                    ₹299 <span className="text-xs text-slate-400 font-normal">/ month / account</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    Adds 1 additional Meta Ad Account beyond the included limit of your subscription plan.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Quantity:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAddonQuantities(q => ({ ...q, additional_account: Math.max(1, (q.additional_account || 1) - 1) }))}
                        className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-bold">{addonQuantities.additional_account || 1}</span>
                      <button
                        onClick={() => setAddonQuantities(q => ({ ...q, additional_account: (q.additional_account || 1) + 1 }))}
                        className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    disabled={actionLoading === "addon_additional_account"}
                    onClick={() => handleAddonCheckout("additional_account")}
                    className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {actionLoading === "addon_additional_account" && <Loader2 size={12} className="animate-spin" />}
                    <span>Add +{addonQuantities.additional_account || 1} Account</span>
                  </button>
                </div>
              </div>

              {/* Addon 1B: Additional AI Optimization Campaign */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl w-fit">
                    <TrendingUp size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Additional AI Optimization Campaign</h3>
                  <div className="text-xl font-extrabold text-slate-950">
                    ₹99 <span className="text-xs text-slate-400 font-normal">/ month / campaign slot</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    Monitor 1 more Meta Ads campaign simultaneously under continuous AI Optimization monitoring.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Quantity:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAddonQuantities(q => ({ ...q, additional_optimization_campaign: Math.max(1, (q.additional_optimization_campaign || 1) - 1) }))}
                        className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-bold">{addonQuantities.additional_optimization_campaign || 1}</span>
                      <button
                        onClick={() => setAddonQuantities(q => ({ ...q, additional_optimization_campaign: (q.additional_optimization_campaign || 1) + 1 }))}
                        className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    disabled={actionLoading === "addon_additional_optimization_campaign"}
                    onClick={() => handleAddonCheckout("additional_optimization_campaign")}
                    className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {actionLoading === "addon_additional_optimization_campaign" && <Loader2 size={12} className="animate-spin" />}
                    <span>Add +{addonQuantities.additional_optimization_campaign || 1} Campaign Slot</span>
                  </button>
                </div>
              </div>

              {/* Addon 2: Faster Sync */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl w-fit">
                    <Zap size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Faster Sync — 3 Hour</h3>
                  <div className="text-xl font-extrabold text-slate-950">
                    ₹999 <span className="text-xs text-slate-400 font-normal">/ month / all accounts</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    Upgrades background sync interval to 3 hours across all connected ad accounts.
                  </p>
                </div>

                {sub?.active_addons_list?.some((a: any) => a.addon_id === "faster_sync") ? (
                  <div className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 text-center flex items-center justify-center gap-1.5 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Subscribed</span>
                  </div>
                ) : (
                  <button
                    disabled={actionLoading === "addon_faster_sync"}
                    onClick={() => handleAddonCheckout("faster_sync")}
                    className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {actionLoading === "addon_faster_sync" && <Loader2 size={12} className="animate-spin" />}
                    <span>Enable 3-Hour Sync</span>
                  </button>
                )}
              </div>

              {/* Addon 3: Lifetime History (Monthly vs Annual) */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl w-fit">
                    <Database size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Lifetime Historical Data</h3>
                  <div className="text-xl font-extrabold text-slate-950">
                    ₹1,999 <span className="text-xs text-slate-400 font-normal">/ year / account</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    Retain and analyze all historical data successfully imported (Saves ₹389/yr vs monthly ₹199).
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    disabled={actionLoading === "addon_lifetime_history_annual"}
                    onClick={() => handleAddonCheckout("lifetime_history_annual")}
                    className="w-full py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {actionLoading === "addon_lifetime_history_annual" && <Loader2 size={12} className="animate-spin" />}
                    <span>Annual Plan — ₹1,999/yr</span>
                  </button>

                  <button
                    disabled={actionLoading === "addon_lifetime_history_monthly"}
                    onClick={() => handleAddonCheckout("lifetime_history_monthly")}
                    className="w-full py-2 rounded-xl font-bold text-[11px] text-slate-700 hover:bg-slate-100 transition"
                  >
                    Or Monthly Plan — ₹199/mo
                  </button>
                </div>
              </div>

              {/* Addon 4: AI Deep Analysis */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl w-fit">
                    <Sparkles size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">AI Deep Analysis</h3>
                  <div className="text-xl font-extrabold text-slate-950">
                    ₹499 <span className="text-xs text-slate-400 font-normal">/ month</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    Unlocks deep campaign pattern analysis, anomaly explanations, and creative fatigue diagnostics.
                  </p>
                </div>

                <button
                  disabled={actionLoading === "addon_ai_deep_analysis"}
                  onClick={() => handleAddonCheckout("ai_deep_analysis")}
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  {actionLoading === "addon_ai_deep_analysis" && <Loader2 size={12} className="animate-spin" />}
                  <span>Activate AI Deep Analysis</span>
                </button>
              </div>

              {/* Addon 5: Additional Team Member */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl w-fit">
                    <Users size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Additional Team Member</h3>
                  <div className="text-xl font-extrabold text-slate-950">
                    ₹199 <span className="text-xs text-slate-400 font-normal">/ month / member</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    Adds 1 additional team seat beyond your subscription plan's included limit.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Quantity:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAddonQuantities(q => ({ ...q, additional_team_member: Math.max(1, (q.additional_team_member || 1) - 1) }))}
                        className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-bold">{addonQuantities.additional_team_member || 1}</span>
                      <button
                        onClick={() => setAddonQuantities(q => ({ ...q, additional_team_member: (q.additional_team_member || 1) + 1 }))}
                        className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    disabled={actionLoading === "addon_additional_team_member"}
                    onClick={() => handleAddonCheckout("additional_team_member")}
                    className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {actionLoading === "addon_additional_team_member" && <Loader2 size={12} className="animate-spin" />}
                    <span>Add +{addonQuantities.additional_team_member || 1} Team Seat</span>
                  </button>
                </div>
              </div>
            </div>
          </div>


        </>
      )}
    </div>
  );
}
