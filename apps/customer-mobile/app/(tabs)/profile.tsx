import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';

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
        <Text style={styles.phone}>+91 9876543210 • Verified Account</Text>
      </View>

      <TouchableOpacity style={styles.sosButton} onPress={handleSos}>
        <Text style={styles.sosButtonText}>Trigger Emergency SOS Alert</Text>
      </TouchableOpacity>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Primary Emergency Contact</Text>
        <Text style={styles.infoValue}>Priya Sharma (9876543211)</Text>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={() => router.replace('/(auth)/login')}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  profileCard: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 20, alignItems: 'center', marginBottom: 16 },
  avatar: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: '900', color: '#0F172A' },
  name: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  phone: { fontSize: 12, color: '#64748B', marginTop: 2 },
  sosButton: { backgroundColor: '#DC2626', padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 16 },
  sosButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  infoCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 16 },
  infoLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  infoValue: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginTop: 4 },
  signOutButton: { padding: 16, alignItems: 'center' },
  signOutText: { color: '#DC2626', fontWeight: '700', fontSize: 13 },
});
