"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Sparkles,
  Award,
  Zap,
  Sliders,
  AlertTriangle,
  Building,
  CheckCircle,
  HelpCircle,
  MessageCircle,
  Coins,
  Calendar,
  Lock,
  Loader2,
  ArrowRight,
  Clock,
} from "lucide-react";

export default function MyServicesPage() {
  const [loading, setLoading] = useState(true);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [packsData, setPacksData] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Load latest Ads Service Request details
        const latest = await api.getLatestAdsServiceRequest();
        if (latest.request) {
          setActiveRequest(latest.request);
        }

        // Load Ad Packs & remaining credits
        const packs = await api.getUserAdPacks();
        setPacksData(packs);

        // Load subscription details
        const sub = await api.getSubscription();
        setSubscription(sub);
      } catch (err) {
        console.error("Failed to load user services:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amt / 100);
  };

  const getDaysRemaining = (expiryDateStr: string) => {
    try {
      const expiry = new Date(expiryDateStr);
      const now = new Date();
      const diffTime = expiry.getTime() - now.getTime();
      return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    } catch (e) {
      return 0;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  const hasActiveService = activeRequest && activeRequest.status !== "draft" && activeRequest.status !== "cancelled";

  return (
    <div className="space-y-8 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
            🚀 My Services
          </h1>
          <p className="text-xs text-slate-500 font-semibold">Manage your active Meta Ads management services and Ad Quantities.</p>
        </div>
        {hasActiveService ? (
          <Link
            href="/get-ads?new=true"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 rounded-xl transition shadow-md shadow-blue-500/10"
          >
            Purchase More Ads
          </Link>
        ) : (
          <Link
            href="/get-ads"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 rounded-xl transition shadow-md shadow-blue-500/10"
          >
            Get Ads at ₹333
          </Link>
        )}
      </div>

      {/* Grid panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ad Credit Wallet */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card border border-border bg-white shadow-sm rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Coins size={14} className="text-blue-600" /> Ad Quantity Wallet
            </h3>

            {packsData && packsData.total_remaining_credits > 0 ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-5xl font-black text-blue-600">
                    {packsData.total_remaining_credits}
                  </span>
                  <span className="text-xs font-bold text-slate-400 block">Remaining Ads</span>
                </div>

                {packsData.packs.filter((p: any) => p.status === "active").map((p: any, idx: number) => {
                  const daysLeft = getDaysRemaining(p.expires_at);
                  const showWarning = daysLeft <= 7;
                  return (
                    <div key={idx} className={`border rounded-xl p-3 space-y-1 text-xs ${
                      showWarning ? "border-amber-200 bg-amber-50/20" : "border-slate-100 bg-slate-50/50"
                    }`}>
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-slate-700">{p.total} Ads Pack</span>
                        <span className="text-slate-500">{p.remaining} left</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span>Expires: {new Date(p.expires_at).toLocaleDateString()}</span>
                        <span className={`font-bold ${showWarning ? "text-amber-700" : "text-slate-500"}`}>
                          {daysLeft} days left
                        </span>
                      </div>
                      {showWarning && (
                        <div className="text-[9px] font-bold text-amber-700 pt-1 flex items-center gap-1">
                          <AlertTriangle size={10} /> ⚠️ Your Ad Pack expires in {daysLeft} days.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 space-y-2">
                <p className="text-xs font-semibold text-slate-400">No active Ad Quantities.</p>
                <Link href="/get-ads?new=true" className="inline-block text-xs font-bold text-blue-600 hover:text-blue-800 transition">
                  Purchase More Ads →
                </Link>
              </div>
            )}
            
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100 pt-3">
              * Expired ad credits cannot be carried forward or refunded.
            </div>
          </div>
        </div>

        {/* Active Meta Ads Service details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card border border-border bg-white shadow-sm rounded-2xl p-6 space-y-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders size={14} className="text-blue-600" /> Meta Ads Management Service
            </h3>

            {hasActiveService ? (
              <div className="space-y-6 text-xs">
                {/* Status bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Operational Status</span>
                    <span className="inline-flex items-center gap-1.5 font-bold mt-1 text-slate-800 bg-slate-100 px-2.5 py-1 rounded-full uppercase">
                      <Clock size={12} className="text-slate-500" />
                      {activeRequest.status.replace("_", " ")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Partner Access</span>
                    <span className={`inline-flex items-center gap-1.5 font-bold mt-1 px-2.5 py-1 rounded-full uppercase ${
                      activeRequest.partner_access_status === "granted" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                      "bg-amber-50 text-amber-700 border border-amber-100"
                    }`}>
                      <CheckCircle size={12} />
                      {activeRequest.partner_access_status || "not requested"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Starter Plan</span>
                    <span className={`inline-flex items-center gap-1.5 font-bold mt-1 px-2.5 py-1 rounded-full uppercase ${
                      subscription && ["active", "trialing"].includes(subscription.status) ? "bg-blue-50 text-blue-700 border border-blue-100" :
                      "bg-red-50 text-red-700 border border-red-100"
                    }`}>
                      <Lock size={12} />
                      {subscription?.status || "inactive"}
                    </span>
                  </div>
                </div>

                {/* Details layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Business Name</span>
                      <span className="font-semibold text-slate-800 text-sm">{activeRequest.business_name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">WhatsApp Phone</span>
                      <span className="font-semibold text-slate-800">{activeRequest.whatsapp_number}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Campaign Goal</span>
                      <span className="font-semibold text-slate-800">{activeRequest.campaign_objective}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Daily Pacing Budget</span>
                      <span className="font-semibold text-slate-800">{activeRequest.daily_budget}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Connected Ad Account ID</span>
                      <span className="font-semibold text-slate-800">{activeRequest.meta_ad_account_id || "Meta Setup Required"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Creative Service</span>
                      <span className="font-semibold text-slate-800">{activeRequest.creative_required ? "Included (DGS Designed)" : "Customer Provided"}</span>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-4.5 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Service Guidelines</span>
                  <p className="text-slate-500 leading-normal text-[11px] font-semibold">
                    Our team conducts setups and modifications directly inside your connected Meta Ad Account. 
                    Ensure Partner Access remains granted to prevent delivery service interruptions.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 space-y-4">
                <p className="text-xs font-semibold text-slate-400">You do not have an active Meta Ads management service.</p>
                <Link
                  href="/get-ads"
                  className="inline-flex bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3.5 rounded-xl transition shadow-md shadow-blue-500/10 items-center gap-1.5 mx-auto"
                >
                  <span>Set Up My Ads Now</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
