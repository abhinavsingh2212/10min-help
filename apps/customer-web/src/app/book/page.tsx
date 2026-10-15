'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bike,
  Car,
  MapPin,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Navigation,
  ArrowRight,
  Plus,
} from 'lucide-react';
import {
  bookingsApi,
  servicesApi,
  vehiclesApi,
  getStoredToken,
} from '../../lib/api';
import { VehicleType, ServiceCategory } from '@10min-help/shared';

export default function BookPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [vehicleType, setVehicleType] = useState<VehicleType>(VehicleType.BIKE);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  
  // Custom quick vehicle if none saved
  const [customVehicle, setCustomVehicle] = useState({
    manufacturer: 'Royal Enfield',
    model: 'Classic 350',
    registrationNumber: 'KA01AB1234',
  });
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);

  // Services
  const [services, setServices] = useState<any[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');

  // Location
  const [location, setLocation] = useState({
    latitude: 12.9784,
    longitude: 77.6408,
    address: '100ft Road, Indiranagar, Bengaluru, Karnataka',
    landmark: 'Near Metro Station Pillar 120',
    city: 'Bangalore',
  });
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Notes
  const [notes, setNotes] = useState('');

  // Check login and fetch data
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.push('/login?redirect=/book');
      return;
    }

    async function loadData() {
      try {
        setLoading(true);
        // Load services
        const svcRes = await servicesApi.list(vehicleType);
        setServices(svcRes.data || []);
        if (svcRes.data && svcRes.data.length > 0) {
          setSelectedServiceId(svcRes.data[0]._id);
        }

        // Load saved vehicles
        const vRes = await vehiclesApi.list();
        setVehicles(vRes.data || []);
        if (vRes.data && vRes.data.length > 0) {
          const match = vRes.data.find((v: any) => v.vehicleType === vehicleType);
          if (match) setSelectedVehicleId(match._id);
          else setSelectedVehicleId(vRes.data[0]._id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load booking details');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router, vehicleType]);

  // GPS auto-detect
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation((prev) => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          address: `GPS Pin: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} (Detected Location)`,
        }));
        setDetectingLocation(false);
      },
      (err) => {
        setDetectingLocation(false);
        alert(`Location permission denied or unavailable: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      let vehicleIdToUse = selectedVehicleId;

      // If user has no saved vehicles, create one first on the fly
      if (!vehicleIdToUse || vehicles.length === 0) {
        const newVehicleRes = await vehiclesApi.create({
          vehicleType,
          manufacturer: customVehicle.manufacturer,
          model: customVehicle.model,
          registrationNumber: customVehicle.registrationNumber,
        });
        vehicleIdToUse = newVehicleRes.data._id;
      }

      const bookingRes = await bookingsApi.create({
        vehicleId: vehicleIdToUse,
        serviceId: selectedServiceId,
        pickupLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
          landmark: location.landmark,
          city: location.city,
        },
        notes: notes || undefined,
      });

      const newBooking = bookingRes.data;
      router.push(`/booking/${newBooking._id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create booking');
      setSubmitting(false);
    }
  };

  const selectedService = services.find((s) => s._id === selectedServiceId);
  const quotedPrice = selectedService?.startingPrice?.[vehicleType] || 0;

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-gray-600">Loading service catalogue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="space-y-8">
        
        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Request Roadside Assistance
          </h1>
          <p className="text-sm text-gray-600">
            Tell us your vehicle, problem, and location. We will dispatch the nearest verified mechanic within 10 minutes.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-4 rounded-2xl border border-red-200 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateBooking} className="space-y-8">
          
          {/* STEP 1: Vehicle Selection */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-800 text-sm flex items-center justify-center font-bold">
                1
              </span>
              <span>Vehicle Details</span>
            </h2>

            {/* Vehicle Type Switcher */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setVehicleType(VehicleType.BIKE)}
                className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition-all ${
                  vehicleType === VehicleType.BIKE
                    ? 'border-brand-500 bg-amber-50/50 text-slate-900'
                    : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'
                }`}
              >
                <Bike className="w-6 h-6 text-brand-600" />
                <div className="text-left">
                  <div className="font-bold text-sm">Two-Wheeler</div>
                  <div className="text-xs text-gray-500">Bike / Scooter</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setVehicleType(VehicleType.CAR)}
                className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition-all ${
                  vehicleType === VehicleType.CAR
                    ? 'border-brand-500 bg-amber-50/50 text-slate-900'
                    : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'
                }`}
              >
                <Car className="w-6 h-6 text-brand-600" />
                <div className="text-left">
                  <div className="font-bold text-sm">Four-Wheeler</div>
                  <div className="text-xs text-gray-500">Car / SUV / Sedan</div>
                </div>
              </button>
            </div>

            {/* Saved Vehicles / Custom Input */}
            {vehicles.filter((v) => v.vehicleType === vehicleType).length > 0 ? (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Select Your Saved Vehicle
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {vehicles
                    .filter((v) => v.vehicleType === vehicleType)
                    .map((v) => (
                      <div
                        key={v._id}
                        onClick={() => setSelectedVehicleId(v._id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          selectedVehicleId === v._id
                            ? 'border-brand-500 bg-amber-50/40 text-slate-900 shadow-sm'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-bold text-sm">{v.manufacturer} {v.model}</div>
                        <div className="text-xs text-gray-500">{v.registrationNumber || 'No plate specified'}</div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Quick Vehicle Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Manufacturer (e.g. Royal Enfield / Honda)"
                    value={customVehicle.manufacturer}
                    onChange={(e) => setCustomVehicle({ ...customVehicle, manufacturer: e.target.value })}
                    className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Model (e.g. Classic 350 / Creta)"
                    value={customVehicle.model}
                    onChange={(e) => setCustomVehicle({ ...customVehicle, model: e.target.value })}
                    className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500"
                  />
                  <input
                    type="text"
                    placeholder="Registration (e.g. KA01AB1234)"
                    value={customVehicle.registrationNumber}
                    onChange={(e) => setCustomVehicle({ ...customVehicle, registrationNumber: e.target.value })}
                    className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500 uppercase"
                  />
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: Service Selection */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-800 text-sm flex items-center justify-center font-bold">
                2
              </span>
              <span>Select Roadside Service</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {services.map((svc) => {
                const isSelected = selectedServiceId === svc._id;
                const price = svc.startingPrice?.[vehicleType] || 0;
                return (
                  <div
                    key={svc._id}
                    onClick={() => setSelectedServiceId(svc._id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-brand-500 bg-amber-50/50 shadow-sm ring-1 ring-brand-500'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-900">{svc.name}</div>
                      <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                        {svc.description}
                      </p>
                    </div>
                    <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 uppercase font-semibold">From</span>
                      <span className="text-base font-black text-slate-900">₹{price}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 3: Location Confirmation */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-800 text-sm flex items-center justify-center font-bold">
                  3
                </span>
                <span>Breakdown Location</span>
              </h2>

              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={detectingLocation}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Navigation className="w-3.5 h-3.5 text-brand-700" />
                <span>{detectingLocation ? 'Locating...' : 'Use Current GPS'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Street Address / Road Location
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100ft Road, Indiranagar"
                  value={location.address}
                  onChange={(e) => setLocation({ ...location, address: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Landmark / Proximity Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. In front of Sony Signal or near Shell Petrol Pump"
                  value={location.landmark}
                  onChange={(e) => setLocation({ ...location, landmark: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Visual Location Pill */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-2.5 text-xs text-gray-600">
              <MapPin className="w-4 h-4 text-brand-600 shrink-0" />
              <span>
                Coordinates: <strong>{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</strong> (Pilot Zone: Bangalore Central)
              </span>
            </div>
          </div>

          {/* STEP 4: Problem Notes */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-2">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Specific Problem Notes for Technician (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Heard a loud hiss, rear tyre has completely deflated. Have a stepney spare."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Summary & Submit Action */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-700 pb-4">
              <div>
                <div className="text-xs text-brand-400 uppercase tracking-wider font-semibold">
                  Preliminary Starting Quote
                </div>
                <div className="text-3xl font-black text-white">
                  ₹{quotedPrice}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  Includes initial dispatch & standard inspection.
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-3 rounded-2xl border border-slate-700">
                <Clock className="w-5 h-5 text-brand-400" />
                <div>
                  <div className="text-xs text-gray-400">Target ETA</div>
                  <div className="text-sm font-bold text-white">Under 10 Minutes</div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-slate-950 font-black py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 text-lg"
            >
              {submitting ? (
                <span>Dispatching Nearest Mechanic...</span>
              ) : (
                <>
                  <span>Confirm Booking & Dispatch Mechanic</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-6 text-[11px] text-gray-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero Cancellation Fee before mechanic arrival</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" />
                <span>Pay via UPI / Card / Cash on completion</span>
              </span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
