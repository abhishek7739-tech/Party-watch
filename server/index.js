import http from 'node:http';
import { createApp } from './app.js';
import { createSocketServer } from './config/socket.js';
import { PORT } from './config/env.js';
import { registerSocketHandlers } from './socket/registerSocketHandlers.js';

const app = createApp();
const server = http.createServer(app);
const io = createSocketServer(server);

registerSocketHandlers(io);

server.listen(PORT, () => console.log(`Watch party server listening on :${PORT}`));
