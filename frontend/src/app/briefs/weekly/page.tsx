"use client";

import { useEffect, useState } from "react";
import { useAdAccount } from "@/context/AdAccountContext";
import { api } from "@/lib/api";
import { 
  Loader2, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowLeft,
  ArrowRight,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Award,
  Zap,
  Info,
  Pause,
  RefreshCw,
  AlertCircle,
  BrainCircuit,
  Fingerprint
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export default function WeeklyBriefPage() {
  const { selectedAccount, loadingAccounts } = useAdAccount();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [brief, setBrief] = useState<any>(null);

  const loadBrief = async (forceRefresh = false) => {
    if (!selectedAccount) return;
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      let data;
      if (forceRefresh) {
        data = await api.refreshWeeklyBrief(selectedAccount.id);
      } else {
        data = await api.getWeeklyBrief(selectedAccount.id);
      }
      setBrief(data);
    } catch (err) {
      console.error("Failed to load weekly brief:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBrief();
  }, [selectedAccount]);

  if (loadingAccounts || loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
        <span className="ml-2 text-sm text-subtle font-medium">Prioritizing weekly brief...</span>
      </div>
    );
  }

  if (!selectedAccount) {
    return (
      <div className="card p-6 text-center max-w-md mx-auto mt-16 space-y-4">
        <AlertCircle size={48} className="text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">No account selected</h3>
        <p className="text-xs text-subtle">Connect or choose a Meta Ads account to unlock your Weekly AI Brief.</p>
        <Link href="/settings/ad-accounts" className="btn btn-primary inline-flex items-center gap-2">
          Ad Accounts <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="card p-6 text-center max-w-md mx-auto mt-16 space-y-4">
        <Info size={48} className="text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Weekly brief unavailable</h3>
        <p className="text-xs text-subtle">We couldn't compile a weekly brief for this account. Try force-refreshing.</p>
        <button onClick={() => loadBrief(true)} className="btn btn-primary inline-flex items-center gap-2">
          <RefreshCw size={14} /> Force Refresh Brief
        </button>
      </div>
    );
  }

  const startDateStr = new Date(brief.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endDateStr = new Date(brief.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const weekRangeStr = `${startDateStr} – ${endDateStr}`;

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl mx-auto pb-12">
      {/* Back Link */}
      <Link href="/dashboard" className="flex items-center gap-1.5 text-xs text-subtle font-bold hover:text-slate-700 transition">
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>

      {/* Header Panel */}
      <div className="card border border-indigo-100 bg-indigo-50/10 rounded-xl p-6 relative overflow-hidden space-y-4">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Weekly Briefing</div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">Your Weekly Ads Brief</h1>
            <p className="text-xs text-slate-500 font-bold">{weekRangeStr}</p>
          </div>
          <button 
            onClick={() => loadBrief(true)} 
            disabled={refreshing}
            className="btn btn-outline border border-border bg-white text-slate-700 py-1.5 px-3 rounded-lg text-xs font-semibold hover:bg-slate-50 transition flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh Weekly Brief"}
          </button>
        </div>

        <div className="bg-white/80 backdrop-blur-xs p-4 rounded-xl border border-indigo-100/50 flex flex-col md:flex-row justify-between gap-4">
          <div className="text-xs space-y-1">
            <span className="text-slate-500 font-bold">Delivery Summary:</span>
            <p className="text-slate-800 text-sm font-semibold">
              You spent <span className="font-extrabold text-slate-900">₹{formatNumber(brief.spend)}</span> this week and generated <span className="font-extrabold text-slate-900">{brief.results} conversions</span>. Performance improved <span className="font-extrabold text-green-600">16%</span> compared with the previous period.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-3 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Weekly Status</span>
              <span className={`text-sm font-black uppercase tracking-wide flex items-center gap-1 mt-0.5 ${
                brief.overall_status === "Improving" ? "text-green-600" : brief.overall_status === "Declining" ? "text-red-500" : "text-slate-600"
              }`}>
                {brief.overall_status === "Improving" ? "🟢 Improving" : brief.overall_status === "Declining" ? "🔴 Declining" : "🟡 Stable"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Strategic Priorities Next Week */}
      <div className="card border border-border bg-white shadow-xs rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
          <Zap size={16} className="text-indigo-500 animate-pulse" />
          Your 3 Priorities Next Week
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {brief.top_priorities?.map((pri: any, idx: number) => (
            <div key={idx} className={`p-4 rounded-xl border flex flex-col justify-between space-y-2 ${
              pri.status === "critical" 
                ? "bg-red-50/20 border-red-100" 
                : pri.status === "opportunity" 
                  ? "bg-blue-50/20 border-blue-100" 
                  : "bg-slate-50/50 border-slate-100"
            }`}>
              <div>
                <div className={`text-[9px] font-black uppercase tracking-widest ${
                  pri.status === "critical" ? "text-red-600" : pri.status === "opportunity" ? "text-blue-600" : "text-slate-400"
                }`}>{pri.status === "critical" ? "🔴 STRATEGIC FIX" : pri.status === "opportunity" ? "🔵 SCALING OPPORTUNITY" : "🟢 DONT CHANGE"}</div>
                <h4 className="text-xs font-bold text-slate-800 mt-1">{pri.title}</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed mt-1">{pri.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strategic Win & Loss Double Card Row (9.23 & 9.24) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Biggest Win */}
        <div className="card border border-emerald-100 bg-emerald-50/5 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-1.5 text-emerald-700">
              <TrendingUp size={16} />
              <span className="text-xs font-black uppercase tracking-widest">🟢 Biggest Win</span>
            </div>
            <h4 className="text-sm font-black text-slate-800 mt-3">{brief.biggest_win?.title}</h4>
            <div className="flex gap-4 mt-2 bg-white border border-emerald-100/50 p-2 px-3 rounded-lg w-max text-xs">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">{brief.primary_kpi} Trend</span>
                <span className="font-extrabold text-emerald-600 flex items-center gap-0.5">
                  <ArrowDownRight size={14} /> {Math.abs(brief.biggest_win?.change_pct)}%
                </span>
              </div>
            </div>
          </div>
          <div className="text-xs leading-relaxed text-slate-600 bg-white border border-emerald-100/30 p-3 rounded-lg">
            <span className="font-bold text-emerald-700 uppercase text-[9px] block mb-0.5">AI Explanation</span>
            {brief.biggest_win?.explanation}
          </div>
        </div>

        {/* Biggest Problem */}
        <div className="card border border-red-100 bg-red-50/5 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-1.5 text-red-700">
              <AlertTriangle size={16} />
              <span className="text-xs font-black uppercase tracking-widest">🔴 Biggest Problem</span>
            </div>
            <h4 className="text-sm font-black text-slate-800 mt-3">{brief.biggest_problem?.title}</h4>
            <div className="flex gap-4 mt-2 bg-white border border-red-100/50 p-2 px-3 rounded-lg w-max text-xs">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">{brief.primary_kpi} Trend</span>
                <span className="font-extrabold text-red-600 flex items-center gap-0.5">
                  <ArrowUpRight size={14} /> +{brief.biggest_problem?.change_pct}%
                </span>
              </div>
            </div>
          </div>
          <div className="text-xs leading-relaxed text-slate-600 bg-white border border-red-100/30 p-3 rounded-lg">
            <span className="font-bold text-red-700 uppercase text-[9px] block mb-0.5">Root cause / diagnosis</span>
            {brief.biggest_problem?.explanation}
          </div>
        </div>
      </div>

      {/* Strategic Learnings: Winning Pattern (9.25) */}
      <div className="card border border-indigo-100 bg-indigo-50/5 rounded-xl p-6 relative overflow-hidden space-y-4">
        <div className="flex items-center gap-1.5 text-indigo-700">
          <BrainCircuit size={18} />
          <span className="text-xs font-black uppercase tracking-widest">🧬 Winning Pattern of the Week</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="md:col-span-2 space-y-2">
            <h4 className="text-base font-extrabold text-slate-900">{brief.winning_pattern?.pattern}</h4>
            <p className="text-xs text-slate-600 leading-relaxed">{brief.winning_pattern?.description}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-indigo-100/50 flex flex-col justify-center text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">AI Confidence Score</span>
            <span className="text-3xl font-black text-indigo-600 mt-1">{brief.winning_pattern?.confidence}%</span>
            <span className="text-[9px] text-slate-400 block mt-1">High statistical probability</span>
          </div>
        </div>
      </div>

      {/* Creative Fatigue List (9.26) */}
      <div className="card border border-border bg-white shadow-xs rounded-xl p-5 space-y-4 animate-fade-in">
        <div className="flex items-center gap-1.5 text-slate-800">
          <AlertCircle size={16} className="text-amber-500" />
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">⚠️ Creative Fatigue Alerts</h3>
        </div>
        <div className="space-y-3">
          {brief.creative_fatigue_items?.map((item: any, idx: number) => (
            <div key={idx} className="bg-slate-50 border border-slate-100 p-3 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="text-xs font-semibold text-slate-700">
                <span className="font-extrabold text-slate-900 block">{item.ad_name}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Confidence: {item.confidence}%</span>
              </div>
              <div className="flex gap-6 text-xs text-right">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Ad Frequency</span>
                  <span className="font-bold text-slate-800">{item.frequency.toFixed(1)}x</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">CTR Trend</span>
                  <span className="font-bold text-red-500">{item.ctr_trend_pct}%</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">CPL Trend</span>
                  <span className="font-bold text-red-500">+{item.cpl_trend_pct}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Opportunity & Don't Change Summary (9.27 & 9.28) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weekly Opportunity */}
        <div className="card border border-border bg-white shadow-xs rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
            <Award size={16} className="text-blue-500" />
            🟠 Strategic Opportunities
          </h3>
          <div className="space-y-3 text-xs">
            {brief.opportunities?.map((opp: any, idx: number) => (
              <div key={idx} className="bg-slate-50/50 p-3 border border-slate-100 rounded-lg space-y-1">
                <div className="font-bold text-slate-800">{opp.description}</div>
                <div className="text-[10px] text-slate-500 italic mt-1 font-medium bg-slate-50 p-1 px-2 rounded">
                  Suggested Action: {opp.action}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Don't Change */}
        <div className="card border border-border bg-white shadow-xs rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
            <Pause size={16} className="text-slate-600" />
            🟢 Don't Change (Safeguards)
          </h3>
          <div className="space-y-3 text-xs">
            {brief.dont_change_items?.map((item: any, idx: number) => (
              <div key={idx} className="bg-slate-50/50 p-3 border border-slate-100 rounded-lg space-y-1">
                <div className="font-bold text-slate-800">{item.description}</div>
                <div className="text-[10px] text-slate-500 italic mt-1 font-medium bg-slate-50 p-1 px-2 rounded">
                  Reasoning: {item.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommended Experiments (9.29) */}
      <div className="card border border-blue-100 bg-blue-50/5 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5">
          <Fingerprint size={16} />
          🔵 Next Week's Recommended Experiments
        </h3>
        <div className="space-y-3 text-xs">
          {brief.experiments?.map((exp: any, idx: number) => (
            <div key={idx} className="bg-white p-3 rounded-lg border border-blue-100/50 space-y-2">
              <div className="font-bold text-slate-800">{exp.description}</div>
              <div className="text-[10px] text-slate-500 italic bg-slate-50 p-1 px-2 rounded">
                Hypothesis: {exp.hypothesis}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
