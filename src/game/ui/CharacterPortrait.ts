import Phaser from 'phaser';
import type { Appearance } from '../types';
import { SKIN_TONES, HAIR_COLORS, EYE_COLORS, PALETTE } from '../config';
import { px, shade } from '../render/pixel';

export type Expression = 'neutral' | 'happy' | 'excited' | 'angry' | 'jealous' | 'worried' | 'tired' | 'injured' | 'proud' | 'disappointed';

/**
 * Modular pixel-art bust portrait (§26). Assembled from layered shapes — face,
 * skin, eyes, brows, nose, mouth, hair, facial hair — driven by the character's
 * Appearance and current emotional Expression. Distinct silhouettes come from
 * varied hair styles and builds.
 */
export class CharacterPortrait extends Phaser.GameObjects.Container {
  private g: Phaser.GameObjects.Graphics;
  private appr: Appearance;
  private kit: number;
  private scaleN: number;

  constructor(scene: Phaser.Scene, x: number, y: number, appearance: Appearance, kitColor: number, expr: Expression = 'neutral', scaleN = 1) {
    super(scene, x, y);
    this.appr = appearance;
    this.kit = kitColor;
    this.scaleN = scaleN;
    this.g = scene.add.graphics();
    this.add(this.g);
    this.render(expr);
    scene.add.existing(this);
  }

  setExpression(expr: Expression) {
    this.render(expr);
    return this;
  }

  /** Draw the full bust into the local graphics. Origin is top-left of a 48x54 box. */
  private render(expr: Expression) {
    const g = this.g;
    g.clear();
    const S = this.scaleN;
    const P = (x: number, y: number, w: number, h: number, c: number, a = 1) => px(g, x * S, y * S, w * S, h * S, c, a);

    const skin = SKIN_TONES[this.appr.skinTone % SKIN_TONES.length];
    const skinShade = shade(skin, -0.12);
    const skinLight = shade(skin, 0.1);
    const hair = HAIR_COLORS[this.appr.hairColor % HAIR_COLORS.length];
    const hairShade = shade(hair, -0.15);
    const eye = EYE_COLORS[this.appr.eyeColor % EYE_COLORS.length];
    const kit = this.kit;
    const kitShade = shade(kit, -0.18);

    // --- Shoulders / shirt (build affects width) ---
    const build = this.appr.build; // 0..4
    const shW = 40 + build * 3;
    const shX = 24 - shW / 2;
    P(shX, 44, shW, 12, kit);
    P(shX, 44, shW, 2, shade(kit, 0.12));
    P(24 - 5, 44, 10, 4, kitShade); // collar shadow under neck
    // simple club stripe
    P(24 - 1, 44, 2, 12, shade(kit, 0.15));

    // --- Neck ---
    P(20, 40, 8, 6, skinShade);
    P(20, 40, 8, 2, skin);

    // --- Head base ---
    P(14, 14, 20, 24, skin);
    P(14, 14, 20, 3, skinLight); // forehead light
    P(13, 18, 1, 14, skin); // ears
    P(34, 18, 1, 14, skin);
    // jaw shading
    P(15, 34, 18, 3, skinShade, 0.6);
    // cheek shadow sides
    P(14, 20, 2, 14, skinShade, 0.4);
    P(32, 20, 2, 14, skinShade, 0.4);

    // --- Brows + eyes (expression) ---
    const browY = expr === 'angry' || expr === 'jealous' ? 23 : 22;
    // eyes
    const eyeY = 24;
    const closed = expr === 'tired' || expr === 'injured';
    P(17, eyeY, 5, 3, PALETTE.white);
    P(27, eyeY, 5, 3, PALETTE.white);
    if (closed) {
      P(17, eyeY + 1, 5, 1, skinShade);
      P(27, eyeY + 1, 5, 1, skinShade);
    } else {
      const pupilOff = expr === 'jealous' ? 1 : 0;
      P(19 + pupilOff, eyeY, 2, 3, eye);
      P(28 + pupilOff, eyeY, 2, 3, eye);
    }
    // brows angle
    if (expr === 'angry' || expr === 'jealous') {
      P(17, browY, 5, 1, hairShade); P(18, browY - 1, 3, 1, hairShade);
      P(27, browY, 5, 1, hairShade); P(27, browY - 1, 3, 1, hairShade);
    } else if (expr === 'worried' || expr === 'disappointed') {
      P(17, browY - 1, 4, 1, hairShade); P(18, browY, 3, 1, hairShade);
      P(28, browY - 1, 4, 1, hairShade); P(27, browY, 3, 1, hairShade);
    } else {
      P(17, browY, 5, 1, hairShade);
      P(27, browY, 5, 1, hairShade);
    }

    // --- Nose ---
    P(23, 28, 2, 4, skinShade);
    P(23, 31, 3, 1, skinShade);

    // --- Mouth (expression) ---
    const mouthY = 35;
    switch (expr) {
      case 'happy':
      case 'proud':
        P(20, mouthY, 8, 1, PALETTE.brickDim); P(19, mouthY - 1, 1, 1, PALETTE.brickDim); P(28, mouthY - 1, 1, 1, PALETTE.brickDim); break;
      case 'excited':
        P(21, mouthY - 1, 6, 3, PALETTE.ink); P(21, mouthY, 6, 1, PALETTE.white); break;
      case 'angry':
        P(20, mouthY + 1, 8, 1, PALETTE.brickDim); P(19, mouthY, 1, 1, PALETTE.brickDim); P(28, mouthY, 1, 1, PALETTE.brickDim); break;
      case 'worried':
      case 'disappointed':
      case 'injured':
        P(20, mouthY + 1, 8, 1, PALETTE.brickDim); P(19, mouthY + 2, 1, 1, PALETTE.brickDim); P(28, mouthY + 2, 1, 1, PALETTE.brickDim); break;
      case 'jealous':
        P(20, mouthY, 7, 1, PALETTE.brickDim); P(26, mouthY - 1, 1, 1, PALETTE.brickDim); break;
      case 'tired':
        P(21, mouthY, 5, 1, PALETTE.brickDim); break;
      default:
        P(20, mouthY, 8, 1, PALETTE.brickDim);
    }

    // --- Hair (style variants for distinct silhouettes) ---
    this.drawHair(P, hair, hairShade);

    // Facial hair for certain styles / builds (adds silhouette variety).
    if (this.appr.hairStyle === 5) {
      P(16, 33, 16, 4, hairShade); // full beard
      P(15, 30, 3, 6, hairShade); P(30, 30, 3, 6, hairShade);
    } else if (this.appr.hairStyle === 2) {
      P(19, 33, 10, 2, hairShade); // stubble/goatee
    }

    // --- expression overlays ---
    if (expr === 'injured') { P(15, 17, 5, 2, PALETTE.danger, 0.7); } // graze
    if (expr === 'tired') { P(17, 27, 5, 1, PALETTE.bluegrey, 0.5); P(27, 27, 5, 1, PALETTE.bluegrey, 0.5); }
    if (expr === 'excited' || expr === 'happy') { P(15, 30, 3, 2, PALETTE.brick, 0.25); P(30, 30, 3, 2, PALETTE.brick, 0.25); } // blush
  }

