const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const MAX_HISTORY = 200;

const rooms = new Map();

function getRoom(roomName) {
  if (!rooms.has(roomName)) {
    rooms.set(roomName, {
      users: new Map(),
      messages: []
    });
  }
  return rooms.get(roomName);
}

function sanitizeText(value) {
  return String(value || '').trim();
}

function addSystemMessage(roomName, text) {
  const room = getRoom(roomName);
  const message = {
    id: Date.now() + Math.random().toString(36).slice(2, 9),
    user: 'System',
    text,
    timestamp: new Date().toISOString(),
    system: true
  };

  room.messages.push(message);
  if (room.messages.length > MAX_HISTORY) room.messages.shift();

  io.to(roomName).emit('message', message);
}

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  socket.on('join-room', ({ name, room }) => {
    const cleanName = sanitizeText(name) || 'Guest';
    const cleanRoom = sanitizeText(room) || 'general';

    socket.join(cleanRoom);

    const roomData = getRoom(cleanRoom);
    roomData.users.set(socket.id, cleanName);

    socket.data.username = cleanName;
    socket.data.room = cleanRoom;

    socket.emit('history', roomData.messages);
    socket.emit('room-users', Array.from(roomData.users.values()));

    socket.to(cleanRoom).emit('room-users', Array.from(roomData.users.values()));
    addSystemMessage(cleanRoom, `${cleanName} joined the room.`);
    io.to(cleanRoom).emit('room-users', Array.from(roomData.users.values()));
  });

  socket.on('chat-message', (text) => {
    const roomName = socket.data.room;
    const username = socket.data.username || 'Guest';
    const cleanText = sanitizeText(text);

    if (!roomName || !cleanText) return;

    const room = getRoom(roomName);
    const message = {
      id: Date.now() + Math.random().toString(36).slice(2, 9),
      user: username,
      text: cleanText,
      timestamp: new Date().toISOString(),
      system: false
    };

    room.messages.push(message);
    if (room.messages.length > MAX_HISTORY) room.messages.shift();

    io.to(roomName).emit('message', message);
  });

  socket.on('disconnect', () => {
    const roomName = socket.data.room;
    const username = socket.data.username || 'Guest';

    if (!roomName) return;

    const room = rooms.get(roomName);
    if (!room) return;

    room.users.delete(socket.id);
    if (room.users.size === 0) {
      rooms.delete(roomName);
    } else {
      io.to(roomName).emit('room-users', Array.from(room.users.values()));
      addSystemMessage(roomName, `${username} left the room.`);
    }
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'ChatNova is running' });
});

server.listen(PORT, () => {
  console.log(`ChatNova running on http://localhost:${PORT}`);
});
