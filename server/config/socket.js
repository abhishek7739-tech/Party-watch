import { Server } from 'socket.io';
import { CLIENT_ORIGINS } from './env.js';
import { verifyToken } from '../middleware/auth.middleware.js';

function createSocketServer(server) {
  const io = new Server(server, { cors: { origin: CLIENT_ORIGINS, methods: ['GET', 'POST'] }, transports: ['websocket', 'polling'] });
  io.use((socket, next) => {
    try { socket.data.user = verifyToken(socket.handshake.auth?.token); next(); }
    catch { next(new Error('Authentication required')); }
  });
  return io;
}

export { createSocketServer };