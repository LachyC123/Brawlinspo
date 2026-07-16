import Phaser from 'phaser';
import { PALETTE, FONT, hex } from '../config';
import { px } from '../render/pixel';

/**
 * A labelled stat bar. Never communicates its value by colour alone (§45): the
 * numeric value + label are always shown alongside the fill.
 */
export class StatBar extends Phaser.GameObjects.Container {
  private g: Phaser.GameObjects.Graphics;
  private valText: Phaser.GameObjects.Text;
  private barW: number;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, label: string, value: number, opts: { color?: number; max?: number; showValue?: boolean } = {}) {
    super(scene, x, y);
    this.barW = w;
    const max = opts.max ?? 100;
    this.g = scene.add.graphics();
    this.add(this.g);

    const lbl = scene.add.text(0, 0, label, { fontFamily: FONT.body, fontSize: '8px', color: hex(PALETTE.creamDim), resolution: 3 }).setOrigin(0, 0.5).setY(4);
    this.add(lbl);

    this.valText = scene.add.text(w, 0, `${Math.round(value)}`, { fontFamily: FONT.mono, fontSize: '8px', color: hex(PALETTE.cream), resolution: 3 }).setOrigin(1, 0.5).setY(4);
    if (opts.showValue === false) this.valText.setVisible(false);
    this.add(this.valText);

    this.drawBar(value, max, opts.color ?? PALETTE.amber);
    scene.add.existing(this);
  }

  private drawBar(value: number, max: number, color: number) {
    const g = this.g;
    const barY = 10;
    const barH = 4;
    px(g, 0, barY, this.barW, barH, PALETTE.ink);
    const pct = Phaser.Math.Clamp(value / max, 0, 1);
    px(g, 1, barY + 1, Math.max(0, (this.barW - 2) * pct), barH - 2, color);
    // ticks every 25% for readability without relying on colour.
    for (let t = 0.25; t < 1; t += 0.25) px(g, Math.floor(this.barW * t), barY, 1, barH, PALETTE.bg, 0.5);
  }
}
