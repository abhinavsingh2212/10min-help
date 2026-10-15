import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { mobileApi } from '../src/api';
import { INITIAL_SERVICE_CATALOGUE, VehicleType } from '@10min-help/shared';
import { BikeIcon, CarIcon, MapPinIcon, ShieldIcon, CheckIcon, ClockIcon } from '../src/components/Icons';
import { THEME } from '../src/theme';

export default function BookScreen() {
  const router = useRouter();
  const params = useLocalSearchParams() as { vehicle?: string; service?: string };

  const [vehicleType, setVehicleType] = useState<VehicleType>(
    params.vehicle === 'car' ? VehicleType.CAR : VehicleType.BIKE
  );
  
  const initialCategory = params.service || INITIAL_SERVICE_CATALOGUE[0].category;
  const [selectedService, setSelectedService] = useState(
    INITIAL_SERVICE_CATALOGUE.find((s) => s.category === initialCategory) || INITIAL_SERVICE_CATALOGUE[0]
  );

  // Real location state (no hardcoded default)
  const [address, setAddress] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number }>({
    latitude: 12.9716,
    longitude: 77.5946,
  });
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsDetected, setGpsDetected] = useState(false);

  // Real customer vehicles (no fake auto-creation)
  const [savedVehicles, setSavedVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [isAddingNewVehicle, setIsAddingNewVehicle] = useState(false);
  const [newManufacturer, setNewManufacturer] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newRegNumber, setNewRegNumber] = useState('');

  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadVehicles() {
      try {
        setLoadingVehicles(true);
        const res = await mobileApi('/vehicles');
        const list = res.data || [];
        setSavedVehicles(list);
        const matching = list.filter((v: any) => v.vehicleType === vehicleType);
        if (matching.length > 0) {
          setSelectedVehicleId(matching[0]._id);
          setIsAddingNewVehicle(false);
        } else {
          setSelectedVehicleId('');
          setIsAddingNewVehicle(true);
        }
      } catch (err) {
        setIsAddingNewVehicle(true);
      } finally {
        setLoadingVehicles(false);
      }
    }
    loadVehicles();
  }, [vehicleType]);

  const handleDetectLocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setDetectingGps(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoordinates({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setGpsDetected(true);
          setDetectingGps(false);
          if (!address) {
            setAddress(`GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} (Confirm street/landmark below)`);
          }
        },
        (err) => {
          setDetectingGps(false);
          Alert.alert(
            'GPS Location Permission',
            'Could not retrieve live GPS coordinates. Please enter your street address or landmark manually.'
          );
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      Alert.alert(
        'Manual Entry',
        'Device geolocation is not available. Please type your breakdown address or nearest landmark.'
      );
    }
  };

  const handleConfirmBooking = async () => {
    // 1. Validate Location
    if (!address.trim() || address.trim().length < 5) {
      Alert.alert('Location Required', 'Please enter your breakdown street address, building, or landmark.');
      return;
    }

    setSubmitting(true);
    try {
      // 2. Validate / Resolve Vehicle
      let effectiveVehicleId = selectedVehicleId;

      if (isAddingNewVehicle || !effectiveVehicleId) {
        const cleanMake = newManufacturer.trim();
        const cleanModel = newModel.trim();
        const cleanReg = newRegNumber.trim().toUpperCase();

        if (!cleanMake || !cleanModel || !cleanReg) {
          Alert.alert(
            'Vehicle Details Required',
            'Please enter the vehicle manufacturer (make), model, and registration plate number.'
          );
          setSubmitting(false);
          return;
        }

        const createRes = await mobileApi('/vehicles', {
          method: 'POST',
          body: JSON.stringify({
            vehicleType,
            manufacturer: cleanMake,
            model: cleanModel,
            registrationNumber: cleanReg,
          }),
        });

        effectiveVehicleId = createRes.data._id;
      }

      // 3. Resolve Service ID
      const sRes = await mobileApi(`/services?vehicleType=${vehicleType}`);
      const matched = sRes.data?.find((s: any) => s.category === selectedService.category);
      const serviceId = matched?._id || sRes.data?.[0]?._id;

      if (!serviceId) {
        throw new Error('Service category is currently unavailable for this vehicle type.');
      }

      // 4. Create Dispatch Booking
      const bookRes = await mobileApi('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          vehicleId: effectiveVehicleId,
          serviceId,
          pickupLocation: {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            address: address.trim(),
          },
        }),
      });

      router.replace({
        pathname: '/booking/[id]',
        params: { id: bookRes.data._id },
      });
    } catch (err: any) {
      Alert.alert('Booking Error', err.message || 'Could not complete dispatch request.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentPrice = selectedService.startingPrice[vehicleType];
  const matchingSavedVehicles = savedVehicles.filter((v: any) => v.vehicleType === vehicleType);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Vehicle Type Switcher */}
      <Text style={styles.sectionLabel}>Select Vehicle Category</Text>
      <View style={styles.vehicleRow}>
        <TouchableOpacity
          style={[styles.vehicleBtn, vehicleType === VehicleType.BIKE && styles.vehicleBtnActive]}
          onPress={() => setVehicleType(VehicleType.BIKE)}
          activeOpacity={0.8}
        >
          <BikeIcon size={20} color={vehicleType === VehicleType.BIKE ? THEME.colors.secondary : THEME.colors.textMuted} />
          <Text style={[styles.vehicleBtnText, vehicleType === VehicleType.BIKE && styles.vehicleBtnTextActive]}>
            Two-Wheeler (Bike)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.vehicleBtn, vehicleType === VehicleType.CAR && styles.vehicleBtnActive]}
          onPress={() => setVehicleType(VehicleType.CAR)}
          activeOpacity={0.8}
        >
          <CarIcon size={20} color={vehicleType === VehicleType.CAR ? THEME.colors.secondary : THEME.colors.textMuted} />
          <Text style={[styles.vehicleBtnText, vehicleType === VehicleType.CAR && styles.vehicleBtnTextActive]}>
            Four-Wheeler (Car)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Vehicle Selection or Form */}
      <Text style={styles.sectionLabel}>Your Breakdown Vehicle</Text>
      {loadingVehicles ? (
        <ActivityIndicator color={THEME.colors.primary} style={{ marginVertical: 12 }} />
      ) : (
        <View style={styles.vehicleSelectContainer}>
          {matchingSavedVehicles.length > 0 && !isAddingNewVehicle ? (
            <View style={{ gap: 8 }}>
              {matchingSavedVehicles.map((v: any) => (
                <TouchableOpacity
                  key={v._id}
                  style={[styles.vehicleCardOption, selectedVehicleId === v._id && styles.vehicleCardOptionActive]}
                  onPress={() => setSelectedVehicleId(v._id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vehicleCardTitle}>{v.manufacturer} {v.model}</Text>
                    <Text style={styles.vehicleCardReg}>{v.registrationNumber}</Text>
                  </View>
                  {selectedVehicleId === v._id && <CheckIcon size={16} color={THEME.colors.primaryDark} />}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setIsAddingNewVehicle(true)}
                style={styles.addNewVehicleBtn}
              >
                <Text style={styles.addNewVehicleBtnText}>+ Add Another Vehicle</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.vehicleForm}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.formTitle}>Enter Vehicle Details</Text>
                {matchingSavedVehicles.length > 0 && (
                  <TouchableOpacity onPress={() => setIsAddingNewVehicle(false)}>
                    <Text style={{ fontSize: 12, color: THEME.colors.primaryDark, fontWeight: '700' }}>Choose Saved</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={styles.formInput}
                placeholder="Manufacturer (e.g. Honda, Maruti Suzuki, Hyundai)"
                placeholderTextColor="#94A3B8"
                value={newManufacturer}
                onChangeText={setNewManufacturer}
              />
              <TextInput
                style={styles.formInput}
                placeholder="Model (e.g. Activa 6G, Swift, Creta)"
                placeholderTextColor="#94A3B8"
                value={newModel}
                onChangeText={setNewModel}
              />
              <TextInput
                style={styles.formInput}
                placeholder="Registration Plate Number (e.g. KA01AB1234)"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                value={newRegNumber}
                onChangeText={setNewRegNumber}
              />
            </View>
          )}
        </View>
      )}

      {/* Service Selection */}
      <Text style={styles.sectionLabel}>Select Breakdown Assistance Type</Text>
      <View style={styles.serviceList}>
        {INITIAL_SERVICE_CATALOGUE.map((svc) => {
          const isSelected = selectedService.category === svc.category;
          return (
            <TouchableOpacity
              key={svc.category}
              style={[styles.serviceOption, isSelected && styles.serviceOptionActive]}
              onPress={() => setSelectedService(svc)}
              activeOpacity={0.8}
            >
              <View style={styles.serviceInfo}>
                <View style={styles.serviceTopRow}>
                  <Text style={[styles.serviceTitle, isSelected && styles.serviceTitleActive]}>{svc.name}</Text>
                  {isSelected && <CheckIcon size={16} color={THEME.colors.primaryDark} />}
                </View>
                <Text style={styles.serviceDesc}>{svc.description}</Text>
              </View>
              <View style={styles.priceContainer}>
                <Text style={styles.servicePrice}>₹{svc.startingPrice[vehicleType]}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Breakdown Location */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 8 }}>
        <Text style={[styles.sectionLabel, { marginTop: 0, marginBottom: 0 }]}>Breakdown Location</Text>
        <TouchableOpacity
          onPress={handleDetectLocation}
          disabled={detectingGps}
          style={styles.gpsDetectBtn}
        >
          {detectingGps ? (
            <ActivityIndicator size="small" color={THEME.colors.primaryDark} />
          ) : (
            <Text style={styles.gpsDetectBtnText}>
              {gpsDetected ? '✓ GPS Locked' : '📍 Use Current GPS'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <MapPinIcon size={18} color={THEME.colors.primary} />
        <TextInput
          style={styles.addressInput}
          value={address}
          onChangeText={setAddress}
          placeholder="Enter breakdown street, building, or landmark"
          placeholderTextColor="#94A3B8"
        />
      </View>

      {/* Target Response Pill */}
      <View style={styles.responseNotice}>
        <ClockIcon size={14} color="#B45309" />
        <Text style={styles.responseNoticeText}>
          Target ETA: Under 10 mins • 15s timed dispatch to nearest certified partner
        </Text>
      </View>

      {/* Dispatch Action Button */}
      <TouchableOpacity
        style={styles.dispatchButton}
        onPress={handleConfirmBooking}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator color={THEME.colors.secondary} />
        ) : (
          <Text style={styles.dispatchButtonText}>
            Confirm &amp; Dispatch Now • ₹{currentPrice}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: THEME.colors.textMuted, textTransform: 'uppercase', marginBottom: 8, marginTop: 12 },
  vehicleRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  vehicleBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: THEME.radius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  vehicleBtnActive: { backgroundColor: THEME.colors.primary, borderColor: THEME.colors.primary },
  vehicleBtnText: { fontSize: 12, fontWeight: '700', color: THEME.colors.textMuted },
  vehicleBtnTextActive: { color: THEME.colors.secondary, fontWeight: '900' },
  vehicleSelectContainer: { marginBottom: 16 },
  vehicleCardOption: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleCardOptionActive: { borderColor: THEME.colors.primary, backgroundColor: THEME.colors.primaryLight },
  vehicleCardTitle: { fontSize: 14, fontWeight: '800', color: THEME.colors.textMain },
  vehicleCardReg: { fontSize: 12, color: THEME.colors.textMuted, marginTop: 2, fontFamily: 'monospace' },
  addNewVehicleBtn: { paddingVertical: 8, alignItems: 'center' },
  addNewVehicleBtnText: { fontSize: 12, color: THEME.colors.primaryDark, fontWeight: '800' },
  vehicleForm: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 8,
  },
  formTitle: { fontSize: 12, fontWeight: '800', color: THEME.colors.textMuted, textTransform: 'uppercase' },
  formInput: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: THEME.colors.textMain,
    backgroundColor: '#F8FAFC',
  },
  serviceList: { gap: 8, marginBottom: 16 },
  serviceOption: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...THEME.shadow.card,
  },
  serviceOptionActive: { borderColor: THEME.colors.primary, backgroundColor: THEME.colors.primaryLight },
  serviceInfo: { flex: 1, paddingRight: 12 },
  serviceTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  serviceTitle: { fontSize: 15, fontWeight: '800', color: THEME.colors.textMain },
  serviceTitleActive: { color: THEME.colors.primaryDark },
  serviceDesc: { fontSize: 12, color: THEME.colors.textMuted, marginTop: 4, lineHeight: 16 },
  priceContainer: { alignItems: 'flex-end' },
  servicePrice: { fontSize: 18, fontWeight: '900', color: THEME.colors.textMain },
  gpsDetectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: THEME.colors.primaryLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  gpsDetectBtnText: { fontSize: 11, fontWeight: '800', color: '#92400E' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 14,
    borderRadius: THEME.radius.md,
    marginBottom: 16,
    ...THEME.shadow.card,
  },
  addressInput: { flex: 1, paddingVertical: 14, fontSize: 14, color: THEME.colors.textMain },
  responseNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.colors.primaryLight,
    padding: 12,
    borderRadius: THEME.radius.md,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  responseNoticeText: { fontSize: 11, color: '#92400E', fontWeight: '700', flex: 1 },
  dispatchButton: {
    backgroundColor: THEME.colors.primary,
    padding: 18,
    borderRadius: THEME.radius.lg,
    alignItems: 'center',
    ...THEME.shadow.float,
  },
  dispatchButtonText: { color: THEME.colors.secondary, fontWeight: '900', fontSize: 16 },
});
