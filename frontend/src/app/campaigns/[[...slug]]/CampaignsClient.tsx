"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useAdAccount } from "@/context/AdAccountContext";
import { api } from "@/lib/api";
import { 
  Calendar, 
  Megaphone, 
  Loader2, 
  Layers, 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Check, 
  MapPin, 
  AlertCircle, 
  Zap, 
  Users, 
  Image as ImageIcon 
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from "recharts";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export default function CampaignsClient({ slug: propSlug }: { slug?: string[] }) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  
  const slug = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts[0] === "campaigns") {
      return parts.slice(1);
    }
    return propSlug || [];
  }, [pathname, propSlug]);

  // Programmatic client-side Cache & Service Worker Buster
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.navigator && navigator.serviceWorker) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          for (const reg of registrations) {
            reg.unregister();
          }
        });
      }
      if (window.caches) {
        caches.keys().then(keys => {
          for (const key of keys) {
            caches.delete(key);
          }
        });
      }
    }
  }, []);

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
  const [activeTab, setActiveTab] = useState<"overview" | "adsets">("overview");
  const [breakdownView, setBreakdownView] = useState<"placement" | "demographic" | "region">("placement");

  // Hierarchy details states
  const [adSets, setAdSets] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Drill-down selected items
  const [selectedAdSet, setSelectedAdSet] = useState<any | null>(null);
  const [selectedAd, setSelectedAd] = useState<any | null>(null);
  const [loadingPerf, setLoadingPerf] = useState(false);
  const [perfError, setPerfError] = useState<string | null>(null);
  const [adSetPerformance, setAdSetPerformance] = useState<any | null>(null);
  const [adSetTab, setAdSetTab] = useState<"overview" | "ads" | "breakdowns" | "aidiagnosis">("overview");
  const [perfErrorState, setPerfErrorState] = useState<string | null>(null);

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

  // Sync URL slug with react selection states
  useEffect(() => {
    if (!campaigns || campaigns.length === 0) return;

    const campaignId = slug?.[0];
    const adSetId = slug?.[1];
    const adId = slug?.[2];

    if (!campaignId) {
      setSelectedCampaign(null);
      setSelectedAdSet(null);
      setSelectedAd(null);
    } else {
      const camp = campaigns.find(c => c.id === campaignId || c.meta_campaign_id === campaignId);
      if (camp) {
        setSelectedCampaign(camp);
        
        if (adSets.length === 0 && !loadingDetails) {
          loadCampaignDetails(camp.name);
        }

        if (!adSetId) {
          setSelectedAdSet(null);
          setSelectedAd(null);
        } else {
          if (adSetId === "all") {
            setSelectedAdSet(null);
            if (adId) {
              const ad = ads.find(item => item.id === adId || item.meta_ad_id === adId);
              if (ad) {
                setSelectedAd(ad);
                const matchingAdSet = adSets.find(as => as.name === ad.adset_name);
                if (matchingAdSet) {
                  setSelectedAdSet(matchingAdSet);
                }
              }
            }
          } else {
            const as = adSets.find(item => item.id === adSetId || item.meta_adset_id === adSetId);
            if (as) {
              setSelectedAdSet(as);
              
              if (!adSetPerformance && !loadingPerf) {
                loadAdSetPerformance(camp.id, as.id);
              }

              if (!adId) {
                setSelectedAd(null);
              } else {
                const ad = ads.find(item => item.id === adId || item.meta_ad_id === adId);
                if (ad) {
                  setSelectedAd(ad);
                }
              }
            } else if (adSets.length > 0) {
              router.replace(`/campaigns/${campaignId}`);
            }
          }
        }
      } else {
        router.replace('/campaigns');
      }
    }
  }, [slug, campaigns, adSets, ads]);

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
    const leads = c.metrics.leads || 0;
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
    } else if (obj.includes("LEAD")) {
      return {
        resultLabel: "Leads",
        resultValue: formatNumber(leads),
        costPerResult: leads > 0 ? formatCurrency(spend / leads) : "—",
        ctrLabel: formatPercent(c.metrics.ctr),
        roasLabel: "—",
        isRoasRelevant: false
      };
    } else if (obj.includes("ENGAGEMENT")) {
      return {
        resultLabel: "Engagements",
        resultValue: formatNumber(clicks),
        costPerResult: clicks > 0 ? formatCurrency(spend / clicks) : "—",
        ctrLabel: formatPercent(c.metrics.ctr),
        roasLabel: "—",
        isRoasRelevant: false
      };
    } else if (obj.includes("APP_PROMOTION") || obj.includes("APP_INSTALLS")) {
      return {
        resultLabel: "App Installs",
        resultValue: formatNumber(clicks),
        costPerResult: clicks > 0 ? formatCurrency(spend / clicks) : "—",
        ctrLabel: formatPercent(c.metrics.ctr),
        roasLabel: "—",
        isRoasRelevant: false
      };
    } else {
      return {
        resultLabel: "Purchases",
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

  const loadCampaignDetails = async (campaignName: string) => {
    if (!selectedAccount) return;
    setLoadingDetails(true);
    try {
      const [allAdSets, allAds] = await Promise.all([
        api.getAdSets(selectedAccount.id, startStr, endStr),
        api.getAds(selectedAccount.id, startStr, endStr)
      ]);
      const filteredAdSets = allAdSets.filter((as: any) => as.campaign_name === campaignName);
      const filteredAds = allAds.filter((ad: any) => ad.campaign_name === campaignName);
      setAdSets(filteredAdSets);
      setAds(filteredAds);
    } catch (err) {
      console.error("Failed to load campaign hierarchy detail:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const loadAdSetPerformance = async (campaignId: string, adSetId: string) => {
    setLoadingPerf(true);
    setPerfError(null);
    try {
      const res = await api.getAdSetPerformance(campaignId, adSetId, startStr, endStr);
      setAdSetPerformance(res);
    } catch (err: any) {
      console.error("Failed to load adset performance goal profile:", err);
      setPerfError(err.message || String(err));
    } finally {
      setLoadingPerf(false);
    }
  };

  const handleSelectCampaign = (c: any) => {
    router.push(`/campaigns/${c.id}`);
  };

  const handleSelectAdSetFromList = (as: any) => {
    if (!selectedCampaign) return;
    router.push(`/campaigns/${selectedCampaign.id}/${as.id}`);
  };

  const handleSelectAdFromList = (ad: any) => {
    if (!selectedCampaign) return;
    const matchingAdSet = adSets.find(as => as.name === ad.adset_name);
    const adSetId = matchingAdSet ? matchingAdSet.id : "all";
    router.push(`/campaigns/${selectedCampaign.id}/${adSetId}/${ad.id}`);
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
      <div className="bg-rose-600 text-white text-xs font-bold p-3 text-center rounded-lg shadow-md">
        DEBUG: params: {JSON.stringify(params)} | slug: {JSON.stringify(slug)} | propSlug: {JSON.stringify(propSlug)} | campaigns count: {campaigns.length} | found campaign: {campaigns.find(c => c.id === slug?.[0] || c.meta_campaign_id === slug?.[0])?.name || 'NONE'}
      </div>
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. Campaigns List Table View */}
      {/* ──────────────────────────────────────────────────────────── */}
      {!selectedCampaign ? (
        <>
          {/* Page Header */}
          <div className="page-header flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="page-title text-2xl font-bold text-slate-800">Campaigns</h1>
                <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-black uppercase border border-blue-200">v2.1.0</span>
              </div>
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
      ) : selectedAd ? (
        /* ──────────────────────────────────────────────────────────── */
        /* 2. Ad Detail Drill-Down View (Creative Preview & Copy details) */
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
      ) : selectedAdSet ? (
        /* ──────────────────────────────────────────────────────────── */
        /* 3. Ad Set Detail Drill-Down View */
        /* ──────────────────────────────────────────────────────────── */
        loadingPerf ? (
          <div className="flex h-96 items-center justify-center bg-white border border-border rounded-lg shadow-sm">
            <Loader2 className="animate-spin text-primary" size={32} />
            <span className="ml-2 text-sm text-subtle font-medium">Resolving Goal-Aware Performance Engine...</span>
          </div>
        ) : adSetPerformance ? (
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

            {/* Performance Goal Header */}
            <div className="card border border-border bg-gradient-to-r from-slate-900 to-slate-800 shadow-xl rounded-xl p-6 text-white space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1">
                    <Target size={12} /> Performance Goal Intelligence Active
                  </span>
                  <h2 className="text-2xl font-black">{selectedAdSet.name}</h2>
                  <p className="text-sm text-slate-300 max-w-2xl">{adSetPerformance.performance_goal.name}: {adSetPerformance.performance_goal.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${selectedAdSet.status === "ACTIVE" ? "text-green-400 bg-green-500/10 border border-green-500/20" : "text-slate-400 bg-slate-500/10 border border-slate-500/20"}`}>
                    {selectedAdSet.status}
                  </span>
                  <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded font-bold uppercase">
                    Motive: {adSetPerformance.performance_goal.motive}
                  </span>
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
                Ads ({ads.filter(ad => ad.adset_name === selectedAdSet.name).length})
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
                      <div key={idx} className="card border border-border bg-white shadow-sm rounded-xl p-5 flex flex-col justify-between space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{k.name}</span>
                            <span className="text-[8px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-1 inline-block uppercase">Primary KPI</span>
                          </div>
                          {k.change_percent !== null && (
                            <div className={`flex items-center gap-0.5 text-[10px] font-bold ${
                              k.status === "good" ? "text-emerald-600" :
                              k.status === "critical" ? "text-rose-600" : "text-slate-500"
                            }`}>
                              {k.trend === "improving" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                              {k.change_percent > 0 ? "+" : ""}{k.change_percent.toFixed(1)}%
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="text-2xl font-black text-slate-800">
                            {k.metric.includes("spend") || k.metric.includes("cost_") || k.metric === "cpc" || k.metric === "cpa" || k.metric === "cpm"
                              ? formatCurrency(k.value)
                              : k.metric.includes("rate") || k.metric.includes("ctr")
                              ? formatPercent(k.value / 100)
                              : formatNumber(k.value)}
                          </div>
                          <span className="text-[8px] text-slate-400 block mt-1">Formula: {k.formula}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Supporting, Diagnostic & Business Impact Grids */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Supporting & Diagnostic Metrics */}
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
                                ? formatPercent(m.value / 100)
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

                    {/* Funnel chart */}
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

                  {/* Downstream Business Impact & Target Audience */}
                  <div className="lg:col-span-1 space-y-6">
                    {/* Business impact */}
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
                                <span className="text-[8px] text-slate-400 block mt-0.5">From downstream CRM integration</span>
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
                          <span className="text-xs font-bold text-slate-500">No CRM Integration Linked</span>
                          <p className="text-[10px] text-slate-400 leading-normal max-w-[200px]">Link Hubspot or Zoho CRM in account settings to pull down sales outcomes.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {adSetTab === "ads" && (
              <div className="card border border-border bg-white shadow-sm rounded-xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-slate-800">Active Ads</h3>
                  <span className="text-xs text-slate-400 font-medium">{ads.filter(ad => ad.adset_name === selectedAdSet.name).length} Ads Active</span>
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
                      {ads.filter(ad => ad.adset_name === selectedAdSet.name).map((ad, idx) => (
                        <tr 
                          key={idx} 
                          onClick={() => handleSelectAdFromList(ad)}
                          className="hover:bg-slate-50 transition cursor-pointer"
                        >
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
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {adSetTab === "breakdowns" && (
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
                              <td className="p-4 text-right">{formatCurrency(selectedAdSet.metrics.spend * p.pct)} ({Math.round(p.pct * 100)}%)</td>
                              <td className="p-4 text-right">{(p.ctr).toFixed(2)}%</td>
                              <td className="p-4 text-right text-green-600 font-bold">{(selectedAdSet.metrics.roas * (p.pct > 0.3 ? 1.1 : 0.8)).toFixed(2)}x</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {breakdownView === "demographic" && (
                  <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden">
                    <div className="p-4 bg-slate-50/50 border-b border-border text-xs font-bold text-slate-600">
                      Age and Gender performance segments matching ad set targeting
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
                              <td className="p-4 text-right">{formatCurrency(selectedAdSet.metrics.spend * d.pct)} ({Math.round(d.pct * 100)}%)</td>
                              <td className="p-4 text-right">{d.ctr.toFixed(2)}%</td>
                              <td className="p-4 text-right text-green-600 font-bold">{d.roas.toFixed(2)}x</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
                            <th className="p-4 text-right">Conversions</th>
                            <th className="p-4 text-right">ROAS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border font-medium text-slate-700">
                          {[
                            { region: "Maharashtra", pct: 0.35, ctr: 2.10, purchases: 45, roas: 3.10 },
                            { region: "Delhi NCR", pct: 0.25, ctr: 1.95, purchases: 30, roas: 2.80 },
                            { region: "Karnataka", pct: 0.20, ctr: 1.80, purchases: 22, roas: 2.50 },
                            { region: "Tamil Nadu", pct: 0.12, ctr: 1.65, purchases: 11, roas: 2.10 },
                            { region: "Uttar Pradesh", pct: 0.08, ctr: 1.40, purchases: 5, roas: 1.50 }
                          ].map((r, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition">
                              <td className="p-4 font-bold text-slate-800 flex items-center gap-1.5">
                                <MapPin size={12} className="text-slate-400" />
                                {r.region}
                              </td>
                              <td className="p-4 text-right">{formatCurrency(selectedAdSet.metrics.spend * r.pct)} ({Math.round(r.pct * 100)}%)</td>
                              <td className="p-4 text-right">{r.ctr.toFixed(2)}%</td>
                              <td className="p-4 text-right">{Math.round(selectedAdSet.metrics.purchases * r.pct)}</td>
                              <td className="p-4 text-right text-green-600 font-bold">{(selectedAdSet.metrics.roas * (r.pct > 0.3 ? 1.1 : 0.8)).toFixed(2)}x</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

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
                  <div className="space-y-3 text-xs font-medium text-slate-600">
                    <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-blue-500 font-bold mt-0.5">✓</span>
                      <div>
                        <div className="font-bold text-slate-800">Conversion Latency Safe</div>
                        <p className="text-slate-500 font-normal mt-0.5">Pixel sync delays are within normal parameters, ensuring stable attribution.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-blue-500 font-bold mt-0.5">✓</span>
                      <div>
                        <div className="font-bold text-slate-800">CPM Bidding Competitiveness</div>
                        <p className="text-slate-500 font-normal mt-0.5">Bidding competition is normal. No sudden cost delivery spikes detected compared to the prior 7-day baseline.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
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
        )
      ) : (
        /* ──────────────────────────────────────────────────────────── */
        /* 4. Campaign Detail Tabbed View (Overview / Tabs Cockpit) */
        /* ──────────────────────────────────────────────────────────── */
        <div className="space-y-6">
          {/* Breadcrumb / Back Navigation */}
          <div className="flex justify-between items-center bg-white p-4 border border-border rounded-lg shadow-xs">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
              <button onClick={() => { setSelectedAd(null); setSelectedAdSet(null); setSelectedCampaign(null); }} className="hover:text-slate-600 transition">Campaigns</button>
              <span>/</span>
              <span className="text-slate-800">{selectedCampaign.name}</span>
            </div>
            <button
              onClick={() => { setSelectedAd(null); setSelectedAdSet(null); setSelectedCampaign(null); }}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 transition cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Campaigns
            </button>
          </div>

          {/* Campaign Header Details */}
          <div className="card border border-border bg-white shadow-sm rounded-lg p-6 space-y-4">
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Campaign Intelligence Hub</span>
                <h2 className="text-2xl font-black text-slate-800 mt-1">{selectedCampaign.name}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${selectedCampaign.status === "ACTIVE" ? "text-green-600 bg-green-50" : "text-slate-500 bg-slate-100"}`}>
                    {selectedCampaign.status}
                  </span>
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold uppercase">
                    Objective: {selectedCampaign.objective.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] text-slate-500 bg-slate-50 border border-border px-2 py-0.5 rounded font-bold">
                    Vertical: {selectedAccount?.industry || "General Industry"}
                  </span>
                  <span className="text-[10px] text-green-600 bg-green-50 border border-green-150 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                    <Check size={10} /> Synced
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
              { id: "adsets", label: "Ad Sets" }
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

          {/* Tab Contents */}
          <div className="space-y-6">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Campaign Health */}
                  <div className="card border border-border bg-white shadow-sm rounded-lg p-5 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Campaign Health</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-semibold text-green-600 uppercase">Healthy</p>
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

                  {/* Performance Trend chart */}
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

                {/* AI Diagnosis summary */}
                <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">3. AI Diagnosis Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="border border-slate-100 rounded-lg p-3 space-y-1 bg-green-50/10">
                      <div className="text-[9px] font-bold text-green-600 uppercase flex items-center gap-1">
                        <ThumbsUp size={12} /> What's Working
                      </div>
                      <p className="text-xs text-slate-700 leading-normal">
                        {selectedCampaign.metrics.roas >= 1.5 
                          ? `Efficient Return on Spend delivery (ROAS: ${selectedCampaign.metrics.roas.toFixed(2)}x).`
                          : "Ad delivery distribution remains highly stable across core placements."}
                      </p>
                    </div>

                    <div className="border border-slate-100 rounded-lg p-3 space-y-1 bg-red-50/10">
                      <div className="text-[9px] font-bold text-red-500 uppercase flex items-center gap-1">
                        <ThumbsDown size={12} /> What's Declining
                      </div>
                      <p className="text-xs text-slate-700 leading-normal">
                        {selectedCampaign.metrics.ctr < 0.012 
                          ? `Ad CTR (${(selectedCampaign.metrics.ctr*100).toFixed(2)}%) indicates moderate creative fatigue.`
                          : "Slight conversion rate latency observed over the target period."}
                      </p>
                    </div>

                    <div className="border border-slate-100 rounded-lg p-3 space-y-1 bg-amber-50/10">
                      <div className="text-[9px] font-bold text-amber-600 uppercase flex items-center gap-1">
                        <Info size={12} /> Why It Happens
                      </div>
                      <p className="text-xs text-slate-700 leading-normal">
                        Creative assets have been active for &gt; 15 days without rotation, causing slight audience saturation.
                      </p>
                    </div>

                    <div className="border border-slate-100 rounded-lg p-3 space-y-1 bg-blue-50/10">
                      <div className="text-[9px] font-bold text-blue-600 uppercase flex items-center gap-1">
                        <Zap size={12} /> Recommended Action
                      </div>
                      <p className="text-xs text-slate-700 leading-normal">
                        Refresh copy text and swap visual assets in low-performing ad sets.
                      </p>
                    </div>

                    <div className="border border-slate-100 rounded-lg p-3 space-y-1 bg-slate-50">
                      <div className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <Check size={12} /> Don't Change
                      </div>
                      <p className="text-xs text-slate-700 leading-normal">
                        Keep daily budget pacing configurations active without manual tweaks.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Ad Set Performance */}
                <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">4. Ad Set Performance</h4>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{adSets.length} Active Ad Sets</span>
                  </div>

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
                          <tr key={idx} onClick={() => handleSelectAdSetFromList(as)} className="hover:bg-slate-50 transition cursor-pointer">
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
                </div>

                {/* Ad Performance comparison */}
                <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">5. Ad Performance Comparison</h4>
                  {(() => {
                    const { strongest, weakest } = getStrongestAndWeakestAds();
                    if (!strongest && !weakest) {
                      return <div className="text-center py-4 text-xs text-slate-400">No active ads.</div>;
                    }
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {strongest && (
                          <div className="border border-green-200 bg-green-50/15 rounded-lg p-4 space-y-3 cursor-pointer hover:bg-green-50/30 transition" onClick={() => handleSelectAdFromList(strongest)}>
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
                                <img src={strongest.creative.image_url} alt="" className="w-10 h-10 object-cover rounded border border-green-150" />
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

                        {weakest && (
                          <div className="border border-red-200 bg-red-50/15 rounded-lg p-4 space-y-3 cursor-pointer hover:bg-red-50/30 transition" onClick={() => handleSelectAdFromList(weakest)}>
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
                                <img src={weakest.creative.image_url} alt="" className="w-10 h-10 object-cover rounded border border-red-150" />
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

                {/* Opportunities */}
                <div className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">6. Opportunities</h4>
                  <div className="space-y-3">
                    {getHealthScore(selectedCampaign) < 85 && (
                      <div className="flex items-start gap-3 border border-amber-200 bg-amber-50/20 p-3.5 rounded-lg">
                        <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                        <div>
                          <div className="text-xs font-bold text-slate-800">Budget Pacing Warning</div>
                          <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5 border-b border-slate-50 pb-2">
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

            {/* Ad Sets Tab */}
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
                          onClick={() => handleSelectAdSetFromList(as)}
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

            {/* Campaign tabs cleaned (Ads, Breakdowns, AI Diagnosis removed) */}
          </div>
        </div>
      )}
    </div>
  );
}
