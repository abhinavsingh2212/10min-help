'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Phone, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { adminApi, setStoredAdminToken } from '../../lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('9999999999');
  const [otp, setOtp] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await adminApi.login(phone, otp);
      setStoredAdminToken(res.data.tokens.accessToken);
      localStorage.setItem('admin_user', JSON.stringify(res.data.user));
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Admin authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-3xl p-8 space-y-6 text-white shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-brand-500 text-slate-950 font-black flex items-center justify-center mx-auto shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Operations Console Login</h1>
          <p className="text-xs text-gray-400">
            Authorized administrative & dispatcher access only.
          </p>
        </div>

        {/* Demo banner */}
        <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl text-xs text-amber-300 flex justify-between items-center">
          <span>Demo Admin: <strong>9999999999</strong> (OTP: 123456)</span>
          <button
            type="button"
            onClick={() => {
              setPhone('9999999999');
              setOtp('123456');
            }}
            className="bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold px-2 py-0.5 rounded text-[10px]"
          >
            Fill
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
              Admin Mobile Number
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
              Security OTP Code
            </label>
            <input
              type="text"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono tracking-widest text-center text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-400 text-slate-950 font-black py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            {loading ? <span>Authenticating...</span> : <span>Enter Operations Console</span>}
          </button>
        </form>
      </div>
    </div>
  );
}
