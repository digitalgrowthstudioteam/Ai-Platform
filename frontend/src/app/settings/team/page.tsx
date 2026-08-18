"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Users, UserPlus, Trash2, Mail, ShieldAlert, Loader2, AlertCircle, CheckCircle } from "lucide-react";

export default function TeamPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("member");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [membersData, subData] = await Promise.all([
        api.getTeamMembers(),
        api.getSubscription(),
      ]);
      setMembers(membersData);
      setSubscription(subData);
    } catch (e) {
      console.error("Failed to load team data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      setActionLoading("invite");
      setNotification(null);
      await api.inviteTeamMember(email, name || undefined, role);
      setEmail("");
      setName("");
      setRole("member");
      setNotification({
        type: "success",
        message: `Successfully invited ${email} to the team!`,
      });
      await loadData();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to invite team member.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to revoke access for ${email}?`)) return;

    try {
      setActionLoading(`remove_${id}`);
      setNotification(null);
      await api.removeTeamMember(id);
      setNotification({
        type: "success",
        message: `Successfully removed ${email} from the team.`,
      });
      await loadData();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to remove team member.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const maxSeats = subscription?.resolved_entitlements?.max_team_members || 1;
  const seatsOccupied = members.length + 1; // Team members + owner
  const progressPercent = Math.min((seatsOccupied / maxSeats) * 100, 100);

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Members</h1>
          <p className="page-subtitle">Manage team access and permissions</p>
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
          {/* Left panel: List Team members */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Users size={16} className="text-blue-600" /> Workspace Team
                </h3>
                <span className="text-[10px] bg-slate-100 font-bold px-2 py-0.5 rounded-full text-slate-500">
                  {seatsOccupied} / {maxSeats} seats occupied
                </span>
              </div>

              {/* Seats limits visual bar */}
              <div className="mb-6">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 rounded-full ${
                      progressPercent >= 100 ? "bg-amber-500" : "bg-blue-600"
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {progressPercent >= 100 && (
                  <p className="text-[10px] text-amber-600 font-bold mt-1.5 flex items-center gap-1">
                    <ShieldAlert size={12} /> Team seats capacity reached. Upgrade your subscription plan for more seats.
                  </p>
                )}
              </div>

              {/* Members table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-2.5">Name</th>
                      <th className="py-2.5">Email</th>
                      <th className="py-2.5">Role</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {/* Owner Row */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3.5 font-bold text-slate-900">
                        {user?.displayName || "Workspace Owner"}
                      </td>
                      <td className="py-3.5 text-slate-500">{user?.email}</td>
                      <td className="py-3.5">
                        <span className="bg-blue-50 text-blue-700 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase">
                          Owner
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase">
                          Active
                        </span>
                      </td>
                      <td className="py-3.5 text-right text-slate-400 font-medium">Primary</td>
                    </tr>

                    {/* Invited members Rows */}
                    {members.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 font-bold text-slate-900">
                          {m.name || "Colleague"}
                        </td>
                        <td className="py-3.5 text-slate-500">{m.email}</td>
                        <td className="py-3.5">
                          <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase">
                            {m.role}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase ${
                            m.status === "active" 
                              ? "bg-emerald-50 text-emerald-700" 
                              : "bg-amber-50 text-amber-700"
                          }`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            onClick={() => handleRemove(m.id, m.email)}
                            disabled={actionLoading !== null}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                            title="Revoke access"
                          >
                            {actionLoading === `remove_${m.id}` ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Trash2 size={13} />
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

          {/* Right panel: Invite Form */}
          <div>
            <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-1.5">
                <UserPlus size={16} className="text-blue-600" /> Invite Colleague
              </h3>

              {seatsOccupied >= maxSeats ? (
                <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl space-y-3">
                  <p className="text-xs text-amber-800 leading-relaxed font-medium">
                    All workspace seats are currently occupied under your plan. Please upgrade to a higher plan to add team members.
                  </p>
                  <a
                    href="/settings/billing"
                    className="block text-center w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    Upgrade Plan Options
                  </a>
                </div>
              ) : (
                <form onSubmit={handleInvite} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
                      placeholder="colleague@company.com"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Full Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Workspace Access Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition bg-white"
                    >
                      <option value="member">Workspace Member</option>
                      <option value="viewer">Viewer (Read-Only)</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={actionLoading !== null}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {actionLoading === "invite" && <Loader2 size={12} className="animate-spin" />}
                      Send Invitation
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
