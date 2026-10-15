import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { mobileApi } from '../../src/api';

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
        <ActivityIndicator color="#F59E0B" />
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
            <Text style={styles.emptyTitle}>No Bookings Yet</Text>
            <Text style={styles.emptySubtitle}>Your breakdown requests will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: '/booking/[id]', params: { id: item._id } })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.serviceName}>{item.service?.name || 'Roadside Help'}</Text>
              <Text style={styles.status}>{item.status}</Text>
            </View>
            <Text style={styles.details}>
              {item.vehicle?.manufacturer} {item.vehicle?.model} • {item.pickupLocation?.address || 'Bangalore'}
            </Text>
            <Text style={styles.price}>₹{item.approvedFinalAmount || item.quotedPrice}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  status: { fontSize: 11, fontWeight: '800', color: '#B45309', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  details: { fontSize: 12, color: '#64748B', marginTop: 4 },
  price: { fontSize: 15, fontWeight: '900', color: '#0F172A', marginTop: 8 },
  emptyCard: { backgroundColor: '#FFFFFF', padding: 32, borderRadius: 20, alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  emptySubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
});
