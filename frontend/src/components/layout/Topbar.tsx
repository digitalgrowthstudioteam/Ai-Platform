"use client";

import { useEffect, useState } from "react";
import { Search, Bell, LogOut, RefreshCw, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAdAccount } from "@/context/AdAccountContext";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/utils";

export default function Topbar() {
  const { user, logout } = useAuth();
  const { adAccounts, selectedAccount, setSelectedAccount } = useAdAccount();
  const [syncStatus, setSyncStatus] = useState<{
    lastSyncAt: string | null;
    status: string | null;
  }>({ lastSyncAt: null, status: null });

  const displayName = user?.displayName || user?.email || "User";
  const initials = displayName
    .split("@")[0]
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const fetchSyncStatus = async () => {
    try {
      const res = await api.getSyncStatus();
      const newStatus = {
        lastSyncAt: res.last_sync_at || null,
        status: res.last_sync_status || null,
      };
      setSyncStatus(newStatus);
      sessionStorage.setItem("dgs_cached_sync_status", JSON.stringify(newStatus));
    } catch (err) {
      console.error("Failed to fetch sync status:", err);
    }
  };

  useEffect(() => {
    const cached = sessionStorage.getItem("dgs_cached_sync_status");
    if (cached) {
      try {
        setSyncStatus(JSON.parse(cached));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchSyncStatus();
      
      // Set up periodic sync status polling every 60 seconds
      const timer = setInterval(fetchSyncStatus, 60000);
      return () => clearInterval(timer);
    }
  }, [user]);

  // Format sync status message
  let syncLabel = "No sync recorded";
  let syncClass = "synced";
  let syncIcon = <span className="topbar-sync-dot bg-slate-400" />;

  if (syncStatus.status === "in_progress") {
    syncLabel = "Syncing Meta data...";
    syncClass = "syncing";
    syncIcon = <RefreshCw size={12} className="animate-spin text-blue-500" />;
  } else if (syncStatus.status === "failed") {
    syncLabel = "Sync failed";
    syncClass = "failed";
    syncIcon = <AlertTriangle size={12} className="text-red-500" />;
  } else if (syncStatus.lastSyncAt) {
    const timeString = timeAgo(new Date(syncStatus.lastSyncAt));
    syncLabel = `Synced ${timeString}`;
    syncClass = "synced";
    syncIcon = <span className="topbar-sync-dot bg-green-500" />;
  }

  return (
    <header className="topbar" id="topbar">
      {/* Account Selector Dropdown */}
      <div className="topbar-account" id="account-selector">
        <div className="topbar-account-label">Ad Account</div>
        {adAccounts.length === 0 ? (
          <div className="topbar-account-name text-slate-400 text-sm font-medium mt-0.5">
            No active account
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <select
              value={selectedAccount?.id || ""}
              onChange={(e) => {
                const matched = adAccounts.find((acc) => acc.id === e.target.value);
                if (matched) setSelectedAccount(matched);
              }}
              className="bg-transparent font-bold text-foreground text-sm border-none outline-none cursor-pointer pr-5 appearance-none mt-0.5"
              style={{
                backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%230F172A%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 50%",
                backgroundSize: "8px auto",
              }}
            >
              {adAccounts.map((acc) => (
                <option key={acc.id} value={acc.id} className="text-slate-800 bg-white">
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Global Search */}
      <div className="topbar-search" id="global-search">
        <Search />
        <input
          type="text"
          placeholder="Search anything..."
          aria-label="Search"
        />
        <span className="topbar-search-shortcut">⌘K</span>
      </div>

      {/* Right Actions */}
      <div className="topbar-actions">
        {/* Sync Status Badge */}
        <button 
          onClick={fetchSyncStatus}
          className={`topbar-sync ${syncClass} flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-border transition`} 
          id="sync-status"
          title="Click to refresh sync status"
        >
          {syncIcon}
          <span>{syncLabel}</span>
        </button>

        {/* Notifications */}
        <button className="topbar-notification" id="notifications-btn" aria-label="Notifications">
          <Bell size={18} />
          <span className="topbar-notification-badge">4</span>
        </button>

        {/* Profile Info and Logout */}
        <div 
          className="topbar-profile" 
          id="profile-menu" 
          onClick={logout} 
          title="Click to log out"
          style={{ cursor: "pointer" }}
        >
          <div className="topbar-avatar">{initials}</div>
          <div className="topbar-profile-info">
            <span className="topbar-profile-name">{displayName.split("@")[0]}</span>
            <span className="topbar-profile-role">Log Out</span>
          </div>
          <LogOut size={14} style={{ color: "var(--muted-foreground)" }} />
        </div>
      </div>
    </header>
  );
}
