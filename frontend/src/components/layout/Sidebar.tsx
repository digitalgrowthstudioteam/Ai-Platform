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
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  badge?: string;
  disabled?: boolean;
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
    label: "Automation",
    items: [
      { label: "Rules", href: "/rules", icon: Zap, badge: "Coming Soon", disabled: true },
      { label: "AI Active", href: "/auto-optimize", icon: Bot, badge: "Coming Soon", disabled: true },
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

  useEffect(() => {
    if (!user) return;
    
    // Load cached subscription instantly
    const cached = sessionStorage.getItem("dgs_cached_subscription");
    if (cached) {
      try {
        setSub(JSON.parse(cached));
      } catch (e) {}
    }

    // Load fresh subscription live
    async function loadSub() {
      try {
        const res = await api.getSubscription();
        setSub(res);
        sessionStorage.setItem("dgs_cached_subscription", JSON.stringify(res));
      } catch (e) {
        console.error("Failed to load subscription in sidebar:", e);
      }
    }
    loadSub();
  }, [user]);

  const isAdmin = user?.email === "flasshgames2026@gmail.com" || user?.email === "digitalgrowthstudioteam@gmail.com";

  const visibleNavigation = navigation.map((section) => {
    if (section.label === "SETTINGS" && isAdmin) {
      // Add Super Admin menu item if not already present
      const hasAdminItem = section.items.some((item) => item.href === "/settings/admin");
      if (!hasAdminItem) {
        return {
          ...section,
          items: [
            ...section.items,
            { label: "Super Admin", href: "/settings/admin", icon: ShieldAlert } as NavItem,
          ],
        };
      }
    }
    return section;
  });

  return (
    <aside className="sidebar" id="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <img src="/logo.svg" alt="Digital Growth Studio" />
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
