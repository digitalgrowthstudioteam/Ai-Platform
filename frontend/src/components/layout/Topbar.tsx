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

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res);
    } catch (e) {
      console.error("Failed to fetch notifications:", e);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = async () => {
    try {
      // Optimistic UI update
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      await api.markAllNotificationsAsRead();
    } catch (e) {
      console.error("Failed to mark all notifications as read:", e);
      fetchNotifications(); // rollback on error
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      // Optimistic UI update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      await api.markNotificationAsRead(id);
    } catch (e) {
      console.error("Failed to mark notification as read:", e);
      fetchNotifications(); // rollback on error
    }
  };

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

  const handleSyncClick = async () => {
    if (syncStatus.status === "in_progress") {
      await fetchSyncStatus();
      return;
    }

    try {
      setSyncStatus(prev => ({ ...prev, status: "in_progress" }));
      sessionStorage.setItem("dgs_cached_sync_status", JSON.stringify({
        lastSyncAt: syncStatus.lastSyncAt,
        status: "in_progress",
      }));
      await api.triggerSync(selectedAccount?.id || undefined);
      
      let attempts = 0;
      const pollTimer = setInterval(async () => {
        attempts += 1;
        try {
          const res = await api.getSyncStatus();
          if (res.last_sync_status !== "in_progress" || attempts > 30) {
            clearInterval(pollTimer);
            const finalStatus = {
              lastSyncAt: res.last_sync_at || null,
              status: res.last_sync_status || null,
            };
            setSyncStatus(finalStatus);
            sessionStorage.setItem("dgs_cached_sync_status", JSON.stringify(finalStatus));
          }
        } catch (e) {
          clearInterval(pollTimer);
        }
      }, 5000);
    } catch (e) {
      console.error("Failed to trigger metadata sync:", e);
      fetchSyncStatus();
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
      fetchNotifications();
      
      // Set up periodic sync status polling every 60 seconds
      const timer = setInterval(() => {
        fetchSyncStatus();
        fetchNotifications();
      }, 60000);
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
          onClick={handleSyncClick}
          className={`topbar-sync ${syncClass} flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-border transition`} 
          id="sync-status"
          title="Click to trigger or refresh metadata sync"
        >
          {syncIcon}
          <span>{syncLabel}</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="topbar-notification relative" 
            id="notifications-btn" 
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="topbar-notification-badge">{unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-150 rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <span className="text-xs font-bold text-slate-800">Notifications</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 transition"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {notifications.map((n) => (
                  <div 
                    key={n.id} 
                    onClick={() => handleMarkAsRead(n.id)}
                    className={`p-3.5 hover:bg-slate-50 transition cursor-pointer text-left ${n.read ? "opacity-60" : "bg-blue-50/20"}`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className={`text-[11px] font-bold ${n.read ? "text-slate-700" : "text-slate-900"}`}>{n.title}</span>
                      <span className="text-[9px] text-slate-400 shrink-0 font-medium">
                        {timeAgo(new Date(n.created_at))}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile Info and Logout */}
        <div 
          className="topbar-profile" 
          id="profile-menu" 
          onClick={logout} 
          title="Click to log out"
          style={{ cursor: "pointer" }}
        >
          {user?.photoURL ? (
            <img 
              src={user.photoURL} 
              alt="Profile" 
              className="w-8 h-8 rounded-full border border-blue-500 shadow-sm object-cover" 
            />
          ) : (
            <div className="topbar-avatar">{initials}</div>
          )}
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
