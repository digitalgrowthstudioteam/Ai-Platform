"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { User, Key, Shield, Award, Loader2, AlertCircle, CheckCircle, Trash2, Calendar, RefreshCcw } from "lucide-react";
import { updateProfile } from "firebase/auth";

export default function AccountSettingsPage() {
  const { user, resetPassword } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subscription, setSubscription] = useState<any>(null);
  
  // Profile Deletion & Details Status
  const [profileStatus, setProfileStatus] = useState<string>("active");
  const [deletionScheduledAt, setDeletionScheduledAt] = useState<string | null>(null);
  const [countdownText, setCountdownText] = useState("");
  const [confirmName, setConfirmName] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const displayName = user?.displayName || user?.email || "User";
  const initials = displayName
    .split("@")[0]
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const loadData = async () => {
    try {
      const [subRes, profileRes] = await Promise.all([
        api.getSubscription(),
        api.getMyProfile()
      ]);
      setSubscription(subRes);
      setProfileStatus(profileRes.status || "active");
      setDeletionScheduledAt(profileRes.deletion_scheduled_at || null);
    } catch (e) {
      console.error("Failed to load account details:", e);
    }
  };

  useEffect(() => {
    if (user) {
      setName(user.displayName || "");
      setEmail(user.email || "");
      loadData();
    }
  }, [user]);

  // Real-time Countdown Timer Logic
  useEffect(() => {
    if (!deletionScheduledAt || profileStatus !== "deletion_scheduled") {
      setCountdownText("");
      return;
    }

    const targetDate = new Date(deletionScheduledAt).getTime() + 7 * 24 * 60 * 60 * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = targetDate - now;

      if (remaining <= 0) {
        setCountdownText("Processing permanent deletion...");
        return;
      }

      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      setCountdownText(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deletionScheduledAt, profileStatus]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setLoading(true);
      setNotification(null);
      
      // Update Firebase Auth Profile
      await updateProfile(user, { displayName: name });
      
      setNotification({
        type: "success",
        message: "Profile settings successfully updated!",
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to update profile settings.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!email) return;
    try {
      setResetLoading(true);
      setNotification(null);
      await resetPassword(email);
      setNotification({
        type: "success",
        message: "A secure password reset link has been dispatched to your email address.",
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to trigger password reset email.",
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleDeleteRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmName.trim().toLowerCase() !== name.trim().toLowerCase()) {
      setNotification({
        type: "error",
        message: "Confirmation name does not match your profile name.",
      });
      return;
    }

    try {
      setDeleteLoading(true);
      setNotification(null);
      await api.deleteAccount();
      setNotification({
        type: "success",
        message: "Account deletion scheduled. You have a 7-day grace period to restore your profile.",
      });
      setConfirmName("");
      await loadData();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to schedule account deletion.",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancelDeletion = async () => {
    try {
      setDeleteLoading(true);
      setNotification(null);
      await api.cancelAccountDeletion();
      setNotification({
        type: "success",
        message: "Account successfully restored back to active status!",
      });
      await loadData();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to restore account.",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Account Settings</h1>
          <p className="page-subtitle">Manage your profile, preferences, and security settings</p>
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

      {/* Account Deletion Lock Countdown Banner */}
      {profileStatus === "deletion_scheduled" && deletionScheduledAt && (
        <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3 text-left">
            <Calendar className="text-amber-600 shrink-0" size={24} />
            <div>
              <h4 className="text-sm font-extrabold text-amber-900">Account Scheduled for Permanent Deletion</h4>
              <p className="text-xs text-amber-700 leading-relaxed mt-0.5">
                All data, credentials, and custom sync integrations will be completely purged on: <br />
                <span className="font-bold">{new Date(new Date(deletionScheduledAt).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleString()}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center md:items-end gap-2">
            <span className="text-sm font-extrabold text-amber-950 bg-amber-100 px-3.5 py-1.5 rounded-xl border border-amber-250 font-mono tracking-wider">
              Time Remaining: {countdownText}
            </span>
            <button
              onClick={handleCancelDeletion}
              disabled={deleteLoading}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
            >
              {deleteLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
              Restore My Account
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Form: Profile Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <User size={16} className="text-blue-600" /> Personal Information
            </h3>
            
            {/* Display profile photo fetched directly from Google / Firebase Auth (zero local server storage) */}
            <div className="flex items-center gap-4 mb-6">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Google Profile" 
                  className="w-14 h-14 rounded-full border-2 border-blue-500 shadow-sm object-cover" 
                />
              ) : (
                <div className="w-14 h-14 rounded-full border-2 border-blue-500 bg-blue-50 text-blue-600 font-extrabold text-sm flex items-center justify-center shadow-sm uppercase">
                  {initials}
                </div>
              )}
              <div>
                <h4 className="text-xs font-bold text-slate-800">Profile Photo</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Fetched dynamically from your Google identity account.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
                  placeholder="Your Name"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Email Address (Verified)
                </label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-400 cursor-not-allowed transition"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  {loading && <Loader2 size={12} className="animate-spin" />}
                  Save Profile Settings
                </button>
              </div>
            </form>
          </div>

          {/* Security & Password Card */}
          <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Key size={16} className="text-blue-600" /> Credentials & Password
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed mb-4">
              To update your login credentials securely, request a password configuration reset email. 
              You will receive a secure token to define a new password.
            </p>
            
            <button
              onClick={handleSendResetEmail}
              disabled={resetLoading}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              {resetLoading && <Loader2 size={12} className="animate-spin" />}
              Send Password Reset Link
            </button>
          </div>

          {/* Delete Account Consent Form Card */}
          {profileStatus !== "deletion_scheduled" && (
            <div className="bg-white border border-rose-150 rounded-2xl p-6 shadow-xs text-left">
              <h3 className="text-sm font-bold text-rose-600 mb-4 flex items-center gap-1.5 border-b border-rose-100 pb-3">
                <Trash2 size={16} /> Danger Zone: Permanent Account Deletion
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed mb-4">
                Deleting your account will result in the immediate lock and eventual purge of all connected Facebook pipelines, 
                campaign settings, historical reports, and recommendations. <strong>This action cannot be undone once completed.</strong>
              </p>
              
              <form onSubmit={handleDeleteRequest} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1.5">
                    To confirm, please type your exact name: <span className="font-extrabold text-slate-900">"{name}"</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition"
                    placeholder="Type your name to consent"
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={deleteLoading || confirmName.trim().toLowerCase() !== name.trim().toLowerCase()}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    {deleteLoading && <Loader2 size={12} className="animate-spin" />}
                    Delete My Account
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right Info: Current Subscription Status */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <Award size={16} className="text-blue-600" /> Account Plan
              </h3>
              
              <div className="space-y-3.5">
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Active Plan</div>
                    <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                      {subscription?.plan ? subscription.plan.replace("_", " ").toUpperCase() : "PRO EARLY ACCESS"}
                    </div>
                  </div>
                  <Shield size={20} className="text-blue-600 shrink-0" />
                </div>

                <div className="text-xs space-y-2">
                  <div className="flex justify-between text-slate-500">
                    <span>Monthly Total:</span>
                    <span className="font-bold text-slate-800">
                      ₹{subscription?.monthly_total_cost || 99}/month
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Account Status:</span>
                    <span className={`font-bold uppercase tracking-wider text-[10px] ${
                      profileStatus === "deletion_scheduled" ? "text-amber-600 animate-pulse" : "text-emerald-600"
                    }`}>
                      {profileStatus === "deletion_scheduled" ? "Scheduled Deletion" : (subscription?.status || "Active")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-6 border-t border-slate-100 mt-6">
              <a
                href="/settings/billing"
                className="w-full text-center block py-2 border border-blue-600 text-blue-600 hover:bg-blue-50/30 rounded-xl text-xs font-bold transition"
              >
                Manage Billing & Upgrades
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
