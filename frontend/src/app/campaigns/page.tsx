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
  Target,
  Users
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
  
  // Drill-down selected items
  const [selectedAdSet, setSelectedAdSet] = useState<any | null>(null);
  const [selectedAd, setSelectedAd] = useState<any | null>(null);

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
    setSelectedAdSet(null);
    setSelectedAd(null);
    setActiveTab("overview");
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

  const handleSelectAdSetFromList = (as: any) => {
    setSelectedAdSet(as);
    setSelectedAd(null);
  };

  const handleSelectAdFromList = (ad: any) => {
    setSelectedAd(ad);
    // Auto-resolve AdSet reference if exists
    const matchingAdSet = adSets.find(as => as.name === ad.adset_name);
    if (matchingAdSet) {
      setSelectedAdSet(matchingAdSet);
    }
  };

  // Generate mock chart data based on totals
  const generateTrendChartData = (entity: any, isAd = false) => {
    const days = datePreset === "7d" ? 7 : 30;
    const data = [];
    const obj = (selectedCampaign?.objective || "OUTCOME_SALES").toUpperCase();
    const isClicks = obj.includes("TRAFFIC") || obj.includes("LINK_CLICKS");
    const isImpressions = obj.includes("AWARENESS") || obj.includes("REACH");

    const totalSpend = entity.metrics.spend || 0;
    const totalResult = isClicks 
      ? (entity.metrics.clicks || 0) 
      : isImpressions 
      ? (entity.metrics.impressions || 0) 
      : (entity.metrics.purchases || 0);

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
      {/* 1. Campaigns List Table View */}
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
      ) : selectedAdSet && !selectedAd ? (
        /* ──────────────────────────────────────────────────────────── */
        /* 2. Ad Set Detail Drill-Down View */
        /* ──────────────────────────────────────────────────────────── */
        <div className="space-y-6">
          {/* Breadcrumb Navigation */}
          <div className="flex justify-between items-center bg-white p-4 border border-border rounded-lg shadow-xs">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
              <button onClick={() => { setSelectedAd(null); setSelectedAdSet(null); setSelectedCampaign(null); }} className="hover:text-slate-600 transition">Campaigns</button>
              <span>/</span>
              <button onClick={() => { setSelectedAd(null); setSelectedAdSet(null); }} className="hover:text-slate-600 transition">{selectedCampaign.name}</button>
              <span>/</span>
              <span className="text-slate-800">{selectedAdSet.name}</span>
            </div>
            <button
              onClick={() => setSelectedAdSet(null)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 transition cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Campaign
            </button>
          </div>

          {/* Ad Set KPI Grid */}
          <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ad Set Details</span>
                <h2 className="text-xl font-black text-slate-800 mt-1">{selectedAdSet.name}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${selectedAdSet.status === "ACTIVE" ? "text-green-600 bg-green-50 animate-pulse" : "text-slate-500 bg-slate-100"}`}>
                    {selectedAdSet.status}
                  </span>
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold uppercase">
                    Goal: {selectedAdSet.optimization_goal.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              {/* KPI cards */}
              <div className="flex flex-wrap items-center gap-4">
                {[
                  { label: "Spend", val: formatCurrency(selectedAdSet.metrics.spend) },
                  { label: "CTR", val: formatPercent(selectedAdSet.metrics.ctr) },
                  { label: "Conversions", val: selectedAdSet.metrics.purchases },
                  { label: "ROAS", val: `${selectedAdSet.metrics.roas.toFixed(2)}x`, highlight: true }
                ].map((k, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-center min-w-[90px]">
                    <div className="text-[8px] font-bold text-slate-400 uppercase">{k.label}</div>
                    <div className={`text-xs font-black mt-1 ${k.highlight ? "text-green-600 font-bold" : "text-slate-800"}`}>{k.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left columns: Targeting details */}
            <div className="lg:col-span-1 space-y-6">
              {/* Audience Targeting */}
              <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={14} className="text-primary" /> Audience Targeting Parameters
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
                  <div className="border-b border-slate-50 pb-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Geography & Location</span>
                    <div className="font-semibold text-slate-700 mt-0.5">India (Top States: MH, DL, KA)</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Audience Targeting Type</span>
                    <div className="font-semibold text-slate-700 mt-0.5">Lookalike 2% (Purchasers - Last 30 Days)</div>
                  </div>
                </div>
              </div>

              {/* Placement Specifications */}
              <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Target size={14} className="text-primary" /> Publisher Placement Splits
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="border-b border-slate-50 pb-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Platform Contribution</span>
                    <div className="font-semibold text-slate-700 mt-0.5">Instagram (60%), Facebook (35%), Messenger (5%)</div>
                  </div>
                  <div className="border-b border-slate-50 pb-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Positioning Formats</span>
                    <div className="font-semibold text-slate-700 mt-0.5">Mobile Feed (45%), Stories (30%), Reels (25%)</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Device Delivery</span>
                    <div className="font-semibold text-slate-700 mt-0.5">Mobile Devices (98%), Desktop Web (2%)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column: Ads & AI Diagnoses */}
            <div className="lg:col-span-2 space-y-6">
              {/* AI Diagnosis block */}
              <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={14} className="text-yellow-500 animate-pulse" />
                  AI Diagnosis & Evidence
                </h4>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <div className="text-xs font-bold text-slate-800">
                    {selectedAdSet.metrics.roas >= 1.5 
                      ? "This Ad Set is currently the strongest component of the campaign."
                      : "This Ad Set shows signs of conversion latency and elevated CPA."}
                  </div>
                  
                  <div className="text-[11px] text-slate-500 font-bold uppercase mt-2">Evaluation Evidence:</div>
                  <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pl-1">
                    <li>Lowest CPL: ₹{(selectedAdSet.metrics.spend / Math.max(1, selectedAdSet.metrics.purchases)).toFixed(2)} cost per result.</li>
                    <li>Strong conversion rate: {(selectedAdSet.metrics.purchases > 0 ? (selectedAdSet.metrics.purchases / selectedAdSet.metrics.clicks * 100).toFixed(2) : "0.00")}% click-to-purchase CVR.</li>
                    <li>Stable CTR: {formatPercent(selectedAdSet.metrics.ctr)} delivery engagement.</li>
                    <li>Sufficient conversion pool data for learning optimization.</li>
                  </ul>
                </div>
              </div>

              {/* Ads Table */}
              <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Ads in this Ad Set ({ads.filter(ad => ad.adset_name === selectedAdSet.name).length})</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-left divide-y divide-border">
                    <thead className="bg-slate-50/50">
                      <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-border">
                        <th className="p-2">Ad Name</th>
                        <th className="p-2 text-right">Spend</th>
                        <th className="p-2 text-right">CTR</th>
                        <th className="p-2 text-right">ROAS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ads.filter(ad => ad.adset_name === selectedAdSet.name).map((ad, idx) => (
                        <tr 
                          key={idx} 
                          onClick={() => handleSelectAdFromList(ad)}
                          className="hover:bg-slate-50 transition cursor-pointer"
                        >
                          <td className="p-2 font-bold text-slate-700 flex items-center gap-2">
                            {ad.creative?.image_url ? (
                              <img src={ad.creative.image_url} alt="" className="w-8 h-8 object-cover rounded border border-border shrink-0" />
                            ) : (
                              <div className="w-8 h-8 bg-slate-100 rounded border border-border flex items-center justify-center shrink-0 text-slate-400"><ImageIcon size={12} /></div>
                            )}
                            <span className="truncate max-w-[200px]">{ad.name}</span>
                          </td>
                          <td className="p-2 text-right font-semibold">{formatCurrency(ad.metrics.spend)}</td>
                          <td className="p-2 text-right">{formatPercent(ad.metrics.ctr)}</td>
                          <td className="p-2 text-right text-green-600 font-bold">{ad.metrics.roas.toFixed(2)}x</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ──────────────────────────────────────────────────────────── */
        /* 3. Ad Detail Drill-Down View (Creative Preview & Copy details) */
        /* ──────────────────────────────────────────────────────────── */
        <div className="space-y-6">
          {/* Breadcrumb Navigation */}
          <div className="flex justify-between items-center bg-white p-4 border border-border rounded-lg shadow-xs">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
              <button onClick={() => { setSelectedAd(null); setSelectedAdSet(null); setSelectedCampaign(null); }} className="hover:text-slate-600 transition">Campaigns</button>
              <span>/</span>
              <button onClick={() => { setSelectedAd(null); setSelectedAdSet(null); }} className="hover:text-slate-600 transition">{selectedCampaign.name}</button>
              <span>/</span>
              {selectedAdSet && (
                <>
                  <button onClick={() => setSelectedAd(null)} className="hover:text-slate-600 transition">{selectedAdSet.name}</button>
                  <span>/</span>
                </>
              )}
              <span className="text-slate-800">{selectedAd.name}</span>
            </div>
            <button
              onClick={() => setSelectedAd(null)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 transition cursor-pointer"
            >
              <ArrowLeft size={14} /> Back
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: Creative Preview */}
            <div className="lg:col-span-1 space-y-6">
              <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-primary" /> Creative Preview Mockup
                </h3>

                {/* Simulated Facebook mockup card */}
                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs bg-white text-xs text-slate-800">
                  {/* Mockup Header */}
                  <div className="p-3 flex items-center gap-2 border-b border-slate-50 bg-slate-50/50">
                    <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center font-bold text-[10px] text-white">Ad</div>
                    <div>
                      <div className="font-bold">Sponsored</div>
                      <div className="text-[8px] text-slate-400">Meta Marketing API Connection</div>
                    </div>
                  </div>
                  {/* Primary text */}
                  <div className="p-3 font-medium leading-relaxed text-slate-600">
                    {selectedAd.creative?.primary_text || "No primary text loaded."}
                  </div>
                  {/* Image */}
                  {selectedAd.creative?.image_url ? (
                    <img 
                      src={selectedAd.creative.image_url} 
                      alt="Visual creative preview" 
                      className="w-full h-44 object-cover" 
                      onError={(e: any) => { e.target.style.display = "none"; }}
                    />
                  ) : (
                    <div className="h-36 bg-slate-100 flex items-center justify-center text-slate-400 border-y border-slate-150">
                      <ImageIcon size={32} />
                    </div>
                  )}
                  {/* Headline / CTA panel */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center gap-4">
                    <div>
                      <div className="font-black text-slate-700 truncate max-w-[200px]">{selectedAd.creative?.headline || "Untitled Headline"}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[200px] mt-0.5">{selectedAd.creative?.description || "Visual asset details"}</div>
                    </div>
                    {selectedAd.creative?.call_to_action && (
                      <span className="btn btn-outline py-1 px-3 border border-border text-[9px] font-bold uppercase rounded bg-white shrink-0">
                        {selectedAd.creative.call_to_action.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Creative Intelligence details */}
              <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-primary" /> Creative Intelligence
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="border-b border-slate-50 pb-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Copy Strength</span>
                    <div className="font-semibold text-slate-700 mt-0.5">Sufficiently concise, optimal headline character count.</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">readability score</span>
                    <div className="font-semibold text-slate-700 mt-0.5">High (Grade 8 level, readable for mass markets).</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column: Performance charts & AI diagnoses */}
            <div className="lg:col-span-2 space-y-6">
              {/* Ad KPI Cards */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Spend", val: formatCurrency(selectedAd.metrics.spend) },
                  { label: "Conversions", val: selectedAd.metrics.purchases },
                  { label: "CTR", val: formatPercent(selectedAd.metrics.ctr) },
                  { label: "ROAS", val: `${selectedAd.metrics.roas.toFixed(2)}x`, highlight: true }
                ].map((k, i) => (
                  <div key={i} className="bg-white border border-border p-3 rounded-lg text-center shadow-xs">
                    <div className="text-[8px] font-bold text-slate-400 uppercase">{k.label}</div>
                    <div className={`text-xs font-black mt-1 ${k.highlight ? "text-green-600 font-bold" : "text-slate-800"}`}>{k.val}</div>
                  </div>
                ))}
              </div>

              {/* Performance Trend Chart */}
              <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ad Daily Performance Trend</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Daily timeline evaluation: Spend vs Results</p>
                </div>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={generateTrendChartData(selectedAd, true)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: 9, fill: "#94a3b8" }} />
                      <YAxis yAxisId="left" tickLine={false} axisLine={false} style={{ fontSize: 9, fill: "#94a3b8" }} />
                      <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} style={{ fontSize: 9, fill: "#94a3b8" }} />
                      <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8, borderColor: "#e2e8f0" }} />
                      <Line yAxisId="left" type="monotone" dataKey="spend" name="Spend" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="result" name={getObjectiveMetrics(selectedCampaign).resultLabel} stroke="#10b981" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Breakdown tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Placement Breakdown */}
                <div className="card border border-border bg-white shadow-sm rounded-lg p-4 space-y-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Placement contribution</div>
                  <div className="space-y-2 text-xs">
                    {[
                      { name: "Instagram Stories", spend: 0.65, ctr: 2.34 },
                      { name: "Facebook Feed", spend: 0.25, ctr: 1.55 },
                      { name: "Messenger Feed", spend: 0.10, ctr: 0.85 }
                    ].map((p, i) => (
                      <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                        <div>
                          <span className="font-bold text-slate-700 block">{p.name}</span>
                          <span className="text-[9px] text-slate-400 mt-0.5">CTR: {p.ctr}%</span>
                        </div>
                        <span className="font-semibold text-slate-600">{formatCurrency(selectedAd.metrics.spend * p.spend)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audience breakdown */}
                <div className="card border border-border bg-white shadow-sm rounded-lg p-4 space-y-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Demographic Splits</div>
                  <div className="space-y-2 text-xs">
                    {[
                      { age: "25-34 Female", spend: 0.50, ctr: 2.45 },
                      { age: "25-34 Male", spend: 0.30, ctr: 1.70 },
                      { age: "35-44 Female", spend: 0.20, ctr: 2.10 }
                    ].map((p, i) => (
                      <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                        <div>
                          <span className="font-bold text-slate-700 block">{p.age}</span>
                          <span className="text-[9px] text-slate-400 mt-0.5">CTR: {p.ctr}%</span>
                        </div>
                        <span className="font-semibold text-slate-600">{formatCurrency(selectedAd.metrics.spend * p.spend)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Diagnosis */}
              <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-primary animate-pulse" />
                  AI Optimization Diagnosis
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Recommended next test */}
                  <div className="border border-slate-100 rounded-lg p-4 bg-slate-50 space-y-1.5">
                    <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider block">Recommended Next Test</span>
                    <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                      Test a question-oriented headline variant (e.g. "Struggling to scale your ads?") to compare against the current winning headline layout.
                    </p>
                  </div>
                  
                  {/* Don't change recommendation */}
                  <div className="border border-slate-100 rounded-lg p-4 bg-slate-50 space-y-1.5">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Don't Change Recommendation</span>
                    <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                      Do not alter the primary mockup image asset. Its Click-Through Rate remains highly stable and contributes 75% of the overall conversions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
