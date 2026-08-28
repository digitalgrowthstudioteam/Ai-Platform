"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Megaphone, Brain, CreditCard, Users, Settings } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export default function SettingsNavigation() {
  const pathname = usePathname();
  const { primaryColor } = useTheme();

  const tabs = [
    { label: "Account Settings", href: "/settings/account", icon: Settings },
    { label: "Ad Accounts", href: "/settings/ad-accounts", icon: Megaphone },
    { label: "Team Members", href: "/settings/team", icon: Users },
    { label: "AI Intelligence Hub", href: "/settings/ai-intelligence", icon: Brain },
    { label: "Billing & Plans", href: "/settings/billing", icon: CreditCard },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3 mb-6">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              isActive
                ? "text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-150/40"
            }`}
            style={isActive ? { backgroundColor: primaryColor } : {}}
          >
            <Icon size={14} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
