'use client';

import React from 'react';
import { BarChart3, TrendingUp, Clock, ShieldCheck, Download } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Operational Analytics & SLA Reports
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            10-minute compliance metrics, revenue realization, and fleet response times.
          </p>
        </div>

        <button
          onClick={() => alert('Exporting CSV summary report...')}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export Analytics CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Target SLA Met</div>
          <div className="text-3xl font-black text-emerald-600">92%</div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Arrived within 10 minutes from customer confirmation in Bangalore pilot zone.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Offer Acceptance Rate</div>
          <div className="text-3xl font-black text-slate-900">88.4%</div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Offers accepted by the first dispatched mechanic within the 15-second window.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Customer Satisfaction</div>
          <div className="text-3xl font-black text-amber-500">4.88 / 5.0</div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Aggregate rating across all completed roadside jobs.
          </p>
        </div>
      </div>
    </div>
  );
}
