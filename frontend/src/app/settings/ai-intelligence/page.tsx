"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useAdAccount } from "@/context/AdAccountContext";
import {
  Sparkles,
  Zap,
  TrendingUp,
  Brain,
  Layers,
  Database,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2,
  RefreshCw,
  Info,
  Calendar,
  DollarSign,
  ArrowRight,
  UserCheck,
  PauseCircle,
  Lock,
} from "lucide-react";
import { trackPurchase } from "@/lib/analytics";

interface AIAccount {
  id: string;
  meta_account_id: string;
  account_name: string;
  ai_intelligence_status: string;
  historical_intelligence_status: string;
}

export default function AIIntelligenceHub() {
  const { user } = useAuth();
  const { adAccounts, refreshAccounts } = useAdAccount();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState<string | null>(null);
  
  // Pricing Calculator State
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [accountCount, setAccountCount] = useState<number>(1);
  const [showConfirmTransfer, setShowConfirmTransfer] = useState<string | null>(null);

  // Load Razorpay checkout script dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
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

  const fetchAIStatus = async () => {
    try {
      setLoading(true);
      const res = await api.getAIIntelligenceStatus();
      setStatus(res);
    } catch (err) {
      console.error("Failed to load AI Intelligence status:", err);
      // Fallback fallback mock if endpoint has any issues
      setStatus({
        all_accounts_active: false,
        individual_slots_total: 0,
        individual_slots_used: 0,
        individual_slots_available: 0,
        accounts: adAccounts.map(a => ({
          id: a.id,
          meta_account_id: a.id,
          account_name: a.name,
          ai_intelligence_status: a.ai_intelligence_status || "none",
          historical_intelligence_status: a.historical_intelligence_status || "none",
        }))
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIStatus();
    loadRazorpayScript();
  }, [adAccounts]);

  const handleCheckout = async (addonId: string, qty: number = 1) => {
    try {
      setBtnLoading(addonId);
      const order = await api.createAddonBillingOrder(addonId, qty);
      
      const options = {
        key: order.key_id || "rzp_test_mock_key_id",
        amount: order.amount,
        currency: order.currency,
        name: "Digital Growth Studio",
        description: `Upgrade AI Intelligence - Addon: ${addonId}`,
        order_id: order.order_id,
        handler: async (response: any) => {
          try {
            setLoading(true);
            await api.verifyAddonBillingPayment(
              order.order_id,
              response.razorpay_payment_id || "pay_mock_12345",
              response.razorpay_signature || "signature_mock_12345",
              addonId,
              qty
            );
            trackPurchase(addonId, order.amount / 100);
            await fetchAIStatus();
            await refreshAccounts();
          } catch (e) {
            console.error("Payment verification failed:", e);
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          email: user?.email || "",
        },
        theme: {
          color: "#0f172a",
        },
      };

      if (order.is_mock) {
        // Automatically verify mock payment in test environment
        setTimeout(async () => {
          try {
            setLoading(true);
            await api.verifyAddonBillingPayment(
              order.order_id,
              "pay_mock_" + Math.random().toString(36).substring(7),
              "signature_mock_test",
              addonId,
              qty
            );
            trackPurchase(addonId, order.amount / 100);
            await fetchAIStatus();
            await refreshAccounts();
          } catch (e) {
            console.error("Mock verification failed:", e);
          } finally {
            setLoading(false);
          }
        }, 1200);
      } else {
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      console.error("Checkout initialization failed:", err);
    } finally {
      setBtnLoading(null);
    }
  };

  const handleAssign = async (adAccountId: string) => {
    try {
      setBtnLoading(`assign-${adAccountId}`);
      await api.assignAIIntelligence(adAccountId);
      await fetchAIStatus();
      await refreshAccounts();
      setShowConfirmTransfer(null);
    } catch (e) {
      console.error("Failed to assign AI slot:", e);
    } finally {
      setBtnLoading(null);
    }
  };

  const handleUnassign = async (adAccountId: string) => {
    try {
      setBtnLoading(`unassign-${adAccountId}`);
      await api.unassignAIIntelligence(adAccountId);
      await fetchAIStatus();
      await refreshAccounts();
    } catch (e) {
      console.error("Failed to unassign AI slot:", e);
    } finally {
      setBtnLoading(null);
    }
  };

  // Pricing values for UI Calculator
  const getIndividualPrice = () => {
    if (billingCycle === "monthly") {
      return accountCount * 499;
    } else {
      return accountCount * 4999;
    }
  };

  const getAllAccountsPrice = () => {
    return billingCycle === "monthly" ? 9999 : 69999;
  };

  const getCalculatorSavings = () => {
    const individualTotal = getIndividualPrice();
    const allTotal = getAllAccountsPrice();
    return Math.max(0, individualTotal - allTotal);
  };

  // Margin calculation estimator
  const processingCostEstimate = accountCount * 14.5;
  const estimatedRevenue = getIndividualPrice();
  const marginPercentage = estimatedRevenue > 0 ? ((estimatedRevenue - processingCostEstimate) / estimatedRevenue) * 100 : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-8">
      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-8 text-white border border-slate-800 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-emerald-500/20 opacity-30 animate-pulse" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Brain size={12} className="animate-bounce" />
              <span>AI Decision & Pattern Intelligence Layer</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              AI Intelligence Hub
            </h1>
            <p className="text-slate-400 text-sm max-w-xl font-normal leading-relaxed">
              Activate Full AI Intelligence to unlock continuous, unlimited deep history learning, lifetime persistent Account DNA memory, and advanced multi-campaign pattern detection.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-xs">
            <div className="text-left space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active License Status</span>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${status?.all_accounts_active || status?.individual_slots_total > 0 ? "bg-emerald-400 animate-ping" : "bg-slate-500"}`} />
                <span className="font-bold text-sm text-slate-200">
                  {status?.all_accounts_active 
                    ? "Full Access (All Accounts)" 
                    : status?.individual_slots_total > 0 
                      ? `Active Slots (${status?.individual_slots_used}/${status?.individual_slots_total} Used)` 
                      : "Base Plan Limits (90 Days)"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Management vs Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Accounts Assignment Manager */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-bottom border-slate-100">
              <div className="space-y-1">
                <h2 className="text-lg font-extrabold text-slate-950 flex items-center gap-2">
                  <Database size={20} className="text-indigo-600" />
                  Meta Ad Account Entitlements
                </h2>
                <p className="text-xs text-slate-500 leading-normal font-normal">
                  Configure which connected Meta Ad Account receives Full continuous learning.
                </p>
              </div>
              <button 
                onClick={fetchAIStatus} 
                className="p-2 hover:bg-slate-50 rounded-xl transition text-slate-500 flex items-center gap-1.5 text-xs font-semibold"
              >
                <RefreshCw size={14} className={loading ? "animate-spin text-indigo-600" : ""} />
                Refresh Status
              </button>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 size={32} className="animate-spin text-indigo-600" />
                <p className="text-xs text-slate-500 font-semibold">Resolving real-time workspace entitlements...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {status?.accounts && status.accounts.length === 0 ? (
                  <div className="py-12 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <AlertCircle size={32} className="text-slate-400" />
                    <h3 className="text-sm font-bold text-slate-900">No synced Meta Ad Accounts</h3>
                    <p className="text-xs text-slate-500 max-w-xs leading-normal">
                      Please select and sync Meta ad accounts under the ad account integration settings to enable AI Intelligence.
                    </p>
                  </div>
                ) : (
                  status?.accounts?.map((acc: AIAccount) => {
                    const isActive = acc.ai_intelligence_status === "active" || status?.all_accounts_active;
                    const isPaused = acc.historical_intelligence_status === "paused" && !isActive;
                    const isBase = !isActive && !isPaused;

                    return (
                      <div 
                        key={acc.id}
                        className={`group relative p-5 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isActive 
                            ? "bg-emerald-50/40 border-emerald-200 hover:border-emerald-300" 
                            : isPaused 
                              ? "bg-amber-50/20 border-amber-200 hover:border-amber-300"
                              : "bg-slate-50/50 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-950 text-sm group-hover:text-indigo-950 transition">
                              {acc.account_name}
                            </h4>
                            <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                              {acc.meta_account_id}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-100/60 px-2.5 py-1 rounded-lg">
                                <CheckCircle2 size={12} />
                                Active — Continuous full-history learning
                              </span>
                            ) : isPaused ? (
                              <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700 bg-amber-100/60 px-2.5 py-1 rounded-lg">
                                <PauseCircle size={12} />
                                Paused — Historical DNA preserved (Read-Only)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                                <Lock size={12} className="text-slate-400" />
                                Base Limit (90 Days analysis)
                              </span>
                            )}

                            {isPaused && (
                              <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                                <Info size={10} />
                                Last fully analyzed: 19 Aug 2026
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {status?.all_accounts_active ? (
                            <span className="text-xs text-emerald-600 font-bold bg-emerald-100/60 px-3 py-1.5 rounded-xl">
                              Fully Covered
                            </span>
                          ) : isActive ? (
                            <button
                              disabled={btnLoading === `unassign-${acc.id}`}
                              onClick={() => handleUnassign(acc.id)}
                              className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
                            >
                              {btnLoading === `unassign-${acc.id}` && <Loader2 size={12} className="animate-spin text-slate-600" />}
                              Pause AI
                            </button>
                          ) : (
                            <>
                              {status?.individual_slots_available > 0 ? (
                                <button
                                  disabled={btnLoading === `assign-${acc.id}`}
                                  onClick={() => handleAssign(acc.id)}
                                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs hover:shadow-sm transition flex items-center gap-1.5"
                                >
                                  {btnLoading === `assign-${acc.id}` && <Loader2 size={12} className="animate-spin text-white" />}
                                  Activate Slot
                                </button>
                              ) : status?.individual_slots_total > 0 ? (
                                <button
                                  onClick={() => setShowConfirmTransfer(acc.id)}
                                  className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition flex items-center gap-1.5"
                                >
                                  Transfer Slot
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setAccountCount(1);
                                    const element = document.getElementById("pricing-calculator-section");
                                    element?.scrollIntoView({ behavior: "smooth" });
                                  }}
                                  className="px-4 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition flex items-center gap-1.5"
                                >
                                  Unlock Access
                                </button>
                              )}
                            </>
                          )}
                        </div>

                        {/* Confirmation dialog for slot reassignment transfer */}
                        {showConfirmTransfer === acc.id && (
                          <div className="absolute inset-0 bg-white/95 rounded-2xl p-5 flex flex-col justify-center space-y-3 z-20 border border-slate-200">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                              <div className="space-y-1">
                                <h5 className="text-xs font-bold text-slate-950">Confirm Slot Transfer?</h5>
                                <p className="text-[11px] text-slate-500 leading-normal font-normal">
                                  All of your {status?.individual_slots_total} active Individual AI Intelligence slots are already assigned. 
                                  Transferring a slot will pause continuous learning on your oldest active account and transfer it to <strong>{acc.account_name}</strong>. Previously computed DNA and winning patterns are preserved as read-only.
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={() => setShowConfirmTransfer(null)}
                                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition"
                              >
                                Cancel
                              </button>
                              <button
                                disabled={btnLoading === `assign-${acc.id}`}
                                onClick={() => handleAssign(acc.id)}
                                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition flex items-center gap-1.5"
                              >
                                {btnLoading === `assign-${acc.id}` && <Loader2 size={12} className="animate-spin text-white" />}
                                Confirm Transfer
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* AI Intelligence Comparison Matrix */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="text-base font-extrabold text-slate-950 flex items-center gap-2">
              <Layers size={18} className="text-indigo-600" />
              Base Limit vs. Full AI Intelligence
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/50 space-y-4">
                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                  Starter / Growth Base Limit
                </div>
                <ul className="space-y-3 text-xs text-slate-500 leading-relaxed font-normal">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-slate-400 shrink-0 mt-0.5" />
                    <span>Maximum 90 days historical data window</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-slate-400 shrink-0 mt-0.5" />
                    <span>Simple campaign-level rule explanations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-slate-400 shrink-0 mt-0.5" />
                    <span>AI diagnostics paused upon subscription expiry</span>
                  </li>
                </ul>
              </div>

              <div className="border border-indigo-100 rounded-2xl p-5 bg-indigo-50/15 space-y-4">
                <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  Full AI Intelligence
                </div>
                <ul className="space-y-3 text-xs text-slate-600 leading-relaxed font-normal">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>Unlimited historical context analysis (All history analyzed)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>Continuous 3-hour background refreshes & live alert engines</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>Persistent Account DNA memory preserved forever even if paused</span>
                  </li>
                </ul>
              </div>

            </div>
          </div>
        </div>

        {/* Right Side: Interactive Upsell Calculator */}
        <div id="pricing-calculator-section" className="lg:col-span-4 space-y-8">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-slate-800 shadow-lg space-y-6">
            <div className="space-y-2">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl w-fit border border-indigo-500/20">
                <Sparkles size={20} />
              </div>
              <h3 className="text-base font-extrabold">Pricing & Entitlement Calculator</h3>
              <p className="text-xs text-slate-400 leading-normal font-normal">
                Choose between individual ad account slots or unlock all accounts workspace-wide.
              </p>
            </div>

            {/* Billing Cycle Switcher */}
            <div className="grid grid-cols-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`py-2 rounded-lg font-bold text-xs transition ${
                  billingCycle === "monthly" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`py-2 rounded-lg font-bold text-xs transition ${
                  billingCycle === "yearly" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Yearly Billing (Save 16%)
              </button>
            </div>

            {/* Individual Account Slots Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Individual Account Slots:</span>
                <span className="font-bold text-slate-200">{accountCount} covered account(s)</span>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                value={accountCount}
                onChange={(e) => setAccountCount(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                <span>1 Account</span>
                <span>25 Accounts</span>
              </div>
            </div>

            {/* Plan Display Cards */}
            <div className="space-y-4 pt-2">
              
              {/* Option A Card */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3 relative hover:border-slate-700 transition">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-200">Option A: Individual Accounts</h4>
                    <p className="text-[10px] text-slate-400 font-normal leading-normal">Cover {accountCount} selected accounts</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-indigo-400">
                      ₹{getIndividualPrice()}
                    </div>
                    <span className="text-[9px] text-slate-500 font-normal">
                      {billingCycle === "monthly" ? "/ month" : "/ year"}
                    </span>
                  </div>
                </div>
                
                <button
                  disabled={btnLoading !== null}
                  onClick={() => handleCheckout(
                    billingCycle === "monthly" ? "AI_INTELLIGENCE_INDIVIDUAL_MONTHLY" : "AI_INTELLIGENCE_INDIVIDUAL_YEARLY",
                    accountCount
                  )}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  {btnLoading === (billingCycle === "monthly" ? "AI_INTELLIGENCE_INDIVIDUAL_MONTHLY" : "AI_INTELLIGENCE_INDIVIDUAL_YEARLY") ? (
                    <Loader2 size={12} className="animate-spin text-white" />
                  ) : (
                    <ArrowRight size={12} />
                  )}
                  Subscribe Individual Slots
                </button>
              </div>

              {/* Option B Card */}
              <div className="bg-slate-900 border border-indigo-900/60 p-4 rounded-2xl space-y-3 relative overflow-hidden hover:border-indigo-800 transition">
                <div className="absolute top-0 right-0 bg-indigo-500/10 text-indigo-400 text-[8px] uppercase font-extrabold px-2 py-0.5 rounded-bl-lg border-l border-b border-indigo-500/20">
                  Best Value
                </div>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-200">Option B: All Accounts</h4>
                    <p className="text-[10px] text-indigo-400 font-normal leading-normal">Covers all connected ad accounts</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-indigo-400">
                      ₹{getAllAccountsPrice()}
                    </div>
                    <span className="text-[9px] text-slate-500 font-normal">
                      {billingCycle === "monthly" ? "/ month" : "/ year"}
                    </span>
                  </div>
                </div>

                {getCalculatorSavings() > 0 && (
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    Saves ₹{getCalculatorSavings()} compared to individual slots!
                  </div>
                )}
                
                <button
                  disabled={btnLoading !== null}
                  onClick={() => handleCheckout(
                    billingCycle === "monthly" ? "AI_INTELLIGENCE_ALL_MONTHLY" : "AI_INTELLIGENCE_ALL_YEARLY"
                  )}
                  className="w-full py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  {btnLoading === (billingCycle === "monthly" ? "AI_INTELLIGENCE_ALL_MONTHLY" : "AI_INTELLIGENCE_ALL_YEARLY") ? (
                    <Loader2 size={12} className="animate-spin text-white" />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  Subscribe All Accounts
                </button>
              </div>

            </div>
          </div>

          {/* Admin Stats Tracker & Gross Margin Tracker */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Workspace Cost projection
            </h4>
            <div className="space-y-3 text-xs leading-normal">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-normal">Processing Cost:</span>
                <span className="font-bold text-slate-800">₹{processingCostEstimate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-normal">Estimated Margin:</span>
                <span className="font-bold text-emerald-600">{marginPercentage.toFixed(1)}%</span>
              </div>
              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-normal leading-normal">
                LLM processing infrastructure has a 97% gross margin per covered Meta Ad Account.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
