"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  ShoppingBag,
  Loader2,
  ArrowRight,
  CheckCircle,
  Circle,
  ChevronDown,
  ChevronUp,
  Megaphone,
  Target,
  Calendar,
  MessageSquare,
  Palette,
  Globe,
} from "lucide-react";

interface PipelineStep {
  step: string;
  done: boolean;
}

interface Order {
  id: string;
  business_name: string;
  advertised_product: string;
  campaign_objective: string;
  number_of_ads: number;
  daily_budget: string;
  status: string;
  partner_access_status: string;
  additional_services: string[];
  creative_required: boolean;
  whatsapp_number: string;
  created_at: string;
  expires_at: string;
  pipeline: PipelineStep[];
  comment?: string;
  history?: Array<{
    status: string;
    comment: string;
    updated_at: string;
    updated_by: string;
  }>;
}

export default function OrdersPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrders() {
      try {
        setLoading(true);
        const data = await api.getUserOrders();
        setOrders(data.orders || []);
      } catch (err) {
        console.error("Failed to load orders:", err);
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, []);

  const statusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    submitted: "bg-blue-50 text-blue-700",
    eligible: "bg-emerald-50 text-emerald-700",
    restricted: "bg-rose-50 text-rose-700",
    whatsapp_pending: "bg-amber-50 text-amber-700",
    whatsapp_connected: "bg-emerald-50 text-emerald-700",
    campaign_setup: "bg-blue-50 text-blue-700",
    campaign_live: "bg-emerald-50 text-emerald-700",
    completed: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-slate-150 text-slate-500",
    ready_for_setup: "bg-purple-50 text-purple-700",
    ads_initiated: "bg-indigo-50 text-indigo-705",
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
            <ShoppingBag className="text-blue-600" size={28} /> Orders
          </h1>
          <p className="text-xs text-slate-500 font-semibold">Track all your Meta Ads service orders and their progress.</p>
        </div>
        <Link
          href="/get-ads?new=true"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 rounded-xl transition shadow-md shadow-blue-500/10 inline-flex items-center gap-1.5"
        >
          Purchase More Ads <ArrowRight size={14} />
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
          <ShoppingBag className="mx-auto text-slate-300" size={48} />
          <p className="text-sm text-slate-400 font-semibold">You haven't placed any orders yet.</p>
          <Link
            href="/get-ads?new=true"
            className="inline-flex bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3.5 rounded-xl transition shadow-md shadow-blue-500/10 items-center gap-1.5"
          >
            Get Your First Ads <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isExpanded = expandedId === order.id;
            const currentStepIndex = order.pipeline.filter((s) => s.done).length - 1;

            return (
              <div
                key={order.id}
                className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all"
              >
                {/* Order Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                      <Megaphone className="text-blue-600" size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{order.advertised_product}</h3>
                      <p className="text-[11px] text-slate-450 font-medium mt-0.5">
                        {order.business_name} · Expires: {new Date(order.expires_at).toLocaleDateString()} · {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        statusColors[order.status] || "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {order.status.replace(/_/g, " ")}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="text-slate-400" size={18} />
                    ) : (
                      <ChevronDown className="text-slate-400" size={18} />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-5 border-t border-slate-100 pt-5">
                    {/* Pipeline Stepper */}
                    <div className="flex items-center justify-between gap-1">
                      {order.pipeline.map((step, idx) => (
                        <React.Fragment key={idx}>
                          <div className="flex flex-col items-center gap-1.5 flex-1">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                step.done
                                  ? idx === currentStepIndex && order.status !== "completed"
                                    ? "bg-blue-600 text-white ring-4 ring-blue-100"
                                    : "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-300"
                              }`}
                            >
                              {step.done ? <CheckCircle size={16} /> : <Circle size={16} />}
                            </div>
                            <span
                              className={`text-[9px] font-bold text-center leading-tight ${
                                step.done ? "text-slate-700" : "text-slate-350"
                              }`}
                            >
                              {step.step}
                            </span>
                          </div>
                          {idx < order.pipeline.length - 1 && (
                            <div
                              className={`h-0.5 flex-1 rounded-full mt-[-18px] ${
                                order.pipeline[idx + 1].done ? "bg-emerald-200" : "bg-slate-100"
                              }`}
                            />
                          )}
                        </React.Fragment>
                      ))}
                    </div>

                    {/* Order Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1">
                          <Target size={10} /> Objective
                        </span>
                        <span className="font-semibold text-slate-800 block">{order.campaign_objective}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1">
                          <Calendar size={10} /> Daily Budget
                        </span>
                        <span className="font-semibold text-slate-800 block">{order.daily_budget}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1">
                          <MessageSquare size={10} /> WhatsApp
                        </span>
                        <span className="font-semibold text-slate-800 block">{order.whatsapp_number}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1">
                          <Palette size={10} /> Creative
                        </span>
                        <span className="font-semibold text-slate-800 block">
                          {order.creative_required ? "DGS Designed" : "Customer Provided"}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1">
                          <Globe size={10} /> Partner Access
                        </span>
                        <span className={`font-bold block uppercase text-[10px] ${
                          order.partner_access_status === "granted" ? "text-emerald-600" : "text-amber-600"
                        }`}>
                          {order.partner_access_status.replace(/_/g, " ")}
                        </span>
                      </div>
                      {order.additional_services && order.additional_services.length > 0 && (
                        <div className="space-y-1 col-span-2 md:col-span-1">
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Add-on Services</span>
                          <span className="font-semibold text-blue-600 block text-[10px]">
                            {order.additional_services.join(", ")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Latest Comment */}
                    {order.comment && (
                      <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl text-left space-y-1.5 mt-2">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Latest Status Comment</span>
                        <p className="text-slate-700 font-medium italic text-xs">"{order.comment}"</p>
                      </div>
                    )}

                    {/* Timeline/History Log */}
                    {order.history && order.history.length > 0 && (
                      <div className="space-y-3 pt-3 border-t border-slate-100 text-left mt-2">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Order Progress History Log</span>
                        <div className="space-y-3 max-h-44 overflow-y-auto pr-1">
                          {order.history.map((h: any, idx: number) => (
                            <div key={idx} className="flex gap-2.5 items-start text-xs text-slate-500 border-l-2 border-blue-500 pl-3">
                              <div className="space-y-0.5">
                                <div className="flex gap-2 items-center flex-wrap">
                                  <span className="font-extrabold text-[10px] text-blue-600 uppercase">
                                    {h.status.replace(/_/g, " ")}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-bold">
                                    {new Date(h.updated_at).toLocaleString()}
                                  </span>
                                </div>
                                {h.comment && (
                                  <p className="text-slate-700 italic text-[11px]">
                                    "{h.comment}"
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
