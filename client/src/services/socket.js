import { io } from 'socket.io-client';
import { SOCKET_URL, getAccessToken, refreshSession } from './api';

let socket = null;

/** One shared, authenticated Socket.IO connection per signed-in session. */
export const getSocket = () => {
  if (socket) return socket;
  socket = io(SOCKET_URL, {
    autoConnect: true,
    transports: ['websocket', 'polling'],
    auth: (cb) => cb({ token: getAccessToken() }),
    reconnectionDelayMax: 10000,
  });
  // Access tokens are short-lived; refresh and reconnect when the server refuses one.
  socket.on('connect_error', async (err) => {
    if (err.message === 'UNAUTHORIZED') {
      try {
        await refreshSession();
        socket.connect();
      } catch {
        /* session over — AuthContext will sign out */
      }
    }
  });
  return socket;
};

export const closeSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
