"use client";

import { useEffect, useState } from "react";
import { useAdAccount } from "@/context/AdAccountContext";
import { api } from "@/lib/api";
import { MapPin, Loader2, Info } from "lucide-react";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export default function PlacementsPage() {
  const { selectedAccount, loadingAccounts } = useAdAccount();
  const [placements, setPlacements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPlacements = async () => {
    if (!selectedAccount) return;
    try {
      setLoading(true);
      const res = await api.getPlacements(selectedAccount.id);
      setPlacements(res);
    } catch (err) {
      console.error("Failed to load placements:", err);
      setPlacements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAccount) {
      loadPlacements();
    }
  }, [selectedAccount]);

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
          <h1 className="page-title text-2xl font-bold text-slate-800">Placements</h1>
          <p className="page-subtitle text-sm text-subtle mt-1">Compare performance across Facebook, Instagram, Audience Network, and Messenger</p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
          <span className="ml-2 text-sm text-subtle font-medium">Analyzing placement breakdowns...</span>
        </div>
      ) : !selectedAccount ? (
        <div className="card shadow-sm border border-border bg-white rounded-lg">
          <div className="card-body py-12 text-center text-sm text-subtle font-medium">
            Please link and select a Meta Ad Account in settings to load placements.
          </div>
        </div>
      ) : placements.length === 0 ? (
        <div className="card shadow-sm border border-border bg-white rounded-lg">
          <div className="card-body py-16">
            <div className="empty-state text-center max-w-sm mx-auto space-y-3">
              <MapPin size={48} className="text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No placement data found</h3>
              <p className="text-xs text-subtle">
                We couldn't retrieve placement delivery insights for this account. Make sure you have enqueued a database sync.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Placements Table */
        <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left divide-y divide-border">
              <thead className="bg-slate-50/50">
                <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border">
                  <th className="p-4">Publisher Platform</th>
                  <th className="p-4 text-right">Spend</th>
                  <th className="p-4 text-right">Impressions</th>
                  <th className="p-4 text-right">Clicks</th>
                  <th className="p-4 text-right">Conversions</th>
                  <th className="p-4 text-right">CTR</th>
                  <th className="p-4 text-right">CPC</th>
                  <th className="p-4 text-right">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium text-slate-700">
                {placements.map((p, idx) => {
                  let logoColor = "bg-slate-100 text-slate-600";
                  if (p.publisher_platform === "facebook") logoColor = "bg-blue-50 text-blue-600 border border-blue-100";
                  else if (p.publisher_platform === "instagram") logoColor = "bg-pink-50 text-pink-600 border border-pink-100";
                  else if (p.publisher_platform === "audience_network") logoColor = "bg-purple-50 text-purple-600 border border-purple-100";
                  else if (p.publisher_platform === "messenger") logoColor = "bg-teal-50 text-teal-600 border border-teal-100";

                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${logoColor}`}>
                            {p.publisher_platform.substring(0, 2)}
                          </span>
                          <div>
                            <div className="font-bold text-sm text-slate-800 capitalize">
                              {p.publisher_platform.replace(/_/g, " ")}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Meta publisher breakdown channel
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right font-semibold">{formatCurrency(p.spend)}</td>
                      <td className="p-4 text-right">{formatNumber(p.impressions)}</td>
                      <td className="p-4 text-right">{formatNumber(p.clicks)}</td>
                      <td className="p-4 text-right">{formatNumber(p.purchases)}</td>
                      <td className="p-4 text-right">{formatPercent(p.ctr)}</td>
                      <td className="p-4 text-right">{formatCurrency(p.cpc)}</td>
                      <td className="p-4 text-right text-green-600 font-bold text-sm">
                        {p.roas.toFixed(2)}x
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
