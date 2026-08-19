"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { useAdAccount } from "@/context/AdAccountContext";
import {
  DollarSign,
  ShoppingCart,
  Target,
  TrendingUp,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export default function OverviewPage() {
  const router = useRouter();
  const { selectedAccount, loadingAccounts } = useAdAccount();
  const [checkingConnection, setCheckingConnection] = useState(true);
  
  // State for subscription and upgrade limits
  const [subscription, setSubscription] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalMessage, setUpgradeModalMessage] = useState("");
  
  // State for date presets
  const [datePreset, setDatePreset] = useState<string>("30d");
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [activeChartTab, setActiveChartTab] = useState<"spend" | "purchases" | "roas">("purchases");

  // Loaded data states
  const [metrics, setMetrics] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

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
        limit = 90;
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

  const loadDashboardData = async () => {
    if (!selectedAccount) return;
    const { startStr, endStr } = getDates(datePreset, customStartDate, customEndDate);
    const cacheKey = `dgs_cached_dashboard_${selectedAccount.id}_${datePreset}_${startStr}_${endStr}`;

    // Load cached dashboard overview and chart data for instant layout rendering
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { metrics: cachedMetrics, chartData: cachedChart, health: cachedHealth, campaigns: cachedCampaigns, ads: cachedAds } = JSON.parse(cached);
        if (cachedMetrics) setMetrics(cachedMetrics);
        if (cachedChart) setChartData(cachedChart);
        if (cachedHealth) setHealth(cachedHealth);
        if (cachedCampaigns) setCampaigns(cachedCampaigns);
        if (cachedAds) setAds(cachedAds);
      } catch (e) {}
    }

    try {
      setLoadingData(!cached); // Show full spinner only if no cache is available

      // 1. Fetch critical metrics and chart data first (critical path)
      const [overviewRes, chartRes] = await Promise.all([
        api.getDashboardOverview(selectedAccount.id, startStr, endStr),
        api.getDashboardChart(selectedAccount.id, startStr, endStr),
      ]);

      setMetrics(overviewRes);
      setChartData(chartRes);
      setLoadingData(false); // Hide spinner as soon as critical stats are ready

      // 2. Fetch supplementary data in the background (non-blocking)
      const healthPromise = api.getDashboardHealth(selectedAccount.id).then((res) => {
        setHealth(res);
        return res;
      }).catch((e) => {
        console.warn("Failed to load dashboard health:", e);
        return null;
      });

      const campaignsPromise = api.getCampaigns(selectedAccount.id, startStr, endStr).then((res) => {
        const topCampaigns = res.slice(0, 4);
        setCampaigns(topCampaigns);
        return topCampaigns;
      }).catch((e) => {
        console.warn("Failed to load dashboard campaigns:", e);
        return [];
      });

      const adsPromise = api.getAds(selectedAccount.id, startStr, endStr).then((res) => {
        const topAds = res.slice(0, 4);
        setAds(topAds);
        return topAds;
      }).catch((e) => {
        console.warn("Failed to load dashboard ads:", e);
        return [];
      });

      // Update cache in the background when all finish
      Promise.all([healthPromise, campaignsPromise, adsPromise]).then(([healthRes, campaignsRes, adsRes]) => {
        const cacheData = {
          metrics: overviewRes,
          chartData: chartRes,
          health: healthRes,
          campaigns: campaignsRes,
          ads: adsRes
        };
        sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
      });

    } catch (err) {
      console.error("Failed to load dashboard statistics:", err);
      setLoadingData(false);
    }
  };

  useEffect(() => {
    const checkMetaConnection = async () => {
      try {
        const res = await api.getMetaStatus();
        if (!res.connected) {
          router.push("/settings/ad-accounts");
        } else {
          setCheckingConnection(false);
        }
      } catch (err) {
        console.error("Meta connection check failed:", err);
        router.push("/settings/ad-accounts");
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        checkMetaConnection();
      } else {
        setCheckingConnection(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!checkingConnection && selectedAccount) {
      loadDashboardData();
    }
  }, [checkingConnection, selectedAccount, datePreset, customStartDate, customEndDate]);

  if (checkingConnection || loadingAccounts) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
        <span className="ml-2 text-sm text-subtle font-medium">Verifying pipeline connection...</span>
      </div>
    );
  }

  // Format date range string for header
  const { startStr, endStr } = getDates(datePreset);
  const formatDateHeader = (dStr: string) => {
    const d = new Date(dStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const dateRangeLabel = `${formatDateHeader(startStr)} – ${formatDateHeader(endStr)}, 2026`;

  // Render metric card helper
  const renderKpiCard = (title: string, value: number, trend: number, isCurrency: boolean, icon: any, color: string) => {
    const Icon = icon;
    const isUp = trend >= 0;
    
    // Format KPI Value
    let formattedVal = "";
    if (isCurrency) formattedVal = formatCurrency(value);
    else if (title.includes("ROAS")) formattedVal = `${value.toFixed(2)}x`;
    else formattedVal = formatNumber(value);

    return (
      <div className="kpi-card shadow-sm border border-border bg-white rounded-lg p-5">
        <div className={`kpi-icon ${color} p-3 rounded-lg flex items-center justify-center shrink-0`}>
          <Icon size={20} />
        </div>
        <div className="kpi-content mt-3">
          <span className="kpi-label text-xs text-subtle font-bold uppercase tracking-wider">{title}</span>
          <span className="kpi-value text-2xl font-bold text-slate-800 mt-1 block">{formattedVal}</span>
          <span className={`kpi-trend text-xs font-semibold flex items-center gap-0.5 mt-2 ${isUp ? "text-green-600" : "text-red-500"}`}>
            {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend).toFixed(1)}% vs prev period
          </span>
        </div>
      </div>
    );
  };

  // AI recommendations list
  const mockRecommendations = [
    {
      title: "Pause underperforming Ad: Summer Sale - Image 1",
      desc: "ROAS is currently below target threshold (0.9x)",
      priority: "High Priority",
      priorityClass: "high",
      iconClass: "critical",
      icon: AlertTriangle,
    },
    {
      title: "Increase budget for Campaign: DG - Prospecting Conversions",
      desc: "ROAS is high (2.18x) and CPA is 32% lower than target",
      priority: "High Impact",
      priorityClass: "high",
      iconClass: "success",
      icon: Lightbulb,
    },
    {
      title: "Test Video creative format in Lookalike AdSet",
      desc: "Video variations generally perform 45% better than statics",
      priority: "Experiment",
      priorityClass: "medium",
      iconClass: "info",
      icon: Sparkles,
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page Header */}
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title text-2xl font-bold text-slate-800">Overview</h1>
          <p className="page-subtitle text-sm text-subtle mt-1">
            Real-time insights for {selectedAccount?.name || "active Meta pipeline"}
          </p>
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

      {loadingData ? (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
          <span className="ml-2 text-sm text-subtle font-medium">Aggregating historical campaign metrics...</span>
        </div>
      ) : metrics ? (
        <>
          {/* AI Brief Summary Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="card p-5 border border-blue-100 bg-blue-50/10 rounded-lg flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-1.5 text-blue-600">
                  <Sparkles size={16} />
                  <span className="text-xs font-black uppercase tracking-wider">Today's AI Brief</span>
                </div>
                <h4 className="text-sm font-bold text-slate-800 mt-2">Yesterday CPL decreased 12%</h4>
                <p className="text-xs text-subtle font-medium mt-1">3 priorities need your attention today.</p>
              </div>
              <Link href="/briefs/daily" className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mt-2">
                View Daily Brief <ChevronRight size={14} />
              </Link>
            </div>
            
            <div className="card p-5 border border-indigo-100 bg-indigo-50/10 rounded-lg flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-1.5 text-indigo-600">
                  <Zap size={16} />
                  <span className="text-xs font-black uppercase tracking-wider">Weekly AI Brief</span>
                </div>
                <h4 className="text-sm font-bold text-slate-800 mt-2">Winning Pattern: Short video + Reels</h4>
                <p className="text-xs text-subtle font-medium mt-1">Acquisitions are 34% cheaper using short video Reels.</p>
              </div>
              <Link href="/briefs/weekly" className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mt-2">
                View Weekly Brief <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          {/* KPI Cards Grid */}
          <div className="kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {renderKpiCard("Spend", metrics.spend.value, metrics.spend.trend, true, DollarSign, "blue")}
            {renderKpiCard("Purchases", metrics.purchases.value, metrics.purchases.trend, false, ShoppingCart, "green")}
            {renderKpiCard("Cost per Purchase", metrics.cpa.value, metrics.cpa.trend, true, Target, "purple")}
            {renderKpiCard("ROAS", metrics.roas.value, metrics.roas.trend, false, TrendingUp, "green")}
            {renderKpiCard("Impressions", metrics.impressions.value, metrics.impressions.trend, false, Eye, "orange")}
          </div>

          {/* AI Recommendations + Performance Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Recommendations Card */}
            <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="card-header border-b border-border p-6 flex justify-between items-center bg-slate-50/50">
                <h3 className="card-title font-bold text-slate-800 text-sm">AI Recommendations</h3>
                <a className="view-all text-xs font-semibold text-primary hover:underline" href="/recommendations">
                  View All
                </a>
              </div>
              <div className="card-body p-6 space-y-4">
                {mockRecommendations.map((rec, idx) => {
                  const Icon = rec.icon;
                  return (
                    <div key={idx} className="recommendation-item flex items-start justify-between gap-4 p-4 border border-border rounded-lg hover:bg-slate-50 transition cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className={`recommendation-icon ${rec.iconClass} p-2 rounded-full shrink-0 flex items-center justify-center`}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <div className="recommendation-title font-bold text-sm text-slate-800">{rec.title}</div>
                          <div className="recommendation-desc text-xs text-subtle font-medium mt-0.5">{rec.desc}</div>
                        </div>
                      </div>
                      <span className={`recommendation-badge ${rec.priorityClass} px-2 py-0.5 rounded text-[10px] font-bold shrink-0 uppercase tracking-wide`}>
                        {rec.priority}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Performance Line Chart Card */}
            <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden" id="performance-chart">
              <div className="card-header border-b border-border p-6 flex justify-between items-center bg-slate-50/50">
                <h3 className="card-title font-bold text-slate-800 text-sm">Performance Overview</h3>
                <div className="tab-group flex border border-border rounded-md overflow-hidden bg-white">
                  <button 
                    onClick={() => setActiveChartTab("spend")}
                    className={`tab-item px-3 py-1.5 text-xs font-semibold transition ${activeChartTab === "spend" ? "bg-slate-100 text-slate-800" : "text-subtle hover:bg-slate-50"}`}
                  >
                    Spend
                  </button>
                  <button 
                    onClick={() => setActiveChartTab("purchases")}
                    className={`tab-item px-3 py-1.5 text-xs font-semibold transition ${activeChartTab === "purchases" ? "bg-slate-100 text-slate-800" : "text-subtle hover:bg-slate-50"}`}
                  >
                    Purchases
                  </button>
                  <button 
                    onClick={() => setActiveChartTab("roas")}
                    className={`tab-item px-3 py-1.5 text-xs font-semibold transition ${activeChartTab === "roas" ? "bg-slate-100 text-slate-800" : "text-subtle hover:bg-slate-50"}`}
                  >
                    ROAS
                  </button>
                </div>
              </div>
              <div className="card-body p-6">
                {chartData.length === 0 ? (
                  <div className="h-64 bg-slate-50 flex items-center justify-center rounded-lg text-sm text-subtle">
                    No stats returned for chart rendering.
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis 
                          dataKey="date" 
                          stroke="var(--subtle)" 
                          fontSize={10} 
                          tickFormatter={(str) => {
                            const dateObj = new Date(str);
                            return dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                          }}
                        />
                        <YAxis stroke="var(--subtle)" fontSize={10} />
                        <Tooltip 
                          labelClassName="text-slate-800 font-bold" 
                          contentStyle={{ background: "white", border: "1px solid var(--border)", borderRadius: "6px" }}
                        />
                        <Line
                          type="monotone"
                          dataKey={activeChartTab}
                          stroke="#2563EB"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row: Top Campaigns + Top Ads + Health Score */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Campaigns Table */}
            <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="card-header border-b border-border p-6 flex justify-between items-center bg-slate-50/50">
                <h3 className="card-title font-bold text-slate-800 text-sm">Top Campaigns</h3>
                <a className="view-all text-xs font-semibold text-primary hover:underline" href="/campaigns">
                  View All
                </a>
              </div>
              <div className="card-body p-4 overflow-x-auto">
                {campaigns.length === 0 ? (
                  <div className="p-8 text-center text-xs text-subtle">No campaigns linked to this selection.</div>
                ) : (
                  <table className="min-w-full text-xs text-left divide-y divide-border">
                    <thead>
                      <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border">
                        <th className="py-2.5">Campaign</th>
                        <th className="py-2.5 text-right">Spend</th>
                        <th className="py-2.5 text-right">Conversions</th>
                        <th className="py-2.5 text-right">ROAS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-medium text-slate-700">
                      {campaigns.map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-3">
                            <div className="font-bold text-slate-800 truncate max-w-[120px]">{c.name}</div>
                            <span className="text-[10px] text-green-600 bg-green-50 px-1 py-0.5 rounded font-bold uppercase mt-1 inline-block">
                              {c.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">{formatCurrency(c.metrics.spend)}</td>
                          <td className="py-3 text-right">{c.metrics.purchases}</td>
                          <td className="py-3 text-right text-green-600 font-bold">{c.metrics.roas.toFixed(2)}x</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Top Performing Ads Table */}
            <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="card-header border-b border-border p-6 flex justify-between items-center bg-slate-50/50">
                <h3 className="card-title font-bold text-slate-800 text-sm">Top Performing Ads</h3>
                <a className="view-all text-xs font-semibold text-primary hover:underline" href="/ads">
                  View All
                </a>
              </div>
              <div className="card-body p-4 overflow-x-auto">
                {ads.length === 0 ? (
                  <div className="p-8 text-center text-xs text-subtle">No ads synced to this selection.</div>
                ) : (
                  <table className="min-w-full text-xs text-left divide-y divide-border">
                    <thead>
                      <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border">
                        <th className="py-2.5">Ad Name</th>
                        <th className="py-2.5 text-right">CTR</th>
                        <th className="py-2.5 text-right">CPC</th>
                        <th className="py-2.5 text-right">ROAS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-medium text-slate-700">
                      {ads.map((ad, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-3">
                            <div className="font-bold text-slate-800 truncate max-w-[120px]">{ad.name}</div>
                            <div className="text-[10px] text-slate-400 font-medium truncate max-w-[120px] mt-0.5">
                              {ad.campaign_name}
                            </div>
                          </td>
                          <td className="py-3 text-right">{formatPercent(ad.metrics.ctr)}</td>
                          <td className="py-3 text-right">{formatCurrency(ad.metrics.cpc)}</td>
                          <td className="py-3 text-right text-green-600 font-bold">{ad.metrics.roas.toFixed(2)}x</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Health Score Circles Gauge */}
            {health && (
              <div className="card border border-border bg-white shadow-sm rounded-lg p-6">
                <h3 className="card-title font-bold text-slate-800 text-sm mb-4">Account Health Score</h3>
                <div className="flex flex-col items-center justify-center">
                  <div className="relative w-32 h-32 flex items-center justify-center mb-3">
                    <svg width="120" height="120" viewBox="0 0 120 120" className="absolute transform -rotate-90">
                      <circle
                        cx="60" cy="60" r="50"
                        fill="none"
                        stroke="var(--border)"
                        strokeWidth="8"
                      />
                      <circle
                        cx="60" cy="60" r="50"
                        fill="none"
                        stroke={health.statusClass === "good" ? "var(--success)" : health.statusClass === "attention" ? "var(--warning)" : "var(--critical)"}
                        strokeWidth="8"
                        strokeDasharray={`${2 * Math.PI * 50 * (health.score / 100)} ${2 * Math.PI * 50 * (1 - health.score / 100)}`}
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-3xl font-extrabold text-slate-800">{health.score}</span>
                      <span className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">Health</span>
                    </div>
                  </div>

                  <span className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border ${
                    health.statusClass === "good" ? "bg-green-50 text-green-700 border-green-200" :
                    health.statusClass === "attention" ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-red-50 text-red-700 border-red-200"
                  }`}>
                    {health.status} Rating
                  </span>

                  <div className="w-full mt-6 divide-y divide-border text-xs border-t border-border">
                    {health.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between py-2">
                        <span className="font-bold text-slate-700">{item.label}</span>
                        <span className={`font-semibold capitalize text-[10px] px-2 py-0.5 rounded ${
                          item.statusClass === "good" ? "text-green-700 bg-green-50" :
                          item.statusClass === "attention" ? "text-amber-700 bg-amber-50" :
                          "text-red-700 bg-red-50"
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="card shadow-sm border border-border">
          <div className="card-body p-8 text-center text-sm text-subtle font-medium">
            Could not fetch metrics overview. Ensure you have activated an ad account pipeline under settings.
          </div>
        </div>
      )}
    </div>
  );
}
