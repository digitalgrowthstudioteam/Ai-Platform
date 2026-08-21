"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

const resetSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

type ResetFormData = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetFormData) => {
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      await resetPassword(data.email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--background)",
        padding: 20,
      }}
    >
      <div
        className="card animate-fade-in"
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--card)",
        }}
      >
        <div className="card-body" style={{ padding: "32px 24px" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <img src="/logo.jpg" alt="DG" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "contain" }} />
            </div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
              Reset Password
            </h2>
            <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>
              We will send you a secure link to reset your password
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div
              style={{
                background: "var(--success-light)",
                border: "1px solid var(--success)",
                color: "var(--success)",
                padding: "10px 12px",
                borderRadius: "var(--radius)",
                fontSize: "0.8125rem",
                marginBottom: 16,
                fontWeight: 500,
              }}
            >
              Check your inbox. A password reset link has been sent to your email.
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div
              style={{
                background: "var(--critical-light)",
                border: "1px solid var(--critical)",
                color: "var(--critical)",
                padding: "10px 12px",
                borderRadius: "var(--radius)",
                fontSize: "0.8125rem",
                marginBottom: 16,
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Email */}
            <div style={{ marginBottom: 20 }}>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  marginBottom: 6,
                  color: "var(--foreground)",
                }}
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register("email")}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontSize: "0.875rem",
                  background: "var(--card)",
                  outline: "none",
                  boxShadow: "var(--shadow-sm)",
                }}
              />
              {errors.email && (
                <p style={{ color: "var(--critical)", fontSize: "0.75rem", marginTop: 4 }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: "100%",
                padding: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} style={{ marginRight: 8 }} />
                  Sending link...
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>
          </form>

          {/* Link back to login */}
          <div style={{ textAlign: "center", fontSize: "0.8125rem" }}>
            Remembered your password?{" "}
            <Link
              href="/login"
              style={{
                color: "var(--primary)",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
