import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { mobileApi } from '../src/api';
import { INITIAL_SERVICE_CATALOGUE, VehicleType } from '@10min-help/shared';

export default function BookScreen() {
  const router = useRouter();
  const [vehicleType, setVehicleType] = useState<VehicleType>(VehicleType.BIKE);
  const [selectedService, setSelectedService] = useState(INITIAL_SERVICE_CATALOGUE[0]);
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
            manufacturer: 'Royal Enfield',
            model: 'Classic 350',
            registrationNumber: 'KA01AB1234',
          }),
        });
        vehicleId = createV.data._id;
      }

      // 2. Fetch service ID
      const sRes = await mobileApi(`/services?vehicleType=${vehicleType}`);
      const serviceId = sRes.data?.[0]?._id;

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Select Breakdown Issue</Text>
      
      <View style={styles.serviceList}>
        {INITIAL_SERVICE_CATALOGUE.map((svc) => (
          <TouchableOpacity
            key={svc.category}
            style={[styles.serviceOption, selectedService.category === svc.category && styles.serviceOptionActive]}
            onPress={() => setSelectedService(svc)}
          >
            <View>
              <Text style={styles.serviceTitle}>{svc.name}</Text>
              <Text style={styles.serviceDesc}>{svc.description}</Text>
            </View>
            <Text style={styles.servicePrice}>₹{svc.startingPrice[vehicleType]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.heading}>Your Breakdown Location</Text>
      <TextInput
        style={styles.addressInput}
        value={address}
        onChangeText={setAddress}
        placeholder="Enter breakdown street or landmark"
      />

      <TouchableOpacity style={styles.dispatchButton} onPress={handleConfirmBooking} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#0F172A" />
        ) : (
          <Text style={styles.dispatchButtonText}>
            Confirm & Dispatch (₹{selectedService.startingPrice[vehicleType]})
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 15, fontWeight: '900', color: '#0F172A', marginTop: 12, marginBottom: 8 },
  serviceList: { gap: 8, marginBottom: 16 },
  serviceOption: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceOptionActive: { borderColor: '#F59E0B', backgroundColor: '#FEF3C7' },
  serviceTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  serviceDesc: { fontSize: 11, color: '#64748B', maxWidth: 220, marginTop: 2 },
  servicePrice: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  addressInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', padding: 14, borderRadius: 14, fontSize: 13, marginBottom: 24 },
  dispatchButton: { backgroundColor: '#F59E0B', padding: 18, borderRadius: 16, alignItems: 'center' },
  dispatchButtonText: { color: '#0F172A', fontWeight: '900', fontSize: 15 },
});
