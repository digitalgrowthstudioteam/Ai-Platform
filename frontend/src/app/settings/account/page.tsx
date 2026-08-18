"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { User, Key, Shield, Award, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { updateProfile } from "firebase/auth";

export default function AccountSettingsPage() {
  const { user, resetPassword } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subscription, setSubscription] = useState<any>(null);
  
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.displayName || "");
      setEmail(user.email || "");
    }
  }, [user]);

  useEffect(() => {
    async function loadSub() {
      try {
        const res = await api.getSubscription();
        setSubscription(res);
      } catch (e) {
        console.error("Failed to load subscription in settings page:", e);
      }
    }
    loadSub();
  }, []);

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Form: Profile Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <User size={16} className="text-blue-600" /> Personal Information
            </h3>
            
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
                    <span className="font-bold text-emerald-600 uppercase tracking-wider text-[10px]">
                      {subscription?.status || "Active"}
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
