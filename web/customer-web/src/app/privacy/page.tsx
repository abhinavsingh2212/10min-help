import React from 'react';

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
      <h1 className="text-3xl font-black text-slate-900 tracking-tight">Privacy Policy</h1>
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4 text-xs text-gray-700 leading-relaxed">
        <p>Last updated: October 2026</p>
        <h2 className="text-sm font-bold text-slate-900">1. Data We Collect</h2>
        <p>
          We collect your mobile phone number for authentication, vehicle model for tool matching, and temporary GPS coordinates during an active assistance request.
        </p>
        <h2 className="text-sm font-bold text-slate-900">2. Real-Time Telemetry & Location Sharing</h2>
        <p>
          Location data is accessed only when you confirm assistance. Once a ticket is marked completed or cancelled, active real-time tracking is immediately terminated.
        </p>
        <h2 className="text-sm font-bold text-slate-900">3. Payment Information</h2>
        <p>
          All electronic transactions are processed through RBI-authorized payment aggregators. We never store raw debit or credit card credentials on our servers.
        </p>
      </div>
    </div>
  );
}
