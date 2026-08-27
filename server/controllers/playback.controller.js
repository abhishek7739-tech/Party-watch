import * as roomService from '../services/room.service.js';
import { canControlPlayback } from '../constants/roles.js';
import { emitRoomError } from '../socket/roomEvents.js';

function changePlayback(io, socket, payload) {
  const room = roomService.roomForSocket(socket); 
  const member = roomService.memberForSocket(socket, room);
  if (!room || !canControlPlayback(member?.role)) return emitRoomError(socket, 'Only hosts and moderators can control playback.');
  if (!['play', 'pause', 'seek'].includes(payload?.action)) return;
  io.to(room.code).emit('playback:update', { ...roomService.updatePlayback(room, payload), action: payload.action, by: member.name });
}
function changeVideo(io, socket, payload) {
  const room = roomService.roomForSocket(socket); 
  const member = roomService.memberForSocket(socket, room); 
  const videoId = String(payload?.videoId || '');
  if (!room || !canControlPlayback(member?.role)) return emitRoomError(socket, 'Only hosts and moderators can change the video.');
  if (!/^[\w-]{11}$/.test(videoId)) return emitRoomError(socket, 'Please provide a valid YouTube video URL or ID.');
  io.to(room.code).emit('playback:update', { ...roomService.setVideo(room, videoId), action: 'video', by: member.name });
}

export { changePlayback, changeVideo };
