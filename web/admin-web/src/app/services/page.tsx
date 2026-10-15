'use client';

import React, { useState, useEffect } from 'react';
import { Sliders, CheckCircle2, AlertCircle, Save, Bike, Car, Loader2 } from 'lucide-react';
import { INITIAL_SERVICE_CATALOGUE, VehicleType } from '@10min-help/shared';
import { adminApi } from '@/lib/api';

export default function PricingCatalogueManagementPage() {
  const [services, setServices] = useState<any[]>(INITIAL_SERVICE_CATALOGUE);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadServices() {
      try {
        const res = await adminApi.listServices();
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          // Merge API data with default catalog
          const merged = INITIAL_SERVICE_CATALOGUE.map((def) => {
            const apiMatch = res.data.find((item: any) => item.category === def.category);
            if (apiMatch) {
              return {
                ...def,
                _id: apiMatch._id,
                startingPrice: {
                  ...def.startingPrice,
                  ...apiMatch.startingPrice,
                },
                isActive: apiMatch.isActive ?? true,
              };
            }
            return def;
          });
          setServices(merged);
        }
      } catch (err) {
        // Fall back gracefully to static catalogue
      } finally {
        setIsLoading(false);
      }
    }
    loadServices();
  }, []);

  const handlePriceChange = (category: string, vehicle: VehicleType, newPrice: number) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.category === category) {
          return {
            ...s,
            startingPrice: {
              ...s.startingPrice,
              [vehicle]: newPrice,
            },
          };
        }
        return s;
      })
    );
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setSavedMessage(null);
    setErrorMessage(null);
    try {
      for (const svc of services) {
        const idToUpdate = svc._id || svc.category;
        await adminApi.updateServicePricing(idToUpdate, svc.startingPrice, svc.isActive ?? true);
      }
      setSavedMessage('Pricing matrix successfully updated in database and active across all dispatch endpoints.');
      setTimeout(() => setSavedMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save pricing changes. Please check permissions and backend connection.');
      setTimeout(() => setErrorMessage(null), 6000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Service Catalogue & Pricing Matrix
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure dynamic starting rates by vehicle category for Bangalore and Delhi pilot zones.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'Saving Changes...' : 'Save Pricing Changes'}</span>
        </button>
      </div>

      {savedMessage && (
        <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-2xl border border-emerald-200 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 text-rose-800 p-3.5 rounded-2xl border border-rose-200 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-bold border-b border-gray-100">
            <tr>
              <th className="py-3.5 px-4">Service Name</th>
              <th className="py-3.5 px-4">Category Code</th>
              <th className="py-3.5 px-4">
                <span className="flex items-center gap-1.5">
                  <Bike className="w-3.5 h-3.5 text-brand-600" />
                  <span>Bike Starting Price (₹)</span>
                </span>
              </th>
              <th className="py-3.5 px-4">
                <span className="flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-brand-600" />
                  <span>Car Starting Price (₹)</span>
                </span>
              </th>
              <th className="py-3.5 px-4">Est. Duration</th>
              <th className="py-3.5 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {services.map((svc) => (
              <tr key={svc.category} className="hover:bg-amber-50/20">
                <td className="py-3.5 px-4 font-bold text-slate-900">{svc.name}</td>
                <td className="py-3.5 px-4 font-mono text-gray-400">{svc.category}</td>
                <td className="py-3.5 px-4">
                  <input
                    type="number"
                    min={0}
                    value={svc.startingPrice[VehicleType.BIKE]}
                    onChange={(e) =>
                      handlePriceChange(svc.category, VehicleType.BIKE, parseInt(e.target.value, 10) || 0)
                    }
                    className="w-24 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-slate-900"
                  />
                </td>
                <td className="py-3.5 px-4">
                  <input
                    type="number"
                    min={0}
                    value={svc.startingPrice[VehicleType.CAR]}
                    onChange={(e) =>
                      handlePriceChange(svc.category, VehicleType.CAR, parseInt(e.target.value, 10) || 0)
                    }
                    className="w-24 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-slate-900"
                  />
                </td>
                <td className="py-3.5 px-4 text-gray-500">~{svc.estimatedDurationMinutes} mins</td>
                <td className="py-3.5 px-4">
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
