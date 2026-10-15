import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { mechanicApi, setMechanicToken } from '../../src/api';
import { THEME } from '../../src/theme';
import { WrenchIcon, CheckIcon, ShieldIcon } from '../../src/components/Icons';

export default function MechanicLoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [devOtpNotice, setDevOtpNotice] = useState<string | null>(null);

  const fillDemoMechanic = () => {
    setPhone('9876500001');
    setName('Suresh Kumar');
  };

  const handleSendOtp = async () => {
    const cleanPhone = phone.trim().replace(/[\s-]/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      const res = await mechanicApi('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: cleanPhone, role: 'TECHNICIAN' }),
      });
      setOtp('');
      if (res.data?.devOtp) {
        setDevOtpNotice(`Dev Environment OTP: ${res.data.devOtp}`);
      } else {
        setDevOtpNotice(null);
      }
      setStep('OTP');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not send verification OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const cleanPhone = phone.trim().replace(/[\s-]/g, '');
    if (!otp || otp.length < 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit OTP code.');
      return;
    }
    setLoading(true);
    try {
      const res = await mechanicApi('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          phone: cleanPhone,
          otp,
          name: name.trim() || undefined,
          role: 'TECHNICIAN',
        }),
      });
      setMechanicToken(res.data.tokens.accessToken);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Authentication Failed', err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.logoBadge}>
          <WrenchIcon size={28} color={THEME.colors.primary} />
        </View>

        <Text style={styles.title}>Mechanic Partner Desk</Text>
        <Text style={styles.subtitle}>Register or login with ANY phone number to accept roadside jobs.</Text>

        <TouchableOpacity style={styles.demoBox} onPress={fillDemoMechanic} activeOpacity={0.8}>
          <Text style={styles.demoText}>Quick Fill: Suresh Kumar (9876500001)</Text>
        </TouchableOpacity>

        {step === 'PHONE' ? (
          <View style={styles.form}>
            <Text style={styles.label}>Technician Full Name (Optional)</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Suresh Kumar"
              placeholderTextColor="#64748B"
            />

            <Text style={styles.label}>Partner Mobile Number *</Text>
            <View style={styles.phoneInputRow}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.phoneInput}
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter 10-digit number"
                placeholderTextColor="#64748B"
              />
            </View>

            <TouchableOpacity
              style={styles.btn}
              onPress={handleSendOtp}
              disabled={loading || phone.trim().length < 10}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color={THEME.colors.secondary} /> : <Text style={styles.btnText}>Send Verification OTP</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            {devOtpNotice && (
              <View style={styles.noticeBox}>
                <CheckIcon size={16} color="#34D399" />
                <Text style={styles.noticeText}>{devOtpNotice}</Text>
              </View>
            )}

            <View style={styles.phoneRow}>
              <Text style={styles.sentLabel}>OTP for +91 {phone}</Text>
              <TouchableOpacity onPress={() => setStep('PHONE')}>
                <Text style={styles.changePhoneText}>Edit phone</Text>
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
              placeholderTextColor="#64748B"
            />

            <TouchableOpacity
              style={styles.btn}
              onPress={handleVerifyOtp}
              disabled={loading || otp.length < 6}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color={THEME.colors.secondary} /> : <Text style={styles.btnText}>Verify & Start Shifts</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: THEME.colors.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: THEME.colors.border },
  logoBadge: { width: 56, height: 56, borderRadius: 20, backgroundColor: THEME.colors.surfaceSubtle, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 12, borderWidth: 1, borderColor: THEME.colors.border },
  title: { fontSize: 24, fontWeight: '900', color: THEME.colors.textMain, textAlign: 'center' },
  subtitle: { fontSize: 13, color: THEME.colors.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  demoBox: { backgroundColor: THEME.colors.surfaceSubtle, padding: 10, borderRadius: 12, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: THEME.colors.border },
  demoText: { color: THEME.colors.primary, fontSize: 11, fontWeight: '800' },
  form: { width: '100%' },
  label: { fontSize: 11, fontWeight: '800', color: THEME.colors.textMuted, textTransform: 'uppercase', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: THEME.colors.surfaceSubtle, borderWidth: 1, borderColor: THEME.colors.border, borderRadius: 14, height: 48, paddingHorizontal: 14, color: THEME.colors.textMain, fontSize: 14, fontWeight: '700' },
  phoneInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: THEME.colors.border, borderRadius: 14, backgroundColor: THEME.colors.surfaceSubtle, paddingHorizontal: 12 },
  countryCode: { fontWeight: '800', color: THEME.colors.textMuted, marginRight: 8, fontSize: 14 },
  phoneInput: { flex: 1, height: 48, fontSize: 15, fontWeight: '700', color: THEME.colors.textMain },
  noticeBox: { backgroundColor: '#064E3B', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  noticeText: { fontSize: 11, fontWeight: '700', color: '#34D399', flex: 1 },
  phoneRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sentLabel: { fontSize: 12, color: THEME.colors.textMuted },
  changePhoneText: { fontSize: 11, color: THEME.colors.primary, fontWeight: '800' },
  otpInput: { textAlign: 'center', letterSpacing: 8, fontSize: 22 },
  btn: { backgroundColor: THEME.colors.primary, borderRadius: 14, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  btnText: { color: THEME.colors.secondary, fontWeight: '900', fontSize: 15 },
});
