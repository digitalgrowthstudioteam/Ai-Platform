"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Users,
  Database,
  RefreshCw,
  Loader2,
  Trash2,
  Lock,
  UserCheck,
  Award,
} from "lucide-react";

export default function AdminPage() {
  const { user, loading: loadingAuth } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Check admin role
  const isAdmin = user?.email === "flasshgames2026@gmail.com" || user?.email === "digitalgrowthstudioteam@gmail.com";

  const loadAdminDashboard = async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const [statsRes, usersRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
      ]);
      setStats(statsRes);
      setUsersList(usersRes);
    } catch (err) {
      console.error("Failed to load admin stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loadingAuth) {
      if (user && !isAdmin) {
        // Redirect standard users
        router.push("/");
      } else if (user && isAdmin) {
        loadAdminDashboard();
      }
    }
  }, [user, loadingAuth]);

  const handlePlanOverride = async (targetUserId: string, newPlanId: string) => {
    try {
      setActionLoading(targetUserId);
      await api.updateUserPlan(targetUserId, newPlanId);
      setNotification({
        type: "success",
        message: `Plan overridden successfully to ${newPlanId.toUpperCase()}.`,
      });
      // Refresh
      const updatedUsers = await api.getAdminUsers();
      setUsersList(updatedUsers);
      const updatedStats = await api.getAdminStats();
      setStats(updatedStats);
    } catch (err) {
      console.error("Failed to override plan:", err);
      setNotification({ type: "error", message: "Failed to override plan setting." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusOverride = async (targetUserId: string, currentStatus: string) => {
    try {
      setActionLoading(targetUserId);
      const newStatus = currentStatus === "active" ? "suspended" : "active";
      await api.updateUserStatus(targetUserId, newStatus);
      setNotification({
        type: "success",
        message: `User status overridden successfully to ${newStatus.toUpperCase()}.`,
      });
      // Refresh
      const updatedUsers = await api.getAdminUsers();
      setUsersList(updatedUsers);
    } catch (err) {
      console.error("Failed to override status:", err);
      setNotification({ type: "error", message: "Failed to override status flag." });
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearInterval(timer);
    }
  }, [notification]);

  if (loadingAuth || (user && isAdmin && loading)) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
        <span className="ml-2 text-sm text-subtle font-medium">Authorizing admin panel node...</span>
      </div>
    );
  }

  // Double check guard for standard users
  if (!user || !isAdmin) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center max-w-sm p-6 border border-red-200 bg-red-50 text-red-700 rounded-lg space-y-3">
          <ShieldAlert size={48} className="mx-auto" />
          <h3 className="text-lg font-bold">Access Denied</h3>
          <p className="text-xs">You do not have administrative permissions to view this control node.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page Header */}
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title text-2xl font-bold text-slate-800">Admin Control Panel</h1>
          <p className="page-subtitle text-sm text-subtle mt-1">
            Global SaaS configuration logs and subscription overrides
          </p>
        </div>
      </div>

      {/* Floating Feedback Notification */}
      {notification && (
        <div className={`p-4 rounded-md border text-sm flex items-start gap-2 shadow-sm animate-fade-in ${
          notification.type === "success" 
            ? "bg-green-50 text-green-700 border-green-200" 
            : "bg-red-50 text-red-700 border-red-200"
        }`}>
          <UserCheck size={18} className="shrink-0 mt-0.5" />
          <div>{notification.message}</div>
        </div>
      )}

      {/* Admin Stats Grid */}
      {stats && (
        <div className="kpi-grid grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="kpi-card shadow-sm border border-border bg-white rounded-lg p-5 flex items-center gap-4">
            <div className="kpi-icon bg-blue-50 text-blue-600 p-3 rounded-lg flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div>
              <span className="kpi-label text-xs text-subtle font-bold uppercase tracking-wider block">Total Users</span>
              <span className="kpi-value text-2xl font-bold text-slate-800 mt-1 block">{stats.total_users}</span>
            </div>
          </div>

          <div className="kpi-card shadow-sm border border-border bg-white rounded-lg p-5 flex items-center gap-4">
            <div className="kpi-icon bg-green-50 text-green-600 p-3 rounded-lg flex items-center justify-center shrink-0">
              <Database size={20} />
            </div>
            <div>
              <span className="kpi-label text-xs text-subtle font-bold uppercase tracking-wider block">Connected Pipelines</span>
              <span className="kpi-value text-2xl font-bold text-slate-800 mt-1 block">{stats.connected_ad_accounts}</span>
            </div>
          </div>

          <div className="kpi-card shadow-sm border border-border bg-white rounded-lg p-5 flex items-center gap-4">
            <div className="kpi-icon bg-purple-50 text-purple-600 p-3 rounded-lg flex items-center justify-center shrink-0">
              <RefreshCw size={20} />
            </div>
            <div>
              <span className="kpi-label text-xs text-subtle font-bold uppercase tracking-wider block">Active Sync Logs</span>
              <span className="kpi-value text-2xl font-bold text-slate-800 mt-1 block">{stats.active_connections}</span>
            </div>
          </div>
        </div>
      )}

      {/* Users Management List */}
      <div className="card border border-border bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="card-header border-b border-border p-6 bg-slate-50/50">
          <h3 className="card-title font-bold text-slate-800 text-sm">Platform Users Management</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-left divide-y divide-border">
            <thead className="bg-slate-50/50">
              <tr className="text-subtle font-bold uppercase tracking-wider border-b border-border">
                <th className="p-4">User</th>
                <th className="p-4 text-center">Connected Accounts</th>
                <th className="p-4">Active Plan</th>
                <th className="p-4">Sync Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium text-slate-700">
              {usersList.map((usr) => (
                <tr key={usr.id} className="hover:bg-slate-50 transition">
                  <td className="p-4">
                    <div className="font-bold text-sm text-slate-800">{usr.name || "DG User"}</div>
                    <div className="text-slate-400 font-bold truncate max-w-sm mt-0.5">{usr.email}</div>
                  </td>
                  <td className="p-4 text-center text-sm font-semibold">{usr.connected_accounts_count}</td>
                  <td className="p-4">
                    <select
                      disabled={actionLoading === usr.id}
                      value={usr.plan_id}
                      onChange={(e) => handlePlanOverride(usr.id, e.target.value)}
                      className="bg-slate-100 border border-border rounded px-2.5 py-1 text-slate-800 font-bold outline-none cursor-pointer"
                    >
                      <option value="starter">Starter</option>
                      <option value="growth">Growth</option>
                      <option value="scale">Scale</option>
                    </select>
                  </td>
                  <td className="p-4">
                    {usr.last_sync_status ? (
                      <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                        usr.last_sync_status === "success" ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"
                      }`}>
                        {usr.last_sync_status}
                      </span>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      disabled={actionLoading === usr.id}
                      onClick={() => handleStatusOverride(usr.id, usr.status)}
                      className={`btn font-bold text-xs py-1.5 px-3 rounded border transition ${
                        usr.status === "active"
                          ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                          : "bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                      }`}
                    >
                      {actionLoading === usr.id ? (
                        <Loader2 size={12} className="animate-spin inline" />
                      ) : usr.status === "active" ? (
                        "Suspend"
                      ) : (
                        "Reactivate"
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
