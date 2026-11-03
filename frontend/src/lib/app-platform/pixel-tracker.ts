/**
 * Multi-Platform Pixel & Analytics Tracking Engine
 * Supports: Meta Pixel (Facebook/Instagram), Google Tag Manager (GTM), Google Analytics 4 (GA4),
 * and Platform Internal Analytics Data Lake.
 */
import { platformApi } from "./api";

export interface PixelStoreConfig {
  store_slug?: string;
  meta_pixel_id?: string;
  gtm_id?: string;
  ga4_id?: string;
  tracking_enabled?: boolean;
}

/** Get or create persistent anonymous visitor ID */
function getVisitorId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let vid = localStorage.getItem("dgs_visitor_id");
    if (!vid) {
      vid = "v_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
      localStorage.setItem("dgs_visitor_id", vid);
    }
    return vid;
  } catch (e) {
    return "anonymous";
  }
}

/** Detect device category from user agent */
function getDeviceType(): string {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) return "mobile";
  return "desktop";
}

/** Detect traffic source */
function getTrafficSource(): string {
  if (typeof window === "undefined") return "direct";
  try {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source");
    if (utmSource) return utmSource.toLowerCase();

    const referrer = document.referrer.toLowerCase();
    if (!referrer) return "direct";
    if (referrer.includes("instagram.com") || referrer.includes("facebook.com") || referrer.includes("fb.me")) return "meta";
    if (referrer.includes("whatsapp.com") || referrer.includes("wa.me")) return "whatsapp";
    if (referrer.includes("google.")) return "google";
    if (referrer.includes("youtube.")) return "youtube";
    return "referral";
  } catch (e) {
    return "direct";
  }
}

/** Internal backend telemetry dispatch */
function sendBackendEvent(
  slug: string | undefined,
  eventType: string,
  extra: {
    productId?: string;
    productName?: string;
    value?: number;
    city?: string;
  } = {}
) {
  if (!slug || typeof window === "undefined") return;
  try {
    platformApi.trackStoreEvent(slug, {
      event_type: eventType,
      product_id: extra.productId,
      product_name: extra.productName,
      value: extra.value,
      source: getTrafficSource(),
      device: getDeviceType(),
      visitor_id: getVisitorId(),
      city: extra.city,
      url_path: window.location.pathname,
    });
  } catch (e) {
    // Non-blocking telemetry
  }
}

