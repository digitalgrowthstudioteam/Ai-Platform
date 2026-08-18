"use client";

import { useEffect, useState } from "react";
import { useAdAccount } from "@/context/AdAccountContext";
import { api } from "@/lib/api";
import { Users, Loader2, Search, Info } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export default function AudiencesPage() {
  const { selectedAccount, loadingAccounts } = useAdAccount();
  const [audiences, setAudiences] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadAudiences = async () => {
    if (!selectedAccount) return;
    try {
      setLoading(true);
      const res = await api.getAudiences(selectedAccount.id);
      setAudiences(res);
    } catch (err) {
      console.error("Failed to load audiences:", err);
      setAudiences([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAccount) {
      loadAudiences();
    }
  }, [selectedAccount]);

  const filteredAudiences = audiences.filter((aud) =>
    aud.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (aud.description && aud.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
      <div className="page-header flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="page-title text-2xl font-bold text-slate-800">Audiences</h1>
          <p className="page-subtitle text-sm text-subtle mt-1">Analyze custom, lookalike, and saved audience segments</p>
        </div>

        {/* Search Filter */}
        {selectedAccount && audiences.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search audiences..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs border border-border rounded-md bg-white w-64 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
          <span className="ml-2 text-sm text-subtle font-medium">Loading audience data...</span>
        </div>
      ) : !selectedAccount ? (
        <div className="card shadow-sm border border-border bg-white rounded-lg">
          <div className="card-body py-12 text-center text-sm text-subtle font-medium">
            Please link and select a Meta Ad Account in settings to load audiences.
          </div>
        </div>
      ) : filteredAudiences.length === 0 ? (
        <div className="card shadow-sm border border-border bg-white rounded-lg">
          <div className="card-body py-16">
            <div className="empty-state text-center max-w-sm mx-auto space-y-3">
              <Users size={48} className="text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">
                {searchQuery ? "No matching audiences found" : "No audiences found"}
              </h3>
              <p className="text-xs text-subtle">
                {searchQuery
                  ? "Try adjusting your search criteria."
                  : "We couldn't retrieve custom audience lists for this account. Create custom audiences in Meta Ads Manager to target specific segments."}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Audiences Table */
        <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left divide-y divide-border">
              <thead className="bg-slate-50/50">
                <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border">
                  <th className="p-4">Audience Name & Description</th>
                  <th className="p-4">Source / Type</th>
                  <th className="p-4 text-right">Approximate Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium text-slate-700">
                {filteredAudiences.map((aud, idx) => {
                  let badgeColor = "text-slate-600 bg-slate-100 border-slate-200";
                  if (aud.subtype === "WEBSITE") badgeColor = "text-blue-600 bg-blue-50 border-blue-100";
                  else if (aud.subtype === "LOOKALIKE") badgeColor = "text-purple-600 bg-purple-50 border-purple-100";
                  else if (aud.subtype === "CUSTOM") badgeColor = "text-indigo-600 bg-indigo-50 border-indigo-100";
                  else if (aud.subtype === "ENGAGEMENT") badgeColor = "text-amber-600 bg-amber-50 border-amber-100";

                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="p-4">
                        <div className="font-bold text-sm text-slate-800">{aud.name}</div>
                        {aud.description && (
                          <div className="text-xs text-slate-500 mt-1 flex items-start gap-1">
                            <Info size={12} className="shrink-0 mt-0.5 text-slate-400" />
                            <span>{aud.description}</span>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-1.5 font-bold uppercase tracking-wide">
                          ID: {aud.id}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`text-[9px] font-bold uppercase border px-2 py-0.5 rounded-full ${badgeColor}`}>
                          {aud.subtype.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-slate-800 text-sm">
                        {aud.approximate_count_size !== null && aud.approximate_count_size !== undefined && aud.approximate_count_size > 0 ? (
                          formatNumber(aud.approximate_count_size)
                        ) : (
                          <span className="text-slate-400 font-semibold italic text-xs">Below Match Limit</span>
                        )}
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
