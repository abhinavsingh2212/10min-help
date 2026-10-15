import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function getApiBase(): string {
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host && host !== 'localhost') {
    return `http://${host}:5001/api/v1`;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5001/api/v1';
  }
  return 'http://localhost:5001/api/v1';
}

let cachedToken: string | null = null;

export function setMechanicToken(token: string) {
  cachedToken = token;
}

export function getMechanicToken(): string | null {
  return cachedToken;
}

export async function mechanicApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data: T; message?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (cachedToken) {
    headers['Authorization'] = `Bearer ${cachedToken}`;
  }

  const base = getApiBase();
  const res = await fetch(`${base}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || json.message || 'Mechanic request failed');
  }

  return json;
}
