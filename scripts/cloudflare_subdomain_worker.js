/**
 * Hardened Cloudflare Worker: subdomain-route
 *
 * Preserves exact subdomain storefront rewriting (/app/store/{sub})
 * while blocking recon scanners (.js.map, /debug, /api-docs, fake subdomains)
 * and enabling Cloudflare Edge Caching for static assets.
 */

const ORIGIN_HOST = "digital-growth-studio.web.app";

const BLOCKED_SUBDOMAINS = new Set([
  "assets", "static", "cdn", "media", "images", "img", "files", "download",
  "mail", "webmail", "smtp", "pop", "pop3", "imap", "mx", "autodiscover",
  "cpanel", "whm", "plesk", "ftp", "sftp", "ssh", "vpn", "remote", "rdp",
  "ns1", "ns2", "ns3", "dns", "owa", "exchange", "intranet", "internal",
  "db", "sql", "mysql", "postgres", "redis", "mongo", "phpmyadmin",
  "dev", "staging", "stage", "test", "testing", "beta", "old", "backup",
  "admin", "administrator", "root", "server", "host", "proxy", "gateway",
  "blog", "forum", "wiki", "status", "monitor", "metrics", "git", "ci",
  "portal", "auth", "sso", "login", "billing", "docs", "help", "support"
]);

const BLOCKED_PATH_REGEX = /\.(map|php|asp|aspx|jsp|cgi|pl|py|sh|env|git|sql|bak|old|orig|zip|tar|gz|rar|ini|log|yml|yaml)$/i;
const BLOCKED_PATH_PREFIXES = [
  "/debug", "/api-docs", "/swagger", "/graphql", "/actuator", "/metrics",
  "/wp-admin", "/wp-login", "/wp-content", "/wp-includes", "/wordpress",
  "/.env", "/.git", "/phpmyadmin", "/pma", "/cgi-bin", "/xmlrpc",
  "/vendor/phpunit", "/boaform", "/solr", "/console", "/backup"
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();
    const pathnameLower = url.pathname.toLowerCase();

    // 1. Force HTTPS
    if (url.protocol === "http:") {
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }

    // 2. Let API requests pass directly to Render backend
    if (hostname.startsWith("api.")) {
      return fetch(request);
    }

    // 3. Block recon scanners & exploit paths immediately (0 hits to Firebase)
    if (
      BLOCKED_PATH_REGEX.test(pathnameLower) ||
      BLOCKED_PATH_PREFIXES.some((prefix) => pathnameLower.startsWith(prefix))
    ) {
      return new Response("Not Found", {
        status: 404,
        headers: { "Cache-Control": "public, max-age=86400" },
      });
    }

    // 4. Subdomain validation & Storefront Rewriting
    // e.g. https://xyz.digitalgrowthstudio.in/cart -> internally fetches /app/store/xyz/cart
    const hostParts = hostname.split(".");
    if (hostParts.length >= 3 && hostname.endsWith(".digitalgrowthstudio.in")) {
      const sub = hostParts[0];
      if (hostParts.length > 3 || BLOCKED_SUBDOMAINS.has(sub)) {
        return new Response("Store Not Found", {
          status: 404,
          headers: { "Cache-Control": "public, max-age=3600" },
        });
      }
      if (!["www", "app", "api", "admin", "platform"].includes(sub)) {
        if (
          !url.pathname.startsWith("/app/store/") &&
          !url.pathname.startsWith("/_next/") &&
          !url.pathname.includes(".")
        ) {
          url.pathname = `/app/store/${sub}${url.pathname === "/" ? "" : url.pathname}`;
        }
      }
    }

    // 5. Check Cloudflare Edge Cache for GET requests
    const cache = caches.default;
    const isImmutableStatic = pathnameLower.startsWith("/_next/static/");
    const isStaticAsset =
      isImmutableStatic ||
      /\.(js|css|png|jpg|jpeg|webp|svg|ico|woff|woff2|ttf|json|txt)$/i.test(pathnameLower);

    if (request.method === "GET") {
      const cached = await cache.match(request);
      if (cached) return cached;
    }

    // 6. Connect to Firebase Hosting origin with edge caching
    url.hostname = ORIGIN_HOST;
    const newRequest = new Request(url.toString(), request);
    const originResponse = await fetch(newRequest, {
      cf: {
        cacheEverything: isStaticAsset,
        cacheTtlByStatus: isImmutableStatic
          ? { "200-299": 31536000, "404": 300 }
          : isStaticAsset
          ? { "200-299": 604800, "404": 300 }
          : { "200-299": 300, "404": 300 },
      },
    });

    const headers = new Headers(originResponse.headers);
    if (isImmutableStatic && originResponse.ok) {
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (isStaticAsset && originResponse.ok) {
      headers.set("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
    }

    const response = new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers,
    });

    if (request.method === "GET" && originResponse.ok) {
      ctx.waitUntil(cache.put(request, response.clone()));
    }

    return response;
  },
};
