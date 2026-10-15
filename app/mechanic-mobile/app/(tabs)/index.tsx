import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { mechanicApi } from '../../src/api';
import { getMechanicSocket } from '../../src/socket';
import { SOCKET_EVENTS } from '@10min-help/shared';
import { ClockIcon, ShieldIcon, CheckIcon, MapPinIcon, WrenchIcon, AlertIcon } from '../../src/components/Icons';
import { THEME } from '../../src/theme';

export default function MechanicDashboard() {
  const router = useRouter();

  // Start in safe offline/loading state
  const [isOnline, setIsOnline] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [earnings, setEarnings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 15-Second Offer State
  const [incomingOffer, setIncomingOffer] = useState<any>(null);
  const [countdown, setCountdown] = useState(15);
  const [respondingOffer, setRespondingOffer] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [meRes, jobRes, earnRes] = await Promise.all([
        mechanicApi('/technicians/me'),
        mechanicApi('/technicians/active-job'),
        mechanicApi('/technicians/earnings'),
      ]);
      setProfile(meRes.data);
      setIsOnline(Boolean(meRes.data?.isOnline));
      setActiveJob(jobRes.data);
      setEarnings(earnRes.data);
    } catch (err: any) {
      setLoadError(err.message || 'Could not load technician telemetry data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Socket listeners for offers
    const socket = getMechanicSocket();
    socket.on(SOCKET_EVENTS.BOOKING_OFFER, (offer) => {
      setIncomingOffer(offer);
      // Synchronize countdown with server expiration timestamp
      const remainingSecs = offer?.expiresAt
        ? Math.max(0, Math.floor((new Date(offer.expiresAt).getTime() - Date.now()) / 1000))
        : 15;
      setCountdown(remainingSecs);
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
      Alert.alert('Status Error', err.message || 'Failed to update duty availability.');
      // Revert switch to match current state
      setIsOnline(!value);
    }
  };

  const handleAcceptOffer = async () => {
    if (respondingOffer || !incomingOffer) return;
    setRespondingOffer(true);
    try {
      const res = await mechanicApi(`/dispatch/offers/${incomingOffer.offerId}/accept`, {
        method: 'POST',
      });
      const acceptedBooking = res.data;
      setIncomingOffer(null);
      router.push({ pathname: '/jobs/[id]', params: { id: acceptedBooking._id } });
    } catch (err: any) {
      Alert.alert('Offer Missed', err.message || 'Offer already claimed or expired.');
      setIncomingOffer(null);
    } finally {
      setRespondingOffer(false);
    }
  };

  const handleRejectOffer = async () => {
    if (respondingOffer || !incomingOffer) return;
    setRespondingOffer(true);
    try {
      await mechanicApi(`/dispatch/offers/${incomingOffer.offerId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Mechanic declined offer' }),
      });
      setIncomingOffer(null);
    } catch (err: any) {
      setIncomingOffer(null);
    } finally {
      setRespondingOffer(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Syncing Partner Console Telemetry...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {loadError && (
        <View style={styles.errorBox}>
          <AlertIcon size={16} color="#DC2626" />
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity onPress={loadData} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Online Toggle Header */}
      <View style={styles.statusCard}>
        <View>
          <Text style={styles.statusTitle}>Duty Status</Text>
          <Text style={[styles.statusSubtitle, { color: isOnline ? THEME.colors.success : THEME.colors.textMuted }]}>
            {isOnline ? 'ONLINE • Receiving Requests' : 'OFFLINE • Shift Paused'}
          </Text>
        </View>
        <Switch
          value={isOnline}
          onValueChange={handleToggleOnline}
          thumbColor={isOnline ? THEME.colors.primary : '#64748B'}
          trackColor={{ false: '#334155', true: THEME.colors.primaryDark }}
        />
      </View>

      {/* Verification Badge */}
      <View style={styles.badgeCard}>
        <View style={styles.badgeHeader}>
          <ShieldIcon
            size={18}
            color={profile?.verificationStatus === 'VERIFIED' ? THEME.colors.success : '#FCD34D'}
          />
          <Text style={styles.badgeTitle}>
            {profile?.verificationStatus === 'VERIFIED'
              ? 'Verified Partner Profile'
              : `Verification: ${profile?.verificationStatus || 'PENDING'}`}
          </Text>
        </View>
        <Text style={styles.badgeSubtitle}>
          Skills: {profile?.skills && profile.skills.length > 0 ? profile.skills.join(', ') : 'General Assistance'}
        </Text>
        <Text style={[styles.badgeSubtitle, { marginTop: 2 }]}>
          Vehicles Serviced: {profile?.supportedVehicles && profile.supportedVehicles.length > 0 ? profile.supportedVehicles.join(', ') : 'BIKE, CAR'}
        </Text>
      </View>

      {/* Today's Metrics */}
      <View style={styles.metricsRow}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Today's Jobs</Text>
          <Text style={styles.metricValue}>{earnings?.todayJobs ?? 0}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Net Earnings (85%)</Text>
          <Text style={[styles.metricValue, { color: THEME.colors.success }]}>
            ₹{earnings?.todayNetEarnings ?? 0}
          </Text>
        </View>
      </View>

      {/* Active Job Card */}
      {activeJob && (
        <TouchableOpacity
          style={styles.activeJobCard}
          onPress={() => router.push({ pathname: '/jobs/[id]', params: { id: activeJob._id } })}
          activeOpacity={0.85}
        >
          <View style={styles.activeTopRow}>
            <Text style={styles.activeJobBadge}>Current Active Breakdown</Text>
            <Text style={styles.activeJobStatus}>Stage: {activeJob.status} &rarr;</Text>
          </View>
          <Text style={styles.activeJobTitle}>{activeJob.service?.name}</Text>
          <Text style={styles.activeJobDetails}>
            Customer: {activeJob.customer?.name} ({activeJob.customer?.phone})
          </Text>
        </TouchableOpacity>
      )}

      {/* Quick Status Info */}
      <View style={styles.infoBox}>
        <WrenchIcon size={16} color={THEME.colors.primary} />
        <Text style={styles.infoText}>
          Keep your mobile GPS enabled. 15-second timed offers are routed automatically by proximity.
        </Text>
      </View>

      {/* MODAL: 15-SECOND OFFER WINDOW */}
      <Modal visible={!!incomingOffer} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Timer Banner */}
            <View style={styles.timerBox}>
              <ClockIcon size={24} color="#FEF3C7" />
              <Text style={styles.timerText}>{countdown}s</Text>
              <Text style={styles.timerSub}>Offer Window Expiring</Text>
            </View>

            <Text style={styles.offerTitle}>{incomingOffer?.serviceName || 'Emergency Assistance'}</Text>
            <Text style={styles.offerVehicle}>Vehicle: {incomingOffer?.vehicleType || 'Vehicle'}</Text>
            <Text style={styles.offerDistance}>
              Distance: ~{incomingOffer?.distanceKm || '1.5'} km (ETA: {incomingOffer?.estimatedEtaMinutes || 10} mins)
            </Text>
            <Text style={styles.offerLocation}>
              Location: {incomingOffer?.customerAddress || 'Customer Breakdown Location'}
            </Text>

            <View style={styles.earningsBox}>
              <Text style={styles.earningLabel}>Estimated Net Payout (85%)</Text>
              <Text style={styles.earningValue}>
                ₹{Math.round((incomingOffer?.quotedPrice || 249) * 0.85)}
              </Text>
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={[styles.rejectBtn, respondingOffer && { opacity: 0.5 }]}
                disabled={respondingOffer}
                onPress={handleRejectOffer}
              >
                <Text style={styles.rejectBtnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.acceptBtn, respondingOffer && { opacity: 0.5 }]}
                disabled={respondingOffer}
                onPress={handleAcceptOffer}
              >
                {respondingOffer ? (
                  <ActivityIndicator size="small" color={THEME.colors.secondary} />
                ) : (
                  <Text style={styles.acceptBtnText}>Accept Job</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: THEME.colors.textMuted, fontSize: 13, fontWeight: '600' },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F87171',
  },
  errorText: { color: '#991B1B', fontSize: 12, flex: 1, fontWeight: '600' },
  retryBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#EF4444', borderRadius: 6 },
  retryBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  content: { padding: 16 },
  statusCard: { backgroundColor: THEME.colors.surface, padding: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: THEME.colors.border },
  statusTitle: { fontSize: 16, fontWeight: '900', color: THEME.colors.textMain },
  statusSubtitle: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  badgeCard: { backgroundColor: THEME.colors.surfaceSubtle, padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: THEME.colors.border },
  badgeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeTitle: { fontSize: 13, fontWeight: '800', color: '#FCD34D' },
  badgeSubtitle: { fontSize: 11, color: THEME.colors.textMuted, marginTop: 4 },
  metricsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  metricBox: { flex: 1, backgroundColor: THEME.colors.surface, padding: 18, borderRadius: 18, borderWidth: 1, borderColor: THEME.colors.border },
  metricLabel: { fontSize: 11, fontWeight: '700', color: THEME.colors.textMuted, textTransform: 'uppercase' },
  metricValue: { fontSize: 24, fontWeight: '900', color: THEME.colors.textMain, marginTop: 4 },
  activeJobCard: { backgroundColor: THEME.colors.primary, padding: 20, borderRadius: 20, marginBottom: 16 },
  activeTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeJobBadge: { fontSize: 11, fontWeight: '900', color: THEME.colors.secondary, textTransform: 'uppercase' },
  activeJobTitle: { fontSize: 18, fontWeight: '900', color: THEME.colors.secondary, marginTop: 4 },
  activeJobDetails: { fontSize: 13, color: '#451A03', marginTop: 4 },
  activeJobStatus: { fontSize: 12, fontWeight: '900', color: THEME.colors.secondary },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: THEME.colors.surface, borderRadius: 14, borderWidth: 1, borderColor: THEME.colors.border },
  infoText: { fontSize: 11, color: THEME.colors.textMuted, flex: 1, lineHeight: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: THEME.colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, borderWidth: 1, borderColor: THEME.colors.border },
  timerBox: { backgroundColor: THEME.colors.primaryDark, padding: 14, borderRadius: 18, alignItems: 'center', marginBottom: 16 },
  timerText: { fontSize: 32, fontWeight: '900', color: '#FEF3C7', marginTop: 2 },
  timerSub: { fontSize: 11, color: '#FDE68A', fontWeight: '700' },
  offerTitle: { fontSize: 20, fontWeight: '900', color: THEME.colors.textMain },
  offerVehicle: { fontSize: 13, color: '#FCD34D', fontWeight: '700', marginTop: 2 },
  offerDistance: { fontSize: 13, color: THEME.colors.textMuted, marginTop: 6 },
  offerLocation: { fontSize: 12, color: '#CBD5E1', marginTop: 2 },
  earningsBox: { backgroundColor: THEME.colors.surfaceSubtle, padding: 16, borderRadius: 16, marginVertical: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: THEME.colors.border },
  earningLabel: { fontSize: 12, color: THEME.colors.textMuted, fontWeight: '700' },
  earningValue: { fontSize: 22, fontWeight: '900', color: THEME.colors.success },
  modalActionRow: { flexDirection: 'row', gap: 12 },
  rejectBtn: { flex: 1, padding: 16, borderRadius: 14, backgroundColor: '#334155', alignItems: 'center' },
  rejectBtnText: { color: THEME.colors.textMuted, fontWeight: '800' },
  acceptBtn: { flex: 2, padding: 16, borderRadius: 14, backgroundColor: THEME.colors.primary, alignItems: 'center' },
  acceptBtnText: { color: THEME.colors.secondary, fontWeight: '900', fontSize: 15 },
});
