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
  TrendingDown,
  Info,
  ArrowRight,
  ShieldCheck,
  Zap
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatPercent } from "@/lib/utils";

export default function InsightsPage() {
  const { selectedAccount, loadingAccounts } = useAdAccount();
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [recs, setRecs] = useState<any[]>([]);
  const [healthScore, setHealthScore] = useState(85);

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

      // Dynamically calculate health score based on metrics
      if (campData.length > 0) {
        let totalSpend = 0;
        let totalRevenue = 0;
        campData.forEach((c: any) => {
          totalSpend += c.metrics.spend;
          totalRevenue += c.metrics.spend * c.metrics.roas;
        });
        const overallRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
        
        let score = 75;
        if (overallRoas >= 3.0) score = 95;
        else if (overallRoas >= 2.0) score = 88;
        else if (overallRoas >= 1.5) score = 82;
        else if (overallRoas > 0) score = 65;
        
        // Penalize for active recommendations
        score = Math.max(40, score - recData.length * 3);
        setHealthScore(score);
      }
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
        <span className="ml-2 text-sm text-subtle font-medium">Analyzing ad account insights...</span>
      </div>
    );
  }

  if (!selectedAccount) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title text-2xl font-bold text-slate-800">Performance Insights</h1>
            <p className="page-subtitle text-sm text-subtle mt-1">Discover trends, patterns, and opportunities in your ad performance</p>
          </div>
        </div>
        <div className="card border border-border bg-white shadow-sm rounded-lg mt-6">
          <div className="card-body py-16 text-center max-w-md mx-auto space-y-4">
            <TrendingUp size={48} className="text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No insights available</h3>
            <p className="text-xs text-subtle leading-relaxed">
              We need performance data before we can surface meaningful insights. Select or connect your Meta Ads account to get started.
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

  // Derive Insights dynamically
  const industry = selectedAccount.industry || "E-commerce";
  const benchmarkCtr = industry === "E-commerce" ? 1.6 : industry === "B2B / SaaS" ? 2.1 : 1.8;
  const benchmarkRoas = industry === "E-commerce" ? 2.8 : industry === "B2B / SaaS" ? 3.2 : 2.5;

  let totalSpend = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalConversions = 0;
  let totalRevenue = 0;

  campaigns.forEach(c => {
    totalSpend += c.metrics.spend;
    totalImpressions += c.metrics.impressions;
    totalClicks += c.metrics.clicks;
    totalConversions += c.metrics.purchases;
    totalRevenue += c.metrics.spend * c.metrics.roas;
  });

  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const ctrDiff = avgCtr - benchmarkCtr;
  const roasDiff = avgRoas - benchmarkRoas;

  // Find best/worst performing campaigns for budget recommendations
  const sortedCamps = [...campaigns].sort((a, b) => b.metrics.roas - a.metrics.roas);
  const bestCamp = sortedCamps[0];
  const worstCamp = sortedCamps.filter(c => c.metrics.spend > 100 && c.status === "ACTIVE").pop();

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title text-2xl font-bold text-slate-800">Performance Insights</h1>
          <p className="page-subtitle text-sm text-subtle mt-1">AI-powered trend evaluations, budget optimization recommendations, and performance alerts</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 border border-border px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Connected: {selectedAccount.name}
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Score Meter */}
        <div className="card border border-border bg-white shadow-sm rounded-lg p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck size={16} className="text-primary" />
              Optimization Health
            </h3>
            <p className="text-xs text-subtle mt-1">Overall setup and efficiency evaluation score</p>
          </div>
          
          <div className="py-6 flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
              {/* Circular progress path */}
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="54" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                <circle 
                  cx="64" 
                  cy="64" 
                  r="54" 
                  stroke={healthScore > 80 ? "#10b981" : healthScore > 65 ? "#f59e0b" : "#ef4444"} 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray={2 * Math.PI * 54}
                  strokeDashoffset={2 * Math.PI * 54 * (1 - healthScore / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-black text-slate-800">{healthScore}%</span>
                <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                  {healthScore > 80 ? "Optimal" : healthScore > 65 ? "Needs Attention" : "Critical"}
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-xs font-medium text-slate-600 bg-slate-50 rounded p-2.5">
            {healthScore > 80 
              ? "Your account shows exceptional efficiency. Keep active rules running." 
              : "Review recommended actions below to boost conversion metrics."}
          </div>
        </div>

        {/* Industry Benchmarks */}
        <div className="card border border-border bg-white shadow-sm rounded-lg p-6 lg:col-span-2 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              Vertical Benchmarking ({industry})
            </h3>
            <p className="text-xs text-subtle mt-1">Comparing your performance to standard vertical indices</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* CTR benchmark */}
            <div className="border border-border rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600">Average Click-Through Rate (CTR)</span>
                <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase ${ctrDiff >= 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                  {ctrDiff >= 0 ? `+${ctrDiff.toFixed(2)}%` : `${ctrDiff.toFixed(2)}%`} vs Industry
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800">{avgCtr.toFixed(2)}%</span>
                <span className="text-xs text-slate-400 font-medium">vs benchmark {benchmarkCtr}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(100, (avgCtr / benchmarkCtr) * 50)}%` }} />
              </div>
            </div>

            {/* ROAS benchmark */}
            <div className="border border-border rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600">Return on Ad Spend (ROAS)</span>
                <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase ${roasDiff >= 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                  {roasDiff >= 0 ? `+${roasDiff.toFixed(2)}x` : `${roasDiff.toFixed(2)}x`} vs Industry
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800">{avgRoas.toFixed(2)}x</span>
                <span className="text-xs text-slate-400 font-medium">vs benchmark {benchmarkRoas}x</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-green-500 h-full rounded-full" style={{ width: `${Math.min(100, (avgRoas / benchmarkRoas) * 50)}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Recommendation Suggestions */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-800">Dynamic AI Opportunity Analysis</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Opportunity 1: Budget Redistribution */}
          {bestCamp && worstCamp && bestCamp.id !== worstCamp.id && (
            <div className="card border border-border bg-white shadow-sm rounded-lg p-5 flex gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <Zap className="text-primary" size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">Direct Budget Redistribution Recommendation</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Campaign <strong>{bestCamp.name}</strong> operates with an efficient <strong>{bestCamp.metrics.roas.toFixed(2)}x ROAS</strong>. 
                  Meanwhile, campaign <strong>{worstCamp.name}</strong> underperforms with <strong>{worstCamp.metrics.roas.toFixed(2)}x ROAS</strong>.
                </p>
                <div className="text-[11px] font-bold text-primary flex items-center gap-1 mt-2.5">
                  <CheckCircle2 size={12} className="text-green-500" />
                  Insight: Transfer budget from {worstCamp.name} to {bestCamp.name} to yield higher conversions.
                </div>
              </div>
            </div>
          )}

          {/* Opportunity 2: CTR Fatigue Alert */}
          {avgCtr < benchmarkCtr ? (
            <div className="card border border-border bg-white shadow-sm rounded-lg p-5 flex gap-4">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
                <AlertTriangle className="text-amber-500" size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">Creative Fatigue Alert</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Your overall account Click-Through Rate (<strong>{avgCtr.toFixed(2)}%</strong>) lags behind the industry average for {industry} (<strong>{benchmarkCtr}%</strong>).
                </p>
                <div className="text-[11px] font-bold text-amber-600 flex items-center gap-1 mt-2.5">
                  <Info size={12} />
                  Suggestion: Update headlines & copy in underperforming ad sets to trigger higher engagement.
                </div>
              </div>
            </div>
          ) : (
            <div className="card border border-border bg-white shadow-sm rounded-lg p-5 flex gap-4">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                <CheckCircle2 className="text-green-500" size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">Healthy Creative Engagement</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Your overall CTR of <strong>{avgCtr.toFixed(2)}%</strong> exceeds the vertical average. Audience interaction with current ad visuals remains highly optimal.
                </p>
                <div className="text-[11px] font-bold text-green-600 flex items-center gap-1 mt-2.5">
                  <ShieldCheck size={12} />
                  Insight: Current creative rotation does not exhibit immediate fatigue symptoms.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active AI Recommendations List */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          AI Recommendations Engine suggestions ({recs.length})
        </h3>
        
        {recs.length === 0 ? (
          <div className="card border border-border bg-slate-50/50 p-6 rounded-lg text-center text-xs text-subtle font-medium">
            No pending structural optimization suggestions from the engine.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recs.slice(0, 4).map((r, idx) => (
              <div key={idx} className="card border border-border bg-white shadow-xs rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${
                    r.priority === "high" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                  }`}>
                    {r.priority} Priority
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{r.entity_type}</span>
                </div>
                <h4 className="text-xs font-black text-slate-800">{r.title}</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">{r.description}</p>
                <div className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded">
                  <strong>Reasoning:</strong> {r.reason}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
