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
  FlaskConical
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export default function DailyBriefPage() {
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
        data = await api.refreshDailyBrief(selectedAccount.id);
      } else {
        data = await api.getDailyBrief(selectedAccount.id);
      }
      setBrief(data);
    } catch (err) {
      console.error("Failed to load daily brief:", err);
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
        <span className="ml-2 text-sm text-subtle font-medium">Prioritizing today's brief...</span>
      </div>
    );
  }

  if (!selectedAccount) {
    return (
      <div className="card p-6 text-center max-w-md mx-auto mt-16 space-y-4">
        <AlertCircle size={48} className="text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">No account selected</h3>
        <p className="text-xs text-subtle">Connect or choose a Meta Ads account to unlock your Daily AI Brief.</p>
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
        <h3 className="text-base font-bold text-slate-800">Daily brief unavailable</h3>
        <p className="text-xs text-subtle">We couldn't compile a daily brief for this account. Try force-refreshing.</p>
        <button onClick={() => loadBrief(true)} className="btn btn-primary inline-flex items-center gap-2">
          <RefreshCw size={14} /> Force Refresh Brief
        </button>
      </div>
    );
  }

  const reportDateStr = new Date(brief.report_date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const kpiChangeIsUp = brief.primary_kpi_change >= 0;
  const conversions = brief.results || 0;

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl mx-auto pb-12">
      {/* Back Link */}
      <Link href="/dashboard" className="flex items-center gap-1.5 text-xs text-subtle font-bold hover:text-slate-700 transition">
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>

      {/* Header Panel */}
      <div className="card border border-blue-100 bg-blue-50/10 rounded-xl p-6 relative overflow-hidden space-y-4">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-blue-600">Daily Briefing</div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">Good morning 👋 Your Ads — Daily Brief</h1>
            <p className="text-xs text-slate-500 font-bold">{reportDateStr}</p>
          </div>
          <button 
            onClick={() => loadBrief(true)} 
            disabled={refreshing}
            className="btn btn-outline border border-border bg-white text-slate-700 py-1.5 px-3 rounded-lg text-xs font-semibold hover:bg-slate-50 transition flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh Brief"}
          </button>
        </div>

        <div className="bg-white/80 backdrop-blur-xs p-4 rounded-xl border border-blue-100/50 flex flex-col md:flex-row justify-between gap-4">
          <div className="text-xs space-y-1">
            <span className="text-slate-500 font-bold">Delivery Summary:</span>
            <p className="text-slate-800 text-sm font-semibold">
              You spent <span className="font-extrabold text-slate-900">₹{formatNumber(brief.spend)}</span> yesterday and generated <span className="font-extrabold text-slate-900">{conversions} conversions</span> at an average {brief.primary_kpi} of <span className="font-extrabold text-slate-900">₹{formatNumber(brief.primary_kpi_value)}</span>.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-3 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Yesterday status</span>
              <span className={`text-sm font-black uppercase tracking-wide flex items-center gap-1 mt-0.5 ${
                brief.overall_status === "Improving" ? "text-green-600" : brief.overall_status === "Declining" ? "text-red-500" : "text-slate-600"
              }`}>
                {brief.overall_status === "Improving" ? "🟢 Improving" : brief.overall_status === "Declining" ? "🔴 Declining" : "🟡 Stable"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Priorities Today (9.17) */}
      <div className="card border border-border bg-white shadow-xs rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
          <Zap size={16} className="text-amber-500 animate-pulse" />
          Your 3 Priorities Today
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
                }`}>{pri.status === "critical" ? "🔴 FIX NOW" : pri.status === "opportunity" ? "🔵 OPPORTUNITY" : "🟢 DONT CHANGE"}</div>
                <h4 className="text-xs font-bold text-slate-800 mt-1">{pri.title}</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed mt-1">{pri.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Win & Loss Double Card Row (9.9 & 9.10) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Biggest Win */}
        <div className="card border border-emerald-100 bg-emerald-50/5 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-1.5 text-emerald-700">
              <TrendingUp size={16} />
              <span className="text-xs font-black uppercase tracking-widest">📈 Biggest Improvement</span>
            </div>
            <h4 className="text-sm font-black text-slate-800 mt-3">{brief.biggest_win?.title}</h4>
            <div className="flex gap-4 mt-2 bg-white border border-emerald-100/50 p-2 px-3 rounded-lg w-max text-xs">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">{brief.primary_kpi}</span>
                <span className="font-extrabold text-slate-800">₹{brief.biggest_win?.value}</span>
              </div>
              <div className="border-l border-slate-100 pl-4">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Change</span>
                <span className="font-extrabold text-emerald-600 flex items-center gap-0.5">
                  <ArrowDownRight size={14} /> {Math.abs(brief.biggest_win?.change_pct)}%
                </span>
              </div>
            </div>
          </div>
          <div className="text-xs leading-relaxed text-slate-600 bg-white border border-emerald-100/30 p-3 rounded-lg">
            <span className="font-bold text-emerald-700 uppercase text-[9px] block mb-0.5">AI Explanation</span>
            {brief.biggest_win?.ai_explanation}
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
                <span className="text-[9px] font-bold text-slate-400 uppercase block">{brief.primary_kpi}</span>
                <span className="font-extrabold text-slate-800">₹{brief.biggest_problem?.value}</span>
              </div>
              <div className="border-l border-slate-100 pl-4">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Change</span>
                <span className="font-extrabold text-red-600 flex items-center gap-0.5">
                  <ArrowUpRight size={14} /> +{brief.biggest_problem?.change_pct}%
                </span>
              </div>
            </div>
          </div>
          <div className="text-xs leading-relaxed text-slate-600 bg-white border border-red-100/30 p-3 rounded-lg space-y-1">
            <div><span className="font-bold text-red-700 uppercase text-[9px] block">Root Cause</span> {brief.biggest_problem?.root_cause}</div>
            <div className="border-t border-slate-50 pt-1 mt-1"><span className="font-bold text-red-700 uppercase text-[9px] block">Diagnosis</span> {brief.biggest_problem?.diagnosis}</div>
            <div className="border-t border-slate-50 pt-1 mt-1"><span className="font-bold text-red-700 uppercase text-[9px] block">AI Recommendation</span> {brief.biggest_problem?.recommendation}</div>
          </div>
        </div>
      </div>

      {/* What Changed since yesterday (9.11) */}
      <div className="card border border-border bg-white shadow-xs rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">What Changed Since Yesterday?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Positive */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-green-600 flex items-center gap-1">🟢 Positive</span>
            <ul className="space-y-1.5 text-xs font-semibold text-slate-700">
              {brief.positive_changes?.map((ch: string, idx: number) => (
                <li key={idx} className="bg-slate-50 p-2 rounded-lg border border-slate-100/50 flex items-start gap-1">{ch}</li>
              ))}
            </ul>
          </div>
          {/* Negative */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-red-500 flex items-center gap-1">🔴 Negative</span>
            <ul className="space-y-1.5 text-xs font-semibold text-slate-700">
              {brief.negative_changes?.map((ch: string, idx: number) => (
                <li key={idx} className="bg-slate-50 p-2 rounded-lg border border-slate-100/50 flex items-start gap-1">{ch}</li>
              ))}
            </ul>
          </div>
          {/* Watch */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1">🟡 Watch</span>
            <ul className="space-y-1.5 text-xs font-semibold text-slate-700">
              {brief.watch_items?.map((ch: string, idx: number) => (
                <li key={idx} className="bg-slate-50 p-2 rounded-lg border border-slate-100/50 flex items-start gap-1">{ch}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Today's Winners & Opportunities (9.12 & 9.15 & 9.16) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today's Winners */}
        <div className="card border border-border bg-white shadow-xs rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
            <Award size={16} className="text-green-500" />
            Today's Winners
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <span className="font-semibold text-slate-500 uppercase text-[9px]">🥇 Best Campaign</span>
              <span className="font-bold text-slate-800">Lead Generation — Broad (CPL: ₹64)</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <span className="font-semibold text-slate-500 uppercase text-[9px]">🥇 Best Ad</span>
              <span className="font-bold text-slate-800">Video A (CPL: ₹51)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-500 uppercase text-[9px]">🥇 Best Creative Pattern</span>
              <span className="font-bold text-slate-800">Short video + problem hook</span>
            </div>
          </div>
        </div>

        {/* Recommended Experiments / Test */}
        <div className="card border border-blue-100 bg-blue-50/5 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5">
              <FlaskConical size={16} />
              Recommended Experiments
            </h3>
            <div className="space-y-2 mt-3 text-xs">
              {brief.experiments?.map((exp: any, idx: number) => (
                <div key={idx} className="bg-white p-3 rounded-lg border border-blue-100 space-y-1">
                  <div className="font-bold text-slate-800">{exp.description}</div>
                  <div className="text-[10px] text-slate-400 mt-1 font-semibold uppercase">Hypothesis</div>
                  <p className="text-[10px] text-slate-500">{exp.hypothesis}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Don't Change Safeguard Card (9.14) */}
      {brief.dont_change_items?.length > 0 && (
        <div className="card border border-slate-200 bg-slate-50/50 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
            <Pause size={16} />
            ⚪ Don't Change (Safeguards)
          </h3>
          <div className="space-y-3 text-xs font-semibold text-slate-700">
            {brief.dont_change_items.map((item: any, idx: number) => (
              <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <p className="text-slate-800">{item.description}</p>
                <div className="text-[10px] text-slate-500 italic mt-1 font-medium bg-slate-50 p-1 px-2 rounded">
                  Reasoning: {item.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
