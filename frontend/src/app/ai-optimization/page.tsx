"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdAccount } from "@/context/AdAccountContext";
import { api } from "@/lib/api";
import { 
  Bot, 
  Check, 
  X, 
  Loader2, 
  AlertTriangle, 
  Sparkles,
  ArrowRight,
  Zap,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Info
} from "lucide-react";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export default function AIOptimizationDashboard() {
  const router = useRouter();
  const { selectedAccount, loadingAccounts } = useAdAccount();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [targetCampaign, setTargetCampaign] = useState<any>(null);
  const [kpiInputs, setKpiInputs] = useState({
    business_objective: "",
    primary_kpi: "",
    target_cpl: "",
    target_roas: ""
  });

  const loadDashboardData = async () => {
    if (!selectedAccount) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAiOptimizationDashboard(selectedAccount.id);
      setData(res);
    } catch (err: any) {
      console.error("Failed to load AI Optimization dashboard:", err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [selectedAccount?.id]);

  const handleToggle = async (campaign: any) => {
    if (campaign.is_active) {
      // Deactivate directly
      try {
        setActivatingId(campaign.campaign_id);
        await api.deactivateCampaignAiConfig(campaign.campaign_id);
        await loadDashboardData();
      } catch (err: any) {
        alert(err.message || "Failed to deactivate AI Optimization.");
      } finally {
        setActivatingId(null);
      }
    } else {
      // Open activation settings modal
      setTargetCampaign(campaign);
      setKpiInputs({
        business_objective: "",
        primary_kpi: campaign.objective?.includes("LEAD") ? "CPL" : "ROAS",
        target_cpl: "",
        target_roas: ""
      });
      setShowModal(true);
    }
  };

  const handleConfirmActivate = async () => {
    if (!targetCampaign) return;
    
    const payload: any = {
      business_objective: kpiInputs.business_objective || null,
      primary_kpi: kpiInputs.primary_kpi || null,
      target_cpl: kpiInputs.target_cpl ? parseFloat(kpiInputs.target_cpl) : null,
      target_roas: kpiInputs.target_roas ? parseFloat(kpiInputs.target_roas) : null
    };

    try {
      setActivatingId(targetCampaign.campaign_id);
      setShowModal(false);
      await api.activateCampaignAiConfig(targetCampaign.campaign_id, payload);
      await loadDashboardData();
    } catch (err: any) {
      alert(err.message || "Failed to activate AI Optimization.");
    } finally {
      setActivatingId(null);
      setTargetCampaign(null);
    }
  };

  const navigateToCampaign = (campaignId: string) => {
    router.push(`/campaigns?c=${campaignId}`);
  };

  if (loadingAccounts || (loading && !data)) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-8">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
        <p className="text-sm font-semibold text-slate-500">Loading AI Optimization Dashboard...</p>
      </div>
    );
  }

  if (!selectedAccount) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
        <Bot className="text-slate-300 mb-4" size={48} />
        <h2 className="text-lg font-black text-slate-700">No Ad Account Selected</h2>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          Please select a Meta Ads account from the header to view and configure campaign-level AI Optimization.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
        <AlertTriangle className="text-rose-500 mb-4" size={48} />
        <h2 className="text-lg font-black text-slate-700">Failed to Load Dashboard</h2>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed mb-4">{error}</p>
        <button 
          onClick={loadDashboardData}
          className="btn btn-primary py-2 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const activeCount = data?.active_count || 0;
  const limit = data?.limit || 0;
  const campaigns = data?.campaigns || [];
  const activeCampaignsCount = campaigns.filter((c: any) => c.is_active).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Premium Header banner */}
      <div className="relative overflow-hidden bg-slate-900 rounded-2xl p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="relative z-10 space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
            <Sparkles size={10} /> Continuous AI Performance Engine
          </div>
          <h1 className="text-3xl font-black tracking-tight">AI Optimization Center</h1>
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            Activate autonomous monitoring on key campaigns. The system will track delivery metrics dynamically at each account sync cycle and deliver advanced recommendations for budgeting, creative rotators, and bid corrections.
          </p>
        </div>
        
        {/* Limit progress bar card */}
        <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/15 p-5 rounded-xl min-w-[240px] space-y-3 shrink-0">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-slate-300">Campaign Limits Utilization</span>
            <span className="text-white font-extrabold">{activeCount} / {limit} Used</span>
          </div>
          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${activeCount >= limit ? "bg-rose-500" : "bg-blue-400"}`}
              style={{ width: `${Math.min(100, limit > 0 ? (activeCount / limit) * 100 : 0)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 leading-normal">
            Your SaaS plan allows up to <strong className="text-white font-bold">{limit} campaigns</strong> globally to be optimized concurrently.
          </p>
        </div>
      </div>

      {/* Campaigns Listing Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-slate-800">Meta Ads Campaigns</h2>
            <p className="text-xs text-slate-400 mt-0.5">Toggle and configure AI Optimization for selected campaigns.</p>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-100/50 border border-slate-200/60 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600">
            <Bot size={14} className="text-blue-500" />
            <span>Active Optimization: {activeCampaignsCount} Campaigns</span>
          </div>
        </div>

        {campaigns.length === 0 ? (
          <div className="bg-white border border-border rounded-xl p-12 text-center max-w-md mx-auto space-y-3">
            <Bot className="text-slate-300 mx-auto" size={40} />
            <h3 className="text-sm font-black text-slate-700">No Campaigns Found</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              We couldn't find any campaigns for this Meta Ad Account. Try initiating a manual account sync.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left divide-y divide-border">
                <thead className="bg-slate-50/50">
                  <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border">
                    <th className="p-4">Campaign Name & Objective</th>
                    <th className="p-4">AI Optimization</th>
                    <th className="p-4 text-right">Spend (7D)</th>
                    <th className="p-4 text-right">CPL (7D)</th>
                    <th className="p-4 text-right">ROAS (7D)</th>
                    <th className="p-4 text-center">Active Recommendations</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium text-slate-700">
                  {campaigns.map((c: any) => {
                    const hasCplTrend = c.cpl_change_7d !== 0;
                    const hasRoasTrend = c.roas_change_7d !== 0;
                    const isUpCpl = c.cpl_change_7d > 0;
                    const isUpRoas = c.roas_change_7d > 0;

                    return (
                      <tr 
                        key={c.campaign_id} 
                        className="hover:bg-slate-50/70 transition cursor-pointer"
                        onClick={() => navigateToCampaign(c.campaign_id)}
                      >
                        {/* Name & Objective */}
                        <td className="p-4 max-w-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-800 hover:text-blue-600 transition truncate">
                              {c.campaign_name}
                            </span>
                            {c.over_limit && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-100 text-[9px] font-bold text-rose-700">
                                Over Limit
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-bold uppercase">
                              {c.objective?.replace(/_/g, " ")}
                            </span>
                            <span className="text-[9px] text-slate-400">
                              {c.ad_account_name}
                            </span>
                          </div>
                        </td>

                        {/* Status Toggle Cell */}
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleToggle(c)}
                              disabled={activatingId !== null}
                              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer duration-300 focus:outline-hidden ${
                                c.is_active ? (c.over_limit ? "bg-rose-500 justify-end" : "bg-blue-600 justify-end") : "bg-slate-200 justify-start"
                              }`}
                            >
                              <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300" />
                            </button>
                            <span className={`text-[10px] font-bold uppercase ${c.is_active ? (c.over_limit ? "text-rose-500" : "text-blue-600") : "text-slate-400"}`}>
                              {c.is_active ? (c.over_limit ? "Over Limit" : "Active") : "Inactive"}
                            </span>
                          </div>
                        </td>

                        {/* 7D Spend */}
                        <td className="p-4 text-right font-semibold">
                          {formatCurrency(c.spend)}
                        </td>

                        {/* 7D CPL */}
                        <td className="p-4 text-right">
                          <div className="font-semibold">{formatCurrency(c.cpl)}</div>
                          {hasCplTrend && (
                            <div className={`inline-flex items-center gap-0.5 text-[9px] font-bold ${isUpCpl ? "text-rose-600" : "text-emerald-600"}`}>
                              {isUpCpl ? "▲" : "▼"}{Math.abs(c.cpl_change_7d * 100).toFixed(0)}%
                            </div>
                          )}
                        </td>

                        {/* 7D ROAS */}
                        <td className="p-4 text-right">
                          <div className="font-semibold text-green-600">{c.roas.toFixed(2)}x</div>
                          {hasRoasTrend && (
                            <div className={`inline-flex items-center gap-0.5 text-[9px] font-bold ${isUpRoas ? "text-emerald-600" : "text-rose-600"}`}>
                              {isUpRoas ? "▲" : "▼"}{Math.abs(c.roas_change_7d * 100).toFixed(0)}%
                            </div>
                          )}
                        </td>

                        {/* Active Alerts */}
                        <td className="p-4 text-center">
                          {c.open_recommendations_count > 0 ? (
                            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              c.highest_priority === "critical" 
                                ? "text-rose-700 bg-rose-50 border border-rose-100" 
                                : c.highest_priority === "warning"
                                ? "text-amber-700 bg-amber-50 border border-amber-100"
                                : "text-blue-700 bg-blue-50 border border-blue-100"
                            }`}>
                              <AlertTriangle size={10} />
                              {c.open_recommendations_count} Alert(s)
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">None</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right">
                          <button 
                            className="text-blue-600 hover:text-blue-700 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateToCampaign(c.campaign_id);
                            }}
                          >
                            Details <ChevronRight size={14} />
                          </button>
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

      {/* Activation Settings Modal */}
      {showModal && targetCampaign && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-100 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-slate-900 text-white p-6 relative">
              <button 
                onClick={() => {
                  setShowModal(false);
                  setTargetCampaign(null);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-2">
                <Bot className="text-blue-400 animate-pulse" size={24} />
                <h3 className="text-lg font-black tracking-wide">Configure AI Optimization</h3>
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Confirm target parameters for campaign optimization.
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-lg text-xs font-bold text-slate-600">
                <span>Plan Limits Utilization:</span>
                <span className={`${activeCount >= limit ? "text-rose-600" : "text-blue-600"}`}>
                  {activeCount} / {limit} Campaigns Active
                </span>
              </div>

              {activeCount >= limit ? (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-xl text-xs space-y-1.5">
                  <div className="font-extrabold flex items-center gap-1.5">
                    <AlertTriangle size={14} /> AI Optimization Limit Reached
                  </div>
                  <p className="leading-relaxed">
                    You have reached your AI Optimization limit for your current plan. Please upgrade your subscription plan or deactivate optimization on another campaign before activating this one.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Target CPL (Cost Per Lead) - Optional
                    </label>
                    <input 
                      type="number"
                      placeholder="e.g. 150"
                      value={kpiInputs.target_cpl}
                      onChange={(e) => setKpiInputs({...kpiInputs, target_cpl: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-700 focus:outline-hidden focus:border-blue-500 transition"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Target ROAS (Return on Ad Spend) - Optional
                    </label>
                    <input 
                      type="number"
                      step="0.1"
                      placeholder="e.g. 3.5"
                      value={kpiInputs.target_roas}
                      onChange={(e) => setKpiInputs({...kpiInputs, target_roas: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-700 focus:outline-hidden focus:border-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Primary Business Objective - Optional
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Maximize Leads"
                      value={kpiInputs.business_objective}
                      onChange={(e) => setKpiInputs({...kpiInputs, business_objective: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-700 focus:outline-hidden focus:border-blue-500 transition"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-end gap-2.5">
              <button 
                onClick={() => {
                  setShowModal(false);
                  setTargetCampaign(null);
                }}
                className="btn btn-outline py-2 px-4 rounded-xl text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              {activeCount < limit && (
                <button 
                  onClick={handleConfirmActivate}
                  className="btn btn-primary py-2 px-5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition cursor-pointer"
                >
                  Confirm Activation
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
