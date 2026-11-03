"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Truck, RefreshCcw, Headphones, FileText, RotateCcw } from "lucide-react";
import PolicyModal, { PolicyType } from "./PolicyModal";

interface StoreFooterProps {
  slug: string;
  config: any;
}

export default function StoreFooter({ slug, config }: StoreFooterProps) {
  const [activePolicy, setActivePolicy] = useState<PolicyType | null>(null);

  const getPolicyContent = (type: PolicyType): string => {
    switch (type) {
      case "terms":
        return config?.terms_and_conditions || "";
      case "privacy":
        return config?.privacy_policy || "";
      case "shipping":
        return config?.shipping_policy || "";
      case "refund":
        return config?.refund_policy || "";
      default:
        return "";
    }
  };

  return (
    <>
      <footer className="bg-white border-t border-slate-200 mt-16 pt-10 pb-8 text-xs text-slate-500">
        {/* Trust Badges */}
        <div className="max-w-6xl mx-auto px-4 pb-10 mb-8 border-b border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-slate-900 text-xs">Direct Fast Delivery</h5>
              <p className="text-[11px] text-slate-400">{config?.estimated_delivery_days || "3-5 Business Days"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-slate-900 text-xs">Cash on Delivery</h5>
              <p className="text-[11px] text-slate-400">Pay conveniently at your door</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <RefreshCcw className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-slate-900 text-xs">Genuine Products</h5>
              <p className="text-[11px] text-slate-400">100% verified merchant store</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-slate-900 text-xs">Dedicated Support</h5>
              <p className="text-[11px] text-slate-400">{config?.contact_phone || "Store Helpdesk"}</p>
            </div>
          </div>
        </div>

        {/* Main Footer Information */}
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm">{config?.store_name || "Merchant Store"}</h4>
            <p className="text-slate-500 max-w-md text-xs leading-relaxed">
              {config?.description || "Browse our exclusive product selection with verified delivery and customer support."}
            </p>
            <p className="text-slate-400 text-[11px] pt-1">
              {config?.business_address || "Registered Storefront Address"}
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-2">Store Navigation</h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href={`/app/store/${slug}`} className="hover:text-blue-600 transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link href={`/app/store/${slug}/cart`} className="hover:text-blue-600 transition-colors">
                  My Shopping Cart
                </Link>
              </li>
              <li>
                <Link href={`/app/store/${slug}/checkout`} className="hover:text-blue-600 transition-colors">
                  Direct Checkout
                </Link>
              </li>
              <li>
                <Link href={`/app/store/${slug}/account`} className="hover:text-blue-600 transition-colors">
                  My Orders & Account
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-2">Legal & Policies</h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => setActivePolicy("terms")}
                  className="hover:text-blue-600 transition-colors cursor-pointer text-left"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActivePolicy("privacy")}
                  className="hover:text-blue-600 transition-colors cursor-pointer text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActivePolicy("shipping")}
                  className="hover:text-blue-600 transition-colors cursor-pointer text-left"
                >
                  Shipping & Delivery
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActivePolicy("refund")}
                  className="hover:text-blue-600 transition-colors cursor-pointer text-left"
                >
                  Return & Refund
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-2">Customer Care</h4>
            <ul className="space-y-1.5 text-xs text-slate-500">
              <li>Email: <span className="text-slate-700 font-medium">{config?.contact_email || "N/A"}</span></li>
              <li>Phone: <span className="text-slate-700 font-medium">{config?.contact_phone || "N/A"}</span></li>
              <li>Hours: <span className="text-slate-700 font-medium">{config?.opening_hours || "Mon - Sat"}</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="max-w-6xl mx-auto px-4 mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400 text-[11px]">
          <span>&copy; {new Date().getFullYear()} {config?.store_name || "Merchant Store"}. All rights reserved.</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActivePolicy("terms")}
              className="hover:text-slate-600 transition-colors cursor-pointer"
            >
              Terms
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => setActivePolicy("privacy")}
              className="hover:text-slate-600 transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => setActivePolicy("shipping")}
              className="hover:text-slate-600 transition-colors cursor-pointer"
            >
              Shipping
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => setActivePolicy("refund")}
              className="hover:text-slate-600 transition-colors cursor-pointer"
            >
              Refunds
            </button>
          </div>
        </div>
      </footer>

      {/* Modal Popup */}
      {activePolicy && (
        <PolicyModal
          isOpen={Boolean(activePolicy)}
          onClose={() => setActivePolicy(null)}
          type={activePolicy}
          storeName={config?.store_name || "Store"}
          content={getPolicyContent(activePolicy)}
        />
      )}
    </>
  );
}

