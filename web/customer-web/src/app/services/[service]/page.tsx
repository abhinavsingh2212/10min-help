'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Wrench, ShieldCheck, CheckCircle2, ArrowRight, ArrowLeft, Clock } from 'lucide-react';
import { INITIAL_SERVICE_CATALOGUE, VehicleType } from '@10min-help/shared';

export default function ServiceDetailPage() {
  const { service } = useParams() as { service: string };
  const router = useRouter();

  // Match category
  const formattedCategory = service.toUpperCase().replace(/-/g, '_');
  const serviceDef = INITIAL_SERVICE_CATALOGUE.find(
    (s) => s.category.toUpperCase() === formattedCategory
  ) || INITIAL_SERVICE_CATALOGUE[0];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Catalogue</span>
      </button>

      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-100 pb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
              Emergency Service
            </span>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
              {serviceDef.name}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/book?service=${serviceDef.category}&vehicle=bike`}
              className="bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs"
            >
              Book for Bike (₹{serviceDef.startingPrice[VehicleType.BIKE]})
            </Link>
            <Link
              href={`/book?service=${serviceDef.category}&vehicle=car`}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs"
            >
              Book for Car (₹{serviceDef.startingPrice[VehicleType.CAR]})
            </Link>
          </div>
        </div>

        <p className="text-gray-600 text-sm leading-relaxed">
          {serviceDef.description}
        </p>

        <div className="space-y-3">
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
            Inclusions & Service Scope
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {serviceDef.inclusions.map((inc, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{inc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-700" />
            <span>Price Protection Policy</span>
          </div>
          <p>
            If additional spare parts (e.g. tube replacement or new battery) are required, the technician must diagnose first and submit a revised quote. The customer must approve before work proceeds.
          </p>
        </div>
      </div>
    </div>
  );
}
