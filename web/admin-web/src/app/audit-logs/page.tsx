'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import { ShieldAlert, Clock, User, Filter } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await adminApi.getAuditLogs(50);
        setLogs(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Security & Audit Logs</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Immutable audit trail of operator dispatch decisions, technician approvals, and price updates.
        </p>
      </div>

      {loading ? (
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center text-xs text-gray-500">
          No audit entries recorded yet.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-bold border-b border-gray-100">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Actor</th>
                <th className="py-3.5 px-4">Target Entity</th>
                <th className="py-3.5 px-4">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log._id} className="hover:bg-amber-50/20">
                  <td className="py-3.5 px-4 text-gray-500 font-mono">
                    {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-[11px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">
                    {log.actorRole || 'SYSTEM'}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-gray-600">
                    {log.entityType} ({log.entityId?.substring(0, 10)}...)
                  </td>
                  <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px] truncate max-w-xs">
                    {JSON.stringify(log.metadata || {})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
