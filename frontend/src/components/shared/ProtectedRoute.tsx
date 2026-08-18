"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--background)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <Loader2 className="animate-spin" size={32} style={{ color: "var(--primary)", margin: "0 auto 12px" }} />
          <div style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", fontWeight: 500 }}>
            Verifying session...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Prevent showing protected content while redirecting
  }

  return <>{children}</>;
}
