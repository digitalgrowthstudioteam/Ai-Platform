"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  LayoutDashboard,
  Megaphone,
  Layers,
  FileText,
  Image,
  Users,
  MapPin,
  BarChart3,
  Lightbulb,
  TrendingUp,
  Palette,
  Type,
  Zap,
  Bot,
  CreditCard,
  UserPlus,
  Settings,
  HelpCircle,
  ChevronUp,
  ShieldAlert,
  Brain,
  Sparkles,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  badge?: string;
  disabled?: boolean;
  onClick?: () => void;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    label: "",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Today's Brief", href: "/briefs/daily", icon: Sparkles },
      { label: "Weekly Brief", href: "/briefs/weekly", icon: Zap },
      { label: "🚀 Get Ads at ₹333", href: "/get-ads", icon: Sparkles },
    ],
  },
  {
    label: "CAMPAIGNS",
    items: [
      { label: "All Campaigns", href: "/campaigns", icon: Megaphone },
    ],
  },
  {
    label: "AI INTELLIGENCE",
    items: [
      { label: "Recommendations", href: "/recommendations", icon: Lightbulb },
      { label: "AI Decision Center", href: "/insights", icon: TrendingUp },
      { label: "Creative Intelligence", href: "/creative-analyzer", icon: Palette },
    ],
  },
  {
    label: "AUTOMATION",
    items: [
      { label: "AI Optimization", href: "/ai-optimization", icon: Zap },
      { 
        label: "AI Assistant", 
        href: "#assistant", 
        icon: Bot,
        onClick: () => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("toggle-ai-assistant"));
          }
        }
      },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { label: "Ad Accounts", href: "/settings/ad-accounts", icon: Megaphone },
      { label: "AI Intelligence Hub", href: "/settings/ai-intelligence", icon: Brain },
      { label: "Billing & Plans", href: "/settings/billing", icon: CreditCard },
      { label: "Account Settings", href: "/settings/account", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [sub, setSub] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    
    // Load cached subscription instantly
    const cached = sessionStorage.getItem("dgs_cached_subscription");
    if (cached) {
      try {
        setSub(JSON.parse(cached));
      } catch (e) {}
    }

    // Load fresh subscription and profile live
    async function loadSubAndProfile() {
      try {
        const [subRes, profileRes] = await Promise.all([
          api.getSubscription(),
          api.getMyProfile()
        ]);
        setSub(subRes);
        setProfile(profileRes);
        sessionStorage.setItem("dgs_cached_subscription", JSON.stringify(subRes));
      } catch (e) {
        console.error("Failed to load subscription/profile in sidebar:", e);
      }
    }
    loadSubAndProfile();
  }, [user]);

  const isAdmin = user?.email === "flasshgames2026@gmail.com" || user?.email === "digitalgrowthstudioteam@gmail.com";

  const visibleNavigation = navigation.map((section) => {
    let items = [...section.items];

    // Hide AI Assistant for non-admins
    if (!isAdmin) {
      items = items.filter((item) => item.label !== "AI Assistant");
    }

    // Hide Get Ads for restricted users
    if (profile && profile.ads_service_eligible === false) {
      items = items.filter((item) => !item.label.includes("Get Ads"));
    }

    if (section.label === "SETTINGS" && isAdmin) {
      // Add Super Admin menu item if not already present
      const hasAdminItem = items.some((item) => item.href === "/settings/admin");
      if (!hasAdminItem) {
        items = [
          ...items,
          { label: "Super Admin", href: "/settings/admin", icon: ShieldAlert } as NavItem,
        ];
      }
    }

    return {
      ...section,
      items,
    };
  });

  return (
    <aside className="sidebar" id="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <img src="/logo.jpg" alt="Digital Growth Studio" className="w-8 h-8 rounded-lg object-contain" />
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-title">Digital Growth Studio</span>
          <span className="sidebar-logo-subtitle">AI Ads Optimizer</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {visibleNavigation.map((section, sectionIdx) => (
          <div key={sectionIdx} className="sidebar-section">
            {section.label && (
              <div className="sidebar-section-label">{section.label}</div>
            )}
            {section.items.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== "/dashboard" && item.href !== "/" && pathname.startsWith(item.href));
              const Icon = item.icon;

              if (item.disabled) {
                return (
                  <div
                    key={item.href}
                    className="sidebar-item"
                    style={{ opacity: 0.5, cursor: "not-allowed" }}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="coming-soon">{item.badge}</span>
                    )}
                  </div>
                );
              }

              if (item.onClick) {
                return (
                  <button
                    key={item.href}
                    onClick={item.onClick}
                    className={`sidebar-item w-full text-left flex items-center gap-3 ${isActive ? "active" : ""}`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="sidebar-badge">{item.badge}</span>
                    )}
                  </button>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-item ${isActive ? "active" : ""}`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="sidebar-badge">{item.badge}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer — Plan & Upgrade */}
      <div className="sidebar-footer">
        <div className="sidebar-plan">
          <div className="sidebar-plan-label">Current Plan</div>
          <div className="sidebar-plan-name">
            {sub?.plan ? sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1) : "Starter"}
          </div>
          <Link href="/settings/billing" className="sidebar-upgrade-btn block text-center">
            Upgrade Plan
          </Link>
        </div>

        {/* Help */}
        <Link href="/help" className="sidebar-item" style={{ marginTop: 4 }}>
          <HelpCircle size={18} />
          <span>Help & Support</span>
        </Link>
      </div>
    </aside>
  );
}
