import { BaseScene } from './BaseScene';
import { MENU_W, MENU_H, PALETTE, FONT, hex } from '../config';
import { px, ditherGradient } from '../render/pixel';
import { PixelButton } from '../ui/PixelButton';
import { Store } from '../state';
import { AudioManager } from '../systems/AudioManager';

/**
 * Opening sequence (§47). Four short pixel-art beats over ~25s, fully
 * skippable, ending on the LOCAL LEGEND title card before the home hub.
 */
export class OpeningScene extends BaseScene {
  private layer!: Phaser.GameObjects.Graphics;
  private rain!: Phaser.GameObjects.Graphics;
  private drops: { x: number; y: number; s: number }[] = [];
  private caption?: Phaser.GameObjects.Text;
  private done = false;

  constructor() { super('Opening'); }

  create() {
    this.ensureMenuSize();
    this.fadeIn();
    this.layer = this.add.graphics();
    this.rain = this.add.graphics();
    for (let i = 0; i < 70; i++) this.drops.push({ x: Math.random() * MENU_W, y: Math.random() * MENU_H, s: 1 + Math.random() * 1.6 });
    this.caption = this.add.text(MENU_W / 2, MENU_H - 60, '', {
      fontFamily: FONT.body, fontSize: '10px', color: hex(PALETTE.cream), align: 'center',
      wordWrap: { width: MENU_W - 40 }, backgroundColor: 'rgba(10,13,22,0.6)', padding: { x: 6, y: 4 }, resolution: 3,
    }).setOrigin(0.5).setDepth(10);

    new PixelButton(this, MENU_W - 62, 8, { w: 54, h: 20, label: 'SKIP ›', fontSize: 8, onClick: () => this.finish() }).setDepth(20);

    this.sequence();
  }

  private sequence() {
    const steps: (() => void)[] = [
      () => { this.sceneRain(); this.say('Rain falls over Greywick. Terraced streets, an old chimney, and a football club the town can’t afford to lose.'); AudioManager.crowd(0.15); },
      () => { this.sceneFloodlights(); this.say('The Foundry Ground’s floodlights flicker on. A small crowd gathers beneath umbrellas.'); },
      () => { this.sceneTunnel(); this.say('You wait in the narrow tunnel in the Rovers kit. The captain turns:\n\n“Out there, nobody knows your name.”'); AudioManager.play('whistle'); },
      () => { this.sceneWalkout(); this.say(''); AudioManager.crowd(0.5); AudioManager.play('cheer'); this.titleCard(); },
    ];
    let i = 0;
    const run = () => {
      if (this.done) return;
      steps[i]();
      i++;
      if (i < steps.length) this.time.delayedCall(6000, run);
      else this.time.delayedCall(4500, () => this.finish());
    };
    run();
  }

  private say(text: string) {
    if (!this.caption) return;
    this.caption.setText(text).setAlpha(0);
    this.tweens.add({ targets: this.caption, alpha: 1, duration: 500 });
  }

  private sceneRain() {
    const g = this.layer; g.clear();
    ditherGradient(g, 0, 0, MENU_W, MENU_H, 0x1c2740, PALETTE.bgDeep);
    // terraced houses
    for (let x = 0; x < MENU_W; x += 26) {
      px(g, x, 260, 24, 120, PALETTE.brickDim);
      px(g, x, 258, 24, 3, 0x3a221c);
      for (let wy = 270; wy < 360; wy += 26) { px(g, x + 5, wy, 5, 7, PALETTE.amber, 0.5); px(g, x + 14, wy, 5, 7, PALETTE.bgDeep); }
    }
    px(g, 200, 120, 12, 160, 0x2a1a16); // chimney
    px(g, 198, 116, 16, 5, PALETTE.brickDim);
    px(g, 0, 375, MENU_W, 40, PALETTE.ink, 0.6); // wet road
  }

  private sceneFloodlights() {
    const g = this.layer; g.clear();
    ditherGradient(g, 0, 0, MENU_W, MENU_H, 0x141b2e, PALETTE.bgDeep);
    // stadium stand
    px(g, 30, 220, 210, 90, PALETTE.panelDark);
    px(g, 30, 220, 210, 4, PALETTE.brickDim);
    // floodlight pylons + glow
    [50, 210].forEach((fx) => {
      px(g, fx, 120, 4, 110, PALETTE.ink);
      px(g, fx - 8, 110, 20, 12, PALETTE.gold, 0.85);
      // light cone
      for (let r = 0; r < 6; r++) px(g, fx - 8 - r * 6, 122 + r * 14, 20 + r * 12, 12, PALETTE.gold, 0.06);
    });
    // crowd + umbrellas
    for (let x = 40; x < 236; x += 12) { px(g, x, 300, 8, 6, PALETTE.ink); px(g, x - 1, 296, 10, 3, [PALETTE.brick, PALETTE.bluegrey, PALETTE.greenDim][x % 3]); }
    px(g, 20, 320, MENU_W - 40, 20, PALETTE.greenWet); // pitch
  }

  private sceneTunnel() {
    const g = this.layer; g.clear();
    px(g, 0, 0, MENU_W, MENU_H, PALETTE.ink);
    // tunnel walls perspective
    for (let i = 0; i < 8; i++) { const inset = i * 14; px(g, inset, inset, MENU_W - inset * 2, MENU_H - inset * 2, i % 2 ? 0x141b2e : 0x10131f); }
    // light at the end
    px(g, MENU_W / 2 - 24, MENU_H / 2 - 40, 48, 80, PALETTE.amber, 0.5);
    px(g, MENU_W / 2 - 16, MENU_H / 2 - 30, 32, 60, PALETTE.gold, 0.6);
    // two player silhouettes
    px(g, MENU_W / 2 - 40, MENU_H / 2 - 20, 16, 60, 0x0a0d16); // captain
    px(g, MENU_W / 2 + 22, MENU_H / 2 - 16, 15, 56, 0x0a0d16); // you
  }

  private sceneWalkout() {
    const g = this.layer; g.clear();
    ditherGradient(g, 0, 0, MENU_W, MENU_H, PALETTE.gold, PALETTE.amberDim);
    px(g, 0, 0, MENU_W, MENU_H, PALETTE.white, 0.15);
    // pitch reveal
    px(g, 0, 300, MENU_W, MENU_H - 300, PALETTE.grass);
    for (let x = 0; x < MENU_W; x += 20) px(g, x, 300, 10, MENU_H - 300, PALETTE.grassDark, 0.3);
  }

  private titleCard() {
    const t1 = this.add.text(MENU_W / 2, MENU_H / 2 - 20, 'LOCAL LEGEND', { fontFamily: FONT.heading, fontSize: '24px', color: hex(PALETTE.ink), fontStyle: 'bold', resolution: 3 }).setOrigin(0.5).setAlpha(0).setDepth(15);
    this.tweens.add({ targets: t1, alpha: 1, scale: { from: 1.2, to: 1 }, duration: 800, ease: 'Back.out' });
  }

  private finish() {
    if (this.done) return;
    this.done = true;
    AudioManager.crowd(0);
    // Mark first-time so Home shows the tutorial.
    this.goTo('Home', { firstTime: true });
  }

  update() {
    this.rain.clear();
    for (const d of this.drops) {
      d.y += d.s * 3.4; d.x -= d.s * 0.7;
      if (d.y > MENU_H) { d.y = -4; d.x = Math.random() * MENU_W + 20; }
      px(this.rain, d.x, d.y, 1, 3, PALETTE.rain, 0.3);
    }
  }
}
