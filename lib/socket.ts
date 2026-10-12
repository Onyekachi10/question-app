import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

const SOCKET_SERVER_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001';

export const getSocket = (): Socket => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_SERVER_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }

  if (socketInstance && !socketInstance.connected) {
    socketInstance.connect();
  }

  return socketInstance;
};

export const joinSessionRoom = (sessionId?: string, slug?: string) => {
  const socket = getSocket();
  socket.emit('join_session', { sessionId, slug });
};

export const leaveSessionRoom = (sessionId?: string, slug?: string) => {
  const socket = getSocket();
  socket.emit('leave_session', { sessionId, slug });
};
