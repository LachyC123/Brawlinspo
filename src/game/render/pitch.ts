import Phaser from 'phaser';
import { PALETTE, MATCH_W, MATCH_H, Weather } from '../config';
import { px, shade } from './pixel';

/** Pitch bounds used across match situations (attack is toward the top goal). */
export const PITCH = {
  top: 44, bottom: 206, left: 16, right: MATCH_W - 16,
  goalX1: 158, goalX2: 226, goalY: 40,
};

/**
 * Draws the stadium + pitch for a match (§28, §29). Grass tone, wear patterns
 * and stand detail scale with the club's facilities so the same ground visibly
 * improves as the club grows. Weather tints the palette.
 */
export function drawPitch(g: Phaser.GameObjects.Graphics, weather: Weather, facilities: number, primary: number) {
  const wet = weather === 'rain' || weather === 'heavyRain';
  const night = weather === 'floodlit';
  const grass = wet ? PALETTE.greenWet : weather === 'winter' ? shade(PALETTE.grass, -0.08) : PALETTE.grass;
  const grassDark = shade(grass, -0.12);

  // Sky / backdrop
  const sky = night ? 0x0d1220 : weather === 'sunset' ? 0x3a2a3a : weather === 'overcast' || wet ? 0x2a3346 : 0x3a5a7a;
  px(g, 0, 0, MATCH_W, PITCH.top, sky);

  // Stand behind the goal (detail grows with facilities)
  const standH = 30;
  px(g, 0, 8, MATCH_W, standH, PALETTE.panelDark);
  px(g, 0, 8, MATCH_W, 3, shade(PALETTE.panelDark, 0.15));
  // roof
  px(g, 0, 6, MATCH_W, 3, PALETTE.ink);
  // crowd blocks — denser + more colourful with higher facilities
  const density = 4 + Math.floor(facilities / 12);
  for (let x = 6; x < MATCH_W - 6; x += 6) {
    for (let r = 0; r < density && r < 4; r++) {
      const c = [primary, shade(primary, 0.2), PALETTE.cream, PALETTE.bluegrey, PALETTE.brick][(x + r) % 5];
      px(g, x, 14 + r * 5, 4, 3, c, 0.8);
    }
  }
  // advertising boards
  px(g, 0, 38, MATCH_W, 4, PALETTE.ink);
  for (let x = 4; x < MATCH_W; x += 40) px(g, x, 39, 34, 2, [PALETTE.amber, PALETTE.brick, PALETTE.bluegrey][(x / 40) % 3], 0.6);

  // Pitch grass with mowing stripes
  px(g, 0, PITCH.top, MATCH_W, MATCH_H - PITCH.top, grass);
  for (let y = PITCH.top; y < MATCH_H; y += 12) px(g, 0, y, MATCH_W, 6, grassDark, 0.25);

  // Worn goalmouth + centre patches (lower-league imperfection)
  if (facilities < 45) {
    px(g, PITCH.goalX1 + 6, PITCH.goalY + 8, 54, 14, shade(grass, -0.18), 0.6); // goalmouth mud
    px(g, MATCH_W / 2 - 12, 150, 24, 10, shade(grass, -0.15), 0.4);
  }

  // Painted lines
  const line = PALETTE.white;
  px(g, PITCH.left, PITCH.top + 2, PITCH.right - PITCH.left, 1, line, 0.7); // top-ish
  // penalty box
  px(g, PITCH.goalX1 - 24, PITCH.goalY + 2, 1, 40, line, 0.7);
  px(g, PITCH.goalX2 + 24, PITCH.goalY + 2, 1, 40, line, 0.7);
  px(g, PITCH.goalX1 - 24, PITCH.goalY + 42, (PITCH.goalX2 + 24) - (PITCH.goalX1 - 24), 1, line, 0.7);
  // six-yard
  px(g, PITCH.goalX1 + 6, PITCH.goalY + 2, 1, 18, line, 0.6);
  px(g, PITCH.goalX2 - 6, PITCH.goalY + 2, 1, 18, line, 0.6);
  px(g, PITCH.goalX1 + 6, PITCH.goalY + 20, (PITCH.goalX2 - 6) - (PITCH.goalX1 + 6), 1, line, 0.6);
  // penalty spot
  px(g, (PITCH.goalX1 + PITCH.goalX2) / 2, PITCH.goalY + 30, 2, 2, line, 0.8);
  // side lines
  px(g, PITCH.left, PITCH.top, 1, MATCH_H - PITCH.top, line, 0.5);
  px(g, PITCH.right, PITCH.top, 1, MATCH_H - PITCH.top, line, 0.5);

  // Goal + net
  px(g, PITCH.goalX1, PITCH.goalY - 6, PITCH.goalX2 - PITCH.goalX1, 8, PALETTE.white, 0.9);
  for (let x = PITCH.goalX1; x < PITCH.goalX2; x += 3) px(g, x, PITCH.goalY - 6, 1, 8, PALETTE.bluegrey, 0.4);
  px(g, PITCH.goalX1, PITCH.goalY - 6, PITCH.goalX2 - PITCH.goalX1, 1, PALETTE.white);

  // corner flags
  px(g, PITCH.left, PITCH.top, 1, 5, PALETTE.cream); px(g, PITCH.left + 1, PITCH.top, 3, 2, PALETTE.rivalRed);
  px(g, PITCH.right - 1, PITCH.top, 1, 5, PALETTE.cream); px(g, PITCH.right - 4, PITCH.top, 3, 2, PALETTE.rivalRed);

  // floodlight tint at night
  if (night) px(g, 0, PITCH.top, MATCH_W, MATCH_H - PITCH.top, PALETTE.gold, 0.05);
  if (weather === 'sunset') px(g, 0, 0, MATCH_W, MATCH_H, PALETTE.amber, 0.06);
}
