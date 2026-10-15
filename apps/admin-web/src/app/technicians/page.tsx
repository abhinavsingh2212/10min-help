'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import { TechnicianVerificationStatus } from '@10min-help/shared';
import { Users, ShieldCheck, XCircle, CheckCircle2, Star, Clock } from 'lucide-react';

export default function TechniciansManagementPage() {
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await adminApi.listTechnicians(filter || undefined);
      setTechnicians(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filter]);

  const handleUpdateStatus = async (id: string, status: string) => {
    const notes = prompt(`Enter notes for setting status to ${status}:`) || 'Status updated by admin';
    try {
      await adminApi.updateTechnicianStatus(id, status, notes);
      await loadData();
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Technician Verification & Fleet
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Review applicant mechanics, approve background checks, and inspect performance.
          </p>
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold"
        >
          <option value="">All Verification States</option>
          <option value={TechnicianVerificationStatus.PENDING}>Pending Review</option>
          <option value={TechnicianVerificationStatus.VERIFIED}>Verified Partners</option>
          <option value={TechnicianVerificationStatus.REJECTED}>Rejected</option>
          <option value={TechnicianVerificationStatus.SUSPENDED}>Suspended</option>
        </select>
      </div>

      {loading ? (
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : technicians.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center text-xs text-gray-500">
          No technicians found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {technicians.map((t) => (
            <div
              key={t._id}
              className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">{t.user?.name}</h3>
                    <div className="text-xs text-gray-500">{t.businessName || 'Independent Mobile Partner'}</div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      t.verificationStatus === TechnicianVerificationStatus.VERIFIED
                        ? 'bg-emerald-100 text-emerald-800'
                        : t.verificationStatus === TechnicianVerificationStatus.PENDING
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {t.verificationStatus}
                  </span>
                </div>

                <div className="text-xs text-gray-600 space-y-1">
                  <div><strong>Phone:</strong> {t.user?.phone}</div>
                  <div><strong>Vehicles:</strong> {t.supportedVehicles?.join(', ')}</div>
                  <div><strong>Zones:</strong> {t.serviceAreas?.join(', ') || 'Bangalore Central'}</div>
                  <div><strong>Experience:</strong> {t.experienceYears || 2} Years</div>
                </div>

                <div className="flex items-center gap-4 text-xs pt-1 border-t border-gray-50">
                  <span className="flex items-center gap-1 font-bold text-amber-700">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    {t.ratingAverage || 5.0} ({t.ratingCount || 0} reviews)
                  </span>
                  <span>•</span>
                  <span>{t.totalJobsCompleted || 0} jobs done</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center gap-2">
                {t.verificationStatus === TechnicianVerificationStatus.PENDING && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(t._id, TechnicianVerificationStatus.VERIFIED)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition-colors"
                    >
                      Approve & Verify
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(t._id, TechnicianVerificationStatus.REJECTED)}
                      className="flex-1 bg-red-100 hover:bg-red-200 text-red-800 font-bold py-2 rounded-xl text-xs transition-colors"
                    >
                      Reject
                    </button>
                  </>
                )}

                {t.verificationStatus === TechnicianVerificationStatus.VERIFIED && (
                  <button
                    onClick={() => handleUpdateStatus(t._id, TechnicianVerificationStatus.SUSPENDED)}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-bold py-2 rounded-xl text-xs transition-colors"
                  >
                    Suspend Partner
                  </button>
                )}

                {t.verificationStatus === TechnicianVerificationStatus.SUSPENDED && (
                  <button
                    onClick={() => handleUpdateStatus(t._id, TechnicianVerificationStatus.VERIFIED)}
                    className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold py-2 rounded-xl text-xs transition-colors"
                  >
                    Reactivate Partner
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
