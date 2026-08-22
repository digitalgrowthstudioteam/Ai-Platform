/**
 * Digital Growth Studio — Meta Pixel / Dataset Utility
 * 
 * Provides safely typed functions to track pageviews and standard events in client-side code.
 */

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";

// Safely reference window.fbq
declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

/**
 * Track a page view event with Meta Pixel
 */
export const pageview = () => {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", "PageView");
};

/**
 * Fire a standard or custom Meta Pixel event
 */
export const event = (name: string, options?: Record<string, any>) => {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", name, options);
};

// ────────────────────────────────────────────
// Pre-defined event helpers
// ────────────────────────────────────────────

/** Track user sign-up / complete registration */
export const trackSignUp = (method: string) => {
  event("CompleteRegistration", { content_name: method });
};

/** Track when checkout process is initiated */
export const trackInitiateCheckout = (planId: string, value: number, currency = "INR") => {
  event("InitiateCheckout", {
    content_ids: [planId],
    content_type: "product",
    value,
    currency,
  });
};

/** Track plan purchase conversion */
export const trackPurchase = (planId: string, value: number, currency = "INR") => {
  event("Purchase", {
    content_ids: [planId],
    content_type: "product",
    value,
    currency,
  });
};
