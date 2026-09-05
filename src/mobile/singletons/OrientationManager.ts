import autoBind from 'auto-bind';

import PermissionManager from './PermissionManager';

const CALIBRATION_SAMPLES_REQUIRED = 10;
const SENSITIVITY = 0.02;
const SMOOTHING = 0.1;

class OrientationManager {
  static instance = new OrientationManager();
    
  private isCalibrated = false;
  private calibrationSamples: { alpha: number; beta: number }[] = [];
  private offsetAlpha = 0;
  private offsetBeta = 0;

  private smoothedX = 0;
  private smoothedY = 0;

  aimX = 0;
  aimY = 0;

  onCalibrationComplete?: () => void;
  onAimUpdate?: (aimX: number, aimY: number) => void;

  private isStarted = false;

  constructor() {
    autoBind(this);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  async start() {
    const granted = await PermissionManager.instance.request();

    if (!granted) return false;

    this.isStarted = true;
    this.attachListener();
    this.calibrate();

    return true;
  }

  calibrate() {
    this.isCalibrated = false;
    this.calibrationSamples = [];
    this.smoothedX = 0;
    this.smoothedY = 0;
  }

  private handleVisibilityChange() {
    if (document.visibilityState !== 'visible' || !this.isStarted) return;

    this.attachListener();
    this.calibrate();
  }

  private attachListener() {
    window.removeEventListener('deviceorientation', this.handleOrientation);
    window.addEventListener('deviceorientation', this.handleOrientation);
  }

  private handleOrientation(event: DeviceOrientationEvent) {
    if (event.alpha === null || event.beta === null) return;

    if (!this.isCalibrated) {
      this.calibrationSamples.push({ alpha: event.alpha, beta: event.beta });

      if (this.calibrationSamples.length >= CALIBRATION_SAMPLES_REQUIRED) {
        this.offsetAlpha =
          this.calibrationSamples.reduce((sum, s) => sum + s.alpha, 0) / this.calibrationSamples.length;
        this.offsetBeta = this.calibrationSamples.reduce((sum, s) => sum + s.beta, 0) / this.calibrationSamples.length;
        this.isCalibrated = true;
        this.onCalibrationComplete?.();
      }

      return;
    }

    let deltaAlpha = event.alpha - this.offsetAlpha;

    if (deltaAlpha > 180) deltaAlpha -= 360;
    if (deltaAlpha < -180) deltaAlpha += 360;

    const beta = event.beta - this.offsetBeta;

    const rawX = Math.max(-1, Math.min(1, -deltaAlpha * SENSITIVITY));
    const rawY = Math.max(-1, Math.min(1, beta * SENSITIVITY));

    this.smoothedX += (rawX - this.smoothedX) * SMOOTHING;
    this.smoothedY += (rawY - this.smoothedY) * SMOOTHING;

    this.aimX = this.smoothedX;
    this.aimY = this.smoothedY;

    this.onAimUpdate?.(this.aimX, this.aimY);
  }
}

export default OrientationManager;
