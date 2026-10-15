import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { mobileApi } from '../../src/api';
import { ClockIcon, MapPinIcon, ShieldIcon } from '../../src/components/Icons';
import { THEME } from '../../src/theme';

export default function BookingsTab() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await mobileApi('/bookings');
        setBookings(res.data || []);
      } catch (err) {
        // demo fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={THEME.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <ClockIcon size={32} color={THEME.colors.textSub} />
            <Text style={styles.emptyTitle}>No Roadside Requests Yet</Text>
            <Text style={styles.emptySubtitle}>Your breakdown assistance history will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: '/booking/[id]', params: { id: item._id } })}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.serviceName}>{item.service?.name || 'Roadside Assistance'}</Text>
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            <View style={styles.locRow}>
              <MapPinIcon size={12} color={THEME.colors.primary} />
              <Text style={styles.details} numberOfLines={1}>
                {item.pickupLocation?.address || 'Indiranagar, Bengaluru'}
              </Text>
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.vehicleText}>
                {item.vehicle?.manufacturer || 'Hero'} {item.vehicle?.model || 'Splendor'}
              </Text>
              <Text style={styles.price}>₹{item.approvedFinalAmount || item.quotedPrice}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: THEME.radius.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    ...THEME.shadow.card,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceName: { fontSize: 16, fontWeight: '800', color: THEME.colors.textMain },
  statusPill: { backgroundColor: THEME.colors.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '900', color: THEME.colors.primaryDark, textTransform: 'uppercase' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  details: { fontSize: 12, color: THEME.colors.textMuted, flex: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  vehicleText: { fontSize: 12, color: THEME.colors.textSub, fontWeight: '600' },
  price: { fontSize: 16, fontWeight: '900', color: THEME.colors.textMain },
  emptyCard: { backgroundColor: '#FFFFFF', padding: 40, borderRadius: THEME.radius.xl, alignItems: 'center', marginTop: 40, borderWidth: 1, borderColor: THEME.colors.borderLight },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: THEME.colors.textMain, marginTop: 12 },
  emptySubtitle: { fontSize: 12, color: THEME.colors.textMuted, marginTop: 4, textAlign: 'center' },
});
