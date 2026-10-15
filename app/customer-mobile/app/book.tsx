import React, { useState } from 'react';
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

  const [address, setAddress] = useState('100ft Road, Indiranagar, Bengaluru');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirmBooking = async () => {
    setSubmitting(true);
    try {
      // 1. Get or create vehicle
      const vRes = await mobileApi('/vehicles');
      let vehicleId = vRes.data?.[0]?._id;
      if (!vehicleId) {
        const createV = await mobileApi('/vehicles', {
          method: 'POST',
          body: JSON.stringify({
            vehicleType,
            manufacturer: vehicleType === VehicleType.CAR ? 'Maruti Suzuki' : 'Royal Enfield',
            model: vehicleType === VehicleType.CAR ? 'Swift Dzire' : 'Classic 350',
            registrationNumber: 'KA01AB1234',
          }),
        });
        vehicleId = createV.data._id;
      }

      // 2. Fetch service ID matching category & vehicle
      const sRes = await mobileApi(`/services?vehicleType=${vehicleType}`);
      const matched = sRes.data?.find((s: any) => s.category === selectedService.category);
      const serviceId = matched?._id || sRes.data?.[0]?._id;

      // 3. Create booking
      const bookRes = await mobileApi('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          vehicleId,
          serviceId,
          pickupLocation: {
            latitude: 12.9784,
            longitude: 77.6408,
            address,
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
      <Text style={styles.sectionLabel}>Breakdown Location</Text>
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
            Confirm & Dispatch Now • ₹{currentPrice}
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
