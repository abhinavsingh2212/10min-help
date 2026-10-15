import React from 'react';
import Link from 'next/link';
import { Wrench, ShieldCheck, Clock, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-slate-900 text-gray-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-brand-500 text-slate-950 flex items-center justify-center font-black">
                <Wrench className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="font-extrabold text-xl text-white">10Min Help</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              India&apos;s rapid roadside emergency assistance platform. Verified local mechanics, upfront transparent pricing, and live GPS tracking for bikes and cars.
            </p>
            <div className="text-xs text-amber-400 bg-amber-950/40 border border-amber-800/60 p-2.5 rounded-lg flex items-start gap-2">
              <Clock className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                *10 minutes is our operational service dispatch target, calculated via real-time traffic and technician proximity.
              </span>
            </div>
          </div>

          {/* Emergency Services */}
          <div>
            <h4 className="text-white font-semibold text-sm tracking-wider uppercase mb-4">
              Emergency Services
            </h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/services/puncture" className="hover:text-amber-400">Puncture Repair</Link></li>
              <li><Link href="/services/battery" className="hover:text-amber-400">Battery Jump Start</Link></li>
              <li><Link href="/services/not-starting" className="hover:text-amber-400">Vehicle Not Starting</Link></li>
              <li><Link href="/services/fuel" className="hover:text-amber-400">Emergency Fuel Delivery</Link></li>
              <li><Link href="/services/lockout" className="hover:text-amber-400">Key Lockout Assistance</Link></li>
              <li><Link href="/services/towing" className="hover:text-amber-400">Hydraulic & Flatbed Towing</Link></li>
            </ul>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-white font-semibold text-sm tracking-wider uppercase mb-4">
              Trust & Safety
            </h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/safety" className="hover:text-amber-400">Verified Technicians Policy</Link></li>
              <li><Link href="/how-it-works" className="hover:text-amber-400">How Dispatch Works</Link></li>
              <li><Link href="/help" className="hover:text-amber-400">Emergency SOS & Help Desk</Link></li>
              <li><Link href="/terms" className="hover:text-amber-400">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-amber-400">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Pilot service area & support */}
          <div>
            <h4 className="text-white font-semibold text-sm tracking-wider uppercase mb-4">
              Service Availability
            </h4>
            <div className="space-y-3 text-sm text-gray-400">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-brand-500 mt-1 shrink-0" />
                <span>Active Pilot Zones: Bengaluru Central, Indiranagar, Koramangala, HSR Layout, Delhi NCR</span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
                <span>100% Background-Checked Technicians & Secure Digital Payments</span>
              </div>
              <div className="pt-2 text-xs text-gray-400">
                Helpline: <strong className="text-white">1800-10-HELP (1800-101010)</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-400 gap-4">
          <p>© {new Date().getFullYear()} 10Min Help Technologies India Private Limited. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/safety" className="hover:text-white">Safety</Link>
            <Link href="/help" className="hover:text-white">Help</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
