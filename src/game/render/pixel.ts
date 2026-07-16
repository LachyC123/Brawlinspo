import Phaser from 'phaser';
import { PALETTE } from '../config';

/**
 * Low-level pixel-art drawing helpers. The canvas already renders at a low
 * internal resolution with nearest-neighbour scaling, so a 1-unit fillRect is
 * one crisp art pixel. Everything is built from these clustered blocks (§32)
 * rather than smooth gradients.
 */

export function px(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number, alpha = 1) {
  g.fillStyle(color, alpha);
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** A slightly distressed UI panel: dark fill, pixel border, top highlight. */
export function panel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, opts: { fill?: number; border?: number; accent?: number } = {}) {
  const fill = opts.fill ?? PALETTE.panel;
  const border = opts.border ?? PALETTE.ink;
  px(g, x, y, w, h, fill);
  // border
  px(g, x, y, w, 1, border);
  px(g, x, y + h - 1, w, 1, border);
  px(g, x, y, 1, h, border);
  px(g, x + w - 1, y, 1, h, border);
  // inner top highlight
  px(g, x + 1, y + 1, w - 2, 1, PALETTE.panelLight, 0.5);
  if (opts.accent !== undefined) px(g, x, y, w, 1, opts.accent);
}

/** Cream "paper" card used for news / programme UI (§33). */
export function paperCard(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, accent: number = PALETTE.brick) {
  px(g, x, y, w, h, PALETTE.paper);
  px(g, x, y, w, 2, accent);
  px(g, x, y, 1, h, PALETTE.creamDim);
  px(g, x, y + h - 1, w, 1, PALETTE.creamDim);
  px(g, x + w - 1, y, 1, h, PALETTE.creamDim);
  // subtle paper speckle
  for (let i = 0; i < Math.floor((w * h) / 260); i++) {
    const rx = x + 3 + Math.floor(Math.random() * (w - 6));
    const ry = y + 4 + Math.floor(Math.random() * (h - 8));
    px(g, rx, ry, 1, 1, PALETTE.creamDim, 0.35);
  }
}

/** Dithered vertical gradient between two tones (blocky, not smooth). */
export function ditherGradient(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, top: number, bottom: number) {
  const steps = 6;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const col = i < steps / 2 ? top : bottom;
    const sy = y + Math.floor((h / steps) * i);
    const sh = Math.ceil(h / steps);
    px(g, x, sy, w, sh, col, 1);
    // dither seam
    if (i > 0 && i < steps) {
      for (let dx = 0; dx < w; dx += 2) {
        px(g, x + dx + (i % 2), sy, 1, 1, top, 0.35);
      }
    }
  }
}

/** Rounded pixel corner mask: erase the four corner pixels for a softer look. */
export function softCorners(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, bg: number) {
  px(g, x, y, 1, 1, bg);
  px(g, x + w - 1, y, 1, 1, bg);
  px(g, x, y + h - 1, 1, 1, bg);
  px(g, x + w - 1, y + h - 1, 1, 1, bg);
}

/** Lighten / darken an 0xRRGGBB colour by amount (-1..1). */
export function shade(color: number, amt: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return (f(r) << 16) | (f(g) << 8) | f(b);
}
