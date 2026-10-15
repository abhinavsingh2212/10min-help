import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { mechanicApi } from '../../src/api';
import { getMechanicSocket } from '../../src/socket';
import { SOCKET_EVENTS } from '@10min-help/shared';

export default function MechanicDashboard() {
  const router = useRouter();

  const [isOnline, setIsOnline] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [earnings, setEarnings] = useState<any>(null);

  // 15-Second Offer State
  const [incomingOffer, setIncomingOffer] = useState<any>(null);
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    async function load() {
      try {
        const [meRes, jobRes, earnRes] = await Promise.all([
          mechanicApi('/technicians/me'),
          mechanicApi('/technicians/active-job'),
          mechanicApi('/technicians/earnings'),
        ]);
        setProfile(meRes.data);
        setIsOnline(meRes.data?.isOnline || false);
        setActiveJob(jobRes.data);
        setEarnings(earnRes.data);
      } catch (err) {
        // default
      }
    }

    load();

    // Socket listeners for offers
    const socket = getMechanicSocket();
    socket.on(SOCKET_EVENTS.BOOKING_OFFER, (offer) => {
      setIncomingOffer(offer);
      setCountdown(15);
    });

    return () => {
      socket.off(SOCKET_EVENTS.BOOKING_OFFER);
    };
  }, []);

  // Countdown timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (incomingOffer && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0 && incomingOffer) {
      // Expired!
      setIncomingOffer(null);
    }
    return () => clearTimeout(timer);
  }, [incomingOffer, countdown]);

  const handleToggleOnline = async (value: boolean) => {
    try {
      await mechanicApi('/technicians/availability', {
        method: 'PATCH',
        body: JSON.stringify({ isOnline: value }),
      });
      setIsOnline(value);
    } catch (err: any) {
      Alert.alert('Status Error', err.message);
    }
  };

  const handleAcceptOffer = async () => {
    try {
      const res = await mechanicApi(`/dispatch/offers/${incomingOffer.offerId}/accept`, {
        method: 'POST',
      });
      const acceptedBooking = res.data;
      setIncomingOffer(null);
      router.push({ pathname: '/jobs/[id]', params: { id: acceptedBooking._id } });
    } catch (err: any) {
      Alert.alert('Offer Missed', err.message);
      setIncomingOffer(null);
    }
  };

  const handleRejectOffer = async () => {
    try {
      await mechanicApi(`/dispatch/offers/${incomingOffer.offerId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Mechanic rejected offer' }),
      });
      setIncomingOffer(null);
    } catch (err: any) {
      setIncomingOffer(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Online Toggle Header */}
      <View style={styles.statusCard}>
        <View>
          <Text style={styles.statusTitle}>Duty Status</Text>
          <Text style={[styles.statusSubtitle, { color: isOnline ? '#34D399' : '#94A3B8' }]}>
            {isOnline ? 'ONLINE • Receiving Requests' : 'OFFLINE • Shift Paused'}
          </Text>
        </View>
        <Switch
          value={isOnline}
          onValueChange={handleToggleOnline}
          thumbColor={isOnline ? '#F59E0B' : '#64748B'}
          trackColor={{ false: '#334155', true: '#B45309' }}
        />
      </View>

      {/* Verification Badge */}
      <View style={styles.badgeCard}>
        <Text style={styles.badgeTitle}>Verified Partner Profile</Text>
        <Text style={styles.badgeSubtitle}>
          Skills: {profile?.skills?.join(', ') || 'All breakdown services'}
        </Text>
      </View>

      {/* Today's Metrics */}
      <View style={styles.metricsRow}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Today&apos;s Jobs</Text>
          <Text style={styles.metricValue}>{earnings?.todayJobs || 0}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Net Earnings</Text>
          <Text style={styles.metricValue}>₹{earnings?.todayNetEarnings || 0}</Text>
        </View>
      </View>

      {/* Active Job Card */}
      {activeJob && (
        <TouchableOpacity
          style={styles.activeJobCard}
          onPress={() => router.push({ pathname: '/jobs/[id]', params: { id: activeJob._id } })}
        >
          <Text style={styles.activeJobBadge}>Current Active Breakdown</Text>
          <Text style={styles.activeJobTitle}>{activeJob.service?.name}</Text>
          <Text style={styles.activeJobDetails}>
            Customer: {activeJob.customer?.name} ({activeJob.customer?.phone})
          </Text>
          <Text style={styles.activeJobStatus}>Stage: {activeJob.status} &rarr;</Text>
        </TouchableOpacity>
      )}

      {/* MODAL: 15-SECOND OFFER WINDOW */}
      <Modal visible={!!incomingOffer} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Timer Banner */}
            <View style={styles.timerBox}>
              <Text style={styles.timerText}>{countdown}s</Text>
              <Text style={styles.timerSub}>Offer Window Expiring</Text>
            </View>

            <Text style={styles.offerTitle}>{incomingOffer?.serviceName}</Text>
            <Text style={styles.offerVehicle}>Vehicle: {incomingOffer?.vehicleType}</Text>
            <Text style={styles.offerDistance}>
              Distance: ~{incomingOffer?.distanceKm} km (ETA: {incomingOffer?.estimatedEtaMinutes} mins)
            </Text>
            <Text style={styles.offerLocation}>
              Location: {incomingOffer?.customerAddress}
            </Text>

            <View style={styles.earningsBox}>
              <Text style={styles.earningLabel}>Estimated Job Earnings (85%)</Text>
              <Text style={styles.earningValue}>
                ₹{Math.round((incomingOffer?.quotedPrice || 120) * 0.85)}
              </Text>
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.rejectBtn} onPress={handleRejectOffer}>
                <Text style={styles.rejectBtnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptBtn} onPress={handleAcceptOffer}>
                <Text style={styles.acceptBtnText}>Accept Job</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1D' },
  content: { padding: 16 },
  statusCard: { backgroundColor: '#1E293B', padding: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statusTitle: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
  statusSubtitle: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  badgeCard: { backgroundColor: '#0F172A', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  badgeTitle: { fontSize: 13, fontWeight: '800', color: '#FCD34D' },
  badgeSubtitle: { fontSize: 11, color: '#94A3B8', marginTop: 3 },
  metricsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  metricBox: { flex: 1, backgroundColor: '#1E293B', padding: 18, borderRadius: 18 },
  metricLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' },
  metricValue: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', marginTop: 4 },
  activeJobCard: { backgroundColor: '#D97706', padding: 20, borderRadius: 20 },
  activeJobBadge: { fontSize: 11, fontWeight: '900', color: '#0F172A', textTransform: 'uppercase' },
  activeJobTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginTop: 2 },
  activeJobDetails: { fontSize: 13, color: '#451A03', marginTop: 4 },
  activeJobStatus: { fontSize: 12, fontWeight: '900', color: '#0F172A', marginTop: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#1E293B', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, borderWidth: 1, borderColor: '#475569' },
  timerBox: { backgroundColor: '#B45309', padding: 12, borderRadius: 16, alignItems: 'center', marginBottom: 16 },
  timerText: { fontSize: 28, fontWeight: '900', color: '#FEF3C7' },
  timerSub: { fontSize: 11, color: '#FDE68A', fontWeight: '700' },
  offerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  offerVehicle: { fontSize: 13, color: '#FCD34D', fontWeight: '700', marginTop: 2 },
  offerDistance: { fontSize: 13, color: '#94A3B8', marginTop: 6 },
  offerLocation: { fontSize: 12, color: '#CBD5E1', marginTop: 2 },
  earningsBox: { backgroundColor: '#0F172A', padding: 16, borderRadius: 16, marginVertical: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  earningLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '700' },
  earningValue: { fontSize: 22, fontWeight: '900', color: '#34D399' },
  modalActionRow: { flexDirection: 'row', gap: 12 },
  rejectBtn: { flex: 1, padding: 16, borderRadius: 14, backgroundColor: '#334155', alignItems: 'center' },
  rejectBtnText: { color: '#94A3B8', fontWeight: '800' },
  acceptBtn: { flex: 2, padding: 16, borderRadius: 14, backgroundColor: '#F59E0B', alignItems: 'center' },
  acceptBtnText: { color: '#0F172A', fontWeight: '900', fontSize: 15 },
});
