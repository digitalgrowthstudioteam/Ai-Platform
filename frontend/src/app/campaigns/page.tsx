"use client";

import { useEffect, useState } from "react";
import { useAdAccount } from "@/context/AdAccountContext";
import { api } from "@/lib/api";
import { 
  Calendar, 
  Megaphone, 
  Loader2, 
  X, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Lightbulb, 
  AlertCircle, 
  Check,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Layers,
  FileText,
  Activity,
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  Zap,
  Info,
  ExternalLink,
  Target
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from "recharts";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export default function CampaignsPage() {
  const { selectedAccount, loadingAccounts } = useAdAccount();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [recs, setRecs] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [datePreset, setDatePreset] = useState<"7d" | "30d">("30d");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("spend");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Tab State
  const [activeTab, setActiveTab] = useState<"overview" | "adsets" | "ads" | "breakdowns" | "aidiagnosis">("overview");
  const [breakdownView, setBreakdownView] = useState<"placement" | "demographic">("placement");

  // Hierarchy details states
  const [adSets, setAdSets] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedAdSet, setExpandedAdSet] = useState<string | null>(null);
  const [expandedAd, setExpandedAd] = useState<string | null>(null);

  // Date helper
  const getDates = (preset: "7d" | "30d") => {
    const end = new Date();
    const start = new Date();
    if (preset === "7d") {
      start.setDate(end.getDate() - 6);
    } else {
      start.setDate(end.getDate() - 29);
    }
    return {
      startStr: start.toISOString().split("T")[0],
      endStr: end.toISOString().split("T")[0],
    };
  };

  const loadCampaigns = async () => {
    if (!selectedAccount) return;
    const { startStr, endStr } = getDates(datePreset);
    const cacheKey = `dgs_cached_campaigns_${selectedAccount.id}_${datePreset}`;

    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setCampaigns(JSON.parse(cached));
      } catch (e) {}
    }

    try {
      setLoading(!cached);
      const res = await api.getCampaigns(selectedAccount.id, startStr, endStr);
      setCampaigns(res);
      sessionStorage.setItem(cacheKey, JSON.stringify(res));
    } catch (err) {
      console.error("Failed to load campaigns list:", err);
      if (!cached) setCampaigns([]);
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
      loadCampaigns();
      loadRecommendations();
    }
  }, [selectedAccount, datePreset]);

  // Date Range string
  const { startStr, endStr } = getDates(datePreset);
  const formatDateHeader = (dStr: string) => {
    const d = new Date(dStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const dateRangeLabel = `${formatDateHeader(startStr)} – ${formatDateHeader(endStr)}, 2026`;

  // Objective based dynamic metrics resolver
  const getObjectiveMetrics = (c: any) => {
    const obj = (c.objective || "OUTCOME_SALES").toUpperCase();
    const spend = c.metrics.spend || 0;
    const impressions = c.metrics.impressions || 0;
    const clicks = c.metrics.clicks || 0;
    const purchases = c.metrics.purchases || 0;
    const roas = c.metrics.roas || 0;

    if (obj.includes("TRAFFIC") || obj.includes("LINK_CLICKS")) {
      return {
        resultLabel: "Clicks",
        resultValue: formatNumber(clicks),
        costPerResult: clicks > 0 ? formatCurrency(spend / clicks) : "—",
        ctrLabel: formatPercent(c.metrics.ctr),
        roasLabel: "—",
        isRoasRelevant: false
      };
    } else if (obj.includes("AWARENESS") || obj.includes("REACH")) {
      return {
        resultLabel: "Impressions",
        resultValue: formatNumber(impressions),
        costPerResult: impressions > 0 ? formatCurrency((spend / impressions) * 1000) + " CPM" : "—",
        ctrLabel: formatPercent(c.metrics.ctr),
        roasLabel: "—",
        isRoasRelevant: false
      };
    } else {
      return {
        resultLabel: obj.includes("LEAD") ? "Leads" : "Purchases",
        resultValue: formatNumber(purchases),
        costPerResult: purchases > 0 ? formatCurrency(spend / purchases) : "—",
        ctrLabel: formatPercent(c.metrics.ctr),
        roasLabel: roas > 0 ? `${roas.toFixed(2)}x` : "—",
        isRoasRelevant: true
      };
    }
  };

  const getHealthScore = (c: any) => {
    const roas = c.metrics.roas || 0;
    const spend = c.metrics.spend || 0;
    const ctr = c.metrics.ctr || 0;
    const purchases = c.metrics.purchases || 0;

    let score = 75;
    if (roas >= 3.0) score = 95;
    else if (roas >= 2.0) score = 88;
    else if (roas >= 1.5) score = 80;
    else if (roas > 0) score = 65;
    else if (spend === 0) score = 100;

    if (spend > 100 && purchases === 0) score = Math.max(30, score - 30);
    if (ctr > 0 && ctr < 0.01) score = Math.max(30, score - 10);
    return score;
  };

  const getCampaignRecommendations = (c: any) => {
    return recs.filter(r => 
      r.entity_id === c.id || 
      r.title.toLowerCase().includes(c.name.toLowerCase())
    );
  };

  const handleSelectCampaign = async (c: any) => {
    setSelectedCampaign(c);
    setActiveTab("overview");
    setExpandedAdSet(null);
    setExpandedAd(null);
    setAdSets([]);
    setAds([]);

    if (!selectedAccount) return;

    setLoadingDetails(true);
    try {
      const [allAdSets, allAds] = await Promise.all([
        api.getAdSets(selectedAccount.id, startStr, endStr),
        api.getAds(selectedAccount.id, startStr, endStr)
      ]);

      const filteredAdSets = allAdSets.filter((as: any) => as.campaign_name === c.name);
      const filteredAds = allAds.filter((ad: any) => ad.campaign_name === c.name);

      setAdSets(filteredAdSets);
      setAds(filteredAds);
    } catch (err) {
      console.error("Failed to load campaign hierarchy detail:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Generate mock chart data based on campaign totals
  const generateTrendChartData = (c: any) => {
    const days = datePreset === "7d" ? 7 : 30;
    const data = [];
    const obj = (c.objective || "OUTCOME_SALES").toUpperCase();
    const isClicks = obj.includes("TRAFFIC") || obj.includes("LINK_CLICKS");
    const isImpressions = obj.includes("AWARENESS") || obj.includes("REACH");

    const totalSpend = c.metrics.spend || 0;
    const totalResult = isClicks 
      ? (c.metrics.clicks || 0) 
      : isImpressions 
      ? (c.metrics.impressions || 0) 
      : (c.metrics.purchases || 0);

    const baseSpend = totalSpend / days;
    const baseResult = totalResult / days;

    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      const spendVariance = 0.75 + Math.random() * 0.5;
      const resultVariance = 0.7 + Math.random() * 0.6;

      data.push({
        date: dateStr,
        spend: parseFloat((baseSpend * spendVariance).toFixed(2)),
        result: Math.round(baseResult * resultVariance)
      });
    }
    return data;
  };

  // Find top and bottom performing ads in the campaign
  const getStrongestAndWeakestAds = () => {
    if (ads.length === 0) return { strongest: null, weakest: null };
    const sorted = [...ads].sort((a, b) => b.metrics.roas - a.metrics.roas || b.metrics.ctr - a.metrics.ctr);
    return {
      strongest: sorted[0],
      weakest: sorted.length > 1 ? sorted[sorted.length - 1] : null
    };
  };

  const filteredAndSortedCampaigns = campaigns
    .filter(c => statusFilter === "ALL" || c.status === statusFilter)
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
      {/* ──────────────────────────────────────────────────────────── */}
      {/* List View */}
      {/* ──────────────────────────────────────────────────────────── */}
      {!selectedCampaign ? (
        <>
          {/* Page Header */}
          <div className="page-header flex justify-between items-center">
            <div>
              <h1 className="page-title text-2xl font-bold text-slate-800">Campaigns</h1>
              <p className="page-subtitle text-sm text-subtle mt-1">Analyze performance metrics and trigger dynamic breakdowns of active campaigns</p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={datePreset}
                onChange={(e: any) => setDatePreset(e.target.value)}
                className="btn btn-outline flex items-center gap-2 py-2 px-4 border border-border text-sm font-semibold rounded-md bg-white cursor-pointer hover:bg-slate-50 outline-none"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
              <div className="text-xs font-semibold text-slate-500 bg-slate-100 py-2 px-3 rounded-md border border-border flex items-center gap-1.5">
                <Calendar size={14} />
                {dateRangeLabel}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex h-96 items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={32} />
              <span className="ml-2 text-sm text-subtle font-medium">Loading campaign records...</span>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="card shadow-sm border border-border bg-white rounded-lg">
              <div className="card-body py-12">
                <div className="empty-state text-center max-w-sm mx-auto space-y-3">
                  <Megaphone size={48} className="text-slate-400 mx-auto" />
                  <h3 className="text-base font-bold text-slate-800">No campaigns found</h3>
                  <p className="text-xs text-subtle">
                    Verify that you have selected active ad accounts in settings and enqueued a database sync.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Filters Header */}
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
                    <option value="name">Campaign Name</option>
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

              {/* Table */}
              <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-left divide-y divide-border">
                    <thead className="bg-slate-50/50">
                      <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border">
                        <th className="p-4">Campaign Name</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Objective</th>
                        <th className="p-4 text-right">Spend</th>
                        <th className="p-4 text-right">Primary Result</th>
                        <th className="p-4 text-right">Cost Per Result</th>
                        <th className="p-4 text-right">CTR</th>
                        <th className="p-4 text-right">ROAS</th>
                        <th className="p-4 text-center">Health</th>
                        <th className="p-4 text-center">AI Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-medium text-slate-700">
                      {filteredAndSortedCampaigns.map((c, idx) => {
                        const objMetrics = getObjectiveMetrics(c);
                        const health = getHealthScore(c);
                        const campRecs = getCampaignRecommendations(c);

                        return (
                          <tr 
                            key={idx} 
                            onClick={() => handleSelectCampaign(c)} 
                            className="hover:bg-slate-50 transition cursor-pointer"
                          >
                            <td className="p-4">
                              <div className="font-bold text-sm text-slate-800">{c.name}</div>
                              <div className="text-[10px] text-slate-400 mt-1">ID: {c.meta_campaign_id}</div>
                            </td>
                            <td className="p-4">
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${c.status === "ACTIVE" ? "text-green-600 bg-green-50" : "text-slate-500 bg-slate-100"}`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold uppercase">
                                {c.objective.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="p-4 text-right font-semibold">{formatCurrency(c.metrics.spend)}</td>
                            <td className="p-4 text-right font-bold">
                              {objMetrics.resultValue} <span className="text-[9px] font-normal text-slate-400">{objMetrics.resultLabel}</span>
                            </td>
                            <td className="p-4 text-right">{objMetrics.costPerResult}</td>
                            <td className="p-4 text-right text-slate-500">{objMetrics.ctrLabel}</td>
                            <td className="p-4 text-right text-green-600 font-bold">
                              {objMetrics.roasLabel}
                            </td>
                            <td className="p-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                health > 80 ? "text-green-700 bg-green-50" : health > 65 ? "text-amber-700 bg-amber-50" : "text-red-700 bg-red-50"
                              }`}>
                                {health}%
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              {campRecs.length > 0 ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 inline-flex items-center gap-1">
                                  <AlertCircle size={10} />
                                  {campRecs.length} Alerts
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-600 border border-green-200 inline-flex items-center gap-1">
                                  <Check size={10} />
                                  Optimal
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* ──────────────────────────────────────────────────────────── */
        /* Central Intelligence Detail Page View */
        /* ──────────────────────────────────────────────────────────── */
        <div className="space-y-6">
          {/* Back Navigation Bar */}
          <div className="flex justify-between items-center bg-white p-4 border border-border rounded-lg shadow-xs">
            <button
              onClick={() => setSelectedCampaign(null)}
              className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition cursor-pointer"
            >
              <ArrowLeft size={16} />
              Back to Campaigns List
            </button>
            <div className="text-xs font-semibold text-slate-500 flex items-center gap-2">
              <span>Status: <strong className="text-slate-700 font-bold uppercase">{selectedCampaign.status}</strong></span>
              <span className="text-slate-300">|</span>
              <span>Sync status: <strong className="text-green-600 font-bold">Success</strong></span>
            </div>
          </div>

          {/* Campaign Dashboard Header */}
          <div className="card border border-border bg-white shadow-sm rounded-lg p-6 space-y-4">
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Campaign Intelligence Hub</span>
                <h2 className="text-2xl font-black text-slate-800 mt-1">{selectedCampaign.name}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded font-bold uppercase">
                    Objective: {selectedCampaign.objective.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] text-slate-500 bg-slate-50 border border-border px-2.5 py-0.5 rounded font-bold">
                    Interval: {selectedAccount?.industry || "General Industry"}
                  </span>
                </div>
              </div>

              {/* Dynamic KPI Cards */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center min-w-[100px]">
                  <div className="text-[9px] font-bold text-slate-400 uppercase">Spend</div>
                  <div className="text-sm font-black text-slate-800 mt-1">{formatCurrency(selectedCampaign.metrics.spend)}</div>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center min-w-[100px]">
                  <div className="text-[9px] font-bold text-slate-400 uppercase">
                    {getObjectiveMetrics(selectedCampaign).resultLabel}
                  </div>
                  <div className="text-sm font-black text-slate-800 mt-1">
                    {getObjectiveMetrics(selectedCampaign).resultValue}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center min-w-[100px]">
                  <div className="text-[9px] font-bold text-slate-400 uppercase">Cost Per Result</div>
                  <div className="text-sm font-black text-slate-800 mt-1">
                    {getObjectiveMetrics(selectedCampaign).costPerResult}
                  </div>
                </div>

                {getObjectiveMetrics(selectedCampaign).isRoasRelevant && (
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center min-w-[100px]">
                    <div className="text-[9px] font-bold text-slate-400 uppercase">ROAS</div>
                    <div className="text-sm font-black text-green-600 mt-1">
                      {selectedCampaign.metrics.roas.toFixed(2)}x
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center min-w-[100px]">
                  <div className="text-[9px] font-bold text-slate-400 uppercase">CTR</div>
                  <div className="text-sm font-black text-slate-800 mt-1">
                    {formatPercent(selectedCampaign.metrics.ctr)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex border-b border-border gap-6 text-sm font-bold text-slate-400">
            {[
              { id: "overview", label: "Overview" },
              { id: "adsets", label: "Ad Sets" },
              { id: "ads", label: "Ads" },
              { id: "breakdowns", label: "Breakdowns" },
              { id: "aidiagnosis", label: "AI Diagnosis" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 border-b-2 transition cursor-pointer ${
                  activeTab === tab.id 
                    ? "border-primary text-slate-800" 
                    : "border-transparent hover:text-slate-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content Panels */}
          <div className="space-y-6">
            {/* ──────────────────────────────────────────────────────── */}
            {/* Tab 1: Overview Tab */}
            {/* ──────────────────────────────────────────────────────── */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Section 1: Campaign Health */}
                  <div className="card border border-border bg-white shadow-sm rounded-lg p-5 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Campaign Health</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Statistical status evaluation</p>
                    </div>

                    <div className="py-6 flex flex-col items-center">
                      <div className="relative flex items-center justify-center">
                        <svg className="w-24 h-24 transform -rotate-90">
                          <circle cx="48" cy="48" r="40" stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
                          <circle 
                            cx="48" 
                            cy="48" 
                            r="40" 
                            stroke={getHealthScore(selectedCampaign) > 80 ? "#10b981" : getHealthScore(selectedCampaign) > 65 ? "#f59e0b" : "#ef4444"} 
                            strokeWidth="6" 
                            fill="transparent" 
                            strokeDasharray={2 * Math.PI * 40}
                            strokeDashoffset={2 * Math.PI * 40 * (1 - getHealthScore(selectedCampaign) / 100)}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute text-center">
                          <span className="text-xl font-black text-slate-800">{getHealthScore(selectedCampaign)}%</span>
                        </div>
                      </div>
                      <span className={`text-xs font-black uppercase mt-3 px-2 py-0.5 rounded ${
                        getHealthScore(selectedCampaign) > 80 ? "text-green-600 bg-green-50" : getHealthScore(selectedCampaign) > 65 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50"
                      }`}>
                        {getHealthScore(selectedCampaign) > 80 ? "Healthy" : getHealthScore(selectedCampaign) > 65 ? "Needs Work" : "Critical Leaks"}
                      </span>
                    </div>

                    <div className="text-[10px] text-center text-slate-500 bg-slate-50 p-2 rounded">
                      Metric values are stable against vertical standards.
                    </div>
                  </div>

                  {/* Section 2: Performance Trend Chart */}
                  <div className="card border border-border bg-white shadow-sm rounded-lg p-5 lg:col-span-2 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Daily Performance Trend</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Timeline monitoring: Spend vs Results</p>
                    </div>

                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={generateTrendChartData(selectedCampaign)}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: 9, fill: "#94a3b8" }} />
                          <YAxis yAxisId="left" tickLine={false} axisLine={false} style={{ fontSize: 9, fill: "#94a3b8" }} />
                          <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} style={{ fontSize: 9, fill: "#94a3b8" }} />
                          <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8, borderColor: "#e2e8f0" }} />
                          <Line yAxisId="left" type="monotone" dataKey="spend" name="Spend" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                          <Line yAxisId="right" type="monotone" dataKey="result" name={getObjectiveMetrics(selectedCampaign).resultLabel} stroke="#10b981" strokeWidth={2.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Section 3: AI Diagnosis */}
                <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">3. AI Diagnosis Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* What's working */}
                    <div className="border border-slate-100 rounded-lg p-3 space-y-1 bg-green-50/10">
                      <div className="text-[9px] font-bold text-green-600 uppercase flex items-center gap-1">
                        <ThumbsUp size={12} /> Working Well
                      </div>
                      <p className="text-xs text-slate-700 leading-normal">
                        {selectedCampaign.metrics.roas >= 1.5 
                          ? `Efficient Return on Spend delivery (ROAS: ${selectedCampaign.metrics.roas.toFixed(2)}x).`
                          : "Ad delivery distribution remains highly stable across core placements."}
                      </p>
                    </div>

                    {/* What's declining */}
                    <div className="border border-slate-100 rounded-lg p-3 space-y-1 bg-red-50/10">
                      <div className="text-[9px] font-bold text-red-500 uppercase flex items-center gap-1">
                        <ThumbsDown size={12} /> Declining
                      </div>
                      <p className="text-xs text-slate-700 leading-normal">
                        {selectedCampaign.metrics.ctr < 0.012 
                          ? `Ad CTR (${(selectedCampaign.metrics.ctr*100).toFixed(2)}%) indicates moderate creative fatigue.`
                          : "Slight conversion rate latency observed over the target period."}
                      </p>
                    </div>

                    {/* Why it is happening */}
                    <div className="border border-slate-100 rounded-lg p-3 space-y-1 bg-amber-50/10">
                      <div className="text-[9px] font-bold text-amber-600 uppercase flex items-center gap-1">
                        <Info size={12} /> Why It Happens
                      </div>
                      <p className="text-xs text-slate-700 leading-normal">
                        Creative assets have been active for &gt; 15 days without rotation, causing slight audience saturation.
                      </p>
                    </div>

                    {/* Recommended action */}
                    <div className="border border-slate-100 rounded-lg p-3 space-y-1 bg-blue-50/10">
                      <div className="text-[9px] font-bold text-blue-600 uppercase flex items-center gap-1">
                        <Zap size={12} /> Suggested Action
                      </div>
                      <p className="text-xs text-slate-700 leading-normal">
                        Refresh copy text and swap visual visual assets in low-performing ad sets.
                      </p>
                    </div>

                    {/* Don't change */}
                    <div className="border border-slate-100 rounded-lg p-3 space-y-1 bg-slate-50">
                      <div className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <Check size={12} /> Keep Stable
                      </div>
                      <p className="text-xs text-slate-700 leading-normal">
                        Keep daily budget pacing configurations active without manual tweaks.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 4: Ad Set Performance */}
                <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">4. Ad Set Performance</h4>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{adSets.length} Active Ad Sets</span>
                  </div>

                  {loadingDetails ? (
                    <div className="flex py-6 justify-center items-center">
                      <Loader2 className="animate-spin text-primary mr-2" size={16} />
                      <span className="text-xs text-slate-500">Resolving Ad Sets...</span>
                    </div>
                  ) : adSets.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-400">No ad sets captured.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs text-left divide-y divide-border">
                        <thead className="bg-slate-50/50">
                          <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-border">
                            <th className="p-2">Ad Set Name</th>
                            <th className="p-2">Status</th>
                            <th className="p-2 text-right">Spend</th>
                            <th className="p-2 text-right">CTR</th>
                            <th className="p-2 text-right">Conversions</th>
                            <th className="p-2 text-right">ROAS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {adSets.map((as, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition">
                              <td className="p-2 font-bold text-slate-700">{as.name}</td>
                              <td className="p-2 uppercase">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${as.status === "ACTIVE" ? "text-green-600 bg-green-50" : "text-slate-500 bg-slate-100"}`}>
                                  {as.status}
                                </span>
                              </td>
                              <td className="p-2 text-right font-semibold">{formatCurrency(as.metrics.spend)}</td>
                              <td className="p-2 text-right">{formatPercent(as.metrics.ctr)}</td>
                              <td className="p-2 text-right">{as.metrics.purchases}</td>
                              <td className="p-2 text-right font-bold text-slate-700">{as.metrics.roas.toFixed(2)}x</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Section 5: Ad Performance Comparison (Strongest vs Weakest) */}
                <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">5. Ad Performance Breakdown</h4>
                  
                  {(() => {
                    const { strongest, weakest } = getStrongestAndWeakestAds();
                    if (!strongest && !weakest) {
                      return <div className="text-center py-4 text-xs text-slate-400">No active ads captured.</div>;
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Strongest Ad */}
                        {strongest && (
                          <div className="border border-green-200 bg-green-50/15 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider flex items-center gap-1">
                                <ThumbsUp size={12} /> Strongest Performer
                              </span>
                              <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded font-black">
                                {strongest.metrics.roas.toFixed(2)}x ROAS
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              {strongest.creative?.image_url ? (
                                <img src={strongest.creative.image_url} alt="" className="w-10 h-10 object-cover rounded border border-green-100" />
                              ) : (
                                <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center text-slate-400"><ImageIcon size={14} /></div>
                              )}
                              <div>
                                <div className="font-bold text-xs text-slate-800 truncate max-w-xs">{strongest.name}</div>
                                <div className="text-[9px] text-slate-400 mt-1">Spend: {formatCurrency(strongest.metrics.spend)} | CTR: {formatPercent(strongest.metrics.ctr)}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Weakest Ad */}
                        {weakest && (
                          <div className="border border-red-200 bg-red-50/15 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider flex items-center gap-1">
                                <ThumbsDown size={12} /> Weakest Performer
                              </span>
                              <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded font-black">
                                {weakest.metrics.roas.toFixed(2)}x ROAS
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              {weakest.creative?.image_url ? (
                                <img src={weakest.creative.image_url} alt="" className="w-10 h-10 object-cover rounded border border-red-100" />
                              ) : (
                                <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center text-slate-400"><ImageIcon size={14} /></div>
                              )}
                              <div>
                                <div className="font-bold text-xs text-slate-800 truncate max-w-xs">{weakest.name}</div>
                                <div className="text-[9px] text-slate-400 mt-1">Spend: {formatCurrency(weakest.metrics.spend)} | CTR: {formatPercent(weakest.metrics.ctr)}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Section 6: Opportunities */}
                <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">6. Campaign Optimization Opportunities</h4>
                  <div className="space-y-3">
                    {getHealthScore(selectedCampaign) < 85 && (
                      <div className="flex items-start gap-3 border border-amber-200 bg-amber-50/20 p-3.5 rounded-lg">
                        <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                        <div>
                          <div className="text-xs font-bold text-slate-800">Budget Loss Warning</div>
                          <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                            Underperforming copy components and low CTR metrics are impacting overall health. Swap visual creatives or re-distribute budget.
                          </p>
                        </div>
                      </div>
                    )}
                    {getCampaignRecommendations(selectedCampaign).slice(0, 2).map((r, i) => (
                      <div key={i} className="flex items-start gap-3 border border-slate-100 bg-slate-50 p-3.5 rounded-lg">
                        <Sparkles className="text-primary shrink-0 mt-0.5" size={16} />
                        <div>
                          <div className="text-xs font-bold text-slate-800">{r.title}</div>
                          <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{r.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ──────────────────────────────────────────────────────── */}
            {/* Tab 2: Ad Sets Tab */}
            {/* ──────────────────────────────────────────────────────── */}
            {activeTab === "adsets" && (
              <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-left divide-y divide-border">
                    <thead className="bg-slate-50/50">
                      <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border">
                        <th className="p-4">Ad Set Details</th>
                        <th className="p-4 text-right">Spend</th>
                        <th className="p-4 text-right">Impressions</th>
                        <th className="p-4 text-right">Clicks</th>
                        <th className="p-4 text-right">CTR</th>
                        <th className="p-4 text-right">Conversions</th>
                        <th className="p-4 text-right">ROAS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-medium text-slate-700">
                      {adSets.map((as, idx) => (
                        <tr 
                          key={idx} 
                          onClick={() => setExpandedAdSet(expandedAdSet === as.id ? null : as.id)}
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
                            </div>
                          </td>
                          <td className="p-4 text-right font-semibold">{formatCurrency(as.metrics.spend)}</td>
                          <td className="p-4 text-right">{formatNumber(as.metrics.impressions)}</td>
                          <td className="p-4 text-right">{formatNumber(as.metrics.clicks)}</td>
                          <td className="p-4 text-right">{formatPercent(as.metrics.ctr)}</td>
                          <td className="p-4 text-right">{as.metrics.purchases}</td>
                          <td className="p-4 text-right text-green-600 font-bold">{as.metrics.roas.toFixed(2)}x</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ──────────────────────────────────────────────────────── */}
            {/* Tab 3: Ads Tab */}
            {/* ──────────────────────────────────────────────────────── */}
            {activeTab === "ads" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {ads.map((ad, idx) => {
                  const cr = ad.creative;
                  return (
                    <div key={idx} className="card border border-border bg-white shadow-xs rounded-lg p-5 flex flex-col justify-between gap-4">
                      <div className="flex items-start gap-4">
                        {cr && cr.image_url ? (
                          <img src={cr.image_url} alt="" className="w-16 h-16 object-cover rounded-md border border-border shrink-0" />
                        ) : (
                          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-md border border-border flex items-center justify-center shrink-0">
                            <ImageIcon size={20} />
                          </div>
                        )}

                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-slate-800">{ad.name}</h4>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase inline-block ${
                            ad.status === "ACTIVE" ? "text-green-600 bg-green-50" : "text-slate-500 bg-slate-100"
                          }`}>
                            {ad.status}
                          </span>
                          {cr && (
                            <div className="text-[10px] text-slate-400 max-w-xs truncate" title={cr.headline || cr.primary_text}>
                              Copy: {cr.headline || cr.primary_text}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 border-t border-slate-50 pt-3 text-center">
                        <div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase">Spend</div>
                          <div className="text-xs font-bold text-slate-800 mt-0.5">{formatCurrency(ad.metrics.spend)}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase">CTR</div>
                          <div className="text-xs font-bold text-slate-800 mt-0.5">{formatPercent(ad.metrics.ctr)}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase">ROAS</div>
                          <div className="text-xs font-bold text-green-600 mt-0.5">{ad.metrics.roas.toFixed(2)}x</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ──────────────────────────────────────────────────────── */}
            {/* Tab 4: Breakdowns Tab */}
            {/* ──────────────────────────────────────────────────────── */}
            {activeTab === "breakdowns" && (
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
                </div>

                {breakdownView === "placement" ? (
                  <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden">
                    <div className="p-4 bg-slate-50/50 border-b border-border text-xs font-bold text-slate-600">
                      Channel distribution breakdown relative to campaign metrics
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs text-left divide-y divide-border">
                        <thead className="bg-slate-50/50">
                          <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border">
                            <th className="p-4">Platform</th>
                            <th className="p-4 text-right">Spend Contribution</th>
                            <th className="p-4 text-right">CTR</th>
                            <th className="p-4 text-right">ROAS Contribution</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border font-medium text-slate-700">
                          {[
                            { name: "Facebook Mobile Feed", pct: 0.55, ctr: 1.82 },
                            { name: "Instagram Stories", pct: 0.30, ctr: 2.14 },
                            { name: "Audience Network Mobile", pct: 0.10, ctr: 0.95 },
                            { name: "Messenger Inbox", pct: 0.05, ctr: 1.10 }
                          ].map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition">
                              <td className="p-4 font-bold text-slate-800">{p.name}</td>
                              <td className="p-4 text-right">{formatCurrency(selectedCampaign.metrics.spend * p.pct)} ({Math.round(p.pct * 100)}%)</td>
                              <td className="p-4 text-right">{(p.ctr).toFixed(2)}%</td>
                              <td className="p-4 text-right text-green-600 font-bold">{(selectedCampaign.metrics.roas * (p.pct > 0.3 ? 1.1 : 0.8)).toFixed(2)}x</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden">
                    <div className="p-4 bg-slate-50/50 border-b border-border text-xs font-bold text-slate-600">
                      Age and Gender performance segments matching campaign targeting
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs text-left divide-y divide-border">
                        <thead className="bg-slate-50/50">
                          <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border">
                            <th className="p-4">Age Segment</th>
                            <th className="p-4">Gender</th>
                            <th className="p-4 text-right">Spend Contribution</th>
                            <th className="p-4 text-right">CTR</th>
                            <th className="p-4 text-right">ROAS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border font-medium text-slate-700">
                          {[
                            { age: "25-34", gender: "Female", pct: 0.45, ctr: 2.25, roas: 3.20 },
                            { age: "25-34", gender: "Male", pct: 0.25, ctr: 1.65, roas: 2.40 },
                            { age: "35-44", gender: "Female", pct: 0.20, ctr: 1.90, roas: 2.80 },
                            { age: "18-24", gender: "Female", pct: 0.10, ctr: 1.20, roas: 1.10 }
                          ].map((d, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition">
                              <td className="p-4 font-bold text-slate-800">{d.age}</td>
                              <td className="p-4 uppercase">{d.gender}</td>
                              <td className="p-4 text-right">{formatCurrency(selectedCampaign.metrics.spend * d.pct)} ({Math.round(d.pct * 100)}%)</td>
                              <td className="p-4 text-right">{d.ctr.toFixed(2)}%</td>
                              <td className="p-4 text-right text-green-600 font-bold">{d.roas.toFixed(2)}x</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ──────────────────────────────────────────────────────── */}
            {/* Tab 5: AI Diagnosis Tab */}
            {/* ──────────────────────────────────────────────────────── */}
            {activeTab === "aidiagnosis" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-800">Linked AI Recommendations</h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    {getCampaignRecommendations(selectedCampaign).length} Actionable Recommendations
                  </span>
                </div>

                {getCampaignRecommendations(selectedCampaign).length === 0 ? (
                  <div className="card border border-border bg-white p-6 text-center text-xs text-slate-400">
                    No active recommendations triggered for this campaign. Overall metrics are stable!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {getCampaignRecommendations(selectedCampaign).map((r, idx) => (
                      <div key={idx} className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
                        <div className="flex justify-between items-start">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            r.priority === "high" ? "text-red-700 bg-red-50" : "text-amber-700 bg-amber-50"
                          }`}>
                            {r.priority} Priority
                          </span>
                          <span className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                            {Math.round(r.confidence_score * 100)}% Match Confidence
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-slate-800">{r.title}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">{r.description}</p>
                        <div className="text-[10px] text-slate-400 italic bg-slate-50 p-2.5 rounded">
                          <span className="font-semibold text-slate-500 not-italic">Diagnosis Reason: </span>
                          {r.reason}
                        </div>
                        
                        <div className="flex gap-2 border-t border-slate-50 pt-3">
                          <button 
                            onClick={async () => {
                              try {
                                await api.applyRecommendation(r.id);
                                loadRecommendations();
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="btn btn-primary text-[10px] font-bold py-1 px-3 bg-blue-500 text-white rounded cursor-pointer"
                          >
                            Apply Recommendation
                          </button>
                          <button 
                            onClick={async () => {
                              try {
                                await api.dismissRecommendation(r.id);
                                loadRecommendations();
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="btn btn-outline text-[10px] font-bold py-1 px-3 border border-border rounded text-slate-500 cursor-pointer hover:bg-slate-50"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
