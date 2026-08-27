import * as roomService from '../services/room.service.js';
import { cleanText } from '../utils/text.js';

function sendMessage(io, socket, payload) {
  const room = roomService.roomForSocket(socket); 
  const member = roomService.memberForSocket(socket, room); 
  const text = cleanText(payload?.text, 400);
  if (!room || !member || !text) return;
  io.to(room.code).emit('chat:message', roomService.addChatMessage(room, { name: member.name, text }));
}

export { sendMessage };
