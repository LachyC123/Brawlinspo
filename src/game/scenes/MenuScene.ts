import { BaseScene } from './BaseScene';
import { MENU_W, MENU_H, PALETTE, FONT, hex } from '../config';
import { px, panel, ditherGradient } from '../render/pixel';
import { PixelButton } from '../ui/PixelButton';
import { SaveSystem } from '../systems/SaveSystem';
import { Store } from '../state';
import { AudioManager } from '../systems/AudioManager';

/**
 * Title screen (§22). Atmospheric rain over the Foundry Ground, the game logo,
 * and three save slots for Continue / New Career, plus Settings and save
 * import.
 */
export class MenuScene extends BaseScene {
  private rain!: Phaser.GameObjects.Graphics;
  private drops: { x: number; y: number; s: number }[] = [];

  constructor() { super('Menu'); }

  create() {
    this.ensureMenuSize();
    this.fadeIn();
    AudioManager.resume();

    // Sky + stadium silhouette
    const g = this.add.graphics();
    ditherGradient(g, 0, 0, MENU_W, MENU_H, 0x243247, PALETTE.bgDeep);
    this.drawStadiumSilhouette(g);

    // Rain
    this.rain = this.add.graphics();
    for (let i = 0; i < 60; i++) this.drops.push({ x: Math.random() * MENU_W, y: Math.random() * MENU_H, s: 1 + Math.random() * 1.5 });

    // Logo
    this.drawLogo();

    // Slots
    const summaries = SaveSystem.summaries();
    let y = 250;
    const label = this.add.text(MENU_W / 2, y - 14, 'CAREER SLOTS', { fontFamily: FONT.heading, fontSize: '9px', color: hex(PALETTE.amber), fontStyle: 'bold', resolution: 3 }).setOrigin(0.5);
    void label;
    for (const sum of summaries) {
      this.slotRow(sum, y);
      y += 44;
    }

    // Footer buttons
    new PixelButton(this, 20, MENU_H - 36, { w: 110, h: 26, label: 'SETTINGS', icon: '⚙', fontSize: 9, onClick: () => this.openSettings() });
    new PixelButton(this, MENU_W - 130, MENU_H - 36, { w: 110, h: 26, label: 'IMPORT SAVE', fontSize: 9, onClick: () => this.importSave() });

    this.add.text(MENU_W / 2, MENU_H - 6, 'v0.1 — vertical slice', { fontFamily: FONT.body, fontSize: '7px', color: hex(PALETTE.bluegrey), resolution: 3 }).setOrigin(0.5, 1);
  }

  private slotRow(sum: ReturnType<typeof SaveSystem.summaries>[number], y: number) {
    const x = 16, w = MENU_W - 32, h = 38;
    const g = this.add.graphics();
    panel(g, x, y, w, h, { fill: sum.exists ? PALETTE.panel : PALETTE.panelDark, border: PALETTE.ink, accent: sum.exists ? PALETTE.amber : PALETTE.bluegrey });

    if (sum.exists) {
      this.add.text(x + 8, y + 6, sum.name!, { fontFamily: FONT.heading, fontSize: '10px', color: hex(PALETTE.cream), fontStyle: 'bold', resolution: 3 });
      this.add.text(x + 8, y + 20, `${sum.club} · S${sum.season} W${sum.week}`, { fontFamily: FONT.body, fontSize: '8px', color: hex(PALETTE.creamDim), resolution: 3 });
      new PixelButton(this, x + w - 62, y + 7, { w: 40, h: 24, label: 'PLAY', fontSize: 9, accent: PALETTE.good, onClick: () => this.continueCareer(sum.slot) });
      new PixelButton(this, x + w - 20, y + 7, { w: 16, h: 24, label: '✕', fontSize: 9, fill: PALETTE.dangerDim, onClick: () => this.deleteSlot(sum.slot) });
    } else {
      this.add.text(x + 8, y + h / 2, `Slot ${sum.slot + 1} · Empty`, { fontFamily: FONT.body, fontSize: '9px', color: hex(PALETTE.bluegrey), resolution: 3 }).setOrigin(0, 0.5);
      new PixelButton(this, x + w - 96, y + 7, { w: 88, h: 24, label: 'NEW CAREER', fontSize: 9, accent: PALETTE.amber, onClick: () => this.newCareer(sum.slot) });
    }
  }

