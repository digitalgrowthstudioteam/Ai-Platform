"use client";

import React, { useEffect } from "react";
import { PixelStoreConfig, pixelTracker } from "@/lib/app-platform/pixel-tracker";

interface PixelInjectorProps {
  config?: PixelStoreConfig;
  pageTitle?: string;
}

export default function PixelInjector({ config, pageTitle }: PixelInjectorProps) {
  useEffect(() => {
    if (!config || config.tracking_enabled === false) return;

    // 1. Meta Pixel (Facebook / Instagram)
    if (config.meta_pixel_id && typeof window !== "undefined") {
      const pixelId = config.meta_pixel_id.trim();
      const existingMetaScript = document.getElementById(`meta-pixel-${pixelId}`);

      if (!existingMetaScript && pixelId) {
        /* eslint-disable */
        (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
          if (f.fbq) return;
          n = f.fbq = function () {
            n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
          };
          if (!f._fbq) f._fbq = n;
          n.push = n;
          n.loaded = true;
          n.version = "2.0";
          n.queue = [];
          t = b.createElement(e);
          t.async = true;
          t.id = `meta-pixel-${pixelId}`;
          t.src = v;
          s = b.getElementsByTagName(e)[0];
          if (s && s.parentNode) {
            s.parentNode.insertBefore(t, s);
          } else {
            b.head.appendChild(t);
          }
        })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
        /* eslint-enable */

        if (window.fbq) {
          window.fbq("init", pixelId);
        }
      }
    }

    // 2. Google Analytics 4 (GA4)
    if (config.ga4_id && typeof window !== "undefined") {
      const ga4Id = config.ga4_id.trim();
      const existingGaScript = document.getElementById(`ga4-script-${ga4Id}`);

      if (!existingGaScript && ga4Id) {
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () {
          window.dataLayer?.push(arguments);
        };
        window.gtag("js", new Date());
        window.gtag("config", ga4Id, { send_page_view: false });

        const script = document.createElement("script");
        script.id = `ga4-script-${ga4Id}`;
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`;
        document.head.appendChild(script);
      }
    }

    // 3. Google Tag Manager (GTM)
    if (config.gtm_id && typeof window !== "undefined") {
      const gtmId = config.gtm_id.trim();
      const existingGtmScript = document.getElementById(`gtm-script-${gtmId}`);

      if (!existingGtmScript && gtmId) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          "gtm.start": new Date().getTime(),
          event: "gtm.js",
        });

        const script = document.createElement("script");
        script.id = `gtm-script-${gtmId}`;
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
        document.head.appendChild(script);
      }
    }

    // 4. Fire page view on initial load
    pixelTracker.trackPageView(config, pageTitle);
  }, [config?.meta_pixel_id, config?.gtm_id, config?.ga4_id, config?.tracking_enabled, pageTitle]);

  return null;
}
