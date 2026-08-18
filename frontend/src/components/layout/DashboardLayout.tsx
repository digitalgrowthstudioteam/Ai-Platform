"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { Lock, Sparkles, Settings } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const fetchSubscription = async () => {
    try {
      const res = await api.getSubscription();
      setSub(res);
    } catch (err) {
      console.error("Failed to fetch subscription for layout:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [pathname]);

  const isUnlockedPath = [
    "/settings/billing",
    "/settings/account",
    "/settings/ad-accounts",
    "/settings/admin",
  ].some(path => pathname === path || pathname.startsWith(path + "/"));

  const { user } = useAuth();
  const isAdmin = user?.email === "flasshgames2026@gmail.com" || user?.email === "digitalgrowthstudioteam@gmail.com";

  // Check trial expiration
  const endsAt = sub?.expires_at ? new Date(sub.expires_at) : null;
  const now = new Date();
  const diffTime = endsAt ? endsAt.getTime() - now.getTime() : 0;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const isTrialActive = sub?.status === "trialing" && diffDays > 0;
  const isTrialExpired = sub?.status === "expired" || (sub?.status === "trialing" && diffDays <= 0);

  // If trial is expired and they are NOT on an unlocked path, and they are NOT an admin, show lock screen
  const shouldShowLockScreen = isTrialExpired && !isUnlockedPath && !isAdmin;

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main flex flex-col min-h-screen">
        {/* Trial Countdown Banner */}
        {isTrialActive && !isAdmin && (
          <div className={`w-full py-2 px-4 text-xs font-semibold flex items-center justify-between border-b transition-all ${
            diffDays === 1 
              ? "bg-amber-500 text-white border-amber-600" 
              : "bg-blue-600 text-white border-blue-700"
          }`}>
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="animate-pulse" />
              <span>
                {diffDays === 1 
                  ? "Your 7-Day Starter Trial ends tomorrow. Upgrade to keep full access." 
                  : `7-Day Starter Trial · ${diffDays} days remaining`}
              </span>
            </div>
            <Link 
              href="/settings/billing" 
              className="px-2.5 py-1 bg-white text-blue-700 hover:bg-slate-100 rounded-md font-bold transition shadow-xs"
            >
              Upgrade for ₹99/mo
            </Link>
          </div>
        )}

        <Topbar />
        
        <main className="dashboard-content flex-grow animate-fade-in relative">
          {shouldShowLockScreen ? (
            <div className="absolute inset-0 bg-slate-900/95 flex items-center justify-center p-6 z-50 animate-fade-in">
              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl relative overflow-hidden">
                <div className="absolute -top-12 -left-12 w-40 h-40 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="mx-auto w-16 h-16 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/5">
                  <Lock size={32} className="animate-pulse" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white tracking-tight">Your 7-Day Trial Has Ended</h2>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    To continue using the core Meta Ads Intelligence features and AI recommendation engine, please subscribe to a paid plan.
                  </p>
                </div>
                
                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-center justify-between text-left">
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recommended Plan</div>
                    <div className="text-sm font-bold text-white mt-0.5">Starter Tier</div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-white">₹99</span>
                    <span className="text-xs text-slate-500">/mo</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <Link
                    href="/settings/billing"
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-1.5"
                  >
                    Subscribe & Unlock
                  </Link>
                  <Link
                    href="/settings/ad-accounts"
                    className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-sm rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <Settings size={15} />
                    Manage Ad Accounts
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
