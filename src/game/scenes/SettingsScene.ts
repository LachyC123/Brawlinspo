import { BaseScene } from './BaseScene';
import { MENU_W, MENU_H, PALETTE, FONT, hex } from '../config';
import { panel, px } from '../render/pixel';
import { PixelButton } from '../ui/PixelButton';
import { Store } from '../state';
import { SaveSystem } from '../systems/SaveSystem';
import { AudioManager } from '../systems/AudioManager';
import type { SettingsData } from '../types';

/** Settings + accessibility (§45). */
export class SettingsScene extends BaseScene {
  private from = 'Home';
  constructor() { super('Settings'); }

  create(data: { from?: string } = {}) {
    this.ensureMenuSize();
    this.fadeIn();
    this.from = data.from ?? 'Home';
    this.drawBackdrop(false);
    this.header('SETTINGS', () => this.back());
    this.render();
  }

  private render() {
    this.children.getByName('settingsBody')?.destroy();
    const body = this.add.container(0, 0).setName('settingsBody');
    const s = Store.get().settings;
    let y = 44;

    const toggleRow = (label: string, val: boolean, onToggle: () => void) => {
      const g = this.add.graphics();
      panel(g, 12, y, MENU_W - 24, 26, { fill: PALETTE.panel, border: PALETTE.ink });
      body.add(g);
      body.add(this.add.text(20, y + 8, label, { fontFamily: FONT.body, fontSize: '9px', color: hex(PALETTE.cream), resolution: 3 }));
      const btn = new PixelButton(this, MENU_W - 68, y + 3, { w: 52, h: 20, label: val ? 'ON' : 'OFF', fontSize: 9, accent: val ? PALETTE.good : PALETTE.bluegrey, fill: val ? PALETTE.greenDim : PALETTE.panelDark, onClick: () => { onToggle(); this.persist(); this.render(); } });
      body.add(btn);
      y += 30;
    };

    const stepRow = (label: string, value: string, onDown: () => void, onUp: () => void) => {
      const g = this.add.graphics();
      panel(g, 12, y, MENU_W - 24, 26, { fill: PALETTE.panel, border: PALETTE.ink });
      body.add(g);
      body.add(this.add.text(20, y + 8, label, { fontFamily: FONT.body, fontSize: '9px', color: hex(PALETTE.cream), resolution: 3 }));
      body.add(this.add.text(MENU_W / 2 + 30, y + 8, value, { fontFamily: FONT.mono, fontSize: '9px', color: hex(PALETTE.amber), resolution: 3 }).setOrigin(0.5, 0));
      body.add(new PixelButton(this, MENU_W - 70, y + 3, { w: 20, h: 20, label: '‹', fontSize: 12, onClick: () => { onDown(); this.persist(); this.render(); } }));
      body.add(new PixelButton(this, MENU_W - 30, y + 3, { w: 20, h: 20, label: '›', fontSize: 12, onClick: () => { onUp(); this.persist(); this.render(); } }));
      y += 30;
    };

    toggleRow('Music', s.music, () => (s.music = !s.music));
    toggleRow('Sound Effects', s.sfx, () => (s.sfx = !s.sfx));
    stepRow('Volume', `${Math.round(s.volume * 100)}%`, () => (s.volume = Math.max(0, +(s.volume - 0.1).toFixed(1))), () => (s.volume = Math.min(1, +(s.volume + 0.1).toFixed(1))));
    toggleRow('Reduced Motion', s.reducedMotion, () => (s.reducedMotion = !s.reducedMotion));
    toggleRow('Reduced Screen Shake', s.reducedShake, () => (s.reducedShake = !s.reducedShake));
    toggleRow('High-Contrast Text', s.highContrast, () => (s.highContrast = !s.highContrast));
    toggleRow('Left-Handed Controls', s.leftHanded, () => (s.leftHanded = !s.leftHanded));
    stepRow('Text Size', `${Math.round(s.textScale * 100)}%`, () => (s.textScale = Math.max(0.8, +(s.textScale - 0.1).toFixed(1))), () => (s.textScale = Math.min(1.4, +(s.textScale + 0.1).toFixed(1))));

    body.add(new PixelButton(this, 12, y + 4, { w: MENU_W - 24, h: 24, label: 'REPLAY TUTORIAL', fontSize: 9, onClick: () => this.goTo('Home', { firstTime: true }) }));
    y += 32;
    body.add(this.add.text(MENU_W / 2, y + 6, 'Success is never shown by colour alone.', { fontFamily: FONT.body, fontSize: '7px', color: hex(PALETTE.bluegrey), align: 'center', resolution: 3 }).setOrigin(0.5, 0));
  }

  private persist() {
    const state = Store.get();
    AudioManager.update(state.settings);
    SaveSystem.saveSettings(state);
    Store.autosave();
  }

  private back() {
    this.goTo(this.from === 'Menu' ? 'Menu' : 'Home');
  }
}
