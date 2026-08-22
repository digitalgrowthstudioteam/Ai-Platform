"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { auth } from "@/lib/firebase";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle,
  AlertCircle,
  FileText,
  HelpCircle,
  ExternalLink,
  Target,
  DollarSign,
  TrendingUp,
  Award,
} from "lucide-react";

interface AdAccount {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  account_status: number;
  is_connected: boolean;
}

const AUDIT_STEPS = [
  "Loading campaigns...",
  "Reviewing campaign performance...",
  "Analysing ad performance...",
  "Checking cost efficiency...",
  "Reviewing recent trends...",
  "Finding optimization opportunities...",
];

export default function HealthCheckPage() {
  const { user, loginWithGoogle, isAuthenticated } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Audit runner state
  const [selectedAccount, setSelectedAccount] = useState<AdAccount | null>(null);
  const [auditStep, setAuditStep] = useState(-1); // -1 = not started, 0-5 = steps, 6 = complete
  const [auditResult, setAuditResult] = useState<any>(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);

  // Log funnel event on mount
  useEffect(() => {
    api.logFunnelEvent("health_check_started").catch(() => {});
  }, []);

  // Fetch Meta connection status & accounts if authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const fetchStatus = async () => {
      setLoading(true);
      setError("");
      try {
        const statusRes = await api.getMetaStatus();
        setConnectionStatus(statusRes);

        if (statusRes.connected) {
          const accountsRes = await api.getMetaAccounts();
          setAdAccounts(accountsRes);
        }
      } catch (err: any) {
        console.error("Failed to load Meta status:", err);
        setError(err.message || "Failed to load connection status.");
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [isAuthenticated]);

  // Triggers Meta OAuth consent flow
  const handleConnectMeta = async () => {
    setError("");
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      const token = await currentUser.getIdToken();
      const baseUrl = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:8000/api/v1"
        : "https://digital-growth-studio-api.onrender.com/api/v1";
        
      api.logFunnelEvent("meta_oauth_clicked").catch(() => {});
      window.location.href = `${baseUrl}/meta/connect?token=${token}`;
    } catch (err: any) {
      setError(err.message || "Failed to initiate Meta connection.");
    }
  };

  // Run the audit with simulated UI steps overlaying the API call
  const handleRunAudit = async (acc: AdAccount) => {
    setSelectedAccount(acc);
    setAuditStep(0);
    setError("");

    api.logFunnelEvent("audit_triggered", { ad_account_id: acc.id }).catch(() => {});

    // Step progression animation loop
    const stepInterval = setInterval(() => {
      setAuditStep((prev) => {
        if (prev < AUDIT_STEPS.length - 1) {
          return prev + 1;
        } else {
          clearInterval(stepInterval);
          return prev;
        }
      });
    }, 850);

    try {
      // Direct Select connection to sync selected account if needed
      await api.selectMetaAccounts([acc.id]);
      
      // Run audit calculations and generate PDF
      const result = await api.runHealthCheckAudit(acc.id);
      
      // Wait briefly if animation hasn't finished
      clearInterval(stepInterval);
      setAuditStep(6);
      setAuditResult(result);
      api.logFunnelEvent("audit_succeeded", { ad_account_id: acc.id, score: result.health_score }).catch(() => {});
    } catch (err: any) {
      clearInterval(stepInterval);
      setAuditStep(-1);
      setError(err.message || "An error occurred while compiling your account audit.");
      api.logFunnelEvent("audit_failed", { ad_account_id: acc.id, error: err.message }).catch(() => {});
    }
  };

  // Triggers browser download of compiled ReportLab PDF
  const handleDownloadPDF = async () => {
    if (!auditResult) return;
    setPdfDownloading(true);
    api.logFunnelEvent("pdf_download_clicked", { audit_id: auditResult.id }).catch(() => {});
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const token = await currentUser.getIdToken();
      
      const baseUrl = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:8000/api/v1"
        : "https://digital-growth-studio-api.onrender.com/api/v1";

      // Download file natively by setting iframe source or window redirect
      const downloadUrl = `${baseUrl}/funnel/health-check/audit/${auditResult.id}/pdf`;
      
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.target = "_blank";
      // We setAuthorization headers via token parameter or fetch blob
      const response = await fetch(downloadUrl, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Failed to download PDF file.");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      a.href = url;
      a.download = `dgs_meta_audit_${acc_short_id(selectedAccount?.id)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      setError("Failed to download report. Please try again.");
    } finally {
      setPdfDownloading(false);
    }
  };

  const acc_short_id = (id?: string) => {
    if (!id) return "";
    return id.replace("act_", "");
  };

  const formatCurrency = (val: any, currency = "INR") => {
    if (val === null || val === undefined) return "N/A";
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(val);
  };

  const formatPercentage = (val: any) => {
    if (val === null || val === undefined) return "N/A";
    return `${parseFloat(val).toFixed(2)}%`;
  };

  const formatROAS = (val: any) => {
    if (val === null || val === undefined) return "N/A";
    return `${parseFloat(val).toFixed(2)}x`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500 font-bold text-sm">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Synchronizing your session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col justify-between">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-cover shadow-xs" />
            <span className="font-extrabold text-sm tracking-tight">Digital Growth Studio</span>
          </Link>
          <div className="text-xs font-semibold text-slate-500">
            Funnel • Real-Time Campaign Audit
          </div>
        </div>
      </header>

      {/* CORE WORKSPACE */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-12 flex flex-col justify-center">
        {error && (
          <div className="bg-rose-50 text-rose-800 border border-rose-200 text-sm p-4 rounded-2xl font-bold flex items-center gap-3 mb-6">
            <AlertCircle size={20} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!isAuthenticated ? (
          /* LOGIN SCREEN */
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl max-w-md w-full mx-auto space-y-6 text-center animate-in fade-in zoom-in duration-200">
            <div className="bg-blue-50 text-blue-600 p-3.5 rounded-full w-fit mx-auto border border-blue-100">
              <Activity size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Run Free Meta Ads Audit</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Connect your account using Google to run a performance audit on your campaigns.
              </p>
            </div>
            <button
              onClick={loginWithGoogle}
              className="w-full bg-slate-900 hover:bg-slate-950 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-3 shadow-md"
            >
              <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-6.887 4.114-4.808 0-8.73-3.83-8.73-8.519 0-4.69 3.922-8.519 8.73-8.519 2.062 0 3.93.753 5.4 2.191l3.203-3.21C18.66 1.83 15.65 0 12.24 0 5.48 0 0 5.373 0 12s5.48 12 12.24 12c6.26 0 11.24-4.337 11.24-11.114 0-.66-.06-1.3-.18-1.886H12.24z" />
              </svg>
              <span>Log In with Google</span>
            </button>
          </div>
        ) : connectionStatus && !connectionStatus.connected ? (
          /* META CONNECTION SCREEN */
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl max-w-xl w-full mx-auto space-y-6 text-center animate-in fade-in zoom-in duration-200">
            <div className="bg-blue-50 text-blue-600 p-3.5 rounded-full w-fit mx-auto border border-blue-100">
              <ShieldCheck size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Connect Meta Marketing API</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Connect your Meta profile to list available ad accounts. We request safe **read-only permissions** via official Meta secure OAuth Dialog. We do not store passwords.
              </p>
            </div>

            <button
              onClick={handleConnectMeta}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition shadow-md shadow-blue-500/10 flex items-center justify-center gap-2"
            >
              <span>Connect Meta Ads Profile</span>
              <ArrowRight size={14} />
            </button>
          </div>
        ) : auditStep >= 0 && auditStep < 6 ? (
          /* AUDIT LOADER OVERLAY */
          <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-xl max-w-md w-full mx-auto space-y-8 text-center animate-in fade-in duration-200">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
              <h3 className="text-xl font-bold text-slate-900">Running Meta Ads Audit</h3>
              <p className="text-xs text-slate-400">Analyzing Campaign metrics for act_{acc_short_id(selectedAccount?.id)}</p>
            </div>

            {/* Steps listing */}
            <div className="space-y-3.5 text-left border-t border-slate-100 pt-6 font-semibold">
              {AUDIT_STEPS.map((step, idx) => {
                const isCompleted = auditStep > idx;
                const isActive = auditStep === idx;
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 text-xs transition-colors duration-200 ${
                      isCompleted ? "text-emerald-600" : isActive ? "text-blue-600" : "text-slate-400"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle size={14} className="shrink-0" />
                    ) : isActive ? (
                      <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-slate-200 bg-slate-50 shrink-0" />
                    )}
                    <span>{step}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : auditResult ? (
          /* AUDIT SNAPSHOT RESULT DASHBOARD */
          <div className="space-y-6 animate-in fade-in duration-400">
            {/* Header Title block */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Audit Complete</span>
                <h2 className="text-2xl font-black text-slate-900">Meta Ads Audit: {selectedAccount?.name}</h2>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Account ID: act_{acc_short_id(selectedAccount?.id)} • Checked 30 Days History</p>
              </div>
              <button
                onClick={handleDownloadPDF}
                disabled={pdfDownloading}
                className="w-full md:w-auto bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white font-bold text-xs px-6 py-3.5 rounded-xl transition shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <FileText size={15} />
                <span>{pdfDownloading ? "Generating PDF..." : "Download Full Audit PDF"}</span>
              </button>
            </div>

            {/* Metrics Snapshot block */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Score circular card */}
              <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-3xl flex flex-col items-center justify-center text-center space-y-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meta Ads Health Score</div>
                <div className="text-5xl font-black text-blue-400 flex items-baseline gap-1">
                  <span>{auditResult.health_score !== null ? auditResult.health_score : "N/A"}</span>
                  <span className="text-base font-bold text-slate-600">/ 100</span>
                </div>
                <div className="text-[10px] font-bold text-slate-400 px-3 py-1 rounded bg-slate-850">
                  {auditResult.health_score !== null && auditResult.health_score >= 80 ? "EXCELLENT PERFORMANCE" : auditResult.health_score !== null && auditResult.health_score >= 60 ? "MODERATE HEALTH" : "IMMEDIATE RESTRUCTURE NEEDED"}
                </div>
              </div>

              {/* KPI metrics details */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:col-span-3">
                <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Ad Spend</div>
                  <div className="text-xl font-extrabold text-slate-900">{formatCurrency(auditResult.metrics.spend)}</div>
                  <div className="text-[10px] text-slate-400 font-semibold">Total spent last 30d</div>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Leads</div>
                  <div className="text-xl font-extrabold text-slate-900">{auditResult.metrics.leads !== null ? auditResult.metrics.leads : "N/A"}</div>
                  <div className="text-[10px] text-slate-400 font-semibold">Lead objective metrics</div>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Conversion ROAS</div>
                  <div className="text-xl font-extrabold text-slate-900">{formatROAS(auditResult.metrics.roas)}</div>
                  <div className="text-[10px] text-slate-400 font-semibold">Overall return multiplier</div>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cost per Lead (CPL)</div>
                  <div className="text-xl font-extrabold text-slate-900">{formatCurrency(auditResult.metrics.cpl)}</div>
                  <div className="text-[10px] text-slate-400 font-semibold">Acquisition cost efficiency</div>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Link CTR</div>
                  <div className="text-xl font-extrabold text-slate-900">{formatPercentage(auditResult.metrics.ctr)}</div>
                  <div className="text-[10px] text-slate-400 font-semibold">Outbound click engagement</div>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 flex flex-col justify-center">
                  <Link
                    href="/dashboard"
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <span>View Complete Dashboard</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Campaign Table listing */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Campaign Structures & Action Recommendations</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold">
                      <th className="py-3 pr-4">CAMPAIGN NAME</th>
                      <th className="py-3 px-4">SPEND</th>
                      <th className="py-3 px-4">RESULTS</th>
                      <th className="py-3 px-4">CPL</th>
                      <th className="py-3 px-4">CTR</th>
                      <th className="py-3 px-4">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditResult.campaigns.map((c: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-50 font-bold hover:bg-slate-50/50">
                        <td className="py-3.5 pr-4 text-slate-800 font-extrabold">{c.name}</td>
                        <td className="py-3.5 px-4 text-slate-600">{formatCurrency(c.spend)}</td>
                        <td className="py-3.5 px-4 text-slate-600">{c.results !== null ? c.results : "N/A"}</td>
                        <td className="py-3.5 px-4 text-slate-600">{formatCurrency(c.cpl)}</td>
                        <td className="py-3.5 px-4 text-slate-600">{formatPercentage(c.ctr)}</td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            c.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}>
                            {c.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {auditResult.campaigns.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">
                          No campaigns found in database for this account.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Strategic Findings & Recommendations */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Key AI Recommendations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {auditResult.findings.map((f: any, idx: number) => (
                  <div key={idx} className="border border-slate-100 rounded-2xl p-5 bg-slate-50/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded">
                        {f.type}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-base">{f.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{f.recommendation}</p>
                    <div className="text-[11px] font-bold text-emerald-700 pt-1 flex items-center gap-1">
                      <CheckCircle size={12} />
                      <span>Outcome: {f.expected_impact}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* CONNECTED AD ACCOUNTS LIST SCREEN */
          <div className="space-y-6 max-w-2xl w-full mx-auto animate-in fade-in duration-200">
            <div className="text-center space-y-2 mb-6">
              <h2 className="text-2xl font-black text-slate-900">Select Ad Account to Audit</h2>
              <p className="text-sm text-slate-500">
                Choose one of your connected Meta ad accounts to run the automated performance analysis.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              {adAccounts.map((acc, idx) => (
                <button
                  key={idx}
                  onClick={() => handleRunAudit(acc)}
                  className="flex items-center justify-between border border-slate-200 hover:border-blue-600 p-5 rounded-2xl bg-white hover:bg-blue-50/10 text-left transition group cursor-pointer"
                >
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base group-hover:text-blue-700 transition">
                      {acc.name}
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                      Account ID: act_{acc_short_id(acc.id)} • Timezone: {acc.timezone} • Currency: {acc.currency}
                    </p>
                  </div>
                  <div className="bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white p-2 rounded-xl transition">
                    <ArrowRight size={16} />
                  </div>
                </button>
              ))}
              {adAccounts.length === 0 && (
                <div className="text-center py-10 bg-white border border-slate-200 rounded-2xl space-y-4">
                  <div className="text-slate-400 text-sm font-bold">No Meta Ad Accounts available.</div>
                  <button
                    onClick={handleConnectMeta}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition"
                  >
                    Reconnect Facebook Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="py-6 px-6 border-t border-slate-200 bg-white text-center text-xs font-semibold text-slate-400">
        Digital Growth Studio • AI Meta Ads Performance Auditor • © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
