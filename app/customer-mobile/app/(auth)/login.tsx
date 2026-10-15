import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { mobileApi, setCustomerToken } from '../../src/api';
import { THEME } from '../../src/theme';
import { ShieldIcon, CheckIcon, AlertIcon } from '../../src/components/Icons';

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [devOtpNotice, setDevOtpNotice] = useState<string | null>(null);

  const fillDemoAccount = () => {
    setPhone('9876543210');
    setName('Rahul Sharma');
  };

  const handleSendOtp = async () => {
    const cleanPhone = phone.trim().replace(/[\s-]/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      const res = await mobileApi('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: cleanPhone, role: 'CUSTOMER' }),
      });
      setOtp('');
      if (res.data?.devOtp) {
        setDevOtpNotice(`Dev Environment OTP: ${res.data.devOtp}`);
      } else {
        setDevOtpNotice(null);
      }
      setStep('OTP');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const cleanPhone = phone.trim().replace(/[\s-]/g, '');
    if (!otp || otp.length < 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP code.');
      return;
    }
    setLoading(true);
    try {
      const res = await mobileApi('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          phone: cleanPhone,
          otp,
          name: name.trim() || undefined,
          role: 'CUSTOMER',
        }),
      });
      setCustomerToken(res.data.tokens.accessToken);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Invalid OTP code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.logoBadge}>
          <ShieldIcon size={28} color={THEME.colors.primaryDark} />
        </View>

        <Text style={styles.title}>10Min Help</Text>
        <Text style={styles.tagline}>"We reach. You relax."</Text>
        <Text style={styles.subtitle}>Register or sign in with ANY mobile phone number.</Text>

        {/* Quick Demo Pill */}
        <TouchableOpacity style={styles.demoPill} onPress={fillDemoAccount} activeOpacity={0.8}>
          <Text style={styles.demoText}>Quick Fill: Rahul Sharma (9876543210)</Text>
        </TouchableOpacity>

        {step === 'PHONE' ? (
          <View style={styles.form}>
            <Text style={styles.label}>Full Name (Optional)</Text>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Abhinav Singh"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.label}>Mobile Phone Number *</Text>
            <View style={styles.phoneInputRow}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.phoneInput}
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter any 10-digit number"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSendOtp}
              disabled={loading || phone.trim().length < 10}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={THEME.colors.secondary} />
              ) : (
                <Text style={styles.primaryButtonText}>Get Verification Code</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            {devOtpNotice && (
              <View style={styles.noticeBox}>
                <CheckIcon size={16} color="#065F46" />
                <Text style={styles.noticeText}>{devOtpNotice}</Text>
              </View>
            )}

            <View style={styles.phoneRow}>
              <Text style={styles.sentLabel}>Code sent to +91 {phone}</Text>
              <TouchableOpacity onPress={() => setStep('PHONE')}>
                <Text style={styles.changePhoneText}>Edit number</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>6-Digit OTP</Text>
            <TextInput
              style={[styles.input, styles.otpInput]}
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              placeholder="123456"
              placeholderTextColor="#CBD5E1"
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleVerifyOtp}
              disabled={loading || otp.length < 6}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={THEME.colors.secondary} />
              ) : (
                <Text style={styles.primaryButtonText}>Verify & Start Requesting</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.termsText}>
          By continuing, you agree to 10Min Help's Roadside Safety & Privacy Policies.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    ...THEME.shadow.card,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: THEME.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '900', color: THEME.colors.textMain, textAlign: 'center' },
  tagline: { fontSize: 13, fontWeight: '700', color: THEME.colors.primaryDark, textAlign: 'center', marginTop: 2 },
  subtitle: { fontSize: 12, color: THEME.colors.textMuted, textAlign: 'center', marginTop: 6, marginBottom: 14 },
  demoPill: {
    backgroundColor: THEME.colors.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: THEME.radius.md,
    alignSelf: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  demoText: { fontSize: 11, fontWeight: '800', color: THEME.colors.primaryDark },
  form: { width: '100%' },
  label: { fontSize: 11, fontWeight: '800', color: THEME.colors.textMuted, textTransform: 'uppercase', marginBottom: 6, marginTop: 10 },
  nameInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: THEME.colors.textMain,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
  },
  countryCode: { fontWeight: '800', color: THEME.colors.textMuted, marginRight: 8, fontSize: 14 },
  phoneInput: { flex: 1, height: 48, fontSize: 15, fontWeight: '700', color: THEME.colors.textMain },
  noticeBox: {
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: THEME.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  noticeText: { fontSize: 11, fontWeight: '700', color: '#065F46', flex: 1 },
  phoneRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sentLabel: { fontSize: 12, color: THEME.colors.textMuted },
  changePhoneText: { fontSize: 11, color: THEME.colors.primaryDark, fontWeight: '800' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: THEME.colors.border, borderRadius: THEME.radius.md, height: 48, paddingHorizontal: 14, color: THEME.colors.textMain },
  otpInput: { textAlign: 'center', letterSpacing: 8, fontSize: 22, fontWeight: '900' },
  primaryButton: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    ...THEME.shadow.float,
  },
  primaryButtonText: { color: THEME.colors.secondary, fontWeight: '900', fontSize: 15 },
  termsText: { fontSize: 10, color: THEME.colors.textSub, textAlign: 'center', marginTop: 20, lineHeight: 14 },
});
