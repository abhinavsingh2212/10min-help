import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { mechanicApi } from '../../src/api';
import { BookingStatus } from '@10min-help/shared';
import { MapPinIcon, PhoneIcon, NavigateIcon, CheckIcon, AlertIcon, WrenchIcon, ShieldIcon } from '../../src/components/Icons';
import { THEME } from '../../src/theme';

export default function JobExecutionScreen() {
  const { id } = useLocalSearchParams() as { id: string };
  const router = useRouter();

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Revised quote input
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [revisedAmount, setRevisedAmount] = useState('250');
  const [quoteReason, setQuoteReason] = useState('Severe puncture requires vulcanized patch & valve replacement');

  const fetchJob = async () => {
    try {
      const res = await mechanicApi(`/bookings/${id}`);
      setJob(res.data);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [id]);

  const handleUpdateStatus = async (nextStatus: BookingStatus, notes?: string) => {
    setActionLoading(true);
    try {
      const res = await mechanicApi(`/bookings/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: nextStatus, notes }),
      });
      setJob(res.data);
      if (nextStatus === BookingStatus.COMPLETED) {
        Alert.alert('Job Completed!', 'Great work! Job marked completed.');
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      Alert.alert('State Transition Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleProposeQuote = async () => {
    setActionLoading(true);
    try {
      const res = await mechanicApi(`/bookings/${id}/propose-quote`, {
        method: 'POST',
        body: JSON.stringify({
          revisedAmount: parseFloat(revisedAmount),
          reason: quoteReason,
        }),
      });
      setJob(res.data);
      setShowQuoteForm(false);
      Alert.alert('Quote Submitted', 'Customer has received the quotation revision on their screen.');
    } catch (err: any) {
      Alert.alert('Quote Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openNavigation = () => {
    const lat = job?.pickupLocation?.latitude || 12.9784;
    const lng = job?.pickupLocation?.longitude || 77.6408;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Navigation Error', 'Could not open maps application.');
    });
  };

  const callCustomer = () => {
    const phone = job?.customer?.phone || '9876543210';
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Call Error', `Unable to dial ${phone}`);
    });
  };

  if (loading || !job) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Syncing dispatch job telemetry...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Info */}
      <View style={styles.card}>
        <View style={styles.statusRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{job.status}</Text>
          </View>
          <Text style={styles.ticketId}>ID #{job._id.slice(-6).toUpperCase()}</Text>
        </View>

        <Text style={styles.serviceTitle}>{job.service?.name}</Text>

        <View style={styles.detailRow}>
          <MapPinIcon size={16} color={THEME.colors.primary} />
          <Text style={styles.addressInfo}>
            {job.pickupLocation?.address || '100ft Road, Indiranagar, Bengaluru'}
          </Text>
        </View>

        {/* Action quick buttons: Navigation and Call */}
        <View style={styles.quickActionRow}>
          <TouchableOpacity style={styles.quickNavBtn} onPress={openNavigation}>
            <NavigateIcon size={18} color="#FFFFFF" />
            <Text style={styles.quickBtnText}>Turn-by-Turn GPS</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickCallBtn} onPress={callCustomer}>
            <PhoneIcon size={16} color="#FFFFFF" />
            <Text style={styles.quickBtnText}>Call Customer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Agreed Service Charge</Text>
          <Text style={styles.quoteValue}>
            ₹{job.approvedFinalAmount || job.quotedPrice}
          </Text>
        </View>
      </View>

      {/* State Machine Stepper Action Buttons */}
      <View style={styles.actionCard}>
        <Text style={styles.actionHeading}>Dispatch Step Actions</Text>

        {job.status === BookingStatus.ASSIGNED && (
          <TouchableOpacity
            style={styles.btnPrimary}
            disabled={actionLoading}
            onPress={() => handleUpdateStatus(BookingStatus.EN_ROUTE, 'Mechanic started travel')}
          >
            <NavigateIcon size={20} color={THEME.colors.secondary} />
            <Text style={styles.btnPrimaryText}>Start Travel (En Route)</Text>
          </TouchableOpacity>
        )}

        {job.status === BookingStatus.EN_ROUTE && (
          <TouchableOpacity
            style={styles.btnPrimary}
            disabled={actionLoading}
            onPress={() => handleUpdateStatus(BookingStatus.ARRIVED, 'Mechanic reached customer')}
          >
            <MapPinIcon size={20} color={THEME.colors.secondary} />
            <Text style={styles.btnPrimaryText}>Mark Arrived at Location</Text>
          </TouchableOpacity>
        )}

        {job.status === BookingStatus.ARRIVED && (
          <TouchableOpacity
            style={styles.btnPrimary}
            disabled={actionLoading}
            onPress={() => handleUpdateStatus(BookingStatus.INSPECTING, 'Started vehicle diagnosis')}
          >
            <WrenchIcon size={20} color={THEME.colors.secondary} />
            <Text style={styles.btnPrimaryText}>Start Inspection</Text>
          </TouchableOpacity>
        )}

        {job.status === BookingStatus.INSPECTING && !showQuoteForm && (
          <View style={styles.buttonStack}>
            <TouchableOpacity
              style={styles.btnPrimary}
              disabled={actionLoading}
              onPress={() => handleUpdateStatus(BookingStatus.IN_PROGRESS, 'Standard repair started')}
            >
              <CheckIcon size={20} color={THEME.colors.secondary} />
              <Text style={styles.btnPrimaryText}>Start Repair (Standard Quote)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => setShowQuoteForm(true)}
            >
              <AlertIcon size={18} color="#FCD34D" />
              <Text style={styles.btnSecondaryText}>Propose Revised Price Quote</Text>
            </TouchableOpacity>
          </View>
        )}

        {showQuoteForm && (
          <View style={styles.formBox}>
            <Text style={styles.formLabel}>Revised Quote Amount (₹)</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={revisedAmount}
              onChangeText={setRevisedAmount}
            />

            <Text style={styles.formLabel}>Inspection Diagnosis / Reason</Text>
            <TextInput
              style={styles.input}
              value={quoteReason}
              onChangeText={setQuoteReason}
            />

            <TouchableOpacity style={styles.btnPrimary} onPress={handleProposeQuote}>
              <Text style={styles.btnPrimaryText}>Send Quote to Customer</Text>
            </TouchableOpacity>
          </View>
        )}

        {job.status === BookingStatus.AWAITING_CUSTOMER_APPROVAL && (
          <View style={styles.waitingBox}>
            <ActivityIndicator color={THEME.colors.primary} />
            <Text style={styles.waitingText}>
              Waiting for customer to approve revised quote of ₹{job.quotedPrice}...
            </Text>
            <TouchableOpacity style={styles.btnSecondary} onPress={fetchJob}>
              <Text style={styles.btnSecondaryText}>Check Approval Status</Text>
            </TouchableOpacity>
          </View>
        )}

        {job.status === BookingStatus.IN_PROGRESS && (
          <TouchableOpacity
            style={styles.btnSuccess}
            disabled={actionLoading}
            onPress={() => handleUpdateStatus(BookingStatus.COMPLETED, 'Repair finished')}
          >
            <CheckIcon size={20} color="#FFFFFF" />
            <Text style={styles.btnSuccessText}>Complete Job & Settle</Text>
          </TouchableOpacity>
        )}

        {job.status === BookingStatus.COMPLETED && (
          <View style={styles.completeBox}>
            <CheckIcon size={24} color={THEME.colors.success} />
            <Text style={styles.completeText}>Job has been successfully completed!</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.colors.background },
  loadingText: { marginTop: 12, color: THEME.colors.textMuted, fontSize: 13 },
  card: { backgroundColor: THEME.colors.surface, padding: 20, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: THEME.colors.border },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { backgroundColor: THEME.colors.amberDeep, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#FEF3C7', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  ticketId: { color: THEME.colors.textMuted, fontSize: 12, fontFamily: 'monospace' },
  serviceTitle: { fontSize: 20, fontWeight: '900', color: THEME.colors.textMain, marginTop: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  addressInfo: { fontSize: 13, color: THEME.colors.textMuted, flex: 1 },
  quickActionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  quickNavBtn: { flex: 1, backgroundColor: '#2563EB', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  quickCallBtn: { flex: 1, backgroundColor: '#059669', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  quickBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: THEME.colors.border },
  priceLabel: { fontSize: 12, color: THEME.colors.textMuted, fontWeight: '700' },
  quoteValue: { fontSize: 18, fontWeight: '900', color: THEME.colors.success },
  actionCard: { backgroundColor: THEME.colors.surface, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: THEME.colors.border },
  actionHeading: { fontSize: 12, fontWeight: '800', color: THEME.colors.textMuted, textTransform: 'uppercase', marginBottom: 16 },
  buttonStack: { gap: 10 },
  btnPrimary: { backgroundColor: THEME.colors.primary, padding: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  btnPrimaryText: { color: THEME.colors.secondary, fontWeight: '900', fontSize: 15 },
  btnSecondary: { backgroundColor: '#334155', padding: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  btnSecondaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  btnSuccess: { backgroundColor: THEME.colors.success, padding: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  btnSuccessText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  formBox: { marginTop: 12, padding: 16, backgroundColor: THEME.colors.surfaceSubtle, borderRadius: 16 },
  formLabel: { fontSize: 11, fontWeight: '700', color: THEME.colors.textMuted, marginBottom: 4 },
  input: { backgroundColor: THEME.colors.surface, borderWidth: 1, borderColor: THEME.colors.border, padding: 10, borderRadius: 10, color: THEME.colors.textMain, fontSize: 14, marginBottom: 12 },
  waitingBox: { alignItems: 'center', padding: 16, gap: 10 },
  waitingText: { color: '#FCD34D', fontSize: 13, textAlign: 'center', fontWeight: '600' },
  completeBox: { padding: 16, backgroundColor: THEME.colors.successBg, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  completeText: { color: THEME.colors.success, fontWeight: '900' },
});
