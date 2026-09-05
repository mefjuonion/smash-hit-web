import DesktopNetworkManager from '@desktop/singletons/NetworkManager';
import View from '@src/abstracts/View';
import COPY from '@src/lib/COPY';

const QR_CODE = DesktopNetworkManager.instance.qrCodeCanvas;
QR_CODE.className = 'qr-code-view__qr-code';

export default {
  HEADING: View.createElement('h1', {
    className: 'qr-code-view__heading',
    textContent: COPY.INSTRUCTION_SCAN_QR,
  }),
  QR_CODE,
  CONNECTED_PLAYERS_LIST: View.createElement('ul', {
    className: 'qr-code-view__players'
  }),
  START_GAME_BUTTON: View.createElement('button', {
    className: 'base-button',
    textContent: COPY.BUTTON_START_GAME,
  })
};