# WebRTC Video Chat Nativo

Um chat de vídeo em tempo real construído completamente do zero usando **WebRTC nativo**, **Socket.IO** e **React TypeScript**. Sem dependências de APIs externas!

## 🚀 Características

- 🎥 **WebRTC Nativo**: Comunicação peer-to-peer direta
- 🔄 **Matching Aleatório**: Sistema de pareamento automático
- 📱 **Design Responsivo**: Funciona em mobile e desktop
- 🎛️ **Controles de Mídia**: Câmera e microfone
- ⏭️ **Pular Chat**: Função para próximo usuário
- 🔒 **Conexão Segura**: STUN servers do Google
- 🌐 **Suporte a Túnel**: Para teste multi-dispositivo

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + Socket.IO
- **WebRTC**: API nativa do navegador
- **Túnel**: ngrok para acesso externo

## ⚡ Início Rápido

### Modo Desenvolvimento

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Inicie o servidor frontend:**
   ```bash
   npm run dev
   ```

3. **Em outro terminal, inicie o backend:**
   ```bash
   npm run server
   ```

4. **Acesse no navegador:**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

### Modo Produção

1. **Build e inicie a aplicação completa:**
   ```bash
   npm run full-stack
   ```

2. **Acesse a aplicação:**
   - http://localhost:3001

## 📱 Testando com Múltiplas Câmeras

### Opção 1: Rede Local

1. **Build a aplicação:**
   ```bash
   npm run build
   ```

2. **Inicie o servidor:**
   ```bash
   npm run server
   ```

3. **Encontre seu IP local:**
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig`

4. **Acesse de outros dispositivos:**
   ```
   http://SEU_IP_LOCAL:3001
   ```

### Opção 2: Túnel Internet (Recomendado)

1. **Instale o ngrok:**
   ```bash
   npm install -g ngrok
   ```

2. **Build e inicie o servidor:**
   ```bash
   npm run full-stack
   ```

3. **Em outro terminal, crie o túnel:**
   ```bash
   ngrok http 3001
   # ou use o script:
   npm run tunnel
   ```

4. **Use a URL do ngrok em qualquer dispositivo:**
   ```
   https://seu-id-aleatorio.ngrok.io
   ```

## 🔧 Como Funciona

### Arquitetura WebRTC

```
Dispositivo A ←→ Servidor Socket.IO ←→ Dispositivo B
     ↓                                        ↓
     └────── Conexão WebRTC Direta ──────────┘
```

### Fluxo de Conexão

1. **Usuário A** se conecta e entra na fila de espera
2. **Usuário B** se conecta e é pareado com A
3. **Socket.IO** facilita a troca de sinais WebRTC
4. **Conexão P2P** é estabelecida diretamente entre A e B
5. **Vídeo/áudio** flui diretamente sem passar pelo servidor

### Endpoints da API

#### `GET /api/health`
Verifica o status do servidor e estatísticas.

**Resposta:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-07T04:00:00.000Z",
  "connectedUsers": 2,
  "waitingUsers": 0,
  "activeRooms": 1,
  "server": "WebRTC Native"
}
```

## 🎮 Eventos Socket.IO

### Cliente → Servidor
- `join-platform`: Entrar na plataforma
- `find-random-chat`: Procurar chat aleatório
- `webrtc-offer`: Enviar oferta WebRTC
- `webrtc-answer`: Enviar resposta WebRTC
- `webrtc-ice-candidate`: Enviar candidato ICE
- `skip-chat`: Pular chat atual
- `end-chat`: Encerrar chat

### Servidor → Cliente
- `platform-joined`: Confirmação de entrada
- `waiting-for-match`: Aguardando pareamento
- `match-found`: Pareamento encontrado
- `webrtc-offer`: Receber oferta
- `webrtc-answer`: Receber resposta
- `webrtc-ice-candidate`: Receber candidato ICE
- `partner-skipped`: Parceiro pulou
- `partner-ended-chat`: Parceiro encerrou
- `partner-disconnected`: Parceiro desconectou

## 🔒 Segurança

- 🌐 **STUN Servers**: Servidores Google para NAT traversal
- 🔐 **Conexão P2P**: Dados não passam pelo servidor
- 🛡️ **CORS Configurado**: Proteção contra origens maliciosas
- 🎫 **Socket.IO Seguro**: Autenticação por sessão

## 🐛 Troubleshooting

### Problemas Comuns

1. **"Erro de conexão"**
   - Verifique se o servidor está rodando na porta 3001
   - Teste: http://localhost:3001/api/health

2. **Câmera/Microfone não funciona**
   - Permita acesso no navegador
   - Use HTTPS em produção (obrigatório para WebRTC)

3. **Não conecta entre dispositivos**
   - Use ngrok para túnel confiável
   - Verifique se ambos acessam a mesma URL
   - Confirme que CORS está configurado

4. **Conexão WebRTC falha**
   - Verifique firewall/NAT
   - Teste em rede diferente
   - Use STUN/TURN servers se necessário

### Debug

Abra o console do navegador para logs detalhados da conexão WebRTC e Socket.IO.

## 📊 Scripts Disponíveis

- `npm run dev` - Servidor frontend desenvolvimento
- `npm run build` - Build frontend para produção
- `npm run server` - Iniciar servidor backend
- `npm run server:dev` - Servidor backend com auto-reload
- `npm run full-stack` - Build frontend + iniciar backend
- `npm run tunnel` - Criar túnel ngrok

## 🌟 Recursos Avançados

- ✅ **Reconnection automática** do Socket.IO
- ✅ **ICE candidate gathering** otimizado
- ✅ **Media stream handling** robusto
- ✅ **Error handling** abrangente
- ✅ **Responsive design** mobile-first
- ✅ **Real-time status** indicators

## 📄 Licença

MIT License - sinta-se livre para usar este projeto para aprendizado e desenvolvimento.

---

**🎯 Objetivo**: Demonstrar implementação completa de WebRTC sem dependências externas, ideal para aprendizado e base para projetos mais complexos.