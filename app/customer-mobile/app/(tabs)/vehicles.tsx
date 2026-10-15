import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { mobileApi } from '../../src/api';
import { VehicleType } from '@10min-help/shared';

export default function VehiclesTab() {
  const [vehicles, setVehicles] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await mobileApi('/vehicles');
        setVehicles(res.data || []);
      } catch (err) {
        // default
      }
    }
    load();
  }, []);

  const handleAddDemoBike = async () => {
    try {
      const res = await mobileApi('/vehicles', {
        method: 'POST',
        body: JSON.stringify({
          vehicleType: VehicleType.BIKE,
          manufacturer: 'Royal Enfield',
          model: 'Classic 350',
          registrationNumber: 'KA01AB1234',
        }),
      });
      setVehicles([res.data, ...vehicles]);
      Alert.alert('Vehicle Added', 'Royal Enfield Classic 350 added to your garage.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addButton} onPress={handleAddDemoBike}>
        <Text style={styles.addButtonText}>+ Add Saved Bike</Text>
      </TouchableOpacity>

      <FlatList
        data={vehicles}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.manufacturer} {item.model}</Text>
            <Text style={styles.type}>{item.vehicleType} • {item.registrationNumber || 'No plate'}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  addButton: { margin: 16, backgroundColor: '#F59E0B', padding: 14, borderRadius: 14, alignItems: 'center' },
  addButtonText: { fontWeight: '900', color: '#0F172A', fontSize: 14 },
  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  name: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  type: { fontSize: 12, color: '#64748B', marginTop: 2 },
});
