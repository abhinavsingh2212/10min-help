import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { mechanicApi } from '../../src/api';

export default function EarningsTab() {
  const [earnings, setEarnings] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await mechanicApi('/technicians/earnings');
        setEarnings(res.data);
      } catch (err) {
        // default
      }
    }
    load();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroBox}>
        <Text style={styles.heroLabel}>Total Net Payouts</Text>
        <Text style={styles.heroAmount}>₹{earnings?.netEarnings || 0}</Text>
        <Text style={styles.heroSub}>
          {earnings?.totalJobs || 0} completed breakdown services
        </Text>
      </View>

      <View style={styles.breakdownCard}>
        <Text style={styles.cardHeading}>Commission Breakdown</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Gross Job Billing</Text>
          <Text style={styles.rowVal}>₹{earnings?.grossEarnings || 0}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Platform Commission (15%)</Text>
          <Text style={[styles.rowVal, { color: '#F87171' }]}>
            - ₹{earnings?.platformCommission || 0}
          </Text>
        </View>
        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalLabel}>Take-Home Net Payout (85%)</Text>
          <Text style={styles.totalVal}>₹{earnings?.netEarnings || 0}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1D' },
  content: { padding: 16 },
  heroBox: { backgroundColor: '#1E293B', padding: 24, borderRadius: 24, alignItems: 'center', marginBottom: 16 },
  heroLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' },
  heroAmount: { fontSize: 36, fontWeight: '900', color: '#34D399', marginVertical: 4 },
  heroSub: { fontSize: 12, color: '#CBD5E1' },
  breakdownCard: { backgroundColor: '#1E293B', padding: 20, borderRadius: 20 },
  cardHeading: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', marginBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  rowLabel: { fontSize: 13, color: '#94A3B8' },
  rowVal: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#334155', marginTop: 8, paddingTop: 12 },
  totalLabel: { fontSize: 14, fontWeight: '900', color: '#FFFFFF' },
  totalVal: { fontSize: 16, fontWeight: '900', color: '#34D399' },
});
