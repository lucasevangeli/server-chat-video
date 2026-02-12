const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Define allowed origins for CORS
const allowedOrigins = [
  "http://localhost:5173", // Vite dev server
  "http://localhost:3001", // Server itself
  /\.ngrok\.io$/,         // ngrok tunnels
  /\.ngrok-free\.app$/,    // ngrok tunnels
];

// Add client URL(s) from environment variables if they exist
const clientUrlEnv = process.env.CLIENT_URL;
if (clientUrlEnv) {
  // Split by comma to support multiple URLs
  const clientUrls = clientUrlEnv.split(',').map(url => url.trim());
  allowedOrigins.push(...clientUrls);
  console.log(`✅ Added client URLs to CORS origins: ${clientUrls.join(', ')}`);
}

// Configure CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: allowedOrigins,
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

// Reusable matchmaking function
function findAndCreateMatch(socket, excludedId = null) {
  const currentUser = connectedUsers.get(socket.id);
  if (!currentUser) {
    socket.emit('error', { message: 'User not found' });
    return;
  }

  let partnerId = null;
  // Find a suitable partner from the waiting list
  for (const waitingUserId of waitingUsers) {
    if (waitingUserId !== socket.id && waitingUserId !== excludedId) {
      partnerId = waitingUserId;
      break;
    }
  }
  
  const partnerUser = partnerId ? connectedUsers.get(partnerId) : null;

  if (partnerUser) {
    // Match found
    waitingUsers.delete(partnerId);
    
    const roomId = generateId();
    const room = { id: roomId, users: [currentUser, partnerUser], createdAt: new Date() };
    activeRooms.set(roomId, room);
    
    const partnerSocket = io.sockets.sockets.get(partnerId);
    
    socket.join(roomId);
    partnerSocket?.join(roomId);
    
    console.log(`🎉 Match found! Room ${roomId}: ${currentUser.name} + ${partnerUser.name}`);
    
    // Notify both users with their respective partner's info
    io.to(socket.id).emit('match-found', { roomId, users: room.users, partner: partnerUser });
    io.to(partnerId).emit('match-found', { roomId, users: room.users, partner: currentUser });
  } else {
    // No match found, add user to waiting list
    waitingUsers.add(socket.id);
    socket.emit('waiting-for-match');
    console.log(`⏳ ${currentUser.name} added to waiting list`);
  }
}

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
    // Simple case: find any match
    findAndCreateMatch(socket);
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
    
    if (!room) {
      // The room is already gone. Maybe the partner skipped at the same time.
      // Just try to find a new match for this user.
      console.log(`🤷‍♀️ Room ${roomId} not found for skip-chat, finding new match for ${socket.id}`);
      findAndCreateMatch(socket);
      return;
    }

    console.log(`⏭️ User ${socket.id} skipped chat in room ${roomId}`);
    
    const partner = room.users.find(user => user.id !== socket.id);
    
    // Notify the other user that the chat was skipped
    if (partner) {
      const partnerSocket = io.sockets.sockets.get(partner.id);
      if (partnerSocket) {
        // Just notify, the client will then request a new chat
        partnerSocket.to(roomId).emit('partner-skipped');
        partnerSocket.leave(roomId);
      }
    }
    
    // The skipper leaves the room
    socket.leave(roomId);
    
    // The room is now empty of at least one user, let's clean it up
    activeRooms.delete(roomId);
    console.log(`🗑️ Room ${roomId} deleted`);
    
    // For the user who skipped, immediately try to find a new match,
    // explicitly excluding the partner they just left.
    findAndCreateMatch(socket, partner ? partner.id : null);
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
