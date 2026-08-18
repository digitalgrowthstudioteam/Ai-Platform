"use client";

import { useEffect, useState } from "react";
import { useAdAccount } from "@/context/AdAccountContext";
import { api } from "@/lib/api";
import { Calendar, Layers, Loader2, X, TrendingUp, TrendingDown, Sparkles, Lightbulb } from "lucide-react";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export default function AdSetsPage() {
  const { selectedAccount, loadingAccounts } = useAdAccount();
  const [adsets, setAdsets] = useState<any[]>([]);
  const [recs, setRecs] = useState<any[]>([]);
  const [selectedAdSet, setSelectedAdSet] = useState<any | null>(null);
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

  const loadAdSets = async () => {
    if (!selectedAccount) return;
    const { startStr, endStr } = getDates(datePreset);
    const cacheKey = `dgs_cached_adsets_${selectedAccount.id}_${datePreset}`;

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
          <h1 className="page-title text-2xl font-bold text-slate-800">Ad Sets</h1>
          <p className="page-subtitle text-sm text-subtle mt-1">Analyze ad set performance, audiences, and budget allocation</p>
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
      ) : (
        /* Ad Sets Table Card */
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
                {adsets.map((as, idx) => (
                  <tr 
                    key={idx} 
                    onClick={() => setSelectedAdSet(as)} 
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
                    <td className="p-4 text-right font-semibold">{formatCurrency(as.metrics.spend)}</td>
                    <td className="p-4 text-right">{formatNumber(as.metrics.impressions)}</td>
                    <td className="p-4 text-right">{formatNumber(as.metrics.clicks)}</td>
                    <td className="p-4 text-right">{formatNumber(as.metrics.purchases)}</td>
                    <td className="p-4 text-right">{formatPercent(as.metrics.ctr)}</td>
                    <td className="p-4 text-right">{formatCurrency(as.metrics.cpc)}</td>
                    <td className="p-4 text-right text-green-600 font-bold text-sm">
                      {as.metrics.roas.toFixed(2)}x
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-over Details Drawer */}
      {selectedAdSet && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          {/* Backdrop Click Closes Drawer */}
          <div className="absolute inset-0" onClick={() => setSelectedAdSet(null)} />
          
          <div className="relative bg-white w-full max-w-lg h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300 overflow-y-auto border-l border-border p-6 space-y-6">
            
            {/* Drawer Header */}
            <div className="flex justify-between items-start border-b border-border pb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Ad Set Details & AI Insights
                </span>
                <h2 className="text-xl font-bold text-slate-800 mt-1">{selectedAdSet.name}</h2>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${selectedAdSet.status === "ACTIVE" ? "text-green-600 bg-green-50" : "text-slate-500 bg-slate-100"}`}>
                    {selectedAdSet.status}
                  </span>
                  <span className="text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-bold uppercase">
                    {selectedAdSet.optimization_goal.replace(/_/g, " ")}
                  </span>
                  <span className="text-[9px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-bold uppercase">
                    {selectedAdSet.billing_event.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAdSet(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Core Metrics Grid */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Performance Metrics</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Spend</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">{formatCurrency(selectedAdSet.metrics.spend)}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Impressions</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">{formatNumber(selectedAdSet.metrics.impressions)}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Clicks</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">{formatNumber(selectedAdSet.metrics.clicks)}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">CTR</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">{formatPercent(selectedAdSet.metrics.ctr)}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">CPC</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">{formatCurrency(selectedAdSet.metrics.cpc)}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">ROAS</div>
                  <div className="text-xs font-bold text-green-600 mt-1">{selectedAdSet.metrics.roas.toFixed(2)}x</div>
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
                      const m = selectedAdSet.metrics;
                      if (m.roas >= 2.0) pros.push(`Profitable ROAS delivery at ${m.roas.toFixed(2)}x.`);
                      if (m.ctr >= 0.015) pros.push(`Strong audience engagement (CTR: ${(m.ctr*100).toFixed(2)}%).`);
                      if (m.cpc > 0 && m.cpc < 4.0) pros.push(`Highly efficient Cost Per Click (₹${m.cpc.toFixed(2)}).`);
                      if (m.purchases >= 5) pros.push(`Stable conversion pool with ${m.purchases} total purchases.`);
                      if (pros.length === 0) pros.push("Ad Set reach is stable and budget is processing normally.");
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
                      const m = selectedAdSet.metrics;
                      if (m.roas > 0 && m.roas < 1.0) cons.push(`ROAS of ${m.roas.toFixed(2)}x represents a net revenue loss.`);
                      if (m.ctr > 0 && m.ctr < 0.008) cons.push(`Low CTR (${(m.ctr*100).toFixed(2)}%) indicates weak copy or ad fatigue.`);
                      if (m.cpc > 10.0) cons.push(`Elevated Cost Per Click (₹${m.cpc.toFixed(2)}) increases cost of audience acquisition.`);
                      if (m.purchases === 0 && m.spend > 400) cons.push(`Zero conversions generated despite ₹${m.spend.toFixed(2)} adset spend.`);
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
                  r.entity_id === selectedAdSet.id || 
                  r.title.toLowerCase().includes(selectedAdSet.name.toLowerCase()) ||
                  r.description.toLowerCase().includes(selectedAdSet.name.toLowerCase())
                );
                
                if (linkedRecs.length === 0) {
                  return (
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 text-center text-xs text-slate-500">
                      No active AI recommendations triggered for this ad set. Overall metrics are stable!
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
                onClick={() => setSelectedAdSet(null)}
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
