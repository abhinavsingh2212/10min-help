import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { mechanicApi, setMechanicToken } from '../../src/api';

export default function MechanicLoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('9876500001');
  const [otp, setOtp] = useState('123456');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      await mechanicApi('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, role: 'TECHNICIAN' }),
      });
      setStep('OTP');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      const res = await mechanicApi('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, otp, role: 'TECHNICIAN' }),
      });
      setMechanicToken(res.data.tokens.accessToken);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Partner App</Text>
        <Text style={styles.subtitle}>Sign in with your registered mechanic partner mobile number.</Text>

        <View style={styles.demoBox}>
          <Text style={styles.demoText}>Demo: 9876500001 (Suresh - Indiranagar)</Text>
        </View>

        {step === 'PHONE' ? (
          <>
            <Text style={styles.label}>Partner Phone</Text>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
            />
            <TouchableOpacity style={styles.btn} onPress={handleSendOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="#0F172A" /> : <Text style={styles.btnText}>Send OTP</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>6-Digit OTP</Text>
            <TextInput
              style={[styles.input, styles.otpInput]}
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
            />
            <TouchableOpacity style={styles.btn} onPress={handleVerifyOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="#0F172A" /> : <Text style={styles.btnText}>Verify & Start Shifts</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1D', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#1E293B', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#334155' },
  title: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  demoBox: { backgroundColor: '#0F172A', padding: 10, borderRadius: 12, marginBottom: 16, alignItems: 'center' },
  demoText: { color: '#FCD34D', fontSize: 12, fontWeight: '700' },
  label: { fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 },
  input: { backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 14, height: 48, paddingHorizontal: 14, color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  otpInput: { textAlign: 'center', letterSpacing: 8, fontSize: 20 },
  btn: { backgroundColor: '#F59E0B', borderRadius: 14, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  btnText: { color: '#0F172A', fontWeight: '900', fontSize: 15 },
});
