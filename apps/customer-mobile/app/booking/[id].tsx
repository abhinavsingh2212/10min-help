import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { mobileApi } from '../../src/api';
import { getMobileSocket } from '../../src/socket';
import { BookingStatus, PaymentStatus, SOCKET_EVENTS } from '@10min-help/shared';

export default function BookingTrackingScreen() {
  const { id } = useLocalSearchParams() as { id: string };
  const router = useRouter();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBooking() {
      try {
        const res = await mobileApi(`/bookings/${id}`);
        setBooking(res.data);
      } catch (err: any) {
        Alert.alert('Error', err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchBooking();

    // Socket real-time listeners
    const socket = getMobileSocket();
    socket.emit('join:booking', { bookingId: id });

    socket.on(SOCKET_EVENTS.BOOKING_STATUS, (data) => {
      if (data.bookingId === id) {
        setBooking((prev: any) => (prev ? { ...prev, status: data.status } : prev));
      }
    });

    socket.on(SOCKET_EVENTS.BOOKING_ASSIGNED, (data) => {
      if (data.bookingId === id) {
        setBooking((prev: any) =>
          prev
            ? {
                ...prev,
                status: BookingStatus.ASSIGNED,
                technician: data.technician,
              }
            : prev
        );
      }
    });

    return () => {
      socket.emit('leave:booking', { bookingId: id });
    };
  }, [id]);

  const handlePay = async () => {
    try {
      await mobileApi('/payments/orders', {
        method: 'POST',
        body: JSON.stringify({ bookingId: id, method: 'UPI' }),
      });
      await mobileApi('/payments/verify', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: id,
          providerOrderId: `order_${Date.now()}`,
          providerPaymentId: `pay_${Date.now()}`,
          signature: 'valid_mock_signature',
        }),
      });
      setBooking((prev: any) => ({ ...prev, paymentStatus: PaymentStatus.PAID }));
      Alert.alert('Payment Successful', 'Payment of verified quote completed via UPI.');
    } catch (err: any) {
      Alert.alert('Payment Error', err.message);
    }
  };

  if (loading || !booking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#F59E0B" />
        <Text style={styles.loadingText}>Connecting to live dispatch stream...</Text>
      </View>
    );
  }

  const isSearching = booking.status === BookingStatus.REQUESTED || booking.status === BookingStatus.SEARCHING;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status Card */}
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Ticket #{booking._id.substring(booking._id.length - 6).toUpperCase()}</Text>
        <Text style={styles.statusValue}>{booking.status}</Text>
        <Text style={styles.serviceTitle}>{booking.service?.name}</Text>
      </View>

      {/* Searching Banner */}
      {isSearching && (
        <View style={styles.searchingBox}>
          <ActivityIndicator color="#B45309" size="large" />
          <Text style={styles.searchingTitle}>Contacting Nearby Mechanics</Text>
          <Text style={styles.searchingSubtitle}>15-second timed offer window dispatched to nearest verified partner.</Text>
        </View>
      )}

      {/* Technician Card */}
      {booking.technician && (
        <View style={styles.techCard}>
          <Text style={styles.techLabel}>Assigned Verified Partner</Text>
          <Text style={styles.techName}>{booking.technician?.user?.name || 'Suresh Kumar'}</Text>
          <Text style={styles.techEta}>ETA: ~{booking.estimatedEtaMinutes || 8} Mins</Text>
        </View>
      )}

      {/* Pricing and Payment */}
      <View style={styles.priceCard}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Quoted Amount</Text>
          <Text style={styles.priceValue}>₹{booking.approvedFinalAmount || booking.quotedPrice}</Text>
        </View>

        {booking.paymentStatus !== PaymentStatus.PAID ? (
          <TouchableOpacity style={styles.payButton} onPress={handlePay}>
            <Text style={styles.payButtonText}>Pay Now via UPI (₹{booking.approvedFinalAmount || booking.quotedPrice})</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.paidBadge}>
            <Text style={styles.paidText}>Payment Completed (UPI)</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 8, fontSize: 13, color: '#64748B' },
  statusCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  statusLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' },
  statusValue: { fontSize: 20, fontWeight: '900', color: '#D97706', marginTop: 2 },
  serviceTitle: { fontSize: 14, fontWeight: '700', color: '#334155', marginTop: 4 },
  searchingBox: { backgroundColor: '#FEF3C7', padding: 24, borderRadius: 20, alignItems: 'center', marginBottom: 16 },
  searchingTitle: { fontSize: 16, fontWeight: '900', color: '#78350F', marginTop: 12 },
  searchingSubtitle: { fontSize: 12, color: '#92400E', textAlign: 'center', marginTop: 4 },
  techCard: { backgroundColor: '#0F172A', padding: 20, borderRadius: 20, marginBottom: 16 },
  techLabel: { fontSize: 11, fontWeight: '700', color: '#FCD34D', textTransform: 'uppercase' },
  techName: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', marginTop: 2 },
  techEta: { fontSize: 14, fontWeight: '700', color: '#34D399', marginTop: 4 },
  priceCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 13, color: '#64748B', fontWeight: '700' },
  priceValue: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  payButton: { backgroundColor: '#059669', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 16 },
  payButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  paidBadge: { backgroundColor: '#D1FAE5', padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  paidText: { color: '#065F46', fontWeight: '800', fontSize: 13 },
});
