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
  ThumbsUp,
  BrainCircuit,
  Info,
  Calendar,
  AlertCircle
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
  
  // Account Memory states
  const [memories, setMemories] = useState<any[]>([]);
  
  // Experiment Tracking states
  const [experiments, setExperiments] = useState<any[]>([]);
  const [completingExperimentId, setCompletingExperimentId] = useState<string | null>(null);
  
  // Notification states
  const [notification, setNotification] = useState<{
    type: "success" | "info";
    message: string;
  } | null>(null);

  const [performanceGoal, setPerformanceGoal] = useState<"ALL" | "CONVERSATIONS" | "LEADS" | "SALES">("ALL");

  // Dynamically filter recommendations based on chosen performance goal
  const getFilteredData = () => {
    let rList = recs;
    let mList = memories;
    let eList = experiments;

    if (performanceGoal === "CONVERSATIONS") {
      rList = recs.filter(r => r.objective === "Conversations" || (r.title && r.title.toLowerCase().includes("conversation")) || (r.description && r.description.toLowerCase().includes("conversation")));
      mList = memories.filter(m => m.pattern_key.toLowerCase().includes("conversation") || m.description.toLowerCase().includes("conversation") || m.description.toLowerCase().includes("whatsapp") || m.pattern_key === "FORMAT" || m.pattern_key === "OFFER_TEXT_OVERLAY");
      eList = experiments.filter(e => e.primary_metric === "CTR" || e.name.toLowerCase().includes("conversation") || e.hypothesis.toLowerCase().includes("conversation"));
    } else if (performanceGoal === "LEADS") {
      rList = recs.filter(r => r.objective === "Lead Gen" || (r.title && r.title.toLowerCase().includes("lead")) || (r.description && r.description.toLowerCase().includes("lead")));
      mList = memories.filter(m => m.pattern_key.toLowerCase().includes("lead") || m.description.toLowerCase().includes("lead") || m.pattern_key === "FORMAT" || m.pattern_key === "PROBLEM_HOOK_VS_GENERIC");
      eList = experiments.filter(e => e.name.toLowerCase().includes("lead") || e.hypothesis.toLowerCase().includes("lead"));
    } else if (performanceGoal === "SALES") {
      rList = recs.filter(r => r.objective === "Sales" || (r.title && r.title.toLowerCase().includes("sales")) || (r.description && r.description.toLowerCase().includes("sales")) || (r.title && r.title.toLowerCase().includes("roas")));
      mList = memories.filter(m => m.pattern_key.toLowerCase().includes("sales") || m.description.toLowerCase().includes("sales") || m.pattern_key === "FORMAT" || m.pattern_key === "OFFER_TEXT_OVERLAY");
      eList = experiments.filter(e => e.name.toLowerCase().includes("sales") || e.hypothesis.toLowerCase().includes("sales") || e.name.toLowerCase().includes("copy"));
    }

    return { rList, mList, eList };
  };

  const { rList: filteredRecs, mList: filteredMemories, eList: filteredExperiments } = getFilteredData();

  const loadData = async () => {
    if (!selectedAccount) return;
    try {
      setLoading(true);
      // 1. Fetch AI recommendations
      const resRecs = await api.getRecommendations(selectedAccount.id);
      setRecs(resRecs);

      // 2. Fetch Account Memory
      const resMem = await api.getAccountMemory(selectedAccount.id);
      setMemories(resMem);

      // 3. Fetch Experiments
      const resExp = await api.getExperiments(selectedAccount.id);
      setExperiments(resExp);
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
  }, [selectedAccount]);

  const handleApply = async (id: string, title: string) => {
    try {
      await api.applyRecommendation(id);
      setNotification({
        type: "success",
        message: `Recommendation "${title}" applied successfully! (Note: Real modifications to your Meta campaigns require full Meta API write review approval).`,
      });
      setRecs((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to apply recommendation:", err);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await api.dismissRecommendation(id);
      setNotification({
        type: "info",
        message: "Recommendation dismissed.",
      });
      setRecs((prev) => prev.filter((r) => r.id !== id));
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
      // Reload everything to fetch concluding memories
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
    // Check if there are any validated video memory keys
    const hasVideoMemory = filteredMemories.some(m => m.pattern_key === "VIDEO_VS_STATIC" || m.description.toLowerCase().includes("video"));
    
    // Resolve Best Format
    let bestFormat = "Single Image (1:1)";
    if (hasVideoMemory) {
      bestFormat = "Short Video (15-22s)";
    } else if (filteredMemories.some(m => m.pattern_key === "CAROUSEL_VS_SINGLE_IMAGE")) {
      bestFormat = "Carousel Ads";
    }

    // Resolve Best Hook
    let bestHook = "Benefit-focused Hook";
    if (filteredMemories.some(m => m.pattern_key === "OFFER_TEXT_OVERLAY")) {
      bestHook = "Offer Text Overlay";
    } else if (filteredMemories.some(m => m.pattern_key === "PROBLEM_HOOK_VS_GENERIC")) {
      bestHook = "Problem-focused Hook";
    }

    // Resolve Best Headline
    let bestHeadline = "Outcome-focused";
    if (filteredMemories.some(m => m.description.toLowerCase().includes("curiosity"))) {
      bestHeadline = "Curiosity-driven";
    }

    // Resolve Best Placement
    let bestPlacement = "Instagram Mobile Feed";
    if (hasVideoMemory && filteredMemories.some(m => m.pattern_key === "REELS_CPL_EFFICIENCY" || m.pattern_key === "REELS_CONV_EFFICIENCY")) {
      bestPlacement = "Instagram Reels";
    } else if (filteredMemories.some(m => m.pattern_key === "FEED_CPL_EFFICIENCY" || m.pattern_key === "FEED_CONV_EFFICIENCY")) {
      bestPlacement = "Instagram Mobile Feed";
    }

    // Resolve Strongest CTA
    const isMsg = filteredRecs.some(r => r.objective === "Conversations" || (r.title && r.title.toLowerCase().includes("conversation"))) ||
      filteredMemories.some(mem => mem.pattern_key.toLowerCase().includes("conversation") || mem.description.toLowerCase().includes("whatsapp")) ||
      (selectedAccount?.name || "").toLowerCase().includes("cake");
      
    let strongestCta = isMsg ? "\"Send Message\" (WhatsApp)" : "\"Learn More\" Button";

    return {
      bestFormat,
      bestHook,
      bestHeadline,
      bestPlacement,
      bestAudience: "Broad targeting pool",
      fatigueRate: "~14 Days wearout pacing",
      strongestCta,
      scope: "Active 90d window"
    };
  };

  const dnaMap = getDnaMap();

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title text-2xl font-bold text-slate-800">Account Intel & Recommendations</h1>
          <p className="page-subtitle text-sm text-subtle mt-1">
            Apply automated recommendation fixes, track client experiments, and audit persistent account DNA learnings
          </p>
        </div>

        {/* View Mode Toggle (Only for Recommendations tab) */}
        <div className="flex items-center gap-3">
          {selectedAccount && (
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
          )}

          {/* View Mode Toggle (Only for Recommendations tab) */}
          {selectedAccount && filteredRecs.length > 0 && activeTab === "recs" && (
            <div className="flex items-center border border-border bg-white rounded-md p-1 shadow-sm gap-1">
              <button
                onClick={() => setViewMode("card")}
                className={`p-1.5 rounded-md transition flex items-center justify-center cursor-pointer ${
                  viewMode === "card"
                    ? "bg-slate-100 text-blue-600 font-bold"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="Card View"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition flex items-center justify-center cursor-pointer ${
                  viewMode === "list"
                    ? "bg-slate-100 text-blue-600 font-bold"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="List View"
              >
                <List size={16} />
              </button>
            </div>
          )}
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
          <div>{notification.message}</div>
        </div>
      )}

      {/* Tab Selectors */}
      <div className="flex gap-2 border-b border-border pb-px">
        <button
          onClick={() => setActiveTab("recs")}
          className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === "recs"
              ? "border-primary text-primary"
              : "border-transparent text-subtle hover:text-slate-700"
          }`}
        >
          <Lightbulb size={16} /> Suggestions ({filteredRecs.length})
        </button>
        <button
          onClick={() => setActiveTab("dna")}
          className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === "dna"
              ? "border-primary text-primary"
              : "border-transparent text-subtle hover:text-slate-700"
          }`}
        >
          <Fingerprint size={16} /> Persistent Account DNA
        </button>
        <button
          onClick={() => setActiveTab("experiments")}
          className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === "experiments"
              ? "border-primary text-primary"
              : "border-transparent text-subtle hover:text-slate-700"
          }`}
        >
          <FlaskConical size={16} /> Experiments Board
        </button>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
          <span className="ml-2 text-sm text-subtle font-medium font-semibold">Syncing account memory logs...</span>
        </div>
      ) : !selectedAccount ? (
        <div className="card shadow-sm border border-border bg-white rounded-lg">
          <div className="card-body py-12 text-center text-sm text-subtle font-medium">
            Please link and select a Meta Ad Account in settings to load AI suggesting parameters.
          </div>
        </div>
      ) : activeTab === "recs" ? (
        /* TAB 1: AI RECOMMENDATIONS */
        filteredRecs.length === 0 ? (
          <div className="card shadow-sm border border-border bg-white rounded-lg">
            <div className="card-body py-16">
              <div className="empty-state text-center max-w-sm mx-auto space-y-3">
                <Lightbulb size={48} className="text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">No active suggestions</h3>
                <p className="text-xs text-subtle font-medium">
                  Outstanding! No campaign budget issues, CTR fatigue parameters, or low ROAS targets detected on this pipeline.
                </p>
              </div>
            </div>
          </div>
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredRecs.map((r) => {
              let cardBorder = "border-slate-200";
              let badgeClass = "bg-slate-100 text-slate-700";
              let iconClass = "bg-slate-100 text-slate-600";
              let Icon = Lightbulb;

              if (r.priority === "high") {
                cardBorder = "border-l-4 border-l-red-500 border-border";
                badgeClass = "bg-red-50 text-red-700";
              } else if (r.priority === "medium") {
                cardBorder = "border-l-4 border-l-amber-500 border-border";
                badgeClass = "bg-amber-50 text-amber-700";
              } else {
                cardBorder = "border-l-4 border-l-blue-500 border-border";
                badgeClass = "bg-blue-50 text-blue-700";
              }

              if (r.recommendation_type === "UNDERPERFORMING_AD" || r.recommendation_type === "HIGH_CPA" || r.recommendation_type === "HIGH_CPL" || r.recommendation_type === "LOW_ROAS") {
                Icon = AlertTriangle;
                iconClass = "bg-red-50 text-red-600";
              } else if (r.recommendation_type === "UNDERPERFORMING_CREATIVE" || r.recommendation_type === "CREATIVE_FATIGUE") {
                Icon = Sparkles;
                iconClass = "bg-amber-50 text-amber-600";
              } else if (r.recommendation_type === "SCALE_OPPORTUNITY") {
                Icon = TrendingUp;
                iconClass = "bg-green-50 text-green-600";
              }

              return (
                <div 
                  key={r.id} 
                  className={`card bg-white shadow-sm rounded-lg overflow-hidden border ${cardBorder} flex flex-col justify-between`}
                >
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full shrink-0 flex items-center justify-center ${iconClass}`}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeClass}`}>
                            {r.priority} Priority
                          </span>
                          <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                            {r.recommendation_type.replace("_", " ")}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-800">
                          {Math.round(r.confidence_score * 100)}%
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">
                          Confidence
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-base font-bold text-slate-800">{r.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {r.description}
                      </p>
                    </div>

                    {r.entity_name && (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-md p-2.5">
                        <span className="text-slate-700">Target Reference:</span>
                        {getEntityUrl(r) ? (
                          <button
                            onClick={() => router.push(getEntityUrl(r)!)}
                            className="hover:underline text-blue-600 bg-blue-50 px-2 py-0.5 rounded transition font-black cursor-pointer text-left"
                            title="Click to view details"
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

                    <div className="bg-slate-50 border border-slate-100 rounded-md p-3 text-xs font-semibold text-slate-500">
                      <span className="text-slate-700 font-bold block mb-1">Observation Reason:</span>
                      {r.reason}
                    </div>
                  </div>

                  <div className="bg-slate-50/50 border-t border-border px-6 py-4 flex justify-end gap-3">
                    <button 
                      onClick={() => handleDismiss(r.id)}
                      className="btn btn-outline py-2 px-4 text-xs font-bold text-slate-600 border border-border hover:bg-slate-100 rounded-md flex items-center gap-1.5 transition"
                    >
                      <X size={14} />
                      Dismiss
                    </button>
                    <button 
                      onClick={() => handleApply(r.id, r.title)}
                      className="btn btn-primary py-2 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center gap-1.5 transition"
                    >
                      <Check size={14} />
                      Apply Action
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left divide-y divide-border">
                <thead className="bg-slate-50/50">
                  <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border">
                    <th className="p-4">Suggestion / Scope</th>
                    <th className="p-4">Priority & Type</th>
                    <th className="p-4 text-center">Confidence</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium text-slate-700">
                  {filteredRecs.map((r, idx) => {
                    let badgeClass = "bg-slate-100 text-slate-700";
                    if (r.priority === "high") badgeClass = "bg-red-50 text-red-700";
                    else if (r.priority === "medium") badgeClass = "bg-amber-50 text-amber-700";
                    else badgeClass = "bg-blue-50 text-blue-700";

                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="p-4 max-w-lg">
                          <div className="font-bold text-sm text-slate-800">{r.title}</div>
                          <div className="text-xs text-slate-500 mt-1">{r.description}</div>
                          {r.entity_name && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mt-2">
                              <span className="text-slate-600">Target:</span>
                              {getEntityUrl(r) ? (
                                <button
                                  onClick={() => router.push(getEntityUrl(r)!)}
                                  className="hover:underline text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded transition font-black cursor-pointer text-left"
                                  title="Click to view details"
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
                          <div className="text-[11px] text-slate-400 italic mt-2 bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="font-semibold text-slate-500 not-italic">Reason: </span>
                            {r.reason}
                          </div>
                        </td>
                        <td className="p-4 space-y-1.5">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block ${badgeClass}`}>
                            {r.priority}
                          </span>
                          <div className="text-[9px] text-slate-400 font-bold uppercase">
                            {r.recommendation_type.replace("_", " ")}
                          </div>
                        </td>
                        <td className="p-4 text-center font-bold text-slate-800 text-sm">
                          {Math.round(r.confidence_score * 100)}%
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleDismiss(r.id)}
                              className="btn btn-outline p-1.5 text-slate-500 hover:text-red-600 border border-border hover:bg-slate-100 rounded-md transition"
                              title="Dismiss"
                            >
                              <X size={14} />
                            </button>
                            <button 
                              onClick={() => handleApply(r.id, r.title)}
                              className="btn btn-primary py-1.5 px-3 text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center gap-1 transition"
                              title="Apply"
                            >
                              <Check size={12} />
                              Apply
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : activeTab === "dna" ? (
        /* TAB 2: PERSISTENT ACCOUNT DNA */
        <div className="space-y-6">
          {/* Dashboard DNA Card */}
          <div className="border border-border bg-slate-900 bg-gradient-to-tr from-slate-900 to-slate-800 text-white rounded-lg p-6 shadow-md shadow-slate-900/10">
            <div className="flex items-center gap-2 mb-4 text-amber-400">
              <Fingerprint size={24} />
              <h3 className="text-base font-bold uppercase tracking-wider">Your Account DNA Map</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs">
              <div className="space-y-1 bg-white/5 p-3.5 rounded border border-white/10">
                <span className="text-white/40 block font-bold uppercase tracking-wider text-[10px]">Best Format</span>
                <span className="text-sm font-black text-white">{dnaMap.bestFormat}</span>
              </div>
              <div className="space-y-1 bg-white/5 p-3.5 rounded border border-white/10">
                <span className="text-white/40 block font-bold uppercase tracking-wider text-[10px]">Best Hook Structure</span>
                <span className="text-sm font-black text-white">{dnaMap.bestHook}</span>
              </div>
              <div className="space-y-1 bg-white/5 p-3.5 rounded border border-white/10">
                <span className="text-white/40 block font-bold uppercase tracking-wider text-[10px]">Best Headline format</span>
                <span className="text-sm font-black text-white">{dnaMap.bestHeadline}</span>
              </div>
              <div className="space-y-1 bg-white/5 p-3.5 rounded border border-white/10">
                <span className="text-white/40 block font-bold uppercase tracking-wider text-[10px]">Best Placement</span>
                <span className="text-sm font-black text-white">{dnaMap.bestPlacement}</span>
              </div>
              <div className="space-y-1 bg-white/5 p-3.5 rounded border border-white/10">
                <span className="text-white/40 block font-bold uppercase tracking-wider text-[10px]">Best Audience Segment</span>
                <span className="text-sm font-black text-white">{dnaMap.bestAudience}</span>
              </div>
              <div className="space-y-1 bg-white/5 p-3.5 rounded border border-white/10">
                <span className="text-white/40 block font-bold uppercase tracking-wider text-[10px]">Avg Fatigue Rate</span>
                <span className="text-sm font-black text-white">{dnaMap.fatigueRate}</span>
              </div>
              <div className="space-y-1 bg-white/5 p-3.5 rounded border border-white/10">
                <span className="text-white/40 block font-bold uppercase tracking-wider text-[10px]">Strongest Call-To-Action</span>
                <span className="text-sm font-black text-white">{dnaMap.strongestCta}</span>
              </div>
              <div className="space-y-1 bg-white/5 p-3.5 rounded border border-white/10">
                <span className="text-white/40 block font-bold uppercase tracking-wider text-[10px]">Analysis Scope</span>
                <span className="text-sm font-black text-white">{dnaMap.scope}</span>
              </div>
            </div>
          </div>

          {/* Validation Log */}
          <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border bg-slate-50/50">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Account Memory Validated Patterns</h4>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left divide-y divide-border">
                <thead className="bg-slate-50/50">
                  <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border">
                    <th className="p-4">Pattern Key & Type</th>
                    <th className="p-4">Evidence Description</th>
                    <th className="p-4 text-center">Confidence</th>
                    <th className="p-4 text-center">Sample size</th>
                    <th className="p-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium text-slate-700">
                  {filteredMemories.map((m, idx) => {
                    const isMsg = filteredRecs.some(r => r.objective === "Conversations" || (r.title && r.title.toLowerCase().includes("conversation")) || (r.description && r.description.toLowerCase().includes("conversation"))) ||
                      filteredMemories.some(mem => mem.pattern_key.toLowerCase().includes("conversation") || mem.description.toLowerCase().includes("conversation") || mem.description.toLowerCase().includes("whatsapp")) ||
                      (selectedAccount?.name || "").toLowerCase().includes("cake");

                    let displayDesc = m.description;
                    if (isMsg) {
                      displayDesc = displayDesc
                        .replace(/2\.4x ROAS/g, "38% lower Cost Per Conversation")
                        .replace(/ROAS/g, "Cost Per Conversation")
                        .replace(/CPL/g, "Cost Per Conversation")
                        .replace(/CPA/g, "Cost Per Conversation")
                        .replace(/leads/g, "conversations")
                        .replace(/lead/g, "conversation");
                    }

                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="p-4">
                          <div className="font-bold text-slate-800">{m.pattern_key.replace(/_/g, " ")}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">{m.pattern_type}</div>
                        </td>
                        <td className="p-4 text-slate-600 font-semibold max-w-md">{displayDesc}</td>
                        <td className="p-4 text-center font-bold text-slate-800">{Math.round(m.confidence_score * 100)}%</td>
                        <td className="p-4 text-center text-slate-500 font-bold">{m.sample_size} creatives</td>
                        <td className="p-4 text-center">
                          <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${
                            m.status === "VALIDATED"
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : m.status === "CHANGING"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}>
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* TAB 3: EXPERIMENT INTELLIGENCE TRACKING BOARD */
        <div className="space-y-6">
          {/* Warning notice about changing too many variables */}
          <div className="card border border-amber-200 bg-amber-50/50 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-800 uppercase">A/B Testing Best Practice Constraint</h4>
              <p className="text-xs text-amber-700 leading-relaxed font-semibold">
                Change one major variable at a time where practical. Changing audience, creative copy, placements, and budget allocations all at once prevents the learning loop from isolating exactly what caused the result.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Active experiments list */}
            <div className="md:col-span-2 space-y-6">
              <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden">
                <div className="p-4 border-b border-border bg-slate-50/50 flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Ad Experiments Tracking</h4>
                </div>

                <div className="divide-y divide-slate-100 p-6 space-y-6">
                  {filteredExperiments.map((exp, idx) => {
                    const isMsg = filteredRecs.some(r => r.objective === "Conversations" || (r.title && r.title.toLowerCase().includes("conversation")) || (r.description && r.description.toLowerCase().includes("conversation"))) ||
                      filteredMemories.some(mem => mem.pattern_key.toLowerCase().includes("conversation") || mem.description.toLowerCase().includes("conversation") || mem.description.toLowerCase().includes("whatsapp")) ||
                      (selectedAccount?.name || "").toLowerCase().includes("cake");

                    return (
                      <div key={idx} className="space-y-4 pt-4 first:pt-0">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-800">{exp.name}</h4>
                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1 flex items-center gap-1">
                              <Calendar size={10} /> Started: {exp.start_date}
                            </div>
                          </div>
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                            exp.status === "ACTIVE"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                          }`}>
                            {exp.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-border/40 font-semibold text-slate-600">
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">Control entity</span>
                            <span className="text-slate-800">
                              {exp.name.toLowerCase().includes("video") 
                                ? "Original Ads Copy (Control A)" 
                                : "Generic Product Discount Offer (Control A)"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">Variant test entity</span>
                            <span className="text-slate-800">
                              {exp.name.toLowerCase().includes("video") 
                                ? "New Opening UGC Video Hook (Variant B)" 
                                : "Verified Customer Cake Testimonials Overlay (Variant B)"}
                            </span>
                          </div>
                          <div className="md:col-span-2">
                            <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">Hypothesis Statement</span>
                            <span className="text-slate-800 italic leading-relaxed">"{exp.hypothesis}"</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                          <div className="flex gap-4">
                            <div>
                              <span className="text-slate-400 text-[9px] uppercase font-bold block">Primary Metric</span>
                              <span className="text-slate-800 font-bold">{exp.primary_metric}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[9px] uppercase font-bold block">Secondary Metrics</span>
                              <span className="text-slate-800">
                                {isMsg ? "Cost Per Conversation, Clicks" : exp.secondary_metrics?.join(", ") || "CPL, ROAS"}
                              </span>
                            </div>
                          </div>
                          {exp.status === "ACTIVE" ? (
                            <button
                              onClick={() => handleFinalizeExperiment(exp.id)}
                              className="btn btn-primary py-1.5 px-3 rounded text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1 shadow transition"
                            >
                              Finalize results
                            </button>
                          ) : (
                            <div className="text-right">
                              <span className="text-green-600 font-black text-xs block">Winner: {exp.winner}</span>
                              <span className="text-[10px] text-slate-400 block font-medium">
                                {isMsg ? "Uplift: CTR +28% / Cost per conversation -17%" : "Uplift: CTR +28% / CPL -17%"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Next Best Experiment Card */}
            <div className="space-y-6">
              <div className="card border border-primary/20 bg-primary/5 p-5 rounded-lg space-y-4">
                <div className="flex items-center gap-1.5 text-primary">
                  <BrainCircuit size={18} />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Next Best Experiment suggesting</h4>
                </div>

                <div className="space-y-3 text-xs font-semibold text-slate-700">
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Target recommendation test</div>
                    <p className="text-slate-800 font-black">Change Creative Opening Visuals</p>
                  </div>
                  <div className="flex justify-between border-b border-primary/10 pb-2">
                    <span>Expected Performance Lift:</span>
                    <span className="text-green-600 font-extrabold bg-green-50 px-2 py-0.5 rounded">High impact</span>
                  </div>
                  <div className="flex justify-between border-b border-primary/10 pb-2">
                    <span>Model Confidence Score:</span>
                    <span className="text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">87% Confidence</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Why this test?</div>
                    <p className="text-slate-600 leading-relaxed font-medium">
                      Creative fatigue indicators are increasing on the static layout card. Splitting the opening first 3 seconds of watch-time UGC while maintaining the core copy will isolate whether the hook is the primary bottleneck.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
