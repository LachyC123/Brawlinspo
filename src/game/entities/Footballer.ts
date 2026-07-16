import Phaser from 'phaser';
import { SKIN_TONES, HAIR_COLORS } from '../config';
import type { Appearance } from '../types';
import { px, shade } from '../render/pixel';

export type Pose = 'idle' | 'run1' | 'run2' | 'kick' | 'wind' | 'celebrate' | 'slide' | 'fall';

/**
 * A pixel-art footballer for match scenes (§25, §26). Built from layered blocks
 * — head, hair, shirt, shorts, socks, boots + shadow — so every player reads
 * from silhouette. ~22px tall. Origin is at the feet centre; the figure is
 * drawn upward. Animation is driven by swapping poses.
 */
export class Footballer extends Phaser.GameObjects.Container {
  private g: Phaser.GameObjects.Graphics;
  private appr: Appearance;
  private kit: number;
  private shorts: number;
  private pose: Pose = 'idle';
  private facing: 1 | -1 = 1;
  private runTimer = 0;
  private moving = false;
  name2: string;

  constructor(scene: Phaser.Scene, x: number, y: number, appearance: Appearance, kit: number, shorts: number = 0x1a1a2a, name = '') {
    super(scene, x, y);
    this.appr = appearance;
    this.kit = kit;
    this.shorts = shorts;
    this.name2 = name;
    this.g = scene.add.graphics();
    this.add(this.g);
    this.draw();
    scene.add.existing(this);
  }

  setPose(p: Pose) { if (this.pose !== p) { this.pose = p; this.draw(); } return this; }
  setFacing(f: 1 | -1) { if (this.facing !== f) { this.facing = f; this.draw(); } return this; }
  setMoving(m: boolean) { this.moving = m; if (!m) this.setPose('idle'); return this; }

  update(delta: number) {
    if (this.moving) {
      this.runTimer += delta;
      if (this.runTimer > 120) {
        this.runTimer = 0;
        this.setPose(this.pose === 'run1' ? 'run2' : 'run1');
      }
    }
  }

  private draw() {
    const g = this.g;
    g.clear();
    const skin = SKIN_TONES[this.appr.skinTone % SKIN_TONES.length];
    const skinSh = shade(skin, -0.12);
    const hair = HAIR_COLORS[this.appr.hairColor % HAIR_COLORS.length];
    const kit = this.kit;
    const kitSh = shade(kit, -0.2);
    const bootC = 0x161616;
    const sockC = shade(kit, 0.05);
    const f = this.facing;
    const P = (x: number, y: number, w: number, h: number, c: number, a = 1) => px(g, x * f - (f < 0 ? w : 0), y, w, h, c, a);

    // Shadow (flattened, always at feet)
    px(g, -6, -1, 12, 3, 0x000000, 0.28);

    const build = this.appr.build;
    const shirtW = 8 + Math.floor(build / 2);
    const shirtX = -shirtW / 2;

    // Leg / boot positions vary by pose
    let lLeg = -2, rLeg = 1, legY = -8, bootDrop = 0;
    switch (this.pose) {
      case 'run1': lLeg = -4; rLeg = 2; break;
      case 'run2': lLeg = -1; rLeg = 4; break;
      case 'kick': rLeg = 6; bootDrop = -2; break;
      case 'wind': rLeg = -5; break;
      case 'slide': legY = -4; lLeg = -6; rLeg = 4; break;
      case 'fall': legY = -3; break;
    }

    if (this.pose === 'fall') {
      // horizontal-ish tumble
      P(-6, -6, 14, 5, kit);
      P(6, -7, 5, 5, skin); // head to the side
      P(-8, -3, 4, 3, bootC);
      return;
    }

    // Socks + boots (two legs)
    P(lLeg, legY, 3, 6, sockC); P(lLeg, legY + 6, 4, 2, bootC);
    P(rLeg, legY + bootDrop, 3, 6, sockC); P(rLeg, legY + bootDrop + 6, 4, 2, bootC);

    // Shorts
    P(shirtX, legY - 3, shirtW, 4, this.shorts);
    P(shirtX, legY - 3, shirtW, 1, shade(this.shorts, 0.2));

    // Shirt / torso
    const torsoY = legY - 11;
    P(shirtX, torsoY, shirtW, 8, kit);
    P(shirtX, torsoY, shirtW, 2, shade(kit, 0.15)); // shoulder highlight
    P(shirtX, torsoY + 5, shirtW, 3, kitSh, 0.6); // lower shade
    // number hint
    P(-1, torsoY + 3, 2, 3, shade(kit, 0.3));

    // Arms (pose-dependent)
    if (this.pose === 'celebrate') {
      P(shirtX - 2, torsoY - 4, 2, 6, skin); P(shirtX + shirtW, torsoY - 4, 2, 6, skin);
    } else if (this.pose === 'kick' || this.pose === 'wind') {
      P(shirtX - 2, torsoY + 2, 2, 5, skin); P(shirtX + shirtW, torsoY, 2, 5, skin);
    } else {
      P(shirtX - 2, torsoY + 2, 2, 6, skin); P(shirtX + shirtW, torsoY + 2, 2, 6, skin);
    }

    // Neck + head
    const headY = torsoY - 6;
    P(-1, headY + 5, 3, 2, skinSh);
    P(-3, headY, 6, 6, skin);
    P(-3, headY, 6, 2, shade(skin, 0.08));
    // simple face hint (facing away-ish): small hair over top
    this.drawHair(P, headY, hair);
  }

  private drawHair(P: (x: number, y: number, w: number, h: number, c: number, a?: number) => void, headY: number, hair: number) {
    const style = this.appr.hairStyle % 7;
    switch (style) {
      case 6: P(-2, headY - 3, 4, 4, hair); break; // crest
      case 3: P(-4, headY - 1, 8, 4, hair); P(-4, headY, 2, 5, hair); break; // long
      case 1: P(-4, headY - 2, 8, 4, hair); break; // curly
      case 5: P(-3, headY - 1, 2, 2, hair); P(1, headY - 1, 2, 2, hair); break; // receding
      default: P(-3, headY - 1, 6, 3, hair);
    }
  }
}
