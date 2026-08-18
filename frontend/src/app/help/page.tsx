"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { HelpCircle, PlusCircle, MessageSquare, AlertCircle, CheckCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";

export default function HelpPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General Support");

  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const data = await api.getSupportTickets();
      setTickets(data);
    } catch (e) {
      console.error("Failed to load tickets:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadTickets();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !description) return;

    try {
      setSubmitLoading(true);
      setNotification(null);
      await api.createSupportTicket(subject, description, category);
      setSubject("");
      setDescription("");
      setCategory("General Support");
      setNotification({
        type: "success",
        message: "Support ticket successfully created! An administrator will reply shortly.",
      });
      await loadTickets();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to submit support ticket.",
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedTicketId(prev => (prev === id ? null : id));
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Help & Support</h1>
          <p className="page-subtitle">Get help and raise tickets directly with the Admin</p>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl flex items-start gap-2.5 text-xs font-semibold ${
          notification.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border border-emerald-100" 
            : "bg-rose-50 text-rose-800 border border-rose-100"
        }`}>
          {notification.type === "success" ? (
            <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {loading ? (
        <div className="card py-16 flex justify-center">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: My Tickets */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3 flex items-center gap-1.5">
                <MessageSquare size={16} className="text-blue-600" /> My Support Tickets
              </h3>

              {tickets.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <HelpCircle size={36} className="mx-auto text-slate-300" />
                  <h4 className="text-xs font-bold text-slate-700">No tickets raised yet</h4>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Have any questions regarding billing, Meta sync, or recommendations? Raise a support ticket on the right!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((t) => {
                    const isExpanded = expandedTicketId === t.id;
                    return (
                      <div 
                        key={t.id} 
                        className={`border rounded-xl transition-all overflow-hidden ${
                          isExpanded ? "border-blue-500 shadow-sm" : "border-slate-150"
                        }`}
                      >
                        {/* Accordion header */}
                        <div 
                          onClick={() => toggleExpand(t.id)}
                          className="p-3.5 bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between gap-2"
                        >
                          <div className="space-y-1 text-left">
                            <span className="text-[9px] bg-slate-200/80 font-bold px-2 py-0.5 rounded-md text-slate-600 uppercase">
                              {t.category}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900">{t.subject}</h4>
                            <p className="text-[9px] text-slate-400 font-medium">
                              Created: {new Date(t.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase ${
                              t.status === "resolved" 
                                ? "bg-emerald-50 text-emerald-700" 
                                : t.status === "in_progress" 
                                ? "bg-blue-50 text-blue-700" 
                                : "bg-amber-50 text-amber-700"
                            }`}>
                              {t.status.replace("_", " ")}
                            </span>
                            {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                          </div>
                        </div>

                        {/* Accordion content */}
                        {isExpanded && (
                          <div className="p-4 border-t border-slate-100 bg-white space-y-4 text-xs text-slate-600 text-left">
                            <div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Issue Description</div>
                              <p className="leading-relaxed whitespace-pre-wrap">{t.description}</p>
                            </div>

                            {t.admin_reply ? (
                              <div className="p-3 bg-blue-50/30 border border-blue-100/50 rounded-xl space-y-1.5">
                                <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Admin Response</div>
                                <p className="leading-relaxed text-slate-700 whitespace-pre-wrap font-medium">{t.admin_reply}</p>
                              </div>
                            ) : (
                              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-500 font-semibold italic">
                                Waiting for an administrator to review and reply.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Raise Ticket Form */}
          <div>
            <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-1.5">
                <PlusCircle size={16} className="text-blue-600" /> Raise Support Ticket
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Ticket Subject
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
                    placeholder="Brief summary of the issue"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition bg-white"
                  >
                    <option value="General Support">General Support</option>
                    <option value="Billing & Pricing">Billing & Pricing</option>
                    <option value="Meta Ads Connection">Meta Ads Connection</option>
                    <option value="AI Recommendation Issue">AI Recommendation Issue</option>
                    <option value="Sync Lag / Delay">Sync Lag / Delay</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Detailed Description
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
                    placeholder="Please explain the details of the problem..."
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {submitLoading && <Loader2 size={12} className="animate-spin" />}
                    Submit Support Ticket
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
