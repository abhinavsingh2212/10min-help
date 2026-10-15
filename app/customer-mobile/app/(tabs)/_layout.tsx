import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#0F172A',
        headerTitleStyle: { fontWeight: '900' },
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#F1F5F9' },
        tabBarActiveTintColor: '#D97706',
        tabBarInactiveTintColor: '#94A3B8',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '10Min Help',
          tabBarLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'My Bookings',
          tabBarLabel: 'Bookings',
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: 'My Vehicles',
          tabBarLabel: 'Vehicles',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile & Safety',
          tabBarLabel: 'Profile',
        }}
      />
    </Tabs>
  );
}
