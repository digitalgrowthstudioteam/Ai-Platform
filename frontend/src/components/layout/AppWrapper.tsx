"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ThemeProvider } from "@/context/ThemeContext";

import { AdAccountProvider } from "@/context/AdAccountContext";

interface AppWrapperProps {
  children: React.ReactNode;
}

export default function AppWrapper({ children }: AppWrapperProps) {
  const pathname = usePathname();
  const cleanPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
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
