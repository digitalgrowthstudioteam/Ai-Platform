"use client";

import { useEffect, useState } from "react";
import { Megaphone, CheckCircle2, AlertCircle, Loader2, RefreshCw, LogOut, CheckSquare, Square } from "lucide-react";
import { api } from "@/lib/api";
import { auth } from "@/lib/firebase";

interface AdAccount {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  account_status: number;
  is_connected: boolean;
}

export default function AdAccountsPage() {
  const [connected, setConnected] = useState(false);
  const [metaUserName, setMetaUserName] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  // Save changes to selected ad accounts list
  const handleSaveSelection = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      await api.selectMetaAccounts(selectedAccounts);
      setSuccess("Ad account preferences saved successfully.");
      await checkStatus(); // Reload list
    } catch (err: any) {
      setError(err.message || "Failed to save selected ad accounts");
    } finally {
      setSaving(false);
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
    } catch (err: any) {
      setError(err.message || "Failed to disconnect Meta account");
    } finally {
      setDisconnecting(false);
    }
  };

  // Toggle selection checkbox
  const toggleAccount = (accountId: string) => {
    setSelectedAccounts(prev => 
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
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
              <p className="text-xs text-subtle">Toggle which connected ad accounts should synchronize historical analytics</p>
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
                      onClick={() => isActive && toggleAccount(acc.id)}
                      className={`p-4 flex items-center justify-between transition cursor-pointer hover:bg-slate-50 ${
                        !isActive ? "opacity-60 cursor-not-allowed bg-slate-50/50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-primary shrink-0">
                          {isChecked ? (
                            <CheckSquare size={20} className="fill-blue-50 text-blue-600" />
                          ) : (
                            <Square size={20} className="text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
                            {acc.name}
                            {!isActive && (
                              <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                Disabled
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-subtle font-medium mt-0.5">
                            ID: {acc.id} &bull; {acc.currency} ({acc.timezone})
                          </div>
                        </div>
                      </div>

                      <div className="text-xs font-semibold">
                        {isChecked ? (
                          <span className="text-green-600 bg-green-50 px-2 py-1 rounded">Active Pipeline</span>
                        ) : (
                          <span className="text-subtle bg-slate-100 px-2 py-1 rounded">Inactive</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Save Selection Button */}
            {accounts.length > 0 && (
              <div className="card-footer border-t border-border p-6 flex justify-end">
                <button
                  onClick={handleSaveSelection}
                  disabled={saving}
                  className="btn btn-primary px-6 py-2 flex items-center gap-2 font-semibold text-sm"
                >
                  {saving && <Loader2 size={16} className="animate-spin text-white" />}
                  Save Selected Accounts
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
