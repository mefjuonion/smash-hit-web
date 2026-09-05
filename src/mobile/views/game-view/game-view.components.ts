import View from '@src/abstracts/View';
import COPY from '@src/lib/COPY';

export default {
  BUTTON_SHOOT: View.createElement('button', {
    className: 'base-button',
    ariaLabel: COPY.BUTTON_SHOT,
    innerText: COPY.BUTTON_SHOT
  }),
  BUTTON_CALIBRATION: View.createElement('button', {
    className: 'game-view__calibration-button',
    ariaLabel: COPY.BUTTON_CALIBRATE,
    innerText: COPY.BUTTON_CALIBRATE
  }),
  MESSAGE_CALIBRATION: View.createElement('p', {
    className: 'game-view__calibration-message',
    innerText: COPY.INSTRUCTION_CALIBRATION
  }),
  SCORE: View.createElement('h1', {
    className: 'game-view__score',
    innerText: '0'
  })
};