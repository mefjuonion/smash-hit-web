import RoomManager from '@src/singletons/NetworkManager/RoomManager';

const STORAGE_KEY = 'smashHit.playerSession';

interface StoredSession {
  room: string;
  color: string;
}

class PlayerSessionManager {
  static instance = new PlayerSessionManager();

  get color(): string | undefined {
    return this.load()?.color;
  }

  get hasJoined(): boolean {
    return this.color !== undefined;
  }

  save(color: string) {
    const room = RoomManager.instance.roomID;
    if (!room) return;

    try {
      const session: StoredSession = { room, color };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('[PlayerSessionManager] Failed to persist session:', error);
    }
  }

  private load(): StoredSession | undefined {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return undefined;

      const session = JSON.parse(raw) as StoredSession;
      if (session.room !== RoomManager.instance.roomID) return undefined;

      return session;
    } catch (error) {
      console.error('[PlayerSessionManager] Failed to read session:', error);
      return undefined;
    }
  }
}

export default PlayerSessionManager;
