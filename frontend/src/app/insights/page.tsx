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
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export default function InsightsPage() {
  const { selectedAccount, loadingAccounts } = useAdAccount();
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [recs, setRecs] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "KEEP" | "WATCH" | "FIX" | "TEST" | "DONT_CHANGE">("ALL");

  const loadData = async () => {
    if (!selectedAccount) return;
    setLoading(true);
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 29);
      const startStr = start.toISOString().split("T")[0];
      const endStr = end.toISOString().split("T")[0];

      const [campData, recData] = await Promise.all([
        api.getCampaigns(selectedAccount.id, startStr, endStr),
        api.getRecommendations(selectedAccount.id)
      ]);

      setCampaigns(campData);
      setRecs(recData);
    } catch (err) {
      console.error("Failed to load insights data:", err);
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
            <h1 className="page-title text-2xl font-bold text-slate-800">Opportunity Center</h1>
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

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title text-2xl font-bold text-slate-800">Opportunity & Prioritization Center</h1>
          <p className="page-subtitle text-sm text-subtle mt-1">
            Focus budget where it generates conversions, identify potential spend at risk, and prevent downstream page leaks
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 border border-border px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Connected: {selectedAccount.name}
        </div>
      </div>

      {/* Decision Framework States Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { key: "KEEP", label: "🟢 KEEP", desc: "Healthy conversions. Keep running.", count: 2 },
          { key: "WATCH", label: "🟡 WATCH", desc: "Performance changing. Watch metrics.", count: 1 },
          { key: "FIX", label: "🔴 FIX", desc: "Performance leak. Action required.", count: recs.length },
          { key: "TEST", label: "🔵 TEST", desc: "Strong opportunity for A/B tests.", count: 1 },
          { key: "DONT_CHANGE", label: "⚪ DONT CHANGE", desc: "Intervention is not justified.", count: 1 }
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
              <span className="text-xs font-black uppercase tracking-wider">{state.label}</span>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <span className="font-semibold text-slate-700">Ad A (Summer Offer Copy)</span>
              <div className="text-right">
                <span className="font-bold text-slate-800">₹1,420</span>
                <span className="text-[10px] text-red-500 block font-bold">-42% vs benchmark</span>
              </div>
            </div>
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <span className="font-semibold text-slate-700">Ad B (Static Product Feature)</span>
              <div className="text-right">
                <span className="font-bold text-slate-800">₹1,180</span>
                <span className="text-[10px] text-red-500 block font-bold">-37% vs benchmark</span>
              </div>
            </div>
            <div className="flex justify-between items-center pb-2">
              <span className="font-semibold text-slate-700">Ad C (Standard CTA banner)</span>
              <div className="text-right">
                <span className="font-bold text-slate-800">₹930</span>
                <span className="text-[10px] text-red-500 block font-bold">-31% vs benchmark</span>
              </div>
            </div>
          </div>

          <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-100 space-y-1">
            <div className="text-[9px] font-black uppercase tracking-wider">Total Potential Spend at Risk</div>
            <div className="text-xl font-black">₹3,530</div>
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
            {/* Campaign A */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center font-bold">
                <span className="text-slate-800">Campaign A: Agency Leads</span>
                <span className="text-green-600 font-black text-sm">+16 percentage points (Budget Opportunity)</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase"><span>Spend Share</span><span>18%</span></div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-slate-400 h-full" style={{width: "18%"}} /></div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase"><span>Result Share</span><span>34%</span></div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-green-500 h-full" style={{width: "34%"}} /></div>
                </div>
              </div>
            </div>

            {/* Campaign B */}
            <div className="space-y-2 text-xs border-t border-slate-50 pt-3">
              <div className="flex justify-between items-center font-bold">
                <span className="text-slate-800">Campaign B: Retargeting Offer</span>
                <span className="text-red-500 font-black text-sm">-23 percentage points (Over-allocated)</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase"><span>Spend Share</span><span>42%</span></div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-slate-400 h-full" style={{width: "42%"}} /></div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase"><span>Result Share</span><span>19%</span></div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-red-400 h-full" style={{width: "19%"}} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Act Now, Investigate, Growth, Experiments Board */}
      <div className="space-y-4">
        <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">Opportunity Workspace</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
          {/* Act Now */}
          <div className="card border border-red-200 bg-red-50/20 p-5 rounded-lg space-y-3">
            <div className="flex items-center gap-1.5 text-red-800">
              <AlertTriangle size={16} />
              <h4 className="font-black uppercase tracking-wider">🔴 Act Now (High Impact + High Confidence)</h4>
            </div>
            <div className="space-y-3 font-semibold text-slate-700">
              <div className="bg-white p-3 rounded-lg border border-red-100 space-y-1">
                <div className="text-[10px] text-red-500 font-bold uppercase">CREATIVE_FATIGUE (Creative fatigue detected)</div>
                <p className="text-slate-800">Creative wearout is high on Campaign B. CTR has dropped by 31% over the last 7 days.</p>
                <div className="text-[9px] text-slate-400 font-bold pt-1 uppercase">Impact: High | Confidence: 91% | Urgency: High</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-red-100 space-y-1">
                <div className="text-[10px] text-red-500 font-bold uppercase">BUDGET_OPPORTUNITY (Over-allocated spend)</div>
                <p className="text-slate-800">Campaign B consumes 42% of budget but yields only 19% of conversions. Efficiency is -23 pp.</p>
                <div className="text-[9px] text-slate-400 font-bold pt-1 uppercase">Impact: High | Confidence: 94% | Urgency: High</div>
              </div>
            </div>
          </div>

          {/* Growth Opportunities */}
          <div className="card border border-green-200 bg-green-50/20 p-5 rounded-lg space-y-3">
            <div className="flex items-center gap-1.5 text-green-800">
              <TrendingUp size={16} />
              <h4 className="font-black uppercase tracking-wider">🟢 Growth Opportunities (Potential Improvement)</h4>
            </div>
            <div className="space-y-3 font-semibold text-slate-700">
              <div className="bg-white p-3 rounded-lg border border-green-100 space-y-1">
                <div className="text-[10px] text-green-600 font-bold uppercase">SCALING_OPPORTUNITY (controlled testing)</div>
                <p className="text-slate-800">Campaign A has maintained strong ROAS (3.2x) for 14 days with frequency under 1.8. Suitable for 15-20% daily budget testing.</p>
                <div className="text-[9px] text-slate-400 font-bold pt-1 uppercase">Impact: Medium | Confidence: 95% | Urgency: Medium</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-green-100 space-y-1">
                <div className="text-[10px] text-green-600 font-bold uppercase">PLACEMENT_OPPORTUNITY (Reels testing)</div>
                <p className="text-slate-800">Instagram Reels produces 31% lower CPL than the account average while maintaining similar landing page quality.</p>
                <div className="text-[9px] text-slate-400 font-bold pt-1 uppercase">Impact: Medium | Confidence: 88% | Urgency: Low</div>
              </div>
            </div>
          </div>

          {/* Investigate */}
          <div className="card border border-amber-200 bg-amber-50/20 p-5 rounded-lg space-y-3">
            <div className="flex items-center gap-1.5 text-amber-800">
              <Info size={16} />
              <h4 className="font-black uppercase tracking-wider">🟠 Investigate (Potential Issue)</h4>
            </div>
            <div className="space-y-3 font-semibold text-slate-700">
              <div className="bg-white p-3 rounded-lg border border-amber-100 space-y-1">
                <div className="text-[10px] text-amber-600 font-bold uppercase">CONVERSION_OPPORTUNITY (Downstream post-click leak)</div>
                <p className="text-slate-800">Campaign C CTR (2.2%) and CPC (₹11.00) are highly efficient, but landing page to lead conversion is only 0.8%.</p>
                <p className="text-[10px] text-slate-500 italic mt-1 bg-slate-50 p-2 rounded">
                  Do not change the ad. Ad delivery is optimal. Audit the landing page form fields and latency issues instead.
                </p>
                <div className="text-[9px] text-slate-400 font-bold pt-1 uppercase">Impact: High | Confidence: 92% | Urgency: Medium</div>
              </div>
            </div>
          </div>

          {/* Don't Change */}
          <div className="card border border-slate-200 bg-slate-50/50 p-5 rounded-lg space-y-3">
            <div className="flex items-center gap-1.5 text-slate-800">
              <Pause size={16} />
              <h4 className="font-black uppercase tracking-wider">⚪ Don't Change (Intervention Not Justified)</h4>
            </div>
            <div className="space-y-3 font-semibold text-slate-700">
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Temporary Fluctuation Safeguard</div>
                <p className="text-slate-800">CPL increased 12% today on Campaign A. However, 7-day CPL is stable and conversion volume remains within normal variation thresholds.</p>
                <div className="text-[10px] text-slate-500 italic mt-1 bg-slate-50 p-2 rounded">
                  Don't intervene yet. Changing targeting parameters now will reset Meta learning phases unnecessarily.
                </div>
                <div className="text-[9px] text-slate-400 font-bold pt-1 uppercase">Impact: Low | Confidence: 84% | Urgency: Low</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
