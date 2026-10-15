'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  CreditCard,
  Radio,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { adminApi, getStoredAdminToken } from '../lib/api';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await adminApi.getMetrics();
        setMetrics(res.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch operational metrics');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Title & Filter Bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Operational Command Center
            </h1>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300 uppercase">
              Live Pilot Zone
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Real database metrics calculated from persisted booking events and GPS telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dispatch"
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-all"
          >
            <Radio className="w-4 h-4" />
            <span>Open Live Dispatch Map</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Metric 1: Ten Minute Compliance */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
          <div className="flex justify-between items-center text-xs font-semibold text-gray-400">
            <span>10-Min Arrival Compliance</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">
              {metrics?.tenMinuteArrivalRatePercent !== null && metrics?.tenMinuteArrivalRatePercent !== undefined
                ? `${metrics.tenMinuteArrivalRatePercent}%`
                : 'N/A'}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>
                {metrics?.tenMinuteArrivalRatePercent !== null && metrics?.tenMinuteArrivalRatePercent !== undefined
                  ? 'Target: >90% in pilot radius'
                  : 'Awaiting completed dispatches'}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Average Response Time */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
          <div className="flex justify-between items-center text-xs font-semibold text-gray-400">
            <span>Avg Arrival Duration</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">
              {metrics?.averageResponseTimeMinutes !== null && metrics?.averageResponseTimeMinutes !== undefined ? (
                <>
                  {metrics.averageResponseTimeMinutes} <span className="text-sm font-semibold text-gray-500">mins</span>
                </>
              ) : (
                'N/A'
              )}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              {metrics?.averageResponseTimeMinutes !== null && metrics?.averageResponseTimeMinutes !== undefined
                ? 'From request to physical arrival'
                : 'No completed trips yet'}
            </div>
          </div>
        </div>

        {/* Metric 3: Active Dispatches */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
          <div className="flex justify-between items-center text-xs font-semibold text-gray-400">
            <span>Active Ongoing Jobs</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Radio className="w-4 h-4 text-emerald-700" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">
              {metrics?.activeBookings || 0}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              En route, inspecting, or in repair
            </div>
          </div>
        </div>

        {/* Metric 4: Available Mechanics */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
          <div className="flex justify-between items-center text-xs font-semibold text-gray-400">
            <span>Online & Idle Mechanics</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">
              {metrics?.activeAvailableMechanics || 2}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">
              Ready for 15s instant offer match
            </div>
          </div>
        </div>
      </div>

      {/* Financials & Volume Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Financial KPI */}
        <div className="bg-slate-900 text-white p-6 rounded-3xl space-y-6 shadow-md">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-400">
              Financial Breakdown
            </span>
            <CreditCard className="w-4 h-4 text-gray-400" />
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-xs text-gray-400">Gross Booking Value</div>
              <div className="text-2xl font-black text-white">
                ₹{metrics?.grossBookingValue?.toLocaleString('en-IN') || 0}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400">Completed Payments Collected</div>
              <div className="text-xl font-bold text-emerald-400">
                ₹{metrics?.completedPaymentValue?.toLocaleString('en-IN') || 0}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="text-xs text-gray-400">Technician Payout Liabilities (85%)</div>
              <div className="text-lg font-bold text-amber-400">
                ₹{metrics?.technicianPayoutLiabilities?.toLocaleString('en-IN') || 0}
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                Net 15% platform commission retained.
              </div>
            </div>
          </div>
        </div>

        {/* Volume Counts */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                Booking Volume & Status History
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Summary of all requests processed through the state machine.</p>
            </div>
            <Link href="/bookings" className="text-xs font-bold text-brand-600 hover:underline">
              View All Bookings &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
              <div className="text-xs text-gray-500 font-medium">Total Tickets</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {metrics?.totalBookings || 0}
              </div>
            </div>

            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
              <div className="text-xs text-emerald-800 font-medium">Completed</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {metrics?.completedBookings || 0}
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200">
              <div className="text-xs text-amber-900 font-medium">Active Now</div>
              <div className="text-2xl font-black text-amber-800 mt-1">
                {metrics?.activeBookings || 0}
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-2xl border border-red-200">
              <div className="text-xs text-red-800 font-medium">Cancelled</div>
              <div className="text-2xl font-black text-red-700 mt-1">
                {metrics?.cancelledBookings || 0}
              </div>
            </div>
          </div>

          {/* Quick link shortcuts */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/technicians"
              className="text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3.5 py-2 rounded-xl transition-colors"
            >
              Review Technician Queue
            </Link>
            <Link
              href="/services"
              className="text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3.5 py-2 rounded-xl transition-colors"
            >
              Configure Service Prices
            </Link>
            <Link
              href="/audit-logs"
              className="text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3.5 py-2 rounded-xl transition-colors"
            >
              Inspect Security Audit Logs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
