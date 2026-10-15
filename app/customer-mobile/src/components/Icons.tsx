import React from 'react';
import { View, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface IconProps {
  size?: number;
  color?: string;
}

export function WrenchIcon({ size = 20, color = '#0F172A' }: IconProps) {
  return <Ionicons name="construct" size={size} color={color} />;
}

export function BikeIcon({ size = 20, color = '#0F172A' }: IconProps) {
  return <MaterialCommunityIcons name="motorbike" size={size} color={color} />;
}

export function CarIcon({ size = 20, color = '#0F172A' }: IconProps) {
  return <Ionicons name="car" size={size} color={color} />;
}

export function ClockIcon({ size = 20, color = '#0F172A' }: IconProps) {
  return <Ionicons name="time" size={size} color={color} />;
}

export function MapPinIcon({ size = 20, color = '#F59E0B' }: IconProps) {
  return <Ionicons name="location" size={size} color={color} />;
}

export function ShieldIcon({ size = 20, color = '#10B981' }: IconProps) {
  return <Ionicons name="shield-checkmark" size={size} color={color} />;
}

export function PhoneIcon({ size = 20, color = '#0F172A' }: IconProps) {
  return <Ionicons name="call" size={size} color={color} />;
}

export function StarIcon({ size = 20, color = '#F59E0B' }: IconProps) {
  return <Ionicons name="star" size={size} color={color} />;
}

export function CheckIcon({ size = 20, color = '#10B981' }: IconProps) {
  return <Ionicons name="checkmark-circle" size={size} color={color} />;
}

export function AlertIcon({ size = 20, color = '#EF4444' }: IconProps) {
  return <Ionicons name="warning" size={size} color={color} />;
}

export function FlashIcon({ size = 20, color = '#F59E0B' }: IconProps) {
  return <Ionicons name="flash" size={size} color={color} />;
}

export function NavigateIcon({ size = 20, color = '#3B82F6' }: IconProps) {
  return <Ionicons name="navigate" size={size} color={color} />;
}
