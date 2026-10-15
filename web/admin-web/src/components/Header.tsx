'use client';

import React, { useState, useEffect } from 'react';
import { Bell, ShieldCheck, User } from 'lucide-react';
import { getStoredAdminToken } from '../lib/api';

export function Header() {
  const [adminName, setAdminName] = useState('Admin Operator');

  useEffect(() => {
    const userStr = localStorage.getItem('admin_user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setAdminName(u.name || 'Admin Operator');
      } catch {
        // default
      }
    }
  }, []);

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>System Healthy • Bangalore Pilot Active</span>
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          <span>{adminName}</span>
        </div>
      </div>
    </header>
  );
}
