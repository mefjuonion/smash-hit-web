import './permission-view.scss';

import PermissionManager from '@mobile/singletons/PermissionManager';
import View from '@src/abstracts/View';
import COPY from '@src/lib/COPY';
import RoutingManager from '@src/mobile/singletons/RoutingManager';
import autoBind from 'auto-bind';

export default class PermissionView extends View {
  protected _view = View.createElement('section', { className: 'permission-view' });

  private heading = View.createElement('h1', {
    className: 'permission-view__heading',
    innerText: COPY.INSTRUCTION_PERMISSION
  });
  private acceptButton = View.createElement('button', {
    className: 'base-button',
    ariaLabel: COPY.BUTTON_REQUEST_PERMISSON,
    innerText: COPY.BUTTON_REQUEST_PERMISSON,
    type: 'button'
  });

  constructor() {
    super();
    autoBind(this);

    this.acceptButton.onclick = this.onAcceptButtonClick;
    this.view.appendChild(this.heading);
    this.view.appendChild(this.acceptButton);
  }

  private onAcceptButtonClick = () => {
    PermissionManager.instance
      .request()
      .then(isAllowed => {
        if (!isAllowed) {
          this.heading.innerText =
            'Permission denied – reset in Safari Settings > website > Motion & Orientation Access';
          return;
        }
        RoutingManager.instance.route('loading');
      })
      .catch(err => {
        this.heading.innerText = `Error: ${err}`;
      });
  };
}