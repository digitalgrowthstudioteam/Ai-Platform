"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Sparkles,
  ArrowRight,
  Download,
  Calendar,
  Layers,
  FileText,
  Loader2,
} from "lucide-react";

export default function MyReportsPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await api.getCampaignPlans();
        setPlans(res || []);
      } catch (e) {
        console.error("Failed to load campaign plans:", e);
      } finally {
        setLoading(false);
      }
    }
    loadPlans();
  }, []);

  const downloadPdf = (id: string, name: string) => {
    // Standard file download trigger via API scheme
    const token = localStorage.getItem("dgs_auth_token") || "";
    const url = `${api.baseUrl}/ads-service/campaign-plans/${id}/pdf`;
    
    // We can open in a new tab or trigger a clean native fetch/blob download
    window.open(url, "_blank");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-white">My Campaign Plans</h1>
          <p className="text-slate-400 text-sm mt-1">Access your generated marketing reports and target strategy blueprints.</p>
        </div>
        <Link
          href="/get-meta-ads/free-plan"
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm shadow transition flex items-center gap-1.5"
        >
          Create New Plan <Sparkles size={14} />
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 border border-slate-850 rounded-2xl">
          <FileText size={48} className="text-slate-600 mx-auto" />
          <h3 className="text-xl font-bold text-white mt-4">No reports found</h3>
          <p className="text-slate-400 text-sm mt-1">Get started by answering a few quick questions to outline your first campaign.</p>
          <Link
            href="/get-meta-ads/free-plan"
            className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition inline-flex items-center gap-1.5"
          >
            Generate Free Plan <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((plan) => {
            const industry = plan.campaign_profile?.industry || "Ecommerce";
            const objective = plan.campaign_profile?.campaign_objective || "Sales";
            const dateStr = new Date(plan.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric"
            });
            const score = plan.readiness_score || 70;

            return (
              <div key={plan.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {industry}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar size={12} /> {dateStr}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white truncate">{plan.business_name}</h3>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-2">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Objective</span>
                      <span className="font-semibold text-slate-200">{objective}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Readiness</span>
                      <span className={`font-bold ${score >= 80 ? "text-emerald-400" : (score >= 60 ? "text-amber-400" : "text-red-400")}`}>{score}/100</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-800/40">
                  <Link
                    href={`/dashboard/campaign-plans/${plan.id}`}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs rounded-lg text-center transition flex items-center justify-center gap-1"
                  >
                    View Report <ArrowRight size={12} />
                  </Link>
                  <button
                    onClick={() => downloadPdf(plan.id, plan.business_name)}
                    className="p-2 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition"
                    title="Download PDF"
                  >
                    <Download size={15} />
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
