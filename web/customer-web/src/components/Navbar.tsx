'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldAlert, Wrench, Menu, X, User, PhoneCall } from 'lucide-react';
import { getStoredToken, clearStoredToken } from '../lib/api';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      setIsLoggedIn(true);
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setUserName(user.name?.split(' ')[0] || 'Account');
        } catch {
          setUserName('Account');
        }
      }
    }
  }, []);

  const handleLogout = () => {
    clearStoredToken();
    setIsLoggedIn(false);
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-brand-500 text-slate-900 flex items-center justify-center font-black shadow-md group-hover:bg-brand-400 transition-colors">
              <Wrench className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-slate-900">10Min</span>
                <span className="font-bold text-xl text-brand-600">Help</span>
              </div>
              <span className="text-[10px] text-gray-500 tracking-wider uppercase font-medium block -mt-1">
                We reach. You relax.
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-700">
            <Link href="/services" className="hover:text-brand-600 transition-colors">
              Services & Pricing
            </Link>
            <Link href="/how-it-works" className="hover:text-brand-600 transition-colors">
              How It Works
            </Link>
            <Link href="/safety" className="hover:text-brand-600 transition-colors">
              Safety & Guarantee
            </Link>
            <Link href="/help" className="hover:text-brand-600 transition-colors">
              Help & FAQs
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="tel:1800101010"
              className="flex items-center gap-2 text-xs font-semibold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5 text-brand-600" />
              <span>24x7 SOS: 1800-101010</span>
            </a>

            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/my-bookings"
                  className="text-sm font-semibold text-gray-700 hover:text-brand-600 transition-colors"
                >
                  My Bookings
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-800 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100"
                >
                  <User className="w-4 h-4 text-brand-600" />
                  <span>{userName}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-xs text-red-600 hover:underline font-medium"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-sm font-semibold text-gray-700 hover:text-brand-600 transition-colors"
              >
                Sign In
              </Link>
            )}

            <Link
              href="/book"
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm shadow-sm transition-all hover:shadow hover:-translate-y-0.5"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Get Help Now</span>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/book"
              className="bg-brand-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs"
            >
              Help Now
            </Link>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <Link
            href="/services"
            onClick={() => setIsOpen(false)}
            className="block py-2 text-base font-medium text-gray-800"
          >
            Services & Pricing
          </Link>
          <Link
            href="/how-it-works"
            onClick={() => setIsOpen(false)}
            className="block py-2 text-base font-medium text-gray-800"
          >
            How It Works
          </Link>
          <Link
            href="/safety"
            onClick={() => setIsOpen(false)}
            className="block py-2 text-base font-medium text-gray-800"
          >
            Safety Standards
          </Link>
          <Link
            href="/help"
            onClick={() => setIsOpen(false)}
            className="block py-2 text-base font-medium text-gray-800"
          >
            Help & FAQs
          </Link>
          <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">
            {isLoggedIn ? (
              <>
                <Link
                  href="/my-bookings"
                  onClick={() => setIsOpen(false)}
                  className="block py-2 font-medium text-brand-700"
                >
                  My Bookings
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setIsOpen(false)}
                  className="block py-2 font-medium text-gray-800"
                >
                  My Profile & Vehicles
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-left py-2 font-medium text-red-600"
                >
                  Log Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="block py-2 font-medium text-brand-600"
              >
                Sign In / Register
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
