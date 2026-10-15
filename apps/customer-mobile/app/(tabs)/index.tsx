import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { INITIAL_SERVICE_CATALOGUE, VehicleType } from '@10min-help/shared';

export default function HomeScreen() {
  const router = useRouter();
  const [vehicle, setVehicle] = useState<VehicleType>(VehicleType.BIKE);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Target Arrival Banner */}
      <View style={styles.targetBanner}>
        <Text style={styles.targetTag}>Target Arrival: Under 10 Mins</Text>
        <Text style={styles.bannerTitle}>We reach. You relax.</Text>
        <Text style={styles.bannerSubtitle}>Verified mechanics near Indiranagar & Koramangala.</Text>
      </View>

      {/* Vehicle Switcher */}
      <View style={styles.vehicleRow}>
        <TouchableOpacity
          style={[styles.vehicleButton, vehicle === VehicleType.BIKE && styles.vehicleButtonActive]}
          onPress={() => setVehicle(VehicleType.BIKE)}
        >
          <Text style={[styles.vehicleButtonText, vehicle === VehicleType.BIKE && styles.vehicleButtonTextActive]}>
            Two-Wheeler / Bike
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.vehicleButton, vehicle === VehicleType.CAR && styles.vehicleButtonActive]}
          onPress={() => setVehicle(VehicleType.CAR)}
        >
          <Text style={[styles.vehicleButtonText, vehicle === VehicleType.CAR && styles.vehicleButtonTextActive]}>
            Four-Wheeler / Car
          </Text>
        </TouchableOpacity>
      </View>

      {/* Primary CTA */}
      <TouchableOpacity
        style={styles.heroCta}
        onPress={() => router.push({ pathname: '/book', params: { vehicle: vehicle.toLowerCase() } })}
      >
        <Text style={styles.heroCtaTitle}>Request Emergency Help</Text>
        <Text style={styles.heroCtaSubtitle}>Instant dispatch to your GPS coordinates &rarr;</Text>
      </TouchableOpacity>

      {/* Services Grid */}
      <Text style={styles.sectionTitle}>Breakdown Services</Text>
      <View style={styles.servicesGrid}>
        {INITIAL_SERVICE_CATALOGUE.map((svc) => (
          <TouchableOpacity
            key={svc.category}
            style={styles.serviceCard}
            onPress={() =>
              router.push({
                pathname: '/book',
                params: { service: svc.category, vehicle: vehicle.toLowerCase() },
              })
            }
          >
            <Text style={styles.serviceName}>{svc.name}</Text>
            <Text style={styles.serviceDesc} numberOfLines={2}>
              {svc.description}
            </Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>From</Text>
              <Text style={styles.priceValue}>₹{svc.startingPrice[vehicle]}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 32 },
  targetBanner: { backgroundColor: '#FEF3C7', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#FCD34D', marginBottom: 16 },
  targetTag: { fontSize: 11, fontWeight: '800', color: '#B45309', textTransform: 'uppercase' },
  bannerTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginTop: 4 },
  bannerSubtitle: { fontSize: 12, color: '#475569', marginTop: 2 },
  vehicleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  vehicleButton: { flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  vehicleButtonActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  vehicleButtonText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  vehicleButtonTextActive: { color: '#0F172A', fontWeight: '900' },
  heroCta: { backgroundColor: '#0F172A', padding: 18, borderRadius: 20, alignItems: 'center', marginBottom: 24 },
  heroCtaTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  heroCtaSubtitle: { color: '#FCD34D', fontSize: 12, fontWeight: '600', marginTop: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginBottom: 12 },
  servicesGrid: { gap: 12 },
  serviceCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#F1F5F9' },
  serviceName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  serviceDesc: { fontSize: 12, color: '#64748B', marginTop: 3 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  priceLabel: { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: '700' },
  priceValue: { fontSize: 16, fontWeight: '900', color: '#D97706' },
});
