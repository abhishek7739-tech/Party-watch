import * as roomService from '../services/room.service.js';
import { ROLES } from '../constants/roles.js';
import { cleanText } from '../utils/text.js';

const emitRoomState = (io, room) => io.to(room.code).emit('room:state', roomService.publicRoom(room));
const emitRoomError = (socket, message) => socket.emit('room:error', message);

function createRoom(socket, payload, acknowledge) {
  const name = cleanText(payload?.name, 28);
  if (!name) return acknowledge?.({ error: 'Please enter a display name.' });
  const room = roomService.createRoom({ title: cleanText(payload?.title, 60) || 'Movie night', videoId: payload?.videoId || '' });
  roomService.addMember(room, { id: socket.id, name, role: ROLES.HOST });
  socket.join(room.code); socket.data.roomCode = room.code;
  acknowledge?.({ room: roomService.publicRoom(room), selfId: socket.id });
}
function joinRoom(io, socket, payload, acknowledge) {
  const code = String(payload?.code || '').trim().toUpperCase(); 
  const name = cleanText(payload?.name, 28); 
  const room = roomService.findRoom(code);
  if (!room) return acknowledge?.({ error: 'That party does not exist or has ended.' });
  if (!name) return acknowledge?.({ error: 'Please enter a display name.' });
  if (roomService.isFull(room)) return acknowledge?.({ error: 'This party is full.' });
  roomService.addMember(room, { id: socket.id, name }); socket.join(code); socket.data.roomCode = code;
  emitRoomState(io, room); acknowledge?.({ room: roomService.publicRoom(room), selfId: socket.id });
}
function leaveRoom(io, socket, reason) {
  const room = roomService.roomForSocket(socket); 
  if (!room) return;
  roomService.removeMember(room, socket.id); 
  socket.leave(room.code); socket.data.roomCode = undefined;
  if (room.members.size) emitRoomState(io, room);
  if (reason) socket.emit('room:removed', reason);
}

export { createRoom, joinRoom, leaveRoom, emitRoomState, emitRoomError };
