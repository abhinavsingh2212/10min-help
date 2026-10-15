import React from 'react';
import Link from 'next/link';
import { ShieldCheck, PhoneCall, AlertTriangle, Lock, Eye, Share2 } from 'lucide-react';

export default function SafetyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-brand-500 text-slate-950 font-black flex items-center justify-center mx-auto shadow-sm">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          Customer Safety & Privacy Protocols
        </h1>
        <p className="text-gray-600 text-sm max-w-xl mx-auto">
          Your physical security and privacy are central to 10Min Help&apos;s operations.
        </p>
      </div>

      {/* Emergency Notice */}
      <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-red-900 space-y-2">
        <div className="flex items-center gap-2 font-bold text-sm">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <span>Important Notice: Roadside Vehicle Assistance vs Emergency Services</span>
        </div>
        <p className="text-xs text-red-800 leading-relaxed">
          10Min Help provides mechanical roadside vehicle assistance. We are <strong>not</strong> an emergency medical, fire, or police service. If you are in immediate personal physical danger, have been involved in a collision with injuries, or are stranded in an unsafe traffic lane, please immediately dial <strong>112 (National Emergency Number)</strong> or <strong>100 (Police)</strong>.
        </p>
      </div>

      {/* Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-slate-900">100% Verified Technicians</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Every mechanic on our platform undergoes government identity verification, trade skill vetting, and background checks by our operations team before receiving dispatch offers.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Share2 className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-slate-900">One-Tap Live Trip Sharing</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Share your live tracking link with family or friends. They can see the mechanic&apos;s arrival progress, photo, badge ID, and live location without needing an account.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-slate-900">Data Minimization</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            We only collect your phone number, vehicle model, and temporary location during an active assistance request. We never sell customer location history or store raw payment card numbers.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <PhoneCall className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-slate-900">24/7 Safety Command Desk</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Our supervisory dispatch operations center monitors delays, cancellations, and disputes in real time to guarantee prompt resolution and support.
          </p>
        </div>
      </div>
    </div>
  );
}
