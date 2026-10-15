'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Wrench, Clock, AlertCircle, ChevronRight, CheckCircle2 } from 'lucide-react';
import { bookingsApi, getStoredToken } from '../../lib/api';

export default function MyBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.push('/login?redirect=/my-bookings');
      return;
    }

    async function load() {
      try {
        const res = await bookingsApi.listMy();
        setBookings(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Bookings</h1>
          <p className="text-xs text-gray-500">Your roadside breakdown requests and service history.</p>
        </div>
        <Link
          href="/book"
          className="bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs"
        >
          New Request
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 space-y-4">
          <Wrench className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="font-bold text-lg text-slate-800">No Bookings Yet</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            When you request roadside emergency help, your active and past tickets will appear here.
          </p>
          <Link
            href="/book"
            className="inline-block bg-slate-900 text-white font-bold px-6 py-2.5 rounded-xl text-xs"
          >
            Request Assistance
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <Link
              key={b._id}
              href={`/booking/${b._id}`}
              className="block bg-white hover:bg-amber-50/30 rounded-2xl p-5 border border-gray-100 hover:border-amber-200 transition-all shadow-sm"
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-slate-900">
                      {b.service?.name || 'Roadside Assistance'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {b.vehicle?.vehicleType}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {b.vehicle?.manufacturer} {b.vehicle?.model} • {b.pickupLocation?.address || 'GPS Location'}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    {new Date(b.createdAt).toLocaleDateString()} at{' '}
                    {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="text-right">
                    <div className="font-black text-slate-900 text-base">
                      ₹{b.approvedFinalAmount || b.quotedPrice}
                    </div>
                    <div className="text-[11px] font-bold text-amber-700">{b.status}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
