/**
 * Hardened Cloudflare Worker: subdomain-route
 *
 * Purpose:
 *   Proxies ONLY legitimate vendor subdomains (*.digitalgrowthstudio.in)
 *   and custom vendor domains to Firebase Hosting (digital-growth-studio.web.app)
 *   while blocking vulnerability scanners, invalid subdomains, and caching static assets.
 *
 * IMPORTANT:
 *   1. Do NOT attach this worker to digitalgrowthstudio.in/* or www.digitalgrowthstudio.in/*
 *      (add "None" bypass routes for www.digitalgrowthstudio.in/*, api.digitalgrowthstudio.in/*,
 *      and remove digitalgrowthstudio.in/* so the main site goes straight to Firebase Hosting!).
 *   2. Pair with Cloudflare WAF Custom Rules + Bot Fight Mode so bad bots are blocked
 *      BEFORE this worker is ever billed.
 */

const ORIGIN_HOST = "digital-growth-studio.web.app";

// Common scanner / infrastructure subdomains that are NEVER vendor stores
const BLOCKED_SUBDOMAINS = new Set([
  "mail", "webmail", "smtp", "pop", "pop3", "imap", "mx", "autodiscover",
  "cpanel", "whm", "plesk", "ftp", "sftp", "ssh", "vpn", "remote", "rdp",
  "ns1", "ns2", "ns3", "dns", "owa", "exchange", "intranet", "internal",
  "db", "sql", "mysql", "postgres", "redis", "mongo", "phpmyadmin",
  "dev", "staging", "stage", "test", "testing", "beta", "old", "backup",
  "admin", "administrator", "root", "server", "host", "proxy", "gateway",
  "blog", "forum", "wiki", "status", "monitor", "metrics", "git", "ci",
  "images", "img", "cdn", "static", "assets", "media", "files", "download"
]);

// Vulnerability scanner / exploit path patterns
const BLOCKED_PATH_REGEX = /\.(php|asp|aspx|jsp|cgi|pl|py|sh|env|git|sql|bak|old|orig|zip|tar|gz|rar|ini|log|yml|yaml|xmlrpc)$/i;
const BLOCKED_PATH_PREFIXES = [
  "/wp-admin", "/wp-login", "/wp-content", "/wp-includes", "/wordpress",
  "/.env", "/.git", "/.well-known/security", "/phpmyadmin", "/pma",
  "/cgi-bin", "/xmlrpc", "/vendor/phpunit", "/boaform", "/actuator",
  "/solr", "/console", "/config", "/backup"
];

// Known aggressive scraper bots
const BLOCKED_UA_REGEX = /(bytespider|gptbot|ccbot|claudebot|petalbot|ahrefsbot|semrushbot|mj12bot|dotbot|blexbot|dataforseobot|zgrab|masscan|nikto|sqlmap|nmap|acunetix|python-requests|go-http-client|curl\/|wget\/)/i;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();
    const ua = request.headers.get("user-agent") || "";

    // 1. Only allow safe HTTP methods for static storefront hosting
    if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "OPTIONS") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // 2. Block known exploit/scanner paths immediately (0 origin hits to Firebase)
    if (
      BLOCKED_PATH_REGEX.test(pathname) ||
      BLOCKED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    ) {
      return new Response("Not Found", {
        status: 404,
        headers: { "Cache-Control": "public, max-age=86400" },
      });
    }

    // 3. Block empty User-Agent or aggressive scrapers/scanners
    if (!ua || BLOCKED_UA_REGEX.test(ua)) {
      return new Response("Forbidden", { status: 403 });
    }

    // 4. Validate subdomain on digitalgrowthstudio.in
    if (hostname.endsWith(".digitalgrowthstudio.in")) {
      const sub = hostname.replace(".digitalgrowthstudio.in", "");
      // Reject multi-level subdomains (a.b.digitalgrowthstudio.in), invalid slugs, or blocked infra names
      if (
        sub.includes(".") ||
        !/^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]?$/.test(sub) ||
        BLOCKED_SUBDOMAINS.has(sub)
      ) {
        return new Response("Store Not Found", {
          status: 404,
          headers: { "Cache-Control": "public, max-age=3600" },
        });
      }
    }

    // 5. Check Cloudflare Edge Cache first for GET/HEAD requests
    const cache = caches.default;
    const isImmutableStatic = pathname.startsWith("/_next/static/");
    const isStaticAsset =
      isImmutableStatic ||
      /\.(js|css|png|jpg|jpeg|webp|svg|ico|woff|woff2|ttf|json|txt)$/i.test(pathname);

    if (request.method === "GET") {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    // 6. Proxy to Firebase Hosting origin with Cloudflare fetch caching enabled
    const originUrl = new URL(request.url);
    originUrl.hostname = ORIGIN_HOST;

    const originResponse = await fetch(originUrl.toString(), {
      method: request.method,
      headers: {
        "User-Agent": ua,
        Accept: request.headers.get("accept") || "*/*",
        "Accept-Encoding": request.headers.get("accept-encoding") || "gzip, br",
      },
      cf: {
        cacheEverything: isStaticAsset,
        cacheTtlByStatus: isImmutableStatic
          ? { "200-299": 31536000, "404": 300 }
          : isStaticAsset
          ? { "200-299": 604800, "404": 300 }
          : { "200-299": 300, "404": 300 },
      },
    });

    // 7. Clone response and enforce proper caching headers
    const headers = new Headers(originResponse.headers);
    if (isImmutableStatic && originResponse.ok) {
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (isStaticAsset && originResponse.ok) {
      headers.set("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
    } else if (originResponse.ok) {
      headers.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
    }

    const response = new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers,
    });

    if (request.method === "GET" && (originResponse.ok || originResponse.status === 404)) {
      ctx.waitUntil(cache.put(request, response.clone()));
    }

    return response;
  },
};
