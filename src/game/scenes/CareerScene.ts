import { BaseScene } from './BaseScene';
import { MENU_W, MENU_H, PALETTE, FONT, hex } from '../config';
import { px, panel } from '../render/pixel';
import { PixelButton } from '../ui/PixelButton';
import { ScrollView } from '../ui/ScrollView';
import { Store } from '../state';
import { CareerSystem } from '../systems/CareerSystem';
import { MemorySystem } from '../systems/MemorySystem';
import { ReputationSystem } from '../systems/ReputationSystem';
import { SaveSystem } from '../systems/SaveSystem';

/** Career overview (§16, §17): league table, records, archetypes, memory log. */
export class CareerScene extends BaseScene {
  private sv!: ScrollView;
  constructor() { super('Career'); }

  create() {
    this.ensureMenuSize();
    this.fadeIn();
    const s = Store.get();
    ReputationSystem.recompute(s);
    this.drawBackdrop(false);
    this.header('CAREER', () => this.goTo('Home'));

    this.sv = new ScrollView(this, 32, MENU_H - 32 - 34);
    const c = this.sv.content;
    let y = 4;

    // Archetypes
    const ag = this.add.graphics();
    panel(ag, 8, y, MENU_W - 16, 34, { fill: PALETTE.panelDark, border: PALETTE.ink, accent: PALETTE.gold });
    c.add(ag);
    c.add(this.add.text(14, y + 4, 'REPUTATION', { fontFamily: FONT.body, fontSize: '7px', color: hex(PALETTE.creamDim), resolution: 3 }));
    c.add(this.add.text(14, y + 13, s.player.archetypes.length ? s.player.archetypes.join(' · ') : 'Unproven Talent', { fontFamily: FONT.heading, fontSize: '10px', color: hex(PALETTE.gold), fontStyle: 'bold', wordWrap: { width: MENU_W - 28 }, resolution: 3 }));
    c.add(this.add.text(14, y + 24, `${s.player.careerGoals}G ${s.player.careerAssists}A career · Mgr trust ${s.player.managerTrust}`, { fontFamily: FONT.body, fontSize: '7px', color: hex(PALETTE.creamDim), resolution: 3 }));
    y += 40;

    // League table
    c.add(this.add.text(14, y, 'COMMUNITY LEAGUE', { fontFamily: FONT.heading, fontSize: '9px', color: hex(PALETTE.amber), fontStyle: 'bold', resolution: 3 }));
    y += 12;
    const table = CareerSystem.sortedTable(s);
    const tg = this.add.graphics();
    const rowH = 12;
    panel(tg, 8, y, MENU_W - 16, 12 + table.length * rowH, { fill: PALETTE.panel, border: PALETTE.ink });
    c.add(tg);
    c.add(this.add.text(14, y + 2, 'P', { fontFamily: FONT.mono, fontSize: '7px', color: hex(PALETTE.bluegrey), resolution: 3 }));
    c.add(this.add.text(MENU_W - 60, y + 2, 'W-D-L', { fontFamily: FONT.mono, fontSize: '7px', color: hex(PALETTE.bluegrey), resolution: 3 }));
    c.add(this.add.text(MENU_W - 20, y + 2, 'Pts', { fontFamily: FONT.mono, fontSize: '7px', color: hex(PALETTE.bluegrey), resolution: 3 }).setOrigin(1, 0));
    table.forEach((row, i) => {
      const club = Store.club(row.clubId);
      const ry = y + 12 + i * rowH;
      const isYou = row.clubId === s.clubId;
      if (isYou) px(this.addToGfx(c), 10, ry, MENU_W - 20, rowH, PALETTE.panelLight, 0.5);
      c.add(this.add.text(14, ry + 1, `${i + 1}`, { fontFamily: FONT.mono, fontSize: '8px', color: hex(isYou ? PALETTE.gold : PALETTE.creamDim), resolution: 3 }));
      px(this.addToGfx(c), 26, ry + 2, 6, 6, club.primary);
      c.add(this.add.text(36, ry + 1, club.short, { fontFamily: FONT.body, fontSize: '8px', color: hex(isYou ? PALETTE.cream : PALETTE.creamDim), fontStyle: isYou ? 'bold' : 'normal', resolution: 3 }));
      c.add(this.add.text(MENU_W - 60, ry + 1, `${row.won}-${row.drawn}-${row.lost}`, { fontFamily: FONT.mono, fontSize: '8px', color: hex(PALETTE.creamDim), resolution: 3 }));
      c.add(this.add.text(MENU_W - 20, ry + 1, `${row.points}`, { fontFamily: FONT.mono, fontSize: '8px', color: hex(isYou ? PALETTE.gold : PALETTE.cream), resolution: 3 }).setOrigin(1, 0));
    });
    y += 12 + table.length * rowH + 8;

    // Records
    c.add(this.add.text(14, y, `Golden Boot: ${s.goldenBoot.name || '—'} (${s.goldenBoot.goals})`, { fontFamily: FONT.body, fontSize: '8px', color: hex(PALETTE.amber), resolution: 3 }));
    y += 16;

    // Memory log
    c.add(this.add.text(14, y, 'FOOTBALL MEMORIES', { fontFamily: FONT.heading, fontSize: '9px', color: hex(PALETTE.amber), fontStyle: 'bold', resolution: 3 }));
    y += 12;
    const memories = MemorySystem.significant(s, 20);
    if (!memories.length) {
      c.add(this.add.text(14, y, 'No memories written yet. Go and make some.', { fontFamily: FONT.body, fontSize: '8px', color: hex(PALETTE.bluegrey), resolution: 3 }));
      y += 14;
    }
    for (const m of memories) {
      const col = m.impact === 'positive' ? PALETTE.good : m.impact === 'negative' ? PALETTE.danger : PALETTE.amber;
      const mg = this.add.graphics();
      panel(mg, 8, y, MENU_W - 16, 24, { fill: PALETTE.panelDark, border: PALETTE.ink });
      px(mg, 8, y, 2, 24, col);
      c.add(mg);
      c.add(this.add.text(14, y + 3, m.headline, { fontFamily: FONT.body, fontSize: '8px', color: hex(PALETTE.cream), wordWrap: { width: MENU_W - 34 }, resolution: 3 }));
      c.add(this.add.text(14, y + 15, `S${m.season} W${m.week} · ${m.tags.slice(0, 3).join(', ')}`, { fontFamily: FONT.body, fontSize: '6px', color: hex(PALETTE.bluegrey), resolution: 3 }));
      y += 28;
    }

    // Export save
    c.add(new PixelButton(this, 8, y, { w: MENU_W - 16, h: 24, label: 'EXPORT SAVE (JSON)', fontSize: 9, onClick: () => this.exportSave() }));
    y += 30;

    this.sv.setContentHeight(y + 10);
    this.navBar('Career');
  }

  /** Helper: graphics drawn into the scroll content need to be tracked/added. */
  private addToGfx(c: Phaser.GameObjects.Container): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    c.add(g);
    return g;
  }

  private exportSave() {
    const json = SaveSystem.exportJSON(Store.get());
    try {
      navigator.clipboard?.writeText(json);
      this.toast('Save copied to clipboard.', PALETTE.good);
    } catch {
      window.prompt('Copy your save JSON:', json);
    }
  }

  update() { this.sv?.update(); }
}
