import * as _ from '@src/lib/CONSTANTS';
import autoBind from 'auto-bind';

import RoomManager from './RoomManager';

class WebSocketManager {
  static instance = new WebSocketManager();

  private socket?: WebSocket;
  private _clientId: string;

  private reconnectAttempts = 0;
  private reconnectTimeout?: ReturnType<typeof setTimeout>;

  get clientId() { return this._clientId; }

  private handlers = new Map<keyof SignalingPayloadMap, Set<MessageHandler>>();
  private pendingMessages: SignalingEvent[] = [];

  constructor() {
    autoBind(this);

    this._clientId = this.loadOrCreateClientId();
    this.connect();

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  public send(event: SignalingEvent) {
    if (this.socket?.readyState === WebSocket.OPEN)
      return this.socket.send(JSON.stringify(event));

    this.pendingMessages.push(event);
  }

  public on<T extends keyof SignalingPayloadMap>(type: T, handler: MessageHandler) {
    if (!this.handlers.has(type))
      this.handlers.set(type, new Set());

    this.handlers.get(type)!.add(handler);

    return { cancel: () => this.cancelHandler(type, handler) };
  }

  public cancelHandler(type: keyof SignalingPayloadMap, handler: MessageHandler) {
    this.handlers.get(type)?.delete(handler);
  }

  private connect() {
    this.socket = new WebSocket(this.getWebsocketURL());

    this.socket.onopen = this.onOpen;
    this.socket.onclose = this.onClose;
    this.socket.onerror = this.onError;
    this.socket.onmessage = this.onMessage;
  }

  private onOpen() {
    this.reconnectAttempts = 0;

    this.socket?.send(JSON.stringify({
      type: 'join',
      room: RoomManager.instance.roomID,
      clientId: this._clientId,
    }));

    this.pendingMessages.forEach(event => this.send(event));
    this.pendingMessages = [];
  };

  private onClose() {
    this.socket = undefined;
    this.scheduleReconnect();
  };

  private onError(error: Event) {
    console.error('[WebSocketManager] Error:', error);
  }

  private async onMessage(event: MessageEvent<string>) {
    const message: SignalingEvent = JSON.parse(event.data);

    try {
      console.log('[WebSocketManager] Received:', message.type);

      if (message.type === 'joined')
        this._clientId = (message as SignalingMessage<'joined'>).payload.clientId;

      this.handlers.get(message.type)?.forEach(callback => callback(message));
    } catch (err) {
      console.error('[WebSocketManager] Failed to parse message:', err);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;

    const delay = Math.min(_.WS_RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempts, _.WS_RECONNECT_MAX_DELAY_MS);
    this.reconnectAttempts += 1;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = undefined;
      this.connect();
    }, delay);
  }

  private handleVisibilityChange() {
    if (document.visibilityState !== 'visible') return;
    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) return;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    this.connect();
  }

  private loadOrCreateClientId(): string {
    try {
      const stored = localStorage.getItem(_.WS_CLIENT_ID_STORAGE_KEY);
      if (stored) return stored;
    } catch (err) {
      console.error('[WebSocketManager] Failed to read persisted clientId:', err);
    }

    const id = crypto.randomUUID();

    try {
      localStorage.setItem(_.WS_CLIENT_ID_STORAGE_KEY, id);
    } catch (err) {
      console.error('[WebSocketManager] Failed to persist clientId:', err);
    }

    return id;
  }

  private getWebsocketURL(): string {
    const wsUrl = import.meta.env.VITE_WS_URL;

    if (wsUrl)
      return wsUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');

    const port = import.meta.env.VITE_WS_PORT || '8080';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.hostname}:${port}`;
  }
}

export default WebSocketManager;
