import './registration-view.scss';

import View from '@src/abstracts/View';
import COPY from '@src/lib/COPY';
import PlayerSessionManager from '@src/mobile/singletons/PlayerSessionManager';
import RoutingManager from '@src/mobile/singletons/RoutingManager';

const COLORS = [
  '#e74c3c',
  '#e67e22',
  '#f1c40f',
  '#2ecc71',
  '#ff00ff',
  '#3498db',
  '#9b59b6',
  '#e84393',
  '#ecf0f1',
];

export default class RegistrationView extends View {
  protected _view = View.createElement('section', { className: 'registration-view' });

  private form = View.createElement('form', { className: 'registration-view__form' });

  private colorGrid = View.createElement('div', { className: 'registration-view__color-grid' });

  private colorLabel = View.createElement('p', {
    className: 'registration-view__label',
    innerText: COPY.INSTRUCTION_PLAYER_COLOR,
  });

  private submitButton = View.createElement('button', {
    className: 'base-button',
    type: 'submit',
    innerText: COPY.BUTTON_JOIN,
  });

  constructor() {
    super();

    this.buildColorGrid();

    this.form.onsubmit = this.onSubmit;
    this.form.appendChild(this.colorLabel);
    this.form.appendChild(this.colorGrid);
    this.form.appendChild(this.submitButton);
    this._view.appendChild(this.form);
  }

  private get selectedColor() {
    const checked = this.form.querySelector<HTMLInputElement>('input[name="color"]:checked');
    return checked?.value ?? COLORS[0];
  }

  private onSubmit = (event: Event) => {
    event.preventDefault();

    // The game-view sends PLAYER_JOINED itself (every time the connection
    // opens, including reconnects) — persisting the color here is enough
    // for it to know who to announce.
    PlayerSessionManager.instance.save(this.selectedColor);
    RoutingManager.instance.route('game');
  };

  private buildColorGrid() {
    COLORS.forEach((color, index) => {
      const radio = View.createElement('input', {
        className: 'registration-view__color-radio',
        type: 'radio',
        name: 'color',
        value: color,
      });

      if (index === 0) radio.checked = true;

      const label = View.createElement('label', { className: 'registration-view__color-label' });
      label.style.backgroundColor = color;
      label.appendChild(radio);

      this.colorGrid.appendChild(label);
    });
  }
}