export const pixelTracker = {
  /**
   * Track Page View
   */
  trackPageView(config?: PixelStoreConfig, pageTitle?: string) {
    if (typeof window === "undefined" || !config || config.tracking_enabled === false) return;

    // Meta Pixel
    if (config.meta_pixel_id && typeof window.fbq === "function") {
      try {
        window.fbq("track", "PageView");
      } catch (e) {}
    }

    // GA4
    if (config.ga4_id && typeof window.gtag === "function") {
      try {
        window.gtag("event", "page_view", {
          page_title: pageTitle || document.title,
          page_location: window.location.href,
        });
      } catch (e) {}
    }

    // GTM
    if (config.gtm_id && Array.isArray(window.dataLayer)) {
      try {
        window.dataLayer.push({
          event: "page_view",
          pageTitle: pageTitle || document.title,
          pageUrl: window.location.href,
        });
      } catch (e) {}
    }

    // Backend Store Event
    sendBackendEvent(config.store_slug, "page_view");
  },

  /**
   * Track View Content (Product details view)
   */
  trackViewContent(
    config?: PixelStoreConfig,
    product?: { id: string; name: string; price: number; category?: string }
  ) {
    if (typeof window === "undefined" || !config || !product || config.tracking_enabled === false) return;

    // Meta Pixel
    if (config.meta_pixel_id && typeof window.fbq === "function") {
      try {
        window.fbq("track", "ViewContent", {
          content_name: product.name,
          content_ids: [String(product.id)],
          content_type: "product",
          value: product.price,
          currency: "INR",
        });
      } catch (e) {}
    }

    // GA4
    if (config.ga4_id && typeof window.gtag === "function") {
      try {
        window.gtag("event", "view_item", {
          currency: "INR",
          value: product.price,
          items: [
            {
              item_id: String(product.id),
              item_name: product.name,
              item_category: product.category,
              price: product.price,
            },
          ],
        });
      } catch (e) {}
    }

    // GTM
    if (config.gtm_id && Array.isArray(window.dataLayer)) {
      try {
        window.dataLayer.push({
          event: "view_item",
          ecommerce: {
            currency: "INR",
            value: product.price,
            items: [
              {
                item_id: String(product.id),
                item_name: product.name,
                item_category: product.category,
                price: product.price,
              },
            ],
          },
        });
      } catch (e) {}
    }

    // Backend Store Event
    sendBackendEvent(config.store_slug, "product_view", {
      productId: String(product.id),
      productName: product.name,
      value: product.price,
    });
  },

  /**
   * Track Add To Cart
   */
  trackAddToCart(
    config?: PixelStoreConfig,
    product?: { id: string; name: string; price: number; quantity?: number }
  ) {
    if (typeof window === "undefined" || !config || !product || config.tracking_enabled === false) return;
    const qty = product.quantity || 1;
    const totalVal = product.price * qty;

    // Meta Pixel
    if (config.meta_pixel_id && typeof window.fbq === "function") {
      try {
        window.fbq("track", "AddToCart", {
          content_name: product.name,
          content_ids: [String(product.id)],
          content_type: "product",
          value: totalVal,
          currency: "INR",
        });
      } catch (e) {}
    }

    // GA4
    if (config.ga4_id && typeof window.gtag === "function") {
      try {
        window.gtag("event", "add_to_cart", {
          currency: "INR",
          value: totalVal,
          items: [
            {
              item_id: String(product.id),
              item_name: product.name,
              price: product.price,
              quantity: qty,
            },
          ],
        });
      } catch (e) {}
    }

    // GTM
    if (config.gtm_id && Array.isArray(window.dataLayer)) {
      try {
        window.dataLayer.push({
          event: "add_to_cart",
          ecommerce: {
            currency: "INR",
            value: totalVal,
            items: [
              {
                item_id: String(product.id),
                item_name: product.name,
                price: product.price,
                quantity: qty,
              },
            ],
          },
        });
      } catch (e) {}
    }

    // Backend Store Event
    sendBackendEvent(config.store_slug, "add_to_cart", {
      productId: String(product.id),
      productName: product.name,
      value: totalVal,
    });
  },

  /**
   * Track Add To Wishlist
   */
  trackAddToWishlist(
    config?: PixelStoreConfig,
    product?: { id: string; name: string; price: number }
  ) {
    if (typeof window === "undefined" || !config || !product || config.tracking_enabled === false) return;

    // Meta Pixel
    if (config.meta_pixel_id && typeof window.fbq === "function") {
      try {
        window.fbq("track", "AddToWishlist", {
          content_name: product.name,
          content_ids: [String(product.id)],
          value: product.price,
          currency: "INR",
        });
      } catch (e) {}
    }

    // GA4
    if (config.ga4_id && typeof window.gtag === "function") {
      try {
        window.gtag("event", "add_to_wishlist", {
          currency: "INR",
          value: product.price,
          items: [
            {
              item_id: String(product.id),
              item_name: product.name,
              price: product.price,
            },
          ],
        });
      } catch (e) {}
    }

    // GTM
    if (config.gtm_id && Array.isArray(window.dataLayer)) {
      try {
        window.dataLayer.push({
          event: "add_to_wishlist",
          ecommerce: {
            currency: "INR",
            value: product.price,
            items: [
              {
                item_id: String(product.id),
                item_name: product.name,
                price: product.price,
              },
            ],
          },
        });
      } catch (e) {}
    }

    // Backend Store Event
    sendBackendEvent(config.store_slug, "wishlist", {
      productId: String(product.id),
      productName: product.name,
      value: product.price,
    });
  },

  /**
   * Track Initiate Checkout
   */
  trackInitiateCheckout(
    config?: PixelStoreConfig,
    cart?: { total: number; itemCount: number }
  ) {
    if (typeof window === "undefined" || !config || !cart || config.tracking_enabled === false) return;

    // Meta Pixel
    if (config.meta_pixel_id && typeof window.fbq === "function") {
      try {
        window.fbq("track", "InitiateCheckout", {
          num_items: cart.itemCount,
          value: cart.total,
          currency: "INR",
        });
      } catch (e) {}
    }

    // GA4
    if (config.ga4_id && typeof window.gtag === "function") {
      try {
        window.gtag("event", "begin_checkout", {
          currency: "INR",
          value: cart.total,
        });
      } catch (e) {}
    }

    // GTM
    if (config.gtm_id && Array.isArray(window.dataLayer)) {
      try {
        window.dataLayer.push({
          event: "begin_checkout",
          ecommerce: {
            currency: "INR",
            value: cart.total,
          },
        });
      } catch (e) {}
    }

    // Backend Store Event
    sendBackendEvent(config.store_slug, "checkout_started", {
      value: cart.total,
    });
  },

  /**
   * Track Purchase
   */
  trackPurchase(
    config?: PixelStoreConfig,
    order?: { id: string; total_amount: number; city?: string; items?: any[] }
  ) {
    if (typeof window === "undefined" || !config || !order || config.tracking_enabled === false) return;

    // Meta Pixel
    if (config.meta_pixel_id && typeof window.fbq === "function") {
      try {
        window.fbq("track", "Purchase", {
          content_type: "product",
          value: order.total_amount,
          currency: "INR",
          order_id: order.id,
        });
      } catch (e) {}
    }

    // GA4
    if (config.ga4_id && typeof window.gtag === "function") {
      try {
        window.gtag("event", "purchase", {
          transaction_id: order.id,
          value: order.total_amount,
          currency: "INR",
          items: (order.items || []).map((it: any) => ({
            item_id: String(it.product_id || it.id),
            item_name: it.product_name || it.name,
            price: it.price,
            quantity: it.quantity,
          })),
        });
      } catch (e) {}
    }

    // GTM
    if (config.gtm_id && Array.isArray(window.dataLayer)) {
      try {
        window.dataLayer.push({
          event: "purchase",
          ecommerce: {
            transaction_id: order.id,
            value: order.total_amount,
            currency: "INR",
          },
        });
      } catch (e) {}
    }

    // Backend Store Event
    sendBackendEvent(config.store_slug, "purchase", {
      value: order.total_amount,
      city: order.city,
    });
  },

  /**
   * Track WhatsApp Chat Click (High Intent Conversion Action)
   */
  trackWhatsAppClick(
    config?: PixelStoreConfig,
    data?: { productName?: string; productId?: string; price?: number; source?: string }
  ) {
    if (typeof window === "undefined" || !config || config.tracking_enabled === false) return;

    // Meta Pixel Contact Lead event
    if (config.meta_pixel_id && typeof window.fbq === "function") {
      try {
        window.fbq("trackCustom", "WhatsAppOrderClick", {
          content_name: data?.productName || "General Store Chat",
          value: data?.price || 0,
          currency: "INR",
        });
        window.fbq("track", "Contact");
      } catch (e) {}
    }

    // GA4
    if (config.ga4_id && typeof window.gtag === "function") {
      try {
        window.gtag("event", "whatsapp_chat_click", {
          product_name: data?.productName || "General",
          source: data?.source || "storefront",
        });
      } catch (e) {}
    }

    // GTM
    if (config.gtm_id && Array.isArray(window.dataLayer)) {
      try {
        window.dataLayer.push({
          event: "whatsapp_chat_click",
          product_name: data?.productName || "General",
          source: data?.source || "storefront",
        });
      } catch (e) {}
    }

    // Backend Store Event
    sendBackendEvent(config.store_slug, "whatsapp_click", {
      productId: data?.productId,
      productName: data?.productName,
      value: data?.price,
    });
  },
};
