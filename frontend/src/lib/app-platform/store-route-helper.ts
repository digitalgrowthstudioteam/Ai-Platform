/**
 * Safe Route Parameter Resolver for Next.js Static Export & Firebase Hosting Rewrites
 * 
 * In Next.js static export (output: 'export'), dynamic pages rewritten by hosting (e.g. Firebase)
 * may have placeholder route params ('placeholder', 'sample') on initial SSR/static bundle.
 * This utility resolves the true slug, productId, and orderId by falling back to window.location.pathname.
 */
export function getStoreRouteParams(params?: {
  slug?: string;
  productId?: string;
  orderId?: string;
}): {
  slug: string;
  productId: string;
  orderId: string;
} {
  let slug = (params?.slug as string) || "";
  let productId = (params?.productId as string) || "";
  let orderId = (params?.orderId as string) || "";

  if (typeof window !== "undefined") {
    const pathname = window.location.pathname;
    const parts = pathname.split("/").filter(Boolean);

    // Look for /app/store/{slug}
    const storeIdx = parts.indexOf("store");
    if (storeIdx !== -1 && parts.length > storeIdx + 1) {
      const pSlug = decodeURIComponent(parts[storeIdx + 1]);
      if (pSlug && pSlug !== "placeholder") {
        slug = pSlug;
      }
    }

    // Look for /products/{productId}
    const prodIdx = parts.indexOf("products");
    if (prodIdx !== -1 && parts.length > prodIdx + 1) {
      const pId = decodeURIComponent(parts[prodIdx + 1]);
      if (pId && pId !== "sample") {
        productId = pId;
      }
    }

    // Look for /order/{orderId}
    const orderIdx = parts.indexOf("order");
    if (orderIdx !== -1 && parts.length > orderIdx + 1) {
      const oId = decodeURIComponent(parts[orderIdx + 1]);
      if (oId && oId !== "sample") {
        orderId = oId;
      }
    }
  }

  // Fallback slug if empty or placeholder
  if (!slug || slug === "placeholder") {
    slug = "abc";
  }

  return { slug, productId, orderId };
}

