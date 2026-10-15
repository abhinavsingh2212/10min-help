import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getCustomerToken } from './api';

export function getSocketBaseUrl(): string {
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host && host !== 'localhost') {
    return `http://${host}:5001`;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5001';
  }
  return 'http://localhost:5001';
}

let socket: Socket | null = null;

export function getMobileSocket(): Socket {
  if (!socket) {
    const url = getSocketBaseUrl();
    socket = io(url, {
      auth: { token: getCustomerToken() },
      transports: ['websocket'],
    });
  }
  return socket;
}
