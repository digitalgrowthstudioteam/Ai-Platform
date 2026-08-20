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
  FlaskConical,
  Activity,
  Heart,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
 
export default function DailyBriefPage() {
  const { selectedAccount, loadingAccounts } = useAdAccount();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [brief, setBrief] = useState<any>(null);
  const [drilldown, setDrilldown] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [activeRanges, setActiveRanges] = useState<Record<string, string>>({}); // adsetId -> comparison range
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});
  const [showAllPriorities, setShowAllPriorities] = useState(false);
 
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
 
      const ddData = await api.getBriefDrilldown(selectedAccount.id, data.report_date);
      setDrilldown(ddData);
 
      // Expand campaigns by default
      const expanded: Record<string, boolean> = {};
      const ranges: Record<string, string> = {};
      ddData.forEach((c: any) => {
        expanded[c.campaign_id] = true;
        c.adsets.forEach((a: any) => {
          ranges[a.adset_id] = "last_day";
        });
      });
      setExpandedCampaigns(expanded);
      setActiveRanges(ranges);
    } catch (err) {
      console.error("Failed to load daily brief:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
 
  useEffect(() => {
    loadBrief();
    const fetchSub = async () => {
      try {
        const res = await api.getSubscription();
        setSubscription(res);
      } catch (e) {}
    };
    fetchSub();
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
 
  // Dynamic Account Health Score Calculation
  const healthScore = Math.max(45, Math.min(100, Math.round(85 + (brief.primary_kpi_change < 0 ? Math.abs(brief.primary_kpi_change) * 20 : -brief.primary_kpi_change * 30))));
  const healthChangePoints = Math.round(brief.primary_kpi_change * 25);
 
  // Campaigns Count Calculations
  const totalCampaignsAnalyzed = drilldown.length;
  const activeCampaigns = drilldown.filter(c => c.yesterday_spend > 0.01).length;
 
  // Needs Attention & Alert Counts
  const rawPriorities = brief.top_priorities || [];
  const prioritiesToShow = showAllPriorities ? rawPriorities : rawPriorities.slice(0, 3);
  const criticalCount = rawPriorities.filter((p: any) => p.priority === "critical" || p.priority === "high").length;
  const opportunitiesCount = (brief.opportunities || []).length;
 
  // Warning signals / watch count
  const warningSignalsCount = (brief.watch_items || []).length;
  const stableCount = Math.max(0, totalCampaignsAnalyzed - criticalCount - warningSignalsCount - opportunitiesCount);
 
  // Goal Breakdown mapping
  const goalsMap: Record<string, { count: number; spend: number; results: number; label: string; health: number }> = {};
  drilldown.forEach((c: any) => {
    const obj = (c.objective || "ENGAGEMENT").toUpperCase();
    let goalKey = "Sales";
    if (obj.includes("LEAD")) goalKey = "Leads";
    else if (obj.includes("CONV") || obj.includes("ENGAGEMENT") || obj.includes("MESSAGING")) goalKey = "Messaging";
    else if (obj.includes("CALL")) goalKey = "Calls";
    else if (obj.includes("TRAFFIC")) goalKey = "Traffic";
    else if (obj.includes("AWARENESS")) goalKey = "Awareness";
    else if (obj.includes("APP")) goalKey = "App Promotion";
    else goalKey = "Engagement";
 
    let spend = c.yesterday_spend || 0;
    let results = 0;
    c.adsets?.forEach((a: any) => {
      results += a.comparisons?.last_day?.current_val || 0;
    });
 
    if (!goalsMap[goalKey]) {
      goalsMap[goalKey] = { count: 0, spend: 0, results: 0, label: goalKey, health: 80 };
    }
    goalsMap[goalKey].count += 1;
    goalsMap[goalKey].spend += spend;
    goalsMap[goalKey].results += results;
  });
 
  // Format dynamic links for entity links context
  const renderEntityLink = (entityType: string, entityId: string, entityName: string, campaignId?: string, adsetId?: string, adId?: string) => {
    let href = "/campaigns";
    const resolvedCampaignId = campaignId || (entityType === "campaign" ? entityId : null);
    const resolvedAdsetId = adsetId || (entityType === "ad_set" ? entityId : null);
    const resolvedAdId = adId || (entityType === "ad" ? entityId : null);
 
    if (resolvedCampaignId) {
      href = `/campaigns/${resolvedCampaignId}`;
      if (resolvedAdsetId) {
        href += `?as=${resolvedAdsetId}`;
      } else if (resolvedAdId) {
        href += `?ad=${resolvedAdId}`;
      }
    }
 
    return (
      <Link href={href} className="font-extrabold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-0.5">
        {entityName} <ExternalLink size={10} className="inline shrink-0" />
      </Link>
    );
  };
 
  // Identify Best Performing Campaign
  const getBestPerformingCampaign = () => {
    if (!drilldown || drilldown.length === 0) return null;
    let bestCampaign: any = null;
    let lowestCost = Infinity;
    let bestMetricLabel = "CPL";
    let bestValue = 0;
    
    for (const c of drilldown) {
      for (const a of c.adsets) {
        const stats = a.comparisons?.last_day;
        if (stats && stats.current_val > 0) {
          const cost = stats.current_cost;
          if (cost > 0 && cost < lowestCost) {
            lowestCost = cost;
            bestCampaign = c;
            bestMetricLabel = a.metric_label;
            bestValue = stats.current_val;
          }
        }
      }
    }
    
    if (!bestCampaign) {
      const sorted = [...drilldown].sort((x, y) => y.yesterday_spend - x.yesterday_spend);
      bestCampaign = sorted[0];
      if (bestCampaign && bestCampaign.adsets?.[0]) {
        const a = bestCampaign.adsets[0];
        bestMetricLabel = a.metric_label;
        lowestCost = a.comparisons?.last_day?.current_cost || 0;
        bestValue = a.comparisons?.last_day?.current_val || 0;
      }
    }
    
    return bestCampaign ? {
      name: bestCampaign.campaign_name,
      metric: bestMetricLabel,
      cost: lowestCost,
      value: bestValue
    } : null;
  };
 
  const bestCamp = getBestPerformingCampaign();
 
  return (
    <div className="animate-fade-in space-y-6 max-w-4xl mx-auto pb-12">
      {/* Back Link */}
      <Link href="/dashboard" className="flex items-center gap-1.5 text-xs text-subtle font-bold hover:text-slate-700 transition">
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>
 
      {/* Good morning executive header */}
      <div className="card border border-indigo-100 bg-white shadow-xs rounded-xl p-6 relative overflow-hidden space-y-4">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 leading-tight">Good morning 👋</h1>
            <p className="text-xs text-slate-500 font-semibold">Here's what changed in your Meta Ads account.</p>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
              {reportDateStr} &bull; Synced {new Date(brief.generated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
          </div>
          
          <button 
            onClick={() => loadBrief(true)} 
            disabled={refreshing}
            className="btn btn-outline border border-border bg-white text-slate-700 py-1.5 px-3 rounded-lg text-xs font-semibold hover:bg-slate-50 transition flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Force Refresh Brief"}
          </button>
        </div>
 
        {/* Account Health metrics widget row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
          <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
            <Heart size={20} className="text-red-500 shrink-0" />
            <div>
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Account Health</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-base font-black text-slate-800">{healthScore}/100</span>
                {healthChangePoints !== 0 && (
                  <span className={`text-[10px] font-bold ${healthChangePoints > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {healthChangePoints > 0 ? `↓ ${healthChangePoints} pts` : `↑ ${Math.abs(healthChangePoints)} pts`}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
            <Activity size={20} className="text-indigo-600 shrink-0" />
            <div>
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Yesterday Spend</span>
              <span className="text-base font-black text-slate-800 mt-0.5">₹{formatNumber(brief.spend)}</span>
            </div>
          </div>
          
          <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
            <Sparkles size={20} className="text-amber-500 shrink-0" />
            <div>
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Conversions Generated</span>
              <span className="text-base font-black text-slate-800 mt-0.5">{brief.results} results</span>
            </div>
          </div>
        </div>
      </div>
 
      {/* 30-Second Executive summary card */}
      <div className="card border border-border bg-white shadow-xs rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Your Account in 30 Seconds</h3>
          <p className="text-[11px] text-slate-400 mt-1 font-semibold">An absolute high-level status count of your campaigns.</p>
        </div>
 
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100">
            <div className="text-xs font-bold text-slate-400 block">{totalCampaignsAnalyzed}</div>
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 mt-1">Analyzed</span>
          </div>
          <div className="bg-red-50/20 p-3 rounded-lg border border-red-100">
            <div className="text-xs font-bold text-rose-600 block">{criticalCount}</div>
            <span className="text-[8px] font-black uppercase tracking-wider text-rose-500 mt-1">Attention</span>
          </div>
          <div className="bg-amber-50/20 p-3 rounded-lg border border-amber-100">
            <div className="text-xs font-bold text-amber-600 block">{warningSignalsCount}</div>
            <span className="text-[8px] font-black uppercase tracking-wider text-amber-500 mt-1">Warning</span>
          </div>
          <div className="bg-blue-50/20 p-3 rounded-lg border border-blue-100">
            <div className="text-xs font-bold text-blue-600 block">{opportunitiesCount}</div>
            <span className="text-[8px] font-black uppercase tracking-wider text-blue-500 mt-1">Opportunities</span>
          </div>
          <div className="bg-green-50/15 p-3 rounded-lg border border-green-100">
            <div className="text-xs font-bold text-emerald-600 block">{stableCount}</div>
            <span className="text-[8px] font-black uppercase tracking-wider text-emerald-500 mt-1">Stable</span>
          </div>
        </div>
      </div>
 
      {/* Evidence-based AI Analyst report summary block */}
      <div className="card border border-indigo-50 bg-indigo-50/5 rounded-xl p-5 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
          <Sparkles size={14} /> AI Analyst Report Summary
        </h3>
        <p className="text-xs text-slate-700 leading-relaxed font-semibold">
          Overall account status yesterday was <span className="font-extrabold text-slate-800">{brief.overall_status}</span>. 
          Your primary focus CPL/CPA shifted by <span className={`font-extrabold ${brief.primary_kpi_change >= 0 ? "text-rose-600" : "text-emerald-600"}`}>
            {brief.primary_kpi_change >= 0 ? "+" : ""}{(brief.primary_kpi_change * 100).toFixed(0)}%
          </span> compared to the 7-day baseline, with total spend of <span className="font-extrabold text-slate-800">₹{formatNumber(brief.spend)}</span> across <span className="font-extrabold text-slate-800">{activeCampaigns} active campaigns</span>. 
          {brief.biggest_problem?.change_pct > 0 && ` A conversion cost rise was detected on campaign ${brief.biggest_problem.title}.`}
        </p>
      </div>
 
      {/* Needs Attention section */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-rose-600 uppercase tracking-widest flex items-center gap-1.5">
          🔴 Needs Attention Today
        </h3>
 
        <div className="space-y-4">
          {prioritiesToShow.map((item: any, idx: number) => {
            const isCrit = item.priority === "critical" || item.priority === "high";
            return (
              <div key={idx} className={`card border rounded-xl p-5 space-y-3 ${
                isCrit ? "border-rose-100 bg-rose-50/5" : "border-amber-100 bg-amber-50/5"
              }`}>
                <div className="flex justify-between items-center border-b border-slate-100/50 pb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                      isCrit ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                    }`}>{item.priority === "critical" ? "🔴 Critical Priority" : "🟠 High Priority"}</span>
                    <span className="text-xs font-extrabold text-slate-800">
                      {renderEntityLink(item.entity_type, item.entity_id, item.entity_name, item.campaign_id, item.adset_id, item.ad_id)}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Confidence: {Math.round(item.confidence_score * 100)}%</span>
                </div>
 
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1 md:col-span-2">
                    <div>
                      <span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">Problem</span>
                      <p className="font-semibold text-slate-700">{item.title}: {item.description}</p>
                    </div>
                    {item.root_cause && (
                      <div className="pt-2">
                        <span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">Root Cause</span>
                        <p className="text-slate-600 font-medium">{item.root_cause}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg border border-slate-100 space-y-2">
                    <div>
                      <span className="text-[8px] font-black uppercase text-slate-400 block">Goal Focus</span>
                      <span className="font-bold text-slate-800 text-[10px] uppercase block">{item.objective}</span>
                    </div>
                    {item.evidence && (
                      <div>
                        <span className="text-[8px] font-black uppercase text-slate-400 block">Evidence Trigger</span>
                        <span className="font-bold text-rose-600 text-[10px] block">{item.evidence}</span>
                      </div>
                    )}
                  </div>
                </div>
 
                {item.reason && (
                  <div className="bg-white border border-slate-100 p-3 rounded-lg text-xs">
                    <span className="font-bold text-rose-600 uppercase text-[9px] block mb-0.5">Suggested Action</span>
                    <p className="text-slate-600 font-semibold">{item.reason}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
 
        {rawPriorities.length > 3 && (
          <button 
            onClick={() => setShowAllPriorities(!showAllPriorities)} 
            className="w-full py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition flex items-center justify-center gap-1"
          >
            {showAllPriorities ? (
              <>Show Less <ChevronUp size={14} /></>
            ) : (
              <>View All Recommendations ({rawPriorities.length}) <ChevronDown size={14} /></>
            )}
          </button>
        )}
      </div>
 
      {/* Opportunities (Scaling & budget allocation suggestions) */}
      {opportunitiesCount > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
            🟢 Scaling Opportunities
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(brief.opportunities || []).map((opp: any, idx: number) => (
              <div key={idx} className="card border border-blue-100 bg-blue-50/5 rounded-xl p-5 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 border-b border-slate-100/50 pb-2">
                    <span>🟢 OPPORTUNITY</span>
                    <span>Confidence: {Math.round((opp.confidence_score || 0.85) * 100)}%</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-800 mt-2">
                    {renderEntityLink(opp.entity_type, opp.entity_id, opp.entity_name, opp.campaign_id, opp.adset_id, opp.ad_id)}
                  </h4>
                  <p className="text-xs text-slate-500 font-semibold mt-1 leading-relaxed">{opp.title}: {opp.description}</p>
                </div>
                <div className="bg-white border border-blue-100/30 p-2.5 rounded-lg text-xs mt-2">
                  <span className="font-bold text-blue-600 uppercase text-[9px] block mb-0.5">Suggested Action</span>
                  <p className="text-slate-600 font-medium">{opp.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
 
      {/* Watchlist & Early warning indicator cards */}
      {warningSignalsCount > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5">
            🟡 Early Warning Watchlist
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
            {(brief.watch_items || []).map((watch: any, idx: number) => (
              <div key={idx} className="card border border-amber-100 bg-amber-50/5 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center text-[9px] font-black text-amber-600 uppercase">
                  <span>🟡 WATCHING</span>
                  <span>Impact Profile: Low</span>
                </div>
                <h4 className="font-bold text-slate-800">
                  {renderEntityLink(watch.entity_type, watch.entity_id, watch.entity_name, watch.campaign_id, watch.adset_id, watch.ad_id)}
                </h4>
                <p className="text-slate-500 text-[10px] leading-relaxed mt-1">
                  Early warning: {watch.title}. {watch.description}
                </p>
                <div className="bg-white p-2 rounded border border-amber-100/50 text-[9px] text-slate-500 font-medium">
                  Trigger Evidence: {watch.evidence}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
 
      {/* What's Working section (positive signals summary) */}
      <div className="card border border-emerald-100 bg-emerald-50/5 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
          <Award size={16} className="text-green-500" />
          🟢 What's Working
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {bestCamp && (
            <div className="space-y-2 border-r border-slate-50 pr-4">
              <span className="font-semibold text-slate-500 uppercase text-[9px]">🥇 Top Performer yesterday</span>
              <h4 className="font-bold text-slate-800">{bestCamp.name}</h4>
              <p className="text-slate-500 leading-relaxed font-semibold mt-1">
                Generated {bestCamp.value} {bestCamp.metric} at a low cost of <span className="font-extrabold text-slate-800">₹{bestCamp.cost.toFixed(2)}</span> per result.
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <span className="font-black text-slate-500 uppercase text-[9px] block">👨‍💼 25+ Years Marketer's Daily Insight</span>
            <p className="text-slate-500 leading-relaxed font-semibold">
              "Every morning, I check two metrics first: the **Hook Rate** (Video Starts vs Impression ratio) and the **Cost-Per-Conversation/Lead Pacing**. If Hook Rate remains above 25% but CPL is climbing, it means the copy/landing page requires refinement. If Hook Rate is low, the video hook itself has fatigued."
            </p>
          </div>
        </div>
      </div>
 
      {/* Goal Breakdown Grid */}
      <div className="card border border-slate-200 bg-white shadow-xs rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Active Goals Breakdown</h3>
          <p className="text-[11px] text-slate-400 mt-1 font-semibold">Showing conversion health and statistics for active objectives in your account.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.values(goalsMap).map((goal: any, idx: number) => (
            <div key={idx} className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-black text-slate-800 uppercase text-[10px]">{goal.label} Focus</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase">{goal.count} Campaigns</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase font-bold">Goal Health</span>
                  <span className="text-xs font-black text-slate-700">{goal.health}/100</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase font-bold">Total Results</span>
                  <span className="text-xs font-black text-slate-700">{goal.results}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
 
      {/* Recommended Experiments block */}
      <div className="card border border-blue-100 bg-blue-50/5 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5">
          <FlaskConical size={16} />
          Recommended split-test experiments
        </h3>
        <div className="space-y-3 text-xs">
          {(brief.experiments || []).map((exp: any, idx: number) => (
            <div key={idx} className="bg-white p-3 rounded-lg border border-blue-100 space-y-1">
              <div className="font-bold text-slate-800">{exp.description}</div>
              {exp.hypothesis && (
                <div className="text-[10px] text-slate-500 italic mt-1 font-medium bg-slate-50 p-1 px-2 rounded">
                  Hypothesis: {exp.hypothesis}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
 
      {/* Safeguards Card */}
      {brief.dont_change_items?.length > 0 && (
        <div className="card border border-slate-200 bg-slate-50/50 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
            <Pause size={16} />
            ⚪ Don't Change (Safeguards)
          </h3>
          <div className="space-y-3 text-xs font-semibold text-slate-700">
            {brief.dont_change_items.map((item: any, idx: number) => (
              <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <p className="text-slate-800">
                  {renderEntityLink(item.entity_type, item.entity_id, item.entity_name, item.campaign_id, item.adset_id, item.ad_id)}: {item.title || item.description}
                </p>
                <div className="text-[10px] text-slate-500 italic mt-1 font-medium bg-slate-50 p-1 px-2 rounded">
                  Reasoning: {item.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
 
      {/* Campaign & AdSet Comparison Accordion (Yesterday Spend > 0.01) */}
      <div className="card border border-slate-200 bg-white shadow-xs rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
            <Activity size={16} className="text-indigo-500" />
            Campaign & AdSet Performance Drilldown
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-semibold">
            Evaluate metrics per adset compared to previous time periods. Campaigns shown here spent &gt; ₹0.01 yesterday.
          </p>
        </div>
 
        <div className="space-y-4">
          {drilldown.length === 0 ? (
            <div className="text-xs text-subtle text-center py-8">
              No campaigns had active spend yesterday.
            </div>
          ) : (
            drilldown.map((c) => {
              const isExpanded = expandedCampaigns[c.campaign_id];
              return (
                <div key={c.campaign_id} className="border border-slate-100 rounded-xl overflow-hidden shadow-xs bg-slate-50/10">
                  {/* Campaign Header Accordion Trigger */}
                  <button
                    onClick={() => setExpandedCampaigns(prev => ({ ...prev, [c.campaign_id]: !prev[c.campaign_id] }))}
                    className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-100/50 transition cursor-pointer text-left border-b border-slate-100"
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-black text-slate-800 truncate max-w-[280px] md:max-w-md">{c.campaign_name}</div>
                      <div className="flex gap-2 items-center text-[9px] font-bold text-slate-400 uppercase">
                        <span className="bg-white border border-slate-200 px-1 rounded">{c.objective}</span>
                        <span>Spend Yesterday: ₹{formatNumber(c.yesterday_spend)}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-indigo-600 font-extrabold uppercase flex items-center gap-1">
                      {isExpanded ? "Collapse" : "Expand"}
                    </span>
                  </button>
 
                  {/* Expandable Adsets List */}
                  {isExpanded && (
                    <div className="p-4 space-y-4 bg-white border-t border-slate-50">
                      {c.adsets.length === 0 ? (
                        <div className="text-xs text-subtle text-center py-2">No adsets found for this campaign.</div>
                      ) : (
                        c.adsets.map((a: any) => {
                          const activeRange = activeRanges[a.adset_id] || "last_day";
                          const isProOrAgency = subscription?.plan === "pro" || subscription?.plan === "agency" || subscription?.plan === "enterprise" || subscription?.plan === "growth";
                          
                          const handleRangeChange = (val: string) => {
                            if (val === "lifetime" && !isProOrAgency) {
                              alert("Lifetime comparisons are limited to Pro and Agency tier accounts. Please upgrade to unlock lifetime metrics.");
                              return;
                            }
                            setActiveRanges(prev => ({ ...prev, [a.adset_id]: val }));
                          };
 
                          const stats = a.comparisons[activeRange];
                          const safeValChange = stats?.val_change_pct || 0;
                          const safeCostChange = stats?.cost_change_pct || 0;
                          const safeSpendChange = stats?.spend_previous > 0 ? ((stats.spend_current - stats.spend_previous) / stats.spend_previous) * 100.0 : 0.0;
 
                          return (
                            <div key={a.adset_id} className="border border-slate-100 rounded-lg p-3 space-y-3 bg-slate-50/20">
                              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                                <div className="space-y-0.5">
                                  <div className="text-xs font-bold text-slate-800">{a.adset_name}</div>
                                  <div className="text-[9px] font-semibold text-slate-400 uppercase">Goal: {a.performance_goal || "Unknown"} ({a.metric_label})</div>
                                </div>
 
                                {/* Comparison Picker */}
                                <div className="flex items-center gap-1.5 text-[10px] font-bold">
                                  <span className="text-slate-400 uppercase text-[9px]">Compare:</span>
                                  <select
                                    value={activeRange}
                                    onChange={(e) => handleRangeChange(e.target.value)}
                                    className="bg-white border border-slate-200 rounded px-2 py-1 outline-none text-slate-700 font-semibold cursor-pointer"
                                  >
                                    <option value="last_day">Yesterday vs Prev Day</option>
                                    <option value="last_3d">Last 3 Days vs Prev 3 Days</option>
                                    <option value="last_7d">Last 7 Days vs Prev 7 Days</option>
                                    <option value="last_15d">Last 15 Days vs Prev 15 Days</option>
                                    <option value="last_30d">Last 30 Days vs Prev 30 Days</option>
                                    <option value="lifetime">
                                      {isProOrAgency ? "Lifetime" : "Lifetime (🔒 Upgrade)"}
                                    </option>
                                  </select>
                                </div>
                              </div>
 
                              {/* Comparisons Goal Metrics Grids */}
                              {stats ? (
                                <div className="grid grid-cols-3 gap-3 text-center border-t border-slate-100 pt-3">
                                  {/* Column 1: Spend / Budget Pacing */}
                                  <div className="space-y-1">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase">Ad Spend</div>
                                    <div className="text-xs font-extrabold text-slate-700">₹{formatNumber(stats.spend_current)}</div>
                                    <div className="text-[9px] text-slate-400">vs ₹{formatNumber(stats.spend_previous)}</div>
                                    <div className={`text-[9px] font-bold flex items-center justify-center ${safeSpendChange >= 0 ? "text-amber-500" : "text-emerald-600"}`}>
                                      {safeSpendChange >= 0 ? "+" : ""}{safeSpendChange.toFixed(0)}% spend
                                    </div>
                                  </div>
 
                                  {/* Column 2: Conversions / Results */}
                                  <div className="space-y-1 border-x border-slate-100 px-3">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase">{a.metric_label}</div>
                                    <div className="text-xs font-extrabold text-slate-700">{stats.current_val}</div>
                                    <div className="text-[9px] text-slate-400">vs {stats.previous_val}</div>
                                    <div className={`text-[9px] font-bold flex items-center justify-center ${safeValChange >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                                      {safeValChange >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                      {Math.abs(safeValChange).toFixed(0)}%
                                    </div>
                                  </div>
 
                                  {/* Column 3: Cost Per Result */}
                                  <div className="space-y-1">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase">Cost Per {a.metric_label.slice(0, 4)}</div>
                                    <div className="text-xs font-extrabold text-slate-700">₹{formatNumber(stats.current_cost)}</div>
                                    <div className="text-[9px] text-slate-400">vs ₹{formatNumber(stats.previous_cost)}</div>
                                    <div className={`text-[9px] font-bold flex items-center justify-center ${safeCostChange <= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                                      {safeCostChange <= 0 ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
                                      {Math.abs(safeCostChange).toFixed(0)}% cost
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 text-center py-1">No comparison data for this range.</div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
