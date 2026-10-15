'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import { BookingStatus, PaymentStatus } from '@10min-help/shared';
import { CalendarCheck, Search, Filter, ShieldCheck, ChevronRight } from 'lucide-react';

export default function BookingsManagementPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await adminApi.listBookings({ status: statusFilter || undefined });
        setBookings(res.data?.bookings || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Booking Tickets</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Search, inspect lifecycle transitions, and manage dispatch status.
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-slate-900"
          >
            <option value="">All Statuses</option>
            {Object.values(BookingStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center text-xs text-gray-500">
          No bookings matching this status.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-bold border-b border-gray-100">
              <tr>
                <th className="py-3.5 px-4">Ticket</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Vehicle & Service</th>
                <th className="py-3.5 px-4">Mechanic</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map((b) => (
                <tr key={b._id} className="hover:bg-amber-50/20">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    #{b._id.substring(b._id.length - 6).toUpperCase()}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{b.customer?.name}</div>
                    <div className="text-[11px] text-gray-500">{b.customer?.phone}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{b.service?.name}</div>
                    <div className="text-[11px] text-gray-500">
                      {b.vehicle?.manufacturer} {b.vehicle?.model} ({b.vehicle?.vehicleType})
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {b.technician ? (
                      <div>
                        <div className="font-bold text-slate-900">{b.technician?.user?.name}</div>
                        <div className="text-[11px] text-gray-500">{b.technician?.user?.phone}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        b.status === BookingStatus.COMPLETED
                          ? 'bg-emerald-100 text-emerald-800'
                          : b.status === BookingStatus.CANCELLED
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    ₹{b.approvedFinalAmount || b.quotedPrice}
                  </td>
                  <td className="py-3.5 px-4 text-gray-500">
                    {new Date(b.createdAt).toLocaleDateString()}
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
