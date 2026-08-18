"use client";

import { useEffect, useState } from "react";
import { useAdAccount } from "@/context/AdAccountContext";
import { api } from "@/lib/api";
import { Calendar, Megaphone, Loader2 } from "lucide-react";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export default function CampaignsPage() {
  const { selectedAccount, loadingAccounts } = useAdAccount();
  const [campaigns, setCampaigns] = useState<any[]>([]);
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

  const loadCampaigns = async () => {
    if (!selectedAccount) return;
    const { startStr, endStr } = getDates(datePreset);
    const cacheKey = `dgs_cached_campaigns_${selectedAccount.id}_${datePreset}`;

    // Load cached campaigns instantly to make transitions feel instant
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setCampaigns(JSON.parse(cached));
      } catch (e) {}
    }

    try {
      setLoading(!cached); // Show loader only if no cache is available
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

  useEffect(() => {
    if (selectedAccount) {
      loadCampaigns();
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
          <h1 className="page-title text-2xl font-bold text-slate-800">Campaigns</h1>
          <p className="page-subtitle text-sm text-subtle mt-1">Analyze performance of individual campaigns</p>
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
          <span className="ml-2 text-sm text-subtle font-medium">Aggregating campaign analytics...</span>
        </div>
      ) : !selectedAccount ? (
        <div className="card shadow-sm border border-border bg-white rounded-lg">
          <div className="card-body py-12 text-center text-sm text-subtle font-medium">
            Please link and select a Meta Ad Account in settings to load campaigns.
          </div>
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
        /* Campaigns Table Card */
        <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left divide-y divide-border">
              <thead className="bg-slate-50/50">
                <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border">
                  <th className="p-4">Campaign Name</th>
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
                {campaigns.map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="p-4">
                      <div className="font-bold text-sm text-slate-800">{c.name}</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-bold uppercase">
                          {c.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                          {c.objective}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right font-semibold">{formatCurrency(c.metrics.spend)}</td>
                    <td className="p-4 text-right">{formatNumber(c.metrics.impressions)}</td>
                    <td className="p-4 text-right">{formatNumber(c.metrics.clicks)}</td>
                    <td className="p-4 text-right">{formatNumber(c.metrics.purchases)}</td>
                    <td className="p-4 text-right">{formatPercent(c.metrics.ctr)}</td>
                    <td className="p-4 text-right">{formatCurrency(c.metrics.cpc)}</td>
                    <td className="p-4 text-right text-green-600 font-bold text-sm">
                      {c.metrics.roas.toFixed(2)}x
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
