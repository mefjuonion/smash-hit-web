import PermissionManager from './singletons/PermissionManager';
import PlayerSessionManager from './singletons/PlayerSessionManager';
import RoutingManager from './singletons/RoutingManager';

class Mobile {
  constructor() {
    // Already registered for this room (e.g. before a screen lock/unlock or
    // a page reload) — skip straight back into the game instead of making
    // the player pick a color and rejoin again.
    if (PlayerSessionManager.instance.hasJoined) RoutingManager.instance.route('game');
    else if (PermissionManager.isRequired) RoutingManager.instance.route('permissions');
    else RoutingManager.instance.route('loading');
  }
}

export default new Mobile();