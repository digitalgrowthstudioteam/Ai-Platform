"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { CheckCircle, AlertCircle, Loader2, Users, ArrowRight, ShieldCheck, Mail } from "lucide-react";

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided. Please check the link in your email.");
      setLoading(false);
      return;
    }

    const fetchInfo = async () => {
      try {
        setLoading(true);
        const data = await api.getInviteInfo(token);
        setInviteInfo(data);
      } catch (err: any) {
        console.error("Failed to load invitation info:", err);
        setError(err.message || "Invalid or expired invitation link.");
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    try {
      setActionLoading(true);
      setError(null);
      const res = await api.acceptInvite(token);
      setSuccessMessage(res.message || "Successfully accepted invitation! Welcome to the workspace.");
    } catch (err: any) {
      console.error("Failed to accept invitation:", err);
      setError(err.message || "Failed to accept invitation. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 text-slate-100 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glow effect header */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-500 mb-2">
            <Users size={24} />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">Team Workspace Invitation</h1>
          <p className="text-xs text-slate-400 font-medium">Digital Growth Studio — AI Ads Optimizer</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="animate-spin text-blue-500 mx-auto" size={32} />
            <p className="text-xs text-slate-400 font-medium">Verifying invitation details...</p>
          </div>
        )}

        {/* Error Alert */}
        {error && !loading && (
          <div className="bg-rose-950/40 border border-rose-800/50 rounded-2xl p-5 text-center space-y-3">
            <AlertCircle className="text-rose-400 mx-auto" size={32} />
            <p className="text-xs font-bold text-rose-200">{error}</p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-block bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2 rounded-xl transition"
              >
                Go to Login Page
              </Link>
            </div>
          </div>
        )}

        {/* Success State */}
        {successMessage && !loading && (
          <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-2xl p-6 text-center space-y-4">
            <CheckCircle className="text-emerald-400 mx-auto" size={40} />
            <div className="space-y-1">
              <h3 className="text-sm font-black text-emerald-200 uppercase tracking-wider">Invitation Accepted!</h3>
              <p className="text-xs text-emerald-300/80 leading-relaxed">{successMessage}</p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20"
              >
                Go to Dashboard <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Invitation Preview & Action */}
        {inviteInfo && !loading && !successMessage && !error && (
          <div className="space-y-6">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 text-left">
              <div className="flex justify-between items-start border-b border-slate-800/80 pb-3">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold block">Invited By</span>
                  <span className="text-xs font-bold text-slate-200 block mt-0.5">{inviteInfo.inviter_name}</span>
                </div>
                <span className="px-2.5 py-0.5 border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[10px] font-extrabold uppercase rounded-full">
                  {inviteInfo.role}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Workspace:</span>
                  <span className="font-bold text-slate-200">{inviteInfo.workspace_name}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Invited Email:</span>
                  <span className="font-mono text-slate-300 text-[11px]">{inviteInfo.email}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Access Status:</span>
                  <span className={`font-bold capitalize ${inviteInfo.status === "active" ? "text-emerald-400" : "text-amber-400"}`}>
                    {inviteInfo.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleAccept}
                disabled={actionLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-blue-600/25"
              >
                {actionLoading && <Loader2 size={16} className="animate-spin" />}
                {actionLoading ? "Accepting..." : "Accept & Join Workspace"}
              </button>

              <p className="text-[10px] text-slate-500 text-center">
                By accepting, you will gain access to assigned Meta Ad accounts and dashboards.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        <Loader2 className="animate-spin text-blue-500 mr-2" size={20} /> Loading invitation...
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
