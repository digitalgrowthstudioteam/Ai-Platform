"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ThemeProvider } from "@/context/ThemeContext";
import { isSubdomainAccess } from "@/lib/app-platform/store-route-helper";

import { AdAccountProvider } from "@/context/AdAccountContext";

interface AppWrapperProps {
  children: React.ReactNode;
}

export default function AppWrapper({ children }: AppWrapperProps) {
  const pathname = usePathname();
  const cleanPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");

  // Brand Subdomain Protection: Under no circumstances show parent SaaS pages on a vendor subdomain
  useEffect(() => {
    if (typeof window !== "undefined" && isSubdomainAccess()) {
      const isAllowedStoreRoute =
        cleanPath === "/" ||
        cleanPath.startsWith("/app/store") ||
        cleanPath.startsWith("/store") ||
        cleanPath.startsWith("/products") ||
        cleanPath.startsWith("/order") ||
        ["/cart", "/checkout", "/account", "/login", "/signup"].includes(cleanPath);

      if (!isAllowedStoreRoute) {
        // Redirect directly to the store homepage on the vendor subdomain
        window.location.replace("/");
      }
    }
  }, [cleanPath]);

  // Multi-vendor e-commerce app platform (/app/*) or brand subdomain is completely isolated
  const isSubdomain = typeof window !== "undefined" && isSubdomainAccess();
  if (cleanPath === "/app" || cleanPath.startsWith("/app/") || isSubdomain) {
    return <>{children}</>;
  }

  const isPublicRoute = [
    "/",
    "/privacy",
    "/terms",
    "/security",
    "/meta-integration",
    "/data-deletion",
    "/health-check",
    "/recommendation",
    "/get-meta-ads",
    "/get-meta-ads/free-plan",
    "/get-ads",
  ].includes(cleanPath) || cleanPath.startsWith("/pay-quotation");
  const isAuthRoute = ["/login", "/signup", "/reset-password"].includes(cleanPath);

  if (isPublicRoute || isAuthRoute) {
    return (
      <AuthProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <ProtectedRoute>
          <AdAccountProvider>
            <DashboardLayout>{children}</DashboardLayout>
          </AdAccountProvider>
        </ProtectedRoute>
      </ThemeProvider>
    </AuthProvider>
  );
}
