import http from 'http';
import https from 'https';
import { WebSocket, WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT) || 8080;
const IS_DEV = process.env.NODE_ENV !== 'production';

interface ExtendedWebSocket extends WebSocket {
    room?: string;
    clientId: string;
}

interface JoinMessage {
    type: 'join';
    room: string;
    clientId?: string;
}

type RelayMessage = SignalingMessage<'offer'> | SignalingMessage<'answer'> | SignalingMessage<'candidate'>;
type IncomingMessage = JoinMessage | RelayMessage;

async function createServer() {
  if (IS_DEV) {
    const { default: selfsigned } = await import('selfsigned');
    const pems = selfsigned.generate(undefined, { days: 365 });
    return https.createServer({ key: pems.private, cert: pems.cert }, (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>WebSocket Server</h1><p>Certificate accepted! You can close this tab.</p>');
    });
  }

  return http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>WebSocket Server</h1>');
  });
}

const server = await createServer();
const webSocketServer = new WebSocketServer({ server });

server.listen(PORT, '0.0.0.0', () => {
  console.log(`WebSocket server (${IS_DEV ? 'WSS' : 'WS'}) running on port ${PORT}`);
});

webSocketServer.on('connection', (socket: ExtendedWebSocket) => {
  socket.clientId = crypto.randomUUID();

  socket.on('message', (rawData: string) => {
    try {
      const data: IncomingMessage = JSON.parse(rawData);

      if (data.type === 'join') {
        socket.room = data.room;
        
        if (data.clientId) socket.clientId = data.clientId;
        console.log(`User joined room: ${socket.room} (clientId: ${socket.clientId})`);
        socket.send(JSON.stringify({ type: 'joined', payload: { clientId: socket.clientId } }));
        return;
      }

      if (socket.room) broadcastToRoom(socket, { ...data, senderId: socket.clientId });
    } catch (error) {
      console.error('Websocket message error: ', error);
    }
  });

  socket.on('close', () => {
    console.log('User left');
  });
});

function broadcastToRoom(sender: ExtendedWebSocket, data: RelayMessage) {
  (webSocketServer.clients as Set<ExtendedWebSocket>).forEach((client) => {
    if (
      client !== sender &&
      client.room === sender.room &&
      client.readyState === WebSocket.OPEN
    ) client.send(JSON.stringify(data));
  });
}
