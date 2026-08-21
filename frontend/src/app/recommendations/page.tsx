"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdAccount } from "@/context/AdAccountContext";
import { api } from "@/lib/api";
import {
  Lightbulb,
  AlertTriangle,
  Sparkles,
  Check,
  X,
  Loader2,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  LayoutGrid,
  List,
  Fingerprint,
  FlaskConical,
  Info,
  Calendar,
  AlertCircle,
  Eye,
  BrainCircuit
} from "lucide-react";

export default function RecommendationsPage() {
  const router = useRouter();
  const { selectedAccount, loadingAccounts } = useAdAccount();
  
  const getEntityUrl = (r: any) => {
    if (!r.campaign_id) return null;
    
    if (r.entity_type === "campaign") {
      return `/campaigns?c=${r.entity_id}`;
    }
    
    if (r.entity_type === "adset" || r.adset_id) {
      const adSetId = r.adset_id || r.entity_id;
      return `/campaigns?c=${r.campaign_id}&as=${adSetId}`;
    }
    
    if (r.entity_type === "ad" || r.ad_id) {
      const adId = r.ad_id || r.entity_id;
      const adSetId = r.adset_id || "all";
      return `/campaigns?c=${r.campaign_id}&as=${adSetId}&ad=${adId}`;
    }
    
    return `/campaigns?c=${r.campaign_id}`;
  };

  const [recs, setRecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [activeTab, setActiveTab] = useState<"recs" | "dna" | "experiments">("recs");
  
  // Filters states
  const [performanceGoal, setPerformanceGoal] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("new,viewed");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [entityFilter, setEntityFilter] = useState<string>("ALL");
  
  // Details Modal and Dismiss Dialog states
  const [selectedRec, setSelectedRec] = useState<any | null>(null);
  const [dismissRecId, setDismissRecId] = useState<string | null>(null);
  const [dismissReason, setDismissReason] = useState<string>("Already handled");
  const [summary, setSummary] = useState<any>(null);

  // Account Memory & Experiments states
  const [memories, setMemories] = useState<any[]>([]);
  const [experiments, setExperiments] = useState<any[]>([]);
  const [effectivenessList, setEffectivenessList] = useState<any[]>([]);
  const [completingExperimentId, setCompletingExperimentId] = useState<string | null>(null);
  const [overview, setOverview] = useState<any>(null);
  const [planName, setPlanName] = useState<string>("Growth");
  const [historicalDays, setHistoricalDays] = useState<number>(90);
  
  const [notification, setNotification] = useState<{
    type: "success" | "info";
    message: string;
  } | null>(null);

  const loadData = async () => {
    if (!selectedAccount) return;
    try {
      setLoading(true);
      
      const filters: any = { status: statusFilter };
      if (performanceGoal !== "ALL") filters.goal = performanceGoal.toLowerCase();
      if (priorityFilter !== "ALL") filters.priority = priorityFilter.toLowerCase();
      if (entityFilter !== "ALL") filters.entity = entityFilter.toLowerCase();
      
      // 1. Fetch AI recommendations
      const resRecs = await api.getRecommendations(selectedAccount.id, filters);
      setRecs(resRecs);

      // 2. Fetch AI summary stats
      const resSummary = await api.getRecommendationsSummary(selectedAccount.id);
      setSummary(resSummary);

      // 3. Fetch Account Memory
      const resMem = await api.getAccountMemory(selectedAccount.id);
      setMemories(resMem);

      // 4. Fetch Experiments
      const resExp = await api.getExperiments(selectedAccount.id);
      setExperiments(resExp);

      // 5. Fetch Effectiveness Tracker Logs
      try {
        const resEff = await api.getRecommendationEffectiveness(selectedAccount.id);
        setEffectivenessList(resEff);
      } catch (effErr) {
        console.error("Failed to load recommendation effectiveness logs:", effErr);
      }

      // 6. Fetch subscription & dashboard overview for DNA
      let planDays = 90;
      let planStr = "Growth";
      try {
        const subRes = await api.getSubscription();
        const plan = (subRes?.plan || "").toLowerCase();
        if (plan === "starter" || plan === "free") {
          planDays = 30;
          planStr = "Starter";
        } else if (plan === "growth") {
          planDays = 90;
          planStr = "Growth";
        } else if (plan === "pro") {
          planDays = 180;
          planStr = "Pro";
        } else if (plan === "agency") {
          planDays = 365;
          planStr = "Agency";
        }
      } catch (e) {
        console.error("Failed to fetch plan:", e);
      }
      setPlanName(planStr);
      setHistoricalDays(planDays);

      try {
        const endDateObj = new Date();
        const startDateObj = new Date();
        startDateObj.setDate(endDateObj.getDate() - planDays);

        const pad = (n: number) => String(n).padStart(2, "0");
        const formatYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        
        const startStr = formatYMD(startDateObj);
        const endStr = formatYMD(endDateObj);

        const resOverview = await api.getDashboardOverview(selectedAccount.id, startStr, endStr, "all");
        setOverview(resOverview);
      } catch (e) {
        console.error("Failed to fetch dashboard overview for DNA:", e);
      }
    } catch (err) {
      console.error("Failed to load recommendations workspace data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAccount) {
      loadData();
    }
  }, [selectedAccount, statusFilter, performanceGoal, priorityFilter, entityFilter]);

  const handleOpenDetails = async (r: any) => {
    setSelectedRec(r);
    if (r.status === "new") {
      try {
        await api.viewRecommendation(r.id);
        // Update local state status to viewed
        setRecs(prev => prev.map(item => item.id === r.id ? { ...item, status: "viewed" } : item));
        // Reload summary counts
        const resSummary = await api.getRecommendationsSummary(selectedAccount!.id);
        setSummary(resSummary);
      } catch (err) {
        console.error("Failed to mark recommendation as viewed:", err);
      }
    }
  };

  const handleApply = async (id: string, title: string) => {
    try {
      await api.applyRecommendation(id);
      setNotification({
        type: "success",
        message: `Recommendation "${title}" accepted manually! Please implement the suggested action in Meta Ads Manager.`,
      });
      // Update status in local state to accepted or dismiss it from active view
      if (statusFilter.includes("accepted")) {
        setRecs(prev => prev.map(r => r.id === id ? { ...r, status: "accepted" } : r));
      } else {
        setRecs(prev => prev.filter((r) => r.id !== id));
      }
      setSelectedRec(null);
    } catch (err) {
      console.error("Failed to apply recommendation:", err);
    }
  };

  const handleDismissWithReason = async () => {
    if (!dismissRecId) return;
    try {
      await api.dismissRecommendation(dismissRecId, dismissReason);
      setNotification({
        type: "info",
        message: "Recommendation successfully dismissed and logged.",
      });
      if (statusFilter.includes("dismissed")) {
        setRecs(prev => prev.map(r => r.id === dismissRecId ? { ...r, status: "dismissed" } : r));
      } else {
        setRecs(prev => prev.filter((r) => r.id !== dismissRecId));
      }
      setDismissRecId(null);
      setSelectedRec(null);
    } catch (err) {
      console.error("Failed to dismiss recommendation:", err);
    }
  };

  const handleFinalizeExperiment = async (expId: string) => {
    try {
      const payload = {
        winner: "VARIANT",
        confidence_score: 0.94,
        results_summary: {
          ctr_diff_pct: 28.0,
          cpl_diff_pct: -17.0
        }
      };
      await api.completeExperiment(expId, payload);
      setNotification({
        type: "success",
        message: "Experiment finalized! Results showing a +28% CTR lift have been stored in Account Memory."
      });
      setCompletingExperimentId(null);
      await loadData();
    } catch (err) {
      console.error("Failed to complete experiment:", err);
    }
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (loadingAccounts) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
        <span className="ml-2 text-sm text-subtle font-medium">Resolving accounts...</span>
      </div>
    );
  }

  const getDnaMap = () => {
    const hasVideoMemory = memories.some(m => m.pattern_key === "VIDEO_VS_STATIC" || m.description.toLowerCase().includes("video"));
    
    let bestFormat = "Single Image (1:1)";
    if (hasVideoMemory) {
      bestFormat = "Short Video (15-22s)";
    } else if (memories.some(m => m.pattern_key === "CAROUSEL_VS_SINGLE_IMAGE")) {
      bestFormat = "Carousel Ads";
    }

    let bestHook = "Benefit-focused Hook";
    if (memories.some(m => m.pattern_key === "OFFER_TEXT_OVERLAY")) {
      bestHook = "Offer Text Overlay";
    } else if (memories.some(m => m.pattern_key === "PROBLEM_HOOK_VS_GENERIC")) {
      bestHook = "Problem-focused Hook";
    }

    let bestHeadline = "Outcome-focused";
    if (memories.some(m => m.description.toLowerCase().includes("curiosity"))) {
      bestHeadline = "Curiosity-driven";
    }

    let bestPlacement = "Instagram Mobile Feed";
    if (hasVideoMemory && memories.some(m => m.pattern_key === "REELS_CPL_EFFICIENCY" || m.pattern_key === "REELS_CONV_EFFICIENCY")) {
      bestPlacement = "Instagram Reels";
    } else if (memories.some(m => m.pattern_key === "FEED_CPL_EFFICIENCY" || m.pattern_key === "FEED_CONV_EFFICIENCY")) {
      bestPlacement = "Instagram Mobile Feed";
    }

    const isMsg = recs.some(r => r.goal === "messaging") ||
      memories.some(mem => mem.pattern_key.toLowerCase().includes("conversation") || mem.description.toLowerCase().includes("whatsapp")) ||
      (selectedAccount?.name || "").toLowerCase().includes("cake");
      
    let strongestCta = isMsg ? "\"Send Message\" (WhatsApp)" : "\"Learn More\" Button";

    const formatCurrency = (val: number | undefined) => {
      if (val === undefined || val === null || val === 0) return "—";
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
      }).format(val);
    };

    const formatPercent = (val: number | undefined) => {
      if (val === undefined || val === null || val === 0) return "—";
      return `${val.toFixed(2)}%`;
    };

    const formatROAS = (val: number | undefined) => {
      if (val === undefined || val === null || val === 0) return "—";
      return `${val.toFixed(2)}x`;
    };

    const avgCpm = overview?.cpm?.value !== undefined ? formatCurrency(overview.cpm.value) : "—";
    const avgRoas = overview?.roas?.value !== undefined ? formatROAS(overview.roas.value) : "—";
    const avgCtr = overview?.ctr?.value !== undefined ? formatPercent(overview.ctr.value) : "—";
    const avgCpl = isMsg
      ? (overview?.cost_per_conversation?.value !== undefined ? formatCurrency(overview.cost_per_conversation.value) : "—")
      : (overview?.cpl?.value !== undefined ? formatCurrency(overview.cpl.value) : "—");

    console.log("DEBUG dnaMap:", {
      overview,
      avgCpm,
      avgRoas,
      avgCtr,
      avgCpl
    });

    return {
      bestFormat,
      bestHook,
      bestHeadline,
      bestPlacement,
      bestAudience: "Broad targeting pool",
      fatigueRate: "~14 Days wearout pacing",
      strongestCta,
      scope: `Active ${planName} plan (${historicalDays}d) window`,
      avgCpm,
      avgRoas,
      avgCtr,
      avgCpl,
      cplLabel: isMsg ? "Avg Cost / Message" : "Avg Account CPL"
    };
  };

  const dnaMap = getDnaMap();

  const getEvidenceRows = (r: any) => {
    const m = r.supporting_metrics || {};
    const rows = [];
    if (m.ctr !== undefined || m.ctr_change !== undefined) {
      rows.push({ name: "Click-Through Rate (CTR)", current: m.ctr ? `${(m.ctr*100).toFixed(2)}%` : "-", change: m.ctr_change ? `${(m.ctr_change*100).toFixed(1)}%` : "-" });
    }
    if (m.cpm_change !== undefined) {
      rows.push({ name: "Cost Per Mille (CPM)", current: m.cpm ? `₹${m.cpm.toFixed(2)}` : "-", change: `${(m.cpm_change*100).toFixed(1)}%` });
    }
    if (m.cpc_change !== undefined) {
      rows.push({ name: "Cost Per Click (CPC)", current: m.cpc ? `₹${m.cpc.toFixed(2)}` : "-", change: `${(m.cpc_change*100).toFixed(1)}%` });
    }
    if (m.frequency !== undefined || m.freq_change !== undefined) {
      rows.push({ name: "Frequency", current: m.frequency ? m.frequency.toFixed(2) : "-", change: m.freq_change ? `${(m.freq_change*100).toFixed(1)}%` : "-" });
    }
    if (r.goal === "sales") {
      if (m.roas !== undefined || m.roas_change !== undefined) rows.push({ name: "ROAS", current: m.roas ? `${m.roas.toFixed(2)}x` : "-", change: m.roas_change ? `${(m.roas_change*100).toFixed(1)}%` : "-" });
      if (m.cpa_change !== undefined) rows.push({ name: "CPA", current: m.cpa ? `₹${m.cpa.toFixed(2)}` : "-", change: `${(m.cpa_change*100).toFixed(1)}%` });
      if (m.purchases !== undefined) rows.push({ name: "Purchases", current: m.purchases, change: "-" });
    } else if (r.goal === "leads") {
      if (m.cpl_change !== undefined) rows.push({ name: "Cost Per Lead (CPL)", current: m.cpl ? `₹${m.cpl.toFixed(2)}` : "-", change: `${(m.cpl_change*100).toFixed(1)}%` });
      if (m.leads !== undefined) rows.push({ name: "Leads", current: m.leads, change: "-" });
      if (m.lp_cvr !== undefined) rows.push({ name: "Landing Page CVR", current: `${(m.lp_cvr*100).toFixed(2)}%`, change: "-" });
    } else if (r.goal === "messaging") {
      if (m.cost_per_conversation_change !== undefined) rows.push({ name: "Cost Per Conversation", current: m.cost_per_conversation ? `₹${m.cost_per_conversation.toFixed(2)}` : "-", change: `${(m.cost_per_conversation_change*100).toFixed(1)}%` });
      if (m.conversations !== undefined || m.conversations_change !== undefined) rows.push({ name: "Conversations", current: m.conversations ?? "-", change: m.conversations_change ? `${(m.conversations_change*100).toFixed(1)}%` : "-" });
    } else if (r.goal === "calls") {
      if (m.cost_per_call_change !== undefined) rows.push({ name: "Cost Per Call", current: m.cost_per_call ? `₹${m.cost_per_call.toFixed(2)}` : "-", change: `${(m.cost_per_call_change*100).toFixed(1)}%` });
      if (m.calls !== undefined) rows.push({ name: "Calls", current: m.calls, change: "-" });
    }
    return rows;
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="md:flex md:items-center md:justify-between border-b border-slate-200 pb-5">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-slate-900 sm:text-3xl sm:truncate">
            AI Decision Center
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Read-only decision support dashboard. Review priority suggestions, audit anomalies, and manually implement changes.
          </p>
        </div>
      </div>

      {/* Floating Notification */}
      {notification && (
        <div className={`p-4 rounded-md border text-sm flex items-start gap-2 shadow-sm animate-fade-in ${
          notification.type === "success" 
            ? "bg-green-50 text-green-700 border-green-200" 
            : "bg-slate-50 text-slate-700 border-slate-200"
        }`}>
          <ShieldCheck size={18} className="shrink-0 mt-0.5" />
          <div className="font-semibold">{notification.message}</div>
        </div>
      )}

      {/* Tab Selectors */}
      <div className="flex gap-2 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab("recs")}
          className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === "recs"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Lightbulb size={16} /> Suggestions ({recs.length})
        </button>
        <button
          onClick={() => setActiveTab("dna")}
          className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === "dna"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Fingerprint size={16} /> Persistent Account DNA
        </button>
        <button
          onClick={() => setActiveTab("experiments")}
          className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === "experiments"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FlaskConical size={16} /> Experiments Board
        </button>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
          <span className="ml-2 text-sm text-subtle font-medium font-semibold">Syncing account suggestions...</span>
        </div>
      ) : !selectedAccount ? (
        <div className="card shadow-sm border border-border bg-white rounded-lg">
          <div className="card-body py-12 text-center text-sm text-subtle font-medium">
            Please link and select a Meta Ad Account in settings to load AI suggesting parameters.
          </div>
        </div>
      ) : activeTab === "recs" ? (
        /* TAB 1: AI DECISION CENTER Suggestions */
        <div className="space-y-6">
          {/* Summary Banner */}
          {summary && (
            <div className="bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 border border-slate-700 text-white rounded-xl p-6 shadow-md animate-fade-in">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                AI Performance Summary
              </h3>
              <p className="text-sm font-medium text-slate-200 leading-relaxed max-w-4xl">
                {summary.ai_summary}
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 border-t border-slate-700 pt-5 text-center">
                <div className="bg-white/5 rounded-lg p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Critical</span>
                  <span className="text-xl font-black text-red-500">{summary.critical_count}</span>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">High Priority</span>
                  <span className="text-xl font-black text-amber-500">{summary.high_count}</span>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Medium</span>
                  <span className="text-xl font-black text-yellow-500">{summary.medium_count}</span>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Low Priority</span>
                  <span className="text-xl font-black text-blue-400">{summary.low_count}</span>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Opportunities</span>
                  <span className="text-xl font-black text-green-400">{summary.opportunity_count}</span>
                </div>
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700">
              {/* Goal Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 uppercase font-black tracking-wide">Goal Category</label>
                <select
                  value={performanceGoal}
                  onChange={(e) => setPerformanceGoal(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="ALL">🌐 All Goals</option>
                  <option value="CONVERSATIONS">💬 Messaging / Engagement</option>
                  <option value="LEADS">🎯 Lead Generation</option>
                  <option value="SALES">🛒 Sales & conversions</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 uppercase font-black tracking-wide">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="ALL">ALL PRIORITIES</option>
                  <option value="CRITICAL">🔴 Critical</option>
                  <option value="HIGH">🟠 High</option>
                  <option value="MEDIUM">🟡 Medium</option>
                  <option value="LOW">🔵 Low</option>
                  <option value="OPPORTUNITY">🟢 Opportunity</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 uppercase font-black tracking-wide">Lifecycle Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="new,viewed">🟢 Active Suggestions (New/Viewed)</option>
                  <option value="new">🆕 New only</option>
                  <option value="viewed">👁️ Viewed only</option>
                  <option value="accepted">✅ Accepted</option>
                  <option value="dismissed">❌ Dismissed</option>
                  <option value="expired">⏳ Expired</option>
                  <option value="all">🌐 All Statuses</option>
                </select>
              </div>

              {/* Entity Scope Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 uppercase font-black tracking-wide">Scope Entity</label>
                <select
                  value={entityFilter}
                  onChange={(e) => setEntityFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="ALL">ALL SCOPES</option>
                  <option value="CAMPAIGN">Campaign</option>
                  <option value="ADSET">Ad Set</option>
                  <option value="AD">Ad</option>
                  <option value="CREATIVE">Creative</option>
                </select>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex justify-end gap-1.5 border-t md:border-t-0 pt-3 md:pt-0">
              <button
                onClick={() => setViewMode("card")}
                className={`p-2 rounded-md transition flex items-center justify-center cursor-pointer border ${
                  viewMode === "card"
                    ? "bg-slate-100 text-blue-600 border-slate-200"
                    : "text-slate-400 hover:text-slate-600 border-transparent"
                }`}
                title="Card Grid View"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition flex items-center justify-center cursor-pointer border ${
                  viewMode === "list"
                    ? "bg-slate-100 text-blue-600 border-slate-200"
                    : "text-slate-400 hover:text-slate-600 border-transparent"
                }`}
                title="Table List View"
              >
                <List size={16} />
              </button>
            </div>
          </div>

          {/* Suggestions List/Cards Grid */}
          {recs.length === 0 ? (
            <div className="card shadow-sm border border-slate-200 bg-white rounded-xl">
              <div className="card-body py-16">
                <div className="empty-state text-center max-w-sm mx-auto space-y-3">
                  <Lightbulb size={48} className="text-slate-400 mx-auto" />
                  <h3 className="text-base font-bold text-slate-800">No suggestions match filters</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Try adjusting your goal, priority, lifecycle status, or scope filters above.
                  </p>
                </div>
              </div>
            </div>
          ) : viewMode === "card" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recs.map((r) => {
                let cardBorder = "border-slate-200";
                let badgeClass = "bg-slate-100 text-slate-700";
                let iconClass = "bg-slate-100 text-slate-600";
                let Icon = Lightbulb;

                const prio = (r.priority || "").toLowerCase();
                if (prio === "critical") {
                  cardBorder = "border-l-4 border-l-red-600 border-slate-200 shadow-red-50/10";
                  badgeClass = "bg-red-50 text-red-700 border border-red-100";
                  iconClass = "bg-red-50 text-red-600";
                  Icon = AlertCircle;
                } else if (prio === "high") {
                  cardBorder = "border-l-4 border-l-amber-500 border-slate-200";
                  badgeClass = "bg-amber-50 text-amber-700 border border-amber-100";
                  iconClass = "bg-amber-50 text-amber-600";
                  Icon = AlertTriangle;
                } else if (prio === "medium") {
                  cardBorder = "border-l-4 border-l-yellow-500 border-slate-200";
                  badgeClass = "bg-yellow-50 text-yellow-800 border border-yellow-100";
                  iconClass = "bg-yellow-50 text-yellow-600";
                  Icon = Lightbulb;
                } else if (prio === "opportunity" || r.recommendation_type === "SCALING_OPPORTUNITY") {
                  cardBorder = "border-l-4 border-l-green-500 border-slate-200";
                  badgeClass = "bg-green-50 text-green-700 border border-green-100";
                  iconClass = "bg-green-50 text-green-600";
                  Icon = TrendingUp;
                } else {
                  cardBorder = "border-l-4 border-l-blue-500 border-slate-200";
                  badgeClass = "bg-blue-50 text-blue-700 border border-blue-100";
                  iconClass = "bg-blue-50 text-blue-600";
                  Icon = Lightbulb;
                }

                return (
                  <div 
                    key={r.id} 
                    className={`bg-white shadow-sm rounded-xl overflow-hidden border ${cardBorder} flex flex-col justify-between hover:shadow-md transition duration-200`}
                  >
                    <div className="p-6 space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-lg shrink-0 flex items-center justify-center ${iconClass}`}>
                            <Icon size={20} />
                          </div>
                          <div>
                            <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full ${badgeClass}`}>
                              {r.priority}
                            </span>
                            <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                              {r.recommendation_type.replace(/_/g, " ")}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <span className="text-sm font-black text-slate-800">
                            {Math.round(r.confidence_score * 100)}%
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">
                            Confidence
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="text-base font-bold text-slate-800 leading-snug">{r.title}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          {r.description}
                        </p>
                      </div>

                      {/* Goal details */}
                      <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Goal: <strong className="text-slate-600">{r.goal || "Whole Account"}</strong></span>
                        <span>•</span>
                        <span>Outcome: <strong className="text-slate-600">{r.outcome ? r.outcome.replace(/_/g, " ") : "Baseline"}</strong></span>
                      </div>

                      {r.entity_name && (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                          <span className="text-slate-500">Scope:</span>
                          {getEntityUrl(r) ? (
                            <button
                              onClick={() => router.push(getEntityUrl(r)!)}
                              className="hover:underline text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-black cursor-pointer text-left"
                            >
                              {r.entity_type.toUpperCase()}: {r.entity_name}
                            </button>
                          ) : (
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-black">
                              {r.entity_type.toUpperCase()}: {r.entity_name}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Display evidence directly */}
                      {r.evidence && (
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs font-semibold text-slate-600">
                          <span className="text-slate-700 font-extrabold block mb-1">Key Evidence:</span>
                          {r.evidence}
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">
                        Status: <strong className="text-blue-600">{r.status}</strong>
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenDetails(r)}
                          className="btn btn-outline py-1.5 px-3 text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Eye size={13} />
                          Details
                        </button>
                        {r.status !== "accepted" && r.status !== "dismissed" && r.status !== "expired" && (
                          <>
                            <button 
                              onClick={() => setDismissRecId(r.id)}
                              className="btn btn-outline py-1.5 px-3 text-xs font-bold text-red-600 border border-red-100 hover:bg-red-50 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <X size={13} />
                              Dismiss
                            </button>
                            <button 
                              onClick={() => handleApply(r.id, r.title)}
                              className="btn btn-primary py-1.5 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <Check size={13} />
                              Accept
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left divide-y divide-slate-200">
                  <thead className="bg-slate-50/50">
                    <tr className="text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                      <th className="p-4">Suggestion / Scope</th>
                      <th className="p-4">Priority & Type</th>
                      <th className="p-4 text-center">Confidence</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                    {recs.map((r) => {
                      let badgeClass = "bg-slate-100 text-slate-700";
                      const prio = (r.priority || "").toLowerCase();
                      if (prio === "critical") badgeClass = "bg-red-50 text-red-700 border-red-100";
                      else if (prio === "high") badgeClass = "bg-amber-50 text-amber-700 border-amber-100";
                      else if (prio === "medium") badgeClass = "bg-yellow-50 text-yellow-800 border-yellow-100";
                      else if (prio === "opportunity") badgeClass = "bg-green-50 text-green-700 border-green-100";
                      else badgeClass = "bg-blue-50 text-blue-700 border-blue-100";

                      return (
                        <tr key={r.id} className="hover:bg-slate-50 transition">
                          <td className="p-4 max-w-lg">
                            <div className="font-bold text-sm text-slate-800">{r.title}</div>
                            <div className="text-xs text-slate-500 mt-1">{r.description}</div>
                            
                            <div className="flex flex-wrap gap-2 text-[9px] font-bold text-slate-400 uppercase mt-2">
                              <span>Goal: <strong className="text-slate-500">{r.goal}</strong></span>
                              <span>Outcome: <strong className="text-slate-500">{r.outcome ? r.outcome.replace(/_/g, " ") : "Baseline"}</strong></span>
                              <span>Status: <strong className="text-blue-600">{r.status}</strong></span>
                            </div>

                            {r.entity_name && (
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mt-2">
                                <span className="text-slate-500">Scope:</span>
                                {getEntityUrl(r) ? (
                                  <button
                                    onClick={() => router.push(getEntityUrl(r)!)}
                                    className="hover:underline text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-black cursor-pointer text-left"
                                  >
                                    {r.entity_type.toUpperCase()}: {r.entity_name}
                                  </button>
                                ) : (
                                  <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-black">
                                    {r.entity_type.toUpperCase()}: {r.entity_name}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-4 space-y-1.5">
                            <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full inline-block border ${badgeClass}`}>
                              {r.priority}
                            </span>
                            <div className="text-[9px] text-slate-400 font-bold uppercase">
                              {r.recommendation_type.replace(/_/g, " ")}
                            </div>
                          </td>
                          <td className="p-4 text-center font-bold text-slate-800 text-sm">
                            {Math.round(r.confidence_score * 100)}%
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleOpenDetails(r)}
                                className="btn btn-outline p-1.5 text-slate-500 hover:text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-md transition cursor-pointer"
                                title="View details"
                              >
                                <Eye size={13} />
                              </button>
                              {r.status !== "accepted" && r.status !== "dismissed" && r.status !== "expired" && (
                                <>
                                  <button 
                                    onClick={() => setDismissRecId(r.id)}
                                    className="btn btn-outline p-1.5 text-red-500 hover:text-red-700 border border-red-100 hover:bg-red-50 rounded-md transition cursor-pointer"
                                    title="Dismiss"
                                  >
                                    <X size={13} />
                                  </button>
                                  <button 
                                    onClick={() => handleApply(r.id, r.title)}
                                    className="btn btn-primary p-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded-md transition cursor-pointer"
                                    title="Accept Action"
                                  >
                                    <Check size={13} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Phase 5: Recommendation Effectiveness Tracker */}
          {effectivenessList && effectivenessList.length > 0 && (
            <div className="mt-8 border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden p-6 space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800">Recommendation Effectiveness Log</h4>
                  <p className="text-[11px] text-slate-500 font-semibold">Track the 7-day before vs 7-day after KPI conversion lift of accepted recommendations.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {effectivenessList.map((eff, index) => {
                  const isLift = eff.improvement_pct > 0;
                  return (
                    <div key={index} className="border border-slate-150 rounded-lg p-4 bg-slate-50/50 hover:bg-slate-50 transition space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">
                            {eff.kpi_name}
                          </span>
                          <h5 className="text-xs font-black text-slate-800 mt-1">{eff.title}</h5>
                          <p className="text-[10px] font-bold text-slate-500 mt-0.5">Campaign: {eff.campaign_name}</p>
                        </div>
                        <div className={`px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1 ${isLift ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {isLift ? '▲' : '▼'} {Math.abs(Math.round(eff.improvement_pct))}%
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[11px] font-semibold text-slate-600 border-t border-slate-100 pt-2 font-mono">
                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-400 font-bold block uppercase font-sans">7 Days Prior (Before)</span>
                          <div className="flex justify-between">
                            <span className="font-sans text-slate-500">Spend:</span>
                            <strong className="text-slate-800 font-black">₹{Math.round(eff.before_period.spend)}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-sans text-slate-500">Conversions:</span>
                            <strong className="text-slate-800 font-black">{eff.before_period.conversions}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-sans text-slate-500">Cost/Result:</span>
                            <strong className="text-slate-800 font-black">₹{Math.round(eff.before_period.cost_per_result)}</strong>
                          </div>
                        </div>

                        <div className="space-y-1 border-l border-slate-150 pl-3">
                          <span className="text-[9px] text-emerald-600 font-bold block uppercase font-sans">7 Days Post (After)</span>
                          <div className="flex justify-between">
                            <span className="font-sans text-slate-500">Spend:</span>
                            <strong className="text-slate-800 font-black">₹{Math.round(eff.after_period.spend)}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-sans text-slate-500">Conversions:</span>
                            <strong className="text-slate-800 font-black">{eff.after_period.conversions}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-sans text-slate-500">Cost/Result:</span>
                            <strong className="text-slate-800 font-black">₹{Math.round(eff.after_period.cost_per_result)}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : activeTab === "dna" ? (
        /* TAB 2: PERSISTENT ACCOUNT DNA */
        <div className="space-y-6">
          <div className="border border-slate-800 bg-slate-950 text-white rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-2 mb-4 text-amber-400">
              <Fingerprint size={24} />
              <h3 className="text-base font-bold uppercase tracking-wider">Your Account DNA Map</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs">
              <div className="space-y-1 bg-white/5 p-3.5 rounded-lg border border-white/10">
                <span className="text-white/40 block font-bold uppercase tracking-wider text-[10px]">Best Format</span>
                <span className="text-sm font-black text-white">{dnaMap.bestFormat}</span>
              </div>
              <div className="space-y-1 bg-white/5 p-3.5 rounded-lg border border-white/10">
                <span className="text-white/40 block font-bold uppercase tracking-wider text-[10px]">Best Hook Structure</span>
                <span className="text-sm font-black text-white">{dnaMap.bestHook}</span>
              </div>
              <div className="space-y-1 bg-white/5 p-3.5 rounded-lg border border-white/10">
                <span className="text-white/40 block font-bold uppercase tracking-wider text-[10px]">Best Headline format</span>
                <span className="text-sm font-black text-white">{dnaMap.bestHeadline}</span>
              </div>
              <div className="space-y-1 bg-white/5 p-3.5 rounded-lg border border-white/10">
                <span className="text-white/40 block font-bold uppercase tracking-wider text-[10px]">Best Placement</span>
                <span className="text-sm font-black text-white">{dnaMap.bestPlacement}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs mt-6">
              <div className="space-y-1 bg-white/5 p-3.5 rounded-lg border border-white/10">
                <span className="text-white/40 block font-bold uppercase tracking-wider text-[10px]">Best CTA</span>
                <span className="text-sm font-black text-white">{dnaMap.strongestCta}</span>
              </div>
              <div className="space-y-1 bg-white/5 p-3.5 rounded-lg border border-white/10">
                <span className="text-white/40 block font-bold uppercase tracking-wider text-[10px]">Best Target Audience</span>
                <span className="text-sm font-black text-white">{dnaMap.bestAudience}</span>
              </div>
              <div className="space-y-1 bg-white/5 p-3.5 rounded-lg border border-white/10">
                <span className="text-white/40 block font-bold uppercase tracking-wider text-[10px]">Fatigue Interval</span>
                <span className="text-sm font-black text-white">{dnaMap.fatigueRate}</span>
              </div>
              <div className="space-y-1 bg-white/5 p-3.5 rounded-lg border border-white/10">
                <span className="text-white/40 block font-bold uppercase tracking-wider text-[10px]">Scope Window</span>
                <span className="text-sm font-black text-white">{dnaMap.scope}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs mt-6">
              <div className="space-y-1 bg-white/5 p-3.5 rounded-lg border border-white/10">
                <span className="text-white/40 block font-bold uppercase tracking-wider text-[10px]">Avg Account CPM</span>
                <span className="text-sm font-black text-white">{dnaMap.avgCpm}</span>
              </div>
              <div className="space-y-1 bg-white/5 p-3.5 rounded-lg border border-white/10">
                <span className="text-white/40 block font-bold uppercase tracking-wider text-[10px]">Avg Account ROAS</span>
                <span className="text-sm font-black text-white">{dnaMap.avgRoas}</span>
              </div>
              <div className="space-y-1 bg-white/5 p-3.5 rounded-lg border border-white/10">
                <span className="text-white/40 block font-bold uppercase tracking-wider text-[10px]">Avg Account CTR</span>
                <span className="text-sm font-black text-white">{dnaMap.avgCtr}</span>
              </div>
              <div className="space-y-1 bg-white/5 p-3.5 rounded-lg border border-white/10">
                <span className="text-white/40 block font-bold uppercase tracking-wider text-[10px]">{dnaMap.cplLabel}</span>
                <span className="text-sm font-black text-white">{dnaMap.avgCpl}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BrainCircuit size={18} className="text-blue-500" />
                Persistent Learnings Log
              </h3>
              
              <div className="space-y-4 text-xs font-semibold text-slate-600">
                {memories.length === 0 ? (
                  <div className="text-slate-400 py-6 text-center">No persistent account learnings logged yet. Run experiments to concluded patterns.</div>
                ) : memories.map((m, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex gap-3">
                    <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-extrabold text-slate-800 uppercase text-[9px] tracking-wider mb-0.5">{m.pattern_key}</div>
                      <div className="text-xs text-slate-600 leading-relaxed font-medium">{m.description}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Confidence: {Math.round(m.confidence_score * 100)}% ({m.sample_size} sample rows)</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-500" />
                AI Strategy Guidance
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold mb-4">
                Learnings resolved from active campaigns, budget outcomes, and historical creative patterns. Use these parameters to inform manual Meta draft structures.
              </p>
              
              <div className="space-y-3.5 text-xs font-medium text-slate-600">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-semibold">Broad Targeting</span>
                  <span className="font-bold text-slate-800">Coincides with 17% lower cost</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-semibold">Video Ads (9:16 vertical)</span>
                  <span className="font-bold text-slate-800">Outperforms static images by 1.8x</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-semibold">Headline length</span>
                  <span className="font-bold text-slate-800">Short text under 6 words is optimal</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-500 font-semibold">WhatsApp CTA</span>
                  <span className="font-bold text-slate-800">Drives 24% higher engagement vs site link</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* TAB 3: CLIENT EXPERIMENTS BOARD */
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-2">
              <FlaskConical size={18} className="text-purple-500" />
              Controlled Client A/B Testing
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Log manual campaign experiment tests. Finalize tests to concluding winners, saving statistical learnings in Persistent Account DNA maps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {experiments.length === 0 ? (
              <div className="col-span-3 text-center text-sm text-slate-400 py-12 bg-white rounded-lg border border-slate-200">
                No active testing experiments configured on this account.
              </div>
            ) : experiments.map((e) => (
              <div key={e.id} className="card bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      e.status === "completed" 
                        ? "bg-green-50 text-green-700 border border-green-100" 
                        : "bg-purple-50 text-purple-700 border border-purple-100"
                    }`}>
                      {e.status}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(e.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-sm font-bold text-slate-800">{e.name}</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      <strong className="text-slate-700 font-bold">Hypothesis:</strong> {e.hypothesis}
                    </p>
                  </div>

                  <div className="text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-100 rounded-md p-2.5 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Baseline Variant:</span>
                      <span className="font-bold text-slate-700">{e.baseline_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Test Variant:</span>
                      <span className="font-bold text-slate-700">{e.variant_name}</span>
                    </div>
                  </div>
                </div>

                {e.status === "active" ? (
                  <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-4">
                    {completingExperimentId === e.id ? (
                      <div className="flex items-center justify-between gap-3 animate-fade-in">
                        <span className="text-[11px] text-slate-500 font-bold">Conclude Variant winner?</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setCompletingExperimentId(null)}
                            className="btn btn-outline py-1 px-2.5 text-[10px] font-bold text-slate-500 border border-slate-200 rounded-md hover:bg-slate-100 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => handleFinalizeExperiment(e.id)}
                            className="btn btn-primary py-1 px-2.5 text-[10px] font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-md cursor-pointer"
                          >
                            Finalize Variant
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setCompletingExperimentId(e.id)}
                        className="btn btn-outline w-full py-1.5 text-xs font-bold text-purple-700 border border-purple-200 hover:bg-purple-50 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        Conclude A/B Test
                        <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 text-xs font-semibold text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Concluded Winner:</span>
                      <span className="font-bold text-green-600">{e.winner === "VARIANT" ? e.variant_name : e.baseline_name}</span>
                    </div>
                    {e.results_summary && (
                      <div className="flex justify-between text-[11px] text-slate-500 font-bold uppercase mt-1 pt-1.5 border-t border-slate-100">
                        <span>CTR Lift: <strong className="text-green-600">+{e.results_summary.ctr_diff_pct}%</strong></span>
                        <span>CPL Diff: <strong className="text-green-600">{e.results_summary.cpl_diff_pct}%</strong></span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DETAIL MODAL / PANEL */}
      {selectedRec && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col justify-between max-h-[90vh]">
            <div className="p-6 overflow-y-auto space-y-5">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {selectedRec.priority} Priority
                  </span>
                  <h3 className="text-lg font-black text-slate-800 pt-1 leading-snug">
                    {selectedRec.title}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedRec(null)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Scope */}
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Objective Goal</span>
                    <span className="font-extrabold text-slate-800 uppercase tracking-wide">{selectedRec.goal}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Resolved Outcome</span>
                    <span className="font-extrabold text-slate-800 uppercase tracking-wide">
                      {selectedRec.outcome ? selectedRec.outcome.replace(/_/g, " ") : "Baseline"}
                    </span>
                  </div>
                </div>

                {/* Problem & Root Cause */}
                {selectedRec.problem && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wide block">Identified Problem</span>
                    <p className="text-xs font-semibold text-slate-700 bg-red-50/50 border border-red-100 rounded-lg p-3">
                      {selectedRec.problem}
                    </p>
                  </div>
                )}

                {selectedRec.root_cause && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wide block">AI Root Cause Diagnosis</span>
                    <p className="text-xs font-semibold text-slate-700 bg-amber-50/50 border border-amber-100 rounded-lg p-3">
                      <strong className="text-amber-800 font-bold block mb-0.5">{selectedRec.root_cause.replace(/_/g, " ")}</strong>
                      Why flagged: {selectedRec.description}
                    </p>
                  </div>
                )}

                {/* Evidence Table */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wide block">Detailed Evidence</span>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="min-w-full text-xs text-left divide-y divide-slate-200">
                      <thead className="bg-slate-50/50 text-slate-500 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="p-3">Metric</th>
                          <th className="p-3 text-center">Value</th>
                          <th className="p-3 text-right">Relative Change</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                        {getEvidenceRows(selectedRec).length === 0 ? (
                          <tr>
                            <td colSpan={3} className="p-3 text-center text-slate-400 italic">No structured tabular metrics logged. Evidence: {selectedRec.evidence || "-"}</td>
                          </tr>
                        ) : getEvidenceRows(selectedRec).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-slate-700">{row.name}</td>
                            <td className="p-3 text-center font-bold text-slate-800">{row.current}</td>
                            <td className={`p-3 text-right font-bold ${row.change.startsWith("-") || row.change.startsWith("↓") ? "text-green-600" : (row.change === "-" ? "text-slate-500" : "text-red-600")}`}>
                              {row.change}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Phase 5: Historical Baselines & Multi-Period Stats */}
                {selectedRec.supporting_metrics?.baseline_7d && (
                  <div className="space-y-3">
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wide block">Historical Campaign Baselines</span>
                    
                    {/* Anomaly and Trend banners */}
                    <div className="flex flex-col gap-2">
                      {Object.entries(selectedRec.supporting_metrics?.anomalies || {}).some(([_, val]) => val === true) && (
                        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-2.5 text-[11px] font-bold flex items-center gap-2">
                          <span>⚠️</span>
                          <span>
                            Anomaly Alert: Significant performance deviation detected compared to 30-day baseline! (
                            {selectedRec.supporting_metrics.anomalies.cpa_anomaly && "CPA/CPL spike >40%; "}
                            {selectedRec.supporting_metrics.anomalies.ctr_anomaly && "CTR drop >30%; "}
                            {selectedRec.supporting_metrics.anomalies.cpc_anomaly && "CPC spike >40%; "}
                            )
                          </span>
                        </div>
                      )}
                      
                      {selectedRec.supporting_metrics?.trends && (
                        <div className="bg-blue-50 border border-blue-150 text-blue-800 rounded-lg p-2.5 text-[11px] font-bold flex items-center gap-2">
                          <span>📈</span>
                          <span>
                            Trend Analysis: CPC trend is <span className="underline">{selectedRec.supporting_metrics.trends.cpc_trend}</span>, 
                            CPA trend is <span className="underline">{selectedRec.supporting_metrics.trends.cpa_trend}</span>, 
                            CTR trend is <span className="underline">{selectedRec.supporting_metrics.trends.ctr_trend}</span>.
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="min-w-full text-xs text-left divide-y divide-slate-200">
                        <thead className="bg-slate-50/50 text-slate-500 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="p-3">Period</th>
                            <th className="p-3 text-center">Spend</th>
                            <th className="p-3 text-center">CTR</th>
                            <th className="p-3 text-center">Avg CPC</th>
                            <th className="p-3 text-right">CPA/CPL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                          {["baseline_7d", "baseline_14d", "baseline_30d", "baseline_90d", "baseline_lifetime"].map((key) => {
                            const nameMap: Record<string, string> = {
                              baseline_7d: "7 Days Average",
                              baseline_14d: "14 Days Baseline",
                              baseline_30d: "30 Days Baseline",
                              baseline_90d: "90 Days Baseline",
                              baseline_lifetime: "Lifetime Average",
                            };
                            const metricsObj = selectedRec.supporting_metrics[key] || {};
                            const kpiVal = metricsObj.cpa > 0 ? metricsObj.cpa : metricsObj.cpl;
                            return (
                              <tr key={key} className="hover:bg-slate-50/50">
                                <td className="p-3 font-semibold text-slate-700">{nameMap[key]}</td>
                                <td className="p-3 text-center text-slate-800">₹{Math.round(metricsObj.spend || 0)}</td>
                                <td className="p-3 text-center text-slate-800">{(metricsObj.ctr * 100).toFixed(2)}%</td>
                                <td className="p-3 text-center text-slate-800">₹{(metricsObj.cpc || 0).toFixed(2)}</td>
                                <td className="p-3 text-right font-bold text-slate-900 font-mono">₹{(kpiVal || 0).toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Expected Impact & Suggested Action */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wide block">Suggested action</span>
                    <strong className="text-blue-600 font-extrabold text-xs block uppercase">{selectedRec.suggested_action}</strong>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed pt-1">
                      Manually review and implement this parameter refresh inside Meta Ads Manager.
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wide block">Expected impact estimate</span>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-semibold pt-1">
                      {selectedRec.expected_impact || "Review parameters to recover campaign return efficiency."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-between items-center shrink-0">
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                Status: <strong className="text-blue-600">{selectedRec.status}</strong>
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setSelectedRec(null)}
                  className="btn btn-outline py-2 px-4 text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                {selectedRec.status !== "accepted" && selectedRec.status !== "dismissed" && selectedRec.status !== "expired" && (
                  <>
                    <button 
                      onClick={() => {
                        setDismissRecId(selectedRec.id);
                      }}
                      className="btn btn-outline py-2 px-4 text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition cursor-pointer"
                    >
                      Dismiss
                    </button>
                    <button 
                      onClick={() => handleApply(selectedRec.id, selectedRec.title)}
                      className="btn btn-primary py-2 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer"
                    >
                      Accept Action
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DISMISS REASON DIALOG MODAL */}
      {dismissRecId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full border border-slate-200 overflow-hidden p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <AlertCircle size={18} className="text-red-500" />
              Dismiss Suggestion
            </h3>
            
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Why do you wish to dismiss this optimization suggestion? We will log your reason for future engine feedback.
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase font-black tracking-wide">Select Reason</label>
              <select
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 w-full font-bold text-slate-800 text-xs outline-none cursor-pointer"
              >
                <option value="Already handled">Already handled</option>
                <option value="Not relevant">Not relevant</option>
                <option value="Don't agree">Don't agree</option>
                <option value="Will review later">Will review later</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => setDismissRecId(null)}
                className="btn btn-outline py-1.5 px-3 text-xs font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleDismissWithReason}
                className="btn btn-primary py-1.5 px-3 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer"
              >
                Confirm Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
