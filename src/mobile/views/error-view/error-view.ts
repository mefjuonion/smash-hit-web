import './error-view.scss';

import View from '@src/abstracts/View';
import COPY from '@src/lib/COPY';

export default class ErrorView extends View {
  protected _view = View.createElement('section', { className: 'error-view' });

  private heading = View.createElement('h1', {
    className: 'error-view__heading',
    innerText: COPY.ERROR_GAME_NOT_FOUND
  });

  constructor() {
    super();
    this._view.appendChild(this.heading);
  }
}
