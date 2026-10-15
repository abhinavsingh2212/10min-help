import React from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, ShieldCheck, Wrench, CheckCircle2 } from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          How 10Min Help Works
        </h1>
        <p className="text-gray-600 text-sm max-w-xl mx-auto">
          We engineered the fastest roadside dispatch engine in India. Here is what happens from the moment your vehicle breaks down.
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-brand-500 text-slate-950 font-black flex items-center justify-center shrink-0">
            1
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-slate-900">Pin Location & Select Problem</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Open the web or mobile app. Our GPS detector locates your position with high precision. Choose your vehicle type (Bike or Car) and the breakdown issue. You receive an upfront, transparent starting quote immediately.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-brand-500 text-slate-950 font-black flex items-center justify-center shrink-0">
            2
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-slate-900">15-Second Algorithmic Dispatch</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Our dispatch engine queries all verified mechanics within your service radius (typically within 10 km). The highest-ranked candidate receives a timed offer window of 15 seconds. If declined or expired, the next candidate is automatically contacted.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-brand-500 text-slate-950 font-black flex items-center justify-center shrink-0">
            3
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-slate-900">Live Telemetry & Arrival</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Once assigned, you receive the technician’s verified identity, rating, and vehicle details. Live GPS coordinates update in real time as the mechanic drives to you.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-brand-500 text-slate-950 font-black flex items-center justify-center shrink-0">
            4
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-slate-900">Approval, Repair & Settlement</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              The mechanic diagnoses the vehicle. If unexpected parts are needed, you must approve the revised price on your screen before repair starts. Settle digitally via UPI, card, or cash, and rate your experience.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center pt-4">
        <Link
          href="/book"
          className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold px-8 py-3.5 rounded-2xl text-sm shadow-md"
        >
          <span>Try 10Min Help Now</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
