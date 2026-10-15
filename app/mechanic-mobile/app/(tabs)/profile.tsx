import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function MechanicProfileTab() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>S</Text>
        </View>
        <Text style={styles.name}>Suresh Kumar</Text>
        <Text style={styles.phone}>+91 9876500001 • Verified Mechanic</Text>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>Police Verified & Skill Approved</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Primary Service Zone</Text>
        <Text style={styles.infoVal}>Indiranagar & Central Bengaluru (10 KM radius)</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Supported Vehicles</Text>
        <Text style={styles.infoVal}>Two-Wheelers & Four-Wheelers</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={() => router.replace('/(auth)/login')}>
        <Text style={styles.logoutText}>End Shift & Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1D', padding: 16 },
  card: { backgroundColor: '#1E293B', padding: 24, borderRadius: 24, alignItems: 'center', marginBottom: 16 },
  avatar: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: '900', color: '#0F172A' },
  name: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
  phone: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  badge: { backgroundColor: '#064E3B', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginTop: 12 },
  badgeText: { color: '#34D399', fontSize: 11, fontWeight: '800' },
  infoCard: { backgroundColor: '#1E293B', padding: 16, borderRadius: 16, marginBottom: 12 },
  infoLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  infoVal: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', marginTop: 4 },
  logoutBtn: { padding: 16, alignItems: 'center', marginTop: 20 },
  logoutText: { color: '#EF4444', fontWeight: '800', fontSize: 13 },
});
