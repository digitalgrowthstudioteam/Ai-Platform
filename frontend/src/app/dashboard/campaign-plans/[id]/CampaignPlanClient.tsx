"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Sparkles,
  ArrowLeft,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Megaphone,
  Coins,
  Check,
  Zap,
} from "lucide-react";

export default function CampaignPlanClient() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const downloadOnLoad = searchParams.get("download") === "true";

  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const getPlanId = () => {
    if (typeof window !== "undefined") {
      const parts = window.location.pathname.split("/");
      const lastSegment = parts[parts.length - 1];
      if (lastSegment && lastSegment !== "placeholder" && lastSegment !== "campaign-plans" && lastSegment !== "campaign_plans") {
        return lastSegment;
      }
    }
    return (id as string) || "";
  };

  const planId = getPlanId();

  useEffect(() => {
    async function loadPlan() {
      if (!planId) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.getCampaignPlan(planId);
        setPlan(res);
        
        // Auto PDF trigger if parameter specified
        if (downloadOnLoad) {
          const url = `${api.baseUrl}/ads-service/campaign-plans/${planId}/pdf`;
          const link = document.createElement("a");
          link.href = url;
          link.download = `Campaign_Plan_${res.business_name.replace(/\s+/g, "_")}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (e) {
        console.error("Failed to load campaign plan detail:", e);
      } finally {
        setLoading(false);
      }
    }
    loadPlan();
  }, [planId, downloadOnLoad]);

  const handleDownload = () => {
    if (plan) {
      const url = `${api.baseUrl}/ads-service/campaign-plans/${plan.id}/pdf`;
      const link = document.createElement("a");
      link.href = url;
      link.download = `Campaign_Plan_${plan.business_name.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold text-white">Campaign plan not found</h2>
        <Link href="/dashboard/campaign-plans" className="text-blue-500 hover:underline mt-2 inline-block">
          Back to Reports Library
        </Link>
      </div>
    );
  }

  const report = plan.report_data || {};
  const score = plan.readiness_score || 70;
  const breakdown = report.readiness_breakdown || {};

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <Link
            href="/dashboard/campaign-plans"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition mb-2"
          >
            <ArrowLeft size={14} /> Back to Library
          </Link>
          <h1 className="text-3xl font-extrabold text-white">{plan.business_name}</h1>
          <p className="text-slate-400 text-sm mt-1">Personalized Meta Ads Campaign Strategy Report</p>
        </div>

        <button
          onClick={handleDownload}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-sm shadow transition flex items-center justify-center gap-1.5 self-start"
        >
          Download PDF <Download size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Main report body */}
        <div className="md:col-span-2 space-y-8">
          {/* Business Summary */}
          <div className="bg-slate-900/50 border border-slate-850 p-6 rounded-2xl space-y-3">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2">1. Business Summary</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{report.business_summary}</p>
          </div>

          {/* Recommended Objective */}
          <div className="bg-slate-900/50 border border-slate-850 p-6 rounded-2xl space-y-3">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2">2. Recommended Campaign Objective</h3>
            <div className="p-3 bg-blue-600/10 border border-blue-500/20 rounded-xl text-blue-400 text-sm font-bold inline-block">
              {report.recommended_objective}
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">{report.objective_reasoning}</p>
          </div>

          {/* Structure */}
          <div className="bg-slate-900/50 border border-slate-850 p-6 rounded-2xl space-y-3">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2">3. Recommended Campaign Structure</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{report.recommended_structure}</p>
          </div>

          {/* Audience */}
          <div className="bg-slate-900/50 border border-slate-850 p-6 rounded-2xl space-y-3">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2">4. Audience Strategy</h3>
            <div className="space-y-2 text-sm">
              <p className="text-slate-300"><span className="font-bold text-white">Primary:</span> {report.audience_strategy?.primary_audience}</p>
              {report.audience_strategy?.secondary_audience && (
                <p className="text-slate-300"><span className="font-bold text-white">Secondary:</span> {report.audience_strategy?.secondary_audience}</p>
              )}
              <p className="text-slate-300"><span className="font-bold text-white">Details:</span> {report.audience_strategy?.targeting_details}</p>
              <p className="text-slate-400 italic text-xs pt-1">{report.audience_strategy?.reasoning}</p>
            </div>
          </div>

          {/* Budget */}
          <div className="bg-slate-900/50 border border-slate-850 p-6 rounded-2xl space-y-3">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2">5. Budget Strategy</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950 p-3 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase block">Daily</span>
                <span className="font-bold text-white text-sm">{report.budget_strategy?.daily_budget}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase block">Monthly</span>
                <span className="font-bold text-white text-sm">{report.budget_strategy?.monthly_budget}</span>
              </div>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed mt-2">{report.budget_strategy?.allocation}</p>
            <p className="text-slate-400 text-xs mt-1"><span className="font-bold text-slate-300">Scaling:</span> {report.budget_strategy?.scaling}</p>
          </div>

          {/* Creative Strategy */}
          <div className="bg-slate-900/50 border border-slate-850 p-6 rounded-2xl space-y-3">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2">6. Creative Strategy & Copies</h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">{report.creative_strategy}</p>

            <h4 className="text-sm font-bold text-white mb-2">Recommended Ad Concepts:</h4>
            <div className="space-y-2">
              {report.sample_concepts?.map((c: any, i: number) => (
                <div key={i} className="bg-slate-950 p-3.5 rounded-xl border border-slate-900 text-xs">
                  <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-extrabold uppercase text-[9px] mr-2">{c.format}</span>
                  <span className="font-bold text-white">{c.angle}</span>
                  <p className="mt-1.5 text-slate-400">{c.concept}</p>
                </div>
              ))}
            </div>

            <h4 className="text-sm font-bold text-white mt-6 mb-2">Sample Ad Copies:</h4>
            <div className="space-y-4">
              {report.sample_copy?.map((copy: any, idx: number) => (
                <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-900 space-y-2 text-xs">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Headline</span>
                    <p className="font-bold text-white text-sm">{copy.headline}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Primary Text</span>
                    <p className="text-slate-300 leading-relaxed mt-0.5 whitespace-pre-line">{copy.primary_text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tracking */}
          <div className="bg-slate-900/50 border border-slate-850 p-6 rounded-2xl space-y-3">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2">7. Tracking & Technical Requirements</h3>
            <ul className="space-y-2 text-sm">
              {report.tracking_requirements?.map((req: string, idx: number) => (
                <li key={idx} className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" /> {req}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sidebar details */}
        <div className="space-y-8">
          {/* Readiness Score Card */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Readiness Score</h3>
            
            <div className="relative inline-flex items-center justify-center">
              <span className={`text-4xl font-extrabold ${score >= 80 ? "text-emerald-400" : (score >= 60 ? "text-amber-400" : "text-red-400")}`}>
                {score}%
              </span>
            </div>

            <p className="text-xs text-slate-400">Based on your business clarity, budget commitment, and tracking preparation.</p>
            
            <div className="text-left space-y-3 pt-3 border-t border-slate-800/60 text-xs">
              {breakdown.ready && breakdown.ready.length > 0 && (
                <div>
                  <span className="text-emerald-400 font-bold block mb-1">✅ Ready</span>
                  <ul className="space-y-1 text-slate-400">
                    {breakdown.ready.slice(0, 3).map((item: string, i: number) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {breakdown.attention_needed && breakdown.attention_needed.length > 0 && (
                <div>
                  <span className="text-amber-400 font-bold block mb-1">⚠️ Needs Attention</span>
                  <ul className="space-y-1 text-slate-400">
                    {breakdown.attention_needed.slice(0, 3).map((item: string, i: number) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {breakdown.priority_before_launch && breakdown.priority_before_launch.length > 0 && (
                <div>
                  <span className="text-red-400 font-bold block mb-1">🔴 Priority Before Launch</span>
                  <ul className="space-y-1 text-slate-400">
                    {breakdown.priority_before_launch.slice(0, 3).map((item: string, i: number) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* ₹333 Paid Service conversion promo card */}
          <div className="bg-gradient-to-b from-blue-950 to-slate-950 border-2 border-blue-500 p-6 rounded-2xl relative flex flex-col justify-between shadow-2xl space-y-6">
            <div className="absolute top-0 right-6 -translate-y-1/2 px-2.5 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-full uppercase tracking-wider">
              Special Promotion
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Ready to Run Your Campaign?</h3>
              <p className="mt-2 text-xs text-slate-400">We already have your campaign requirements. Let our team set up and manage your Meta Ads directly from your account.</p>
              
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-xs line-through text-slate-500">₹1,499</span>
                <span className="text-3xl font-extrabold text-white">₹333</span>
              </div>
              <span className="text-[10px] text-blue-400 block mt-1">First campaign setup introductory offer</span>
            </div>

            <button
              onClick={() => router.push(`/get-ads?plan_id=${plan.id}`)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-1 shadow-lg shadow-blue-500/20"
            >
              Get Ads at ₹333 <Zap size={14} />
            </button>
            <span className="text-[9px] text-slate-500 text-center block">Requires active DGS Starter Plan subscription.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
