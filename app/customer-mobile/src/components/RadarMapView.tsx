import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { THEME } from '../theme';

interface RadarMapProps {
  statusText?: string;
  isSearching?: boolean;
  assignedTech?: {
    name: string;
    etaMinutes: number;
    distanceKm?: number;
  };
}

export function RadarMapView({
  statusText = 'Active Radar: Indiranagar & Koramangala Zone',
  isSearching = false,
  assignedTech,
}: RadarMapProps) {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 2400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim]);

  const ring1Scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.4],
  });

  const ring1Opacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 0.3, 0],
  });

  return (
    <View style={styles.container}>
      {/* Map Header Status */}
      <View style={styles.topStatusRow}>
        <View style={styles.dotRow}>
          <View style={styles.activeDot} />
          <Text style={styles.topStatusText}>{statusText}</Text>
        </View>
        <Text style={styles.zoneTag}>10 KM Pilot</Text>
      </View>

      {/* Radar Canvas */}
      <View style={styles.radarArea}>
        {/* Animated concentric rings */}
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: ring1Scale }],
              opacity: ring1Opacity,
            },
          ]}
        />
        <View style={styles.baseRingOuter} />
        <View style={styles.baseRingInner} />

        {/* Center: Customer GPS Pin */}
        <View style={styles.customerPinContainer}>
          <View style={styles.customerPinBadge}>
            <Text style={styles.customerPinText}>You</Text>
          </View>
          <View style={styles.pinCenterDot} />
        </View>

        {/* Mechanic Blip 1: Suresh */}
        <View style={[styles.techBlip, { top: '22%', right: '28%' }]}>
          <View style={styles.techDot} />
          <View style={styles.techPill}>
            <Text style={styles.techPillText}>Suresh • ~6m</Text>
          </View>
        </View>

        {/* Mechanic Blip 2: Ramesh */}
        <View style={[styles.techBlip, { bottom: '26%', left: '22%' }]}>
          <View style={styles.techDot} />
          <View style={styles.techPill}>
            <Text style={styles.techPillText}>Ramesh • ~9m</Text>
          </View>
        </View>

        {/* Dynamic Assigned Tech Banner overlay */}
        {assignedTech && (
          <View style={styles.assignedOverlay}>
            <Text style={styles.assignedName}>Mechanic En Route: {assignedTech.name}</Text>
            <Text style={styles.assignedEta}>ETA: ~{assignedTech.etaMinutes} mins</Text>
          </View>
        )}
      </View>

      {/* Bottom Coordinates Strip */}
      <View style={styles.bottomCoordinates}>
        <Text style={styles.coordsText}>GPS: 12.9784° N, 77.6408° E (Indiranagar 100ft Rd)</Text>
        <Text style={styles.accuracyText}>High-Precision Telemetry</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  topStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
  },
  topStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  zoneTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
    backgroundColor: '#332200',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  radarArea: {
    height: 200,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B1120',
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  baseRingOuter: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    borderColor: '#1E293B',
    borderStyle: 'dashed',
  },
  baseRingInner: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: '#334155',
  },
  customerPinContainer: {
    alignItems: 'center',
    zIndex: 10,
  },
  customerPinBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
  customerPinText: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 10,
  },
  pinCenterDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#F59E0B',
  },
  techBlip: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 5,
  },
  techDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34D399',
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  techPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#334155',
  },
  techPillText: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '800',
  },
  assignedOverlay: {
    position: 'absolute',
    bottom: 12,
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F59E0B',
    alignItems: 'center',
  },
  assignedName: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  assignedEta: {
    color: '#34D399',
    fontWeight: '800',
    fontSize: 11,
    marginTop: 1,
  },
  bottomCoordinates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  coordsText: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  accuracyText: {
    fontSize: 10,
    color: '#34D399',
    fontWeight: '700',
  },
});
