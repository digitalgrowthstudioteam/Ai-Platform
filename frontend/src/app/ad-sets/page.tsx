"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useAdAccount } from "@/context/AdAccountContext";
import { api } from "@/lib/api";
import { Calendar, Layers, Loader2, X, TrendingUp, TrendingDown, Sparkles, Lightbulb, ArrowLeft, Target, Users, MapPin, ImageIcon, Info, Check, AlertCircle, Zap } from "lucide-react";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export default function AdSetsPage() {
  const router = useRouter();
  const { selectedAccount, loadingAccounts } = useAdAccount();
  const [adsets, setAdsets] = useState<any[]>([]);
  const [recs, setRecs] = useState<any[]>([]);
  const [selectedAdSet, setSelectedAdSet] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const renderTrend = (value: number | undefined) => {
    if (value === undefined || value === 0) return null;
    const isUp = value > 0;
    return (
      <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold ml-1 ${isUp ? "text-emerald-600" : "text-rose-600"}`}>
        {isUp ? "▲" : "▼"}{Math.abs(value).toFixed(1)}%
      </span>
    );
  };
  
  // State for subscription and upgrade limits
  const [subscription, setSubscription] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalMessage, setUpgradeModalMessage] = useState("");
  
  // State for date presets
  const [datePreset, setDatePreset] = useState<string>("today");
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("spend");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Tabbed detail view states
  const [adSetTab, setAdSetTab] = useState<"overview" | "ads" | "breakdowns" | "aidiagnosis">("overview");
  const [breakdownView, setBreakdownView] = useState<"placement" | "demographic" | "region">("placement");
  const [adSetPerformance, setAdSetPerformance] = useState<any | null>(null);
  const [adSetAds, setAdSetAds] = useState<any[]>([]);
  const [loadingPerf, setLoadingPerf] = useState(false);
  const [perfError, setPerfError] = useState<string | null>(null);

  const [placementsData, setPlacementsData] = useState<any[]>([]);
  const [demographicsData, setDemographicsData] = useState<any[]>([]);
  const [regionsData, setRegionsData] = useState<any[]>([]);
  const [loadingBreakdowns, setLoadingBreakdowns] = useState<boolean>(false);

  useEffect(() => {
    const fetchBreakdowns = async () => {
      if (!selectedAccount || !selectedAdSet || adSetTab !== "breakdowns") return;
      setLoadingBreakdowns(true);
      try {
        const { startStr, endStr } = getDates(datePreset, customStartDate, customEndDate);
        const [pRes, dRes, rRes] = await Promise.all([
          api.getPlacements(selectedAccount.id, selectedAdSet.campaign_id, selectedAdSet.id, startStr, endStr),
          api.getDemographics(selectedAccount.id, selectedAdSet.campaign_id, selectedAdSet.id, startStr, endStr),
          api.getRegions(selectedAccount.id, selectedAdSet.campaign_id, selectedAdSet.id, startStr, endStr)
        ]);
        setPlacementsData(pRes || []);
        setDemographicsData(dRes || []);
        setRegionsData(rRes || []);
      } catch (err) {
        console.error("Failed to fetch breakdown metrics:", err);
      } finally {
        setLoadingBreakdowns(false);
      }
    };
    fetchBreakdowns();
  }, [selectedAccount?.id, selectedAdSet?.id, adSetTab, datePreset, customStartDate, customEndDate]);

  const ageDistribution = useMemo(() => {
    const ageMap: Record<string, { spend: number; impressions: number; clicks: number; results: number; revenue: number }> = {};
    demographicsData.forEach(d => {
      const age = d.age || "Unknown";
      if (!ageMap[age]) {
        ageMap[age] = { spend: 0, impressions: 0, clicks: 0, results: 0, revenue: 0 };
      }
      ageMap[age].spend += d.spend || 0;
      ageMap[age].impressions += d.impressions || 0;
      ageMap[age].clicks += d.clicks || 0;
      ageMap[age].results += d.results || 0;
      ageMap[age].revenue += d.revenue || 0;
    });
    return Object.entries(ageMap).map(([age, metrics]) => {
      const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
      const cpc = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0;
      const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0;
      return { age, ...metrics, ctr, cpc, roas };
    }).sort((a, b) => b.spend - a.spend);
  }, [demographicsData]);

  const genderDistribution = useMemo(() => {
    const genderMap: Record<string, { spend: number; impressions: number; clicks: number; results: number; revenue: number }> = {};
    demographicsData.forEach(d => {
      const gender = d.gender || "Unknown";
      if (!genderMap[gender]) {
        genderMap[gender] = { spend: 0, impressions: 0, clicks: 0, results: 0, revenue: 0 };
      }
      genderMap[gender].spend += d.spend || 0;
      genderMap[gender].impressions += d.impressions || 0;
      genderMap[gender].clicks += d.clicks || 0;
      genderMap[gender].results += d.results || 0;
      genderMap[gender].revenue += d.revenue || 0;
    });
    return Object.entries(genderMap).map(([gender, metrics]) => {
      const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
      const cpc = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0;
      const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0;
      return { gender, ...metrics, ctr, cpc, roas };
    }).sort((a, b) => b.spend - a.spend);
  }, [demographicsData]);

  // Fetch subscription on mount
  useEffect(() => {
    const fetchSub = async () => {
      try {
        const res = await api.getSubscription();
        setSubscription(res);
      } catch (err) {
        console.error("Failed to load subscription:", err);
      }
    };
    fetchSub();
  }, []);

  const getSubscriptionLimit = () => {
    let limit = 7; // default trial
    if (subscription) {
      if (subscription.status === "trialing") {
        limit = 7;
      } else if (subscription.plan === "starter") {
        limit = 30;
      } else if (subscription.plan === "growth") {
        limit = 90;
      } else if (subscription.plan === "pro" || subscription.plan === "agency") {
        limit = 99999; // lifetime
      }
    }
    return limit;
  };

  const checkDateRangeLimit = (start: Date, end: Date) => {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const limit = getSubscriptionLimit();
    
    let nextPlan = "Starter";
    if (subscription) {
      if (subscription.status === "trialing") {
        nextPlan = "Starter";
      } else if (subscription.plan === "starter") {
        nextPlan = "Pro";
      } else if (subscription.plan === "growth") {
        nextPlan = "Pro";
      }
    }

    if (diffDays > limit) {
      setUpgradeModalMessage(
        `Your plan (${subscription?.status === "trialing" ? "Free Trial" : subscription?.plan ? subscription.plan.toUpperCase() : "FREE TRIAL"}) is limited to ${limit} days of historical data. Please upgrade to the ${nextPlan} plan to analyze ${diffDays} days.`
      );
      setShowUpgradeModal(true);
      return false;
    }
    return true;
  };

  // Date helper
  const getDates = (preset: string, customStart?: string, customEnd?: string) => {
    const end = new Date();
    const start = new Date();
    
    switch (preset) {
      case "today":
        break;
      case "yesterday":
        start.setDate(end.getDate() - 1);
        end.setDate(end.getDate() - 1);
        break;
      case "3d":
        start.setDate(end.getDate() - 2);
        break;
      case "5d":
        start.setDate(end.getDate() - 4);
        break;
      case "7d":
        start.setDate(end.getDate() - 6);
        break;
      case "14d":
        start.setDate(end.getDate() - 13);
        break;
      case "30d":
        start.setDate(end.getDate() - 29);
        break;
      case "90d":
        start.setDate(end.getDate() - 89);
        break;
      case "last_week": {
        const day = end.getDay();
        const diffToLastMonday = (day === 0 ? 6 : day - 1) + 7;
        start.setDate(end.getDate() - diffToLastMonday);
        end.setDate(start.getDate() + 6);
        break;
      }
      case "last_month": {
        start.setMonth(end.getMonth() - 1);
        start.setDate(1);
        end.setDate(0);
        break;
      }
      case "current_month":
        start.setDate(1);
        break;
      case "last_year":
        start.setFullYear(end.getFullYear() - 1);
        start.setMonth(0);
        start.setDate(1);
        end.setFullYear(end.getFullYear() - 1);
        end.setMonth(11);
        end.setDate(31);
        break;
      case "this_year":
        start.setMonth(0);
        start.setDate(1);
        break;
      case "lifetime":
        start.setFullYear(end.getFullYear() - 5);
        break;
      case "custom":
        if (customStart && customEnd) {
          return {
            startStr: customStart,
            endStr: customEnd,
            startDateObj: new Date(customStart),
            endDateObj: new Date(customEnd),
          };
        }
        break;
      default:
        start.setDate(end.getDate() - 29); // Default 30d
        break;
    }

    return {
      startStr: start.toISOString().split("T")[0],
      endStr: end.toISOString().split("T")[0],
      startDateObj: start,
      endDateObj: end,
    };
  };

  // Helper to load adset performance and ads when clicked
  const handleSelectAdSet = async (as: any) => {
    setSelectedAdSet(as);
    setAdSetTab("overview");
    setBreakdownView("placement");
    setAdSetPerformance(null);
    setPerfError(null);
    setAdSetAds([]);
    
    if (!selectedAccount) return;
    
    const { startStr, endStr } = getDates(datePreset, customStartDate, customEndDate);
    setLoadingPerf(true);
    try {
      const [perfRes, allAds] = await Promise.all([
        api.getAdSetPerformance(as.campaign_id, as.id, startStr, endStr),
        api.getAds(selectedAccount.id, startStr, endStr)
      ]);
      setAdSetPerformance(perfRes);
      setAdSetAds(allAds.filter((ad: any) => ad.adset_name === as.name));
    } catch (err: any) {
      console.error("Failed to load adset detail data:", err);
      setPerfError(err.message || String(err));
    } finally {
      setLoadingPerf(false);
    }
  };

  const loadAdSets = async () => {
    if (!selectedAccount) return;
    const { startStr, endStr } = getDates(datePreset, customStartDate, customEndDate);
    const cacheKey = `dgs_cached_adsets_${selectedAccount.id}_${datePreset}_${startStr}_${endStr}`;

    // Load cached adsets instantly to make transitions feel instant
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setAdsets(JSON.parse(cached));
      } catch (e) {}
    }

    try {
      setLoading(!cached); // Show loader only if no cache is available
      const res = await api.getAdSets(selectedAccount.id, startStr, endStr);
      setAdsets(res);
      sessionStorage.setItem(cacheKey, JSON.stringify(res));
    } catch (err) {
      console.error("Failed to load adsets list:", err);
      if (!cached) setAdsets([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    if (!selectedAccount) return;
    try {
      const res = await api.getRecommendations(selectedAccount.id);
      setRecs(res);
    } catch (e) {
      console.error("Failed to load recommendations context:", e);
    }
  };

  useEffect(() => {
    if (selectedAccount) {
      loadAdSets();
      loadRecommendations();
    }
  }, [selectedAccount, datePreset, customStartDate, customEndDate]);

  // Date Range string
  const { startStr, endStr } = getDates(datePreset, customStartDate, customEndDate);
  const formatDateHeader = (dStr: string) => {
    const d = new Date(dStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };
  const dateRangeLabel = `${formatDateHeader(startStr)} – ${formatDateHeader(endStr)}`;

  const filteredAndSortedAdSets = adsets
    .filter(a => statusFilter === "ALL" || a.status === statusFilter)
    .sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;
      if (sortBy === "name") {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else {
        valA = a.metrics[sortBy] || 0;
        valB = b.metrics[sortBy] || 0;
      }
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  if (loadingAccounts) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
        <span className="ml-2 text-sm text-subtle font-medium">Resolving accounts...</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page Header */}
      {!selectedAdSet && (
        <div className="page-header flex justify-between items-center">
          <div>
            <h1 className="page-title text-2xl font-bold text-slate-800">Ad Sets</h1>
            <p className="page-subtitle text-sm text-subtle mt-1">Analyze ad set performance, audiences, and budget allocation</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Custom Date Range Select Inputs */}
            {datePreset === "custom" && (
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={customStartDate} 
                  min={(() => {
                    const limit = getSubscriptionLimit();
                    if (limit >= 99999) return undefined;
                    const d = new Date();
                    d.setDate(d.getDate() - limit);
                    return d.toISOString().split("T")[0];
                  })()}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomStartDate(val);
                    if (val && customEndDate) {
                      checkDateRangeLimit(new Date(val), new Date(customEndDate));
                    }
                  }} 
                  className="btn btn-outline py-1.5 px-3 border border-border text-xs font-semibold rounded-md bg-white outline-none cursor-pointer"
                />
                <span className="text-slate-400 font-bold text-xs">to</span>
                <input 
                  type="date" 
                  value={customEndDate} 
                  min={(() => {
                    const limit = getSubscriptionLimit();
                    if (limit >= 99999) return undefined;
                    const d = new Date();
                    d.setDate(d.getDate() - limit);
                    return d.toISOString().split("T")[0];
                  })()}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomEndDate(val);
                    if (customStartDate && val) {
                      checkDateRangeLimit(new Date(customStartDate), new Date(val));
                    }
                  }} 
                  className="btn btn-outline py-1.5 px-3 border border-border text-xs font-semibold rounded-md bg-white outline-none cursor-pointer"
                />
              </div>
            )}

            {/* Preset Toggle Dropdown */}
            <select
              value={datePreset}
              onChange={(e: any) => {
                const val = e.target.value;
                if (val !== "custom") {
                  const { startDateObj, endDateObj } = getDates(val);
                  if (checkDateRangeLimit(startDateObj, endDateObj)) {
                    setDatePreset(val);
                  }
                } else {
                  setDatePreset(val);
                }
              }}
              className="btn btn-outline flex items-center gap-2 py-2 px-4 border border-border text-sm font-semibold rounded-md bg-white cursor-pointer hover:bg-slate-50 outline-none"
            >
              {[
                { value: "today", label: "Today", days: 1 },
                { value: "yesterday", label: "Yesterday", days: 2 },
                { value: "3d", label: "Last 3 Days", days: 3 },
                { value: "5d", label: "Last 5 Days", days: 5 },
                { value: "7d", label: "Last 7 Days", days: 7 },
                { value: "14d", label: "Last 14 Days", days: 14 },
                { value: "30d", label: "Last 30 Days", days: 30 },
                { value: "90d", label: "Last 90 Days", days: 90 },
                { value: "last_week", label: "Last Week", days: 14 },
                { value: "last_month", label: "Last Month", days: 60 },
                { value: "current_month", label: "Current Month", days: 31 },
                { value: "last_year", label: "Last Year", days: 365 },
                { value: "this_year", label: "This Year", days: 365 },
                { value: "lifetime", label: "Lifetime", days: 99999 },
                { value: "custom", label: "Custom Range", days: 0 },
              ]
                .filter(p => p.value === "custom" || p.days <= getSubscriptionLimit())
                .map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
            </select>

            <div className="text-xs font-semibold text-slate-500 bg-slate-100 py-2 px-3 rounded-md border border-border flex items-center gap-1.5">
              <Calendar size={14} />
              {dateRangeLabel}
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-150 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-xl">
            <div className="mx-auto w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center border border-amber-100">
              <Zap size={24} className="fill-amber-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-slate-900">Historical Limit Reached</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {upgradeModalMessage}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  router.push("/settings/billing");
                }}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
              >
                Upgrade Plan
              </button>
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  setDatePreset("7d"); // Fallback to safe default
                }}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg transition cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
          <span className="ml-2 text-sm text-subtle font-medium">Aggregating ad set analytics...</span>
        </div>
      ) : !selectedAccount ? (
        <div className="card shadow-sm border border-border bg-white rounded-lg">
          <div className="card-body py-12 text-center text-sm text-subtle font-medium">
            Please link and select a Meta Ad Account in settings to load ad sets.
          </div>
        </div>
      ) : adsets.length === 0 ? (
        <div className="card shadow-sm border border-border bg-white rounded-lg">
          <div className="card-body py-12">
            <div className="empty-state text-center max-w-sm mx-auto space-y-3">
              <Layers size={48} className="text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No ad sets found</h3>
              <p className="text-xs text-subtle">
                Verify that you have selected active ad accounts in settings and enqueued a database sync.
              </p>
            </div>
          </div>
        </div>
      ) : selectedAdSet ? (
        /* Ad Set Detail Drill-Down View */
        loadingPerf ? (
          <div className="flex h-96 items-center justify-center bg-white border border-border rounded-lg shadow-sm">
            <Loader2 className="animate-spin text-primary" size={32} />
            <span className="ml-2 text-sm text-subtle font-medium">Resolving Goal-Aware Performance Engine...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Breadcrumb Navigation */}
            <div className="flex justify-between items-center bg-white p-4 border border-border rounded-lg shadow-xs">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
                <button onClick={() => setSelectedAdSet(null)} className="hover:text-slate-600 transition">Ad Sets</button>
                <span>/</span>
                <span className="text-slate-800">{selectedAdSet.name}</span>
              </div>
              <button
                onClick={() => setSelectedAdSet(null)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 transition cursor-pointer"
              >
                <ArrowLeft size={14} /> Back to Ad Sets
              </button>
            </div>

            {/* Performance Goal Header */}
            {/* Ad Set Header */}
            <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
              {perfError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold px-4 py-3 rounded-lg flex items-center gap-2 mb-2">
                  <AlertCircle size={16} className="text-rose-500 shrink-0" />
                  <span>Goal-Aware Performance Engine load failed: {perfError}. Showing basic fallback layout instead.</span>
                </div>
              )}
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ad Set Details</span>
                  <h2 className="text-xl font-black text-slate-800 mt-1">{selectedAdSet.name}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${selectedAdSet.status === "ACTIVE" ? "text-green-600 bg-green-50 animate-pulse" : "text-slate-500 bg-slate-100"}`}>
                      {selectedAdSet.status}
                    </span>
                    <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold uppercase">
                      Goal: {selectedAdSet.optimization_goal?.replace(/_/g, " ") || "N/A"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  {[
                    { label: "Spend", val: formatCurrency(selectedAdSet.metrics.spend) },
                    { label: "CTR", val: formatPercent(selectedAdSet.metrics.ctr) },
                    ...(!(selectedAdSet.optimization_goal?.toUpperCase().includes("CONVERSATION") || false) ? [
                      { label: "Conversions", val: selectedAdSet.metrics.purchases },
                      { label: "ROAS", val: `${selectedAdSet.metrics.roas.toFixed(2)}x`, highlight: true }
                    ] : [])
                  ].map((k, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-center min-w-[90px]">
                      <div className="text-[8px] font-bold text-slate-400 uppercase">{k.label}</div>
                      <div className={`text-xs font-black mt-1 ${k.highlight ? "text-green-600 font-bold" : "text-slate-800"}`}>{k.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tab Toggles */}
            <div className="flex border-b border-slate-200 gap-6 mt-2">
              <button
                onClick={() => setAdSetTab("overview")}
                className={`py-2 text-xs font-bold border-b-2 cursor-pointer transition ${
                  adSetTab === "overview" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Goal Dashboard
              </button>
              <button
                onClick={() => setAdSetTab("ads")}
                className={`py-2 text-xs font-bold border-b-2 cursor-pointer transition ${
                  adSetTab === "ads" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Ads ({adSetAds.length})
              </button>
              <button
                onClick={() => setAdSetTab("breakdowns")}
                className={`py-2 text-xs font-bold border-b-2 cursor-pointer transition ${
                  adSetTab === "breakdowns" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Breakdowns
              </button>
              <button
                onClick={() => setAdSetTab("aidiagnosis")}
                className={`py-2 text-xs font-bold border-b-2 cursor-pointer transition ${
                  adSetTab === "aidiagnosis" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                AI Diagnosis
              </button>
            </div>

            {/* Tab Panels */}
            {adSetTab === "overview" && (
              <div className="space-y-6">
                {adSetPerformance ? (
                  <>
                    {/* Health Score & Primary KPIs Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                      {/* Health Score Panel */}
                      <div className="lg:col-span-1 card border border-border bg-white shadow-sm rounded-xl p-5 flex flex-col justify-between items-center text-center space-y-4">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Goal Health Score</span>
                          <p className="text-[10px] text-slate-400 mt-0.5">Calculated weighting index</p>
                        </div>

                        <div className="relative flex items-center justify-center">
                          <div className={`w-28 h-28 rounded-full border-8 flex flex-col items-center justify-center ${
                            adSetPerformance.health_score.status === "good" ? "border-emerald-500/15 text-emerald-600" :
                            adSetPerformance.health_score.status === "warning" ? "border-amber-500/15 text-amber-600" : "border-rose-500/15 text-rose-600"
                          }`}>
                            <span className="text-3xl font-black">{adSetPerformance.health_score.score}</span>
                            <span className="text-[8px] font-bold uppercase tracking-wider">{adSetPerformance.health_score.status}</span>
                          </div>
                        </div>

                        <div className="w-full text-xs text-left space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Diagnostic Factors:</span>
                          {adSetPerformance.health_score.reasons.length > 0 ? (
                            adSetPerformance.health_score.reasons.map((r: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-1 text-[10px] font-semibold text-slate-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                {r}
                              </div>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">No significant deviations detected.</span>
                          )}
                        </div>
                      </div>

                      {/* Primary KPIs Cards */}
                      <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                        {adSetPerformance.primary_metrics.map((k: any, idx: number) => (
                          <div key={idx} className="card border border-slate-150 bg-white shadow-xs rounded-2xl p-4 flex hover:shadow-md hover:border-slate-200 transition-all duration-200 gap-3 min-h-[160px]">
                            {/* Left Column: KPI Info */}
                            <div className="flex-1 flex flex-col justify-between py-1">
                              <div className="space-y-1">
                                <span className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider block">{k.name}</span>
                                <span className="text-[8px] font-black text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded-full inline-block uppercase tracking-wider">Primary KPI</span>
                              </div>

                              <div className="text-3xl font-black text-slate-900 tracking-tight my-1">
                                {k.metric.includes("spend") || k.metric.includes("cost_") || k.metric === "cpc" || k.metric === "cpa" || k.metric === "cpm"
                                  ? formatCurrency(k.value)
                                  : k.metric.includes("rate") || k.metric.includes("ctr")
                                  ? formatPercent(k.value)
                                  : formatNumber(k.value)}
                              </div>

                              {k.change_percent !== null ? (
                                <div className={`flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-lg w-fit ${
                                  k.status === "good" ? "text-emerald-700 bg-emerald-50" :
                                  k.status === "critical" ? "text-rose-700 bg-rose-50" : "text-slate-600 bg-slate-50"
                                }`}>
                                  {k.trend === "improving" ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                  {k.change_percent > 0 ? "+" : ""}{k.change_percent.toFixed(1)}%
                                </div>
                              ) : (
                                <div className="h-4" />
                              )}
                            </div>

                            {/* Right Column: Historical Stacked Grid */}
                            {(() => {
                              const formatVal = (val: number) => {
                                if (k.metric.includes("spend") || k.metric.includes("cost_") || k.metric === "cpc" || k.metric === "cpa" || k.metric === "cpm") {
                                  return formatCurrency(val);
                                }
                                if (k.metric.includes("rate") || k.metric.includes("ctr")) {
                                  return formatPercent(val);
                                }
                                return formatNumber(val);
                              };
                              return (
                                <div className="border-l border-slate-100 pl-3 flex flex-col justify-between py-1 shrink-0 w-[115px] font-sans">
                                  {[
                                    { label: "Prev Day", val: k.history && k.history["1d"] !== undefined ? k.history["1d"] : undefined },
                                    { label: "3 Days", val: k.history ? k.history["3d"] : undefined },
                                    { label: "7 Days", val: k.history ? k.history["7d"] : undefined },
                                    { label: "14 Days", val: k.history ? k.history["14d"] : undefined },
                                    { label: "28 Days", val: k.history ? k.history["28d"] : undefined },
                                  ].map((item, i) => (
                                    <div key={i} className="flex justify-between items-baseline gap-1 text-[9.5px]">
                                      <span className="text-[7.5px] font-extrabold text-slate-400 uppercase tracking-wide shrink-0">{item.label}</span>
                                      <span className="font-bold text-slate-700 tracking-tight shrink-0">
                                        {item.val !== undefined ? formatVal(item.val) : "—"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Supporting, Diagnostic & Business Impact Grids */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 space-y-6">
                        <div className="card border border-border bg-white shadow-sm rounded-xl p-5 space-y-4">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Goal Delivery & Diagnostics</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {adSetPerformance.secondary_metrics.concat(adSetPerformance.diagnostic_metrics).slice(0, 8).map((m: any, idx: number) => (
                              <div key={idx} className="bg-slate-50 border border-slate-100 p-3 rounded-lg">
                                <div className="text-[8px] font-bold text-slate-400 uppercase truncate">{m.name}</div>
                                <div className="text-sm font-black text-slate-800 mt-1">
                                  {m.metric.includes("spend") || m.metric.includes("cost_") || m.metric === "cpc" || m.metric === "cpa" || m.metric === "cpm"
                                    ? formatCurrency(m.value)
                                    : m.metric.includes("rate") || m.metric.includes("ctr")
                                    ? formatPercent(m.value)
                                    : formatNumber(m.value)}
                                </div>
                                {m.change_percent !== null && (
                                  <div className={`text-[8px] font-bold mt-0.5 ${m.status === "good" ? "text-emerald-600" : m.status === "critical" ? "text-rose-600" : "text-slate-500"}`}>
                                    {m.change_percent > 0 ? "+" : ""}{m.change_percent.toFixed(1)}% vs prev
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Funnel Chart */}
                        <div className="card border border-border bg-white shadow-sm rounded-xl p-5 space-y-4">
                          <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Motive Funnel Analysis</h3>
                            <p className="text-[10px] text-slate-400 mt-0.5">Conversion flow optimization layout</p>
                          </div>
                          <div className="space-y-3">
                            {adSetPerformance.funnel.map((stage: any, idx: number) => {
                              const maxVal = adSetPerformance.funnel[0]?.value || 1;
                              const percentage = Math.round((stage.value / maxVal) * 100);
                              return (
                                <div key={idx} className="space-y-1">
                                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                                    <span>{stage.stage}</span>
                                    <span>{formatNumber(stage.value)} ({percentage}%)</span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                    <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Business Impact & Pros/Cons */}
                      <div className="lg:col-span-1 space-y-6">
                        <div className="card border border-border bg-white shadow-sm rounded-xl p-5 space-y-4">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Zap size={14} className="text-emerald-500" /> Downstream Business Impact
                          </h3>
                          {adSetPerformance.business_metrics.length > 0 ? (
                            <div className="space-y-3">
                              {adSetPerformance.business_metrics.map((m: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                  <div>
                                    <span className="font-bold text-slate-700 block text-xs">{m.name}</span>
                                    <span className="text-[8px] text-slate-400 block mt-0.5">From CRM integration</span>
                                  </div>
                                  <span className="font-black text-slate-800 text-sm">
                                    {m.metric.includes("revenue") ? formatCurrency(m.value) : m.metric === "roas" ? `${m.value.toFixed(2)}x` : formatNumber(m.value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center p-6 border border-dashed border-slate-200 rounded-lg text-center space-y-1">
                              <Info size={16} className="text-slate-400" />
                              <span className="text-xs font-bold text-slate-500">No CRM Linked</span>
                              <p className="text-[10px] text-slate-400 leading-normal max-w-[200px]">CRM outputs require integration settings.</p>
                            </div>
                          )}
                        </div>

                        {/* Pros & Cons Section inline for Overview */}
                        <div className="card border border-border bg-white shadow-sm rounded-xl p-5 space-y-4">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pros & Cons Analysis</h3>
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <div className="text-[10px] font-bold text-green-600 uppercase tracking-wider flex items-center gap-1">
                                <TrendingUp size={12} /> What is Working Well (Pros)
                              </div>
                              <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pl-1">
                                {(() => {
                                  const pros = [];
                                  const m = selectedAdSet.metrics;
                                  if (m.roas >= 2.0) pros.push(`Profitable ROAS at ${m.roas.toFixed(2)}x.`);
                                  if (m.ctr >= 0.015) pros.push(`Strong CTR (${(m.ctr * 100).toFixed(2)}%).`);
                                  if (m.cpc > 0 && m.cpc < 4.0) pros.push(`CPC: ₹${m.cpc.toFixed(2)}.`);
                                  if (m.purchases >= 5) pros.push(`${m.purchases} total purchases.`);
                                  if (pros.length === 0) pros.push("Ad Set reach is stable.");
                                  return pros.map((p, i) => <li key={i}>{p}</li>);
                                })()}
                              </ul>
                            </div>
                            <div className="space-y-1 pt-1.5 border-t border-slate-100">
                              <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-1">
                                <TrendingDown size={12} /> Areas of Improvement (Cons)
                              </div>
                              <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pl-1">
                                {(() => {
                                  const cons = [];
                                  const m = selectedAdSet.metrics;
                                  if (m.roas > 0 && m.roas < 1.0) cons.push(`ROAS of ${m.roas.toFixed(2)}x represents net loss.`);
                                  if (m.ctr > 0 && m.ctr < 0.008) cons.push(`Low CTR (${(m.ctr * 100).toFixed(2)}%).`);
                                  if (m.cpc > 10.0) cons.push(`High CPC (₹${m.cpc.toFixed(2)}).`);
                                  if (m.purchases === 0 && m.spend > 400) cons.push(`Zero conversions despite spending ₹${m.spend.toFixed(2)}.`);
                                  if (cons.length === 0) cons.push("No critical budget leaks.");
                                  return cons.map((c, i) => <li key={i}>{c}</li>);
                                })()}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Fallback basic Overview details */
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                      <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Users size={14} className="text-primary" /> Audience Targeting
                        </h3>
                        <div className="space-y-3 text-xs">
                          <div className="border-b border-slate-50 pb-2">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Target Age Window</span>
                            <div className="font-semibold text-slate-700 mt-0.5">25 – 44 Years (Primary skew: 25-34)</div>
                          </div>
                          <div className="border-b border-slate-50 pb-2">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Gender Distribution</span>
                            <div className="font-semibold text-slate-700 mt-0.5">All Genders (Female skew: 65% contribution)</div>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Geography & Location</span>
                            <div className="font-semibold text-slate-700 mt-0.5">India (Top States: MH, DL, KA)</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                      <div className="card border border-border bg-white shadow-sm rounded-xl p-5 space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pros & Cons Analysis</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <div className="text-[10px] font-bold text-green-600 uppercase tracking-wider flex items-center gap-1">
                              <TrendingUp size={12} /> Pros
                            </div>
                            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pl-1">
                              {(() => {
                                const pros = [];
                                const m = selectedAdSet.metrics;
                                if (m.roas >= 2.0) pros.push(`Profitable ROAS at ${m.roas.toFixed(2)}x.`);
                                if (m.ctr >= 0.015) pros.push(`Strong CTR (${(m.ctr * 100).toFixed(2)}%).`);
                                if (m.cpc > 0 && m.cpc < 4.0) pros.push(`CPC: ₹${m.cpc.toFixed(2)}.`);
                                if (pros.length === 0) pros.push("Ad Set reach is stable.");
                                return pros.map((p, i) => <li key={i}>{p}</li>);
                              })()}
                            </ul>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-1">
                              <TrendingDown size={12} /> Cons
                            </div>
                            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pl-1">
                              {(() => {
                                const cons = [];
                                const m = selectedAdSet.metrics;
                                if (m.roas > 0 && m.roas < 1.0) cons.push(`ROAS of ${m.roas.toFixed(2)}x represents net loss.`);
                                if (m.ctr > 0 && m.ctr < 0.008) cons.push(`Low CTR (${(m.ctr * 100).toFixed(2)}%).`);
                                if (cons.length === 0) cons.push("No critical budget leaks.");
                                return cons.map((c, i) => <li key={i}>{c}</li>);
                              })()}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {adSetTab === "ads" && (
              <div className="card border border-border bg-white shadow-sm rounded-xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-slate-800">Active Ads</h3>
                  <span className="text-xs text-slate-400 font-medium">{adSetAds.length} Ads Active</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-left divide-y divide-border">
                    <thead className="bg-slate-50/50">
                      <tr className="text-slate-400 font-bold uppercase border-b border-border">
                        <th className="p-4">Ad Name</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Spend</th>
                        <th className="p-4 text-right">CTR</th>
                        <th className="p-4 text-right">ROAS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-medium text-slate-700">
                      {adSetAds.map((ad, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="p-4 flex items-center gap-3">
                            {ad.creative?.image_url ? (
                              <img src={ad.creative.image_url} alt="" className="w-10 h-10 object-cover rounded border border-border shrink-0" />
                            ) : (
                              <div className="w-10 h-10 bg-slate-100 rounded border border-border flex items-center justify-center shrink-0 text-slate-400">
                                <ImageIcon size={16} />
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-slate-800">{ad.name}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">ID: {ad.meta_ad_id}</div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${ad.status === "ACTIVE" ? "text-green-600 bg-green-50" : "text-slate-500 bg-slate-100"}`}>
                              {ad.status}
                            </span>
                          </td>
                          <td className="p-4 text-right font-semibold">{formatCurrency(ad.metrics.spend)}</td>
                          <td className="p-4 text-right text-slate-500">{formatPercent(ad.metrics.ctr)}</td>
                          <td className="p-4 text-right text-green-600 font-bold">{ad.metrics.roas > 0 ? `${ad.metrics.roas.toFixed(2)}x` : "—"}</td>
                        </tr>
                      ))}
                      {adSetAds.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400">No active ads in this ad set.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {adSetTab === "breakdowns" && (() => {
              const isConversationGoal = selectedAdSet?.optimization_goal?.toUpperCase().includes("CONVERSATION") || false;
              const isLeadGoal = selectedAdSet?.optimization_goal?.toUpperCase().includes("LEAD") || false;
              const resultLabel = isConversationGoal ? "Conversations" : isLeadGoal ? "Leads" : "Purchases";
              const isRoas = !isConversationGoal && !isLeadGoal;

              return (
                <div className="space-y-4">
                  <div className="flex border-b border-slate-100 gap-4 text-xs font-bold text-slate-400">
                    <button 
                      onClick={() => setBreakdownView("placement")}
                      className={`pb-2 border-b-2 transition ${breakdownView === "placement" ? "border-primary text-slate-700" : "border-transparent"}`}
                    >
                      Placements Breakdown
                    </button>
                    <button 
                      onClick={() => setBreakdownView("demographic")}
                      className={`pb-2 border-b-2 transition ${breakdownView === "demographic" ? "border-primary text-slate-700" : "border-transparent"}`}
                    >
                      Demographics Breakdown
                    </button>
                    <button 
                      onClick={() => setBreakdownView("region")}
                      className={`pb-2 border-b-2 transition ${breakdownView === "region" ? "border-primary text-slate-700" : "border-transparent"}`}
                    >
                      Regions Breakdown
                    </button>
                  </div>

                  {breakdownView === "placement" && (
                    <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden">
                      <div className="p-4 bg-slate-50/50 border-b border-border text-xs font-bold text-slate-600">
                        Channel distribution breakdown relative to ad set metrics
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs text-left divide-y divide-border">
                          <thead className="bg-slate-50/50">
                            <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border">
                              <th className="p-4">Platform</th>
                              <th className="p-4 text-right">Spend Contribution</th>
                              <th className="p-4 text-right">CTR</th>
                              <th className="p-4 text-right">{resultLabel}</th>
                              <th className="p-4 text-right">{isRoas ? "ROAS Contribution" : "Cost Per Result"}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border font-medium text-slate-700">
                            {loadingBreakdowns ? (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400 font-medium animate-pulse">
                                  Loading placement metrics...
                                </td>
                              </tr>
                            ) : placementsData.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                                  No placement data found.
                                </td>
                              </tr>
                            ) : (
                              placementsData.map((p, idx) => {
                                const friendlyName = p.platform_position 
                                  ? p.platform_position.split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") 
                                  : p.publisher_platform.charAt(0).toUpperCase() + p.publisher_platform.slice(1);
                                const spendPct = selectedAdSet.metrics.spend > 0 ? (p.spend / selectedAdSet.metrics.spend) : 0;
                                return (
                                  <tr key={idx} className="hover:bg-slate-50 transition">
                                    <td className="p-4 font-bold text-slate-800">{friendlyName}</td>
                                    <td className="p-4 text-right">{formatCurrency(p.spend)} ({Math.round(spendPct * 100)}%)</td>
                                    <td className="p-4 text-right">{p.ctr.toFixed(2)}%</td>
                                    <td className="p-4 text-right">{p.results}</td>
                                    <td className="p-4 text-right text-green-600 font-bold">
                                      {isRoas 
                                        ? `${p.roas.toFixed(2)}x`
                                        : (p.results > 0 ? formatCurrency(p.spend / p.results) : "—")
                                      }
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {breakdownView === "demographic" && (
                    <div className="space-y-6">
                      {/* Age Distribution Table */}
                      <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden">
                        <div className="p-4 bg-slate-50/50 border-b border-border text-xs font-bold text-slate-600">
                          Age Distribution Breakdown
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs text-left divide-y divide-border">
                            <thead className="bg-slate-50/50">
                              <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border">
                                <th className="p-4">Age Segment</th>
                                <th className="p-4 text-right">Spend Contribution</th>
                                <th className="p-4 text-right">CTR</th>
                                <th className="p-4 text-right">{resultLabel}</th>
                                <th className="p-4 text-right">{isRoas ? "ROAS" : "Cost Per Result"}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border font-medium text-slate-700">
                              {loadingBreakdowns ? (
                                <tr>
                                  <td colSpan={5} className="p-8 text-center text-slate-400 font-medium animate-pulse">
                                    Loading age demographics...
                                  </td>
                                </tr>
                              ) : ageDistribution.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                                    No age data found.
                                  </td>
                                </tr>
                              ) : (
                                ageDistribution.map((d: any, idx: number) => {
                                  const spendPct = selectedAdSet.metrics.spend > 0 ? (d.spend / selectedAdSet.metrics.spend) : 0;
                                  return (
                                    <tr key={idx} className="hover:bg-slate-50 transition">
                                      <td className="p-4 font-bold text-slate-800">{d.age}</td>
                                      <td className="p-4 text-right">{formatCurrency(d.spend)} ({Math.round(spendPct * 100)}%)</td>
                                      <td className="p-4 text-right">{d.ctr.toFixed(2)}%</td>
                                      <td className="p-4 text-right">{d.results}</td>
                                      <td className="p-4 text-right text-green-600 font-bold">
                                        {isRoas 
                                          ? `${d.roas.toFixed(2)}x`
                                          : (d.results > 0 ? formatCurrency(d.spend / d.results) : "—")
                                        }
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Gender Distribution Table */}
                      <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden">
                        <div className="p-4 bg-slate-50/50 border-b border-border text-xs font-bold text-slate-600">
                          Gender Distribution Breakdown
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs text-left divide-y divide-border">
                            <thead className="bg-slate-50/50">
                              <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border">
                                <th className="p-4">Gender</th>
                                <th className="p-4 text-right">Spend Contribution</th>
                                <th className="p-4 text-right">CTR</th>
                                <th className="p-4 text-right">{resultLabel}</th>
                                <th className="p-4 text-right">{isRoas ? "ROAS" : "Cost Per Result"}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border font-medium text-slate-700">
                              {loadingBreakdowns ? (
                                <tr>
                                  <td colSpan={5} className="p-8 text-center text-slate-400 font-medium animate-pulse">
                                    Loading gender demographics...
                                  </td>
                                </tr>
                              ) : genderDistribution.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                                    No gender data found.
                                  </td>
                                </tr>
                              ) : (
                                genderDistribution.map((d: any, idx: number) => {
                                  const spendPct = selectedAdSet.metrics.spend > 0 ? (d.spend / selectedAdSet.metrics.spend) : 0;
                                  return (
                                    <tr key={idx} className="hover:bg-slate-50 transition">
                                      <td className="p-4 font-bold text-slate-800 uppercase">{d.gender}</td>
                                      <td className="p-4 text-right">{formatCurrency(d.spend)} ({Math.round(spendPct * 100)}%)</td>
                                      <td className="p-4 text-right">{d.ctr.toFixed(2)}%</td>
                                      <td className="p-4 text-right">{d.results}</td>
                                      <td className="p-4 text-right text-green-600 font-bold">
                                        {isRoas 
                                          ? `${d.roas.toFixed(2)}x`
                                          : (d.results > 0 ? formatCurrency(d.spend / d.results) : "—")
                                        }
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {breakdownView === "region" && (
                    <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden">
                      <div className="p-4 bg-slate-50/50 border-b border-border text-xs font-bold text-slate-600">
                        Geographic delivery and performance skew across key regions
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs text-left divide-y divide-border">
                          <thead className="bg-slate-50/50">
                            <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border">
                              <th className="p-4">Region / State</th>
                              <th className="p-4 text-right">Spend Contribution</th>
                              <th className="p-4 text-right">CTR</th>
                              <th className="p-4 text-right">{resultLabel}</th>
                              <th className="p-4 text-right">{isRoas ? "ROAS" : "Cost Per Result"}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border font-medium text-slate-700">
                            {loadingBreakdowns ? (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400 font-medium animate-pulse">
                                  Loading regional metrics...
                                </td>
                              </tr>
                            ) : regionsData.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                                  No regional data found.
                                </td>
                              </tr>
                            ) : (
                              regionsData.map((r, idx) => {
                                const spendPct = selectedAdSet.metrics.spend > 0 ? (r.spend / selectedAdSet.metrics.spend) : 0;
                                return (
                                  <tr key={idx} className="hover:bg-slate-50 transition">
                                    <td className="p-4 font-bold text-slate-800 flex items-center gap-1.5">
                                      <MapPin size={12} className="text-slate-400" />
                                      {r.region}
                                    </td>
                                    <td className="p-4 text-right">{formatCurrency(r.spend)} ({Math.round(spendPct * 100)}%)</td>
                                    <td className="p-4 text-right">{r.ctr.toFixed(2)}%</td>
                                    <td className="p-4 text-right">{r.results}</td>
                                    <td className="p-4 text-right text-green-600 font-bold">
                                      {isRoas 
                                        ? `${r.roas.toFixed(2)}x`
                                        : (r.results > 0 ? formatCurrency(r.spend / r.results) : "—")
                                      }
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {adSetTab === "aidiagnosis" && (
              <div className="space-y-6">
                <div className="card border border-border bg-white shadow-sm rounded-xl p-6 space-y-4">
                  <div className="flex items-center gap-1.5 border-b border-slate-50 pb-3">
                    <Sparkles size={16} className="text-blue-600 animate-pulse" />
                    <h3 className="text-base font-bold text-slate-800">AI Optimization Diagnostics</h3>
                  </div>
                  
                  {recs.filter(r => r.entity_id === selectedAdSet.id || r.meta_entity_id === selectedAdSet.meta_adset_id).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {recs.filter(r => r.entity_id === selectedAdSet.id || r.meta_entity_id === selectedAdSet.meta_adset_id).map((r, idx) => (
                        <div key={idx} className="border border-border rounded-xl p-5 bg-slate-50/50 hover:bg-slate-50 transition space-y-3">
                          <div className="flex justify-between items-start">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              r.impact_level === "CRITICAL" ? "text-red-700 bg-red-50 border border-red-200" : "text-amber-700 bg-amber-50 border border-amber-200"
                            }`}>
                              {r.impact_level} Suggestions
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400">{r.type}</span>
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-800">{r.title}</h4>
                            <p className="text-xs text-slate-500 leading-relaxed mt-1">{r.recommendation_brief}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-200 flex items-center justify-center shadow-sm">
                        <Check size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Creative & Bidding Parameters Optimal</h4>
                        <p className="text-xs text-slate-400 leading-normal max-w-sm mt-1">
                          No warning signals or critical leaks detected. This Ad Set is operating within normal performance goal variances.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="card border border-border bg-white shadow-sm rounded-xl p-6 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Evaluation Evidence Checkpoints</h3>
                  {(() => {
                    const adsetRecs = recs.filter(r => (r.entity_id === selectedAdSet.id || r.meta_entity_id === selectedAdSet.meta_adset_id) && r.evidence);
                    if (adsetRecs.length === 0) {
                      return <div className="text-xs text-slate-400 font-bold uppercase tracking-wider bg-slate-50 border border-slate-100 rounded-lg p-3 text-center">N/A</div>;
                    }
                    return (
                      <div className="space-y-3 text-xs font-medium text-slate-600">
                        {adsetRecs.map((r, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <span className="text-blue-500 font-bold mt-0.5">✓</span>
                            <div>
                              <div className="font-bold text-slate-800">{r.title} Evidence</div>
                              <p className="text-slate-500 font-normal mt-0.5">{r.evidence}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        /* Ad Sets Table Card */
        <div className="space-y-4">
          {/* Dynamic Filters & Sorter Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 border border-border rounded-lg shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500">Status Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-border rounded px-2.5 py-1.5 bg-white font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="ARCHIVED">Stopped / Archived</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs border border-border rounded px-2.5 py-1.5 bg-white font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="name">Ad Set Name</option>
                <option value="spend">Spend</option>
                <option value="impressions">Impressions</option>
                <option value="clicks">Clicks</option>
                <option value="purchases">Conversions</option>
                <option value="ctr">CTR</option>
                <option value="cpc">CPC</option>
                <option value="roas">ROAS</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                className="text-xs border border-border rounded px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 font-bold text-slate-600 cursor-pointer"
              >
                {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
              </button>
            </div>
          </div>

          <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left divide-y divide-border">
                <thead className="bg-slate-50/50">
                  <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border">
                    <th className="p-4">Ad Set Details</th>
                    <th className="p-4">Campaign</th>
                    <th className="p-4 text-right">Spend</th>
                    <th className="p-4 text-right">Impressions</th>
                    <th className="p-4 text-right">Clicks</th>
                    <th className="p-4 text-right">Conversions</th>
                    <th className="p-4 text-right">CTR</th>
                    <th className="p-4 text-right">CPC</th>
                    <th className="p-4 text-right">ROAS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium text-slate-700">
                  {filteredAndSortedAdSets.map((as, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => handleSelectAdSet(as)} 
                      className="hover:bg-slate-50 transition cursor-pointer"
                    >
                      <td className="p-4">
                        <div className="font-bold text-sm text-slate-800">{as.name}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${as.status === "ACTIVE" ? "text-green-600 bg-green-50" : "text-slate-500 bg-slate-100"}`}>
                            {as.status}
                          </span>
                          <span className="text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-bold uppercase">
                            {as.optimization_goal.replace(/_/g, " ")}
                          </span>
                          <span className="text-[9px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-bold uppercase">
                            {as.billing_event.replace(/_/g, " ")}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-500 font-semibold max-w-xs truncate">{as.campaign_name}</td>
                      <td className="p-4 text-right font-semibold">
                        {formatCurrency(as.metrics.spend)}
                        {renderTrend(as.metrics.spend_trend)}
                      </td>
                      <td className="p-4 text-right">
                        {formatNumber(as.metrics.impressions)}
                        {renderTrend(as.metrics.impressions_trend)}
                      </td>
                      <td className="p-4 text-right">
                        {formatNumber(as.metrics.clicks)}
                        {renderTrend(as.metrics.clicks_trend)}
                      </td>
                      <td className="p-4 text-right">
                        {formatNumber(as.metrics.purchases)}
                        {renderTrend(as.metrics.purchases_trend)}
                      </td>
                      <td className="p-4 text-right">
                        {formatPercent(as.metrics.ctr)}
                        {renderTrend(as.metrics.ctr_trend)}
                      </td>
                      <td className="p-4 text-right">
                        {formatCurrency(as.metrics.cpc)}
                        {renderTrend(as.metrics.cpc_trend)}
                      </td>
                      <td className="p-4 text-right text-green-600 font-bold text-sm">
                        {as.metrics.roas.toFixed(2)}x
                        {renderTrend(as.metrics.roas_trend)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