  private continueCareer(slot: number) {
    const state = SaveSystem.load(slot);
    if (!state) { this.toast('Save could not be read.', PALETTE.danger); return; }
    Store.set(state, slot);
    AudioManager.update(state.settings);
    this.goTo('Home');
  }

  private newCareer(slot: number) {
    this.goTo('CareerCreation', { slot });
  }

  private deleteSlot(slot: number) {
    if (!confirm('Delete this career permanently?')) return;
    SaveSystem.delete(slot);
    this.scene.restart();
  }

  private openSettings() {
    // Settings needs an active career for its settings object; if none, make a scratch one.
    if (!Store.state) {
      this.toast('Start a career to change settings.', PALETTE.creamDim);
      return;
    }
    this.goTo('Settings', { from: 'Menu' });
  }

  private importSave() {
    const json = prompt('Paste exported career JSON:');
    if (!json) return;
    const state = SaveSystem.importJSON(json);
    if (!state) { this.toast('Invalid save data.', PALETTE.danger); return; }
    const summaries = SaveSystem.summaries();
    const slot = summaries.find((s) => !s.exists)?.slot ?? 0;
    SaveSystem.save(slot, state);
    this.toast(`Imported to slot ${slot + 1}.`, PALETTE.good);
    this.time.delayedCall(700, () => this.scene.restart());
  }

  private drawLogo() {
    const cx = MENU_W / 2;
    const g = this.add.graphics();
    // banner plate
    panel(g, 24, 150, MENU_W - 48, 70, { fill: PALETTE.panelDark, border: PALETTE.ink, accent: PALETTE.amber });
    px(g, 24, 150, MENU_W - 48, 2, PALETTE.gold);
    this.add.text(cx, 172, 'LOCAL', { fontFamily: FONT.heading, fontSize: '26px', color: hex(PALETTE.cream), fontStyle: 'bold', resolution: 3 }).setOrigin(0.5);
    this.add.text(cx, 198, 'LEGEND', { fontFamily: FONT.heading, fontSize: '26px', color: hex(PALETTE.gold), fontStyle: 'bold', resolution: 3 }).setOrigin(0.5);
    this.add.text(cx, 226, 'From Muddy Pitches to Football Immortality', {
      fontFamily: FONT.body, fontSize: '8px', color: hex(PALETTE.creamDim), fontStyle: 'italic', resolution: 3,
    }).setOrigin(0.5);
  }

  private drawStadiumSilhouette(g: Phaser.GameObjects.Graphics) {
    // Foundry Ground: one stand, floodlights, terraced houses.
    const groundY = 130;
    px(g, 0, groundY, MENU_W, MENU_H - groundY, PALETTE.ink, 0.4);
    // stand
    px(g, 30, groundY - 26, 120, 26, PALETTE.panelDark);
    px(g, 30, groundY - 26, 120, 3, PALETTE.brickDim);
    // floodlights
    px(g, 40, groundY - 60, 3, 34, PALETTE.ink);
    px(g, 36, groundY - 64, 11, 6, PALETTE.amber, 0.6);
    px(g, 150, groundY - 60, 3, 34, PALETTE.ink);
    px(g, 146, groundY - 64, 11, 6, PALETTE.amber, 0.6);
    // pitch glow
    px(g, 20, groundY, MENU_W - 40, 8, PALETTE.greenDim, 0.5);
  }

  update() {
    this.rain.clear();
    for (const d of this.drops) {
      d.y += d.s * 3;
      d.x -= d.s * 0.6;
      if (d.y > MENU_H) { d.y = -4; d.x = Math.random() * MENU_W + 20; }
      px(this.rain, d.x, d.y, 1, 3, PALETTE.rain, 0.35);
    }
  }
}
