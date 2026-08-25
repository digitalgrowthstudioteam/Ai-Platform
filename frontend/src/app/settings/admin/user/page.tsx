"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  ChevronLeft,
  Loader2,
  Mail,
  User as UserIcon,
  MessageSquare,
  ShieldAlert,
  Calendar,
  CreditCard,
  Sliders,
  CheckCircle,
  Database,
  Brain,
} from "lucide-react";

function AdminUserDetailContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("id") as string;
  const router = useRouter();
  const { user, loading: loadingAuth } = useAuth();

  const [userDetails, setUserDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [addPackForm, setAddPackForm] = useState({ show: false, quantity: 1, validityDays: 30 });
  const [quoteForm, setQuoteForm] = useState({
    show: false,
    numberOfAds: 5,
    pricePerAd: 799,
    validityDays: 30,
    includeSetup: false,
    setupPrice: 1999,
    includeCreative: false,
    creativePrice: 1499,
    customItemName: "",
    customItemPrice: 0,
  });
  const [ticketForm, setTicketForm] = useState({
    show: false,
    subject: "",
    description: "",
    category: "General Support",
  });

  // Check admin role
  const isAdmin = user?.email === "flasshgames2026@gmail.com" || user?.email === "digitalgrowthstudioteam@gmail.com" || user?.email === "vikramrwadkar@gmail.com";

  const fetchUserDetails = async () => {
    if (!userId || !isAdmin) return;
    try {
      setLoading(true);
      const details = await api.getAdminUserDetails(userId);
      setUserDetails(details);
    } catch (err: any) {
      console.error("Failed to load user details:", err);
      setNotification({ type: "error", message: err.message || "Failed to load user details." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loadingAuth) {
      if (user && !isAdmin) {
        router.push("/");
      } else if (user && isAdmin) {
        fetchUserDetails();
      }
    }
  }, [user, loadingAuth, userId]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Handlers
  const handlePlanOverride = async (newPlanId: string) => {
    try {
      setActionLoading("plan");
      await api.updateUserPlan(userId, newPlanId);
      setNotification({
        type: "success",
        message: `Plan overridden successfully to ${newPlanId.toUpperCase()}.`,
      });
      await fetchUserDetails();
    } catch (err: any) {
      console.error("Failed to override plan:", err);
      setNotification({ type: "error", message: err.message || "Failed to update user plan." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusOverride = async (currentStatus: string) => {
    try {
      setActionLoading("status");
      const nextStatus = currentStatus === "active" ? "suspended" : "active";
      await api.updateUserStatus(userId, nextStatus);
      setNotification({
        type: "success",
        message: `User status overridden successfully to ${nextStatus.toUpperCase()}.`,
      });
      await fetchUserDetails();
    } catch (err: any) {
      console.error("Failed to override status:", err);
      setNotification({ type: "error", message: err.message || "Failed to update user status." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreditsOverride = async (credits: number) => {
    try {
      setActionLoading("credits");
      await api.updateUserCredits(userId, credits);
      setNotification({
        type: "success",
        message: `User ad-optimization credits updated to ${credits}.`,
      });
      await fetchUserDetails();
    } catch (err: any) {
      console.error("Failed to override credits:", err);
      setNotification({ type: "error", message: err.message || "Failed to update user credits." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddonQtyChange = async (addonId: string, currentQty: number, increment: boolean) => {
    try {
      setActionLoading(`addon_${addonId}`);
      const newQty = increment ? currentQty + 1 : Math.max(0, currentQty - 1);
      await api.updateUserAddons(userId, addonId, newQty);
      setNotification({
        type: "success",
        message: `Addon quantity updated successfully to ${newQty}.`,
      });
      await fetchUserDetails();
    } catch (err: any) {
      console.error("Failed to update addon:", err);
      setNotification({ type: "error", message: "Failed to update addon quantity." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddonToggle = async (addonId: string, enabled: boolean) => {
    try {
      setActionLoading(`addon_${addonId}`);
      const newQty = enabled ? 1 : 0;
      await api.updateUserAddons(userId, addonId, newQty);
      setNotification({
        type: "success",
        message: `Addon status updated successfully.`,
      });
      await fetchUserDetails();
    } catch (err: any) {
      console.error("Failed to update addon:", err);
      setNotification({ type: "error", message: "Failed to toggle user addon." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddAdPack = async () => {
    if (addPackForm.quantity <= 0) return;
    try {
      setActionLoading("adpack");
      await api.updateUserAdPacks(
        userId,
        `manual_qty_${addPackForm.quantity}`,
        addPackForm.quantity,
        0,
        addPackForm.quantity
      );
      setNotification({
        type: "success",
        message: `Successfully provisioned ${addPackForm.quantity} ads to user.`,
      });
      setAddPackForm({ show: false, quantity: 1, validityDays: 30 });
      await fetchUserDetails();
    } catch (err: any) {
      console.error("Failed to add ad pack:", err);
      setNotification({ type: "error", message: err.message || "Failed to add ad quantity." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveAdPacks = async () => {
    if (!confirm("Are you sure you want to remove all active ad quantities for this user?")) return;
    try {
      setActionLoading("adpack");
      await api.updateUserAdPacks(userId, "remove", 0, 0, 0);
      setNotification({
        type: "success",
        message: "Successfully removed all active ad quantities.",
      });
      await fetchUserDetails();
    } catch (err: any) {
      console.error("Failed to remove ad packs:", err);
      setNotification({ type: "error", message: err.message || "Failed to remove ad quantities." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleIntroOffer = async () => {
    try {
      setActionLoading("intro_offer");
      const isCurrentlyActive = userDetails.user.intro_offer_eligible && !userDetails.user.intro_offer_used;
      if (isCurrentlyActive) {
        // Turn OFF — disable eligibility
        await api.updateUserIntroOffer(userId, false, undefined);
      } else {
        // Turn ON — enable eligibility and reset used flag
        await api.updateUserIntroOffer(userId, true, false);
      }
      setNotification({ type: "success", message: "₹333 promo offer status updated." });
      await fetchUserDetails();
    } catch (err: any) {
      console.error("Failed to toggle intro offer:", err);
      setNotification({ type: "error", message: err.message || "Failed to update promo offer." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRaiseQuotation = async () => {
    try {
      setActionLoading("raise_quote");
      await api.adminRaiseQuotation(userId, {
        number_of_ads: quoteForm.numberOfAds,
        price_per_ad: quoteForm.pricePerAd,
        validity_days: quoteForm.validityDays,
        include_setup: quoteForm.includeSetup,
        setup_price: quoteForm.setupPrice,
        include_creative: quoteForm.includeCreative,
        creative_price: quoteForm.creativePrice,
        custom_item_name: quoteForm.customItemName || null,
        custom_item_price: quoteForm.customItemName ? quoteForm.customItemPrice : null,
      });
      setNotification({
        type: "success",
        message: "Successfully generated and sent quotation to the user!",
      });
      setQuoteForm({
        show: false,
        numberOfAds: 5,
        pricePerAd: 799,
        validityDays: 30,
        includeSetup: false,
        setupPrice: 1999,
        includeCreative: false,
        creativePrice: 1499,
        customItemName: "",
        customItemPrice: 0,
      });
      await fetchUserDetails();
    } catch (err: any) {
      console.error("Failed to raise quote:", err);
      setNotification({ type: "error", message: err.message || "Failed to raise quotation." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRaiseTicket = async () => {
    if (!ticketForm.subject || !ticketForm.description) return;
    try {
      setActionLoading("raise_ticket");
      await api.adminRaiseTicket(userId, {
        subject: ticketForm.subject,
        description: ticketForm.description,
        category: ticketForm.category,
      });
      setNotification({
        type: "success",
        message: "Successfully raised support ticket for the user!",
      });
      setTicketForm({
        show: false,
        subject: "",
        description: "",
        category: "General Support",
      });
      await fetchUserDetails();
    } catch (err: any) {
      console.error("Failed to raise ticket:", err);
      setNotification({ type: "error", message: err.message || "Failed to raise support ticket." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateAdServiceRequest = async (requestId: string, currentStatus: string, currentServices: string[]) => {
    try {
      const newStatus = prompt("Enter new request status (e.g. whatsapp_pending, campaign_setup, campaign_live, restricted, eligible, completed):", currentStatus);
      if (newStatus === null) return;

      const servicesStr = prompt("Enter comma-separated additional services to include:", currentServices.join(", "));
      if (servicesStr === null) return;
      const newServices = servicesStr.split(",").map(s => s.trim()).filter(s => s.length > 0);

      setActionLoading(`req_${requestId}`);
      await api.updateUserAdServiceRequest(userId, requestId, newStatus || undefined, newServices);
      setNotification({
        type: "success",
        message: "Successfully updated Meta Ads service request.",
      });
      await fetchUserDetails();
    } catch (err: any) {
      console.error("Failed to update service request:", err);
      setNotification({ type: "error", message: err.message || "Failed to update service request." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAdServiceRequest = async (requestId: string) => {
    if (!confirm("Are you sure you want to delete this ad onboarding request?")) return;
    try {
      setActionLoading(`req_${requestId}`);
      await api.deleteUserAdServiceRequest(userId, requestId);
      setNotification({
        type: "success",
        message: "Successfully deleted ads service request.",
      });
      await fetchUserDetails();
    } catch (err: any) {
      console.error("Failed to delete service request:", err);
      setNotification({ type: "error", message: err.message || "Failed to delete service request." });
    } finally {
      setActionLoading(null);
    }
  };

  if (loadingAuth || (user && isAdmin && loading)) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />
          <span className="block mt-2 text-sm text-slate-500 font-medium">Loading user console details...</span>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="p-8 text-center bg-slate-50 min-h-screen">
        <ShieldAlert className="mx-auto text-rose-500 mb-2" size={32} />
        <h2 className="text-sm font-bold text-slate-800">Admin Authorization Required</h2>
      </div>
    );
  }

  if (!userDetails) {
    return (
      <div className="p-8 text-center bg-slate-50 min-h-screen">
        <p className="text-slate-400 italic text-sm">Failed to retrieve details for user {userId}.</p>
        <button
          onClick={() => router.push("/settings/admin")}
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-blue-600 font-bold hover:underline"
        >
          <ChevronLeft size={16} /> Return to Admin Panel
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      {/* Top Banner Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border text-xs font-bold transition-all ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Header section */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/settings/admin")}
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer text-slate-600"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900">Complete User Lookup</h1>
            <p className="text-xs text-slate-500 font-medium">Complete administration view and override controls for user account.</p>
          </div>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Account Profile details & Addons Checklist */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Overview */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 text-blue-600">
              Profile Overview
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-450 font-bold">Name:</span>
                <span className="font-bold text-slate-800">{userDetails.user.name || "None"}</span>
              </div>

              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-450 font-bold">Email:</span>
                <span className="font-bold text-slate-800 break-all">{userDetails.user.email}</span>
              </div>

              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-450 font-bold">Base Plan:</span>
                <select
                  disabled={actionLoading === "plan"}
                  value={userDetails.user.plan_id}
                  onChange={(e) => handlePlanOverride(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold bg-white text-slate-800 cursor-pointer focus:ring-1 focus:ring-blue-600"
                >
                  <option value="free">Free</option>
                  <option value="starter">Starter (₹99)</option>
                  <option value="growth">Growth (₹499)</option>
                  <option value="pro">Pro (₹1,499)</option>
                  <option value="agency">Agency (₹4,999)</option>
                </select>
              </div>

              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-450 font-bold">Status:</span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                    userDetails.user.status === "active" ? "text-green-700 bg-green-50" : "text-rose-700 bg-rose-50"
                  }`}>
                    {userDetails.user.status}
                  </span>
                  <button
                    disabled={actionLoading === "status"}
                    onClick={() => handleStatusOverride(userDetails.user.status)}
                    className="text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Toggle
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-450 font-bold">Ad-Optimization Credits:</span>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-800">{userDetails.user.credits || 0}</span>
                  <button
                    disabled={actionLoading === "credits"}
                    onClick={() => {
                      const val = prompt("Enter new credits count:", (userDetails.user.credits || 0).toString());
                      if (val !== null) {
                        const parsed = parseInt(val, 10);
                        if (!isNaN(parsed) && parsed >= 0) {
                          handleCreditsOverride(parsed);
                        }
                      }
                    }}
                    className="text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Modify
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-450 font-bold">Joined:</span>
                <span className="font-bold text-slate-800">
                  {new Date(userDetails.user.created_at).toLocaleDateString()}
                </span>
              </div>

              {userDetails.user.deletion_scheduled_at && (
                <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-850 rounded-xl space-y-1">
                  <div className="font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
                    <ShieldAlert size={10} /> Deletion Scheduled
                  </div>
                  <span className="text-[10px] block">On: {new Date(userDetails.user.deletion_scheduled_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Active Subscription Add-ons */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 text-blue-600">
              Active Addons
            </h3>
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
                  <div key={addon.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-150 text-xs">
                    <div>
                      <div className="font-bold text-slate-850 text-[10.5px]">{addon.name}</div>
                      {quantity > 0 && activeRecord.expires_at && (
                        <div className="text-[8px] text-slate-400 mt-0.5">Expires: {new Date(activeRecord.expires_at).toLocaleDateString()}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {addon.id === "faster_sync" || addon.id === "ai_deep_analysis" ? (
                        <button
                          disabled={actionLoading === `addon_${addon.id}`}
                          onClick={() => handleAddonToggle(addon.id, quantity === 0)}
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
                            onClick={() => handleAddonQtyChange(addon.id, quantity, false)}
                            className="w-5 h-5 bg-white border border-slate-200 rounded flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50 cursor-pointer text-xs"
                          >
                            -
                          </button>
                          <span className="font-extrabold text-xs text-slate-900 bg-white min-w-6 text-center px-1.5 py-0.5 rounded border border-slate-200">
                            {quantity}
                          </span>
                          <button
                            disabled={actionLoading === `addon_${addon.id}`}
                            onClick={() => handleAddonQtyChange(addon.id, quantity, true)}
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
        </div>

        {/* Right Column: Campaigns, Ad Packs, Onboarding, and Support tickets log */}
        <div className="lg:col-span-2 space-y-6">
          {/* ₹333 Promo Offer Status */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 text-blue-600">
              ₹333 Promo Offer Status
            </h3>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-150 text-xs">
              <div>
                <span className="font-bold text-slate-800 block">₹333 Introductory Offer</span>
                {userDetails.user.intro_offer_eligible && !userDetails.user.intro_offer_used && (
                  <span className="text-[10px] text-emerald-600 block font-semibold mt-0.5">Available — user can redeem this offer.</span>
                )}
                {userDetails.user.intro_offer_used && userDetails.user.intro_offer_used_at && (
                  <span className="text-[10px] text-amber-600 block font-semibold mt-0.5">Redeemed on {new Date(userDetails.user.intro_offer_used_at).toLocaleString()} — offer is no longer available.</span>
                )}
                {!userDetails.user.intro_offer_eligible && !userDetails.user.intro_offer_used && (
                  <span className="text-[10px] text-slate-450 block font-semibold mt-0.5">Disabled by admin — user cannot get this offer.</span>
                )}
              </div>
              <button
                disabled={actionLoading === "intro_offer"}
                onClick={() => handleToggleIntroOffer()}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  userDetails.user.intro_offer_eligible && !userDetails.user.intro_offer_used ? "bg-blue-600" : "bg-slate-200"
                } ${actionLoading === "intro_offer" ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    userDetails.user.intro_offer_eligible && !userDetails.user.intro_offer_used ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Ad Quantity Management */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider text-blue-600">
                Ad Quantity Management
              </h3>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setAddPackForm(prev => ({ ...prev, show: !prev.show }))}
                  className="bg-blue-50 text-blue-700 hover:bg-blue-100 font-extrabold text-[9px] px-2.5 py-1 rounded cursor-pointer transition uppercase font-sans border border-blue-100"
                >
                  {addPackForm.show ? "Cancel" : "+ Add Ads"}
                </button>
                {userDetails.ad_packs && userDetails.ad_packs.length > 0 && (
                  <button
                    onClick={handleRemoveAdPacks}
                    className="bg-rose-50 text-rose-700 hover:bg-rose-100 font-extrabold text-[9px] px-2.5 py-1 rounded cursor-pointer transition uppercase font-sans border border-rose-100"
                  >
                    Remove All
                  </button>
                )}
              </div>
            </div>

            {/* Inline Add Ads Form */}
            {addPackForm.show && (
              <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-xl space-y-3 animate-in slide-in-from-top duration-200">
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Number of Ads</label>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={addPackForm.quantity}
                      onChange={(e) => setAddPackForm(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 bg-white focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Validity (Days)</label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={addPackForm.validityDays}
                      onChange={(e) => setAddPackForm(prev => ({ ...prev, validityDays: Math.max(1, parseInt(e.target.value) || 30) }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 bg-white focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <button
                  disabled={actionLoading === "adpack" || addPackForm.quantity <= 0}
                  onClick={handleAddAdPack}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] px-4 py-2.5 rounded-lg transition disabled:opacity-50 cursor-pointer uppercase tracking-wider"
                >
                  {actionLoading === "adpack" ? "Provisioning..." : `Provision ${addPackForm.quantity} Ads`}
                </button>
              </div>
            )}

            {/* Summary Stats */}
            {userDetails.ad_packs && userDetails.ad_packs.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-center">
                  <span className="block text-lg font-black text-blue-700">
                    {userDetails.ad_packs.reduce((sum: number, p: any) => sum + p.total_ad_credits, 0)}
                  </span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Total Ads</span>
                </div>
                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-center">
                  <span className="block text-lg font-black text-emerald-700">
                    {userDetails.ad_packs.reduce((sum: number, p: any) => sum + p.remaining_ad_credits, 0)}
                  </span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Remaining</span>
                </div>
                <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 text-center">
                  <span className="block text-lg font-black text-amber-700">
                    {userDetails.ad_packs.reduce((sum: number, p: any) => sum + p.used_ad_credits, 0)}
                  </span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Used</span>
                </div>
              </div>
            )}

            {!userDetails.ad_packs || userDetails.ad_packs.length === 0 ? (
              <div className="py-6 text-center text-slate-400 italic text-xs font-medium">
                No active ad quantities provisioned.
              </div>
            ) : (
              <div className="space-y-2">
                {userDetails.ad_packs.map((pack: any) => (
                  <div key={pack.id} className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-800 text-[11px] block capitalize">
                          {pack.pack_type.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] text-slate-450 font-medium">
                          Purchased: {new Date(pack.purchased_at).toLocaleDateString()} · Expires: {new Date(pack.expires_at).toLocaleDateString()}
                        </span>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        pack.status === "active" ? "bg-green-50 text-green-700" :
                        pack.status === "consumed" ? "bg-amber-50 text-amber-700" : "bg-slate-200 text-slate-600"
                      }`}>{pack.status}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <span className="block font-black text-blue-700 text-sm">{pack.remaining_ad_credits}</span>
                          <span className="text-[8px] text-slate-400 font-bold uppercase">Remaining</span>
                        </div>
                        <span className="text-slate-300">/</span>
                        <div className="text-center">
                          <span className="block font-black text-slate-700 text-sm">{pack.total_ad_credits}</span>
                          <span className="text-[8px] text-slate-400 font-bold uppercase">Total</span>
                        </div>
                        <span className="text-slate-300">·</span>
                        <div className="text-center">
                          <span className="block font-black text-amber-600 text-sm">{pack.used_ad_credits}</span>
                          <span className="text-[8px] text-slate-400 font-bold uppercase">Used</span>
                        </div>
                      </div>
                      {pack.price_paid > 0 && (
                        <span className="text-[10px] font-bold text-slate-500">₹{(pack.price_paid / 100).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Raise Custom Quotation */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider text-blue-600">
                Raise Custom Quotation
              </h3>
              <button
                onClick={() => setQuoteForm((prev) => ({ ...prev, show: !prev.show }))}
                className="bg-blue-50 text-blue-700 hover:bg-blue-100 font-extrabold text-[9px] px-2.5 py-1 rounded cursor-pointer transition uppercase border border-blue-100 font-sans"
              >
                {quoteForm.show ? "Cancel" : "+ Raise Quote"}
              </button>
            </div>

            {quoteForm.show && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Number of Ads</label>
                    <input
                      type="number"
                      min={1}
                      value={quoteForm.numberOfAds}
                      onChange={(e) =>
                        setQuoteForm((prev) => ({
                          ...prev,
                          numberOfAds: Math.max(1, parseInt(e.target.value) || 1),
                        }))
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Price per Ad (₹)</label>
                    <input
                      type="number"
                      min={1}
                      value={quoteForm.pricePerAd}
                      onChange={(e) =>
                        setQuoteForm((prev) => ({
                          ...prev,
                          pricePerAd: Math.max(1, parseInt(e.target.value) || 1),
                        }))
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 bg-white"
                    />
                  </div>
                </div>

                {/* Setup Option */}
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                  <label className="flex items-center gap-2 font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={quoteForm.includeSetup}
                      onChange={(e) =>
                        setQuoteForm((prev) => ({ ...prev, includeSetup: e.target.checked }))
                      }
                      className="rounded border-slate-350 text-blue-600 focus:ring-blue-500"
                    />
                    Include Meta Ad Account Setup
                  </label>
                  {quoteForm.includeSetup && (
                    <div className="space-y-1 pl-6">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Setup Price (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={quoteForm.setupPrice}
                        onChange={(e) =>
                          setQuoteForm((prev) => ({
                            ...prev,
                            setupPrice: Math.max(0, parseInt(e.target.value) || 0),
                          }))
                        }
                        className="w-full max-w-[200px] border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 bg-white"
                      />
                    </div>
                  )}
                </div>

                {/* Creative Option */}
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                  <label className="flex items-center gap-2 font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={quoteForm.includeCreative}
                      onChange={(e) =>
                        setQuoteForm((prev) => ({ ...prev, includeCreative: e.target.checked }))
                      }
                      className="rounded border-slate-350 text-blue-600 focus:ring-blue-500"
                    />
                    Include Creative Design Service
                  </label>
                  {quoteForm.includeCreative && (
                    <div className="space-y-1 pl-6">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Creative Price (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={quoteForm.creativePrice}
                        onChange={(e) =>
                          setQuoteForm((prev) => ({
                            ...prev,
                            creativePrice: Math.max(0, parseInt(e.target.value) || 0),
                          }))
                        }
                        className="w-full max-w-[200px] border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 bg-white"
                      />
                    </div>
                  )}
                </div>

                {/* Custom Item */}
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-3">
                  <span className="font-bold text-slate-700 block">Add Custom Service Item (Optional)</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Service Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Custom Video Production"
                        value={quoteForm.customItemName}
                        onChange={(e) =>
                          setQuoteForm((prev) => ({ ...prev, customItemName: e.target.value }))
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Price (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={quoteForm.customItemPrice}
                        onChange={(e) =>
                          setQuoteForm((prev) => ({
                            ...prev,
                            customItemPrice: Math.max(0, parseInt(e.target.value) || 0),
                          }))
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Quote Validity (Days)</label>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={quoteForm.validityDays}
                      onChange={(e) =>
                        setQuoteForm((prev) => ({
                          ...prev,
                          validityDays: Math.max(1, parseInt(e.target.value) || 30),
                        }))
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 bg-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      disabled={actionLoading === "raise_quote"}
                      onClick={handleRaiseQuotation}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] py-2.5 rounded-lg transition disabled:opacity-50 cursor-pointer uppercase tracking-wider shadow-sm font-sans"
                    >
                      {actionLoading === "raise_quote" ? "Sending Quote..." : "Send Quotation"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Raise Support Ticket */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider text-blue-600">
                Raise Support Ticket
              </h3>
              <button
                onClick={() => setTicketForm((prev) => ({ ...prev, show: !prev.show }))}
                className="bg-blue-50 text-blue-700 hover:bg-blue-100 font-extrabold text-[9px] px-2.5 py-1 rounded cursor-pointer transition uppercase border border-blue-100 font-sans"
              >
                {ticketForm.show ? "Cancel" : "+ Raise Ticket"}
              </button>
            </div>

            {ticketForm.show && (
              <div className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase">Subject</label>
                  <input
                    type="text"
                    placeholder="Brief description of the problem"
                    value={ticketForm.subject}
                    onChange={(e) =>
                      setTicketForm((prev) => ({ ...prev, subject: e.target.value }))
                    }
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 bg-white font-sans"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Description / Details</label>
                    <textarea
                      rows={3}
                      placeholder="Details about the issue or task"
                      value={ticketForm.description}
                      onChange={(e) =>
                        setTicketForm((prev) => ({ ...prev, description: e.target.value }))
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 bg-white font-sans"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Category</label>
                    <select
                      value={ticketForm.category}
                      onChange={(e) =>
                        setTicketForm((prev) => ({ ...prev, category: e.target.value }))
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 bg-white font-sans"
                    >
                      <option value="General Support font-sans">General Support</option>
                      <option value="Billing Issue font-sans">Billing Issue</option>
                      <option value="Meta Ads Sync font-sans">Meta Ads Sync</option>
                      <option value="AI Recommendations font-sans">AI Recommendations</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      disabled={actionLoading === "raise_ticket" || !ticketForm.subject || !ticketForm.description}
                      onClick={handleRaiseTicket}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] py-2.5 rounded-lg transition disabled:opacity-50 cursor-pointer uppercase tracking-wider shadow-sm font-sans"
                    >
                      {actionLoading === "raise_ticket" ? "Raising Ticket..." : "Open Ticket"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 text-blue-600">
              Meta Ads Onboarding Requests ({userDetails.ad_service_requests?.length || 0})
            </h3>

            {!userDetails.ad_service_requests || userDetails.ad_service_requests.length === 0 ? (
              <div className="py-6 text-center text-slate-400 italic text-xs font-medium">
                No custom onboarding requests found.
              </div>
            ) : (
              <div className="space-y-3">
                {userDetails.ad_service_requests.map((r: any) => (
                  <div key={r.id} className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-start font-bold">
                      <div>
                        <span className="text-slate-850 text-sm">{r.advertised_product}</span>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {r.full_name} | {r.business_name} ({r.industry})
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        r.status === "restricted" ? "bg-rose-50 text-rose-700" :
                        r.status === "campaign_live" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
                      }`}>{r.status.replace("_", " ")}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-500 leading-normal font-medium bg-white p-3 rounded-lg border border-slate-100">
                      <div><strong>Objective:</strong> {r.campaign_objective}</div>
                      <div><strong>Daily Budget:</strong> {r.daily_budget}</div>
                      <div><strong>Ad Quantity:</strong> {r.number_of_ads}</div>
                      <div><strong>Whatsapp:</strong> {r.whatsapp_number}</div>
                      <div className="col-span-2 mt-1">
                        <strong>Website:</strong>{" "}
                        <a href={r.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                          {r.website}
                        </a>
                      </div>
                      {r.additional_services && r.additional_services.length > 0 && (
                        <div className="col-span-2 mt-1">
                          <strong>Services Checklist:</strong>{" "}
                          <span className="text-blue-600 font-extrabold">{r.additional_services.join(", ")}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleUpdateAdServiceRequest(r.id, r.status, r.additional_services || [])}
                        className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[10px] font-bold px-3 py-1 rounded-lg cursor-pointer transition uppercase font-sans"
                      >
                        Override Status / Services
                      </button>
                      <button
                        onClick={() => handleDeleteAdServiceRequest(r.id)}
                        className="bg-white border border-slate-200 text-rose-600 hover:bg-rose-50/50 text-[10px] font-bold px-3 py-1 rounded-lg cursor-pointer transition uppercase font-sans"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sync Campaigns & Accounts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Meta Connection */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2.5 uppercase text-[10px] tracking-wider text-blue-600">
                Connected Meta Profiles
              </h4>
              {userDetails.connections.length === 0 ? (
                <div className="text-slate-400 italic text-[11px] py-2 font-medium">No active Meta profiles connected.</div>
              ) : (
                <div className="space-y-2">
                  {userDetails.connections.map((c: any) => (
                    <div key={c.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1.5 text-xs">
                      <div className="font-bold text-slate-805 truncate">{c.facebook_name || "Meta Profile"}</div>
                      <div className="text-[10px] text-slate-550 flex justify-between font-medium">
                        <span>Status: <span className="font-bold text-emerald-600 uppercase">{c.status}</span></span>
                        <span>Sync: <span className="font-bold uppercase">{c.last_sync_status || "None"}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Connected Ad Accounts */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2.5 uppercase text-[10px] tracking-wider text-blue-600">
                Connected Ad Accounts
              </h4>
              {userDetails.ad_accounts.length === 0 ? (
                <div className="text-slate-400 italic text-[11px] py-2 font-medium">No selected active ad accounts.</div>
              ) : (
                <div className="space-y-2">
                  {userDetails.ad_accounts.map((acc: any) => (
                    <div key={acc.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1 text-xs">
                      <div className="font-bold text-slate-850 truncate">{acc.account_name}</div>
                      <div className="text-[10px] text-slate-455 font-mono">ID: {acc.meta_account_id}</div>
                      <div className="flex justify-between text-[10px] text-slate-500 pt-1 font-semibold">
                        <span>Currency: <span className="font-bold text-slate-700">{acc.currency}</span></span>
                        <span>Industry: <span className="font-bold text-blue-650 bg-blue-50 px-1.5 py-0.5 rounded uppercase text-[8px]">{acc.industry || "Not Specified"}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sync Campaigns list */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2.5 uppercase text-[10px] tracking-wider text-blue-600">
              Sync Campaigns ({userDetails.campaigns?.length || 0})
            </h4>
            {userDetails.campaigns.length === 0 ? (
              <div className="text-slate-400 italic text-xs py-2 font-medium">No imported campaigns.</div>
            ) : (
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-150 rounded-xl bg-slate-50">
                {userDetails.campaigns.map((camp: any) => (
                  <div key={camp.id} className="p-2.5 flex items-center justify-between gap-2 text-xs font-semibold">
                    <div className="truncate pr-2 font-medium text-slate-800">{camp.name}</div>
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                      camp.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-slate-200 text-slate-600"
                    }`}>{camp.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Support Tickets Log */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2.5 uppercase text-[10px] tracking-wider text-blue-600">
              Support Tickets Log ({userDetails.tickets?.length || 0})
            </h4>
            {userDetails.tickets.length === 0 ? (
              <div className="text-slate-400 italic text-xs py-2 font-medium">No raised support tickets.</div>
            ) : (
              <div className="space-y-2">
                {userDetails.tickets.map((t: any) => (
                  <div key={t.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">{t.subject}</span>
                      <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-md uppercase ${
                        t.status === "resolved" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                      }`}>{t.status}</span>
                    </div>
                    <p className="text-[10.5px] text-slate-500 italic mt-1 bg-white p-2.5 rounded border border-slate-100 font-medium">
                      "{t.description}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminUserDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    }>
      <AdminUserDetailContent />
    </Suspense>
  );
}
