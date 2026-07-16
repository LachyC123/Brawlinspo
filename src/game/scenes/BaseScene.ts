import Phaser from 'phaser';
import { MENU_W, MENU_H, PALETTE, FONT, hex } from '../config';
import { px, panel, ditherGradient } from '../render/pixel';
import { PixelButton } from '../ui/PixelButton';
import { Store } from '../state';
import { AudioManager } from '../systems/AudioManager';

/**
 * Common menu-scene scaffolding: portrait canvas sizing, the atmospheric
 * industrial-town backdrop, a header bar and the bottom navigation tabs (§22).
 */
export abstract class BaseScene extends Phaser.Scene {
  protected get W() { return MENU_W; }
  protected get H() { return MENU_H; }

  /** Ensure the canvas is in portrait menu mode (MatchScene widens it). */
  protected ensureMenuSize() {
    if (this.scale.width !== MENU_W || this.scale.height !== MENU_H) {
      this.scale.setGameSize(MENU_W, MENU_H);
    }
  }

  /** Rain-soaked industrial gradient backdrop with distant rooftops (§30, §31). */
  protected drawBackdrop(withSkyline = true) {
    const g = this.add.graphics();
    ditherGradient(g, 0, 0, MENU_W, MENU_H, PALETTE.panelDark, PALETTE.bgDeep);
    if (withSkyline) {
      // distant terraced rooftops + chimney silhouette
      const baseY = 120;
      for (let x = 0; x < MENU_W; x += 18) {
        const h = 10 + ((x * 7) % 14);
        px(g, x, baseY - h, 16, h, PALETTE.ink, 0.5);
        px(g, x + 3, baseY - h + 2, 3, 3, PALETTE.amber, 0.15); // faint window glow
      }
      px(g, 210, 60, 8, 60, PALETTE.ink, 0.6); // chimney
      px(g, 209, 58, 10, 3, PALETTE.brickDim, 0.6);
    }
    return g;
  }

  /** Header bar with a title + optional back button. Returns its height. */
  protected header(title: string, onBack?: () => void): number {
    const h = 30;
    const g = this.add.graphics();
    panel(g, 0, 0, MENU_W, h, { fill: PALETTE.panelDark, border: PALETTE.ink, accent: PALETTE.amber });
    px(g, 0, h, MENU_W, 1, PALETTE.ink);
    this.add.text(MENU_W / 2, h / 2, title.toUpperCase(), {
      fontFamily: FONT.heading, fontSize: '13px', color: hex(PALETTE.cream), fontStyle: 'bold', resolution: 3,
    }).setOrigin(0.5);
    if (onBack) {
      new PixelButton(this, 6, 5, { w: 20, h: 20, label: '‹', fontSize: 14, onClick: onBack, fill: PALETTE.panel });
    }
    return h;
  }

  /** Bottom navigation tabs. `active` highlights the current tab. */
  protected navBar(active: 'Home' | 'Match' | 'Squad' | 'Career' | 'Town') {
    const tabs: { key: typeof active; scene: string; icon: string }[] = [
      { key: 'Home', scene: 'Home', icon: '⌂' },
      { key: 'Match', scene: 'Home', icon: '⚽' }, // Match launched from Home continue
      { key: 'Squad', scene: 'Squad', icon: '👥' },
      { key: 'Career', scene: 'Career', icon: '★' },
      { key: 'Town', scene: 'Town', icon: '🏙' },
    ];
    const barH = 34;
    const y = MENU_H - barH;
    const g = this.add.graphics();
    panel(g, 0, y, MENU_W, barH, { fill: PALETTE.panelDark, border: PALETTE.ink });
    px(g, 0, y, MENU_W, 1, PALETTE.amber);
    const tw = MENU_W / tabs.length;
    tabs.forEach((t, i) => {
      const isActive = t.key === active;
      const bx = i * tw;
      if (isActive) px(g, bx + 2, y + 2, tw - 4, barH - 4, PALETTE.panelLight, 0.6);
      const label = this.add.text(bx + tw / 2, y + 11, t.icon, { fontFamily: FONT.body, fontSize: '12px', color: hex(isActive ? PALETTE.gold : PALETTE.creamDim), resolution: 3 }).setOrigin(0.5);
      this.add.text(bx + tw / 2, y + 24, t.key, { fontFamily: FONT.body, fontSize: '7px', color: hex(isActive ? PALETTE.cream : PALETTE.bluegrey), resolution: 3 }).setOrigin(0.5);
      const zone = this.add.zone(bx, y, tw, barH).setOrigin(0).setInteractive();
      zone.on('pointerup', () => {
        if (isActive) return;
        AudioManager.play('tap');
        if (t.key === 'Match') { this.launchMatch(); return; }
        this.goTo(t.scene);
      });
      void label;
    });
    return barH;
  }

  protected launchMatch() {
    // Only launch if there's a fixture to play this week.
    const s = Store.get();
    const fx = s.fixtures.find((f) => f.week === s.week && !f.played && (f.homeId === s.clubId || f.awayId === s.clubId));
    if (fx) this.goTo('Home', { autoMatch: true });
    else this.goTo('Home');
  }

  /** Fade-transition to another scene (§22 smooth transitions). */
  protected goTo(key: string, data?: object) {
    const reduce = Store.state?.settings.reducedMotion;
    this.cameras.main.fadeOut(reduce ? 0 : 160, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(key, data);
    });
  }

  protected fadeIn() {
    const reduce = Store.state?.settings.reducedMotion;
    this.cameras.main.fadeIn(reduce ? 0 : 160, 0, 0, 0);
  }

  /** A quick self-dismissing toast message. */
  protected toast(msg: string, color: number = PALETTE.cream) {
    const y = 46;
    const t = this.add.text(MENU_W / 2, y, msg, {
      fontFamily: FONT.body, fontSize: '9px', color: hex(color), backgroundColor: hex(PALETTE.ink),
      padding: { x: 6, y: 3 }, align: 'center', wordWrap: { width: MENU_W - 40 }, resolution: 3,
    }).setOrigin(0.5).setDepth(2000);
    this.tweens.add({ targets: t, y: y - 8, alpha: 0, delay: 1400, duration: 700, onComplete: () => t.destroy() });
  }
}
