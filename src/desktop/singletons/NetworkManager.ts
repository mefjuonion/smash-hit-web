import type { GameMessagePayloadMap, GameMessageType } from '@src/singletons/NetworkManager/MESSAGE_TYPES';
import NetworkManager, { ICE_SERVERS } from '@src/singletons/NetworkManager/NetworkManager';
import RoomManager from '@src/singletons/NetworkManager/RoomManager';
import WebSocketManager from '@src/singletons/NetworkManager/WebSocketManager';
interface PeerEntry {
  peerConnection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
}

class DesktopNetworkManager extends NetworkManager {
  static instance = new DesktopNetworkManager();

  private peers = new Map<string, PeerEntry>();

  get isConnected() {
    for (const peer of this.peers.values())
      if (peer.dataChannel?.readyState === 'open') return true;

    return false;
  }

  get qrCodeCanvas() {
    return RoomManager.instance.qrCodeCanvas;
  }

  constructor() {
    super();
  }

  public send<T extends GameMessageType>(type: T, payload: GameMessagePayloadMap[T]) {
    const message = JSON.stringify({ type, payload });

    for (const peer of this.peers.values())
      if (peer.dataChannel?.readyState === 'open')
        peer.dataChannel.send(message);
  }

  protected async onOffer(event: SignalingEvent) {
    const message = event as SignalingMessage<'offer'>;
    const senderId = message.senderId;
    if (!senderId) return;

    const peer = this.getOrCreatePeer(senderId);
    await peer.peerConnection.setRemoteDescription(new RTCSessionDescription(message.payload));
    const answer = await peer.peerConnection.createAnswer();
    await peer.peerConnection.setLocalDescription(answer);
    WebSocketManager.instance.send({ type: 'answer', payload: answer, targetId: senderId });
  }

  protected async onCandidate(event: SignalingEvent) {
    const message = event as SignalingMessage<'candidate'>;
    const senderId = message.senderId;
    if (!senderId) return;

    const peer = this.peers.get(senderId);
    if (!peer) return;

    await peer.peerConnection.addIceCandidate(new RTCIceCandidate(message.payload));
  }

  private getOrCreatePeer(remoteSenderId: string): PeerEntry {
    const existing = this.peers.get(remoteSenderId);
    const isStale = existing && ['closed', 'failed', 'disconnected'].includes(existing.peerConnection.connectionState);

    if (existing && !isStale) return existing;
    
    if (existing) existing.peerConnection.close();

    const peerConnection = new RTCPeerConnection(ICE_SERVERS);

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) return;
      WebSocketManager.instance.send({
        type: 'candidate',
        payload: event.candidate,
        targetId: remoteSenderId,
      });
    };

    peerConnection.ondatachannel = (event) => {
      const peer = this.peers.get(remoteSenderId);
      if (peer) {
        peer.dataChannel = event.channel;
        this.setupDataChannel(event.channel, remoteSenderId);
      }
    };

    const entry: PeerEntry = { peerConnection };
    this.peers.set(remoteSenderId, entry);
    return entry;
  }

  private setupDataChannel(channel: RTCDataChannel, remoteSenderId: string) {
    channel.onopen = () => {
      console.log(`[DesktopNetworkManager] Data channel open (peer: ${remoteSenderId})`);
      this.notifyOpen();
    };

    channel.onclose = () => {
      console.log(`[DesktopNetworkManager] Data channel closed (peer: ${remoteSenderId})`);
      this.peers.delete(remoteSenderId);
      this.notifyClose();
    };

    channel.onmessage = this.dispatchMessage;
  }
}

export default DesktopNetworkManager;
