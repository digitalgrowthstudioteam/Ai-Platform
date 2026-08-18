"use client";

import { useEffect, useState } from "react";
import { Megaphone, CheckCircle2, AlertCircle, Loader2, RefreshCw, LogOut, CheckSquare, Square } from "lucide-react";
import { api } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { useAdAccount } from "@/context/AdAccountContext";

interface AdAccount {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  account_status: number;
  is_connected: boolean;
  industry?: string | null;
}

export default function AdAccountsPage() {
  const { refreshAccounts } = useAdAccount();
  const [connected, setConnected] = useState(false);
  const [metaUserName, setMetaUserName] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [industries, setIndustries] = useState<Record<string, string>>({});
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [pendingAccountId, setPendingAccountId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalMessage, setUpgradeModalMessage] = useState("");

  // Check connection status and load ad accounts
  const checkStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const statusRes = await api.getMetaStatus();
      setConnected(statusRes.connected);
      if (statusRes.connected && statusRes.meta_user_name) {
        setMetaUserName(statusRes.meta_user_name);
        
        // Load ad accounts list
        const accountsRes = await api.getMetaAccounts();
        setAccounts(accountsRes);
        
        // Set initially connected accounts
        const connectedIds = accountsRes.filter(a => a.is_connected).map(a => a.id);
        setSelectedAccounts(connectedIds);

        // Map initial industries
        const initialIndustries: Record<string, string> = {};
        accountsRes.forEach(a => {
          if (a.is_connected && a.industry) {
            initialIndustries[a.id] = a.industry;
          }
        });
        setIndustries(initialIndustries);
      }
    } catch (err: any) {
      console.error("Failed to load connection status:", err);
      // Don't show full page error for unauthenticated loads since auth state might still be resolving
      if (auth.currentUser) {
        setError(err.message || "Failed to load Meta connection status");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Read query params from URL (OAuth callbacks redirect here with query params)
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "success") {
      const metaName = params.get("meta_name");
      setSuccess(`Successfully connected to Meta profile ${metaName ? `as ${metaName}` : ""}`);
      refreshAccounts(); // Refresh global header selector immediately
      // Clean up URL query parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get("error")) {
      const errorMsg = params.get("error");
      const detail = params.get("detail");
      setError(`OAuth Connection Failed: ${errorMsg}. ${detail ? `Detail: ${detail}` : ""}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Wait for Auth state to resolve before checking status
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        checkStatus();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Redirect browser to backend OAuth consent flow
  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("You must be logged in to connect your Meta account.");
      }
      
      // Get Firebase Auth ID token to authenticate query redirect
      const token = await currentUser.getIdToken();
      const backendUrl = api.baseUrl;
      
      // Redirect to connection endpoint
      window.location.href = `${backendUrl}/meta/connect?token=${token}`;
    } catch (err: any) {
      setError(err.message || "Failed to initiate Meta OAuth connection");
      setLoading(false);
    }
  };

  // Trigger toggle on (deactivation is blocked / locked)
  const handleToggleOn = (accountId: string) => {
    setError(null);
    setPendingAccountId(accountId);
    setShowConfirmModal(true);
  };

  // Save changes to selected ad accounts list
  const saveAccountSelection = async (accountId: string) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      setShowConfirmModal(false);

      // Add the new account to the selected ones list
      const newSelected = [...selectedAccounts, accountId];
      
      // Save changes immediately
      await api.selectMetaAccounts(newSelected, industries);
      setSuccess("Ad account pipeline activated successfully.");
      
      // Reload list and refresh context dropdown
      await checkStatus();
      await refreshAccounts();
    } catch (err: any) {
      console.error("Failed to activate ad account:", err);
      const errMsg = err.message || "Failed to activate ad account";
      
      // Check if error is related to plan limits or trial limits
      if (
        errMsg.toLowerCase().includes("limit") || 
        errMsg.toLowerCase().includes("upgrade") || 
        errMsg.toLowerCase().includes("plan") ||
        errMsg.toLowerCase().includes("402") ||
        errMsg.toLowerCase().includes("exceed")
      ) {
        setUpgradeModalMessage(errMsg);
        setShowUpgradeModal(true);
      } else {
        setError(errMsg);
      }
    } finally {
      setSaving(false);
      setPendingAccountId(null);
    }
  };

  // Disconnect Meta Profile
  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your Meta Ads account? This will stop all active sync cycles and delete imported campaign metrics.")) {
      return;
    }
    
    try {
      setDisconnecting(true);
      setError(null);
      setSuccess(null);
      
      await api.disconnectMeta();
      setConnected(false);
      setMetaUserName(null);
      setAccounts([]);
      setSelectedAccounts([]);
      setSuccess("Meta account disconnected successfully.");
      await refreshAccounts(); // Clear global header selector
    } catch (err: any) {
      setError(err.message || "Failed to disconnect Meta account");
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
        <span className="ml-2 text-sm text-subtle font-medium">Checking connection status...</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 w-full">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ad Accounts</h1>
          <p className="page-subtitle">Manage your connected Meta Ads accounts and select active pipelines</p>
        </div>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-critical-light border border-red-200 text-red-700 rounded-lg text-sm">
          <AlertCircle size={20} className="shrink-0 text-red-500" />
          <div className="font-medium">{error}</div>
        </div>
      )}

      {/* Success Alert Banner */}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-success-light border border-green-200 text-green-700 rounded-lg text-sm">
          <CheckCircle2 size={20} className="shrink-0 text-green-500" />
          <div className="font-medium">{success}</div>
        </div>
      )}

      {/* Connection States */}
      {!connected ? (
        <div className="card shadow-sm border border-border">
          <div className="card-body py-12">
            <div className="empty-state text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Megaphone size={32} />
              </div>
              <h3 className="text-lg font-bold text-foreground">No Meta account connected</h3>
              <p className="text-sm text-subtle">
                Connect your Meta Ads account to retrieve campaigns, track historical delivery, analyze creatives, and receive optimization tips.
              </p>
              <button 
                onClick={handleConnect}
                className="btn btn-primary px-6 py-2.5 w-full sm:w-auto font-semibold flex items-center justify-center gap-2 mx-auto"
              >
                Connect Meta Ads
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Profile Info */}
          <div className="card border border-border bg-white shadow-sm">
            <div className="card-body p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Connected to Meta Profile</h4>
                  <p className="text-sm text-subtle font-medium">{metaUserName}</p>
                </div>
              </div>
              
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="btn btn-secondary border border-border hover:bg-slate-50 text-red-600 flex items-center gap-2 py-2 px-4 rounded-md text-sm font-semibold transition"
              >
                {disconnecting ? (
                  <Loader2 size={16} className="animate-spin text-red-500" />
                ) : (
                  <LogOut size={16} />
                )}
                Disconnect Profile
              </button>
            </div>
          </div>

          {/* Ad Accounts Selection list */}
          <div className="card border border-border bg-white shadow-sm">
            <div className="card-header border-b border-border p-6">
              <h3 className="text-base font-bold text-foreground">Select Active Ad Accounts</h3>
              <p className="text-xs text-subtle">Toggle to activate ad account pipelines (active pipelines are locked and cannot be switched)</p>
            </div>
            
            <div className="divide-y divide-border">
              {accounts.length === 0 ? (
                <div className="p-8 text-center text-sm text-subtle font-medium">
                  No ad accounts found for this profile connection.
                </div>
              ) : (
                accounts.map((acc) => {
                  const isChecked = selectedAccounts.includes(acc.id);
                  const isActive = acc.account_status === 1;
                  
                  return (
                    <div 
                      key={acc.id} 
                      className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                        !isActive ? "opacity-60 cursor-not-allowed bg-slate-50/50" : "bg-white"
                      }`}
                    >
                      <div className="flex-1 space-y-2">
                        <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
                          {acc.name}
                          {!isActive && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse">
                              Disabled
                            </span>
                          )}
                          {isChecked && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-bold uppercase tracking-wider flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block animate-ping" />
                              Active Pipeline (Locked)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                          ID: {acc.id} &bull; {acc.currency} ({acc.timezone})
                        </div>
                        
                        {isActive && (
                          <div className="pt-2 flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              Industry Vertical (Mandatory)
                            </label>
                            <select
                              disabled={isChecked || saving}
                              value={industries[acc.id] || ""}
                              onChange={(e) => {
                                setIndustries(prev => ({
                                  ...prev,
                                  [acc.id]: e.target.value
                                }));
                              }}
                              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer w-48 disabled:opacity-75 disabled:cursor-not-allowed focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">-- Select Industry --</option>
                              <option value="E-commerce">E-commerce</option>
                              <option value="SaaS">SaaS / Software</option>
                              <option value="Real Estate">Real Estate</option>
                              <option value="Healthcare">Healthcare & Medical</option>
                              <option value="Education">Education & Learning</option>
                              <option value="Retail">Retail & Fashion</option>
                              <option value="Entertainment">Entertainment & Media</option>
                              <option value="Agency">Agency & Consulting</option>
                              <option value="Financial Services">Financial Services</option>
                              <option value="Travel">Travel & Hospitality</option>
                              <option value="Local Business">Local Business</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        )}
                      </div>
 
                      <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isChecked ? 'text-blue-600' : 'text-slate-400'}`}>
                          {isChecked ? "Active" : "Inactive"}
                        </span>
                        <button
                          type="button"
                          disabled={isChecked || !isActive || saving}
                          onClick={() => isActive && !isChecked && handleToggleOn(acc.id)}
                          className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isChecked 
                              ? 'bg-blue-600 cursor-not-allowed opacity-90' 
                              : !isActive 
                                ? 'bg-slate-200 cursor-not-allowed opacity-50' 
                                : 'bg-slate-200 hover:bg-slate-300'
                          }`}
                          style={{ minHeight: "26px" }}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isChecked ? 'translate-x-5.5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
 
          {/* Confirmation Popup Modal */}
          {showConfirmModal && pendingAccountId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 space-y-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                    <Megaphone size={24} />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold text-slate-900">Confirm Account Activation</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      Once you select the ads account, you will not be able to switch to any other account further.
                    </p>
                    
                    {/* Render Industry vertical selection inside the modal if not selected on the card */}
                    {(!industries[pendingAccountId] || industries[pendingAccountId] === "") && (
                      <div className="pt-2 space-y-1.5 text-left">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Select Industry Vertical (Mandatory)
                        </label>
                        <select
                          value={industries[pendingAccountId] || ""}
                          onChange={(e) => {
                            setIndustries(prev => ({
                              ...prev,
                              [pendingAccountId]: e.target.value
                            }));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">-- Select Industry --</option>
                          <option value="E-commerce">E-commerce</option>
                          <option value="SaaS">SaaS / Software</option>
                          <option value="Real Estate">Real Estate</option>
                          <option value="Healthcare">Healthcare & Medical</option>
                          <option value="Education">Education & Learning</option>
                          <option value="Retail">Retail & Fashion</option>
                          <option value="Entertainment">Entertainment & Media</option>
                          <option value="Agency">Agency & Consulting</option>
                          <option value="Financial Services">Financial Services</option>
                          <option value="Travel">Travel & Hospitality</option>
                          <option value="Local Business">Local Business</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-3">
                  <button
                    disabled={saving}
                    onClick={() => {
                      setShowConfirmModal(false);
                      setPendingAccountId(null);
                    }}
                    className="border border-slate-200 bg-white text-slate-700 font-semibold px-4 py-2 text-xs rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={saving || !industries[pendingAccountId] || industries[pendingAccountId] === ""}
                    onClick={() => pendingAccountId && saveAccountSelection(pendingAccountId)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 text-xs rounded-lg transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving && <Loader2 size={12} className="animate-spin text-white" />}
                    Confirm & Activate
                  </button>
                </div>
              </div>
            </div>
          )}
 
          {/* Upgrade / Buy Add-on Modal */}
          {showUpgradeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 space-y-4">
                  <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
                    <AlertCircle size={24} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-900">Upgrade Required</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      {upgradeModalMessage || "Your selected connected accounts exceed your plan limit. Please upgrade your subscription plan or buy the Add-ons for an additional Meta Ads Account to continue."}
                    </p>
                  </div>
                </div>
                <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowUpgradeModal(false)}
                    className="border border-slate-200 bg-white text-slate-700 font-semibold px-4 py-2 text-xs rounded-lg hover:bg-slate-100 transition"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowUpgradeModal(false);
                      window.location.href = "/settings/billing";
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 text-xs rounded-lg transition"
                  >
                    Upgrade Plan / Buy Add-on
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
