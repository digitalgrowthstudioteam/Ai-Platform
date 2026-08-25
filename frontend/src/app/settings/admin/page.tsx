"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
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
  Sliders,
} from "lucide-react";

export default function AdminPage() {
  const { user, loading: loadingAuth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"overview" | "users" | "tickets" | "ads_services" | "ads_orders">("overview");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["overview", "users", "tickets", "ads_services", "ads_orders"].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [ticketsList, setTicketsList] = useState<any[]>([]);
  const [adsRequestsList, setAdsRequestsList] = useState<any[]>([]);
  const [adsOrdersList, setAdsOrdersList] = useState<any[]>([]);

  // Ads Service filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Ads Orders filter states
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");

  // Selected ads service request
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [newRequestStatus, setNewRequestStatus] = useState("");
  const [newPartnerStatus, setNewPartnerStatus] = useState("");
  const [creditsToConsume, setCreditsToConsume] = useState(0);

  // Selected ads order row
  const [selectedOrderRowId, setSelectedOrderRowId] = useState<string | null>(null);
  const [leadStatus, setLeadStatus] = useState("");
  const [leadComment, setLeadComment] = useState("");

  // Ticket creation form from orders state
  const [showOrderTicketForm, setShowOrderTicketForm] = useState(false);
  const [orderTicketSubject, setOrderTicketSubject] = useState("");
  const [orderTicketDescription, setOrderTicketDescription] = useState("");
  const [orderTicketCategory, setOrderTicketCategory] = useState("General Support");

  // Email Quotation Modal State
  const [showEmailQuoteModal, setShowEmailQuoteModal] = useState(false);
  const [quoteEmail, setQuoteEmail] = useState("");
  const [quoteAdQty, setQuoteAdQty] = useState(5);
  const [quotePricePerAd, setQuotePricePerAd] = useState(799);
  const [quoteIncludeSetup, setQuoteIncludeSetup] = useState(true);
  const [quoteSetupPrice, setQuoteSetupPrice] = useState(1999);
  const [quoteIncludeCreative, setQuoteIncludeCreative] = useState(true);
  const [quoteCreativePrice, setQuoteCreativePrice] = useState(1499);
  const [quoteCustomItemName, setQuoteCustomItemName] = useState("");
  const [quoteCustomItemPrice, setQuoteCustomItemPrice] = useState(0);
  const [quoteValidityDays, setQuoteValidityDays] = useState(7);
  const [generatedQuoteLink, setGeneratedQuoteLink] = useState("");

  // Manual Order Creation State
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [orderEmail, setOrderEmail] = useState("");
  const [orderAdQty, setOrderAdQty] = useState(5);
  const [orderValidityDays, setOrderValidityDays] = useState(30);

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

  const handleRaiseQuotationByEmail = async () => {
    if (!quoteEmail) {
      setNotification({ type: "error", message: "Client email is required." });
      return;
    }
    try {
      setActionLoading("raise_quote_email");
      const res = await api.adminRaiseQuotation("00000000-0000-0000-0000-000000000000", {
        email: quoteEmail,
        number_of_ads: quoteAdQty,
        price_per_ad: quotePricePerAd,
        validity_days: quoteValidityDays,
        include_setup: quoteIncludeSetup,
        setup_price: quoteSetupPrice,
        include_creative: quoteIncludeCreative,
        creative_price: quoteCreativePrice,
        custom_item_name: quoteCustomItemName || undefined,
        custom_item_price: quoteCustomItemName ? quoteCustomItemPrice : undefined,
      });

      setNotification({
        type: "success",
        message: "Successfully generated quotation for the unregistered user!",
      });
      setGeneratedQuoteLink(res.quotation_link || "");
      
      // Reload request list to show the new request created
      const adsRes = await api.getAdminAdsServiceRequests();
      setAdsRequestsList(adsRes);
    } catch (err: any) {
      console.error(err);
      setNotification({
        type: "error",
        message: err.message || "Failed to generate quotation.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateManualOrder = async () => {
    if (!orderEmail) {
      setNotification({ type: "error", message: "Email address is required." });
      return;
    }
    setActionLoading("create_order");
    try {
      await api.adminCreateOrder({
        email: orderEmail,
        total_ad_credits: orderAdQty,
        validity_days: orderValidityDays,
      });
      setNotification({
        type: "success",
        message: "Successfully created manual ad order!",
      });
      setShowCreateOrderModal(false);
      setOrderEmail("");
      setOrderAdQty(5);
      setOrderValidityDays(30);
      // Reload orders list
      const ordersRes = await api.getAdminAdsServiceOrders();
      setAdsOrdersList(ordersRes);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to create manual ad order.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Check admin role
  const isAdmin = user?.email === "flasshgames2026@gmail.com" || user?.email === "digitalgrowthstudioteam@gmail.com";

  const loadAdminDashboard = async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const [statsRes, usersRes, ticketsRes, adsRes, ordersRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getAdminTickets(),
        api.getAdminAdsServiceRequests(),
        api.getAdminAdsServiceOrders(),
      ]);
      setStats(statsRes);
      setUsersList(usersRes);
      setTicketsList(ticketsRes);
      setAdsRequestsList(adsRes);
      setAdsOrdersList(ordersRes);
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

  const handleRaiseTicketFromOrder = async (userId: string, orderId: string) => {
    if (!orderTicketSubject || !orderTicketDescription) return;
    try {
      setActionLoading("raise_order_ticket");
      await api.adminRaiseTicket(userId, {
        subject: orderTicketSubject,
        description: orderTicketDescription,
        category: orderTicketCategory,
      });
      setNotification({
        type: "success",
        message: `Successfully raised support ticket for this client (Order ID: ${orderId.slice(0, 8)})!`,
      });
      setOrderTicketSubject("");
      setOrderTicketDescription("");
      setOrderTicketCategory("General Support");
      setShowOrderTicketForm(false);
      // Refresh tickets
      const updatedTickets = await api.getAdminTickets();
      setTicketsList(updatedTickets);
    } catch (err: any) {
      console.error("Failed to raise support ticket:", err);
      setNotification({ type: "error", message: err.message || "Failed to raise support ticket." });
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
         <button
          onClick={() => setActiveTab("ads_services")}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 px-1 ${
            activeTab === "ads_services" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400"
          }`}
        >
          Meta Ads Services (Quotations)
        </button>
        <button
          onClick={() => setActiveTab("ads_orders")}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 px-1 ${
            activeTab === "ads_orders" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400"
          }`}
        >
          Meta Ads Orders (Paid/Allotted)
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
        <div className="bg-white border border-slate-150 shadow-xs rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">Registered Users Directory</h3>
            <span className="text-[10px] text-slate-400 font-semibold font-sans">ⓘ Click on any user row to view details & overrides page.</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left divide-y divide-slate-100">
              <thead className="bg-slate-50/50">
                <tr className="text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 font-sans">
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
                    onClick={() => router.push(`/settings/admin/user?id=${usr.id}`)}
                    className="hover:bg-slate-50 transition cursor-pointer"
                  >
                    <td className="p-4">
                      <div className="font-bold text-sm text-slate-800">{usr.name || "DG User"}</div>
                      <div className="text-slate-400 font-bold truncate max-w-sm mt-0.5">{usr.email}</div>
                    </td>
                    <td className="p-4 text-center text-sm font-semibold font-sans">{usr.connected_accounts_count}</td>
                    <td className="p-4 capitalize">{usr.plan_id.replace("_", " ")}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] font-sans ${
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

      {/* TAB CONTENT: Meta Ads Services */}
      {activeTab === "ads_services" && (() => {
        const filteredAdsRequests = adsRequestsList.filter((r) => {
          const isQuotation = ["submitted", "quotation_generated", "cancelled"].includes(r.status);
          if (!isQuotation) return false;

          const matchSearch =
            r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.business_name.toLowerCase().includes(searchQuery.toLowerCase());

          if (statusFilter === "pending") {
            return matchSearch && r.status === "submitted";
          }
          if (statusFilter === "new") {
            return matchSearch && r.status === "quotation_generated";
          }
          if (statusFilter === "completed") {
            return matchSearch && r.status === "cancelled";
          }
          return matchSearch;
        });

        return (
          <div className="font-sans">
            {/* Requests List */}
            <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Megaphone size={16} className="text-blue-600" /> Service Setup Requests ({filteredAdsRequests.length})
                </h3>
                <button
                  onClick={() => {
                    setGeneratedQuoteLink("");
                    setQuoteEmail("");
                    setShowEmailQuoteModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-md shadow-blue-500/10"
                >
                  + Create Quotation by Email
                </button>
              </div>

              {/* Filters Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 border-b border-slate-100 font-sans">
                <input
                  type="text"
                  placeholder="Search by Order ID, Client, Business..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-blue-500 bg-slate-50/20"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                >
                  <option value="all">All Quotations</option>
                  <option value="new">Admin Generated (Pending Payment)</option>
                  <option value="pending">User Submitted (Pending Payment)</option>
                  <option value="completed">Cancelled Quotations</option>
                </select>
              </div>

              {filteredAdsRequests.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs italic">
                  No matching service requests found.
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {filteredAdsRequests.map((r) => (
                    <div 
                      key={r.id}
                      onClick={() => {
                        router.push(`/settings/admin/quotations/${r.id}`);
                      }}
                      className="p-4 border border-slate-150 bg-white rounded-xl hover:bg-slate-50/50 hover:border-slate-300 transition cursor-pointer text-left shadow-sm"
                    >
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-800">{r.business_name}</h4>
                          <p className="text-[10px] text-slate-450 font-bold mt-0.5">
                            ID: <span className="font-mono text-[9px]">{r.id}</span>
                          </p>
                          <p className="text-[10px] text-slate-450 font-bold">
                            Customer: {r.customer_name} ({r.customer_email}) | WhatsApp: {r.whatsapp_number || "N/A"}
                          </p>
                          <p className="text-[10px] text-slate-450 font-bold">
                            Industry: {r.industry === "Other" ? r.industry_other : r.industry}
                          </p>
                        </div>
                        <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          r.status === "restricted" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
                        }`}>
                          {r.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-500 font-bold">
                        <span>Partner Access: <b>{r.partner_access_status || "not_requested"}</b></span>
                        <span>Active Credits: <b>{r.remaining_credits} remaining</b></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {activeTab === "ads_orders" && (() => {
        const filteredAdsOrders = adsOrdersList.filter((o) => {
          const matchSearch =
            o.id.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
            o.customer_name.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
            o.customer_email.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
            o.business_name.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
            o.advertised_product.toLowerCase().includes(orderSearchQuery.toLowerCase());

          if (orderStatusFilter === "trial") {
            return matchSearch && o.status === "trial_started";
          }
          if (orderStatusFilter === "pending") {
            return matchSearch && ["whatsapp_pending", "whatsapp_connected"].includes(o.status);
          }
          if (orderStatusFilter === "live") {
            return matchSearch && ["campaign_setup", "campaign_live"].includes(o.status);
          }
          if (orderStatusFilter === "completed") {
            return matchSearch && o.status === "completed";
          }
          return matchSearch;
        });

        const selectedOrder = adsOrdersList.find((o) => o.id === selectedOrderRowId);

        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans text-left">
            {/* Orders List */}
            <div className="lg:col-span-2 bg-white border border-slate-150 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Megaphone size={16} className="text-blue-600" /> Active Service Orders ({filteredAdsOrders.length})
                </h3>
                <button
                  onClick={() => {
                    setOrderEmail("");
                    setOrderAdQty(5);
                    setOrderValidityDays(30);
                    setShowCreateOrderModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  + Create Manual Order
                </button>
              </div>

              {/* Filters Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 border-b border-slate-100">
                <input
                  type="text"
                  placeholder="Search by Order ID, Client, Product..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-blue-500 bg-slate-50/20"
                />
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                >
                  <option value="all">All Orders</option>
                  <option value="trial">Trial Active</option>
                  <option value="pending">Pending Setup (WhatsApp/Access)</option>
                  <option value="live">Live Campaigns</option>
                  <option value="completed">Completed Deliverables</option>
                </select>
              </div>

              {filteredAdsOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs italic">
                  No active service orders found.
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {filteredAdsOrders.map((o) => {
                    const isSetup = o.order_type === "addon_setup";
                    const isCreative = o.order_type === "addon_creative";
                    return (
                      <div
                        key={o.id}
                        onClick={() => {
                          setSelectedOrderRowId(o.id);
                          setNewRequestStatus(o.status);
                          setNewPartnerStatus(o.partner_access_status || "not_requested");
                          setLeadStatus(o.status);
                          setLeadComment("");
                          setCreditsToConsume(0);
                          setShowOrderTicketForm(false);
                        }}
                        className={`p-4 border rounded-xl hover:bg-slate-50/50 transition cursor-pointer text-left ${
                          selectedOrderRowId === o.id ? "border-blue-500 bg-blue-50/5" : "border-slate-150 bg-white"
                        }`}
                      >
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-xs text-slate-800">{o.business_name}</h4>
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md ${
                                isSetup ? "bg-purple-50 text-purple-700" : isCreative ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"
                              }`}>
                                {isSetup ? "Setup Service" : isCreative ? "Creative Service" : "Ad Campaign"}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-650 font-extrabold mt-1">
                              {o.advertised_product}
                            </p>
                            <p className="text-[10px] text-slate-450 font-bold mt-0.5">
                              ID: <span className="font-mono text-[9px]">{o.id}</span>
                            </p>
                            <p className="text-[10px] text-slate-450 font-bold">
                              Customer: {o.customer_name} ({o.customer_email}) | WhatsApp: {o.whatsapp_number}
                            </p>
                          </div>
                          <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                            o.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                          }`}>
                            {o.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-500 font-bold">
                          <span>Partner Access: <b>{o.partner_access_status || "not_requested"}</b></span>
                          {!isSetup && !isCreative && (
                            <span>Credits remaining: <b>{o.number_of_ads}</b></span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Order Details Panel */}
            <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-xs h-fit space-y-5">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-1.5">
                <ShieldAlert size={16} className="text-blue-600" /> Order Controls
              </h3>

              <div className="space-y-4">
                {selectedOrder ? (() => {
                  const isSetup = selectedOrder.order_type === "addon_setup";
                  const isCreative = selectedOrder.order_type === "addon_creative";
                  const isManual = selectedOrder.order_type === "manual_ad";

                  if (isManual) {
                    return (
                      <div className="space-y-4 font-sans text-xs text-left">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Selected Deliverable</div>
                          <div className="font-extrabold text-slate-800 text-sm mt-1">{selectedOrder.advertised_product}</div>
                          <div className="text-[10px] text-slate-450 font-bold mt-1">
                            Client: {selectedOrder.customer_email}
                          </div>
                        </div>

                        <hr className="border-slate-100" />

                        <div className="p-4 bg-blue-50/20 border border-blue-100 rounded-xl space-y-2 text-slate-600">
                          <p className="font-bold text-[10.5px] text-blue-800">Manual Allotment Order</p>
                          <p className="text-[10px] leading-relaxed text-slate-500">
                            This order represents a manual ad credit allotment raised directly by the Super Admin.
                          </p>
                        </div>

                        {/* Individual Lead Status Updates */}
                        <div className="space-y-3.5 pt-4 border-t border-slate-100 text-left">
                          <label className="text-[10.5px] font-bold text-slate-550 uppercase tracking-wide block">
                            Individual Lead Status Management
                          </label>
                          <p className="text-[10px] text-slate-450 font-bold leading-relaxed">
                            Update the operational progress for this specific ad order/deliverable. This status is visible to the customer.
                          </p>
                          
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Lead Status</label>
                            <select
                              value={leadStatus}
                              onChange={(e) => setLeadStatus(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                            >
                              <option value="whatsapp_pending">WhatsApp Pending</option>
                              <option value="ready_for_setup">Ready for Setup</option>
                              <option value="ads_initiated">Ads Initiated</option>
                              <option value="completed">Completed</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Status Comment</label>
                            <textarea
                              rows={2}
                              placeholder="Add a log comment for the customer..."
                              value={leadComment}
                              onChange={(e) => setLeadComment(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/10 font-bold focus:ring-1 focus:ring-blue-500"
                            />
                          </div>

                          <button
                            onClick={async () => {
                              if (!leadStatus) return;
                              setActionLoading("update_lead_status");
                              try {
                                await api.updateIndividualOrderStatus(selectedOrder.id, leadStatus, leadComment);
                                setNotification({
                                  type: "success",
                                  message: "Updated individual lead status and comment successfully!",
                                });
                                setLeadComment("");
                                // Reload
                                const [ordersRes, requestsRes] = await Promise.all([
                                  api.getAdminAdsServiceOrders(),
                                  api.getAdminAdsServiceRequests(),
                                ]);
                                setAdsOrdersList(ordersRes);
                                setAdsRequestsList(requestsRes);
                              } catch (err: any) {
                                setNotification({
                                  type: "error",
                                  message: err.message || "Failed to update lead status.",
                                });
                              } finally {
                                setActionLoading(null);
                              }
                            }}
                            disabled={actionLoading === "update_lead_status"}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition text-[11px] uppercase tracking-wide cursor-pointer disabled:opacity-50"
                          >
                            {actionLoading === "update_lead_status" ? "Saving..." : "Update Lead Status"}
                          </button>
                        </div>

                        {/* Timeline/History Logs */}
                        {selectedOrder.history && selectedOrder.history.length > 0 && (
                          <div className="pt-4 border-t border-slate-100 text-left space-y-3">
                            <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wide block">
                              Lead Status History Log
                            </label>
                            <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                              {selectedOrder.history.map((h: any, idx: number) => (
                                <div key={idx} className="flex gap-2.5 items-start text-[11px] leading-relaxed text-slate-600 border-l-2 border-blue-500 pl-3">
                                  <div className="space-y-0.5">
                                    <div className="flex gap-2 items-center flex-wrap">
                                      <span className="font-extrabold text-[10px] text-blue-600 uppercase">
                                        {h.status.replace(/_/g, " ")}
                                      </span>
                                      <span className="text-[9px] text-slate-400 font-bold">
                                        {new Date(h.updated_at).toLocaleString()}
                                      </span>
                                    </div>
                                    {h.comment && (
                                      <p className="text-[10.5px] font-medium text-slate-700 italic">
                                        "{h.comment}"
                                      </p>
                                    )}
                                    <p className="text-[9px] text-slate-400 font-medium">
                                      By: {h.updated_by}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4 font-sans text-xs">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Selected Deliverable</div>
                        <div className="font-extrabold text-slate-800 text-sm mt-1">{selectedOrder.advertised_product}</div>
                        <div className="text-[10px] text-slate-450 font-bold mt-1">
                          Client Profile: {selectedOrder.customer_name} ({selectedOrder.customer_email})
                        </div>
                      </div>

                      <hr className="border-slate-100" />

                      {/* Status Override */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-550 uppercase block text-left">Update Parent Service Status</label>
                        <select
                          value={newRequestStatus}
                          onChange={(e) => setNewRequestStatus(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                        >
                          <option value="whatsapp_pending">WhatsApp Connected (Pending)</option>
                          <option value="whatsapp_connected">WhatsApp Connected (Connected)</option>
                          <option value="partner_access_requested">Partner Access Requested</option>
                          <option value="partner_access_granted">Partner Access Granted</option>
                          <option value="campaign_setup">Campaign Setup In-Progress</option>
                          <option value="campaign_live">Campaign Live & Active</option>
                          <option value="completed">All Deliverables Completed</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-555 uppercase block text-left">Partner Access Override</label>
                        <select
                          value={newPartnerStatus}
                          onChange={(e) => setNewPartnerStatus(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                        >
                          <option value="not_requested">Not Requested</option>
                          <option value="requested">Requested</option>
                          <option value="granted">Granted</option>
                        </select>
                      </div>

                      <button
                        onClick={async () => {
                          setActionLoading("update_order_status");
                          try {
                            await api.adminUpdateAdsServiceRequest(selectedOrder.parent_request_id, {
                              status: newRequestStatus,
                              partner_access_status: newPartnerStatus,
                            });
                            setNotification({
                              type: "success",
                              message: "Updated order delivery statuses successfully!",
                            });
                            // Reload stats & orders list
                            const [ordersRes, requestsRes] = await Promise.all([
                              api.getAdminAdsServiceOrders(),
                              api.getAdminAdsServiceRequests(),
                            ]);
                            setAdsOrdersList(ordersRes);
                            setAdsRequestsList(requestsRes);
                          } catch (err: any) {
                            setNotification({
                              type: "error",
                              message: err.message || "Failed to update statuses.",
                            });
                          } finally {
                            setActionLoading(null);
                          }
                        }}
                        disabled={actionLoading === "update_order_status"}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition text-[11px] uppercase tracking-wide cursor-pointer disabled:opacity-50"
                      >
                        {actionLoading === "update_order_status" ? "Saving..." : "Apply Status Updates"}
                      </button>

                      <hr className="border-slate-100" />

                      {/* Consume AdPack Credits (only for active ad campaigns) */}
                      {!isSetup && !isCreative && (
                        <>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-555 uppercase block text-left">Record Ad Credit Consumption</label>
                            <p className="text-[10px] text-slate-440 font-bold text-left mt-1">
                              Record when an ad from this allotment runs out or is completed. This consumes 1 credit.
                            </p>
                            <div className="flex gap-2 items-center">
                              <input
                                type="number"
                                min={1}
                                max={selectedOrder.number_of_ads}
                                value={creditsToConsume}
                                onChange={(e) => setCreditsToConsume(parseInt(e.target.value) || 0)}
                                className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold"
                              />
                              <button
                                onClick={async () => {
                                  if (creditsToConsume <= 0) return;
                                  setActionLoading("consume_order_credits");
                                  try {
                                    await api.adminUpdateAdsServiceRequest(selectedOrder.parent_request_id, {
                                      consume_credits: creditsToConsume,
                                    });
                                    setNotification({
                                      type: "success",
                                      message: `Successfully recorded consumption of ${creditsToConsume} ad credits.`,
                                    });
                                    setCreditsToConsume(0);
                                    // Reload
                                    const [ordersRes, requestsRes] = await Promise.all([
                                      api.getAdminAdsServiceOrders(),
                                      api.getAdminAdsServiceRequests(),
                                    ]);
                                    setAdsOrdersList(ordersRes);
                                    setAdsRequestsList(requestsRes);
                                  } catch (err: any) {
                                    setNotification({
                                      type: "error",
                                      message: err.message || "Failed to consume credits.",
                                    });
                                  } finally {
                                    setActionLoading(null);
                                  }
                                }}
                                disabled={actionLoading === "consume_order_credits" || creditsToConsume <= 0}
                                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 rounded-lg text-[10px] uppercase font-sans tracking-wide cursor-pointer disabled:opacity-50"
                              >
                                {actionLoading === "consume_order_credits" ? "Processing..." : "Consume Credits"}
                              </button>
                            </div>
                          </div>
                          <hr className="border-slate-100" />
                        </>
                      )}

                      {/* Individual Lead Status Updates */}
                      <div className="space-y-3.5 pt-4 border-t border-slate-100 text-left">
                        <label className="text-[10.5px] font-bold text-slate-550 uppercase tracking-wide block">
                          Individual Lead Status Management
                        </label>
                        <p className="text-[10px] text-slate-450 font-bold leading-relaxed">
                          Update the operational progress for this specific ad order/deliverable. This status is visible to the customer.
                        </p>
                        
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Lead Status</label>
                          <select
                            value={leadStatus}
                            onChange={(e) => setLeadStatus(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                          >
                            <option value="whatsapp_pending">WhatsApp Pending</option>
                            <option value="ready_for_setup">Ready for Setup</option>
                            <option value="ads_initiated">Ads Initiated</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Status Comment</label>
                          <textarea
                            rows={2}
                            placeholder="Add a log comment for the customer..."
                            value={leadComment}
                            onChange={(e) => setLeadComment(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/10 font-bold focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <button
                          onClick={async () => {
                            if (!leadStatus) return;
                            setActionLoading("update_lead_status");
                            try {
                              await api.updateIndividualOrderStatus(selectedOrder.id, leadStatus, leadComment);
                              setNotification({
                                type: "success",
                                message: "Updated individual lead status and comment successfully!",
                              });
                              setLeadComment("");
                              // Reload
                              const [ordersRes, requestsRes] = await Promise.all([
                                api.getAdminAdsServiceOrders(),
                                api.getAdminAdsServiceRequests(),
                              ]);
                              setAdsOrdersList(ordersRes);
                              setAdsRequestsList(requestsRes);
                            } catch (err: any) {
                              setNotification({
                                type: "error",
                                message: err.message || "Failed to update lead status.",
                              });
                            } finally {
                              setActionLoading(null);
                            }
                          }}
                          disabled={actionLoading === "update_lead_status"}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition text-[11px] uppercase tracking-wide cursor-pointer disabled:opacity-50"
                        >
                          {actionLoading === "update_lead_status" ? "Saving..." : "Update Lead Status"}
                        </button>
                      </div>

                      {/* Timeline/History Logs */}
                      {selectedOrder.history && selectedOrder.history.length > 0 && (
                        <div className="pt-4 border-t border-slate-100 text-left space-y-3">
                          <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wide block">
                            Lead Status History Log
                          </label>
                          <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                            {selectedOrder.history.map((h: any, idx: number) => (
                              <div key={idx} className="flex gap-2.5 items-start text-[11px] leading-relaxed text-slate-600 border-l-2 border-blue-500 pl-3">
                                <div className="space-y-0.5">
                                  <div className="flex gap-2 items-center flex-wrap">
                                    <span className="font-extrabold text-[10px] text-blue-600 uppercase">
                                      {h.status.replace(/_/g, " ")}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-bold">
                                      {new Date(h.updated_at).toLocaleString()}
                                    </span>
                                  </div>
                                  {h.comment && (
                                    <p className="text-[10.5px] font-medium text-slate-700 italic">
                                      "{h.comment}"
                                    </p>
                                  )}
                                  <p className="text-[9px] text-slate-400 font-medium">
                                    By: {h.updated_by}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <hr className="border-slate-100" />

                      {/* Ticket Raising Section */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-550 uppercase">Support Communications</span>
                          <button
                            type="button"
                            onClick={() => setShowOrderTicketForm(!showOrderTicketForm)}
                            className="text-blue-600 hover:text-blue-700 font-extrabold text-[10px] uppercase"
                          >
                            {showOrderTicketForm ? "Cancel" : "Raise Support Ticket"}
                          </button>
                        </div>

                        {showOrderTicketForm && (
                          <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-150 text-left">
                            <div>
                              <label className="text-[9px] font-bold text-slate-450 uppercase block mb-1">Ticket Subject</label>
                              <input
                                type="text"
                                placeholder="e.g. Meta pixel integration required"
                                value={orderTicketSubject}
                                onChange={(e) => setOrderTicketSubject(e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[10px] bg-white font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-450 uppercase block mb-1 font-sans">Detailed Issue Description</label>
                              <textarea
                                rows={3}
                                placeholder="Describe details, next actions, or requirements..."
                                value={orderTicketDescription}
                                onChange={(e) => setOrderTicketDescription(e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[10px] bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-450 uppercase block mb-1">Communication Category</label>
                              <select
                                value={orderTicketCategory}
                                onChange={(e) => setOrderTicketCategory(e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[10px] bg-white font-bold"
                              >
                                <option value="General Support">General Support</option>
                                <option value="Billing Issue">Billing Issue</option>
                                <option value="Meta Ads Sync">Meta Ads Sync</option>
                                <option value="AI Recommendations">AI Recommendations</option>
                              </select>
                            </div>
                            <button
                              type="button"
                              disabled={actionLoading === "raise_order_ticket" || !orderTicketSubject || !orderTicketDescription}
                              onClick={() => {
                                if (selectedOrder.user_id) {
                                  handleRaiseTicketFromOrder(selectedOrder.user_id, selectedOrder.parent_request_id);
                                }
                              }}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded-lg transition disabled:opacity-50 text-[10px] uppercase font-sans tracking-wide cursor-pointer"
                            >
                              {actionLoading === "raise_order_ticket" ? "Raising Ticket..." : "Submit Support Ticket"}
                            </button>
                          </div>
                        )}
                      </div>

                      <hr className="border-slate-100" />

                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm("Are you sure you want to delete this order? All associated service request and ad packages will be permanently deleted. This action cannot be undone.")) return;
                          setActionLoading("delete_order");
                          try {
                            await api.adminDeleteOrder(selectedOrder.id);
                            setNotification({
                              type: "success",
                              message: "Successfully deleted order and its associated data.",
                            });
                            // Reload
                            const [ordersRes, requestsRes] = await Promise.all([
                              api.getAdminAdsServiceOrders(),
                              api.getAdminAdsServiceRequests(),
                            ]);
                            setAdsOrdersList(ordersRes);
                            setAdsRequestsList(requestsRes);
                            setSelectedOrderRowId(null);
                          } catch (err: any) {
                            setNotification({
                              type: "error",
                              message: err.message || "Failed to delete order.",
                            });
                          } finally {
                            setActionLoading(null);
                          }
                        }}
                        disabled={actionLoading !== null}
                        className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold py-2.5 rounded-xl transition text-[11px] uppercase tracking-wide cursor-pointer disabled:opacity-50"
                      >
                        Delete Service Order
                      </button>
                    </div>
                  );
                })() : (
                  <div className="py-12 text-slate-400 text-xs italic text-center">
                    Select a service order to inspect details.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Create Quotation by Email Modal */}
      {showEmailQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-205">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Sparkles size={16} className="text-blue-600" /> Raise Quotation by Email
              </h3>
              <button
                onClick={() => setShowEmailQuoteModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs font-sans text-left">
              {!generatedQuoteLink ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Client Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. client@example.com"
                      value={quoteEmail}
                      onChange={(e) => setQuoteEmail(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs bg-white font-bold text-slate-800"
                    />
                    <span className="text-[9px] text-slate-400 block font-medium">If the user is not registered, a placeholder account will be created. They must register/login with this exact email to see and pay the quotation.</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Quantity of Ads</label>
                      <input
                        type="number"
                        min={1}
                        value={quoteAdQty}
                        onChange={(e) => setQuoteAdQty(parseInt(e.target.value) || 1)}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs bg-white font-bold text-slate-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Price Per Ad (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={quotePricePerAd}
                        onChange={(e) => setQuotePricePerAd(parseInt(e.target.value) || 0)}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs bg-white font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quoteIncludeSetup}
                        onChange={(e) => setQuoteIncludeSetup(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      Include Ad Account Setup Services
                    </label>

                    {quoteIncludeSetup && (
                      <div className="space-y-1 pl-6">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Setup Services Price (₹)</label>
                        <input
                          type="number"
                          min={0}
                          value={quoteSetupPrice}
                          onChange={(e) => setQuoteSetupPrice(parseInt(e.target.value) || 0)}
                          className="w-full max-w-[200px] border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs bg-white font-bold text-slate-800"
                        />
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quoteIncludeCreative}
                        onChange={(e) => setQuoteIncludeCreative(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      Include Creative Design Services
                    </label>

                    {quoteIncludeCreative && (
                      <div className="space-y-1 pl-6">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Creative Services Price (₹)</label>
                        <input
                          type="number"
                          min={0}
                          value={quoteCreativePrice}
                          onChange={(e) => setQuoteCreativePrice(parseInt(e.target.value) || 0)}
                          className="w-full max-w-[200px] border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs bg-white font-bold text-slate-800"
                        />
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Custom Item Name (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Extra Landing Page Design"
                        value={quoteCustomItemName}
                        onChange={(e) => setQuoteCustomItemName(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs bg-white font-bold text-slate-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Custom Item Price (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={quoteCustomItemPrice}
                        onChange={(e) => setQuoteCustomItemPrice(parseInt(e.target.value) || 0)}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs bg-white font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Quote Validity (Days)</label>
                      <input
                        type="number"
                        min={1}
                        value={quoteValidityDays}
                        onChange={(e) => setQuoteValidityDays(parseInt(e.target.value) || 7)}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs bg-white font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 flex justify-end gap-3">
                    <button
                      onClick={() => setShowEmailQuoteModal(false)}
                      className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold px-4 py-2 rounded-xl text-[11px] uppercase tracking-wide transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRaiseQuotationByEmail}
                      disabled={actionLoading === "raise_quote_email" || !quoteEmail}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-[11px] uppercase tracking-wide transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      {actionLoading === "raise_quote_email" && <Loader2 size={12} className="animate-spin" />}
                      Generate Quotation
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4 py-3 text-center">
                  <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 border border-emerald-100 mb-2">
                    <CheckCircle size={24} />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">Quotation Raised Successfully!</h4>
                  <p className="text-slate-500 text-xs">A pending quotation has been created in the database for <strong>{quoteEmail}</strong>.</p>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Shareable Payment Link</span>
                    <input
                      type="text"
                      readOnly
                      value={generatedQuoteLink}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-blue-600 font-bold outline-none select-all"
                    />
                  </div>

                  <div className="flex justify-center gap-3 pt-3">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedQuoteLink);
                        setNotification({ type: "success", message: "Quotation link copied to clipboard!" });
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-[11px] uppercase tracking-wide transition cursor-pointer"
                    >
                      Copy Link
                    </button>
                    <button
                      onClick={() => setShowEmailQuoteModal(false)}
                      className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold px-4 py-2.5 rounded-xl text-[11px] uppercase tracking-wide transition cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Manual Order Modal */}
      {showCreateOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-205">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Megaphone size={16} className="text-blue-600" /> Create Manual Order
              </h3>
              <button
                onClick={() => setShowCreateOrderModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-xs font-sans text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Client Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. client@example.com"
                  value={orderEmail}
                  onChange={(e) => setOrderEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs bg-white font-bold text-slate-800"
                />
                <span className="text-[9px] text-slate-400 block font-medium">
                  If the client email does not exist, a placeholder account will be created.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Number of Ads</label>
                  <input
                    type="number"
                    min={1}
                    value={orderAdQty}
                    onChange={(e) => setOrderAdQty(parseInt(e.target.value) || 1)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs bg-white font-bold text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-550 uppercase">Validity (Days)</label>
                  <input
                    type="number"
                    min={1}
                    value={orderValidityDays}
                    onChange={(e) => setOrderValidityDays(parseInt(e.target.value) || 30)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs bg-white font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 font-sans">
                <button
                  onClick={() => setShowCreateOrderModal(false)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-650 font-bold px-4 py-2 rounded-xl text-[11px] uppercase tracking-wide cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateManualOrder}
                  disabled={actionLoading === "create_order"}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl text-[11px] uppercase tracking-wide cursor-pointer transition disabled:opacity-50"
                >
                  {actionLoading === "create_order" ? "Creating..." : "Create Order"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
