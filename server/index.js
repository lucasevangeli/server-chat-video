const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Define allowed origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3001",
  /\.ngrok\.io$/,
  /\.ngrok-free\.app$/,
  // We will add the Render frontend URL here later
];

const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.some(regex => typeof regex === 'string' ? regex === origin : regex.test(origin))) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(regex => typeof regex === 'string' ? regex === origin : regex.test(origin))) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// Serve React app static files
// IMPORTANT: This path assumes the 'dist' folder is at the root of the project
app.use(express.static(path.join(__dirname, '../dist')));

// In-memory state
const connectedUsers = new Map();
const waitingUsers = new Set();
const activeRooms = new Map();

const generateId = () => Math.random().toString(36).substr(2, 9);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  socket.on('join-platform', (userData) => {
    const user = {
      id: socket.id,
      name: userData.name || `User_${socket.id.slice(-6)}`,
      ...userData
    };
    connectedUsers.set(socket.id, user);
    console.log(`👤 User joined platform: ${user.name} (${socket.id})`);
    socket.emit('platform-joined', { user });
  });

  socket.on('find-random-chat', () => {
    const currentUser = connectedUsers.get(socket.id);
    if (!currentUser) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    console.log(`🔍 ${currentUser.name} is looking for a chat...`);

    if (waitingUsers.size > 0) {
      const waitingUserId = waitingUsers.values().next().value;
      const waitingUser = connectedUsers.get(waitingUserId);
      
      if (waitingUser && waitingUserId !== socket.id) {
        waitingUsers.delete(waitingUserId);
        const roomId = generateId();
        const room = { id: roomId, users: [currentUser, waitingUser], createdAt: new Date() };
        activeRooms.set(roomId, room);
        
        socket.join(roomId);
        const waitingSocket = io.sockets.sockets.get(waitingUserId);
        waitingSocket?.join(roomId);
        
        console.log(`🎉 Match found! Room ${roomId}: ${currentUser.name} + ${waitingUser.name}`);
        
        // Notify both users about the match
        io.to(roomId).emit('match-found', {
          roomId,
          users: room.users,
          // Send the correct partner to each user
          partner: waitingUser
        });
        waitingSocket?.emit('match-found', {
            roomId,
            users: room.users,
            partner: currentUser
        });
        
        return;
      }
    }

    waitingUsers.add(socket.id);
    socket.emit('waiting-for-match');
    console.log(`⏳ ${currentUser.name} added to waiting list`);
  });

  socket.on('webrtc-offer', (data) => {
    socket.to(data.roomId).emit('webrtc-offer', { offer: data.offer, from: socket.id });
  });

  socket.on('webrtc-answer', (data) => {
    socket.to(data.roomId).emit('webrtc-answer', { answer: data.answer, from: socket.id });
  });

  socket.on('webrtc-ice-candidate', (data) => {
    socket.to(data.roomId).emit('webrtc-ice-candidate', { candidate: data.candidate, from: socket.id });
  });

  socket.on('skip-chat', (data) => {
    const { roomId } = data;
    const room = activeRooms.get(roomId);
    if (room) {
      console.log(`⏭️ User ${socket.id} skipped chat in room ${roomId}`);
      socket.to(roomId).emit('partner-skipped');
      socket.leave(roomId);
      
      const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
      if (!socketsInRoom || socketsInRoom.size === 0) {
        activeRooms.delete(roomId);
        console.log(`🗑️ Room ${roomId} deleted`);
      }
    }
    waitingUsers.add(socket.id);
    socket.emit('waiting-for-match');
  });

  socket.on('end-chat', (data) => {
    const { roomId } = data;
    if (activeRooms.has(roomId)) {
      console.log(`🔚 User ${socket.id} ended chat in room ${roomId}`);
      socket.to(roomId).emit('partner-ended-chat');
      socket.leave(roomId);
      activeRooms.delete(roomId);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
    waitingUsers.delete(socket.id);
    for (const [roomId, room] of activeRooms.entries()) {
      if (room.users.some(user => user.id === socket.id)) {
        socket.to(roomId).emit('partner-disconnected');
        activeRooms.delete(roomId);
        console.log(`🗑️ Room ${roomId} deleted due to disconnection`);
        break;
      }
    }
    connectedUsers.delete(socket.id);
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    connectedUsers: connectedUsers.size,
    waitingUsers: waitingUsers.size,
    activeRooms: activeRooms.size,
    server: 'WebRTC Native on Render'
  });
});

// All other routes should serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 WebRTC Video Chat Server running on port ${PORT}`);
});