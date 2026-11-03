"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { platformApi } from "@/lib/app-platform/api";
import { getStoreRouteParams, getStoreHref } from "@/lib/app-platform/store-route-helper";
import StoreHeader from "@/components/app-platform/store/StoreHeader";
import StoreFooter from "@/components/app-platform/store/StoreFooter";
import { PolicyType } from "@/components/app-platform/store/PolicyModal";
import {
  FileText,
  ShieldCheck,
  Truck,
  RotateCcw,
  ArrowLeft,
  Store as StoreIcon,
} from "lucide-react";

export default function StorePolicyClient() {
  const params = useParams();
  const router = useRouter();

  const [slug, setSlug] = useState<string>(() => getStoreRouteParams(params as any).slug);
  const [policyType, setPolicyType] = useState<PolicyType>(() => {
    const rawType = ((params as any)?.type || "terms") as string;
    if (["terms", "privacy", "shipping", "refund"].includes(rawType)) {
      return rawType as PolicyType;
    }
    return "terms";
  });

  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const resolvedSlug = getStoreRouteParams(params as any).slug;
    setSlug(resolvedSlug);

    const rawType = ((params as any)?.type || "terms") as string;
    if (["terms", "privacy", "shipping", "refund"].includes(rawType)) {
      setPolicyType(rawType as PolicyType);
    }

    async function load() {
      try {
        const cfg = await platformApi.getPublicStoreConfig(resolvedSlug);
        setConfig(cfg);
      } catch (err: any) {
        setError(err.message || "Failed to load store policies");
      } finally {
        setLoading(false);
      }
    }
    if (resolvedSlug) {
      load();
    }
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 max-w-md shadow-xs space-y-3">
          <StoreIcon className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Policy Not Available</h2>
          <p className="text-xs text-slate-500">{error || "Could not load store details."}</p>
        </div>
      </div>
    );
  }

  const titles: Record<PolicyType, { title: string; icon: any }> = {
    terms: { title: "Terms & Conditions", icon: FileText },
    privacy: { title: "Privacy Policy", icon: ShieldCheck },
    shipping: { title: "Shipping & Delivery Policy", icon: Truck },
    refund: { title: "Return, Exchange & Refund Policy", icon: RotateCcw },
  };

  const currentMeta = titles[policyType] || titles.terms;
  const Icon = currentMeta.icon;

  const content = (() => {
    switch (policyType) {
      case "terms":
        return config.terms_and_conditions;
      case "privacy":
        return config.privacy_policy;
      case "shipping":
        return config.shipping_policy;
      case "refund":
        return config.refund_policy;
      default:
        return config.terms_and_conditions;
    }
  })();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <StoreHeader slug={slug} config={config} />

      <main className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        {/* Back Link */}
        <div>
          <Link
            href={getStoreHref(slug, "/")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Storefront</span>
          </Link>
        </div>

        {/* Policy Switcher Bar */}
        <div className="flex items-center overflow-x-auto gap-2 pb-1 scrollbar-none">
          {(["terms", "privacy", "shipping", "refund"] as PolicyType[]).map((t) => {
            const isCurrent = policyType === t;
            return (
              <Link
                key={t}
                href={getStoreHref(slug, `/policies/${t}`)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isCurrent
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {titles[t].title}
              </Link>
            );
          })}
        </div>

        {/* Main Document Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/60 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {currentMeta.title}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Official policy for {config.store_name}
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-10 whitespace-pre-wrap text-slate-700 text-xs sm:text-sm leading-relaxed font-sans">
            {content || "No policy content available."}
          </div>
        </div>
      </main>

      <StoreFooter slug={slug} config={config} />
    </div>
  );
}

