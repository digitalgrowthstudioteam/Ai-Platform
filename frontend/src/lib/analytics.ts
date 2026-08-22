/**
 * Digital Growth Studio — Google Analytics 4 (GA4) Utility
 * 
 * Provides:
 * - Automatic page_view tracking via Next.js route changes
 * - Custom event helpers: sign_up, login, purchase, plan_upgrade, etc.
 * - Zero local storage — uses gtag.js loaded from Google CDN
 */

import * as pixel from "./pixel";

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "";

// Safely reference window.gtag
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

/**
 * Track a page view event with GA4
 */
export const pageview = (url: string) => {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("config", GA_MEASUREMENT_ID, {
    page_path: url,
  });
};

/**
 * Fire a custom GA4 event
 */
export const event = (action: string, params?: Record<string, any>) => {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", action, params);
};

// ────────────────────────────────────────────
// Pre-defined event helpers
// ────────────────────────────────────────────

/** Track user sign-up */
export const trackSignUp = (method: string) => {
  event("sign_up", { method });
  pixel.trackSignUp(method);
};

/** Track user login */
export const trackLogin = (method: string) => {
  event("login", { method });
  pixel.event("Login", { method });
};

/** Track checkout initiation */
export const trackInitiateCheckout = (planId: string, amount: number, currency = "INR") => {
  event("begin_checkout", {
    value: amount,
    currency,
    items: [{ item_id: planId, item_name: planId.replace("_", " ").toUpperCase(), price: amount }],
  });
  pixel.trackInitiateCheckout(planId, amount, currency);
};

/** Track Razorpay purchase / plan upgrade */
export const trackPurchase = (planId: string, amount: number, currency = "INR") => {
  event("purchase", {
    transaction_id: `dgs_${Date.now()}`,
    value: amount,
    currency,
    items: [{ item_id: planId, item_name: planId.replace("_", " ").toUpperCase(), price: amount }],
  });
  pixel.trackPurchase(planId, amount, currency);
};

/** Track plan upgrade event */
export const trackPlanUpgrade = (fromPlan: string, toPlan: string) => {
  event("plan_upgrade", { from_plan: fromPlan, to_plan: toPlan });
};

/** Track Meta Ad Account connection */
export const trackAdAccountConnect = (accountId: string) => {
  event("ad_account_connect", { account_id: accountId });
};

/** Track support ticket creation */
export const trackTicketCreated = () => {
  event("support_ticket_created");
};

/** Track account deletion scheduled */
export const trackAccountDeletion = () => {
  event("account_deletion_scheduled");
};
