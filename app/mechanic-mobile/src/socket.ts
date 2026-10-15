import { io, Socket } from 'socket.io-client';
import { getMechanicToken } from './api';

let socket: Socket | null = null;

export function getMechanicSocket(): Socket {
  if (!socket) {
    socket = io('http://localhost:5001', {
      auth: { token: getMechanicToken() },
      transports: ['websocket'],
    });
  }
  return socket;
}
