const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3001", /\.ngrok\.io$/, /\.ngrok-free\.app$/],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3001", /\.ngrok\.io$/, /\.ngrok-free\.app$/],
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Store connected users and rooms
const connectedUsers = new Map();
const waitingUsers = new Set();
const activeRooms = new Map();

// Generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  // User joins the platform
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

  // User wants to find a random chat
  socket.on('find-random-chat', () => {
    const currentUser = connectedUsers.get(socket.id);
    if (!currentUser) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    console.log(`🔍 ${currentUser.name} is looking for a chat...`);

    // Check if there's someone waiting
    if (waitingUsers.size > 0) {
      // Get the first waiting user
      const waitingUserId = waitingUsers.values().next().value;
      const waitingUser = connectedUsers.get(waitingUserId);
      
      if (waitingUser && waitingUserId !== socket.id) {
        // Remove from waiting list
        waitingUsers.delete(waitingUserId);
        
        // Create a room
        const roomId = generateId();
        const room = {
          id: roomId,
          users: [currentUser, waitingUser],
          createdAt: new Date()
        };
        
        activeRooms.set(roomId, room);
        
        // Join both users to the room
        socket.join(roomId);
        io.sockets.sockets.get(waitingUserId)?.join(roomId);
        
        console.log(`🎉 Match found! Room ${roomId}: ${currentUser.name} + ${waitingUser.name}`);
        
        // Notify both users
        io.to(roomId).emit('match-found', {
          roomId,
          users: room.users,
          partner: socket.id === currentUser.id ? waitingUser : currentUser
        });
        
        return;
      }
    }

    // No one waiting, add to waiting list
    waitingUsers.add(socket.id);
    socket.emit('waiting-for-match');
    console.log(`⏳ ${currentUser.name} added to waiting list`);
  });

  // WebRTC signaling
  socket.on('webrtc-offer', (data) => {
    console.log(`📤 Offer from ${socket.id} to room ${data.roomId}`);
    socket.to(data.roomId).emit('webrtc-offer', {
      offer: data.offer,
      from: socket.id
    });
  });

  socket.on('webrtc-answer', (data) => {
    console.log(`📥 Answer from ${socket.id} to room ${data.roomId}`);
    socket.to(data.roomId).emit('webrtc-answer', {
      answer: data.answer,
      from: socket.id
    });
  });

  socket.on('webrtc-ice-candidate', (data) => {
    console.log(`🧊 ICE candidate from ${socket.id}`);
    socket.to(data.roomId).emit('webrtc-ice-candidate', {
      candidate: data.candidate,
      from: socket.id
    });
  });

  // Skip current chat
  socket.on('skip-chat', (data) => {
    const { roomId } = data;
    const room = activeRooms.get(roomId);
    
    if (room) {
      console.log(`⏭️ User ${socket.id} skipped chat in room ${roomId}`);
      
      // Notify the other user
      socket.to(roomId).emit('partner-skipped');
      
      // Leave the room
      socket.leave(roomId);
      
      // Remove room if empty or clean up
      const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
      if (!socketsInRoom || socketsInRoom.size === 0) {
        activeRooms.delete(roomId);
        console.log(`🗑️ Room ${roomId} deleted`);
      }
    }
    
    // Add back to waiting list
    waitingUsers.add(socket.id);
    socket.emit('waiting-for-match');
  });

  // End chat
  socket.on('end-chat', (data) => {
    const { roomId } = data;
    const room = activeRooms.get(roomId);
    
    if (room) {
      console.log(`🔚 User ${socket.id} ended chat in room ${roomId}`);
      
      // Notify the other user
      socket.to(roomId).emit('partner-ended-chat');
      
      // Leave the room
      socket.leave(roomId);
      
      // Clean up room
      const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
      if (!socketsInRoom || socketsInRoom.size <= 1) {
        activeRooms.delete(roomId);
        console.log(`🗑️ Room ${roomId} deleted`);
      }
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
    
    // Remove from waiting list
    waitingUsers.delete(socket.id);
    
    // Find and clean up any rooms this user was in
    for (const [roomId, room] of activeRooms.entries()) {
      if (room.users.some(user => user.id === socket.id)) {
        // Notify the other user
        socket.to(roomId).emit('partner-disconnected');
        
        // Clean up room
        activeRooms.delete(roomId);
        console.log(`🗑️ Room ${roomId} deleted due to disconnection`);
        break;
      }
    }
    
    // Remove from connected users
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
    server: 'WebRTC Native'
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 WebRTC Video Chat Server running on port ${PORT}`);
  console.log(`📱 Local access: http://localhost:${PORT}`);
  console.log(`🌐 Network access: http://0.0.0.0:${PORT}`);
  console.log(`🔧 API Health: http://localhost:${PORT}/api/health`);
  console.log(`\n💡 Para testar com duas câmeras:`);
  console.log(`   1. Build o frontend: npm run build`);
  console.log(`   2. Instale ngrok: npm install -g ngrok`);
  console.log(`   3. Crie túnel: ngrok http ${PORT}`);
  console.log(`   4. Use a URL do ngrok em dispositivos diferentes\n`);
  console.log(`📊 Server Stats:`);
  console.log(`   - Connected Users: ${connectedUsers.size}`);
  console.log(`   - Waiting Users: ${waitingUsers.size}`);
  console.log(`   - Active Rooms: ${activeRooms.size}`);
});