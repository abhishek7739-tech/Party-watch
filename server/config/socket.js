import { Server } from 'socket.io';
import { CLIENT_ORIGINS } from './env.js';

function createSocketServer(server) {
  return new Server(server, { cors: { origin: CLIENT_ORIGINS, methods: ['GET', 'POST'] }, transports: ['websocket', 'polling'] });
}

export { createSocketServer };
