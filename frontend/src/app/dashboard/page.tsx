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
  Users,
  MousePointer,
  Activity,
  Video,
  Heart,
  FileText,
  RefreshCw,
  Brain,
  MessageSquare,
  Info,
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
  const [datePreset, setDatePreset] = useState<string>("today");
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [activeChartTab, setActiveChartTab] = useState<string>("purchases");
  const [goalFilter, setGoalFilter] = useState<"all" | "leads" | "sales" | "engagement">("all");

  // Reset active chart tab on goal filter changes
  useEffect(() => {
    if (goalFilter === "leads") {
      setActiveChartTab("leads");
    } else if (goalFilter === "engagement") {
      setActiveChartTab("impressions");
    } else {
      setActiveChartTab("purchases");
    }
  }, [goalFilter]);
  
  // Loaded data states
  const [metrics, setMetrics] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [dailyBrief, setDailyBrief] = useState<any>(null);
  const [weeklyBrief, setWeeklyBrief] = useState<any>(null);
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
    if (selectedAccount?.historical_intelligence_status === "active") {
      return 99999;
    }
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

  const loadDashboardData = async () => {
    if (!selectedAccount) return;
    const { startStr, endStr } = getDates(datePreset, customStartDate, customEndDate);
    const cacheKey = `dgs_cached_dashboard_${selectedAccount.id}_${datePreset}_${startStr}_${endStr}_${goalFilter}`;

    // Load cached dashboard overview and chart data for instant layout rendering
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { metrics: cachedMetrics, chartData: cachedChart, health: cachedHealth, campaigns: cachedCampaigns, ads: cachedAds, recommendations: cachedRecs, dailyBrief: cachedDaily, weeklyBrief: cachedWeekly } = JSON.parse(cached);
        if (cachedMetrics) setMetrics(cachedMetrics);
        if (cachedChart) setChartData(cachedChart);
        if (cachedHealth) setHealth(cachedHealth);
        if (cachedCampaigns) setCampaigns(cachedCampaigns);
        if (cachedAds) setAds(cachedAds);
        if (cachedRecs) setRecommendations(cachedRecs);
        if (cachedDaily) setDailyBrief(cachedDaily);
        if (cachedWeekly) setWeeklyBrief(cachedWeekly);
      } catch (e) {}
    }

    try {
      setLoadingData(!cached); // Show full spinner only if no cache is available

      // 1. Fetch critical metrics and chart data first (critical path)
      const [overviewRes, chartRes] = await Promise.all([
        api.getDashboardOverview(selectedAccount.id, startStr, endStr, goalFilter),
        api.getDashboardChart(selectedAccount.id, startStr, endStr, goalFilter),
      ]);

      setMetrics(overviewRes);
      setChartData(chartRes);
      setLoadingData(false); // Hide spinner as soon as critical stats are ready

      // 2. Fetch supplementary data in the background (non-blocking)
      const healthPromise = api.getDashboardHealth(selectedAccount.id, goalFilter).then((res) => {
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

      const recsPromise = api.getRecommendations(selectedAccount.id).then((res) => {
        const topRecs = res.slice(0, 3);
        setRecommendations(topRecs);
        return topRecs;
      }).catch((e) => {
        console.warn("Failed to load dashboard recommendations:", e);
        return [];
      });

      const dailyBriefPromise = api.getDailyBrief(selectedAccount.id).then((res) => {
        setDailyBrief(res);
        return res;
      }).catch((e) => {
        console.warn("Failed to load dashboard daily brief:", e);
        return null;
      });

      const weeklyBriefPromise = api.getWeeklyBrief(selectedAccount.id).then((res) => {
        setWeeklyBrief(res);
        return res;
      }).catch((e) => {
        console.warn("Failed to load dashboard weekly brief:", e);
        return null;
      });

      // Update cache in the background when all finish
      Promise.all([healthPromise, campaignsPromise, adsPromise, recsPromise, dailyBriefPromise, weeklyBriefPromise]).then(([healthRes, campaignsRes, adsRes, recsRes, dailyRes, weeklyRes]) => {
        const cacheData = {
          metrics: overviewRes,
          chartData: chartRes,
          health: healthRes,
          campaigns: campaignsRes,
          ads: adsRes,
          recommendations: recsRes,
          dailyBrief: dailyRes,
          weeklyBrief: weeklyRes,
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
  }, [checkingConnection, selectedAccount, datePreset, customStartDate, customEndDate, goalFilter]);

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
  const METRIC_INFOS: Record<string, { desc: string; formula: string }> = {
    "spend": {
      desc: "Total advertising budget spent during the selected timeframe.",
      formula: "Sum of daily spend values"
    },
    "purchases": {
      desc: "Total number of purchase conversions tracked by Pixel or API.",
      formula: "Sum of purchase action counts"
    },
    "cpa": {
      desc: "Average cost spent to secure a single completed purchase.",
      formula: "Spend / Purchases"
    },
    "roas": {
      desc: "Return on Ad Spend. Ratio of revenue generated to total spend.",
      formula: "Revenue / Spend"
    },
    "revenue": {
      desc: "Total value of purchase conversions tracked by your Pixel.",
      formula: "Sum of purchase conversion values"
    },
    "impressions": {
      desc: "Total number of times your ads were displayed on screen.",
      formula: "Total ad views count"
    },
    "ctr": {
      desc: "Click-Through Rate. Percentage of impressions that led to clicks.",
      formula: "Clicks / Impressions * 100"
    },
    "cpm": {
      desc: "Cost Per Mille. Cost to deliver 1,000 ad impressions.",
      formula: "Spend / Impressions * 1,000"
    },
    "cpc": {
      desc: "Cost Per Click. Average cost for each ad click.",
      formula: "Spend / Clicks"
    },
    "link_clicks": {
      desc: "Number of clicks that directed users to target destinations.",
      formula: "Total link click events"
    },
    "clicks": {
      desc: "Total clicks recorded on any part of the ad (including profile link, comment click, etc.).",
      formula: "Total clicks count"
    },
    "leads": {
      desc: "Number of lead form completions or registration actions.",
      formula: "Sum of lead events"
    },
    "cpl": {
      desc: "Cost Per Lead. Average cost to acquire one lead.",
      formula: "Spend / Leads"
    },
    "add_to_cart": {
      desc: "Number of times users added products to their shopping cart.",
      formula: "Sum of add to cart events"
    },
    "initiate_checkout": {
      desc: "Number of times users started checkout.",
      formula: "Sum of initiate checkout events"
    },
    "conversations": {
      desc: "Number of messaging conversations started via Messenger/Instagram/WhatsApp.",
      formula: "Sum of messaging starts"
    },
    "cost_per_conversation": {
      desc: "Average cost spent to initiate a new messaging conversation.",
      formula: "Spend / Conversations"
    },
    "aov": {
      desc: "Average Order Value. Average amount spent per purchase.",
      formula: "Revenue / Purchases"
    },
    "engagement_rate": {
      desc: "Percentage of impressions resulting in interactive post actions.",
      formula: "Post Engagement / Impressions * 100"
    },
    "hook_rate": {
      desc: "Percentage of impressions that watched at least 3 seconds of video.",
      formula: "3-Sec Video Views / Impressions * 100"
    },
    "video_views": {
      desc: "Number of video plays lasting at least 3 seconds.",
      formula: "Total 3-Sec Video Views"
    },
    "thruplays": {
      desc: "Number of video plays completed or lasting at least 15 seconds.",
      formula: "Total 15-Sec Video Views"
    },
    "post_engagement": {
      desc: "Total number of social reactions, comments, shares, or clicks.",
      formula: "Sum of all interaction actions"
    },
    "reach": {
      desc: "Number of unique users who saw the ad at least once.",
      formula: "Unique ad views count"
    },
    "frequency": {
      desc: "Average number of times a unique user saw the ad.",
      formula: "Impressions / Reach"
    },
    "landing_page_views": {
      desc: "Number of users who successfully loaded the landing page.",
      formula: "Pixel page view events"
    },
    "lpv_rate": {
      desc: "Landing Page View Rate. Percentage of link clicks leading to page loads.",
      formula: "Landing Page Views / Link Clicks * 100"
    },
    "cost_per_add_to_cart": {
      desc: "Average cost spent to secure a single add to cart action.",
      formula: "Spend / Add to Cart"
    },
    "cost_per_initiate_checkout": {
      desc: "Average cost spent to secure a single initiate checkout action.",
      formula: "Spend / Initiate Checkout"
    }
  };

  // Render metric card helper
  const renderKpiCard = (title: string, value: number, trend: number, formatType: "currency" | "percent" | "multiplier" | "number", icon: any, color: string) => {
    const Icon = icon;
    
    // Resolve key and status from goal_profile
    const getMetricKey = (t: string): string => {
      const clean = t.toLowerCase().trim();
      if (clean.includes("spend")) return "spend";
      if (clean.includes("impressions")) return "impressions";
      if (clean.includes("cpa") || clean.includes("cost per purchase")) return "cpa";
      if (clean.includes("roas")) return "roas";
      if (clean.includes("ctr")) return "ctr";
      if (clean.includes("cpm")) return "cpm";
      if (clean.includes("cpc")) return "cpc";
      if (clean.includes("link click")) return "link_clicks";
      if (clean.includes("total click") || clean.includes("clicks")) return "clicks";
      if (clean.includes("cpl") || clean.includes("cost per lead")) return "cpl";
      if (clean.includes("lead")) return "leads";
      if (clean.includes("cost per cart add") || clean.includes("cost per add to cart")) return "cost_per_add_to_cart";
      if (clean.includes("add to cart") || clean.includes("cart add")) return "add_to_cart";
      if (clean.includes("cost per checkout") || clean.includes("cost per initiate checkout")) return "cost_per_initiate_checkout";
      if (clean.includes("checkout")) return "initiate_checkout";
      if (clean.includes("cost per conversation")) return "cost_per_conversation";
      if (clean.includes("conversation")) return "conversations";
      if (clean.includes("aov") || clean.includes("average order")) return "aov";
      if (clean.includes("engagement rate")) return "engagement_rate";
      if (clean.includes("hook rate")) return "hook_rate";
      if (clean.includes("video views")) return "video_views";
      if (clean.includes("thruplay")) return "thruplays";
      if (clean.includes("post engagement")) return "post_engagement";
      if (clean.includes("purchase")) return "purchases";
      return clean.replace(/ /g, "_");
    };

    const metricKey = getMetricKey(title);
    const status = metrics?.goal_profile?.metric_statuses?.[metricKey];

    let formattedVal = "—";
    let isStatusMetric = false;

    if (status === "CRM_REQUIRED") {
      formattedVal = "CRM Required";
      isStatusMetric = true;
    } else if (status === "UNAVAILABLE") {
      formattedVal = "Unavailable";
      isStatusMetric = true;
    } else if (status === "NOT_APPLICABLE") {
      formattedVal = "N/A";
      isStatusMetric = true;
    } else if (status === "INSUFFICIENT_DATA") {
      formattedVal = "Insufficient Data";
      isStatusMetric = true;
    } else {
      if (value !== null && value !== undefined && !isNaN(value)) {
        const valNum = Number(value);
        if (formatType === "currency") {
          formattedVal = formatCurrency(valNum);
        } else if (formatType === "percent") {
          formattedVal = `${(valNum * 100).toFixed(2)}%`;
        } else if (formatType === "multiplier") {
          formattedVal = title.includes("Frequency") ? valNum.toFixed(2) : `${valNum.toFixed(2)}x`;
        } else {
          formattedVal = formatNumber(valNum);
        }
      }
    }

    const bgColors: Record<string, string> = {
      blue: "bg-blue-50 text-blue-600 border-blue-100",
      green: "bg-emerald-50 text-emerald-600 border-emerald-100",
      purple: "bg-indigo-50 text-indigo-650 border-indigo-100",
      orange: "bg-amber-50 text-amber-600 border-amber-100",
      red: "bg-rose-50 text-rose-650 border-rose-100",
    };

    const safeTrend = trend !== null && trend !== undefined && !isNaN(trend) ? trend : 0;
    const info = METRIC_INFOS[metricKey];

    const getTooltipAlignClass = (key: string): string => {
      const leftAligned = ["spend", "ctr", "cpc", "clicks", "leads", "add_to_cart", "conversations", "aov", "engagement_rate"];
      const rightAligned = ["impressions", "cpm", "link_clicks", "cpl", "initiate_checkout", "cost_per_conversation", "post_engagement"];
      
      if (leftAligned.includes(key)) {
        return "left-0 translate-x-0 origin-bottom-left";
      }
      if (rightAligned.includes(key)) {
        return "right-0 left-auto translate-x-0 origin-bottom-right";
      }
      return "left-1/2 -translate-x-1/2 origin-bottom";
    };

    const tooltipAlignClass = getTooltipAlignClass(metricKey);

    return (
      <div className="bg-white border border-slate-150 rounded-xl p-5 hover:shadow-md transition duration-200 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              {title}
              {info && (
                <span className="group relative cursor-pointer inline-flex items-center">
                  <Info size={12} className="text-slate-350 hover:text-slate-500 transition" />
                  <span className={`absolute bottom-full mb-2 w-52 p-2.5 bg-slate-900 text-white text-[10px] font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 shadow-lg z-50 normal-case leading-normal ${tooltipAlignClass}`}>
                    <span className="block font-bold text-indigo-300 mb-0.5">{title}</span>
                    <span className="block font-medium text-slate-200">{info.desc}</span>
                    <span className="block border-t border-slate-700/60 mt-1.5 pt-1 font-bold text-slate-400">Formula: <code className="text-slate-300 font-mono">{info.formula}</code></span>
                  </span>
                </span>
              )}
            </span>
            <span className={`text-2xl font-extrabold mt-1 block ${isStatusMetric ? "text-slate-400 text-lg font-bold" : "text-slate-900"}`}>{formattedVal}</span>
          </div>
          <div className={`p-2.5 rounded-xl border ${bgColors[color] || bgColors.blue} flex items-center justify-center shrink-0`}>
            <Icon size={18} />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100">
          {isStatusMetric ? (
            <span className="text-[11px] font-medium text-slate-400">
              {status === "CRM_REQUIRED" ? "Requires CRM integration" : "Metric not available"}
            </span>
          ) : (
            <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${safeTrend >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
              {safeTrend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span className="font-bold">{Math.abs(safeTrend).toFixed(1)}%</span> vs prev period
            </span>
          )}
        </div>
      </div>
    );
  };

  // Helper to determine the goal type of a campaign
  const getCampaignGoalType = (campaign: any) => {
    const obj = (campaign.objective || "").toLowerCase();
    if (obj.includes("sales") || obj.includes("conversions")) return "sales";
    if (obj.includes("leads")) return "leads";
    if (obj.includes("engagement") || obj.includes("messaging")) return "engagement";
    
    // Fallback to name keywords
    const name = (campaign.name || "").toLowerCase();
    if (name.includes("sales") || name.includes("conversions")) return "sales";
    if (name.includes("lead")) return "leads";
    if (name.includes("engagement") || name.includes("messaging") || name.includes("workshop")) return "engagement";
    return "sales"; // default fallback
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page Header */}
      <div className="page-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="page-title text-2xl font-black text-slate-900 tracking-tight">Dashboard</h1>
          <p className="page-subtitle text-xs text-slate-500 mt-1 font-semibold">
            Real-time performance analytics for <span className="text-primary font-bold">{selectedAccount?.name || "active Meta pipeline"}</span>
          </p>
        </div>
        
        {/* Goal Filter & Date Picker Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Goal Filter Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setGoalFilter("all")}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                goalFilter === "all"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Whole Account
            </button>
            <button
              onClick={() => setGoalFilter("sales")}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                goalFilter === "sales"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Sales
            </button>
            <button
              onClick={() => setGoalFilter("leads")}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                goalFilter === "leads"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Leads & Messaging
            </button>
            <button
              onClick={() => setGoalFilter("engagement")}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                goalFilter === "engagement"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Engagement
            </button>
          </div>

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

          {/* KPI Cards Grid */}
          {goalFilter === "all" && (
            <div className="space-y-6">
              <div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Target size={14} className="text-slate-400" />
                  <span>Primary Performance KPIs</span>
                </div>
                <div className="kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                  {renderKpiCard("Spend", metrics.spend.value, metrics.spend.trend, "currency", DollarSign, "blue")}
                  {renderKpiCard("Purchases", metrics.purchases.value, metrics.purchases.trend, "number", ShoppingCart, "green")}
                  {renderKpiCard("Cost per Purchase (CPA)", metrics.cpa.value, metrics.cpa.trend, "currency", Target, "purple")}
                  {renderKpiCard("ROAS", metrics.roas.value, metrics.roas.trend, "multiplier", TrendingUp, "green")}
                  {renderKpiCard("Impressions", metrics.impressions.value, metrics.impressions.trend, "number", Eye, "orange")}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Traffic & Clicks Card */}
                <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-200">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 block">Traffic & Delivery CTR</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {renderKpiCard("CTR", metrics.ctr.value, metrics.ctr.trend, "percent", MousePointer, "blue")}
                    {renderKpiCard("CPM", metrics.cpm.value, metrics.cpm.trend, "currency", Eye, "orange")}
                    {renderKpiCard("CPC", metrics.cpc.value, metrics.cpc.trend, "currency", Target, "purple")}
                    {renderKpiCard("Link Clicks", metrics.link_clicks.value, metrics.link_clicks.trend, "number", MousePointer, "blue")}
                    {renderKpiCard("Total Clicks", metrics.clicks.value, metrics.clicks.trend, "number", MousePointer, "blue")}
                  </div>
                </div>

                {/* Funnels & Lead Gen Card */}
                <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-200">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 block">Conversions & Leads</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {renderKpiCard("Leads", metrics.leads.value, metrics.leads.trend, "number", FileText, "green")}
                    {renderKpiCard("CPL", metrics.cpl.value, metrics.cpl.trend, "currency", Target, "purple")}
                    {renderKpiCard("Add to Cart", metrics.add_to_cart.value, metrics.add_to_cart.trend, "number", ShoppingCart, "blue")}
                    {renderKpiCard("Initiate Checkout", metrics.initiate_checkout.value, metrics.initiate_checkout.trend, "number", Target, "purple")}
                    {renderKpiCard("Conversations", metrics.conversations.value, metrics.conversations.trend, "number", MessageSquare, "blue")}
                    {renderKpiCard("Cost per Conversation", metrics.cost_per_conversation.value, metrics.cost_per_conversation.trend, "currency", Target, "purple")}
                    {renderKpiCard("AOV", metrics.aov.value, metrics.aov.trend, "currency", RefreshCw, "green")}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Activity size={14} className="text-slate-400" />
                  <span>Creative Watch & Engagement</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                  {renderKpiCard("Engagement Rate", metrics.engagement_rate.value, metrics.engagement_rate.trend, "percent", Activity, "blue")}
                  {renderKpiCard("Hook Rate", metrics.hook_rate.value, metrics.hook_rate.trend, "percent", Sparkles, "orange")}
                  {renderKpiCard("Video Views", metrics.video_views.value, metrics.video_views.trend, "number", Video, "blue")}
                  {renderKpiCard("ThruPlays", metrics.thruplays.value, metrics.thruplays.trend, "number", Video, "purple")}
                  {renderKpiCard("Post Engagement", metrics.post_engagement.value, metrics.post_engagement.trend, "number", Heart, "red")}
                </div>
              </div>
            </div>
          )}

          {goalFilter === "leads" && (
            <div className="space-y-6">
              <div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <FileText size={14} className="text-slate-400" />
                  <span>Messaging & Lead Gen Performance KPIs</span>
                </div>
                <div className="kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                  {renderKpiCard("Spend", metrics.spend.value, metrics.spend.trend, "currency", DollarSign, "blue")}
                  {renderKpiCard("Leads", metrics.leads.value, metrics.leads.trend, "number", FileText, "green")}
                  {renderKpiCard("Conversations", metrics.conversations.value, metrics.conversations.trend, "number", MessageSquare, "blue")}
                  {renderKpiCard("Cost per Conversation", metrics.cost_per_conversation.value, metrics.cost_per_conversation.trend, "currency", Target, "purple")}
                  {renderKpiCard("Cost per Lead (CPL)", metrics.cpl.value, metrics.cpl.trend, "currency", Target, "purple")}
                  {renderKpiCard("Link Clicks", metrics.link_clicks.value, metrics.link_clicks.trend, "number", MousePointer, "blue")}
                  {renderKpiCard("Impressions", metrics.impressions.value, metrics.impressions.trend, "number", Eye, "orange")}
                </div>
              </div>
              
              <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-200">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 block">Secondary Lead Indicators</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
                  {renderKpiCard("CTR", metrics.ctr.value, metrics.ctr.trend, "percent", MousePointer, "blue")}
                  {renderKpiCard("CPC", metrics.cpc.value, metrics.cpc.trend, "currency", Target, "purple")}
                  {renderKpiCard("CPM", metrics.cpm.value, metrics.cpm.trend, "currency", Eye, "orange")}
                  {renderKpiCard("Reach", metrics.reach.value, metrics.reach.trend, "number", Users, "blue")}
                  {renderKpiCard("Frequency", metrics.frequency.value, metrics.frequency.trend, "multiplier", Activity, "orange")}
                  {renderKpiCard("Landing Page Views", metrics.landing_page_views.value, metrics.landing_page_views.trend, "number", Eye, "orange")}
                  {renderKpiCard("LPV Rate", metrics.lpv_rate.value, metrics.lpv_rate.trend, "percent", MousePointer, "blue")}
                </div>
              </div>
            </div>
          )}

          {goalFilter === "sales" && (
            <div className="space-y-6">
              <div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <ShoppingCart size={14} className="text-slate-400" />
                  <span>Sales & E-Commerce Performance KPIs</span>
                </div>
                <div className="kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                  {renderKpiCard("Spend", metrics.spend.value, metrics.spend.trend, "currency", DollarSign, "blue")}
                  {renderKpiCard("Purchases", metrics.purchases.value, metrics.purchases.trend, "number", ShoppingCart, "green")}
                  {renderKpiCard("Cost per Purchase (CPA)", metrics.cpa.value, metrics.cpa.trend, "currency", Target, "purple")}
                  {renderKpiCard("ROAS", metrics.roas.value, metrics.roas.trend, "multiplier", TrendingUp, "green")}
                  {renderKpiCard("Revenue", metrics.revenue.value, metrics.revenue.trend, "currency", DollarSign, "green")}
                </div>
              </div>

              <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-200">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 block">Checkout Funnel & Efficiency</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                  {renderKpiCard("Average Order Value", metrics.aov.value, metrics.aov.trend, "currency", RefreshCw, "green")}
                  {renderKpiCard("Add to Cart", metrics.add_to_cart.value, metrics.add_to_cart.trend, "number", ShoppingCart, "blue")}
                  {renderKpiCard("Initiate Checkout", metrics.initiate_checkout.value, metrics.initiate_checkout.trend, "number", Target, "purple")}
                  {renderKpiCard("Cost per Cart Add", metrics.cost_per_add_to_cart.value, metrics.cost_per_add_to_cart.trend, "currency", Target, "blue")}
                  {renderKpiCard("Cost per Checkout Init", metrics.cost_per_initiate_checkout.value, metrics.cost_per_initiate_checkout.trend, "currency", Target, "purple")}
                </div>
              </div>

              <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-200">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 block">Secondary Lead Indicators</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
                  {renderKpiCard("CTR", metrics.ctr.value, metrics.ctr.trend, "percent", MousePointer, "blue")}
                  {renderKpiCard("CPC", metrics.cpc.value, metrics.cpc.trend, "currency", Target, "purple")}
                  {renderKpiCard("CPM", metrics.cpm.value, metrics.cpm.trend, "currency", Eye, "orange")}
                  {renderKpiCard("Reach", metrics.reach.value, metrics.reach.trend, "number", Users, "blue")}
                  {renderKpiCard("Frequency", metrics.frequency.value, metrics.frequency.trend, "multiplier", Activity, "orange")}
                  {renderKpiCard("Landing Page Views", metrics.landing_page_views.value, metrics.landing_page_views.trend, "number", Eye, "orange")}
                  {renderKpiCard("LPV Rate", metrics.lpv_rate.value, metrics.lpv_rate.trend, "percent", MousePointer, "blue")}
                </div>
              </div>
            </div>
          )}

          {goalFilter === "engagement" && (
            <div className="space-y-6">
              <div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Activity size={14} className="text-slate-400" />
                  <span>Branding & Engagement Performance KPIs</span>
                </div>
                <div className="kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                  {renderKpiCard("Spend", metrics.spend.value, metrics.spend.trend, "currency", DollarSign, "blue")}
                  {renderKpiCard("Engagement Rate", metrics.engagement_rate.value, metrics.engagement_rate.trend, "percent", Activity, "blue")}
                  {renderKpiCard("Hook Rate", metrics.hook_rate.value, metrics.hook_rate.trend, "percent", Sparkles, "orange")}
                  {renderKpiCard("Impressions", metrics.impressions.value, metrics.impressions.trend, "number", Eye, "orange")}
                  {renderKpiCard("Reach", metrics.reach.value, metrics.reach.trend, "number", Users, "blue")}
                </div>
              </div>

              <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-200">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 block">Interactive Social Ratios</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                  {renderKpiCard("Post Engagement", metrics.post_engagement.value, metrics.post_engagement.trend, "number", Heart, "red")}
                  {renderKpiCard("Conversations", metrics.conversations.value, metrics.conversations.trend, "number", MessageSquare, "blue")}
                  {renderKpiCard("Cost per Conversation", metrics.cost_per_conversation.value, metrics.cost_per_conversation.trend, "currency", Target, "purple")}
                  {renderKpiCard("Video Views", metrics.video_views.value, metrics.video_views.trend, "number", Video, "blue")}
                  {renderKpiCard("ThruPlays", metrics.thruplays.value, metrics.thruplays.trend, "number", Video, "purple")}
                  {renderKpiCard("CPM", metrics.cpm.value, metrics.cpm.trend, "currency", Eye, "orange")}
                  {renderKpiCard("Frequency", metrics.frequency.value, metrics.frequency.trend, "multiplier", Activity, "orange")}
                </div>
              </div>

              {/* Social Breakdown Counters */}
              {metrics.comments && (
                <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-200">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 block">Social Engagement Breakdown</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg border border-slate-200 p-4 text-center">
                      <div className="text-2xl font-extrabold text-slate-800">{formatNumber(metrics.reactions?.value || 0)}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Reactions</div>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-4 text-center">
                      <div className="text-2xl font-extrabold text-slate-800">{formatNumber(metrics.comments?.value || 0)}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Comments</div>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-4 text-center">
                      <div className="text-2xl font-extrabold text-slate-800">{formatNumber(metrics.shares?.value || 0)}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Shares</div>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-4 text-center">
                      <div className="text-2xl font-extrabold text-slate-800">{formatNumber(metrics.saves?.value || 0)}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Saves</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Video Retention Funnel */}
              {metrics.video_retention && metrics.video_retention.video_starts > 0 && (metrics.video_retention.thruplay_rate > 0 || metrics.video_retention.video_25_rate > 0) && (
                <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-200">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 block">Video Watch Retention Funnel</span>
                  <div className="space-y-2">
                    {[
                      { label: "Video Starts", value: metrics.video_retention.video_starts, pct: 100 },
                      { label: "25% Watched", value: null, pct: metrics.video_retention.video_25_rate },
                      { label: "50% Watched", value: null, pct: metrics.video_retention.video_50_rate },
                      { label: "75% Watched", value: null, pct: metrics.video_retention.video_75_rate },
                      { label: "95% Watched", value: null, pct: metrics.video_retention.video_95_rate },
                      { label: "100% Watched", value: null, pct: metrics.video_retention.video_100_rate },
                      { label: "ThruPlay Rate", value: null, pct: metrics.video_retention.thruplay_rate },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-600 w-28 shrink-0">{item.label}</span>
                        <div className="flex-1 bg-slate-200 rounded-full h-4 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.min(item.pct, 100)}%`,
                              background: `linear-gradient(90deg, #6366f1, #8b5cf6)`
                            }}
                          />
                        </div>
                        <span className="text-xs font-extrabold text-slate-700 w-16 text-right">
                          {item.value !== null ? formatNumber(item.value) : (item.pct !== null && item.pct !== undefined) ? `${item.pct.toFixed(1)}%` : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Budget Health Panel — shown for all goal filters */}
          {metrics?.budget && (
            <div className="card border border-border bg-white shadow-sm rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">Budget Health</h3>
                <span className={`ml-auto text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                  metrics.budget.pacing_status === 'ON_TRACK' ? 'bg-green-50 text-green-700 border-green-200' :
                  metrics.budget.pacing_status === 'UNDERSPENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  metrics.budget.pacing_status === 'OVERSPENDING' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                  metrics.budget.pacing_status === 'CRITICALLY_OVERSPENDING' ? 'bg-red-50 text-red-700 border-red-200' :
                  'bg-slate-50 text-slate-500 border-slate-200'
                }`}>{metrics.budget.pacing_status.replace(/_/g, ' ')}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-lg font-extrabold text-slate-800">{formatCurrency(metrics.budget.expected_budget)}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Expected Budget</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-extrabold text-slate-800">{formatCurrency(metrics.budget.actual_spend)}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Actual Spend</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-extrabold text-slate-800">
                    {(metrics.budget.budget_utilization_percentage !== null && metrics.budget.budget_utilization_percentage !== undefined) ? `${metrics.budget.budget_utilization_percentage.toFixed(1)}%` : "—"}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Utilization</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-extrabold text-slate-800">
                    {(metrics.budget.pacing_percentage !== null && metrics.budget.pacing_percentage !== undefined) ? `${metrics.budget.pacing_percentage.toFixed(1)}%` : "—"}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Pacing</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-extrabold text-green-600">{formatCurrency(metrics.budget.remaining_budget)}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Remaining</div>
                </div>
              </div>
            </div>
          )}

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
                {recommendations.length === 0 ? (
                  <div className="p-8 text-center text-xs text-subtle font-medium">
                    No active AI recommendations generated yet. Sync your account data to compile recommendations.
                  </div>
                ) : (
                  recommendations.map((rec, idx) => {
                    const prio = (rec.priority || "").toLowerCase();
                    let Icon = Lightbulb;
                    let iconClass = "bg-blue-50 text-blue-600";
                    let badgeClass = "bg-blue-50 text-blue-700";
                    
                    if (prio === "critical") {
                      Icon = AlertTriangle;
                      iconClass = "bg-red-50 text-red-600";
                      badgeClass = "bg-red-50 text-red-700 border-red-100";
                    } else if (prio === "high") {
                      Icon = AlertTriangle;
                      iconClass = "bg-amber-50 text-amber-600";
                      badgeClass = "bg-amber-50 text-amber-700 border-amber-100";
                    } else if (prio === "medium") {
                      Icon = Lightbulb;
                      iconClass = "bg-yellow-50 text-yellow-600";
                      badgeClass = "bg-yellow-50 text-yellow-800 border-yellow-100";
                    } else if (prio === "low" || prio === "opportunity") {
                      Icon = Sparkles;
                      iconClass = "bg-green-50 text-green-600";
                      badgeClass = "bg-green-50 text-green-700 border-green-100";
                    }
                    
                    return (
                      <div key={rec.id || idx} className="recommendation-item flex items-start justify-between gap-4 p-4 border border-border rounded-lg hover:bg-slate-50 transition cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div className={`recommendation-icon ${iconClass} p-2 rounded-full shrink-0 flex items-center justify-center`}>
                            <Icon size={18} />
                          </div>
                          <div>
                            <div className="recommendation-title font-bold text-sm text-slate-800">{rec.title}</div>
                            <div className="recommendation-desc text-xs text-subtle font-medium mt-0.5">{rec.description}</div>
                          </div>
                        </div>
                        <span className={`recommendation-badge ${badgeClass} px-2 py-0.5 rounded text-[10px] font-bold shrink-0 uppercase tracking-wide border`}>
                          {rec.priority}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Performance Line Chart Card */}
            <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden" id="performance-chart">
              <div className="card-header border-b border-border p-6 flex justify-between items-center bg-slate-50/50">
                <h3 className="card-title font-bold text-slate-800 text-sm">Performance Overview</h3>
                <div className="tab-group flex border border-border rounded-md overflow-hidden bg-white">
                  {goalFilter === "all" && (
                    <>
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
                    </>
                  )}
                  {goalFilter === "sales" && (
                    <>
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
                    </>
                  )}
                  {goalFilter === "leads" && (
                    <>
                      <button 
                        onClick={() => setActiveChartTab("spend")}
                        className={`tab-item px-3 py-1.5 text-xs font-semibold transition ${activeChartTab === "spend" ? "bg-slate-100 text-slate-800" : "text-subtle hover:bg-slate-50"}`}
                      >
                        Spend
                      </button>
                      <button 
                        onClick={() => setActiveChartTab("leads")}
                        className={`tab-item px-3 py-1.5 text-xs font-semibold transition ${activeChartTab === "leads" ? "bg-slate-100 text-slate-800" : "text-subtle hover:bg-slate-50"}`}
                      >
                        Leads
                      </button>
                      <button 
                        onClick={() => setActiveChartTab("cpl")}
                        className={`tab-item px-3 py-1.5 text-xs font-semibold transition ${activeChartTab === "cpl" ? "bg-slate-100 text-slate-800" : "text-subtle hover:bg-slate-50"}`}
                      >
                        CPL
                      </button>
                    </>
                  )}
                  {goalFilter === "engagement" && (
                    <>
                      <button 
                        onClick={() => setActiveChartTab("spend")}
                        className={`tab-item px-3 py-1.5 text-xs font-semibold transition ${activeChartTab === "spend" ? "bg-slate-100 text-slate-800" : "text-subtle hover:bg-slate-50"}`}
                      >
                        Spend
                      </button>
                      <button 
                        onClick={() => setActiveChartTab("impressions")}
                        className={`tab-item px-3 py-1.5 text-xs font-semibold transition ${activeChartTab === "impressions" ? "bg-slate-100 text-slate-800" : "text-subtle hover:bg-slate-50"}`}
                      >
                        Impressions
                      </button>
                      <button 
                        onClick={() => setActiveChartTab("engagement_rate")}
                        className={`tab-item px-3 py-1.5 text-xs font-semibold transition ${activeChartTab === "engagement_rate" ? "bg-slate-100 text-slate-800" : "text-subtle hover:bg-slate-50"}`}
                      >
                        Engagement %
                      </button>
                    </>
                  )}
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
                        <th className="py-2.5 text-right">
                          {goalFilter === "leads" ? "Leads" : goalFilter === "engagement" ? "Conversations" : goalFilter === "sales" ? "Conversions" : "Results"}
                        </th>
                        <th className="py-2.5 text-right">
                          {goalFilter === "leads" ? "CPL" : goalFilter === "engagement" ? "Cost/Conv" : "ROAS/Efficiency"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-medium text-slate-700">
                      {campaigns.map((c, idx) => {
                        const campaignGoal = getCampaignGoalType(c);
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-3">
                              <Link
                                href={`/campaigns/${c.id}`}
                                className="font-bold text-primary hover:underline truncate max-w-[120px] block"
                              >
                                {c.name}
                              </Link>
                              <span className="text-[10px] text-green-600 bg-green-50 px-1 py-0.5 rounded font-bold uppercase mt-1 inline-block">
                                {c.status}
                              </span>
                            </td>
                            <td className="py-3 text-right">{formatCurrency(c.metrics.spend)}</td>
                            <td className="py-3 text-right">
                              {campaignGoal === "leads" ? c.metrics.leads : campaignGoal === "engagement" ? (c.metrics.conversations || 0) : c.metrics.purchases}
                            </td>
                            <td className="py-3 text-right text-green-600 font-bold">
                              {campaignGoal === "leads" ? (c.metrics.leads > 0 ? formatCurrency(c.metrics.spend / c.metrics.leads) : "—") :
                               campaignGoal === "engagement" ? (c.metrics.conversations > 0 ? formatCurrency(c.metrics.spend / c.metrics.conversations) : "—") :
                               (c.metrics.roas !== null && c.metrics.roas !== undefined) ? `${c.metrics.roas.toFixed(2)}x` : "—"}
                            </td>
                          </tr>
                        );
                      })}
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
                        <th className="py-2.5 text-right">
                          {goalFilter === "leads" ? "CPL" : goalFilter === "engagement" ? "Cost/Conv" : "ROAS/Efficiency"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-medium text-slate-700">
                      {ads.map((ad, idx) => {
                        const campaignName = (ad.campaign_name || "").toLowerCase();
                        let adGoal = "sales";
                        if (campaignName.includes("leads")) adGoal = "leads";
                        else if (campaignName.includes("engagement") || campaignName.includes("messaging") || campaignName.includes("workshop")) adGoal = "engagement";
                        
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-3">
                              <Link
                                href={`/ads?ad_id=${ad.id}`}
                                className="font-bold text-primary hover:underline truncate max-w-[120px] block"
                              >
                                {ad.name}
                              </Link>
                              <div className="text-[10px] text-slate-400 font-medium truncate max-w-[120px] mt-0.5">
                                {ad.campaign_name}
                              </div>
                            </td>
                            <td className="py-3 text-right">
                              {(ad.metrics.ctr !== null && ad.metrics.ctr !== undefined) ? formatPercent(ad.metrics.ctr) : "—"}
                            </td>
                            <td className="py-3 text-right">
                              {(ad.metrics.cpc !== null && ad.metrics.cpc !== undefined) ? formatCurrency(ad.metrics.cpc) : "—"}
                            </td>
                            <td className="py-3 text-right text-green-600 font-bold">
                              {adGoal === "leads" ? (ad.metrics.leads > 0 ? formatCurrency(ad.metrics.spend / ad.metrics.leads) : "—") :
                               adGoal === "engagement" ? (ad.metrics.conversations > 0 ? formatCurrency(ad.metrics.spend / ad.metrics.conversations) : "—") :
                               (ad.metrics.roas !== null && ad.metrics.roas !== undefined) ? `${ad.metrics.roas.toFixed(2)}x` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Health Score Circles Gauge — Upgraded with Sub-Scores */}
            {health && (
              <div className="card border border-border bg-white shadow-sm rounded-lg p-6">
                <h3 className="card-title font-bold text-slate-800 text-sm mb-4">Account Health Score</h3>
                <div className="flex flex-col items-center justify-center">
                  <div className="relative w-32 h-32 flex items-center justify-center mb-3">
                    <svg width="120" height="120" viewBox="0 0 120 120" className="absolute transform -rotate-90">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="var(--border)" strokeWidth="8" />
                      <circle
                        cx="60" cy="60" r="50" fill="none"
                        stroke={health.statusClass === "good" ? "var(--success)" : health.statusClass === "attention" ? "var(--warning)" : "var(--critical)"}
                        strokeWidth="8"
                        strokeDasharray={`${2 * Math.PI * 50 * (health.score / 100)} ${2 * Math.PI * 50 * (1 - health.score / 100)}`}
                        strokeLinecap="round" className="transition-all duration-500"
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
                    {health.grade || health.status} Rating
                  </span>

                  {/* Sub-Score Bars */}
                  {health.business_score !== undefined && (
                    <div className="w-full mt-5 space-y-2">
                      {[
                        { label: "Business", score: health.business_score },
                        { label: "Efficiency", score: health.efficiency_score },
                        { label: "Creative", score: health.creative_score },
                        { label: "Budget", score: health.budget_score },
                        { label: "Stability", score: health.stability_score },
                        { label: "Data Quality", score: health.data_quality_score },
                      ].map((sub, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 w-20 shrink-0">{sub.label}</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{
                              width: `${sub.score}%`,
                              background: sub.score >= 80 ? '#22c55e' : sub.score >= 50 ? '#f59e0b' : '#ef4444'
                            }} />
                          </div>
                          <span className="text-[10px] font-extrabold text-slate-600 w-8 text-right">{sub.score}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Positive / Negative Factors */}
                  {health.positive_factors && health.positive_factors.length > 0 && (
                    <div className="w-full mt-4">
                      <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Strengths</span>
                      <ul className="mt-1 space-y-0.5">
                        {health.positive_factors.slice(0, 3).map((f: string, i: number) => (
                          <li key={i} className="text-[11px] text-slate-600 flex items-start gap-1">
                            <CheckCircle2 size={12} className="text-green-500 mt-0.5 shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {health.negative_factors && health.negative_factors.length > 0 && (
                    <div className="w-full mt-3">
                      <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Issues</span>
                      <ul className="mt-1 space-y-0.5">
                        {health.negative_factors.slice(0, 3).map((f: string, i: number) => (
                          <li key={i} className="text-[11px] text-slate-600 flex items-start gap-1">
                            <AlertTriangle size={12} className="text-red-400 mt-0.5 shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="w-full mt-5 divide-y divide-border text-xs border-t border-border">
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
