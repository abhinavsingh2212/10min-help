'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Bike, Car, Plus, Trash2, Shield, Phone, CheckCircle2 } from 'lucide-react';
import { vehiclesApi, authApi, getStoredToken } from '../../lib/api';
import { VehicleType } from '@10min-help/shared';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New vehicle modal state
  const [newVehicle, setNewVehicle] = useState({
    vehicleType: VehicleType.BIKE,
    manufacturer: '',
    model: '',
    registrationNumber: '',
    color: '',
  });
  const [addingVehicle, setAddingVehicle] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.push('/login?redirect=/profile');
      return;
    }

    async function loadData() {
      try {
        const [meRes, vRes] = await Promise.all([authApi.getMe(), vehiclesApi.list()]);
        setUser(meRes.data?.user);
        setVehicles(vRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await vehiclesApi.create(newVehicle);
      setVehicles([res.data, ...vehicles]);
      setAddingVehicle(false);
      setNewVehicle({
        vehicleType: VehicleType.BIKE,
        manufacturer: '',
        model: '',
        registrationNumber: '',
        color: '',
      });
    } catch (err: any) {
      alert(`Failed to add vehicle: ${err.message}`);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm('Are you sure you want to remove this vehicle?')) return;
    try {
      await vehiclesApi.remove(id);
      setVehicles(vehicles.filter((v) => v._id !== id));
    } catch (err: any) {
      alert(`Failed to remove vehicle: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-500 text-slate-950 font-black text-2xl flex items-center justify-center shadow-md">
          {user?.name?.[0] || 'U'}
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{user?.name}</h1>
          <p className="text-xs text-gray-500 mt-0.5">Phone: +91 {user?.phone} • Verified Customer Account</p>
        </div>
      </div>

      {/* Emergency Contact Card */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-bold text-slate-900">Emergency SOS Contact</h2>
        </div>
        <p className="text-xs text-gray-500">
          This contact receives automatic SMS/notification when you trigger an emergency SOS alert.
        </p>
        <div className="bg-gray-50 p-4 rounded-2xl flex justify-between items-center text-xs">
          <div>
            <div className="font-bold text-slate-900">{user?.emergencyContactName || 'Priya Sharma (Spouse)'}</div>
            <div className="text-gray-500">{user?.emergencyContactPhone || '+91 9876543211'}</div>
          </div>
          <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-lg text-[10px]">
            Active
          </span>
        </div>
      </div>

      {/* Saved Vehicles Section */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Saved Vehicles</h2>
            <p className="text-xs text-gray-500">Manage your bikes and cars for 1-click roadside requests.</p>
          </div>
          <button
            onClick={() => setAddingVehicle(!addingVehicle)}
            className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vehicle</span>
          </button>
        </div>

        {addingVehicle && (
          <form onSubmit={handleAddVehicle} className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
              New Vehicle Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Vehicle Type</label>
                <select
                  value={newVehicle.vehicleType}
                  onChange={(e) => setNewVehicle({ ...newVehicle, vehicleType: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold"
                >
                  <option value={VehicleType.BIKE}>Two-Wheeler / Bike</option>
                  <option value={VehicleType.CAR}>Four-Wheeler / Car</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Manufacturer</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Enfield / Hyundai"
                  value={newVehicle.manufacturer}
                  onChange={(e) => setNewVehicle({ ...newVehicle, manufacturer: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Model</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Classic 350 / Creta"
                  value={newVehicle.model}
                  onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Registration Number</label>
                <input
                  type="text"
                  placeholder="e.g. KA01AB1234"
                  value={newVehicle.registrationNumber}
                  onChange={(e) => setNewVehicle({ ...newVehicle, registrationNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs uppercase font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddingVehicle(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-slate-900 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm"
              >
                Save Vehicle
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {vehicles.map((v) => (
            <div
              key={v._id}
              className="bg-gray-50/50 p-4 rounded-2xl border border-gray-200 flex justify-between items-center"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  {v.vehicleType === VehicleType.BIKE ? <Bike className="w-5 h-5" /> : <Car className="w-5 h-5" />}
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900">{v.manufacturer} {v.model}</div>
                  <div className="text-xs font-mono text-gray-500 uppercase">{v.registrationNumber || 'No plate'}</div>
                </div>
              </div>

              <button
                onClick={() => handleDeleteVehicle(v._id)}
                className="text-gray-400 hover:text-red-600 p-2 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
