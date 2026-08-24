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

  // Check admin role
  const isAdmin = user?.email === "flasshgames2026@gmail.com" || user?.email === "digitalgrowthstudioteam@gmail.com";

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
    try {
      const packType = prompt("Enter pack type (e.g. promo_1_ad, pack_1, pack_3, pack_15, pack_30, manual):", "manual");
      if (!packType) return;
      const totalCreditsStr = prompt("Enter total ad credits:", "1");
      if (!totalCreditsStr) return;
      const totalCredits = parseInt(totalCreditsStr, 10);
      if (isNaN(totalCredits) || totalCredits <= 0) {
        alert("Please enter a valid positive number.");
        return;
      }

      setActionLoading("adpack");
      await api.updateUserAdPacks(userId, packType, totalCredits, 0, totalCredits);
      setNotification({
        type: "success",
        message: `Successfully provisioned ${totalCredits} ad credits pack to user.`,
      });
      await fetchUserDetails();
    } catch (err: any) {
      console.error("Failed to add ad pack:", err);
      setNotification({ type: "error", message: err.message || "Failed to add ad pack." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveAdPacks = async () => {
    if (!confirm("Are you sure you want to remove all active ad packs for this user?")) return;
    try {
      setActionLoading("adpack");
      await api.updateUserAdPacks(userId, "remove", 0, 0, 0);
      setNotification({
        type: "success",
        message: "Successfully removed user active ad packs.",
      });
      await fetchUserDetails();
    } catch (err: any) {
      console.error("Failed to remove ad packs:", err);
      setNotification({ type: "error", message: err.message || "Failed to remove ad packs." });
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
          {/* Active Ad Credit Packs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider text-blue-600">
                Active Ad Credits Packs
              </h3>
              <div className="flex gap-1.5">
                <button
                  onClick={handleAddAdPack}
                  className="bg-blue-50 text-blue-700 hover:bg-blue-100 font-extrabold text-[9px] px-2.5 py-1 rounded cursor-pointer transition uppercase font-sans border border-blue-100"
                >
                  + Add Pack
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

            {!userDetails.ad_packs || userDetails.ad_packs.length === 0 ? (
              <div className="py-6 text-center text-slate-400 italic text-xs font-medium">
                No active ad packs provisioned.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {userDetails.ad_packs.map((pack: any) => (
                  <div key={pack.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span className="capitalize">{pack.pack_type.replace("_", " ")}</span>
                      <span className="text-blue-600 font-extrabold">{pack.remaining_ad_credits} / {pack.total_ad_credits} Ads Left</span>
                    </div>
                    <div className="flex justify-between text-slate-450 text-[10px] font-semibold">
                      <span>Status: <span className="font-extrabold uppercase text-slate-600">{pack.status}</span></span>
                      <span>Expires: {new Date(pack.expires_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Meta Ads Onboarding Requests */}
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
