import { io, Socket } from 'socket.io-client';
import { getCustomerToken } from './api';

let socket: Socket | null = null;

export function getMobileSocket(): Socket {
  if (!socket) {
    socket = io('http://localhost:5001', {
      auth: { token: getCustomerToken() },
      transports: ['websocket'],
    });
  }
  return socket;
}
