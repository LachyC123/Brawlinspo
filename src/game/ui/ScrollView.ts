import Phaser from 'phaser';
import { MENU_W } from '../config';

/**
 * A vertical scroll container with a rectangular mask. Content is added to
 * `content`; call setContentHeight() after populating. Supports drag + wheel,
 * preventing the page itself from scrolling during gameplay (§37).
 */
export class ScrollView {
  content: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private viewY: number;
  private viewH: number;
  private contentH = 0;
  private minY: number;
  private dragging = false;
  private lastPointerY = 0;
  private velocity = 0;

  constructor(scene: Phaser.Scene, y: number, height: number) {
    this.scene = scene;
    this.viewY = y;
    this.viewH = height;
    this.minY = y;
    this.content = scene.add.container(0, y);

    const maskG = scene.make.graphics({});
    maskG.fillStyle(0xffffff);
    maskG.fillRect(0, y, MENU_W, height);
    this.content.setMask(maskG.createGeometryMask());

    const zone = scene.add.zone(0, y, MENU_W, height).setOrigin(0).setInteractive();
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => { this.dragging = true; this.lastPointerY = p.y; this.velocity = 0; });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      const dy = p.y - this.lastPointerY;
      this.lastPointerY = p.y;
      this.velocity = dy;
      this.scrollBy(dy);
    });
    scene.input.on('pointerup', () => { this.dragging = false; });
    scene.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.scrollBy(-dy * 0.5));
  }

  setContentHeight(h: number) { this.contentH = h; }

  private scrollBy(dy: number) {
    if (this.contentH <= this.viewH) return;
    const maxScroll = this.contentH - this.viewH;
    let ny = this.content.y + dy;
    ny = Phaser.Math.Clamp(ny, this.minY - maxScroll, this.minY);
    this.content.y = ny;
  }

  update() {
    if (!this.dragging && Math.abs(this.velocity) > 0.2) {
      this.scrollBy(this.velocity);
      this.velocity *= 0.9;
    }
  }
}
