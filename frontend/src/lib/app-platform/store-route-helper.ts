/**
 * Safe Route Parameter Resolver for Next.js Static Export & Firebase Hosting Rewrites
 * 
 * In Next.js static export (output: 'export'), dynamic pages rewritten by hosting (e.g. Firebase)
 * may have placeholder route params ('placeholder', 'sample') on initial SSR/static bundle.
 * This utility resolves the true slug, productId, and orderId by falling back to window.location.pathname.
 */
export function isSubdomainAccess(): boolean {
  if (typeof window === "undefined") return false;
  const hostParts = window.location.hostname.split(".");
  if (hostParts.length >= 3) {
    const sub = hostParts[0].toLowerCase();
    return !["www", "app", "api", "admin", "platform", "localhost", "127"].includes(sub);
  }
  return false;
}

export function getStoreHref(slug: string, subpath: string = ""): string {
  const cleanSubpath = subpath ? (subpath.startsWith("/") ? subpath : `/${subpath}`) : "";
  // In Next.js static export, all store pages are compiled under /app/store/{slug}
  // Using the canonical route ensures Next.js client router renders product and cart pages instantly without 404 or login bails
  return `/app/store/${slug}${cleanSubpath}`;
}

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
    } else {
      // Look for subdomain e.g. dgs.digitalgrowthstudio.in or custom domain e.g. kcaariwork.com
      const hostname = window.location.hostname.toLowerCase();
      const hostParts = hostname.split(".");
      if (hostParts.length >= 3 && hostname.includes("digitalgrowthstudio.in")) {
        const sub = hostParts[0];
        if (!["www", "app", "api", "admin", "platform", "localhost", "127"].includes(sub)) {
          slug = sub;
        }
      } else if (
        !hostname.includes("digitalgrowthstudio.in") &&
        !hostname.includes("web.app") &&
        !hostname.includes("localhost") &&
        !hostname.includes("127.0.0.1")
      ) {
        // Direct Custom Domain e.g. kcaariwork.com or shop.mybrand.in
        slug = hostname.replace(/^www\./, "");
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

