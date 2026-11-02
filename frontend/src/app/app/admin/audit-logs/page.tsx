"use client";

import React, { useEffect, useState } from "react";
import { platformApi } from "@/lib/app-platform/api";
import { FileText, Shield, Clock } from "lucide-react";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await platformApi.getAuditLogs();
        setLogs(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Security Audit Logs</h1>
        <p className="text-sm text-slate-500">Immutable trail of critical actions, vendor status modifications, and administrative operations</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <Shield className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            No audit events recorded yet.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-purple-700">{log.action}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">{log.actor_role}</td>
                  <td className="py-3.5 px-4 text-slate-600">{log.resource_type} ({log.resource_id || "N/A"})</td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] truncate max-w-xs">{log.details_json || "—"}</td>
                  <td className="py-3.5 px-4 text-right text-slate-400 font-mono">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

