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
  MessageSquare,
  Send,
  CheckCircle,
} from "lucide-react";

export default function AdminPage() {
  const { user, loading: loadingAuth } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"users" | "tickets">("users");
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [ticketsList, setTicketsList] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Ticket Reply Form state
  const [replyTicketId, setReplyTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState("resolved");

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
      const [statsRes, usersRes, ticketsRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getAdminTickets(),
      ]);
      setStats(statsRes);
      setUsersList(usersRes);
      setTicketsList(ticketsRes);
    } catch (err) {
      console.error("Failed to load admin stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loadingAuth) {
      if (user && !isAdmin) {
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

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyTicketId || !replyText) return;

    try {
      setActionLoading(`reply_${replyTicketId}`);
      await api.replyToTicket(replyTicketId, replyText, replyStatus);
      setNotification({
        type: "success",
        message: "Successfully replied to the support ticket!",
      });
      setReplyTicketId(null);
      setReplyText("");
      // Refresh tickets
      const updatedTickets = await api.getAdminTickets();
      setTicketsList(updatedTickets);
    } catch (err) {
      console.error("Failed to submit ticket reply:", err);
      setNotification({ type: "error", message: "Failed to send ticket response." });
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (loadingAuth || (user && isAdmin && loading)) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <span className="ml-2 text-sm text-slate-500 font-medium">Authorizing admin panel node...</span>
      </div>
    );
  }

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
          <p className="page-subtitle text-sm text-slate-500 mt-1">
            Global SaaS configuration logs, subscription overrides, and support tickets
          </p>
        </div>
      </div>

      {/* Floating Feedback Notification */}
      {notification && (
        <div className={`p-4 rounded-xl border text-xs font-semibold flex items-start gap-2 shadow-xs animate-fade-in ${
          notification.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
            : "bg-rose-50 text-rose-800 border-rose-100"
        }`}>
          <CheckCircle size={15} className="shrink-0 mt-0.5" />
          <div>{notification.message}</div>
        </div>
      )}

      {/* Admin Stats Grid */}
      {stats && (
        <div className="kpi-grid grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-150 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
            <div className="bg-blue-50 text-blue-600 p-3 rounded-xl flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Users</span>
              <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{stats.total_users}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-150 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl flex items-center justify-center shrink-0">
              <Database size={20} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Connected Pipelines</span>
              <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{stats.connected_ad_accounts}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-150 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
            <div className="bg-purple-50 text-purple-600 p-3 rounded-xl flex items-center justify-center shrink-0">
              <RefreshCw size={20} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Active Sync Logs</span>
              <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{stats.active_connections}</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-150 gap-4">
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 px-1 ${
            activeTab === "users" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400"
          }`}
        >
          Users Management
        </button>
        <button
          onClick={() => setActiveTab("tickets")}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 px-1 flex items-center gap-1.5 ${
            activeTab === "tickets" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400"
          }`}
        >
          Support Tickets
          {ticketsList.filter(t => t.status === "open").length > 0 && (
            <span className="bg-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
              {ticketsList.filter(t => t.status === "open").length}
            </span>
          )}
        </button>
      </div>

      {/* TAB CONTENT: Users Management */}
      {activeTab === "users" && (
        <div className="bg-white border border-slate-150 shadow-xs rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left divide-y divide-slate-100">
              <thead className="bg-slate-50/50">
                <tr className="text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="p-4">User</th>
                  <th className="p-4 text-center">Connected Accounts</th>
                  <th className="p-4">Active Plan</th>
                  <th className="p-4">Sync Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
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
                        className="bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1 text-slate-800 font-bold outline-none cursor-pointer"
                      >
                        <option value="starter">Pro Early Access</option>
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
                        className={`btn font-bold text-xs py-1.5 px-3 rounded-xl border transition ${
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
      )}

      {/* TAB CONTENT: Support Tickets */}
      {activeTab === "tickets" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List of raised tickets */}
          <div className="lg:col-span-2 bg-white border border-slate-150 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-1.5">
              <MessageSquare size={16} className="text-blue-600" /> User Tickets Log
            </h3>

            {ticketsList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs italic">
                No support tickets raised on the platform yet.
              </div>
            ) : (
              <div className="space-y-3">
                {ticketsList.map((t) => (
                  <div 
                    key={t.id}
                    onClick={() => {
                      setReplyTicketId(t.id);
                      setReplyText(t.admin_reply || "");
                      setReplyStatus(t.status || "resolved");
                    }}
                    className={`p-4 border rounded-xl hover:bg-slate-50 transition cursor-pointer text-left ${
                      replyTicketId === t.id ? "border-blue-500 bg-blue-50/5" : "border-slate-150 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="bg-slate-200 text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase">
                          {t.category}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">{t.subject}</h4>
                        <p className="text-[10px] text-slate-400 font-medium">
                          From: <span className="font-bold text-slate-600">{t.user_email}</span> | {new Date(t.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase ${
                        t.status === "resolved" 
                          ? "bg-emerald-50 text-emerald-700" 
                          : t.status === "in_progress" 
                          ? "bg-blue-50 text-blue-700" 
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {t.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-3 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-medium">
                      {t.description}
                    </p>

                    {t.admin_reply && (
                      <div className="mt-3 text-[10px] border-t border-slate-100 pt-2 text-slate-400 flex items-start gap-1">
                        <span className="font-bold text-blue-600 uppercase tracking-wide">Reply:</span>
                        <span className="italic font-medium text-slate-600">{t.admin_reply}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ticket Response Editor panel */}
          <div>
            <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-1.5">
                <Send size={16} className="text-blue-600" /> Answer Support Issue
              </h3>

              {!replyTicketId ? (
                <div className="py-12 text-center text-slate-400 text-xs italic">
                  Select a support ticket from the list to write a response.
                </div>
              ) : (
                <form onSubmit={handleReplySubmit} className="space-y-4 text-left">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Admin Reply Message
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
                      placeholder="Type your resolution reply here..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Update Ticket Status
                    </label>
                    <select
                      value={replyStatus}
                      onChange={(e) => setReplyStatus(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition bg-white cursor-pointer"
                    >
                      <option value="resolved">Resolved (Closed)</option>
                      <option value="in_progress">In Progress</option>
                      <option value="open">Keep Open</option>
                    </select>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="submit"
                      disabled={actionLoading !== null}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {actionLoading === `reply_${replyTicketId}` && <Loader2 size={12} className="animate-spin" />}
                      Send Response
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyTicketId(null)}
                      className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
