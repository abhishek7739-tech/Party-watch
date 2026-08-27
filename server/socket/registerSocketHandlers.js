import * as roomEvents from './roomEvents.js';
import * as playbackController from '../controllers/playback.controller.js';
import * as chatController from '../controllers/chat.controller.js';
import * as memberController from '../controllers/member.controller.js';

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('room:create', (payload, acknowledge) => roomEvents.createRoom(socket, payload, acknowledge));
    socket.on('room:join', (payload, acknowledge) => roomEvents.joinRoom(io, socket, payload, acknowledge));
    socket.on('playback:action', (payload) => playbackController.changePlayback(io, socket, payload));
    socket.on('video:set', (payload) => playbackController.changeVideo(io, socket, payload));
    socket.on('chat:send', (payload) => chatController.sendMessage(io, socket, payload));
    socket.on('member:role', (payload) => memberController.updateRole(io, socket, payload));
    socket.on('member:transfer', (payload) => memberController.transferHost(io, socket, payload));
    socket.on('member:kick', (payload) => memberController.kickMember(io, socket, payload));
    socket.on('disconnect', () => roomEvents.leaveRoom(io, socket));
  });
}

export { registerSocketHandlers };
