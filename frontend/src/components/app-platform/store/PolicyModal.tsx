"use client";

import React, { useEffect } from "react";
import { X, ShieldCheck, FileText, Truck, RotateCcw, ExternalLink } from "lucide-react";

export type PolicyType = "terms" | "privacy" | "shipping" | "refund";

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: PolicyType;
  storeName: string;
  content: string;
}

export default function PolicyModal({
  isOpen,
  onClose,
  type,
  storeName,
  content,
}: PolicyModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const titles: Record<PolicyType, { title: string; icon: any }> = {
    terms: { title: "Terms & Conditions", icon: FileText },
    privacy: { title: "Privacy Policy", icon: ShieldCheck },
    shipping: { title: "Shipping & Delivery Policy", icon: Truck },
    refund: { title: "Return, Exchange & Refund Policy", icon: RotateCcw },
  };

  const { title, icon: Icon } = titles[type] || titles.terms;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div
        className="relative w-full max-w-3xl max-h-[88vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">
                {title}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Official store policy for {storeName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Policy Content */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 text-slate-700 text-xs sm:text-[13px] leading-relaxed space-y-3 font-sans">
          <div className="whitespace-pre-wrap font-sans selection:bg-blue-100 selection:text-blue-900">
            {content || "No policy details provided yet."}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>&copy; {new Date().getFullYear()} {storeName}. All rights reserved.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

