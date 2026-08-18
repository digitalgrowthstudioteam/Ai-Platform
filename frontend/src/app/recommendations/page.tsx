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
  LayoutGrid,
  List,
} from "lucide-react";

export default function RecommendationsPage() {
  const { selectedAccount, loadingAccounts } = useAdAccount();
  const [recs, setRecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  
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
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title text-2xl font-bold text-slate-800">AI Recommendations</h1>
          <p className="page-subtitle text-sm text-subtle mt-1">
            Actionable rule-based campaign adjustments compiled by our analyzer engine
          </p>
        </div>

        {/* View Mode Toggle */}
        {selectedAccount && recs.length > 0 && (
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
      ) : viewMode === "card" ? (
        /* Recommendations List Grid (Card View) */
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
      ) : (
        /* Recommendations Scan-friendly List Table View */
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
                {recs.map((r, idx) => {
                  let badgeClass = "bg-slate-100 text-slate-700";
                  if (r.priority === "high") badgeClass = "bg-red-50 text-red-700";
                  else if (r.priority === "medium") badgeClass = "bg-amber-50 text-amber-700";
                  else badgeClass = "bg-blue-50 text-blue-700";

                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="p-4 max-w-lg">
                        <div className="font-bold text-sm text-slate-800">{r.title}</div>
                        <div className="text-xs text-slate-500 mt-1">{r.description}</div>
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
                            title="Apply Action"
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
      )}
    </div>
  );
}
