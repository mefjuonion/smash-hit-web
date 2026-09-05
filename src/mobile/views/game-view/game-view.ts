import './game-view.scss';

import MobileNetworkManager from '@mobile/singletons/NetworkManager';
import OrientationManager from '@mobile/singletons/OrientationManager';
import View from '@src/abstracts/View';
import PlayerSessionManager from '@src/mobile/singletons/PlayerSessionManager';
import MESSAGE_TYPES from '@src/singletons/NetworkManager/MESSAGE_TYPES';
import autoBind from 'auto-bind';

import COMPONENTS from './game-view.components';

const AIM_SEND_INTERVAL = 66;

export default class extends View {
  protected _view = View.createElement('section', { className: 'game-view' });

  private scoreElement = COMPONENTS.SCORE;

  private orientation = OrientationManager.instance;
  private network = MobileNetworkManager.instance;

  private lastSendTime = 0;

  constructor() {
    super();
    autoBind(this);

    this._view.appendChild(this.scoreElement);
    this._view.appendChild(COMPONENTS.MESSAGE_CALIBRATION);
    this._view.appendChild(COMPONENTS.BUTTON_CALIBRATION);
    this._view.appendChild(COMPONENTS.BUTTON_SHOOT);

    this.orientation.onAimUpdate = this.onAimUpdate;

    COMPONENTS.BUTTON_CALIBRATION.addEventListener('click', this.orientation.calibrate);
    COMPONENTS.BUTTON_SHOOT.addEventListener('touchstart', this.onShoot);

    this.network.on(MESSAGE_TYPES.SCORE_UPDATED, ({ score, playerId }) => {
      if (MobileNetworkManager.playerID !== playerId) return;
      this.scoreElement.innerHTML = String(score);
    });

    this.network.onOpen(() => {
      const color = PlayerSessionManager.instance.color;
      if (!color) return;

      this.network.send(MESSAGE_TYPES.PLAYER_JOINED, {
        playerId: MobileNetworkManager.playerID,
        color,
      });
    });

    this.orientation.start();
  }

  private onAimUpdate(aimX: number, aimY: number) {
    const now = Date.now();

    if (this.network.isConnected && now - this.lastSendTime > AIM_SEND_INTERVAL) {
      this.lastSendTime = now;
      this.network.send(MESSAGE_TYPES.AIM_UPDATE, {
        position: [aimX, aimY],
        playerId: MobileNetworkManager.playerID
      });
    }
  }

  private onShoot(e: TouchEvent) {
    e.preventDefault();

    if (!this.network.isConnected || COMPONENTS.BUTTON_SHOOT.disabled) return;

    this.network.send(MESSAGE_TYPES.BALL_THROWN, {
      direction: [this.orientation.aimX, this.orientation.aimY, -1],
      playerId: MobileNetworkManager.playerID,
    });

    COMPONENTS.BUTTON_SHOOT.disabled = true;
    setTimeout(() => {
      COMPONENTS.BUTTON_SHOOT.disabled = false;
    }, 500);
  }
}