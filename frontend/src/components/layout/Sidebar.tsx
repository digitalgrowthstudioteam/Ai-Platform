"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
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
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
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
      { label: "Account Intelligence", href: "/insights", icon: TrendingUp },
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
      { label: "Billing & Plans", href: "/settings/billing", icon: CreditCard },
      { label: "Account Settings", href: "/settings/account", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

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
          <div className="sidebar-plan-name">Starter</div>
          <button className="sidebar-upgrade-btn">
            Upgrade Plan
          </button>
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