  private drawHair(P: (x: number, y: number, w: number, h: number, c: number, a?: number) => void, hair: number, hairShade: number) {
    const style = this.appr.hairStyle % 7;
    switch (style) {
      case 0: // short crop
        P(14, 11, 20, 6, hair); P(13, 13, 2, 6, hair); P(33, 13, 2, 6, hair); P(14, 11, 20, 2, hairShade); break;
      case 1: // curly top
        P(13, 9, 22, 7, hair); P(12, 12, 3, 6, hair); P(33, 12, 3, 6, hair);
        P(15, 8, 4, 2, hair); P(22, 7, 4, 2, hair); P(28, 8, 4, 2, hair); break;
      case 2: // buzz + fade
        P(15, 12, 18, 4, hair); P(15, 12, 18, 1, hairShade); break;
      case 3: // long / swept
        P(13, 10, 22, 8, hair); P(12, 12, 2, 14, hair); P(34, 12, 2, 14, hair); P(13, 10, 22, 2, hairShade); break;
      case 4: // side part
        P(14, 10, 20, 6, hair); P(14, 10, 8, 2, hairShade); P(13, 13, 2, 7, hair); break;
      case 5: // bald-ish / receding (paired with beard)
        P(15, 12, 6, 3, hair); P(27, 12, 6, 3, hair); P(13, 15, 2, 8, hair); P(33, 15, 2, 8, hair); break;
      case 6: // mohawk-ish crest
        P(21, 6, 6, 10, hair); P(20, 10, 8, 4, hair); P(21, 6, 6, 2, hairShade); break;
    }
  }
}
