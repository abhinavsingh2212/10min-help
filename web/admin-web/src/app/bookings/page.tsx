'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import { BookingStatus, PaymentStatus } from '@10min-help/shared';
import { Filter, UserCheck, FileText, X, AlertCircle, Loader2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

export default function BookingsManagementPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Manual Assignment Modal State
  const [assignModalBooking, setAssignModalBooking] = useState<any | null>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  const [loadingTechs, setLoadingTechs] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const res = await adminApi.listBookings({ status: statusFilter || undefined });
      setBookings(res.data?.bookings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [statusFilter]);

  const openAssignModal = async (booking: any) => {
    setAssignModalBooking(booking);
    setSelectedTechId('');
    setAssignError(null);
    setAssignSuccess(null);
    try {
      setLoadingTechs(true);
      const res = await adminApi.listTechnicians('VERIFIED');
      // Filter for online technicians who don't already have an active booking
      const availableTechs = (res.data || []).filter(
        (t: any) => t.isOnline && !t.activeBookingId
      );
      setTechnicians(availableTechs);
      if (availableTechs.length > 0) {
        setSelectedTechId(availableTechs[0]._id);
      }
    } catch (err: any) {
      setAssignError('Failed to fetch available mechanics');
    } finally {
      setLoadingTechs(false);
    }
  };

  const handleManualAssign = async () => {
    if (!assignModalBooking || !selectedTechId) return;
    setAssigning(true);
    setAssignError(null);
    try {
      await adminApi.manualAssign(assignModalBooking._id, selectedTechId);
      setAssignSuccess('Technician successfully assigned to booking.');
      setTimeout(() => {
        setAssignModalBooking(null);
        loadBookings();
      }, 1000);
    } catch (err: any) {
      setAssignError(err.message || 'Failed to manually assign technician.');
    } finally {
      setAssigning(false);
    }
  };

  const isAssignable = (status: string) => {
    return (
      status === BookingStatus.REQUESTED ||
      status === BookingStatus.SEARCHING ||
      status === BookingStatus.UNFULFILLED
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Booking Tickets</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Search, inspect lifecycle transitions, dispatch mechanics, and download invoices.
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
                <th className="py-3.5 px-4 text-right">Actions</th>
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
                  <td className="py-3.5 px-4 text-right space-x-2">
                    {isAssignable(b.status) && (
                      <button
                        onClick={() => openAssignModal(b)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold rounded-lg text-[11px] shadow-sm transition-all"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Assign</span>
                      </button>
                    )}
                    {b.paymentStatus === PaymentStatus.PAID && (
                      <a
                        href={`${API_BASE}/bookings/${b._id}/invoice?format=html`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-slate-700 font-semibold rounded-lg text-[11px] transition-all"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Invoice</span>
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual Assignment Modal */}
      {assignModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Manual Dispatch Assignment</h3>
                <p className="text-xs text-gray-500 font-mono">
                  Ticket #{assignModalBooking._id.substring(assignModalBooking._id.length - 6).toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setAssignModalBooking(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 p-3 rounded-2xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Service:</span>
                <span className="font-bold text-slate-900">{assignModalBooking.service?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Vehicle:</span>
                <span className="font-bold text-slate-900">
                  {assignModalBooking.vehicle?.manufacturer} {assignModalBooking.vehicle?.model} ({assignModalBooking.vehicle?.vehicleType})
                </span>
              </div>
            </div>

            {assignError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{assignError}</span>
              </div>
            )}

            {assignSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs">
                {assignSuccess}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Select Available Verified Mechanic:</label>
              {loadingTechs ? (
                <div className="py-4 text-center text-xs text-gray-500">Finding available mechanics...</div>
              ) : technicians.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                  No online verified mechanics currently available without an active booking.
                </div>
              ) : (
                <select
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-slate-900"
                >
                  {technicians.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.user?.name || t.businessName} ({t.user?.phone}) - {t.supportedVehicles?.join(', ')}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAssignModalBooking(null)}
                className="px-4 py-2 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleManualAssign}
                disabled={assigning || !selectedTechId || technicians.length === 0}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5"
              >
                {assigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>{assigning ? 'Assigning...' : 'Confirm Assignment'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
