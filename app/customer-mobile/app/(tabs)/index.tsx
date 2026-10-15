import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { INITIAL_SERVICE_CATALOGUE, VehicleType } from '@10min-help/shared';
import { RadarMapView } from '../../src/components/RadarMapView';
import { BikeIcon, CarIcon, ClockIcon, ShieldIcon, PhoneIcon } from '../../src/components/Icons';
import { THEME } from '../../src/theme';

export default function HomeScreen() {
  const router = useRouter();
  const [vehicle, setVehicle] = useState<VehicleType>(VehicleType.BIKE);

  const handleSosCall = () => {
    const hotline = 'tel:1800101010';
    Alert.alert(
      '24x7 Roadside Emergency Desk',
      'Call emergency helpline 1800-101010 for immediate operator assistance?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Helpline',
          onPress: () => {
            Linking.openURL(hotline).catch(() => {
              Alert.alert('Call Failed', 'Could not open telephone dialer on this device.');
            });
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Interactive Live Radar Telemetry */}
      <RadarMapView statusText="Live Radar • GPS Telemetry Standby" />

      {/* Target Arrival Banner */}
      <View style={styles.targetBanner}>
        <View style={styles.targetHeader}>
          <ClockIcon size={14} color="#B45309" />
          <Text style={styles.targetTag}>Target Arrival: Under 10 Mins</Text>
        </View>
        <Text style={styles.bannerTitle}>We reach. You relax.</Text>
        <Text style={styles.bannerSubtitle}>
          Rapid 15-second dispatch matching to certified technicians across pilot zones.
        </Text>
      </View>

      {/* Vehicle Switcher */}
      <View style={styles.vehicleRow}>
        <TouchableOpacity
          style={[styles.vehicleButton, vehicle === VehicleType.BIKE && styles.vehicleButtonActive]}
          onPress={() => setVehicle(VehicleType.BIKE)}
          activeOpacity={0.8}
        >
          <BikeIcon size={20} color={vehicle === VehicleType.BIKE ? '#0F172A' : '#64748B'} />
          <View style={styles.vehicleTextCol}>
            <Text style={[styles.vehicleButtonText, vehicle === VehicleType.BIKE && styles.vehicleButtonTextActive]}>
              Two-Wheeler
            </Text>
            <Text style={styles.vehicleSub}>Bike / Scooter</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.vehicleButton, vehicle === VehicleType.CAR && styles.vehicleButtonActive]}
          onPress={() => setVehicle(VehicleType.CAR)}
          activeOpacity={0.8}
        >
          <CarIcon size={20} color={vehicle === VehicleType.CAR ? '#0F172A' : '#64748B'} />
          <View style={styles.vehicleTextCol}>
            <Text style={[styles.vehicleButtonText, vehicle === VehicleType.CAR && styles.vehicleButtonTextActive]}>
              Four-Wheeler
            </Text>
            <Text style={styles.vehicleSub}>Car / SUV</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Primary Hero CTA */}
      <TouchableOpacity
        style={styles.heroCta}
        onPress={() => router.push({ pathname: '/book', params: { vehicle: vehicle.toLowerCase() } })}
        activeOpacity={0.85}
      >
        <Text style={styles.heroCtaTitle}>Request Emergency Assistance</Text>
        <Text style={styles.heroCtaSubtitle}>Instant 15-second dispatch to your GPS coordinates &rarr;</Text>
      </TouchableOpacity>

      {/* Emergency SOS Bar */}
      <TouchableOpacity style={styles.sosBar} onPress={handleSosCall} activeOpacity={0.8}>
        <PhoneIcon size={18} color="#DC2626" />
        <View style={styles.sosTextCol}>
          <Text style={styles.sosTitle}>24/7 Breakdown Hotline: 1800-101010</Text>
          <Text style={styles.sosSub}>Tap for immediate emergency assistance</Text>
        </View>
      </TouchableOpacity>

      {/* Services Grid */}
      <Text style={styles.sectionTitle}>Breakdown Services Catalogue</Text>
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
            activeOpacity={0.8}
          >
            <View style={styles.serviceTop}>
              <Text style={styles.serviceName}>{svc.name}</Text>
              <View style={styles.pricePill}>
                <Text style={styles.pricePillText}>₹{svc.startingPrice[vehicle]}</Text>
              </View>
            </View>
            <Text style={styles.serviceDesc} numberOfLines={2}>
              {svc.description}
            </Text>
            <View style={styles.inclusionRow}>
              <ShieldIcon size={12} color="#10B981" />
              <Text style={styles.inclusionText}>{svc.inclusions[0]}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  targetBanner: {
    backgroundColor: THEME.colors.primaryLight,
    padding: 18,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: '#FCD34D',
    marginBottom: 16,
  },
  targetHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  targetTag: { fontSize: 11, fontWeight: '800', color: THEME.colors.primaryDark, textTransform: 'uppercase' },
  bannerTitle: { fontSize: 22, fontWeight: '900', color: THEME.colors.textMain, marginTop: 4 },
  bannerSubtitle: { fontSize: 12, color: THEME.colors.textMuted, marginTop: 2, lineHeight: 17 },
  vehicleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  vehicleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: THEME.radius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vehicleButtonActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  vehicleTextCol: { flex: 1 },
  vehicleButtonText: { fontSize: 13, fontWeight: '700', color: THEME.colors.textMuted },
  vehicleButtonTextActive: { color: THEME.colors.textMain, fontWeight: '900' },
  vehicleSub: { fontSize: 10, color: THEME.colors.textSub },
  heroCta: {
    backgroundColor: THEME.colors.secondary,
    padding: 18,
    borderRadius: THEME.radius.lg,
    alignItems: 'center',
    marginBottom: 12,
    ...THEME.shadow.card,
  },
  heroCtaTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  heroCtaSubtitle: { color: '#FCD34D', fontSize: 12, fontWeight: '700', marginTop: 3 },
  sosBar: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: THEME.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  sosTextCol: { flex: 1 },
  sosTitle: { fontSize: 12, fontWeight: '800', color: '#991B1B' },
  sosSub: { fontSize: 10, color: '#B91C1C' },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: THEME.colors.textMain, marginBottom: 12 },
  servicesGrid: { gap: 10 },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    ...THEME.shadow.card,
  },
  serviceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceName: { fontSize: 15, fontWeight: '800', color: THEME.colors.textMain },
  pricePill: { backgroundColor: THEME.colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pricePillText: { fontSize: 14, fontWeight: '900', color: THEME.colors.primaryDark },
  serviceDesc: { fontSize: 12, color: THEME.colors.textMuted, marginTop: 4, lineHeight: 16 },
  inclusionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  inclusionText: { fontSize: 11, color: THEME.colors.textMuted },
});
