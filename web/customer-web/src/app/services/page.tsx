'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Wrench,
  Bike,
  Car,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { INITIAL_SERVICE_CATALOGUE, VehicleType } from '@10min-help/shared';

export default function ServicesPage() {
  const [vehicle, setVehicle] = useState<VehicleType>(VehicleType.BIKE);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Title */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          Transparent Emergency Service Catalogue
        </h1>
        <p className="text-gray-600 text-sm">
          No surge pricing. No surprises. Every service begins with a fixed starting rate that covers dispatch and initial diagnostics.
        </p>

        {/* Vehicle Toggle */}
        <div className="inline-flex p-1.5 bg-gray-200/80 rounded-2xl gap-2 mt-4">
          <button
            onClick={() => setVehicle(VehicleType.BIKE)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
              vehicle === VehicleType.BIKE
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Bike className="w-4 h-4" />
            <span>Motorcycles & Scooters</span>
          </button>
          <button
            onClick={() => setVehicle(VehicleType.CAR)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
              vehicle === VehicleType.CAR
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>Cars & Four-Wheelers</span>
          </button>
        </div>
      </div>

      {/* Services Table & Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {INITIAL_SERVICE_CATALOGUE.map((svc) => {
          const bikePrice = svc.startingPrice[VehicleType.BIKE];
          const carPrice = svc.startingPrice[VehicleType.CAR];
          const activePrice = svc.startingPrice[vehicle];

          return (
            <div
              key={svc.category}
              className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4 hover:border-amber-200 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">{svc.name}</h2>
                    <p className="text-xs text-gray-500 mt-1">{svc.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Starting Price</span>
                    <div className="text-2xl font-black text-brand-600">₹{activePrice}</div>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-2xl space-y-1.5">
                  <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                    What is Included:
                  </div>
                  {svc.inclusions.map((inc, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{inc}</span>
                    </div>
                  ))}
                </div>

                {/* Price Matrix comparison */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                  <span>Bike: ₹{bikePrice}</span>
                  <span>Car: ₹{carPrice}</span>
                  <span className="flex items-center gap-1 text-gray-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>~{svc.estimatedDurationMinutes} mins</span>
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <Link
                  href={`/services/${svc.category.toLowerCase().replace(/_/g, '-')}`}
                  className="text-xs font-bold text-gray-600 hover:text-brand-600"
                >
                  View Details & Guide
                </Link>
                <Link
                  href={`/book?service=${svc.category}&vehicle=${vehicle.toLowerCase()}`}
                  className="bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1 shadow-sm"
                >
                  <span>Book for ₹{activePrice}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
