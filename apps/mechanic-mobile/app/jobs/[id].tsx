import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { mechanicApi } from '../../src/api';
import { BookingStatus } from '@10min-help/shared';

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

  if (loading || !job) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#F59E0B" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Info */}
      <View style={styles.card}>
        <Text style={styles.badge}>{job.status}</Text>
        <Text style={styles.serviceTitle}>{job.service?.name}</Text>
        <Text style={styles.customerInfo}>
          Customer: {job.customer?.name} ({job.customer?.phone})
        </Text>
        <Text style={styles.addressInfo}>
          Location: {job.pickupLocation?.address || '100ft Road, Indiranagar'}
        </Text>
        <Text style={styles.quoteValue}>
          Current Agreed Quote: ₹{job.approvedFinalAmount || job.quotedPrice}
        </Text>
      </View>

      {/* State Machine Stepper Action Buttons */}
      <View style={styles.actionCard}>
        <Text style={styles.actionHeading}>Step Workflow Actions</Text>

        {job.status === BookingStatus.ASSIGNED && (
          <TouchableOpacity
            style={styles.btnPrimary}
            disabled={actionLoading}
            onPress={() => handleUpdateStatus(BookingStatus.EN_ROUTE, 'Mechanic started travel')}
          >
            <Text style={styles.btnPrimaryText}>Start Travel (En Route)</Text>
          </TouchableOpacity>
        )}

        {job.status === BookingStatus.EN_ROUTE && (
          <TouchableOpacity
            style={styles.btnPrimary}
            disabled={actionLoading}
            onPress={() => handleUpdateStatus(BookingStatus.ARRIVED, 'Mechanic reached customer')}
          >
            <Text style={styles.btnPrimaryText}>Mark Arrived at Location</Text>
          </TouchableOpacity>
        )}

        {job.status === BookingStatus.ARRIVED && (
          <TouchableOpacity
            style={styles.btnPrimary}
            disabled={actionLoading}
            onPress={() => handleUpdateStatus(BookingStatus.INSPECTING, 'Started vehicle diagnosis')}
          >
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
              <Text style={styles.btnPrimaryText}>Start Repair (Standard Quote)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => setShowQuoteForm(true)}
            >
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
            <ActivityIndicator color="#F59E0B" />
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
            <Text style={styles.btnSuccessText}>Complete Job & Settle</Text>
          </TouchableOpacity>
        )}

        {job.status === BookingStatus.COMPLETED && (
          <View style={styles.completeBox}>
            <Text style={styles.completeText}>Job has been successfully completed!</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1D' },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#1E293B', padding: 20, borderRadius: 20, marginBottom: 16 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#B45309', color: '#FEF3C7', fontSize: 11, fontWeight: '900', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, textTransform: 'uppercase', marginBottom: 8 },
  serviceTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  customerInfo: { fontSize: 13, color: '#FCD34D', fontWeight: '700', marginTop: 4 },
  addressInfo: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  quoteValue: { fontSize: 15, fontWeight: '900', color: '#34D399', marginTop: 10 },
  actionCard: { backgroundColor: '#1E293B', padding: 20, borderRadius: 20 },
  actionHeading: { fontSize: 13, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 16 },
  buttonStack: { gap: 10 },
  btnPrimary: { backgroundColor: '#F59E0B', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  btnPrimaryText: { color: '#0F172A', fontWeight: '900', fontSize: 15 },
  btnSecondary: { backgroundColor: '#334155', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  btnSecondaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  btnSuccess: { backgroundColor: '#059669', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  btnSuccessText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  formBox: { marginTop: 12, padding: 16, backgroundColor: '#0F172A', borderRadius: 16 },
  formLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 4 },
  input: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', padding: 10, borderRadius: 10, color: '#FFFFFF', fontSize: 14, marginBottom: 12 },
  waitingBox: { alignItems: 'center', padding: 16, gap: 10 },
  waitingText: { color: '#FCD34D', fontSize: 13, textAlign: 'center', fontWeight: '600' },
  completeBox: { padding: 16, backgroundColor: '#064E3B', borderRadius: 14, alignItems: 'center' },
  completeText: { color: '#34D399', fontWeight: '900' },
});
