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
  ArrowLeft
} from "lucide-react";
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
      {/* List View (Null Selected Campaign) */}
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

              {/* Table view */}
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
        /* Hierarchy Detail Page View */
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
            <div className="text-xs font-semibold text-slate-400">
              Campaign ID: {selectedCampaign.meta_campaign_id}
            </div>
          </div>

          {/* Campaign Header Details */}
          <div className="card border border-border bg-white shadow-sm rounded-lg p-6 space-y-4">
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Campaign Details & AI Insights</span>
                <h2 className="text-2xl font-black text-slate-800 mt-1">{selectedCampaign.name}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${selectedCampaign.status === "ACTIVE" ? "text-green-600 bg-green-50 animate-pulse" : "text-slate-500 bg-slate-100"}`}>
                    {selectedCampaign.status}
                  </span>
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold uppercase">
                    {selectedCampaign.objective.replace(/_/g, " ")}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-black ${
                    getHealthScore(selectedCampaign) > 80 ? "text-green-700 bg-green-50" : getHealthScore(selectedCampaign) > 65 ? "text-amber-700 bg-amber-50" : "text-red-700 bg-red-50"
                  }`}>
                    Health: {getHealthScore(selectedCampaign)}%
                  </span>
                </div>
              </div>

              {/* Quick Metrics stats */}
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Spend</div>
                  <div className="text-lg font-black text-slate-800 mt-0.5">{formatCurrency(selectedCampaign.metrics.spend)}</div>
                </div>
                {getObjectiveMetrics(selectedCampaign).isRoasRelevant && (
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">ROAS</div>
                    <div className="text-lg font-black text-green-600 mt-0.5">{selectedCampaign.metrics.roas.toFixed(2)}x</div>
                  </div>
                )}
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Conversions</div>
                  <div className="text-lg font-black text-slate-800 mt-0.5">{formatNumber(selectedCampaign.metrics.purchases)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Overview & AI Analysis Left Columns */}
            <div className="lg:col-span-1 space-y-6">
              {/* Metrics Grid */}
              <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Performance Metrics</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Spend", val: formatCurrency(selectedCampaign.metrics.spend) },
                    { label: "Impressions", val: formatNumber(selectedCampaign.metrics.impressions) },
                    { label: "Clicks", val: formatNumber(selectedCampaign.metrics.clicks) },
                    { label: "CTR", val: formatPercent(selectedCampaign.metrics.ctr) },
                    { label: "CPC", val: formatCurrency(selectedCampaign.metrics.cpc) },
                    { label: "ROAS", val: `${selectedCampaign.metrics.roas.toFixed(2)}x`, highlight: true }
                  ].map((m, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-center">
                      <div className="text-[9px] font-bold text-slate-400 uppercase">{m.label}</div>
                      <div className={`text-xs font-bold mt-1 ${m.highlight ? "text-green-600 font-black text-sm" : "text-slate-800"}`}>{m.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pros & Cons */}
              <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pros & Cons</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] font-bold text-green-600 uppercase flex items-center gap-1">
                      <TrendingUp size={12} /> Pros (What is working well)
                    </div>
                    <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 mt-1 pl-1">
                      {(() => {
                        const pros = [];
                        const m = selectedCampaign.metrics;
                        if (m.roas >= 2.0) pros.push(`Profitable ROAS (${m.roas.toFixed(2)}x).`);
                        if (m.ctr >= 0.015) pros.push(`High engagement CTR (${(m.ctr*100).toFixed(2)}%).`);
                        if (m.cpc > 0 && m.cpc < 4.0) pros.push(`Cheap Cost Per Click (₹${m.cpc.toFixed(2)}).`);
                        if (pros.length === 0) pros.push("Account delivery status is healthy and stable.");
                        return pros.map((p, i) => <li key={i}>{p}</li>);
                      })()}
                    </ul>
                  </div>

                  <div className="border-t border-slate-50 pt-3">
                    <div className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1">
                      <TrendingDown size={12} /> Cons (Areas of Improvement)
                    </div>
                    <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 mt-1 pl-1">
                      {(() => {
                        const cons = [];
                        const m = selectedCampaign.metrics;
                        if (m.roas > 0 && m.roas < 1.0) cons.push("Campaign runs at a ROAS conversion loss.");
                        if (m.ctr > 0 && m.ctr < 0.008) cons.push("CTR is low, indicating potential creative fatigue.");
                        if (m.cpc > 10.0) cons.push("Cost Per Click is elevated.");
                        if (cons.length === 0) cons.push("No major performance leaks detected.");
                        return cons.map((c, i) => <li key={i}>{c}</li>);
                      })()}
                    </ul>
                  </div>
                </div>
              </div>

              {/* AI Suggestions */}
              <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={14} className="text-yellow-500" />
                  AI Optimization Suggestions
                </h3>
                {(() => {
                  const linked = getCampaignRecommendations(selectedCampaign);
                  if (linked.length === 0) {
                    return (
                      <div className="text-xs text-slate-400 italic">No recommendations pending.</div>
                    );
                  }
                  return (
                    <div className="space-y-3">
                      {linked.map((r, i) => (
                        <div key={i} className="border border-slate-100 rounded-lg p-3 bg-slate-50/50 space-y-1.5">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">{r.priority}</span>
                            <span className="text-slate-400 font-bold">{Math.round(r.confidence_score * 100)}% Match</span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-800">{r.title}</h4>
                          <p className="text-[10px] text-slate-500 leading-normal">{r.description}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Campaign Hierarchy Right Column (Ad Sets -> Ads -> Creative) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-800">Campaign Hierarchy Details</h3>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{adSets.length} Ad Sets Detected</span>
              </div>

              {loadingDetails ? (
                <div className="flex h-64 items-center justify-center card border border-border bg-white p-6">
                  <Loader2 className="animate-spin text-primary" size={24} />
                  <span className="ml-2 text-xs font-semibold text-slate-500">Loading campaign hierarchy...</span>
                </div>
              ) : adSets.length === 0 ? (
                <div className="card border border-border bg-white p-6 text-center text-xs text-slate-400">
                  No active ad sets detected for this campaign.
                </div>
              ) : (
                <div className="space-y-4">
                  {adSets.map((as, asIdx) => {
                    const isExpanded = expandedAdSet === as.id;
                    const adSetAds = ads.filter((ad: any) => ad.adset_name === as.name);

                    return (
                      <div key={asIdx} className="card border border-border bg-white shadow-xs rounded-lg overflow-hidden">
                        {/* Ad Set Header */}
                        <div 
                          onClick={() => setExpandedAdSet(isExpanded ? null : as.id)}
                          className="p-4 bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="font-bold text-slate-800 text-sm">{as.name}</div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[9px] uppercase font-bold">
                              <span className={`px-1.5 py-0.5 rounded ${as.status === "ACTIVE" ? "text-green-600 bg-green-50" : "text-slate-500 bg-slate-100"}`}>
                                {as.status}
                              </span>
                              <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                {as.optimization_goal.replace(/_/g, " ")}
                              </span>
                              <span className="text-slate-400">
                                {adSetAds.length} Ads
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Spend</div>
                              <div className="text-xs font-bold text-slate-700">{formatCurrency(as.metrics.spend)}</div>
                            </div>
                            <div className="text-right hidden sm:block">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">ROAS</div>
                              <div className="text-xs font-bold text-slate-700">{as.metrics.roas.toFixed(2)}x</div>
                            </div>
                            <div>
                              {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                            </div>
                          </div>
                        </div>

                        {/* Ad Set Expanded Content */}
                        {isExpanded && (
                          <div className="p-4 border-t border-border space-y-4 bg-white">
                            {/* Ad Set metrics breakdown */}
                            <div className="grid grid-cols-4 gap-2 text-center bg-slate-50 p-2.5 rounded-lg">
                              <div>
                                <div className="text-[8px] text-slate-400 font-bold uppercase">Impressions</div>
                                <div className="text-xs font-bold text-slate-700 mt-0.5">{formatNumber(as.metrics.impressions)}</div>
                              </div>
                              <div>
                                <div className="text-[8px] text-slate-400 font-bold uppercase">Clicks</div>
                                <div className="text-xs font-bold text-slate-700 mt-0.5">{formatNumber(as.metrics.clicks)}</div>
                              </div>
                              <div>
                                <div className="text-[8px] text-slate-400 font-bold uppercase">CTR</div>
                                <div className="text-xs font-bold text-slate-700 mt-0.5">{formatPercent(as.metrics.ctr)}</div>
                              </div>
                              <div>
                                <div className="text-[8px] text-slate-400 font-bold uppercase">Conversions</div>
                                <div className="text-xs font-bold text-slate-700 mt-0.5">{as.metrics.purchases}</div>
                              </div>
                            </div>

                            {/* Internal Ads list */}
                            <div className="space-y-3">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <FileText size={12} /> Active Ads in this Ad Set
                              </div>

                              {adSetAds.length === 0 ? (
                                <div className="text-center py-2 text-[11px] text-slate-400">No ads detected in this ad set.</div>
                              ) : (
                                <div className="space-y-3">
                                  {adSetAds.map((ad: any, adIdx) => {
                                    const isAdExpanded = expandedAd === ad.id;
                                    const cr = ad.creative;

                                    return (
                                      <div key={adIdx} className="border border-slate-100 rounded-lg overflow-hidden bg-slate-50/30">
                                        {/* Ad Row */}
                                        <div 
                                          onClick={() => setExpandedAd(isAdExpanded ? null : ad.id)}
                                          className="p-3 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between gap-4"
                                        >
                                          <div className="flex items-center gap-3">
                                            {cr && cr.image_url ? (
                                              <img
                                                src={cr.image_url}
                                                alt={ad.name}
                                                className="w-8 h-8 object-cover rounded border border-border shrink-0"
                                                onError={(e: any) => { e.target.style.display = "none"; }}
                                              />
                                            ) : (
                                              <div className="w-8 h-8 bg-slate-100 text-slate-400 rounded border border-border flex items-center justify-center shrink-0">
                                                <ImageIcon size={14} />
                                              </div>
                                            )}
                                            <div>
                                              <div className="font-bold text-slate-800 text-xs">{ad.name}</div>
                                              <span className={`text-[8px] px-1 py-0.2 rounded font-bold uppercase mt-1 inline-block ${
                                                ad.status === "ACTIVE" ? "text-green-600 bg-green-50" : "text-slate-500 bg-slate-100"
                                              }`}>
                                                {ad.status}
                                              </span>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                                            <span className="text-[10px]">Spend: {formatCurrency(ad.metrics.spend)}</span>
                                            <span className="text-[10px]">ROAS: {ad.metrics.roas.toFixed(2)}x</span>
                                            {isAdExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                          </div>
                                        </div>

                                        {/* Ad Expanded Content (Creative Details) */}
                                        {isAdExpanded && (
                                          <div className="p-3 border-t border-slate-100 bg-white grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {/* Thumbnail Left column */}
                                            <div className="md:col-span-1 flex flex-col justify-center items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                              {cr && cr.image_url ? (
                                                <img
                                                  src={cr.image_url}
                                                  alt="Creative preview"
                                                  className="w-full max-h-32 object-cover rounded-md border border-border shadow-xs"
                                                />
                                              ) : (
                                                <div className="w-16 h-16 bg-slate-200 text-slate-400 rounded-md flex items-center justify-center border border-border">
                                                  <ImageIcon size={24} />
                                                </div>
                                              )}
                                              <span className="text-[9px] text-slate-400 font-bold uppercase mt-2">
                                                {cr?.creative_type || "SINGLE IMAGE"}
                                              </span>
                                            </div>

                                            {/* Copy Text Right columns */}
                                            <div className="md:col-span-2 space-y-2 text-xs">
                                              <div>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase block">Headline</span>
                                                <div className="font-bold text-slate-800 mt-0.5">
                                                  {cr?.headline || "Untitled Headline"}
                                                </div>
                                              </div>
                                              <div>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase block">Primary Text</span>
                                                <div className="text-slate-600 leading-normal mt-0.5 font-medium">
                                                  {cr?.primary_text || "No copy text defined."}
                                                </div>
                                              </div>
                                              {cr?.call_to_action && (
                                                <div>
                                                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Call-To-Action</span>
                                                  <span className="btn btn-outline py-1 px-2 border border-border text-[9px] font-bold uppercase rounded bg-slate-50 inline-block mt-1">
                                                    {cr.call_to_action.replace(/_/g, " ")}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
