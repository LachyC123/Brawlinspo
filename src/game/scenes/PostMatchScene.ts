import { BaseScene } from './BaseScene';
import { MENU_W, MENU_H, PALETTE, FONT, hex } from '../config';
import { px, panel, paperCard } from '../render/pixel';
import { PixelButton } from '../ui/PixelButton';
import { ScrollView } from '../ui/ScrollView';
import { Store } from '../state';
import type { MatchResult } from '../types';
import { NewsSystem } from '../systems/NewsSystem';
import { ReputationSystem } from '../systems/ReputationSystem';
import { AudioManager } from '../systems/AudioManager';

/**
 * Post-match (§16). The scoreline, the player's rating, any Football Memories
 * just written, and a compact media screen whose supporter comments reference
 * what actually happened.
 */
export class PostMatchScene extends BaseScene {
  private sv!: ScrollView;

  constructor() { super('PostMatch'); }

  create(data: { result: MatchResult }) {
    this.ensureMenuSize();
    this.fadeIn();
    const s = Store.get();
    const result = data.result;
    ReputationSystem.recompute(s);
    const news = NewsSystem.build(s, result);

    this.drawBackdrop(false);
    this.header('FULL TIME');

    this.sv = new ScrollView(this, 32, MENU_H - 32 - 40);
    const c = this.sv.content;
    let y = 6;

    // --- Scoreline ---
    const home = Store.club(result.homeId);
    const away = Store.club(result.awayId);
    const g = this.add.graphics();
    panel(g, 8, y, MENU_W - 16, 44, { fill: PALETTE.panelDark, border: PALETTE.ink, accent: PALETTE.amber });
    c.add(g);
    c.add(this.add.text(MENU_W / 2, y + 8, `${home.short}  ${result.homeGoals} — ${result.awayGoals}  ${away.short}`, { fontFamily: FONT.heading, fontSize: '16px', color: hex(PALETTE.cream), fontStyle: 'bold', resolution: 3 }).setOrigin(0.5));
    const teamGoals = result.isHome ? result.homeGoals : result.awayGoals;
    const oppGoals = result.isHome ? result.awayGoals : result.homeGoals;
    const outcome = teamGoals > oppGoals ? 'WIN' : teamGoals < oppGoals ? 'LOSS' : 'DRAW';
    c.add(this.add.text(MENU_W / 2, y + 28, `${outcome} · ${result.competition === 'league' ? 'Community League' : result.competition}`, { fontFamily: FONT.body, fontSize: '8px', color: hex(outcome === 'WIN' ? PALETTE.good : outcome === 'LOSS' ? PALETTE.danger : PALETTE.amber), resolution: 3 }).setOrigin(0.5));
    y += 50;

    // --- Player rating card ---
    const rg = this.add.graphics();
    panel(rg, 8, y, MENU_W - 16, 40, { fill: PALETTE.panel, border: PALETTE.ink, accent: PALETTE.gold });
    c.add(rg);
    c.add(this.add.text(14, y + 6, 'YOUR MATCH RATING', { fontFamily: FONT.body, fontSize: '8px', color: hex(PALETTE.creamDim), resolution: 3 }));
    const col = result.rating >= 7.5 ? PALETTE.good : result.rating >= 6 ? PALETTE.amber : PALETTE.danger;
    c.add(this.add.text(MENU_W - 20, y + 4, result.rating.toFixed(1), { fontFamily: FONT.mono, fontSize: '20px', color: hex(col), fontStyle: 'bold', resolution: 3 }).setOrigin(1, 0));
    c.add(this.add.text(14, y + 22, `${result.playerGoals} goals · ${result.playerAssists} assists`, { fontFamily: FONT.body, fontSize: '9px', color: hex(PALETTE.cream), resolution: 3 }));
    y += 46;

    // --- Rating breakdown chips ---
    if (result.ratingEvents.length) {
      const seen = new Map<string, { count: number; delta: number }>();
      for (const e of result.ratingEvents) {
        const cur = seen.get(e.label) || { count: 0, delta: 0 };
        cur.count++; cur.delta += e.delta; seen.set(e.label, cur);
      }
      let cx = 10;
      let cy = y;
      seen.forEach((v, label) => {
        const txt = `${label} ${v.delta >= 0 ? '+' : ''}${v.delta.toFixed(1)}`;
        const w = txt.length * 4.6 + 8;
        if (cx + w > MENU_W - 10) { cx = 10; cy += 14; }
        const chip = this.add.graphics();
        panel(chip, cx, cy, w, 12, { fill: PALETTE.panelDark, border: PALETTE.ink });
        px(chip, cx, cy, 2, 12, v.delta >= 0 ? PALETTE.good : PALETTE.danger);
        c.add(chip);
        c.add(this.add.text(cx + 4, cy + 2, txt, { fontFamily: FONT.body, fontSize: '7px', color: hex(v.delta >= 0 ? PALETTE.good : PALETTE.danger), resolution: 3 }));
        cx += w + 4;
      });
      y = cy + 20;
    }

    // --- New memories ---
    if (result.memories.length) {
      for (const m of result.memories) {
        const mg = this.add.graphics();
        panel(mg, 8, y, MENU_W - 16, 24, { fill: PALETTE.panel, border: PALETTE.ink, accent: m.impact === 'positive' ? PALETTE.good : m.impact === 'negative' ? PALETTE.danger : PALETTE.amber });
        c.add(mg);
        c.add(this.add.text(14, y + 3, '★ FOOTBALL MEMORY', { fontFamily: FONT.body, fontSize: '7px', color: hex(PALETTE.gold), resolution: 3 }));
        c.add(this.add.text(14, y + 12, m.headline, { fontFamily: FONT.body, fontSize: '8px', color: hex(PALETTE.cream), wordWrap: { width: MENU_W - 30 }, resolution: 3 }));
        y += 28;
      }
    }

    // --- News (paper card) ---
    const npH = 60;
    const np = this.add.graphics();
    paperCard(np, 8, y, MENU_W - 16, npH, PALETTE.brick);
    c.add(np);
    c.add(this.add.text(14, y + 5, 'THE GREYWICK GAZETTE', { fontFamily: FONT.heading, fontSize: '7px', color: hex(PALETTE.brickDim), fontStyle: 'bold', resolution: 3 }));
    c.add(this.add.text(14, y + 15, news.headline, { fontFamily: FONT.heading, fontSize: '11px', color: hex(PALETTE.ink), fontStyle: 'bold', wordWrap: { width: MENU_W - 30 }, resolution: 3 }));
    c.add(this.add.text(14, y + 36, news.article, { fontFamily: FONT.body, fontSize: '7px', color: hex(0x3a2a20), wordWrap: { width: MENU_W - 30 }, lineSpacing: 1, resolution: 3 }));
    y += npH + 6;

    // --- Manager + teammate ---
    c.add(this.add.text(14, y, news.managerComment, { fontFamily: FONT.body, fontSize: '8px', color: hex(PALETTE.amber), fontStyle: 'italic', wordWrap: { width: MENU_W - 28 }, resolution: 3 }));
    y += this.measure(news.managerComment, MENU_W - 28) + 6;
    if (news.teammateReaction) {
      c.add(this.add.text(14, y, news.teammateReaction, { fontFamily: FONT.body, fontSize: '8px', color: hex(PALETTE.bluegrey), fontStyle: 'italic', wordWrap: { width: MENU_W - 28 }, resolution: 3 }));
      y += this.measure(news.teammateReaction, MENU_W - 28) + 6;
    }

    // --- Supporter comments ---
    c.add(this.add.text(14, y, 'ON THE TERRACES', { fontFamily: FONT.heading, fontSize: '8px', color: hex(PALETTE.amber), fontStyle: 'bold', resolution: 3 }));
    y += 12;
    for (const cm of news.comments) {
      const cg = this.add.graphics();
      const h = this.measure(cm, MENU_W - 36) + 6;
      panel(cg, 8, y, MENU_W - 16, h, { fill: PALETTE.panelDark, border: PALETTE.ink });
      px(cg, 8, y, 2, h, PALETTE.bluegrey);
      c.add(cg);
      c.add(this.add.text(14, y + 3, cm, { fontFamily: FONT.body, fontSize: '8px', color: hex(PALETTE.creamDim), wordWrap: { width: MENU_W - 34 }, resolution: 3 }));
      y += h + 4;
    }

    this.sv.setContentHeight(y + 10);

    // Fixed continue button
    const cont = new PixelButton(this, 16, MENU_H - 36, { w: MENU_W - 32, h: 30, label: 'CONTINUE', fontSize: 12, accent: PALETTE.amber, onClick: () => this.goTo('Home') });
    void cont;
    AudioManager.play(outcome === 'WIN' ? 'success' : 'paper');
  }

  private measure(text: string, wrapW: number): number {
    const t = this.add.text(0, 0, text, { fontFamily: FONT.body, fontSize: '8px', wordWrap: { width: wrapW }, resolution: 3 }).setVisible(false);
    const h = t.height;
    t.destroy();
    return h;
  }

  update() { this.sv?.update(); }
}
