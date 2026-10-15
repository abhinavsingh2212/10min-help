'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Wrench,
  Bike,
  Car,
  Clock,
  ShieldCheck,
  MapPin,
  ArrowRight,
  BatteryCharging,
  Fuel,
  Key,
  Disc,
  Truck,
  CheckCircle2,
  Star,
  AlertTriangle,
} from 'lucide-react';
import { INITIAL_SERVICE_CATALOGUE, VehicleType, ServiceCategory } from '@10min-help/shared';

export default function HomePage() {
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>(VehicleType.BIKE);

  const getServiceIcon = (category: ServiceCategory) => {
    switch (category) {
      case ServiceCategory.PUNCTURE:
        return <Disc className="w-6 h-6 text-amber-600" />;
      case ServiceCategory.BATTERY:
        return <BatteryCharging className="w-6 h-6 text-amber-600" />;
      case ServiceCategory.NOT_STARTING:
        return <AlertTriangle className="w-6 h-6 text-amber-600" />;
      case ServiceCategory.FUEL:
        return <Fuel className="w-6 h-6 text-amber-600" />;
      case ServiceCategory.LOCKOUT:
        return <Key className="w-6 h-6 text-amber-600" />;
      case ServiceCategory.TYRE_CHANGE:
        return <Disc className="w-6 h-6 text-amber-600" />;
      case ServiceCategory.TOWING:
        return <Truck className="w-6 h-6 text-amber-600" />;
      default:
        return <Wrench className="w-6 h-6 text-amber-600" />;
    }
  };

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent pt-12 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Vision & Action */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-amber-100 border border-amber-300 text-amber-900 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Target Arrival: 10 Minutes</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                Stranded on the road? <br />
                <span className="text-brand-600 underline decoration-brand-300 decoration-wavy">
                  We reach. You relax.
                </span>
              </h1>

              <p className="text-lg text-gray-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Connect with verified local mechanics instantly. Flat tyres, dead batteries, lockouts, or engine troubles—help arrives right at your GPS coordinates.
              </p>

              {/* Vehicle Toggle Banner */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <div className="bg-white p-1 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-1">
                  <button
                    onClick={() => setSelectedVehicle(VehicleType.BIKE)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                      selectedVehicle === VehicleType.BIKE
                        ? 'bg-brand-500 text-slate-950 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Bike className="w-5 h-5" />
                    <span>Two-Wheeler / Bike</span>
                  </button>
                  <button
                    onClick={() => setSelectedVehicle(VehicleType.CAR)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                      selectedVehicle === VehicleType.CAR
                        ? 'bg-brand-500 text-slate-950 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Car className="w-5 h-5" />
                    <span>Four-Wheeler / Car</span>
                  </button>
                </div>

                <Link
                  href={`/book?vehicle=${selectedVehicle.toLowerCase()}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 py-3.5 rounded-2xl shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 text-base"
                >
                  <span>Request Emergency Help</span>
                  <ArrowRight className="w-5 h-5 text-brand-400" />
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-gray-600 font-medium">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>100% Verified Mechanics</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-brand-600" />
                  <span>Live GPS Tracking</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>Transparent Upfront Quotes</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual Card */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md bg-white rounded-3xl p-6 shadow-xl border border-gray-100 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="font-bold text-sm text-slate-800">
                      Dispatched Fleet Active
                    </span>
                  </div>
                  <span className="text-xs bg-amber-50 text-amber-800 font-semibold px-2.5 py-1 rounded-full border border-amber-200">
                    Live Pilot Zone
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500 font-medium">Average Arrival Time</div>
                      <div className="text-2xl font-black text-slate-900">8.5 Minutes</div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Clock className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500 font-medium">Starting Assistance Price</div>
                      <div className="text-2xl font-black text-emerald-600">
                        ₹{selectedVehicle === VehicleType.BIKE ? '120' : '200'}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 text-right">
                      Fixed Base Rate<br />No Hidden Surcharges
                    </div>
                  </div>
                </div>

                <Link
                  href="/book"
                  className="block w-full text-center bg-brand-500 hover:bg-brand-600 text-slate-950 font-black py-3.5 rounded-xl shadow-sm hover:shadow transition-all"
                >
                  Get Help In 10 Minutes
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Catalogue Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Emergency Roadside Catalogue
          </h2>
          <p className="text-gray-600">
            Selected starting prices for{' '}
            <strong className="text-brand-700 font-semibold">
              {selectedVehicle === VehicleType.BIKE ? 'Motorcycles & Scooters' : 'Cars & Four-Wheelers'}
            </strong>
            . Admin-governed pricing with full customer approval before any repairs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {INITIAL_SERVICE_CATALOGUE.map((svc) => {
            const price = svc.startingPrice[selectedVehicle];
            return (
              <div
                key={svc.category}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group hover:border-amber-200"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                    {getServiceIcon(svc.category)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-brand-600 transition-colors">
                      {svc.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                      {svc.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-50 space-y-1">
                    {svc.inclusions.slice(0, 2).map((inc, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{inc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                      Starting At
                    </div>
                    <div className="text-2xl font-black text-slate-900">₹{price}</div>
                  </div>
                  <Link
                    href={`/book?service=${svc.category}&vehicle=${selectedVehicle.toLowerCase()}`}
                    className="bg-amber-50 hover:bg-brand-500 text-amber-900 hover:text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs transition-colors flex items-center gap-1"
                  >
                    <span>Select</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4-Step Process Section */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <h2 className="text-3xl font-extrabold">How 10Min Help Works</h2>
            <p className="text-gray-400 text-sm">
              Zero stress roadside breakdown resolution in 4 transparent stages.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/60 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-brand-500 text-slate-950 font-black flex items-center justify-center text-lg">
                1
              </div>
              <h3 className="font-bold text-lg text-white">Tap Help Now</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Confirm your vehicle and GPS location. Pick your problem for an instant upfront price quote.
              </p>
            </div>

            <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/60 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-brand-500 text-slate-950 font-black flex items-center justify-center text-lg">
                2
              </div>
              <h3 className="font-bold text-lg text-white">15s Dispatch Match</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Our algorithm contacts the highest-ranked nearby verified mechanic with a 15-second response window.
              </p>
            </div>

            <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/60 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-brand-500 text-slate-950 font-black flex items-center justify-center text-lg">
                3
              </div>
              <h3 className="font-bold text-lg text-white">Live Tracking & Diagnosis</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Watch the technician approach on the map. On arrival, diagnosis starts with complete safety verification.
              </p>
            </div>

            <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/60 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-brand-500 text-slate-950 font-black flex items-center justify-center text-lg">
                4
              </div>
              <h3 className="font-bold text-lg text-white">Drive Off Safely</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Pay securely via UPI, Card, or Cash only after service completion. Rate your technician to maintain standards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Safety & Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-3xl p-8 sm:p-12 text-slate-950 flex flex-col md:flex-row items-center justify-between gap-8 shadow-lg">
          <div className="space-y-3 max-w-2xl">
            <h3 className="text-2xl sm:text-3xl font-black">
              Emergency SOS & Trusted Contact Sharing
            </h3>
            <p className="text-slate-900 text-sm leading-relaxed font-medium">
              We take safety seriously. Share your live assistance tracking link with family in one click. Every technician is police verified, badged, and reviewed by fellow motorists.
            </p>
          </div>
          <Link
            href="/safety"
            className="shrink-0 bg-slate-950 hover:bg-slate-900 text-white font-bold px-6 py-3.5 rounded-2xl text-sm transition-all"
          >
            Learn About Safety Protocols
          </Link>
        </div>
      </section>
    </div>
  );
}
