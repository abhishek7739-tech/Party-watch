import * as roomService from '../services/room.service.js';
import { ROLES, ROLE_VALUES, canControlPlayback } from '../constants/roles.js';
import { emitRoomState, emitRoomError, leaveRoom } from '../socket/roomEvents.js';

function updateRole(io, socket, payload) {
  const room = roomService.roomForSocket(socket); 
  const member = roomService.memberForSocket(socket, room);
  const target = room?.members.get(payload?.id);
  if (!room || member?.role !== ROLES.HOST || !target || !ROLE_VALUES.has(payload?.role) || payload.role === ROLES.HOST) return emitRoomError(socket, 'Only the host can update roles.');
  target.ro1le = payload.role; emitRoomState(io, room);
}
function transferHost(io, socket, payload) {
  const room = roomService.roomForSocket(socket); 
  const member = roomService.memberForSocket(socket, room); 
  const target = room?.members.get(payload?.id);
  if (!room || member?.role !== ROLES.HOST || !target || target.id === socket.id) return emitRoomError(socket, 'Only the host can transfer hosting.');
  member.role = ROLES.MODERATOR; target.role = ROLES.HOST; emitRoomState(io, room);
}
function kickMember(io, socket, payload) {
  const room = roomService.roomForSocket(socket); 
  const member = roomService.memberForSocket(socket, room); 
  const target = room?.members.get(payload?.id);
  if (!room || !canControlPlayback(member?.role) || !target || target.role === ROLES.HOST || target.id === socket.id) return emitRoomError(socket, 'You cannot remove this member.');
  const targetSocket = io.sockets.sockets.get(target.id);
  if (targetSocket) leaveRoom(io, targetSocket, 'You were removed from this party.');
}

export { updateRole, transferHost, kickMember };
