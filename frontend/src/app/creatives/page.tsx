"use client";

import { useEffect, useState } from "react";
import { useAdAccount } from "@/context/AdAccountContext";
import { api } from "@/lib/api";
import { Image as ImageIcon, Loader2, Link as LinkIcon, Megaphone } from "lucide-react";

export default function CreativesPage() {
  const { selectedAccount, loadingAccounts } = useAdAccount();
  const [creatives, setCreatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCreatives = async () => {
    if (!selectedAccount) return;
    const cacheKey = `dgs_cached_creatives_${selectedAccount.id}`;

    // Load cached creatives instantly to make transitions feel instant
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setCreatives(JSON.parse(cached));
      } catch (e) {}
    }

    try {
      setLoading(!cached); // Show loader only if no cache is available
      const res = await api.getCreatives(selectedAccount.id);
      setCreatives(res);
      sessionStorage.setItem(cacheKey, JSON.stringify(res));
    } catch (err) {
      console.error("Failed to load creatives list:", err);
      if (!cached) setCreatives([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAccount) {
      loadCreatives();
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
          <h1 className="page-title text-2xl font-bold text-slate-800">Creatives</h1>
          <p className="page-subtitle text-sm text-subtle mt-1">Compare creative performance and variation structures</p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
          <span className="ml-2 text-sm text-subtle font-medium">Aggregating creative variations...</span>
        </div>
      ) : !selectedAccount ? (
        <div className="card shadow-sm border border-border bg-white rounded-lg">
          <div className="card-body py-12 text-center text-sm text-subtle font-medium">
            Please link and select a Meta Ad Account in settings to load creatives.
          </div>
        </div>
      ) : creatives.length === 0 ? (
        <div className="card shadow-sm border border-border bg-white rounded-lg">
          <div className="card-body py-12">
            <div className="empty-state text-center max-w-sm mx-auto space-y-3">
              <ImageIcon size={48} className="text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No creatives found</h3>
              <p className="text-xs text-subtle">
                Verify that you have selected active ad accounts in settings and enqueued a database sync.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Creatives Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {creatives.map((cr, idx) => (
            <div key={idx} className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden flex flex-col justify-between hover:shadow-md transition">
              {/* Media Preview Container */}
              <div className="relative bg-slate-100 h-48 flex items-center justify-center overflow-hidden border-b border-border">
                {cr.image_url ? (
                  <img
                    src={cr.image_url}
                    alt={cr.headline || "Creative Image"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <ImageIcon size={40} className="text-slate-400 mx-auto" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Video ID: {cr.video_id || "No media thumbnail"}
                    </span>
                  </div>
                )}
                <span className="absolute top-3 right-3 text-[9px] font-bold uppercase text-white bg-slate-900/80 px-2 py-0.5 rounded shadow-sm">
                  {cr.creative_type || "AD_CREATIVE"}
                </span>
              </div>

              {/* Creative Copy Details */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Copy Structure
                  </div>
                  {cr.headline && (
                    <h3 className="font-bold text-sm text-slate-800 line-clamp-1">
                      {cr.headline}
                    </h3>
                  )}
                  {cr.primary_text && (
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                      {cr.primary_text}
                    </p>
                  )}
                  {cr.description && (
                    <p className="text-[10px] text-slate-400 italic line-clamp-2">
                      {cr.description}
                    </p>
                  )}
                </div>

                {/* Footer Action Details */}
                <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-xs">
                  {cr.landing_page_url ? (
                    <a
                      href={cr.landing_page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-bold hover:underline flex items-center gap-1.5"
                    >
                      <LinkIcon size={12} />
                      Landing Page
                    </a>
                  ) : (
                    <span className="text-slate-400 font-semibold">No URL link</span>
                  )}
                  {cr.call_to_action && (
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded shadow-sm">
                      {cr.call_to_action.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
