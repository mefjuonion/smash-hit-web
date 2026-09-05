declare type MessageHandler = (payload: SignalingEvent) => Promise<unknown>;

declare interface SignalingPayloadMap {
    'offer': RTCSessionDescriptionInit;
    'answer': RTCSessionDescriptionInit;
    'candidate': RTCIceCandidateInit;
    'join': { room: string; clientId?: string };
    'joined': { clientId: string };
    'error': { message: string };
}

declare interface SignalingMessage<T extends keyof SignalingPayloadMap> {
    type: T;
    payload: SignalingPayloadMap[T];
    senderId?: string;
    targetId?: string;
}

declare type SignalingEvent = {
    [K in keyof SignalingPayloadMap]: SignalingMessage<K>
}[keyof SignalingPayloadMap];

declare interface NetworkMessage<T = unknown> {
  type: string;
  payload: T;
}

declare interface PlayerWelcomePayload {
  playerId: string;
  color: string;
  isLocal: boolean;
}

declare interface PlayerJoinedPayload {
  playerId: string;
  color: string;
  score?: number;
  isLocal?: boolean;
}

declare interface PlayerLeftPayload {
  playerId: string;
}

declare interface BallThrownPayload {
  playerId: string;
  direction: [number, number, number];
}

declare interface TotemDestroyedPayload {
  totemId: string;
  playerId: string;
  points: number;
}

declare interface ScoreUpdatedPayload {
  playerId: string;
  score: number;
}

declare interface StateSyncPayload {
  playerId: string;
  position: [number, number, number];
}

declare interface AimPayload {
  position: [number, number];
  playerId: string;
}

declare type MessageType =
  | 'player:welcome'
  | 'player:joined'
  | 'player:left'
  | 'ball:thrown'
  | 'totem:destroyed'
  | 'score:updated'
  | 'state:sync';
