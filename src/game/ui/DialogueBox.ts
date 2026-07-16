import Phaser from 'phaser';
import { PALETTE, FONT, hex, MENU_W } from '../config';
import { panel, px } from '../render/pixel';
import { PixelButton } from './PixelButton';
import { CharacterPortrait, Expression } from './CharacterPortrait';
import type { Appearance } from '../types';

export interface DialogueChoice {
  label: string;
  onClick: () => void;
}

export interface DialogueConfig {
  title: string;
  body: string;
  speaker?: string;
  portrait?: { appearance: Appearance; kit: number; expr?: Expression };
  choices: DialogueChoice[];
  width?: number;
}

/**
 * A modal dialogue / event panel used for story events and interactions (§12,
 * §48). Renders a titled card with an optional character portrait and a stack
 * of choice buttons. Choices deliberately have no obvious "correct" answer.
 */
export class DialogueBox extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, cx: number, cy: number, cfg: DialogueConfig) {
    super(scene, 0, 0);
    const w = cfg.width ?? MENU_W - 24;
    const g = scene.add.graphics();
    this.add(g);

    // Measure body text height first.
    const bodyText = scene.add.text(0, 0, cfg.body, {
      fontFamily: FONT.body, fontSize: '9px', color: hex(PALETTE.ink),
      wordWrap: { width: w - 24 }, lineSpacing: 3, resolution: 3,
    });
    const hasPortrait = !!cfg.portrait;
    const portraitH = hasPortrait ? 60 : 0;
    const bodyH = bodyText.height;
    const btnH = 26;
    const btnGap = 6;
    const totalH = 34 + portraitH + bodyH + 12 + cfg.choices.length * (btnH + btnGap) + 12;
    const x = cx - w / 2;
    const y = cy - totalH / 2;

    // Panel (cream programme-style card).
    px(g, 0, 0, MENU_W, scene.scale.height, PALETTE.bgDeep, 0.6); // dim backdrop
    panel(g, x, y, w, totalH, { fill: PALETTE.paper, border: PALETTE.ink, accent: PALETTE.brick });
    px(g, x, y, w, 2, PALETTE.brick);

    // Title
    const title = scene.add.text(x + 10, y + 8, cfg.title.toUpperCase(), {
      fontFamily: FONT.heading, fontSize: '11px', color: hex(PALETTE.brickDim), fontStyle: 'bold', resolution: 3,
    });
    this.add(title);
    px(g, x + 10, y + 22, w - 20, 1, PALETTE.creamDim);

    let cursorY = y + 28;
    if (cfg.portrait) {
      const pt = new CharacterPortrait(scene, x + w / 2 - 24, cursorY, cfg.portrait.appearance, cfg.portrait.kit, cfg.portrait.expr ?? 'neutral', 1);
      this.add(pt);
      if (cfg.speaker) {
        const sp = scene.add.text(x + w / 2, cursorY + portraitH - 4, cfg.speaker, {
          fontFamily: FONT.heading, fontSize: '9px', color: hex(PALETTE.brick), fontStyle: 'bold', resolution: 3,
        }).setOrigin(0.5, 0);
        this.add(sp);
      }
      cursorY += portraitH + 4;
    }

    bodyText.setPosition(x + 12, cursorY);
    this.add(bodyText);
    cursorY += bodyH + 10;

    for (const choice of cfg.choices) {
      const btn = new PixelButton(scene, x + 12, cursorY, {
        w: w - 24, h: btnH, label: choice.label, fontSize: 9,
        fill: PALETTE.panel, textColor: PALETTE.cream, accent: PALETTE.amber,
        onClick: () => { choice.onClick(); },
      });
      this.add(btn);
      cursorY += btnH + btnGap;
    }

    scene.add.existing(this);
    this.setDepth(1000);
    // Pop-in animation.
    this.setScale(0.9);
    this.setAlpha(0);
    scene.tweens.add({ targets: this, scale: 1, alpha: 1, duration: 140, ease: 'Back.out' });
  }
}
