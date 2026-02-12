import React, { useEffect } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Users, AlertCircle, Loader2, Wifi, WifiOff, Globe } from 'lucide-react';

export const VideoChat: React.FC = () => {
  const {
    connectionState,
    mediaState,
    localVideoRef,
    remoteVideoRef,
    findRandomChat,
    skipCurrentChat,
    toggleCamera,
    toggleMicrophone,
    endChat
  } = useWebRTC();

  const { isConnected, isConnecting, isWaiting, currentPartner, error } = connectionState;
  const { cameraEnabled, micEnabled, isLoading } = mediaState;

  const handleStartChat = () => {
    findRandomChat();
  };

  const handleEndChat = () => {
    endChat();
  };

  const handleSkipChat = () => {
    skipCurrentChat();
  };

  // Test backend connection on component mount
  useEffect(() => {
    const testBackendConnection = async () => {
      try {
        const backendURL = import.meta.env.VITE_BACKEND_URL;
        const response = await fetch(`${backendURL}/api/health`);
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Backend connection successful:', data);
        } else {
          console.warn('⚠️ Backend health check failed:', response.status);
        }
      } catch (error) {
        console.warn('⚠️ Backend connection test failed:', error);
      }
    };

    testBackendConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Omegga Chat</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            {isConnected && (
              <div className="flex items-center space-x-2 text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Conectado</span>
              </div>
            )}
            
            {isWaiting && (
              <div className="flex items-center space-x-2 text-yellow-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">Procurando...</span>
              </div>
            )}
            
            {/* User Count */}
            <div className="flex items-center space-x-1 text-gray-300">
              <Users className="w-4 h-4" />
              <span className="text-sm">{isConnected ? 2 : 1}</span>
            </div>

            {/* Network Status */}
            <div className="flex items-center space-x-1 text-gray-300">
              {navigator.onLine ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-400" />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {error && (
          <div className="mb-6 max-w-4xl w-full">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-red-400 font-medium mb-2">Connection Error</h3>
                <div className="text-red-300 text-sm leading-relaxed mb-3">
                  {error}
                </div>
                
              </div>
            </div>
          </div>
        )}

        <div className="relative w-full max-w-5xl mx-auto aspect-[9/16] lg:grid lg:grid-cols-2 lg:gap-6 lg:max-w-6xl lg:aspect-auto">
          {/* Remote Video Container */}
          <div className="absolute inset-0 z-0 lg:relative">
            <div className="w-full h-full bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-white/10">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover transform -scale-x-100"
              />
              {!remoteVideoRef.current?.srcObject && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="text-center">
                    {isLoading || isConnecting || isWaiting ? (
                      <>
                        <Loader2 className="w-12 h-12 text-purple-400 mx-auto mb-2 animate-spin" />
                        <p className="text-gray-400">
                          {isWaiting ? 'Procurando alguém para conversar...' : 'Conectando...'}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">Isso pode levar alguns momentos</p>
                      </>
                    ) : (
                      <>
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-400">Aguardando conexão</p>
                        <p className="text-gray-500 text-xs mt-1">Compartilhe esta URL para testar</p>
                      </>
                    )}
                  </div>
                </div>
              )}
              {/* Remote video overlay */}
              {currentPartner && (
                <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1">
                  <span className="text-white text-sm font-medium">{currentPartner.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Local Video Container */}
          <div className="absolute top-4 right-4 w-1/3 max-w-[150px] z-10 lg:relative lg:top-auto lg:right-auto lg:w-full lg:max-w-none">
            <div className="aspect-[9/16] lg:aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-2xl border-2 border-indigo-500/50">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover transform -scale-x-100"
              />
              {!localVideoRef.current?.srcObject && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="text-center">
                    <Video className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400">Sua câmera aparecerá aqui</p>
                    <p className="text-gray-500 text-xs mt-1">Permita acesso à câmera quando solicitado</p>
                  </div>
                </div>
              )}
              {/* Local video overlay */}
              <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1">
                <span className="text-white text-sm font-medium">Você</span>
              </div>
              {/* Camera status indicator */}
              <div className="absolute top-4 right-4">
                <div className={`p-2 rounded-full ${cameraEnabled ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  {cameraEnabled ? (
                    <Video className="w-4 h-4 text-green-400" />
                  ) : (
                    <VideoOff className="w-4 h-4 text-red-400" />
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="absolute z-20 bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center space-x-3 lg:relative lg:col-span-2 lg:bottom-auto lg:left-auto lg:translate-x-0 lg:mt-8">
            {!isConnected && !isConnecting && !isWaiting ? (
              <button
                onClick={handleStartChat}
                disabled={isLoading || !!error}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white px-8 py-3 rounded-full font-medium transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
              >
                <Video className="w-5 h-5" />
                <span>Iniciar Chat Aleatório</span>
              </button>
            ) : (isConnecting || isWaiting) ? (
              <button
                disabled
                className="bg-gradient-to-r from-gray-600 to-gray-600 text-white px-8 py-3 rounded-full font-medium transition-all duration-200 flex items-center space-x-2 shadow-lg cursor-not-allowed"
              >
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{isWaiting ? 'Procurando...' : 'Conectando...'}</span>
              </button>
            ) : (
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleCamera}
                  className={`p-3 rounded-full transition-all duration-200 ${
                    cameraEnabled
                      ? 'bg-gray-700/80 hover:bg-gray-600/80 text-white'
                      : 'bg-red-600/80 hover:bg-red-700/80 text-white'
                  }`}
                  title={cameraEnabled ? 'Desligar câmera' : 'Ligar câmera'}
                >
                  {cameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
                
                <button
                  onClick={toggleMicrophone}
                  className={`p-3 rounded-full transition-all duration-200 ${
                    micEnabled
                      ? 'bg-gray-700/80 hover:bg-gray-600/80 text-white'
                      : 'bg-red-600/80 hover:bg-red-700/80 text-white'
                  }`}
                  title={micEnabled ? 'Silenciar microfone' : 'Ativar microfone'}
                >
                  {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>

                <button
                  onClick={handleSkipChat}
                  className="bg-yellow-600/80 hover:bg-yellow-700/80 text-white px-4 py-2 rounded-full transition-all duration-200 text-sm font-medium"
                  title="Pular para próxima pessoa"
                >
                  Pular
                </button>
                
                <button
                  onClick={handleEndChat}
                  className="bg-red-600/80 hover:bg-red-700/80 text-white p-3 rounded-full transition-all duration-200"
                  title="Encerrar chat"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        {!isConnected && !isConnecting && !isWaiting && !error && (
          <div className="mt-8 max-w-2xl text-center">
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              Clique em "Iniciar Chat Aleatório" para se conectar com alguém novo. Permita acesso à câmera e microfone quando solicitado.
            </p>
            
          </div>
        )}

      </main>
    </div>
  );
};