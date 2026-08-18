"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";

export default function RecommendationsPage() {
  const { selectedAccount, loadingAccounts } = useAdAccount();
  const [recs, setRecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Notification states
  const [notification, setNotification] = useState<{
    type: "success" | "info";
    message: string;
  } | null>(null);

  const loadRecommendations = async () => {
    if (!selectedAccount) return;
    try {
      setLoading(true);
      const res = await api.getRecommendations(selectedAccount.id);
      setRecs(res);
    } catch (err) {
      console.error("Failed to load recommendations:", err);
      setRecs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAccount) {
      loadRecommendations();
    }
  }, [selectedAccount]);

  const handleApply = async (id: string, title: string) => {
    try {
      await api.applyRecommendation(id);
      setNotification({
        type: "success",
        message: `Recommendation "${title}" applied successfully! (Note: Real modifications to your Meta campaigns require full Meta API write review approval).`,
      });
      // Remove from UI list
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
      // Remove from UI list
      setRecs((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to dismiss recommendation:", err);
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

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title text-2xl font-bold text-slate-800">AI Recommendations</h1>
          <p className="page-subtitle text-sm text-subtle mt-1">
            Actionable rule-based campaign adjustments compiled by our analyzer engine
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
          <div>{notification.message}</div>
        </div>
      )}

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
          <span className="ml-2 text-sm text-subtle font-medium">Analyzing synced performance metrics...</span>
        </div>
      ) : !selectedAccount ? (
        <div className="card shadow-sm border border-border bg-white rounded-lg">
          <div className="card-body py-12 text-center text-sm text-subtle font-medium">
            Please link and select a Meta Ad Account in settings to load AI suggestions.
          </div>
        </div>
      ) : recs.length === 0 ? (
        <div className="card shadow-sm border border-border bg-white rounded-lg">
          <div className="card-body py-16">
            <div className="empty-state text-center max-w-sm mx-auto space-y-3">
              <Lightbulb size={48} className="text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No active suggestions</h3>
              <p className="text-xs text-subtle">
                Outstanding! No campaign budget issues, CTR fatigues, or low ROAS targets detected on this pipeline.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Recommendations List Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recs.map((r) => {
            // Icon and styling mapping based on priority & type
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

            if (r.recommendation_type === "UNDERPERFORMING_AD") {
              Icon = AlertTriangle;
              iconClass = "bg-red-50 text-red-600";
            } else if (r.recommendation_type === "UNDERPERFORMING_CREATIVE") {
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
                  {/* Card Header Row */}
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
                    
                    {/* Confidence Score percentage badge */}
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-800">
                        {Math.round(r.confidence_score * 100)}%
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">
                        Confidence
                      </span>
                    </div>
                  </div>

                  {/* Title & Descriptions */}
                  <div className="space-y-2">
                    <h4 className="text-base font-bold text-slate-800">{r.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {r.description}
                    </p>
                  </div>

                  {/* Root Reason Box */}
                  <div className="bg-slate-50 border border-slate-100 rounded-md p-3 text-xs font-semibold text-slate-500">
                    <span className="text-slate-700 font-bold block mb-1">Observation Reason:</span>
                    {r.reason}
                  </div>
                </div>

                {/* Card Action Row */}
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
      )}
    </div>
  );
}
