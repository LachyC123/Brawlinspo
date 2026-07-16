import Phaser from 'phaser';
import { PALETTE, FONT, hex } from '../config';
import { panel, px } from '../render/pixel';
import { AudioManager } from '../systems/AudioManager';

export interface ButtonOpts {
  w: number;
  h: number;
  label: string;
  onClick: () => void;
  fill?: number;
  accent?: number;
  textColor?: number;
  fontSize?: number;
  icon?: string;
  disabled?: boolean;
}

/**
 * A pixel-art button with clear pressed states, a short scale animation and a
 * sound response (§33). Large touch target friendly. Built from Graphics so it
 * stays crisp at any scale.
 */
export class PixelButton extends Phaser.GameObjects.Container {
  private g: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private opts: ButtonOpts;
  private isDown = false;
  disabledState: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ButtonOpts) {
    super(scene, x, y);
    this.opts = opts;
    this.disabledState = !!opts.disabled;
    this.g = scene.add.graphics();
    this.add(this.g);

    const fs = opts.fontSize ?? 10;
    this.label = scene.add
      .text(opts.w / 2, opts.h / 2, (opts.icon ? opts.icon + '  ' : '') + opts.label, {
        fontFamily: FONT.heading,
        fontSize: `${fs}px`,
        color: hex(opts.textColor ?? PALETTE.cream),
        fontStyle: 'bold',
        align: 'center',
        resolution: 3,
      })
      .setOrigin(0.5);
    this.add(this.label);

    this.draw(false);
    this.setSize(opts.w, opts.h);
    this.setInteractive(new Phaser.Geom.Rectangle(opts.w / 2, opts.h / 2, opts.w, opts.h), Phaser.Geom.Rectangle.Contains);

    this.on('pointerover', () => !this.disabledState && this.draw(false, true));
    this.on('pointerout', () => { this.isDown = false; this.draw(false); });
    this.on('pointerdown', () => {
      if (this.disabledState) return;
      this.isDown = true;
      this.draw(true);
      AudioManager.play('tap');
    });
    this.on('pointerup', () => {
      if (this.disabledState || !this.isDown) return;
      this.isDown = false;
      this.draw(false, true);
      scene.tweens.add({ targets: this, scaleX: 0.96, scaleY: 0.96, duration: 60, yoyo: true, onComplete: () => opts.onClick() });
    });

    scene.add.existing(this);
  }

  setDisabled(v: boolean) {
    this.disabledState = v;
    this.label.setAlpha(v ? 0.5 : 1);
    this.draw(false);
    return this;
  }

  setLabel(text: string) {
    this.label.setText((this.opts.icon ? this.opts.icon + '  ' : '') + text);
    return this;
  }

  private draw(down: boolean, hover = false) {
    const { w, h } = this.opts;
    const g = this.g;
    g.clear();
    const base = this.disabledState ? PALETTE.panelDark : this.opts.fill ?? PALETTE.panelLight;
    const accent = this.opts.accent ?? PALETTE.amber;
    panel(g, 0, 0, w, h, { fill: down ? PALETTE.panelDark : base, border: PALETTE.ink, accent });
    if (!down && !this.disabledState) {
      // bottom shadow lip gives a raised feel; removed on press.
      px(g, 1, h, w - 2, 1, PALETTE.ink, 0.6);
    }
    if (hover && !this.disabledState) px(g, 0, 0, w, h, PALETTE.cream, 0.06);
    this.label.setY(h / 2 + (down ? 1 : 0));
  }
}
