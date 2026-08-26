"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft,
  Megaphone,
  User as UserIcon,
  Mail,
  MessageSquare,
  Loader2,
  ShieldAlert,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Copy,
  ExternalLink,
  Sliders,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export default function AdminQuotationDetailClient() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: loadingAuth } = useAuth();
  const requestId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  // Operations state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [newRequestStatus, setNewRequestStatus] = useState("");
  const [newPartnerStatus, setNewPartnerStatus] = useState("");
  const [creditsToConsume, setCreditsToConsume] = useState(0);
  const [isEligible, setIsEligible] = useState(true);

  // Ticket raising state
  const [showOrderTicketForm, setShowOrderTicketForm] = useState(false);
  const [orderTicketSubject, setOrderTicketSubject] = useState("");
  const [orderTicketDescription, setOrderTicketDescription] = useState("");
  const [orderTicketCategory, setOrderTicketCategory] = useState("General Support");

  const [copiedLink, setCopiedLink] = useState(false);

  const whitelistedAdmins = new Set([
    "flasshgames2026@gmail.com",
    "digitalgrowthstudioteam@gmail.com",
    "vikramrwadkar@gmail.com",
  ]);

  const isAdmin = user ? whitelistedAdmins.has(user.email || "") : false;

  const fetchRequestDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAdminAdsServiceRequest(requestId);
      setData(res);
      setNewRequestStatus(res.status);
      setNewPartnerStatus(res.partner_access_status || "not_requested");
      setIsEligible(res.user_eligibility?.eligible !== false);
    } catch (err: any) {
      console.error(err);
      const msg = err.message || (typeof err === "string" ? err : JSON.stringify(err));
      setError(msg || "Failed to load service request details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      if (requestId && requestId !== "placeholder") {
        fetchRequestDetails();
      }
    }
  }, [user, requestId, isAdmin]);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestId) return;
    setActionLoading("update_settings");
    setNotification(null);
    try {
      await api.adminUpdateAdsServiceRequest(requestId, {
        status: newRequestStatus,
        partner_access_status: newPartnerStatus,
        ad_credits_to_consume: creditsToConsume > 0 ? creditsToConsume : null,
      });
      setNotification({
        type: "success",
        message: "Service request parameters updated successfully.",
      });
      setCreditsToConsume(0);
      fetchRequestDetails();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to update service request parameters.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleEligibility = async (eligibleValue: boolean) => {
    if (!requestId) return;
    setActionLoading("toggle_eligibility");
    setNotification(null);
    try {
      await api.adminUpdateAdsServiceRequest(requestId, {
        ads_service_eligible: eligibleValue,
      });
      setIsEligible(eligibleValue);
      setNotification({
        type: "success",
        message: `Successfully updated category approval status to: ${eligibleValue ? "APPROVED" : "RESTRICTED"}.`,
      });
      fetchRequestDetails();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to update category approval status.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteRequest = async () => {
    if (!data) return;
    if (
      !window.confirm(
        "Are you sure you want to delete this quotation and request? This will permanently delete all associated data."
      )
    )
      return;

    setActionLoading("delete_request");
    setNotification(null);
    try {
      await api.deleteUserAdServiceRequest(data.user_id, requestId);
      alert("Successfully deleted quotation and request.");
      router.push("/settings/admin?tab=ads_services");
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to delete quotation and request.",
      });
      setActionLoading(null);
    }
  };

  const handleRaiseTicket = async () => {
    if (!data || !orderTicketSubject || !orderTicketDescription) return;
    setActionLoading("raise_ticket");
    setNotification(null);
    try {
      await api.adminRaiseTicket(data.user_id, {
        subject: orderTicketSubject,
        description: orderTicketDescription,
        category: orderTicketCategory,
      });
      setNotification({
        type: "success",
        message: "Support ticket raised successfully for client.",
      });
      setOrderTicketSubject("");
      setOrderTicketDescription("");
      setShowOrderTicketForm(false);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to raise support ticket.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyPaymentLink = () => {
    if (!data?.quotation?.id) return;
    const paymentLink = `${window.location.origin}/pay-quotation/${data.quotation.id}`;
    navigator.clipboard.writeText(paymentLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loadingAuth || (user && isAdmin && loading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <span className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Loading details...</span>
      </div>
    );
  }

  if (user && !isAdmin) {
    return (
      <div className="p-6 max-w-md mx-auto text-center space-y-4">
        <ShieldAlert className="mx-auto text-red-600" size={48} />
        <h2 className="text-lg font-bold text-slate-800">Access Denied</h2>
        <p className="text-xs text-slate-500">You must be a whitelisted administrator to view this page.</p>
        <Link href="/dashboard" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-md mx-auto text-center space-y-4">
        <AlertTriangle className="mx-auto text-amber-500" size={48} />
        <h2 className="text-lg font-bold text-slate-800">Error Loading Details</h2>
        <p className="text-xs text-slate-500">{error}</p>
        <Link href="/settings/admin?tab=ads_services" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold inline-block">
          Back to Admin Panel
        </Link>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans text-left">
      {/* Top Navigation Row */}
      <div className="flex items-center gap-2">
        <Link
          href="/settings/admin?tab=ads_services"
          className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition text-slate-600"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meta Ads Service Setup</span>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">{data.business_name}</h1>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-2.5 text-xs font-bold font-sans ${
            notification.type === "success"
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {notification.type === "success" ? <CheckCircle size={16} className="shrink-0" /> : <AlertTriangle size={16} className="shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Columns - Detail Cards */}
        <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
          {/* Card 1: To Whom We Quoted */}
          <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <UserIcon size={16} className="text-blue-600" /> Client Profile Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer Name</span>
                <span className="font-bold text-slate-800">{data.customer_name}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                <a href={`mailto:${data.customer_email}`} className="font-bold text-blue-600 hover:underline flex items-center gap-1">
                  <Mail size={12} /> {data.customer_email}
                </a>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">WhatsApp Contact</span>
                {data.whatsapp_number ? (
                  <a
                    href={`https://wa.me/${data.whatsapp_number.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <MessageSquare size={12} /> Message WhatsApp &rarr;
                  </a>
                ) : (
                  <span className="text-slate-400 italic">Not Provided</span>
                )}
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Industry Selector</span>
                <span className="font-bold text-slate-800">
                  {data.industry === "Other" ? data.industry_other : data.industry}
                </span>
              </div>
              <div className="space-y-1 col-span-1 md:col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Request Identifier</span>
                <span className="font-mono text-[10px] text-slate-500">{data.id}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Quotation Detail */}
          <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <DollarSign size={16} className="text-blue-600" /> Quotation & Payment Details
            </h3>

            {data.quotation ? (
              <div className="space-y-4 text-xs font-sans">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 border border-slate-150 rounded-xl">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Regular Total</span>
                    <span className="text-sm font-bold text-slate-500 line-through">
                      ₹{(data.quotation.regular_total / 100).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Discount</span>
                    <span className="text-sm font-bold text-emerald-600">
                      -₹{(data.quotation.discount_total / 100).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Final Total</span>
                    <span className="text-base font-extrabold text-slate-900">
                      ₹{(data.quotation.final_total / 100).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quotation Status</span>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        data.quotation.status === "paid"
                          ? "bg-green-50 text-green-700"
                          : data.quotation.status === "expired"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {data.quotation.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Valid Until</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <Calendar size={12} className="text-slate-400" />
                      {new Date(data.quotation.expires_at).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {/* Shareable checkout payment link */}
                <div className="space-y-1.5 p-3.5 border border-slate-150 rounded-xl bg-slate-50/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Shareable Quotation Link</span>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/pay-quotation/${data.quotation.id}`}
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-[10px] text-slate-600 outline-none"
                    />
                    <button
                      onClick={handleCopyPaymentLink}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-200 hover:bg-blue-100 transition flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Copy size={12} /> {copiedLink ? "Copied" : "Copy Link"}
                    </button>
                    <a
                      href={`/pay-quotation/${data.quotation.id}`}
                      target="_blank"
                      className="px-3 py-1.5 bg-white text-slate-600 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-50 transition flex items-center gap-1 shrink-0"
                    >
                      <ExternalLink size={12} /> View Page
                    </a>
                  </div>
                </div>

                {/* Quoted Items */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quoted Deliverables</span>
                  <div className="border border-slate-150 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white">
                    {data.quotation.items?.map((item: any, idx: number) => (
                      <div key={idx} className="p-3 flex justify-between items-center text-xs">
                        <div>
                          <div className="font-bold text-slate-800">{item.description}</div>
                          {item.ad_credits && (
                            <div className="text-[10px] text-slate-450 font-bold flex items-center gap-1 mt-0.5">
                              <Sparkles size={10} className="text-blue-500" /> +{item.ad_credits} Ads Setup
                            </div>
                          )}
                        </div>
                        <div className="font-extrabold text-slate-800">
                          ₹{(item.regular_price / 100).toLocaleString("en-IN")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs italic">
                No quotation record found for this request. Please configure using settings.
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Service Controls */}
        <div className="space-y-6 order-1 lg:order-2">
          {/* Card 3: Service Settings */}
          <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Sliders size={16} className="text-blue-600" /> Operational Controls
            </h3>

            <form onSubmit={handleUpdateSettings} className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operational Status</label>
                <select
                  value={newRequestStatus}
                  onChange={(e) => setNewRequestStatus(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-white font-bold"
                >
                  <option value="draft">Draft (Lead Only)</option>
                  <option value="submitted">Submitted (In Review)</option>
                  <option value="restricted">Restricted (Ineligible)</option>
                  <option value="whatsapp_pending">WhatsApp Contact Pending</option>
                  <option value="whatsapp_connected">WhatsApp Connected</option>
                  <option value="partner_access_requested">Partner Access Requested</option>
                  <option value="partner_access_granted">Partner Access Granted</option>
                  <option value="campaign_setup">Campaign Setup In Progress</option>
                  <option value="campaign_live">Campaign Live (Active)</option>
                  <option value="completed">Completed (Archived)</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Partner Access Permission</label>
                <select
                  value={newPartnerStatus}
                  onChange={(e) => setNewPartnerStatus(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-white font-bold"
                >
                  <option value="not_requested">Not Requested</option>
                  <option value="requested">Requested</option>
                  <option value="pending">Pending Customer Auth</option>
                  <option value="granted">Partner Access Granted</option>
                  <option value="rejected">Rejected by Client</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Deduct Ad Credits (Consumptions)</label>
                <input
                  type="number"
                  min={0}
                  value={creditsToConsume}
                  onChange={(e) => setCreditsToConsume(parseInt(e.target.value) || 0)}
                  placeholder="e.g. 1"
                  className="w-full border rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-white"
                />
                <span className="text-[9px] text-slate-400 block font-semibold leading-normal">
                  Specify the number of ads successfully launched to deduct credits.
                </span>
              </div>

              <button
                type="submit"
                disabled={actionLoading !== null}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer uppercase text-[10px]"
              >
                {actionLoading === "update_settings" && <Loader2 size={12} className="animate-spin" />}
                Save Service Settings
              </button>
             </form>

            {/* Category Approval Toggle */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category Approval Status</label>
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                <div className="space-y-0.5 text-left flex-1 pr-2">
                  <span className="font-bold text-slate-800 block text-[10px]">
                    {isEligible ? "Category Approved" : "Category Restricted"}
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold block leading-tight">
                    {isEligible ? "User is allowed to proceed to checkout" : (data?.user_eligibility?.reason || "Prohibited category detected")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleEligibility(!isEligible)}
                  disabled={actionLoading === "toggle_eligibility"}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all duration-150 ${
                    isEligible
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                      : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                  }`}
                >
                  {isEligible ? "Approved" : "Restricted"}
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={actionLoading !== null}
              onClick={handleDeleteRequest}
              className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer uppercase text-[10px]"
            >
              {actionLoading === "delete_request" && <Loader2 size={12} className="animate-spin" />}
              Delete Quotation & Request
            </button>
          </div>

          {/* Card 4: Ticket Raising */}
          <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-900">Support Ticket Raising</span>
              <button
                type="button"
                onClick={() => setShowOrderTicketForm(!showOrderTicketForm)}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition uppercase"
              >
                {showOrderTicketForm ? "Cancel" : "+ Open Ticket"}
              </button>
            </div>

            {showOrderTicketForm && (
              <div className="space-y-3.5 animate-in slide-in-from-top duration-200 text-left text-xs font-sans">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase">Subject</label>
                  <input
                    type="text"
                    placeholder="Support topic..."
                    value={orderTicketSubject}
                    onChange={(e) => setOrderTicketSubject(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Detailed description of the issue..."
                    value={orderTicketDescription}
                    onChange={(e) => setOrderTicketDescription(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase">Category</label>
                  <select
                    value={orderTicketCategory}
                    onChange={(e) => setOrderTicketCategory(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white font-bold"
                  >
                    <option value="General Support">General Support</option>
                    <option value="Billing Issue">Billing Issue</option>
                    <option value="Meta Ads Sync">Meta Ads Sync</option>
                    <option value="AI Recommendations">AI Recommendations</option>
                  </select>
                </div>
                <button
                  type="button"
                  disabled={actionLoading !== null || !orderTicketSubject || !orderTicketDescription}
                  onClick={handleRaiseTicket}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded-lg transition disabled:opacity-50 text-[10px] uppercase font-sans tracking-wide cursor-pointer"
                >
                  {actionLoading === "raise_ticket" ? "Raising Ticket..." : "Submit Support Ticket"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
