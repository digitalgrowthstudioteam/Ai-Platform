"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAdAccount } from "@/context/AdAccountContext";
import { api } from "@/lib/api";
import { Calendar, Megaphone, Loader2, Image as ImageIcon, X, TrendingUp, TrendingDown, Sparkles, Lightbulb, Link as LinkIcon, Zap } from "lucide-react";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export default function AdsPage() {
  const router = useRouter();
  const { selectedAccount, loadingAccounts } = useAdAccount();
  const [ads, setAds] = useState<any[]>([]);
  const [recs, setRecs] = useState<any[]>([]);
  const [selectedAd, setSelectedAd] = useState<any | null>(null);
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
  const [datePreset, setDatePreset] = useState<string>("30d");
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

  const loadAds = async () => {
    if (!selectedAccount) return;
    const { startStr, endStr } = getDates(datePreset, customStartDate, customEndDate);
    const cacheKey = `dgs_cached_ads_${selectedAccount.id}_${datePreset}_${startStr}_${endStr}`;

    // Load cached ads instantly to make transitions feel instant
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setAds(JSON.parse(cached));
      } catch (e) {}
    }

    try {
      setLoading(!cached); // Show loader only if no cache is available
      const res = await api.getAds(selectedAccount.id, startStr, endStr);
      setAds(res);
      sessionStorage.setItem(cacheKey, JSON.stringify(res));
    } catch (err) {
      console.error("Failed to load ads list:", err);
      if (!cached) setAds([]);
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
      loadAds();
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

  const filteredAndSortedAds = ads
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
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title text-2xl font-bold text-slate-800">Ads</h1>
          <p className="page-subtitle text-sm text-subtle mt-1">Review performance of individual creatives</p>
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

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
          <span className="ml-2 text-sm text-subtle font-medium">Aggregating ad statistics...</span>
        </div>
      ) : !selectedAccount ? (
        <div className="card shadow-sm border border-border bg-white rounded-lg">
          <div className="card-body py-12 text-center text-sm text-subtle font-medium">
            Please link and select a Meta Ad Account in settings to load ads.
          </div>
        </div>
      ) : ads.length === 0 ? (
        <div className="card shadow-sm border border-border bg-white rounded-lg">
          <div className="card-body py-12">
            <div className="empty-state text-center max-w-sm mx-auto space-y-3">
              <Megaphone size={48} className="text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No ads found</h3>
              <p className="text-xs text-subtle">
                Verify that you have selected active ad accounts in settings and enqueued a database sync.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Ads Table Card */
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
                <option value="name">Ad Name</option>
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
                    <th className="p-4">Ad Creative Preview</th>
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
                  {filteredAndSortedAds.map((ad, idx) => {
                    const cr = ad.creative;
                    
                    return (
                      <tr 
                        key={idx} 
                        onClick={() => setSelectedAd(ad)} 
                        className="hover:bg-slate-50 transition cursor-pointer"
                      >
                        <td className="p-4 flex items-center gap-3">
                          {/* Visual Creative Thumbnail */}
                          {cr && cr.image_url ? (
                            <img
                              src={cr.image_url}
                              alt={ad.name}
                              className="w-12 h-12 object-cover rounded-md border border-border shrink-0"
                              onError={(e: any) => {
                                e.target.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-md border border-border flex items-center justify-center shrink-0">
                              <ImageIcon size={18} />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-sm text-slate-800">{ad.name}</div>
                            {cr && (
                              <div className="text-[10px] text-slate-400 max-w-sm truncate mt-0.5" title={cr.headline || cr.primary_text}>
                                Copy: {cr.headline || cr.primary_text || "No copy text loaded"}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                ad.status === "ACTIVE" ? "text-green-600 bg-green-50" : "text-slate-500 bg-slate-100"
                              }`}>
                                {ad.status}
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold truncate max-w-[120px]">
                                {ad.campaign_name}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right font-semibold">
                          {formatCurrency(ad.metrics.spend)}
                          {renderTrend(ad.metrics.spend_trend)}
                        </td>
                        <td className="p-4 text-right">
                          {formatNumber(ad.metrics.impressions)}
                          {renderTrend(ad.metrics.impressions_trend)}
                        </td>
                        <td className="p-4 text-right">
                          {formatNumber(ad.metrics.clicks)}
                          {renderTrend(ad.metrics.clicks_trend)}
                        </td>
                        <td className="p-4 text-right">
                          {formatNumber(ad.metrics.purchases)}
                          {renderTrend(ad.metrics.purchases_trend)}
                        </td>
                        <td className="p-4 text-right">
                          {formatPercent(ad.metrics.ctr)}
                          {renderTrend(ad.metrics.ctr_trend)}
                        </td>
                        <td className="p-4 text-right">
                          {formatCurrency(ad.metrics.cpc)}
                          {renderTrend(ad.metrics.cpc_trend)}
                        </td>
                        <td className="p-4 text-right text-green-600 font-bold text-sm">
                          {ad.metrics.roas.toFixed(2)}x
                          {renderTrend(ad.metrics.roas_trend)}
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

      {/* Slide-over Details Drawer */}
      {selectedAd && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          {/* Backdrop Click Closes Drawer */}
          <div className="absolute inset-0" onClick={() => setSelectedAd(null)} />
          
          <div className="relative bg-white w-full max-w-lg h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300 overflow-y-auto border-l border-border p-6 space-y-6">
            
            {/* Drawer Header */}
            <div className="flex justify-between items-start border-b border-border pb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Ad Details & AI Insights
                </span>
                <h2 className="text-xl font-bold text-slate-800 mt-1">{selectedAd.name}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${selectedAd.status === "ACTIVE" ? "text-green-600 bg-green-50" : "text-slate-500 bg-slate-100"}`}>
                    {selectedAd.status}
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase truncate max-w-[200px]">
                    {selectedAd.campaign_name}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAd(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Creative Preview (if exists) */}
            {selectedAd.creative && (
              <div className="border border-border rounded-lg overflow-hidden bg-slate-50">
                <div className="p-3 bg-slate-100 border-b border-border text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Associated Ad Creative
                </div>
                {selectedAd.creative.image_url && (
                  <img
                    src={selectedAd.creative.image_url}
                    alt={selectedAd.name}
                    className="w-full h-40 object-cover border-b border-border"
                  />
                )}
                <div className="p-4 space-y-2">
                  {selectedAd.creative.headline && (
                    <div className="text-sm font-bold text-slate-800">{selectedAd.creative.headline}</div>
                  )}
                  {selectedAd.creative.primary_text && (
                    <div className="text-xs text-slate-600 leading-relaxed">{selectedAd.creative.primary_text}</div>
                  )}
                  {selectedAd.creative.landing_page_url && (
                    <a
                      href={selectedAd.creative.landing_page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-bold hover:underline flex items-center gap-1 mt-1 text-xs"
                    >
                      <LinkIcon size={12} />
                      Landing Page Link
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Core Metrics Grid */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Performance Metrics</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Spend</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">{formatCurrency(selectedAd.metrics.spend)}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Impressions</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">{formatNumber(selectedAd.metrics.impressions)}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Clicks</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">{formatNumber(selectedAd.metrics.clicks)}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">CTR</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">{formatPercent(selectedAd.metrics.ctr)}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">CPC</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">{formatCurrency(selectedAd.metrics.cpc)}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">ROAS</div>
                  <div className="text-xs font-bold text-green-600 mt-1">{selectedAd.metrics.roas.toFixed(2)}x</div>
                </div>
              </div>
            </div>

            {/* Pros & Cons Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pros & Cons Analysis</h3>
              <div className="space-y-2">
                {/* Pros */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-green-600 uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp size={12} /> What is Working Well (Pros)
                  </div>
                  <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pl-1">
                    {(() => {
                      const pros = [];
                      const m = selectedAd.metrics;
                      if (m.roas >= 2.0) pros.push(`Profitable ROAS delivery at ${m.roas.toFixed(2)}x.`);
                      if (m.ctr >= 0.015) pros.push(`Strong copy resonance (CTR: ${(m.ctr*100).toFixed(2)}%).`);
                      if (m.cpc > 0 && m.cpc < 4.0) pros.push(`Highly efficient Cost Per Click (₹${m.cpc.toFixed(2)}).`);
                      if (m.purchases >= 5) pros.push(`Stable conversion pool with ${m.purchases} total purchases.`);
                      if (pros.length === 0) pros.push("Ad impressions are stable and delivery budget is processing normally.");
                      return pros.map((p, i) => <li key={i}>{p}</li>);
                    })()}
                  </ul>
                </div>

                {/* Cons */}
                <div className="space-y-1.5 pt-2">
                  <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-1">
                    <TrendingDown size={12} /> Areas of Improvement (Cons)
                  </div>
                  <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pl-1">
                    {(() => {
                      const cons = [];
                      const m = selectedAd.metrics;
                      if (m.roas > 0 && m.roas < 1.0) cons.push(`ROAS of ${m.roas.toFixed(2)}x represents a net revenue loss.`);
                      if (m.ctr > 0 && m.ctr < 0.008) cons.push(`Low CTR (${(m.ctr*100).toFixed(2)}%) indicates weak creative engagement.`);
                      if (m.cpc > 10.0) cons.push(`Elevated Cost Per Click (₹${m.cpc.toFixed(2)}) increases cost of audience acquisition.`);
                      if (m.purchases === 0 && m.spend > 400) cons.push(`Zero conversions generated despite ₹${m.spend.toFixed(2)} ad spend.`);
                      if (cons.length === 0) cons.push("No critical budget leaks or audience targeting defects detected.");
                      return cons.map((c, i) => <li key={i}>{c}</li>);
                    })()}
                  </ul>
                </div>
              </div>
            </div>

            {/* AI Insights & Recommendations */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={14} className="text-yellow-500" />
                AI-Triggered Optimization Suggestions
              </h3>
              
              {(() => {
                const linkedRecs = recs.filter(r => 
                  r.entity_id === selectedAd.id || 
                  r.title.toLowerCase().includes(selectedAd.name.toLowerCase()) ||
                  r.description.toLowerCase().includes(selectedAd.name.toLowerCase())
                );
                
                if (linkedRecs.length === 0) {
                  return (
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 text-center text-xs text-slate-500">
                      No active AI recommendations triggered for this ad. Overall metrics are stable!
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-3">
                    {linkedRecs.map((r, idx) => (
                      <div key={idx} className="border border-slate-200 rounded-lg p-4 bg-white space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                            {r.priority} Priority
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {Math.round(r.confidence_score * 100)}% Confidence
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-800">{r.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">{r.description}</p>
                        <div className="text-[10px] text-slate-400 italic bg-slate-50 p-2 rounded">
                          <span className="font-semibold text-slate-500 not-italic">Reason: </span>
                          {r.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            
            {/* Close Button Footer */}
            <div className="border-t border-border pt-4">
              <button 
                onClick={() => setSelectedAd(null)}
                className="w-full btn btn-outline py-2.5 font-bold text-sm text-slate-700 hover:bg-slate-50 border border-border rounded-lg cursor-pointer transition text-center block animate-pulse"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
