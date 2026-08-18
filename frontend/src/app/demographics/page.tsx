"use client";

import { useEffect, useState } from "react";
import { useAdAccount } from "@/context/AdAccountContext";
import { api } from "@/lib/api";
import { BarChart3, Loader2 } from "lucide-react";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export default function DemographicsPage() {
  const { selectedAccount, loadingAccounts } = useAdAccount();
  const [demographics, setDemographics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDemographics = async () => {
    if (!selectedAccount) return;
    try {
      setLoading(true);
      const res = await api.getDemographics(selectedAccount.id);
      setDemographics(res);
    } catch (err) {
      console.error("Failed to load demographics:", err);
      setDemographics([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAccount) {
      loadDemographics();
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
          <h1 className="page-title text-2xl font-bold text-slate-800">Demographics</h1>
          <p className="page-subtitle text-sm text-subtle mt-1">Understand your delivery audience by age range and gender</p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
          <span className="ml-2 text-sm text-subtle font-medium">Analyzing age/gender metrics...</span>
        </div>
      ) : !selectedAccount ? (
        <div className="card shadow-sm border border-border bg-white rounded-lg">
          <div className="card-body py-12 text-center text-sm text-subtle font-medium">
            Please link and select a Meta Ad Account in settings to load demographics.
          </div>
        </div>
      ) : demographics.length === 0 ? (
        <div className="card shadow-sm border border-border bg-white rounded-lg">
          <div className="card-body py-16">
            <div className="empty-state text-center max-w-sm mx-auto space-y-3">
              <BarChart3 size={48} className="text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No demographic data found</h3>
              <p className="text-xs text-subtle">
                We couldn't retrieve demographic segments for this account. Enqueue a database sync to fetch audience data.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Demographics Table */
        <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left divide-y divide-border">
              <thead className="bg-slate-50/50">
                <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border">
                  <th className="p-4">Age Bracket</th>
                  <th className="p-4">Gender</th>
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
                {demographics.map((demo, idx) => {
                  let genderBadge = "text-slate-600 bg-slate-100 border border-slate-200";
                  if (demo.gender === "female") genderBadge = "text-pink-600 bg-pink-50 border border-pink-100";
                  else if (demo.gender === "male") genderBadge = "text-blue-600 bg-blue-50 border border-blue-100";

                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="p-4 font-bold text-sm text-slate-800">{demo.age}</td>
                      <td className="p-4">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${genderBadge}`}>
                          {demo.gender}
                        </span>
                      </td>
                      <td className="p-4 text-right font-semibold">{formatCurrency(demo.spend)}</td>
                      <td className="p-4 text-right">{formatNumber(demo.impressions)}</td>
                      <td className="p-4 text-right">{formatNumber(demo.clicks)}</td>
                      <td className="p-4 text-right">{formatNumber(demo.purchases)}</td>
                      <td className="p-4 text-right">{formatPercent(demo.ctr)}</td>
                      <td className="p-4 text-right">{formatCurrency(demo.cpc)}</td>
                      <td className="p-4 text-right text-green-600 font-bold text-sm">
                        {demo.roas.toFixed(2)}x
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
