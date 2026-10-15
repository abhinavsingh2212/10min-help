'use client';

import React, { useState } from 'react';
import { HelpCircle, Phone, Mail, ChevronDown, CheckCircle2 } from 'lucide-react';

const FAQS = [
  {
    q: 'Is the 10-minute arrival guaranteed?',
    a: 'Ten minutes is our primary operational target. We use smart routing and local mechanic density to reach stranded drivers within 10 minutes in our active pilot zones. However, extreme traffic, severe weather, or remote locations can affect travel times. Your live tracking screen always displays a realistic ETA.',
  },
  {
    q: 'How does pricing work?',
    a: 'Every service starts with a fixed base rate (e.g. ₹120 for bike puncture, ₹200 for car puncture) covering dispatch and inspection. If extra parts are required, the mechanic provides a revised quotation which you must explicitly approve on your screen before any additional work begins.',
  },
  {
    q: 'What payment methods are supported?',
    a: 'We support all major Indian payment methods through our secure gateway—including UPI (Google Pay, PhonePe, Paytm), Debit/Credit cards, Netbanking, and Cash on completion.',
  },
  {
    q: 'Can I cancel my request?',
    a: 'Yes, you can cancel free of charge at any point while searching or before the mechanic approaches your location.',
  },
];

export default function HelpPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [reported, setReported] = useState(false);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Help & FAQs</h1>
        <p className="text-gray-600 text-sm">
          Need immediate support? Reach out directly or check answers to common roadside questions.
        </p>
      </div>

      {/* Emergency Contact Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href="tel:1800101010"
          className="bg-brand-500 hover:bg-brand-600 p-6 rounded-3xl text-slate-950 flex items-center gap-4 transition-all shadow-sm"
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center font-bold">
            <Phone className="w-6 h-6 text-brand-400" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">Toll-Free Emergency SOS</div>
            <div className="text-xl font-black">1800-101010</div>
          </div>
        </a>

        <a
          href="mailto:support@10minhelp.in"
          className="bg-slate-900 hover:bg-slate-800 p-6 rounded-3xl text-white flex items-center gap-4 transition-all shadow-sm"
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-brand-400 flex items-center justify-center font-bold">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Email Helpdesk</div>
            <div className="text-lg font-black">support@10minhelp.in</div>
          </div>
        </a>
      </div>

      {/* FAQs */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="border border-gray-100 rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full p-4 text-left font-bold text-sm text-slate-900 flex justify-between items-center hover:bg-gray-50 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 transition-transform ${openIndex === i ? 'rotate-180' : ''}`}
                />
              </button>
              {openIndex === i && (
                <div className="p-4 pt-0 text-xs text-gray-600 leading-relaxed border-t border-gray-50 bg-gray-50/50">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
