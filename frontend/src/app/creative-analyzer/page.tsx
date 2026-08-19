"use client";

import { useEffect, useState } from "react";
import { useAdAccount } from "@/context/AdAccountContext";
import { api } from "@/lib/api";
import { 
  Palette, 
  Loader2, 
  Sparkles, 
  ArrowRight, 
  Image as ImageIcon,
  Video,
  Layers,
  Activity,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export default function CreativeAnalyzerPage() {
  const { selectedAccount, loadingAccounts } = useAdAccount();
  const [loading, setLoading] = useState(false);
  const [creativePerformance, setCreativePerformance] = useState<any[]>([]);
  const [formatMetrics, setFormatMetrics] = useState<Record<string, any>>({});

  const loadData = async () => {
    if (!selectedAccount) return;
    setLoading(true);
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 29);
      const startStr = start.toISOString().split("T")[0];
      const endStr = end.toISOString().split("T")[0];

      // Load ads which contains creative definitions and metrics
      const ads = await api.getAds(selectedAccount.id, startStr, endStr);
      
      // Group metrics by creative meta_id
      const creativeGroups: Record<string, any> = {};
      const formatGroups: Record<string, any> = {
        IMAGE: { spend: 0, impressions: 0, clicks: 0, purchases: 0, revenue: 0, count: 0 },
        VIDEO: { spend: 0, impressions: 0, clicks: 0, purchases: 0, revenue: 0, count: 0 },
        CAROUSEL: { spend: 0, impressions: 0, clicks: 0, purchases: 0, revenue: 0, count: 0 },
        UNKNOWN: { spend: 0, impressions: 0, clicks: 0, purchases: 0, revenue: 0, count: 0 }
      };

      ads.forEach((ad: any) => {
        const cr = ad.creative;
        if (!cr) return;

        const cId = cr.meta_creative_id || cr.id;
        const cType = (cr.creative_type || "UNKNOWN").toUpperCase();

        // 1. Group by creative
        if (!creativeGroups[cId]) {
          creativeGroups[cId] = {
            creative: cr,
            spend: 0,
            impressions: 0,
            clicks: 0,
            purchases: 0,
            revenue: 0,
            adsCount: 0
          };
        }
        creativeGroups[cId].spend += ad.metrics.spend;
        creativeGroups[cId].impressions += ad.metrics.impressions;
        creativeGroups[cId].clicks += ad.metrics.clicks;
        creativeGroups[cId].purchases += ad.metrics.purchases;
        creativeGroups[cId].revenue += ad.metrics.spend * ad.metrics.roas;
        creativeGroups[cId].adsCount += 1;

        // 2. Group by format type
        const fmt = formatGroups[cType] ? cType : "UNKNOWN";
        formatGroups[fmt].spend += ad.metrics.spend;
        formatGroups[fmt].impressions += ad.metrics.impressions;
        formatGroups[fmt].clicks += ad.metrics.clicks;
        formatGroups[fmt].purchases += ad.metrics.purchases;
        formatGroups[fmt].revenue += ad.metrics.spend * ad.metrics.roas;
        formatGroups[fmt].count += 1;
      });

      // Calculate aggregated metrics
      const creativeList = Object.values(creativeGroups).map((g: any) => {
        const ctr = g.impressions > 0 ? (g.clicks / g.impressions) * 100 : 0;
        const cpc = g.clicks > 0 ? g.spend / g.clicks : 0;
        const roas = g.spend > 0 ? g.revenue / g.spend : 0;
        
        // Calculate fatigue level dynamically based on spend and CTR
        let fatigue = "LOW";
        if (g.spend > 1000 && ctr < 1.0) {
          fatigue = "HIGH";
        } else if (g.spend > 400 && ctr < 1.4) {
          fatigue = "MODERATE";
        }

        return {
          ...g,
          ctr,
          cpc,
          roas,
          fatigue
        };
      });

      setCreativePerformance(creativeList);
      setFormatMetrics(formatGroups);
    } catch (err) {
      console.error("Failed to load creative performance metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedAccount]);

  if (loadingAccounts || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
        <span className="ml-2 text-sm text-subtle font-medium">Analyzing ad visuals and creative fatigue...</span>
      </div>
    );
  }

  if (!selectedAccount) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title text-2xl font-bold text-slate-800">Creative Analyzer</h1>
            <p className="page-subtitle text-sm text-subtle mt-1">Compare creative formats, identify fatigue, and discover winning visuals</p>
          </div>
        </div>
        <div className="card border border-border bg-white shadow-sm rounded-lg mt-6">
          <div className="card-body py-16 text-center max-w-md mx-auto space-y-4">
            <Palette size={48} className="text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No creative data yet</h3>
            <p className="text-xs text-subtle leading-relaxed">
              Connect your Meta Ads account to analyze creative performance across video, image, carousel, and more.
            </p>
            <Link href="/settings/ad-accounts">
              <span className="btn btn-primary inline-flex items-center gap-2 cursor-pointer mt-2">
                Connect Meta Ads <ArrowRight size={14} />
              </span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title text-2xl font-bold text-slate-800">Creative Analyzer</h1>
          <p className="page-subtitle text-sm text-subtle mt-1">Aggregate visual format metrics and monitor ad creative fatigue indicators</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 border border-border px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Connected: {selectedAccount.name}
        </div>
      </div>

      {/* Format Performance Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800">Performance by Creative Format</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { key: "IMAGE", label: "Single Image", icon: ImageIcon, color: "bg-blue-50 text-blue-600" },
            { key: "VIDEO", label: "Single Video", icon: Video, color: "bg-purple-50 text-purple-600" },
            { key: "CAROUSEL", label: "Carousel", icon: Layers, color: "bg-amber-50 text-amber-600" }
          ].map(f => {
            const data = formatMetrics[f.key] || { spend: 0, impressions: 0, clicks: 0, purchases: 0, revenue: 0, count: 0 };
            const ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
            const roas = data.spend > 0 ? data.revenue / data.spend : 0;

            return (
              <div key={f.key} className="card border border-border bg-white shadow-sm rounded-lg p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${f.color}`}>
                      <f.icon size={16} />
                    </div>
                    <span className="text-xs font-bold text-slate-800">{f.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{data.count} ads active</span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-t border-slate-50 pt-2.5">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Spend</div>
                    <div className="text-xs font-black text-slate-700 mt-0.5">{formatCurrency(data.spend)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Avg CTR</div>
                    <div className="text-xs font-black text-slate-700 mt-0.5">{ctr.toFixed(2)}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Avg ROAS</div>
                    <div className="text-xs font-black text-green-600 mt-0.5">{roas.toFixed(2)}x</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Creatives Table Card */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800">Visual Creatives Performance Details</h3>
        
        {creativePerformance.length === 0 ? (
          <div className="card border border-border bg-white shadow-sm p-8 text-center text-xs text-subtle">
            No creative data captured inside campaigns.
          </div>
        ) : (
          <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left divide-y divide-border">
                <thead className="bg-slate-50/50">
                  <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border">
                    <th className="p-4">Creative Preview</th>
                    <th className="p-4">Format</th>
                    <th className="p-4 text-center">Fatigue Indicator</th>
                    <th className="p-4 text-right">Spend</th>
                    <th className="p-4 text-right">CTR</th>
                    <th className="p-4 text-right">Conversions</th>
                    <th className="p-4 text-right">Avg ROAS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium text-slate-700">
                  {creativePerformance.map((item, idx) => {
                    const cr = item.creative;
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="p-4 flex items-center gap-3">
                          {cr.image_url ? (
                            <img
                              src={cr.image_url}
                              alt="Creative visual"
                              className="w-12 h-12 object-cover rounded-md border border-border shrink-0"
                              onError={(e: any) => { e.target.style.display = "none"; }}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-md border border-border flex items-center justify-center shrink-0">
                              <ImageIcon size={18} />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-sm text-slate-800 max-w-sm truncate" title={cr.headline}>
                              {cr.headline || "Untitled Headline"}
                            </div>
                            <div className="text-[10px] text-slate-400 max-w-sm truncate mt-0.5" title={cr.primary_text}>
                              {cr.primary_text || "No copy context"}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 uppercase">
                          <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded">
                            {cr.creative_type || "IMAGE"}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${
                            item.fatigue === "HIGH" 
                              ? "bg-red-50 text-red-600" 
                              : item.fatigue === "MODERATE" 
                              ? "bg-amber-50 text-amber-600" 
                              : "bg-green-50 text-green-600"
                          }`}>
                            {item.fatigue} fatigue
                          </span>
                        </td>
                        <td className="p-4 text-right font-semibold">{formatCurrency(item.spend)}</td>
                        <td className="p-4 text-right">{item.ctr.toFixed(2)}%</td>
                        <td className="p-4 text-right">{formatNumber(item.purchases)}</td>
                        <td className="p-4 text-right text-green-600 font-bold text-sm">
                          {item.roas.toFixed(2)}x
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
    </div>
  );
}
