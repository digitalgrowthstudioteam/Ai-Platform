"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { platformApi } from "@/lib/app-platform/api";
import { VendorPolicies } from "@/lib/app-platform/types";
import { usePlatformAuth } from "@/lib/app-platform/auth";
import {
  FileText,
  ShieldCheck,
  Truck,
  RotateCcw,
  Save,
  RotateCcw as ResetIcon,
  Check,
  AlertCircle,
  Eye,
  Edit3,
  ExternalLink,
  Sparkles,
  HelpCircle,
  Info,
} from "lucide-react";

type PolicyTab = "terms" | "privacy" | "shipping" | "refund";

export default function VendorPoliciesPage() {
  const { user } = usePlatformAuth();
  const [policies, setPolicies] = useState<VendorPolicies | null>(null);
  const [activeTab, setActiveTab] = useState<PolicyTab>("terms");
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadPolicies() {
      try {
        const data = await platformApi.getVendorPolicies();
        setPolicies(data);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load policies");
      } finally {
        setLoading(false);
      }
    }
    loadPolicies();
  }, []);

  const handleTextChange = (field: keyof VendorPolicies, val: string) => {
    if (!policies) return;
    setPolicies({
      ...policies,
      [field]: val,
    });
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!policies) return;
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const updated = await platformApi.updateVendorPolicies({
        terms_and_conditions: policies.terms_and_conditions,
        privacy_policy: policies.privacy_policy,
        shipping_policy: policies.shipping_policy,
        refund_policy: policies.refund_policy,
      });
      setPolicies(updated);
      setSuccessMsg("Store policies updated and published successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save policies");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (tab: PolicyTab) => {
    const fieldMap: Record<PolicyTab, string> = {
      terms: "terms_and_conditions",
      privacy: "privacy_policy",
      shipping: "shipping_policy",
      refund: "refund_policy",
    };
    const titleMap: Record<PolicyTab, string> = {
      terms: "Terms & Conditions",
      privacy: "Privacy Policy",
      shipping: "Shipping & Delivery Policy",
      refund: "Return & Refund Policy",
    };

    if (
      !confirm(
        `Are you sure you want to reset your ${titleMap[tab]} back to the auto-generated brand default template? Any custom edits will be replaced.`
      )
    ) {
      return;
    }

    setResetting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const updated = await platformApi.resetVendorPolicies(fieldMap[tab]);
      setPolicies(updated);
      setSuccessMsg(`${titleMap[tab]} reset to brand default template!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reset policy");
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
      </div>
    );
  }

  const tabConfigs = [
    {
      id: "terms" as PolicyTab,
      label: "Terms & Conditions",
      icon: FileText,
      field: "terms_and_conditions" as keyof VendorPolicies,
      isCustom: policies?.is_custom_terms,
      tip: "Required by payment gateways and protects your business regarding product availability, ordering terms, and limitation of liability.",
    },
    {
      id: "privacy" as PolicyTab,
      label: "Privacy Policy",
      icon: ShieldCheck,
      field: "privacy_policy" as keyof VendorPolicies,
      isCustom: policies?.is_custom_privacy,
      tip: "Required by Google Play Store guidelines and payment partners to inform customers how their delivery phone/address is protected.",
    },
    {
      id: "shipping" as PolicyTab,
      label: "Shipping & Delivery",
      icon: Truck,
      field: "shipping_policy" as keyof VendorPolicies,
      isCustom: policies?.is_custom_shipping,
      tip: "Outlines dispatch timeframes (24-48 hrs), transit delivery days, free shipping rules, and tracking notifications via SMS/WhatsApp.",
    },
    {
      id: "refund" as PolicyTab,
      label: "Return & Refund",
      icon: RotateCcw,
      field: "refund_policy" as keyof VendorPolicies,
      isCustom: policies?.is_custom_refund,
      tip: "Essential for buyer trust. Specifies your 7-day return window, damaged package reporting (48 hrs), and payout timelines (5-7 business days).",
    },
  ];

  const currentTabConfig = tabConfigs.find((t) => t.id === activeTab)!;
  const currentContent = (policies?.[currentTabConfig.field] as string) || "";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Brand Legal & Store Policies
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Auto-Setup Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Configure transparent, legally compliant policies for your storefront, mobile app, and Razorpay
            gateway verification. Brand defaults are automatically provided and fully editable anytime.
          </p>
        </div>

        {/* Global Save Action */}
        <div className="flex items-center gap-2.5">
          {policies?.store_slug && (
            <Link
              href={`/app/store/${policies.store_slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span>View Live Storefront</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow-sm disabled:opacity-50 transition-all cursor-pointer"
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{saving ? "Saving..." : "Save All Policies"}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Compliance Notice Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-slate-50 border border-blue-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-slate-900">
              Pre-filled Professional Brand Policies for {policies?.store_name || user?.store_name}
            </p>
            <p className="text-slate-600 text-[11px] mt-0.5">
              These policies are already active and linked in your store footer, checkout page, and Android app.
              You can keep the standard legal template or customize specific clauses to match your boutique operations.
            </p>
          </div>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Tab Headers */}
        <div className="flex items-center overflow-x-auto border-b border-slate-200 bg-slate-50/60 p-1.5 gap-1.5 scrollbar-none">
          {tabConfigs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-white text-blue-600 shadow-xs border border-slate-200/80 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                <span>{tab.label}</span>
                {tab.isCustom ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" title="Customized by vendor" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Standard brand default active" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Action Strip */}
        <div className="px-5 py-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">{currentTabConfig.label}</span>
            {currentTabConfig.isCustom ? (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                Customized Version
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                Brand Default Template Active
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* View/Edit Toggle */}
            <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setPreviewMode(false)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  !previewMode ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Edit3 className="w-3 h-3" />
                Editor
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode(true)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  previewMode ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Eye className="w-3 h-3" />
                Customer View
              </button>
            </div>

            {/* Reset to Default */}
            <button
              type="button"
              onClick={() => handleReset(activeTab)}
              disabled={resetting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 text-[11px] font-semibold hover:text-rose-600 transition-colors cursor-pointer"
              title="Reset this policy back to the auto-generated template"
            >
              <ResetIcon className={`w-3 h-3 ${resetting ? "animate-spin" : ""}`} />
              <span>Reset to Default</span>
            </button>
          </div>
        </div>

        {/* Informational Tip */}
        <div className="px-5 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-start gap-2 text-[11px] text-slate-600">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
          <span>{currentTabConfig.tip}</span>
        </div>

        {/* Content Area */}
        <div className="p-5">
          {!previewMode ? (
            <div className="space-y-2">
              <textarea
                value={currentContent}
                onChange={(e) => handleTextChange(currentTabConfig.field, e.target.value)}
                rows={18}
                className="w-full p-4 rounded-xl border border-slate-200 font-mono text-xs leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/30"
                placeholder={`Enter your custom ${currentTabConfig.label} here. Markdown headings (#, ##), bullets (-), and bold (**) are supported.`}
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Supports standard Markdown formatting (`#`, `**bold**`, `- list items`)</span>
                <span>{currentContent.length} characters</span>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-slate-200 bg-white text-slate-800 max-h-[500px] overflow-y-auto space-y-4 text-xs leading-relaxed">
              <div className="prose prose-slate max-w-none prose-sm whitespace-pre-wrap font-sans">
                {currentContent}
              </div>
            </div>
          )}
        </div>

        {/* Footer Save Action */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Changes take effect immediately on your web store and mobile app upon saving.
          </div>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow-sm disabled:opacity-50 transition-all cursor-pointer"
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{saving ? "Saving Changes..." : "Save Policies"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

