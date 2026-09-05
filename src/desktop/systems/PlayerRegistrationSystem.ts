import NetworkIdentity from '@desktop/components/NetworkIdentity';
import Player from '@desktop/components/Player';
import type Entity from '@desktop/core/Entity';
import System from '@desktop/core/System';
import DesktopNetworkManager from '@desktop/singletons/NetworkManager';
import MESSAGE_TYPES from '@src/singletons/NetworkManager/MESSAGE_TYPES';
import autoBind from 'auto-bind';

export default class PlayerRegistrationSystem extends System {
  private pendingPlayers: PlayerJoinedPayload[] = [];

  init() {
    autoBind(this);

    DesktopNetworkManager.connectedPlayers.forEach(this.createPlayer);
    DesktopNetworkManager.instance.on(MESSAGE_TYPES.PLAYER_JOINED, this.onPlayerJoined);
  }

  private onPlayerJoined(payload: PlayerJoinedPayload) {
    this.pendingPlayers.push(payload);
  }

  private createPlayer(data: PlayerJoinedPayload) {
    const existingEntity = this.query(Player).find(entity => entity.get(Player)?.id === data.playerId);

    if (existingEntity) {
      const player = existingEntity.get(Player)!;
      player.color = data.color;

      // The desktop kept the real score the whole time, but the phone's own
      // display doesn't know that — it only updates on the next scoring
      // event, so right after a reconnect it still shows whatever it had
      // (often 0, if the page reloaded). Push the true value now instead of
      // leaving it looking reset until the player scores again.
      DesktopNetworkManager.instance.send(MESSAGE_TYPES.SCORE_UPDATED, {
        playerId: player.id,
        score: player.score,
      });
      return;
    }

    const entity = this.world.createEntity();

    const player = new Player();
    player.id = data.playerId;
    player.color = data.color;

    const networkIdentity = new NetworkIdentity();
    networkIdentity.networkId = data.playerId;
    networkIdentity.isLocal = data.isLocal ?? false;

    entity.add(player).add(networkIdentity);
  }

  update() {
    this.pendingPlayers.forEach(data => this.createPlayer(data));
    this.pendingPlayers = [];
  }

  onEntityRemoved(_entity: Entity): void {}
}
