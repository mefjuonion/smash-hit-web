import * as _ from '@src/lib/CONSTANTS';
import isMobile from '@src/lib/isMobile';
import QRCode from 'qrcode';

class RoomManager {
  static instance = new RoomManager();
    
  private _roomID: string | null;
  public get roomID() {return this._roomID;}

  public readonly isHost = !isMobile();

  private _qrCodeCanvas: HTMLCanvasElement = document.createElement('canvas');
  public get qrCodeCanvas() {return this._qrCodeCanvas;}

  constructor() {
    this._roomID = this.getRoomID();
    if (this.isHost && !this.roomID) this.createRoom();
  }

  private getRoomID(): string | null {
    return new URLSearchParams(window.location.search).get(_.ROOM_SEARCH_PARAM);
  }

  private createRoom() {
    this._roomID = crypto.randomUUID();
    const finalURL = `${window.location.origin}${window.location.pathname}?room=${this._roomID}`;
    QRCode.toCanvas(this._qrCodeCanvas, finalURL);
  }
}

export default RoomManager;