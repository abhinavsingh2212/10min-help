'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Radio,
  CalendarCheck,
  Users,
  Sliders,
  BarChart3,
  ShieldAlert,
  LogOut,
  Wrench,
} from 'lucide-react';
import { clearStoredAdminToken } from '../lib/api';

const NAV_ITEMS = [
  { href: '/', label: 'Overview & KPIs', icon: LayoutDashboard },
  { href: '/dispatch', label: 'Live Dispatch Map', icon: Radio },
  { href: '/bookings', label: 'All Bookings', icon: CalendarCheck },
  { href: '/technicians', label: 'Technician Review', icon: Users },
  { href: '/services', label: 'Pricing Catalogue', icon: Sliders },
  { href: '/reports', label: 'Operational Reports', icon: BarChart3 },
  { href: '/audit-logs', label: 'Audit Trail', icon: ShieldAlert },
];

export function Sidebar() {
  const pathname = usePathname();

  const handleLogout = () => {
    clearStoredAdminToken();
    window.location.href = '/login';
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 min-h-screen border-r border-slate-800">
      <div>
        {/* Brand */}
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-brand-500 text-slate-950 flex items-center justify-center font-black">
            <Wrench className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-white text-base">10Min</span>
              <span className="font-bold text-brand-500 text-base">Ops</span>
            </div>
            <span className="text-[9px] text-gray-400 uppercase tracking-widest font-semibold block -mt-1">
              Dispatch & Admin
            </span>
          </div>
        </div>

        {/* Links */}
        <nav className="p-4 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-brand-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit Ops Session</span>
        </button>
      </div>
    </aside>
  );
}
