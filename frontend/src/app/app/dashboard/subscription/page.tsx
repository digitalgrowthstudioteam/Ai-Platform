"use client";

import React, { useEffect, useState } from "react";
import { platformApi } from "@/lib/app-platform/api";
import StatusBadge from "@/components/app-platform/shared/StatusBadge";
import {
  Sparkles,
  HardDrive,
  CheckCircle2,
  Calendar,
  Plus,
  Shield,
  CreditCard,
  Zap,
} from "lucide-react";

export default function VendorSubscriptionPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const info = await platformApi.getSubscriptionInfo();
        setData(info);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sub = data?.subscription;
  const plan = sub?.plan;
  const storage = data?.storage;
  const addons = data?.available_addons || [];

  const storageUsedMb = storage ? (storage.total_bytes_used / (1024 * 1024)).toFixed(1) : "0";
  const storageLimitMb = storage ? (storage.limit_bytes / (1024 * 1024)).toFixed(0) : "1024";

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subscription & Add-ons</h1>
        <p className="text-sm text-slate-500">Manage your SaaS platform membership, cloud quota, and optional growth add-ons</p>
      </div>

      {/* Current Plan Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                Active Membership
              </span>
              <StatusBadge status={sub?.status || "active"} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{plan?.name || "Starter Store Plan"}</h2>
            <p className="text-xs text-slate-500 mt-1">Multi-vendor storefront and branded Android mobile app solution</p>
          </div>

          <div className="text-left md:text-right">
            <span className="text-3xl font-extrabold text-slate-900">₹{sub?.monthly_price_inr || 499}</span>
            <span className="text-xs text-slate-500"> / month</span>
            <p className="text-xs text-slate-400 mt-1">Setup fee: ₹{plan?.setup_fee_inr || 2000} (Included)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-xs text-slate-400 block mb-1">Billing Cycle</span>
            <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              Monthly Auto-Renew
            </p>
            {sub?.next_renewal_date && (
              <p className="text-[11px] text-slate-500 mt-1">
                Next renewal: {new Date(sub.next_renewal_date).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-xs text-slate-400 block mb-1">Bunny Storage Usage</span>
            <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-amber-600" />
              {storageUsedMb} MB / {storageLimitMb} MB
            </p>
            <p className="text-[11px] text-slate-500 mt-1">{storage?.product_count || 0} products uploaded</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-xs text-slate-400 block mb-1">Android Application</span>
            <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-600" />
              Production Branded Build
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Supported by Digital Growth Studio</p>
          </div>
        </div>
      </div>

      {/* Add-ons Marketplace */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Available Growth Add-ons</h3>
          <p className="text-xs text-slate-500">Power up your brand with extra storage, payment onboarding, or custom app enhancements</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addons.map((a: any) => (
            <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-900">{a.name}</h4>
                  <span className="text-xs font-bold text-blue-600">
                    ₹{a.price_inr.toLocaleString("en-IN")}
                    <span className="text-[10px] font-normal text-slate-400">
                      {a.billing_type === "MONTHLY" ? "/mo" : " one-time"}
                    </span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{a.description || "Enhance your store capabilities."}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => alert(`Your request for "${a.name}" has been logged! Our team will contact you shortly.`)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Request Add-on
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

