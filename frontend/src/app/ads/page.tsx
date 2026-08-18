"use client";

import { useEffect, useState } from "react";
import { useAdAccount } from "@/context/AdAccountContext";
import { api } from "@/lib/api";
import { Calendar, Megaphone, Loader2, Image as ImageIcon } from "lucide-react";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export default function AdsPage() {
  const { selectedAccount, loadingAccounts } = useAdAccount();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [datePreset, setDatePreset] = useState<"7d" | "30d">("30d");

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

  const loadAds = async () => {
    if (!selectedAccount) return;
    const { startStr, endStr } = getDates(datePreset);
    const cacheKey = `dgs_cached_ads_${selectedAccount.id}_${datePreset}`;

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

  useEffect(() => {
    if (selectedAccount) {
      loadAds();
    }
  }, [selectedAccount, datePreset]);

  // Date Range string
  const { startStr, endStr } = getDates(datePreset);
  const formatDateHeader = (dStr: string) => {
    const d = new Date(dStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const dateRangeLabel = `${formatDateHeader(startStr)} – ${formatDateHeader(endStr)}, 2026`;

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
                {ads.map((ad, idx) => {
                  const cr = ad.creative;
                  
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition">
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
                      <td className="p-4 text-right font-semibold">{formatCurrency(ad.metrics.spend)}</td>
                      <td className="p-4 text-right">{formatNumber(ad.metrics.impressions)}</td>
                      <td className="p-4 text-right">{formatNumber(ad.metrics.clicks)}</td>
                      <td className="p-4 text-right">{formatNumber(ad.metrics.purchases)}</td>
                      <td className="p-4 text-right">{formatPercent(ad.metrics.ctr)}</td>
                      <td className="p-4 text-right">{formatCurrency(ad.metrics.cpc)}</td>
                      <td className="p-4 text-right text-green-600 font-bold text-sm">
                        {ad.metrics.roas.toFixed(2)}x
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
