import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#0F172A',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#F8FAFC' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ title: 'Sign In', presentation: 'modal' }} />
        <Stack.Screen name="book" options={{ title: 'Request Assistance', presentation: 'card' }} />
        <Stack.Screen name="booking/[id]" options={{ title: 'Live Assistance Tracking', presentation: 'card' }} />
      </Stack>
    </>
  );
}
