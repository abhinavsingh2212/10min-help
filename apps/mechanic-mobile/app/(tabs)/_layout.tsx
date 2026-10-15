import React from 'react';
import { Tabs } from 'expo-router';

export default function MechanicTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#0F172A' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '900' },
        tabBarStyle: { backgroundColor: '#0F172A', borderTopColor: '#1E293B' },
        tabBarActiveTintColor: '#F59E0B',
        tabBarInactiveTintColor: '#64748B',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Shift Console',
          tabBarLabel: 'Dashboard',
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Partner Earnings',
          tabBarLabel: 'Earnings',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Mechanic Profile',
          tabBarLabel: 'Profile',
        }}
      />
    </Tabs>
  );
}
