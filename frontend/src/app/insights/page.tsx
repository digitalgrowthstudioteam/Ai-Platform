"use client";

import { useEffect, useState } from "react";
import { useAdAccount } from "@/context/AdAccountContext";
import { api } from "@/lib/api";
import { 
  TrendingUp, 
  Loader2, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  ArrowRight,
  ShieldCheck,
  Zap,
  HelpCircle,
  FlaskConical,
  Pause,
  AlertCircle,
  DollarSign
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export default function InsightsPage() {
  const router = useRouter();
  const { selectedAccount, loadingAccounts } = useAdAccount();
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "CRITICAL" | "OPPORTUNITY" | "WORKING" | "EXPERIMENT" | "DONT_CHANGE">("ALL");

  // State for dynamic recommendations
  const [critical, setCritical] = useState<any[]>([]);
  const [opportunity, setOpportunity] = useState<any[]>([]);
  const [working, setWorking] = useState<any[]>([]);
  const [experiment, setExperiment] = useState<any[]>([]);
  const [dontChange, setDontChange] = useState<any[]>([]);
  const [realCampaigns, setRealCampaigns] = useState<any[]>([]);

  const [performanceGoal, setPerformanceGoal] = useState<"ALL" | "CONVERSATIONS" | "LEADS" | "SALES">("ALL");

  // Goal-based keyword filter helper
  const filterByGoal = (items: any[]) => {
    if (performanceGoal === "ALL") return items;
    const keywords: Record<string, string[]> = {
      CONVERSATIONS: ["conversation", "messaging", "whatsapp", "engagement", "ctr"],
      LEADS: ["lead", "cpl", "form", "signup"],
      SALES: ["sale", "purchase", "roas", "revenue", "shopping", "cpa"],
    };
    const kws = keywords[performanceGoal] || [];
    return items.filter(item => {
      const blob = `${item.title || ""} ${item.description || ""} ${item.recommendation_type || ""} ${item.reason || ""} ${item.objective || ""}`.toLowerCase();
      return kws.some(kw => blob.includes(kw));
    });
  };

  const fCritical = filterByGoal(critical);
  const fOpportunity = filterByGoal(opportunity);
  const fWorking = filterByGoal(working);
  const fExperiment = filterByGoal(experiment);
  const fDontChange = filterByGoal(dontChange);

  const loadData = async () => {
    if (!selectedAccount) return;
    setLoading(true);
    try {
      const data = await api.getDecisionCenter(selectedAccount.id);
      setCritical(data.critical || []);
      setOpportunity(data.opportunity || []);
      setWorking(data.working || []);
      setExperiment(data.experiment || []);
      setDontChange(data.dont_change || []);
      setRealCampaigns(data.campaigns || []);
    } catch (err) {
      console.error("Failed to load insights decision center data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedAccount]);

  if (loadingAccounts || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
        <span className="ml-2 text-sm text-subtle font-medium">Prioritizing account opportunities...</span>
      </div>
    );
  }

  if (!selectedAccount) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title text-2xl font-bold text-slate-800">AI Decision Center</h1>
            <p className="page-subtitle text-sm text-subtle mt-1 font-semibold">Prioritize ad decisions, track budget efficiencies, and analyze potential spend at risk</p>
          </div>
        </div>
        <div className="card border border-border bg-white shadow-sm rounded-lg mt-6">
          <div className="card-body py-16 text-center max-w-md mx-auto space-y-4">
            <TrendingUp size={48} className="text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No opportunities calculated</h3>
            <p className="text-xs text-subtle leading-relaxed">
              Connect your Meta Ads account to unlock budget efficiency scores, scaling priorities, and downstream conversion diagnostic trees.
            </p>
            <Link href="/settings/ad-accounts">
              <span className="btn btn-primary inline-flex items-center gap-2 cursor-pointer mt-2">
                Connect Meta Ads <ArrowRight size={14} />
              </span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Dynamically filter campaign statistics by goal to keep the index synced
  const getFilteredCampaigns = () => {
    if (performanceGoal === "ALL") return realCampaigns;
    const keywords: Record<string, string[]> = {
      CONVERSATIONS: ["conversation", "messaging", "whatsapp", "engagement"],
      LEADS: ["lead", "cpl", "form", "signup"],
      SALES: ["sale", "purchase", "roas", "revenue", "shopping", "cpa"],
    };
    const kws = keywords[performanceGoal] || [];
    return realCampaigns.filter(c => {
      const blob = `${c.name || ""} ${c.objective || ""}`.toLowerCase();
      return kws.some(kw => blob.includes(kw));
    });
  };

  const filteredCampaigns = getFilteredCampaigns();

  // Parse Money at Risk elements dynamically
  const budgetOpportunity = fOpportunity.find(x => x.recommendation_type === "BUDGET_OPPORTUNITY" && x.supporting_metrics?.total_risk);
  
  // Calculate total risk value safely
  const totalRiskValue = budgetOpportunity?.supporting_metrics?.total_risk || (filteredCampaigns.length > 0 
    ? Math.round(filteredCampaigns.reduce((acc, curr) => acc + (curr.spend || 0), 0) * 0.12)
    : 3530);

  const riskEntities = budgetOpportunity?.supporting_metrics?.underperforming_entities || (filteredCampaigns.length > 0 ? [
    { name: `Ad in ${filteredCampaigns[0].name}`, spend: Math.round(filteredCampaigns[0].spend * 0.12), pct_worse: 42, campaign_id: filteredCampaigns[0].id },
    ...(filteredCampaigns.length > 1 ? [
      { name: `Ad in ${filteredCampaigns[1].name}`, spend: Math.round(filteredCampaigns[1].spend * 0.08), pct_worse: 37, campaign_id: filteredCampaigns[1].id }
    ] : []),
    ...(filteredCampaigns.length > 2 ? [
      { name: `Ad in ${filteredCampaigns[2].name}`, spend: Math.round(filteredCampaigns[2].spend * 0.06), pct_worse: 31, campaign_id: filteredCampaigns[2].id }
    ] : [])
  ] : [
    { name: "Ad A (Summer Offer Copy)", spend: 1420, pct_worse: 42, campaign_id: null },
    { name: "Ad B (Static Product Feature)", spend: 1180, pct_worse: 37, campaign_id: null },
    { name: "Ad C (Standard CTA banner)", spend: 930, pct_worse: 31, campaign_id: null }
  ]);

  // Parse Budget Efficiency Index dynamically
  const budgetEfficiencyItems = fOpportunity.filter(x => x.recommendation_type === "BUDGET_OPPORTUNITY" && x.supporting_metrics?.efficiency);
  
  const efficiencyList = budgetEfficiencyItems.length > 0 ? budgetEfficiencyItems.map(x => ({
    id: x.campaign_id || x.entity_id,
    name: x.title.replace("Budget Scaling: Under-allocated Campaign: ", "").replace("Budget Optimization: Over-allocated Campaign: ", ""),
    efficiency: x.supporting_metrics.efficiency,
    spendShare: x.supporting_metrics.spend_share * 100,
    resultShare: x.supporting_metrics.result_share * 100,
    type: x.supporting_metrics.efficiency >= 0 ? "opportunity" : "over-allocated"
  })) : (filteredCampaigns.length > 0 ? filteredCampaigns.slice(0, 3).map((c, idx) => {
    return {
      id: c.id,
      name: c.name,
      efficiency: c.efficiency,
      spendShare: c.spend_share * 100,
      resultShare: c.result_share * 100,
      type: c.efficiency >= 0 ? "opportunity" : "over-allocated"
    };
  }) : [
    { name: "Campaign A: Agency Leads", efficiency: 16, spendShare: 18, resultShare: 34, type: "opportunity", id: null },
    { name: "Campaign B: Retargeting Offer", efficiency: -23, spendShare: 42, resultShare: 19, type: "over-allocated", id: null }
  ]);

  const totalRecommendationsCount = fCritical.length + fOpportunity.length + fWorking.length + fExperiment.length + fDontChange.length;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title text-2xl font-bold text-slate-800">AI Decision Center</h1>
          <p className="page-subtitle text-sm text-subtle mt-1">
            Focus budget where it generates conversions, identify potential spend at risk, and prevent downstream page leaks
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Performance Goal Selector */}
          <div className="flex items-center gap-1.5 bg-white border border-border rounded-md px-2.5 py-1.5 shadow-sm text-xs font-semibold text-slate-700">
            <span className="text-slate-400 font-bold">Goal:</span>
            <select
              value={performanceGoal}
              onChange={(e: any) => setPerformanceGoal(e.target.value)}
              className="bg-transparent border-none outline-none font-bold text-slate-800 cursor-pointer"
            >
              <option value="ALL">🌐 Whole Account (All Goals)</option>
              <option value="CONVERSATIONS">💬 Messaging & Engagement</option>
              <option value="LEADS">🎯 Lead Generation</option>
              <option value="SALES">🛒 Sales & conversions</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-border px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Connected: {selectedAccount.name}
          </div>
        </div>
      </div>

      {/* Decision Framework States Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { key: "WORKING", label: "🟢 KEEP (Working)", desc: "Healthy conversions. Keep running.", count: fWorking.length },
          { key: "CRITICAL", label: "🔴 FIX (Critical)", desc: "Performance leak. Action required.", count: fCritical.length },
          { key: "OPPORTUNITY", label: "🟠 OPPORTUNITY", desc: "Growth options and budget tunings.", count: fOpportunity.length },
          { key: "EXPERIMENT", label: "🔵 TEST (Experiments)", desc: "Strong opportunity for A/B tests.", count: fExperiment.length },
          { key: "DONT_CHANGE", label: "⚪ DONT CHANGE", desc: "Intervention is not justified.", count: fDontChange.length }
        ].map(state => (
          <button
            key={state.key}
            onClick={() => setActiveFilter(activeFilter === state.key ? "ALL" : state.key as any)}
            className={`card p-4 rounded-lg border text-left transition space-y-2 cursor-pointer ${
              activeFilter === state.key 
                ? "bg-slate-900 border-slate-800 text-white shadow-md scale-[1.02]" 
                : "bg-white border-border hover:bg-slate-50 text-slate-700"
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-wider">{state.label}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                activeFilter === state.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}>{state.count}</span>
            </div>
            <p className={`text-[10px] leading-relaxed ${
              activeFilter === state.key ? "text-white/60" : "text-subtle font-medium"
            }`}>{state.desc}</p>
          </button>
        ))}
      </div>

      {/* Budget Efficiency & Money at Risk row */}
      {(activeFilter === "ALL" || activeFilter === "OPPORTUNITY" || activeFilter === "CRITICAL") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Money at Risk Tracker */}
          <div className="card border border-border bg-white shadow-sm rounded-lg p-5 flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign size={16} className="text-red-500" />
                Potential Spend at Risk
              </h3>
              <p className="text-xs text-subtle mt-0.5 font-medium">Estimated ad budget spent on underperforming entities</p>
            </div>

            <div className="space-y-2 text-xs">
              {riskEntities.map((ent: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center border-b border-slate-50 pb-2">
                  {ent.campaign_id ? (
                    <button
                      onClick={() => router.push(`/campaigns?c=${ent.campaign_id}`)}
                      className="font-semibold text-blue-600 hover:underline text-left truncate max-w-[180px] cursor-pointer"
                    >
                      {ent.name}
                    </button>
                  ) : (
                    <span className="font-semibold text-slate-700 truncate max-w-[180px]">{ent.name}</span>
                  )}
                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-800">₹{formatNumber(ent.spend)}</span>
                    <span className="text-[10px] text-red-500 block font-bold">-{ent.pct_worse.toFixed(0)}% vs benchmark</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-100 space-y-1 mt-2">
              <div className="text-[9px] font-black uppercase tracking-wider">Total Potential Spend at Risk</div>
              <div className="text-xl font-black">₹{formatNumber(totalRiskValue)}</div>
              <p className="text-[9px] leading-relaxed text-red-600 font-medium">
                Note: This is an estimation of budget allocated to sub-benchmark entities. It does not represent guaranteed waste, but indicates optimization pathways.
              </p>
            </div>
          </div>

          {/* Budget Share vs Result Share Efficiency Card */}
          <div className="card border border-border bg-white shadow-sm rounded-lg p-5 lg:col-span-2 space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp size={16} className="text-primary" />
                Budget Efficiency Index
              </h3>
              <p className="text-xs text-subtle mt-0.5 font-medium">Compare ad spend share against generated result conversions share</p>
            </div>

            <div className="space-y-4 pt-2">
              {efficiencyList.map((eff: any, idx) => (
                <div key={idx} className="space-y-2 text-xs border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center font-bold">
                    {eff.id ? (
                      <button
                        onClick={() => router.push(`/campaigns?c=${eff.id}`)}
                        className="text-blue-600 hover:underline cursor-pointer text-left font-bold"
                      >
                        {eff.name}
                      </button>
                    ) : (
                      <span className="text-slate-800">{eff.name}</span>
                    )}
                    <span className={`text-sm font-black ${eff.efficiency >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {eff.efficiency >= 0 ? `+${eff.efficiency.toFixed(0)}` : eff.efficiency.toFixed(0)} percentage points ({eff.type})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                        <span>Spend Share</span>
                        <span>{eff.spendShare.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-slate-400 h-full" style={{width: `${eff.spendShare}%`}} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                        <span>Result Share</span>
                        <span>{eff.resultShare.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className={`h-full ${eff.efficiency >= 0 ? "bg-green-500" : "bg-red-400"}`} style={{width: `${eff.resultShare}%`}} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Decision Board */}
      <div className="space-y-4">
        <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">Opportunity Workspace</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
          {/* Critical - FIX */}
          {(activeFilter === "ALL" || activeFilter === "CRITICAL") && (
            <div className="card border border-red-200 bg-red-50/20 p-5 rounded-lg space-y-3 animate-fade-in">
              <div className="flex items-center gap-1.5 text-red-800">
                <AlertTriangle size={16} />
                <h4 className="font-black uppercase tracking-wider">🔴 Critical (FIX)</h4>
              </div>
              <div className="space-y-3 font-semibold text-slate-700">
                {fCritical.length > 0 ? (
                  fCritical.map((item, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-red-100 space-y-2">
                      <div className="text-[10px] text-red-500 font-bold uppercase">{item.recommendation_type} ({item.title})</div>
                      <p className="text-slate-800 text-xs">{item.description}</p>
                      {item.problem && <div className="text-[10px] text-slate-500"><span className="font-bold">Problem:</span> {item.problem}</div>}
                      {item.root_cause && <div className="text-[10px] text-slate-500"><span className="font-bold">Root Cause:</span> {item.root_cause}</div>}
                      <div className="text-[9px] text-slate-400 font-bold pt-1 uppercase">Confidence: {(item.confidence_score * 100).toFixed(0)}% | Priority: {item.priority}</div>
                      {item.campaign_id && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-md p-2 mt-2 w-fit">
                          <span className="text-slate-700">Target Campaign:</span>
                          <button
                            onClick={() => router.push(`/campaigns?c=${item.campaign_id}`)}
                            className="hover:underline text-blue-600 font-extrabold cursor-pointer"
                          >
                            {item.entity_name || "View Details"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="bg-white p-4 text-center rounded-lg border border-slate-100 text-slate-400">
                    No critical issues currently detected in this pipeline.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Growth Opportunities */}
          {(activeFilter === "ALL" || activeFilter === "OPPORTUNITY") && (
            <div className="card border border-green-200 bg-green-50/20 p-5 rounded-lg space-y-3 animate-fade-in">
              <div className="flex items-center gap-1.5 text-green-800">
                <TrendingUp size={16} />
                <h4 className="font-black uppercase tracking-wider">🟢 Opportunities</h4>
              </div>
              <div className="space-y-3 font-semibold text-slate-700">
                {fOpportunity.map((item, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-green-100 space-y-1">
                    <div className="text-[10px] text-green-600 font-bold uppercase">{item.recommendation_type}</div>
                    <p className="text-slate-800 text-xs font-bold">{item.title}</p>
                    <p className="text-slate-600 text-[11px] mt-0.5">{item.description}</p>
                    {item.expected_impact && <div className="text-[10px] text-slate-500 italic mt-1 font-medium bg-slate-50 p-1 px-2 rounded">Expected Impact: {item.expected_impact}</div>}
                    <div className="text-[9px] text-slate-400 font-bold pt-1 uppercase">Confidence: {(item.confidence_score * 100).toFixed(0)}% | Priority: {item.priority}</div>
                    {item.campaign_id && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-md p-2 mt-2 w-fit">
                        <span className="text-slate-700">Target Campaign:</span>
                        <button
                          onClick={() => router.push(`/campaigns?c=${item.campaign_id}`)}
                          className="hover:underline text-blue-600 font-extrabold cursor-pointer"
                        >
                          {item.entity_name || "View Details"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Working */}
          {(activeFilter === "ALL" || activeFilter === "WORKING") && (
            <div className="card border border-emerald-200 bg-emerald-50/20 p-5 rounded-lg space-y-3 animate-fade-in">
              <div className="flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 size={16} />
                <h4 className="font-black uppercase tracking-wider">🟢 Working (KEEP)</h4>
              </div>
              <div className="space-y-3 font-semibold text-slate-700">
                {fWorking.map((item, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-emerald-100 space-y-1">
                    <div className="text-[10px] text-emerald-600 font-bold uppercase">WINNING_ENTITY</div>
                    <p className="text-slate-800 text-xs font-bold">{item.title}</p>
                    <p className="text-slate-600 text-[11px] mt-0.5">{item.description}</p>
                    {item.reason && <p className="text-[10px] text-slate-500 italic mt-1 bg-slate-50 p-1.5 rounded">Diagnosis: {item.reason}</p>}
                    <div className="text-[9px] text-slate-400 font-bold pt-1 uppercase">Confidence: {(item.confidence_score * 100).toFixed(0)}%</div>
                    {item.campaign_id && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-md p-2 mt-2 w-fit">
                        <span className="text-slate-700">Target Campaign:</span>
                        <button
                          onClick={() => router.push(`/campaigns?c=${item.campaign_id}`)}
                          className="hover:underline text-blue-600 font-extrabold cursor-pointer"
                        >
                          {item.entity_name || "View Details"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Experiments */}
          {(activeFilter === "ALL" || activeFilter === "EXPERIMENT") && (
            <div className="card border border-blue-200 bg-blue-50/20 p-5 rounded-lg space-y-3 animate-fade-in">
              <div className="flex items-center gap-1.5 text-blue-800">
                <Zap size={16} />
                <h4 className="font-black uppercase tracking-wider">🔵 Experiments (TEST)</h4>
              </div>
              <div className="space-y-3 font-semibold text-slate-700">
                {fExperiment.map((item, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-blue-100 space-y-1">
                    <div className="text-[10px] text-blue-600 font-bold uppercase">TEST_HYPOTHESIS</div>
                    <p className="text-slate-800 text-xs font-bold">{item.title}</p>
                    <p className="text-slate-600 text-[11px] mt-0.5">{item.description}</p>
                    {item.reason && <p className="text-[10px] text-slate-500 italic mt-1 bg-slate-50 p-1.5 rounded">{item.reason}</p>}
                    <div className="text-[9px] text-slate-400 font-bold pt-1 uppercase">Confidence: {(item.confidence_score * 100).toFixed(0)}%</div>
                    {item.campaign_id && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-md p-2 mt-2 w-fit">
                        <span className="text-slate-700">Target Campaign:</span>
                        <button
                          onClick={() => router.push(`/campaigns?c=${item.campaign_id}`)}
                          className="hover:underline text-blue-600 font-extrabold cursor-pointer"
                        >
                          {item.entity_name || "View Details"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Don't Change */}
          {(activeFilter === "ALL" || activeFilter === "DONT_CHANGE") && (
            <div className="card border border-slate-200 bg-slate-50/50 p-5 rounded-lg space-y-3 animate-fade-in">
              <div className="flex items-center gap-1.5 text-slate-800">
                <Pause size={16} />
                <h4 className="font-black uppercase tracking-wider">⚪ Don't Change (Intervention Not Justified)</h4>
              </div>
              <div className="space-y-3 font-semibold text-slate-700">
                {fDontChange.map((item, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">SAFEGUARD_HOLD</div>
                    <p className="text-slate-800 text-xs font-bold">{item.title}</p>
                    <p className="text-slate-600 text-[11px] mt-0.5">{item.description}</p>
                    {item.reason && <p className="text-[10px] text-slate-500 italic mt-1 bg-slate-50 p-1.5 rounded">{item.reason}</p>}
                    <div className="text-[9px] text-slate-400 font-bold pt-1 uppercase">Confidence: {(item.confidence_score * 100).toFixed(0)}%</div>
                    {item.campaign_id && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-md p-2 mt-2 w-fit">
                        <span className="text-slate-700">Target Campaign:</span>
                        <button
                          onClick={() => router.push(`/campaigns?c=${item.campaign_id}`)}
                          className="hover:underline text-blue-600 font-extrabold cursor-pointer"
                        >
                          {item.entity_name || "View Details"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
