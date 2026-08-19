"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";

import { AdAccountProvider } from "@/context/AdAccountContext";

interface AppWrapperProps {
  children: React.ReactNode;
}

export default function AppWrapper({ children }: AppWrapperProps) {
  const pathname = usePathname();
  const cleanPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
  const isPublicRoute = ["/", "/privacy", "/data-deletion"].includes(cleanPath);
  const isAuthRoute = ["/login", "/signup", "/reset-password"].includes(cleanPath);

  if (isPublicRoute || isAuthRoute) {
    return <AuthProvider>{children}</AuthProvider>;
  }

  return (
    <AuthProvider>
      <ProtectedRoute>
        <AdAccountProvider>
          <DashboardLayout>{children}</DashboardLayout>
        </AdAccountProvider>
      </ProtectedRoute>
    </AuthProvider>
  );
}
