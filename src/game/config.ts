/**
 * Global tuning + presentation constants.
 *
 * Balancing values live here (and in the data/ files) rather than being
 * scattered through the scenes, per the development rules.
 */

export const SAVE_VERSION = 3;

/** Portrait canvas used for all menu / hub scenes. */
export const MENU_W = 270;
export const MENU_H = 480;

/** Landscape canvas used for the match scene (16:9). */
export const MATCH_W = 384;
export const MATCH_H = 216;

/** Restrained industrial-town palette (see prompt §31). Values are plain
 * numbers (no `as const`) so they pass freely as colour arguments. */
export const PALETTE: Record<string, number> = {
  bg: 0x10131f,
  bgDeep: 0x0a0d16,
  panel: 0x1c2740,
  panelDark: 0x141b2e,
  panelLight: 0x2a3859,
  ink: 0x0d1220,
  cream: 0xf2e6c8,
  creamDim: 0xc7b98f,
  paper: 0xe8dcc0,
  brick: 0x8a4a3c,
  brickDim: 0x5c3730,
  green: 0x3f7a4a,
  greenDim: 0x2c5636,
  greenWet: 0x244a2e,
  grass: 0x4f8f52,
  grassDark: 0x3d7040,
  amber: 0xe8a44c,
  amberDim: 0xb87a2e,
  gold: 0xf4c95d,
  bluegrey: 0x5a6b82,
  rain: 0x8fa4c4,
  danger: 0xd0564a,
  dangerDim: 0x8f3b34,
  good: 0x6fc17a,
  white: 0xf7f4ea,
  shadow: 0x000000,
  rivalRed: 0xc4413a,
};

/** Convert a 0xRRGGBB int to a CSS string (for Phaser text styles). */
export function hex(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}

/** Skin tones, hair colours etc. used by the character generator. */
export const SKIN_TONES = [0xf2c9a0, 0xe0a878, 0xc68642, 0x8d5524, 0x5c3a21, 0xf7d9bd];
export const HAIR_COLORS = [0x1a1410, 0x3a2a1a, 0x6b4423, 0xa5682a, 0xc9a24a, 0x8a8a8a, 0xd8d8d8, 0x2a2a2a];
export const EYE_COLORS = [0x3a2a1a, 0x2a5a8a, 0x3a7a4a, 0x6a6a6a];

export const FONT = {
  // A pixel font would ship as an asset; the fallback stack keeps things
  // crisp and legible for the vertical slice (see README known limitations).
  heading: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif',
  body: 'system-ui, "Segoe UI", Roboto, sans-serif',
  mono: '"Courier New", ui-monospace, monospace',
};

/** Weather types affect palette + subtle presentation. */
export type Weather = 'clear' | 'overcast' | 'rain' | 'heavyRain' | 'floodlit' | 'winter' | 'sunset';

export const WEATHERS: Weather[] = ['clear', 'overcast', 'rain', 'heavyRain', 'floodlit', 'winter', 'sunset'];
