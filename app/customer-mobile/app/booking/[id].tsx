import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { mobileApi } from '../../src/api';
import { getMobileSocket } from '../../src/socket';
import { BookingStatus, PaymentStatus, SOCKET_EVENTS } from '@10min-help/shared';
import { RadarMapView } from '../../src/components/RadarMapView';
import { ClockIcon, PhoneIcon, CheckIcon, ShieldIcon, MapPinIcon, WrenchIcon, AlertIcon } from '../../src/components/Icons';
import { THEME } from '../../src/theme';

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
      Alert.alert('Payment Successful', 'Payment completed via UPI with instant confirmation.');
    } catch (err: any) {
      Alert.alert('Payment Error', err.message);
    }
  };

  const handleCallPartner = () => {
    const phone = booking?.technician?.user?.phone || '9876500001';
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Call Error', `Unable to dial ${phone}`);
    });
  };

  if (loading || !booking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Connecting to live dispatch stream...</Text>
      </View>
    );
  }

  const isSearching = booking.status === BookingStatus.REQUESTED || booking.status === BookingStatus.SEARCHING;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Live Animated Radar Map */}
      <RadarMapView
        statusText={
          isSearching
            ? 'Dispatching nearby 15s offer...'
            : `Assigned: ${booking.technician?.user?.name || 'Suresh Kumar'}`
        }
        isSearching={isSearching}
        assignedTech={
          booking.technician
            ? {
                name: booking.technician?.user?.name || 'Suresh Kumar',
                etaMinutes: booking.estimatedEtaMinutes || 8,
              }
            : undefined
        }
      />

      {/* Ticket Status Header */}
      <View style={styles.statusCard}>
        <View style={styles.statusTopRow}>
          <Text style={styles.statusLabel}>Ticket #{booking._id.slice(-6).toUpperCase()}</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>{booking.status}</Text>
          </View>
        </View>
        <Text style={styles.serviceTitle}>{booking.service?.name}</Text>
        <View style={styles.locRow}>
          <MapPinIcon size={14} color={THEME.colors.primary} />
          <Text style={styles.locText} numberOfLines={1}>
            {booking.pickupLocation?.address || '100ft Road, Indiranagar, Bengaluru'}
          </Text>
        </View>
      </View>

      {/* Searching Banner */}
      {isSearching && (
        <View style={styles.searchingBox}>
          <ActivityIndicator color={THEME.colors.primaryDark} size="large" />
          <Text style={styles.searchingTitle}>Locating Nearest Available Mechanic</Text>
          <Text style={styles.searchingSubtitle}>
            Dispatched high-priority 15-second offer window to verified technicians in Indiranagar/Koramangala zone.
          </Text>
        </View>
      )}

      {/* Technician Card */}
      {booking.technician && (
        <View style={styles.techCard}>
          <View style={styles.techTopRow}>
            <View>
              <Text style={styles.techLabel}>Assigned Verified Partner</Text>
              <Text style={styles.techName}>{booking.technician?.user?.name || 'Suresh Kumar'}</Text>
              <Text style={styles.techRating}>4.9 ★ • 340+ Roadside Repairs</Text>
            </View>
            <TouchableOpacity style={styles.callTechBtn} onPress={handleCallPartner}>
              <PhoneIcon size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.etaBar}>
            <ClockIcon size={16} color="#34D399" />
            <Text style={styles.etaText}>Estimated Arrival: ~{booking.estimatedEtaMinutes || 8} Mins</Text>
          </View>
        </View>
      )}

      {/* Pricing and Payment */}
      <View style={styles.priceCard}>
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.priceLabel}>Quoted Breakdown Amount</Text>
            <Text style={styles.priceSub}>Transparent upfront pricing</Text>
          </View>
          <Text style={styles.priceValue}>₹{booking.approvedFinalAmount || booking.quotedPrice}</Text>
        </View>

        {booking.paymentStatus !== PaymentStatus.PAID ? (
          <TouchableOpacity style={styles.payButton} onPress={handlePay} activeOpacity={0.85}>
            <Text style={styles.payButtonText}>
              Pay Now via UPI (₹{booking.approvedFinalAmount || booking.quotedPrice})
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.paidBadge}>
            <CheckIcon size={18} color="#065F46" />
            <Text style={styles.paidText}>Payment Completed (UPI)</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.colors.background },
  loadingText: { marginTop: 10, fontSize: 13, color: THEME.colors.textMuted },
  statusCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: THEME.radius.lg,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    ...THEME.shadow.card,
  },
  statusTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { fontSize: 11, fontWeight: '800', color: THEME.colors.textSub, textTransform: 'uppercase' },
  statusPill: { backgroundColor: THEME.colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusPillText: { fontSize: 11, fontWeight: '900', color: THEME.colors.primaryDark, textTransform: 'uppercase' },
  serviceTitle: { fontSize: 20, fontWeight: '900', color: THEME.colors.textMain, marginTop: 6 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  locText: { fontSize: 12, color: THEME.colors.textMuted, flex: 1 },
  searchingBox: {
    backgroundColor: THEME.colors.primaryLight,
    padding: 24,
    borderRadius: THEME.radius.lg,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  searchingTitle: { fontSize: 16, fontWeight: '900', color: THEME.colors.primaryDark, marginTop: 12, textAlign: 'center' },
  searchingSubtitle: { fontSize: 12, color: '#92400E', textAlign: 'center', marginTop: 6, lineHeight: 17 },
  techCard: {
    backgroundColor: THEME.colors.secondary,
    padding: 20,
    borderRadius: THEME.radius.lg,
    marginBottom: 16,
    ...THEME.shadow.card,
  },
  techTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  techLabel: { fontSize: 11, fontWeight: '800', color: '#FCD34D', textTransform: 'uppercase' },
  techName: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', marginTop: 2 },
  techRating: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  callTechBtn: { backgroundColor: '#059669', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  etaBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1E293B' },
  etaText: { fontSize: 14, fontWeight: '800', color: '#34D399' },
  priceCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    ...THEME.shadow.card,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 13, color: THEME.colors.textMuted, fontWeight: '700' },
  priceSub: { fontSize: 11, color: THEME.colors.textSub, marginTop: 2 },
  priceValue: { fontSize: 24, fontWeight: '900', color: THEME.colors.textMain },
  payButton: { backgroundColor: '#059669', padding: 16, borderRadius: THEME.radius.md, alignItems: 'center', marginTop: 16 },
  payButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  paidBadge: { backgroundColor: '#D1FAE5', padding: 14, borderRadius: THEME.radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
  paidText: { color: '#065F46', fontWeight: '800', fontSize: 13 },
});
