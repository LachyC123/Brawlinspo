import { BaseScene } from './BaseScene';
import { MENU_W, MENU_H, PALETTE, FONT, hex } from '../config';
import { px, panel, ditherGradient } from '../render/pixel';
import { Store } from '../state';
import { AudioManager } from '../systems/AudioManager';

interface Place { id: string; name: string; x: number; y: number; color: number; blurb: () => string; action?: () => void; }

/**
 * The town of Greywick (§30). An elevated pixel-art map that visibly changes as
 * the club rises — supporter flags, murals and busier streets appear with a
 * higher supporter bond. Locations are tappable for flavour + routing.
 */
export class TownScene extends BaseScene {
  private drops: { x: number; y: number }[] = [];
  private rain!: Phaser.GameObjects.Graphics;

  constructor() { super('Town'); }

  create() {
    this.ensureMenuSize();
    this.fadeIn();
    const s = Store.get();
    const club = Store.club();
    const prosperity = Math.round((club.facilities + club.supporterLove) / 2);

    const g = this.add.graphics();
    ditherGradient(g, 0, 0, MENU_W, MENU_H, 0x243247, PALETTE.bgDeep);
    this.header('GREYWICK');

    // ground
    px(g, 0, 60, MENU_W, MENU_H - 94, 0x2a2f26);
    // roads
    px(g, 0, 150, MENU_W, 10, 0x1a1d18);
    px(g, 120, 40, 10, MENU_H - 74, 0x1a1d18);

    const places: Place[] = [
      { id: 'stadium', name: 'Foundry Ground', x: 30, y: 70, color: club.primary, blurb: () => `Home of the Rovers. Facilities ${club.facilities}/100.`, action: () => this.goTo('Home') },
      { id: 'training', name: 'Training Ground', x: 160, y: 74, color: PALETTE.greenDim, blurb: () => s.weekTrained ? 'You’ve trained this week.' : 'The muddy pitches await.', action: () => { if (!s.weekTrained) this.goTo('Training'); else this.toast('Already trained this week.'); } },
      { id: 'home', name: 'Your Digs', x: 40, y: 170, color: PALETTE.brickDim, blurb: () => 'A rented terrace near the ground.' },
      { id: 'pub', name: 'The Anchor', x: 175, y: 168, color: PALETTE.amberDim, blurb: () => 'Where the supporters gather. Loud on derby day.' },
      { id: 'physio', name: 'Physio Clinic', x: 210, y: 100, color: 0x3a6a8a, blurb: () => `Injury risk ${s.player.cond.injuryRisk}%. Rest heals all.` },
      { id: 'agent', name: 'Agent’s Office', x: 90, y: 110, color: PALETTE.gold, blurb: () => s.pendingTransfer ? 'An offer is on the table…' : 'Quiet, for now.', action: () => { if (s.pendingTransfer) this.goTo('Transfer'); else this.toast('No offers right now.'); } },
      { id: 'park', name: 'Kelby Park', x: 150, y: 120, color: PALETTE.green, blurb: () => prosperity > 45 ? 'Kids play here, copying your celebration.' : 'A worn patch of green.' },
      { id: 'shop', name: 'Club Shop', x: 70, y: 40, color: club.secondary, blurb: () => prosperity > 40 ? `Your shirt (#${s.player.shirtNumber}) in the window.` : 'A tiny portacabin of scarves.' },
    ];

    for (const p of places) this.drawPlace(p, prosperity, s.player.shirtNumber);

    // Prosperity flourishes
    if (prosperity > 40) { // supporter flags
      for (let x = 10; x < MENU_W - 10; x += 24) px(g, x, 62, 3, 6, [club.primary, club.secondary][x % 2], 0.8);
    }
    if (prosperity > 55) { // mural on a wall
      px(g, 8, 200, 30, 24, PALETTE.ink);
      px(g, 12, 204, 22, 16, club.primary, 0.6);
      this.add.text(23, 226, 'MURAL', { fontFamily: FONT.body, fontSize: '6px', color: hex(PALETTE.creamDim), resolution: 3 }).setOrigin(0.5);
    }

    // info panel
    const ig = this.add.graphics();
    panel(ig, 8, MENU_H - 66, MENU_W - 16, 30, { fill: PALETTE.panelDark, border: PALETTE.ink, accent: PALETTE.amber });
    this.add.text(MENU_W / 2, MENU_H - 58, 'Tap a location to explore Greywick', { fontFamily: FONT.body, fontSize: '8px', color: hex(PALETTE.creamDim), align: 'center', wordWrap: { width: MENU_W - 24 }, resolution: 3 }).setOrigin(0.5).setName('townInfo');

    this.rain = this.add.graphics().setDepth(50);
    for (let i = 0; i < 40; i++) this.drops.push({ x: Math.random() * MENU_W, y: Math.random() * MENU_H });

    this.navBar('Town');
  }

  private drawPlace(p: Place, prosperity: number, shirtNo: number) {
    const g = this.add.graphics();
    const w = 34, h = 26;
    // isometric-ish building block
    px(g, p.x, p.y, w, h, PALETTE.brickDim);
    px(g, p.x, p.y, w, 4, p.color); // roof band
    px(g, p.x, p.y, 3, h, PALETTE.ink, 0.4); // side shade
    // windows (warmer/more lit as town prospers)
    for (let wx = p.x + 5; wx < p.x + w - 4; wx += 8) {
      for (let wy = p.y + 8; wy < p.y + h - 3; wy += 8) {
        px(g, wx, wy, 4, 5, prosperity > 40 ? PALETTE.amber : PALETTE.bgDeep, prosperity > 40 ? 0.7 : 1);
      }
    }
    const label = this.add.text(p.x + w / 2, p.y + h + 2, p.name, { fontFamily: FONT.body, fontSize: '7px', color: hex(PALETTE.cream), align: 'center', backgroundColor: 'rgba(10,13,22,0.5)', padding: { x: 2, y: 1 }, resolution: 3 }).setOrigin(0.5, 0);
    void label;

    const zone = this.add.zone(p.x - 2, p.y - 2, w + 4, h + 14).setOrigin(0).setInteractive();
    zone.on('pointerup', () => {
      AudioManager.play('tap');
      const info = this.children.getByName('townInfo') as Phaser.GameObjects.Text;
      info?.setText(`${p.name} — ${p.blurb()}`);
      if (p.action) this.time.delayedCall(400, p.action);
    });
  }

  update() {
    this.rain.clear();
    for (const d of this.drops) { d.y += 6; d.x -= 1.5; if (d.y > MENU_H - 30) { d.y = 30; d.x = Math.random() * MENU_W + 20; } px(this.rain, d.x, d.y, 1, 2, PALETTE.rain, 0.25); }
  }
}
