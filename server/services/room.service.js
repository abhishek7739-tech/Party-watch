import crypto from 'node:crypto';
import { ROLES } from '../constants/roles.js';

// Temporary in-memory storage. Replace this map with Redis/database calls when scaling.
const rooms = new Map();
const ROOM_CAPACITY = 10;
const CHAT_HISTORY_LIMIT = 100;

/** Create a short, human-friendly code that is not already in use. */
function createRoomCode() {
  let code;

  do {
    code = crypto.randomBytes(4).toString('base64url').slice(0, 6).toUpperCase();
  } while (rooms.has(code));

  return code;
}

/** Create and store a new watch-party room. */
function createRoom({ title, videoId = '' }) {
  const room = {
    code: createRoomCode(),
    title,
    videoId,
    isPlaying: false,
    currentTime: 0,
    updatedAt: Date.now(),
    members: new Map(),
    chat: [],
  };

  rooms.set(room.code, room);
  return room;
}

function findRoom(code) {
  return rooms.get(code);
}

function roomForSocket(socket) {
  return rooms.get(socket.data.roomCode);
}

function memberForSocket(socket, room) {
  return room?.members.get(socket.id);
}

function addMember(room, { id, name, role = ROLES.PARTICIPANT }) {
  room.members.set(id, { id, name, role });
}

function isFull(room) {
  return room.members.size >= ROOM_CAPACITY;
}

/** Return the playback state at this exact moment. */
function currentPlayback(room) {
  const elapsedSeconds = room.isPlaying ? (Date.now() - room.updatedAt) / 1000 : 0;

  return {
    videoId: room.videoId,
    isPlaying: room.isPlaying,
    currentTime: room.currentTime + elapsedSeconds,
    updatedAt: Date.now(),
  };
}

/** Convert internal room state into data safe to send to clients. */
function publicRoom(room) {
  return {
    code: room.code,
    title: room.title,
    playback: currentPlayback(room),
    members: [...room.members.values()],
    chat: room.chat,
  };
}

/** Apply a host/moderator play, pause, or seek action. */
function updatePlayback(room, { action, currentTime }) {
  room.currentTime = Math.max(0, Number(currentTime) || 0);

  if (action === 'play') room.isPlaying = true;
  if (action === 'pause') room.isPlaying = false;

  room.updatedAt = Date.now();
  return currentPlayback(room);
}

/** Reset playback when the room changes to a different YouTube video. */
function setVideo(room, videoId) {
  room.videoId = videoId;
  room.currentTime = 0;
  room.isPlaying = false;
  room.updatedAt = Date.now();

  return currentPlayback(room);
}

function addChatMessage(room, { name, text }) {
  const message = { id: crypto.randomUUID(), name, text, sentAt: Date.now() };

  room.chat.push(message);
  room.chat = room.chat.slice(-CHAT_HISTORY_LIMIT);

  return message;
}

/** Keep the room usable by assigning a new host when the existing host leaves. */
function removeMember(room, socketId) {
  const departingMember = room.members.get(socketId);
  room.members.delete(socketId);

  if (room.members.size === 0) {
    rooms.delete(room.code);
    return;
  }

  if (departingMember?.role !== ROLES.HOST) return;

  const replacementHost = findModerator(room) || firstMember(room);
  replacementHost.role = ROLES.HOST;
}

function findModerator(room) {
  return [...room.members.values()].find((member) => member.role === ROLES.MODERATOR);
}

function firstMember(room) {
  return room.members.values().next().value;
}

export {
  createRoom,
  findRoom,
  roomForSocket,
  memberForSocket,
  addMember,
  isFull,
  publicRoom,
  updatePlayback,
  setVideo,
  addChatMessage,
  removeMember,
};
