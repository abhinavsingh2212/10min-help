import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { mobileApi, setCustomerToken } from '../../src/api';

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('9876543210');
  const [otp, setOtp] = useState('123456');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (phone.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      await mobileApi('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, role: 'CUSTOMER' }),
      });
      setStep('OTP');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      const res = await mobileApi('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, otp }),
      });
      setCustomerToken(res.data.tokens.accessToken);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>10Min Help</Text>
        <Text style={styles.subtitle}>Enter your mobile number to get fast roadside assistance.</Text>

        {step === 'PHONE' ? (
          <>
            <Text style={styles.label}>Mobile Number</Text>
            <View style={styles.phoneInputRow}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
                placeholder="9876543210"
              />
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleSendOtp} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#0F172A" />
              ) : (
                <Text style={styles.primaryButtonText}>Send OTP</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>Enter 6-Digit OTP</Text>
            <TextInput
              style={[styles.input, styles.otpInput]}
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              placeholder="123456"
            />

            <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyOtp} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#0F172A" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify & Continue</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  title: { fontSize: 24, fontWeight: '900', color: '#0F172A', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', marginVertical: 12 },
  label: { fontSize: 12, fontWeight: '700', color: '#334155', textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  phoneInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, backgroundColor: '#F8FAFC', paddingHorizontal: 12 },
  countryCode: { fontWeight: '700', color: '#64748B', marginRight: 8 },
  input: { flex: 1, height: 48, fontSize: 15, fontWeight: '600', color: '#0F172A' },
  otpInput: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, backgroundColor: '#F8FAFC', textAlign: 'center', letterSpacing: 8, fontSize: 20, fontWeight: '900' },
  primaryButton: { backgroundColor: '#F59E0B', borderRadius: 14, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  primaryButtonText: { color: '#0F172A', fontWeight: '900', fontSize: 15 },
});
