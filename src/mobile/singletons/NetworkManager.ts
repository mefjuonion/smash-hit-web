import type { GameMessagePayloadMap, GameMessageType } from '@src/singletons/NetworkManager/MESSAGE_TYPES';
import NetworkManager, { ICE_SERVERS } from '@src/singletons/NetworkManager/NetworkManager';
import WebSocketManager from '@src/singletons/NetworkManager/WebSocketManager';

class MobileNetworkManager extends NetworkManager {
  static instance = new MobileNetworkManager();

  private peerConnection!: RTCPeerConnection;
  private dataChannel!: RTCDataChannel;
  private hostSenderId?: string;

  get isConnected() {
    return this.dataChannel?.readyState === 'open';
  }

  constructor() {
    super();

    this.createPeerConnection();

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  public send<T extends GameMessageType>(type: T, payload: GameMessagePayloadMap[T]) {
    if (this.dataChannel?.readyState === 'open')
      this.dataChannel.send(JSON.stringify({ type, payload }));
  }

  protected async onAnswer(event: SignalingEvent) {
    const message = event as SignalingMessage<'answer'>;

    const myId = WebSocketManager.instance.clientId;
    if (message.targetId && myId && message.targetId !== myId) return;

    if (!this.hostSenderId) this.hostSenderId = message.senderId;

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.payload));
  }

  protected async onCandidate(event: SignalingEvent) {
    const message = event as SignalingMessage<'candidate'>;

    const myId = WebSocketManager.instance.clientId;
    if (message.targetId && myId && message.targetId !== myId) return;
    if (this.hostSenderId && message.senderId !== this.hostSenderId) return;

    await this.peerConnection.addIceCandidate(new RTCIceCandidate(message.payload));
  }

  private handleVisibilityChange() {
    if (document.visibilityState === 'visible' && !this.isConnected) this.reconnect();
  }

  private reconnect() {
    this.hostSenderId = undefined;
    this.peerConnection.close();
    this.createPeerConnection();
  }

  private createPeerConnection() {
    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnection.onicecandidate = this.onIceCandidate;
    this.peerConnection.oniceconnectionstatechange = this.onIceConnectionStateChange;

    this.dataChannel = this.peerConnection.createDataChannel('game');
    this.setupDataChannel(this.dataChannel);

    this.createOffer();
  }

  private onIceConnectionStateChange() {
    if (this.peerConnection.iceConnectionState === 'failed') this.reconnect();
  }

  private onIceCandidate(event: RTCPeerConnectionIceEvent) {
    if (!event.candidate) return;

    WebSocketManager.instance.send({
      type: 'candidate',
      payload: event.candidate
    });
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.onopen = () => {
      console.log('[MobileNetworkManager] Data channel open');
      this.notifyOpen();
    };

    channel.onclose = () => {
      console.log('[MobileNetworkManager] Data channel closed');
      this.notifyClose();
    };

    channel.onmessage = this.dispatchMessage;
  }

  private async createOffer() {
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    WebSocketManager.instance.send({ type: 'offer', payload: offer });
  }
}

export default MobileNetworkManager;
