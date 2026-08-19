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
  Lock,
  UserCheck,
  Award,
  MessageSquare,
  Send,
  CheckCircle,
  BarChart3,
  Megaphone,
  CreditCard,
  Calendar,
  AlertTriangle,
  Mail,
  User as UserIcon,
  Sparkles,
  Brain,
} from "lucide-react";

export default function AdminPage() {
  const { user, loading: loadingAuth } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"overview" | "users" | "tickets">("overview");
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [ticketsList, setTicketsList] = useState<any[]>([]);
  
  // Selected user for details lookup
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

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

  // Load selected user details
  useEffect(() => {
    async function fetchDetails() {
      if (!selectedUserId) {
        setUserDetails(null);
        return;
      }
      try {
        setLoadingDetails(true);
        const details = await api.getAdminUserDetails(selectedUserId);
        setUserDetails(details);
      } catch (err) {
        console.error("Failed to fetch user details:", err);
        setNotification({
          type: "error",
          message: "Failed to fetch complete details for selected user.",
        });
      } finally {
        setLoadingDetails(false);
      }
    }
    fetchDetails();
  }, [selectedUserId]);

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
      if (selectedUserId === targetUserId) {
        const details = await api.getAdminUserDetails(targetUserId);
        setUserDetails(details);
      }
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
      if (selectedUserId === targetUserId) {
        const details = await api.getAdminUserDetails(targetUserId);
        setUserDetails(details);
      }
    } catch (err) {
      console.error("Failed to override status:", err);
      setNotification({ type: "error", message: "Failed to override status flag." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreditsOverride = async (targetUserId: string, newCredits: number) => {
    try {
      setActionLoading(`credits_${targetUserId}`);
      await api.updateUserCredits(targetUserId, newCredits);
      setNotification({
        type: "success",
        message: `User credits updated successfully to ${newCredits}.`,
      });
      // Refresh user details in real-time
      if (selectedUserId === targetUserId) {
        const details = await api.getAdminUserDetails(targetUserId);
        setUserDetails(details);
      }
    } catch (err) {
      console.error("Failed to override credits:", err);
      setNotification({ type: "error", message: "Failed to override user credits." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddonQtyChange = async (targetUserId: string, addonId: string, currentQty: number, increment: boolean) => {
    try {
      setActionLoading(`addon_${addonId}`);
      const newQty = increment ? currentQty + 1 : Math.max(0, currentQty - 1);
      await api.updateUserAddons(targetUserId, addonId, newQty);
      setNotification({
        type: "success",
        message: `Addon ${addonId.replace("_", " ")} quantity updated successfully to ${newQty}.`,
      });
      // Refresh user details in real-time
      if (selectedUserId === targetUserId) {
        const details = await api.getAdminUserDetails(targetUserId);
        setUserDetails(details);
      }
    } catch (err) {
      console.error("Failed to update addon:", err);
      setNotification({ type: "error", message: "Failed to update user addon quantity." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddonToggle = async (targetUserId: string, addonId: string, enabled: boolean) => {
    try {
      setActionLoading(`addon_${addonId}`);
      const newQty = enabled ? 1 : 0;
      await api.updateUserAddons(targetUserId, addonId, newQty);
      setNotification({
        type: "success",
        message: `Addon ${addonId.replace(/_/g, " ")} status updated successfully.`,
      });
      // Refresh user details in real-time
      if (selectedUserId === targetUserId) {
        const details = await api.getAdminUserDetails(targetUserId);
        setUserDetails(details);
      }
    } catch (err) {
      console.error("Failed to update addon:", err);
      setNotification({ type: "error", message: "Failed to toggle user addon." });
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
            Global SaaS configuration logs, user detail lookups, subscription overrides, and support tickets
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

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-150 gap-4">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 px-1 ${
            activeTab === "overview" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400"
          }`}
        >
          Super Admin Dashboard
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 px-1 ${
            activeTab === "users" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400"
          }`}
        >
          Users Management & Lookup
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

      {/* TAB CONTENT: Super Admin Dashboard */}
      {activeTab === "overview" && stats && (
        <div className="space-y-6">
          {/* Admin Stats Grid */}
          <div className="kpi-grid grid grid-cols-1 md:grid-cols-5 gap-4">
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

            {/* NEW Campaign tracking metric */}
            <div className="bg-white border border-slate-150 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
              <div className="bg-orange-50 text-orange-600 p-3 rounded-xl flex items-center justify-center shrink-0">
                <Megaphone size={20} />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Tracked Campaigns</span>
                <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{stats.total_campaigns}</span>
              </div>
            </div>

            {/* NEW Active Add-ons metric */}
            <div className="bg-white border border-slate-150 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
              <div className="bg-pink-50 text-pink-600 p-3 rounded-xl flex items-center justify-center shrink-0">
                <CreditCard size={20} />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Active Addons</span>
                <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{stats.total_addons_active}</span>
              </div>
            </div>
          </div>

          {/* Plan Distribution and Quick Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-xs md:col-span-2">
              <h3 className="text-sm font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100 flex items-center gap-1.5">
                <Award size={16} className="text-blue-600" /> Plan Distribution
              </h3>
              
              <div className="space-y-4">
                {stats.plan_distribution.map((p: any) => {
                  const percent = stats.total_users > 0 ? (p.count / stats.total_users) * 100 : 0;
                  
                  return (
                    <div key={p.plan} className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span className="capitalize">{p.plan.replace("_", " ")}</span>
                        <span>{p.count} users ({percent.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-1.5">
                <BarChart3 size={16} className="text-blue-600" /> Quick Stats Overview
              </h3>
              <div className="text-xs space-y-3.5">
                <div className="flex justify-between text-slate-500">
                  <span>Joined Users:</span>
                  <span className="font-bold text-slate-800">{stats.total_users}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Connected Meta profiles:</span>
                  <span className="font-bold text-slate-800">{stats.active_connections}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Active Addon Subscriptions:</span>
                  <span className="font-bold text-slate-800">{stats.total_addons_active}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Active Ad Accounts:</span>
                  <span className="font-bold text-slate-800">{stats.connected_ad_accounts}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Tracked Campaigns:</span>
                  <span className="font-bold text-slate-800">{stats.total_campaigns}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trial Funnel Analytics */}
          {stats.trial_stats && (
            <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-6 pb-3 border-b border-slate-100 flex items-center gap-1.5">
                <Sparkles size={16} className="text-blue-600" /> Trial Funnel & Conversion Analytics
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trials Started</div>
                  <div className="text-xl font-extrabold text-slate-900">{stats.trial_stats.trials_started}</div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-1">
                  <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Active Trials</div>
                  <div className="text-xl font-extrabold text-blue-800">{stats.trial_stats.trials_active}</div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-1">
                  <div className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Expiring Today</div>
                  <div className="text-xl font-extrabold text-amber-800">{stats.trial_stats.trials_expiring_today}</div>
                </div>

                <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Expired Trials</div>
                  <div className="text-xl font-extrabold text-slate-700">{stats.trial_stats.trials_expired}</div>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-1">
                  <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Trials Converted</div>
                  <div className="text-xl font-extrabold text-emerald-800">{stats.trial_stats.trials_converted}</div>
                </div>

                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1">
                  <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Conversion Rate</div>
                  <div className="text-xl font-extrabold text-indigo-800">{stats.trial_stats.trial_conversion_rate}%</div>
                </div>
              </div>
            </div>
          )}

          {/* AI Intelligence Subscriptions & Revenue Tracking */}
          <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-xs space-y-6">
            <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-1.5">
              <Brain size={16} className="text-indigo-600" /> AI Intelligence Subscriptions & Revenue Tracking
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Slots (Ind)</div>
                <div className="text-xl font-extrabold text-slate-900">{stats.ai_individual_active_count}</div>
              </div>

              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Active Workspace Plans (All)</div>
                <div className="text-xl font-extrabold text-indigo-800">{stats.ai_all_accounts_active_count}</div>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">AI MRR</div>
                <div className="text-xl font-extrabold text-emerald-800">
                  ₹{(stats.ai_total_revenue_monthly_paise / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              </div>

              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">AI Churned</div>
                <div className="text-xl font-extrabold text-rose-800">{stats.ai_churn_count}</div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Processing Cost</div>
                <div className="text-xl font-extrabold text-amber-800">
                  ₹{(stats.ai_processing_cost_paise_estimate / 100).toFixed(2)}
                </div>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Gross Margin</div>
                <div className="text-xl font-extrabold text-emerald-800">{stats.ai_gross_margin_percentage}%</div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 space-y-3">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>AI Revenue vs LLM Cost Breakdown</span>
                <span>Margin: {stats.ai_gross_margin_percentage}%</span>
              </div>
              <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden flex">
                <div 
                  className="bg-emerald-500 h-full rounded-l-full transition-all" 
                  style={{ width: `${stats.ai_total_revenue_monthly_paise > 0 ? ((stats.ai_total_revenue_monthly_paise - stats.ai_processing_cost_paise_estimate) / stats.ai_total_revenue_monthly_paise) * 100 : 100}%` }}
                />
                <div 
                  className="bg-amber-500 h-full rounded-r-full transition-all" 
                  style={{ width: `${stats.ai_total_revenue_monthly_paise > 0 ? (stats.ai_processing_cost_paise_estimate / stats.ai_total_revenue_monthly_paise) * 100 : 0}%` }}
                />
              </div>
              <div className="flex gap-4 text-[10px] text-slate-500 font-semibold pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs" />
                  Net Profit (₹{((stats.ai_total_revenue_monthly_paise - stats.ai_processing_cost_paise_estimate) / 100).toFixed(2)})
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-xs" />
                  LLM Infrastructure Cost (₹{(stats.ai_processing_cost_paise_estimate / 100).toFixed(2)})
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Users Management & Lookup */}
      {activeTab === "users" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User list table */}
          <div className="lg:col-span-2 bg-white border border-slate-150 shadow-xs rounded-2xl overflow-hidden self-start">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registered Users Directory</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left divide-y divide-slate-100">
                <thead className="bg-slate-50/50">
                  <tr className="text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="p-4">User</th>
                    <th className="p-4 text-center">Connected Accounts</th>
                    <th className="p-4">Active Plan</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {usersList.map((usr) => (
                    <tr 
                      key={usr.id} 
                      onClick={() => setSelectedUserId(usr.id)}
                      className={`hover:bg-slate-50 transition cursor-pointer ${
                        selectedUserId === usr.id ? "bg-blue-50/20" : ""
                      }`}
                    >
                      <td className="p-4">
                        <div className="font-bold text-sm text-slate-800">{usr.name || "DG User"}</div>
                        <div className="text-slate-400 font-bold truncate max-w-sm mt-0.5">{usr.email}</div>
                      </td>
                      <td className="p-4 text-center text-sm font-semibold">{usr.connected_accounts_count}</td>
                      <td className="p-4 capitalize">{usr.plan_id.replace("_", " ")}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                          usr.status === "active" ? "text-green-700 bg-green-50" : "text-rose-700 bg-rose-50"
                        }`}>
                          {usr.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Details Lookup View Panel */}
          <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-xs space-y-4 self-start min-h-[400px]">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-1.5">
              <UserIcon size={16} className="text-blue-600" /> Complete User Lookup
            </h3>

            {loadingDetails ? (
              <div className="py-24 text-center">
                <Loader2 className="animate-spin text-blue-600 mx-auto" size={24} />
                <span className="block text-xs text-slate-400 mt-2 font-medium">Fetching details...</span>
              </div>
            ) : !selectedUserId || !userDetails ? (
              <div className="py-24 text-center text-slate-400 text-xs italic">
                Select a user from the directory to review all details, connected pipelines, active add-ons, and campaigns.
              </div>
            ) : (
              <div className="space-y-6 text-left text-xs">
                {/* 1. Profile Overview */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase text-[10px] tracking-wider text-blue-600">Profile Details</h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-slate-500">
                      <span>Name:</span>
                      <span className="font-bold text-slate-800">{userDetails.user.name || "None"}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Email:</span>
                      <span className="font-bold text-slate-800 break-all">{userDetails.user.email}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Plan:</span>
                      <div className="flex items-center gap-1">
                        <select
                          disabled={actionLoading === userDetails.user.id}
                          value={userDetails.user.plan_id}
                          onChange={(e) => handlePlanOverride(userDetails.user.id, e.target.value)}
                          className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-slate-800 font-bold outline-none cursor-pointer text-[10px]"
                        >
                          <option value="starter">Starter (₹99)</option>
                          <option value="growth">Growth (₹999)</option>
                          <option value="pro">Pro (₹2,999)</option>
                          <option value="agency">Agency (₹4,999)</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Status:</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-[9px] ${
                          userDetails.user.status === "active" ? "text-green-700 bg-green-50" : "text-rose-700 bg-rose-50"
                        }`}>
                          {userDetails.user.status}
                        </span>
                        <button
                          disabled={actionLoading === userDetails.user.id}
                          onClick={() => handleStatusOverride(userDetails.user.id, userDetails.user.status)}
                          className="text-blue-600 font-bold hover:underline"
                        >
                          Toggle
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between text-slate-550">
                      <span>Credits:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-800 text-[11px]">{userDetails.user.credits || 0}</span>
                        <button
                          disabled={actionLoading === `credits_${userDetails.user.id}`}
                          onClick={() => {
                            const val = prompt("Enter new credits count:", (userDetails.user.credits || 0).toString());
                            if (val !== null) {
                              const parsed = parseInt(val, 10);
                              if (!isNaN(parsed)) {
                                handleCreditsOverride(userDetails.user.id, parsed);
                              }
                            }
                          }}
                          className="text-blue-600 font-bold hover:underline text-[9px] cursor-pointer"
                        >
                          Modify
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Joined:</span>
                      <span className="font-bold text-slate-800">{new Date(userDetails.user.created_at).toLocaleDateString()}</span>
                    </div>
                    {userDetails.user.deletion_scheduled_at && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 flex items-start gap-1">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
                        <div>
                          <span className="font-bold block">Scheduled Deletion</span>
                          <span className="text-[10px]">On: {new Date(userDetails.user.deletion_scheduled_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Meta Connections */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase text-[10px] tracking-wider text-blue-600">Meta Connections</h4>
                  {userDetails.connections.length === 0 ? (
                    <div className="text-slate-400 italic font-medium">No active Meta profiles connected.</div>
                  ) : (
                    userDetails.connections.map((c: any) => (
                      <div key={c.id} className="p-2.5 bg-slate-50 border border-slate-150 rounded-xl space-y-1.5">
                        <div className="flex justify-between text-slate-500">
                          <span>Meta User ID:</span>
                          <span className="font-bold text-slate-850 font-mono">{c.meta_user_id}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Status:</span>
                          <span className="font-bold text-slate-800 uppercase text-[9px]">{c.status}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Sync Status:</span>
                          <span className={`font-bold uppercase text-[9px] ${
                            c.last_sync_status === "success" ? "text-green-700" : "text-rose-700"
                          }`}>{c.last_sync_status || "None"}</span>
                        </div>
                        {c.last_sync_error && (
                          <div className="text-[9px] text-rose-600 leading-relaxed bg-rose-50/50 p-1.5 rounded border border-rose-100 break-words font-medium">
                            Error: {c.last_sync_error}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* 3. Meta Ad Accounts with INDUSTRY */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase text-[10px] tracking-wider text-blue-600">Connected Ad Accounts</h4>
                  {userDetails.ad_accounts.length === 0 ? (
                    <div className="text-slate-400 italic font-medium">No selected active ad accounts.</div>
                  ) : (
                    <div className="space-y-2">
                      {userDetails.ad_accounts.map((acc: any) => (
                        <div key={acc.id} className="p-2.5 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                          <div className="font-bold text-slate-850 truncate">{acc.account_name}</div>
                          <div className="text-[10px] text-slate-450 font-mono">ID: {acc.meta_account_id}</div>
                          <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                            <span>Currency: <span className="font-bold text-slate-700">{acc.currency}</span></span>
                            <span>Industry: <span className="font-bold text-blue-650 bg-blue-50 px-1.5 py-0.5 rounded uppercase text-[8px]">{acc.industry || "Not Specified"}</span></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Active Subscription Add-ons */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase text-[10px] tracking-wider text-blue-600">Active Addons</h4>
                  <div className="space-y-2">
                    {[
                      { id: "additional_account", name: "Additional Meta Ad Account" },
                      { id: "faster_sync", name: "Faster Sync (3-Hour)" },
                      { id: "lifetime_history_monthly", name: "Lifetime Historical Data (Monthly)" },
                      { id: "lifetime_history_annual", name: "Lifetime Historical Data (Annual)" },
                      { id: "ai_deep_analysis", name: "AI Deep Analysis" },
                      { id: "additional_team_member", name: "Additional Team Member" }
                    ].map((addon) => {
                      const activeRecord = userDetails.addons.find((a: any) => a.addon_id === addon.id);
                      const quantity = activeRecord ? activeRecord.quantity : 0;
                      
                      return (
                        <div key={addon.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-xl border border-slate-150 text-xs">
                          <div>
                            <div className="font-bold text-slate-800 text-[10px]">{addon.name}</div>
                            {quantity > 0 && activeRecord.expires_at && (
                              <div className="text-[8px] text-slate-400 mt-0.5">Expires: {new Date(activeRecord.expires_at).toLocaleDateString()}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {addon.id === "faster_sync" || addon.id === "ai_deep_analysis" ? (
                              <button
                                disabled={actionLoading === `addon_${addon.id}`}
                                onClick={() => handleAddonToggle(userDetails.user.id, addon.id, quantity === 0)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  quantity > 0 ? "bg-blue-600" : "bg-slate-200"
                                } ${actionLoading === `addon_${addon.id}` ? "opacity-50 cursor-not-allowed" : ""}`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    quantity > 0 ? "translate-x-4" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            ) : (
                              <>
                                <button
                                  disabled={quantity === 0 || actionLoading === `addon_${addon.id}`}
                                  onClick={() => handleAddonQtyChange(userDetails.user.id, addon.id, quantity, false)}
                                  className="w-5 h-5 bg-white border border-slate-200 rounded flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50 cursor-pointer text-xs"
                                >
                                  -
                                </button>
                                <span className="font-extrabold text-xs text-slate-900 bg-white min-w-6 text-center px-1.5 py-0.5 rounded border border-slate-200">
                                  {quantity}
                                </span>
                                <button
                                  disabled={actionLoading === `addon_${addon.id}`}
                                  onClick={() => handleAddonQtyChange(userDetails.user.id, addon.id, quantity, true)}
                                  className="w-5 h-5 bg-white border border-slate-200 rounded flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50 cursor-pointer text-xs"
                                >
                                  +
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Tracked Campaigns */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase text-[10px] tracking-wider text-blue-600">Sync Campaigns ({userDetails.campaigns.length})</h4>
                  {userDetails.campaigns.length === 0 ? (
                    <div className="text-slate-400 italic font-medium">No imported campaigns.</div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-150 rounded-xl overflow-hidden bg-slate-50">
                      {userDetails.campaigns.map((camp: any) => (
                        <div key={camp.id} className="p-2 flex items-center justify-between gap-2">
                          <div className="truncate pr-2 font-medium text-slate-800">{camp.name}</div>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            camp.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-slate-200 text-slate-600"
                          }`}>{camp.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 6. Raised Support Tickets */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase text-[10px] tracking-wider text-blue-600">Support Tickets Log</h4>
                  {userDetails.tickets.length === 0 ? (
                    <div className="text-slate-400 italic font-medium">No raised tickets.</div>
                  ) : (
                    <div className="space-y-2">
                      {userDetails.tickets.map((t: any) => (
                        <div key={t.id} className="p-2 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-800">{t.subject}</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              t.status === "resolved" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                            }`}>{t.status}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 leading-relaxed italic mt-1 bg-white p-1 rounded border border-slate-100">
                            "{t.description}"
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
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
