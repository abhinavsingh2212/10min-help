'use client';

import React, { useState, useEffect } from 'react';
import {
  Radio,
  MapPin,
  Clock,
  Wrench,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { adminApi } from '../../lib/api';

export default function DispatchMapPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await adminApi.getLiveMap();
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 10000); // refresh telemetry every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const onlineTechs = data?.onlineTechnicians || [];
  const activeBookings = data?.activeBookings || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Live Dispatch Radar & Telemetry
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Active GPS locations of mechanics and customers across Bengaluru Pilot Zone.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Polling Live Telemetry</span>
        </div>
      </div>

      {/* Visual Live Map Grid Representation */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md space-y-6 border border-slate-800">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold uppercase tracking-wider text-brand-400">
            Zone: Indiranagar & Koramangala Radar Grid
          </span>
          <span className="text-gray-400">
            {onlineTechs.length} Technicians Online • {activeBookings.length} Active Bookings
          </span>
        </div>

        {/* Map Canvas Graphic */}
        <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-8 min-h-[340px] flex flex-col justify-between relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 z-10">
            {onlineTechs.map((tech: any) => (
              <div
                key={tech._id}
                className="bg-slate-900/90 border border-slate-700/80 p-3.5 rounded-xl space-y-2 backdrop-blur"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="font-bold text-xs text-white">
                      {tech.user?.name || 'Mechanic Partner'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-400">
                    ★ {tech.ratingAverage || 5.0}
                  </span>
                </div>

                <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                  <span className="truncate">
                    {tech.currentLocation?.address || 'Indiranagar 100ft Road'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-slate-800">
                  <span>Vehicles: {tech.supportedVehicles?.join(', ')}</span>
                  <span className={tech.activeBookingId ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                    {tech.activeBookingId ? 'On Active Job' : 'Idle / Available'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-gray-500 pt-4 border-t border-slate-800/80 flex justify-between items-center z-10">
            <span>Center: 12.9784° N, 77.6408° E (Bengaluru Core)</span>
            <span>Standard Radius: 10 KM</span>
          </div>
        </div>
      </div>

      {/* Active Requests Queue Table */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">
          Active Assistance Queue
        </h2>

        {activeBookings.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500 bg-gray-50 rounded-2xl border border-gray-100">
            No pending roadside breakdowns currently in queue. All pilot dispatches resolved.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activeBookings.map((b: any) => (
              <div key={b._id} className="py-3.5 flex justify-between items-center text-xs">
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span>{b.service?.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                      {b.status}
                    </span>
                  </div>
                  <div className="text-gray-500 mt-0.5">
                    Customer: {b.customer?.name} ({b.customer?.phone}) • {b.pickupLocation?.address}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-slate-900">₹{b.approvedFinalAmount || b.quotedPrice}</div>
                  <div className="text-[11px] text-gray-400">
                    Mechanic: {b.technician?.user?.name || 'Searching...'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
