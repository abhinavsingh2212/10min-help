import React from 'react';

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
      <h1 className="text-3xl font-black text-slate-900 tracking-tight">Terms of Service</h1>
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4 text-xs text-gray-700 leading-relaxed">
        <p>Last updated: October 2026</p>
        <h2 className="text-sm font-bold text-slate-900">1. Service Scope</h2>
        <p>
          10Min Help is an emergency roadside vehicle assistance marketplace that connects registered vehicle owners with independent, verified mobile mechanics and towing operators.
        </p>
        <h2 className="text-sm font-bold text-slate-900">2. 10-Minute Operational Target</h2>
        <p>
          Ten minutes is an operational target based on average pilot traffic models and technician proximity, not a guaranteed contractual timeline. Uncontrollable delays such as severe weather, roadblocks, or traffic density may alter travel times. Realistic ETAs are displayed live on the tracking interface.
        </p>
        <h2 className="text-sm font-bold text-slate-900">3. Pricing and Quotations</h2>
        <p>
          Initial starting prices cover dispatch and standard diagnostic inspection. Any additional repair work or parts replacement requires the technician to propose a revised quote which the customer must explicitly approve before work begins.
        </p>
        <h2 className="text-sm font-bold text-slate-900">4. Cancellations</h2>
        <p>
          Customers may cancel free of charge at any time prior to the mechanic arriving at the breakdown location.
        </p>
      </div>
    </div>
  );
}
