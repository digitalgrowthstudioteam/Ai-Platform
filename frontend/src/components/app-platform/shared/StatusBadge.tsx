"use client";

import React from "react";

interface StatusBadgeProps {
  status?: string | null;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const label = status ? String(status).replace(/_/g, " ") : "N/A";
  const norm = (status || "").toUpperCase();

  let colorClasses = "bg-slate-100 text-slate-700 border-slate-200";

  switch (norm) {
    case "ACTIVE":
    case "DELIVERED":
    case "PAID":
    case "PUBLISHED":
    case "BUILT":
    case "SUCCESS":
      colorClasses = "bg-emerald-50 text-emerald-700 border-emerald-200";
      break;
    case "NEW":
    case "CONFIRMED":
    case "TRIAL":
    case "PROCESSING":
    case "IN_DEVELOPMENT":
      colorClasses = "bg-blue-50 text-blue-700 border-blue-200";
      break;
    case "PENDING":
    case "PENDING_REVIEW":
    case "QUEUED":
    case "OUT_OF_STOCK":
      colorClasses = "bg-amber-50 text-amber-700 border-amber-200";
      break;
    case "INACTIVE":
    case "CANCELLED":
    case "FAILED":
    case "SUSPENDED":
    case "EXPIRED":
      colorClasses = "bg-rose-50 text-rose-700 border-rose-200";
      break;
    default:
      colorClasses = "bg-slate-50 text-slate-700 border-slate-200";
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses}`}
    >
      {label}
    </span>
  );
}

