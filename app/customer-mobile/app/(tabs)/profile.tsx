import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldIcon, PhoneIcon, AlertIcon } from '../../src/components/Icons';
import { THEME } from '../../src/theme';

export default function ProfileTab() {
  const router = useRouter();

  const handleSos = () => {
    Alert.alert(
      'Emergency SOS Triggered',
      'Location and emergency alert dispatched to Priya Sharma (Spouse: 9876543211) and 10Min Help safety desk.'
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>R</Text>
        </View>
        <Text style={styles.name}>Rahul Sharma</Text>
        <View style={styles.verifiedRow}>
          <ShieldIcon size={14} color={THEME.colors.success} />
          <Text style={styles.phone}>+91 9876543210 • Verified Account</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.sosButton} onPress={handleSos} activeOpacity={0.85}>
        <AlertIcon size={18} color="#FFFFFF" />
        <Text style={styles.sosButtonText}>Trigger Emergency SOS Alert</Text>
      </TouchableOpacity>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Primary Emergency Contact</Text>
        <Text style={styles.infoValue}>Priya Sharma (9876543211)</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Registered Service Zone</Text>
        <Text style={styles.infoValue}>Indiranagar & Koramangala, Bengaluru (Pilot)</Text>
      </View>

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={() => router.replace('/(auth)/login')}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background, padding: 16 },
  profileCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: THEME.radius.lg,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    ...THEME.shadow.card,
  },
  avatar: { width: 64, height: 64, borderRadius: 20, backgroundColor: THEME.colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 26, fontWeight: '900', color: THEME.colors.secondary },
  name: { fontSize: 18, fontWeight: '900', color: THEME.colors.textMain },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  phone: { fontSize: 12, color: THEME.colors.textMuted },
  sosButton: {
    backgroundColor: '#DC2626',
    padding: 16,
    borderRadius: THEME.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sosButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: THEME.radius.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    ...THEME.shadow.card,
  },
  infoLabel: { fontSize: 11, fontWeight: '700', color: THEME.colors.textSub, textTransform: 'uppercase' },
  infoValue: { fontSize: 14, fontWeight: '800', color: THEME.colors.textMain, marginTop: 4 },
  signOutButton: { padding: 16, alignItems: 'center', marginTop: 12 },
  signOutText: { color: '#DC2626', fontWeight: '800', fontSize: 14 },
});
