
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// Interfaces for state management
interface User {
  id: string;
  name: string;
}

interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  isWaiting: boolean;
  currentPartner: User | null;
  roomId: string | null;
  error: string | null;
}

interface MediaState {
  cameraEnabled: boolean;
  micEnabled: boolean;
  isLoading: boolean;
}

// WebRTC configuration using public STUN servers
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

// Custom hook for the WebRTC logic
export const useWebRTC = () => {
  // Refs for stable object references across re-renders
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const currentUserRef = useRef<User | null>(null);
  const roomIdRef = useRef<string | null>(null);

  // State for UI updates
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isConnecting: false,
    isWaiting: false,
    currentPartner: null,
    roomId: null,
    error: null,
  });

  const [mediaState, setMediaState] = useState<MediaState>({
    cameraEnabled: true,
    micEnabled: true,
    isLoading: true, // Start in loading state until camera is ready
  });

  // Function to get backend URL based on environment
  const getBackendURL = () => import.meta.env.PROD ? 'https://chat-video-x41m.onrender.com' : 'http://localhost:3001';

  // Cleanup function to reset the entire connection state
  const cleanupConnection = useCallback((isSkipping = false) => {
    console.log('🧹 Cleaning up connection...');
    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    roomIdRef.current = null;
    
    // Don't reset waiting state if we are skipping to the next user
    if (!isSkipping) {
      setConnectionState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        isWaiting: false,
        currentPartner: null,
        roomId: null,
      }));
    } else {
      setConnectionState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        currentPartner: null,
        roomId: null,
      }));
    }
  }, []);

  // Function to create and configure the RTCPeerConnection
  const initializePeerConnection = useCallback(async (isInitiator: boolean) => {
    console.log('🔗 Initializing Peer Connection...');
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('webrtc-ice-candidate', {
          candidate: event.candidate,
          roomId: roomIdRef.current,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('📺 Received remote stream.');
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection State: ${pc.connectionState}`);
      switch (pc.connectionState) {
        case 'connected':
          setConnectionState(prev => ({ ...prev, isConnected: true, isConnecting: false, error: null }));
          break;
        case 'disconnected':
        case 'failed':
        case 'closed':
          cleanupConnection();
          break;
      }
    };

    localStreamRef.current?.getTracks().forEach(track => {
      if (localStreamRef.current) {
        pc.addTrack(track, localStreamRef.current);
      }
    });

    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current?.emit('webrtc-offer', { offer, roomId: roomIdRef.current });
        console.log('📤 Sent WebRTC offer.');
      } catch (error) {
        console.error("Error creating offer:", error);
        setConnectionState(prev => ({...prev, error: "Failed to create video offer."}))
      }
    }
  }, [cleanupConnection]);

  // Initialize and set up the socket connection and its event listeners
  const setupSocket = useCallback(() => {
    if (socketRef.current?.connected) return;

    const backendURL = getBackendURL();
    console.log(`🔌 Connecting to signaling server at ${backendURL}...`);
    const socket = io(backendURL, { transports: ['websocket'], forceNew: true, reconnectionAttempts: 5 });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(`✅ Connected to server with ID: ${socket.id}`);
      currentUserRef.current = { id: socket.id, name: `User_${socket.id.slice(-4)}` };
      socket.emit('join-platform', { name: currentUserRef.current.name });
      setConnectionState(prev => ({ ...prev, error: null }));
    });

    socket.on('platform-joined', (data) => {
      console.log('🎉 Joined platform:', data.user);
    });

    socket.on('waiting-for-match', () => {
      console.log('⏳ Waiting for a match...');
      setConnectionState(prev => ({ ...prev, isWaiting: true, isConnecting: false, isConnected: false }));
    });

    socket.on('match-found', async (data: { roomId: string; partner: User }) => {
      console.log(`🎉 Match found! Room: ${data.roomId}, Partner:`, data.partner);
      cleanupConnection(true); // Clean previous connection but keep waiting state
      roomIdRef.current = data.roomId;
      setConnectionState(prev => ({
        ...prev,
        isWaiting: false,
        isConnecting: true,
        currentPartner: data.partner,
        roomId: data.roomId,
      }));

      // Determine role based on who has the "larger" ID to avoid race conditions
      const isInitiator = currentUserRef.current!.id > data.partner.id;
      console.log(`[WebRTC] Role: ${isInitiator ? 'Initiator' : 'Receiver'}`);
      await initializePeerConnection(isInitiator);
    });

    socket.on('webrtc-offer', async (data: { offer: RTCSessionDescriptionInit }) => {
      console.log('📥 Received WebRTC offer.');
      if (!peerConnectionRef.current) {
        await initializePeerConnection(false);
      }
      try {
        await peerConnectionRef.current!.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnectionRef.current!.createAnswer();
        await peerConnectionRef.current!.setLocalDescription(answer);
        socketRef.current!.emit('webrtc-answer', { answer, roomId: roomIdRef.current });
        console.log('📤 Sent WebRTC answer.');
      } catch (error) {
        console.error("Error handling offer:", error);
      }
    });

    socket.on('webrtc-answer', async (data: { answer: RTCSessionDescriptionInit }) => {
      console.log('📥 Received WebRTC answer.');
      try {
        await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(data.answer));
      } catch(error) {
        console.error("Error setting remote answer:", error);
      }
    });

    socket.on('webrtc-ice-candidate', async (data: { candidate: RTCIceCandidateInit }) => {
      try {
        if (data.candidate) {
          await peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (error) {
        console.error('Error adding received ICE candidate', error);
      }
    });

    const handlePartnerLeft = (reason: string) => {
      console.log(`👋 Partner left: ${reason}`);
      cleanupConnection();
      // Briefly show a message that the partner left
      setConnectionState(prev => ({ ...prev, error: reason }));
      setTimeout(() => setConnectionState(prev => ({...prev, error: null})), 3000);
    };

    socket.on('partner-skipped', () => handlePartnerLeft('Partner has skipped.'));
    socket.on('partner-ended-chat', () => handlePartnerLeft('Partner ended the chat.'));
    socket.on('partner-disconnected', () => handlePartnerLeft('Partner disconnected.'));
    socket.on('disconnect', () => handlePartnerLeft('Lost connection to the server.'));
    socket.on('connect_error', (err) => {
      console.error('❌ Socket Connection Error:', err);
      setConnectionState(prev => ({ ...prev, error: `Cannot connect to the server: ${err.message}. Please check if the server is running.` }));
    });
  }, [cleanupConnection, initializePeerConnection]);

  // Public actions
  const findRandomChat = useCallback(() => {
    if (!localStreamRef.current) {
      setConnectionState(prev => ({ ...prev, error: 'Camera is not available. Please grant permissions first.' }));
      return;
    }
    if (!socketRef.current?.connected) {
      setConnectionState(prev => ({ ...prev, error: 'Not connected to the server. Please wait.' }));
      return;
    }
    cleanupConnection();
    setConnectionState(prev => ({ ...prev, error: null, isWaiting: true }));
    socketRef.current?.emit('find-random-chat');
  }, [cleanupConnection]);

  const skipCurrentChat = useCallback(() => {
    if (roomIdRef.current) {
      socketRef.current?.emit('skip-chat', { roomId: roomIdRef.current });
      cleanupConnection(true); // Keep waiting state
      // The server will automatically put this user back in the waiting queue
    }
  }, [cleanupConnection]);

  const endChat = useCallback(() => {
    if (roomIdRef.current) {
      socketRef.current?.emit('end-chat', { roomId: roomIdRef.current });
    }
    cleanupConnection();
  }, [cleanupConnection]);

  const toggleCamera = useCallback(() => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setMediaState(prev => ({ ...prev, cameraEnabled: videoTrack.enabled }));
    }
  }, []);

  const toggleMicrophone = useCallback(() => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMediaState(prev => ({ ...prev, micEnabled: audioTrack.enabled }));
    }
  }, []);

  // Effect to start camera and socket on mount, and cleanup on unmount
  useEffect(() => {
    const start = async () => {
      console.log('📹 Requesting user media...');
      setMediaState(prev => ({ ...prev, isLoading: true }));
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        console.log('✅ User media acquired.');
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setMediaState(prev => ({ ...prev, isLoading: false, cameraEnabled: true, micEnabled: true }));
        setConnectionState(prev => ({ ...prev, error: null }));
        
        // Now that we have media, connect to the server
        setupSocket();

      } catch (error) {
        console.error('❌ Failed to get user media:', error);
        setConnectionState(prev => ({ ...prev, error: 'Camera/Mic access denied. Please check permissions and refresh the page.' }));
        setMediaState(prev => ({ ...prev, isLoading: false }));
      }
    }

    start();
    
    return () => {
      console.log('Unmounting component, cleaning up all resources.');
      cleanupConnection();
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      socketRef.current?.disconnect();
    };
  }, [setupSocket, cleanupConnection]);

  return {
    localVideoRef,
    remoteVideoRef,
    connectionState,
    mediaState,
    findRandomChat,
    skipCurrentChat,
    endChat,
    toggleCamera,
    toggleMicrophone,
  };
};
