import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0F172A' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '900' },
          contentStyle: { backgroundColor: '#0A0F1D' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ title: 'Partner Sign In', presentation: 'modal' }} />
        <Stack.Screen name="jobs/[id]" options={{ title: 'Active Assistance', presentation: 'card' }} />
      </Stack>
    </>
  );
}
