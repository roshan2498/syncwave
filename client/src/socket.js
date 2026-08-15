import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SOCKET_URL || undefined;

let socket;

export function getSocket() {
  if (!socket) {
    socket = io(URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}
