import { BaseScene } from './BaseScene';
import { MENU_W, MENU_H, PALETTE, FONT, hex } from '../config';
import { px, panel } from '../render/pixel';
import { StatBar } from '../ui/StatBar';
import { CharacterPortrait, Expression } from '../ui/CharacterPortrait';
import { ScrollView } from '../ui/ScrollView';
import { Store } from '../state';
import { RelationshipSystem } from '../systems/RelationshipSystem';
import { GREYWICK_MANAGER } from '../data/players';
import type { TeammateData } from '../types';

/** Squad + relationships screen (§11). */
export class SquadScene extends BaseScene {
  private sv!: ScrollView;
  constructor() { super('Squad'); }

  create() {
    this.ensureMenuSize();
    this.fadeIn();
    const s = Store.get();
    RelationshipSystem.refreshStates(s);
    this.drawBackdrop(false);
    this.header('THE DRESSING ROOM', () => this.goTo('Home'));

    this.sv = new ScrollView(this, 32, MENU_H - 32 - 34);
    const c = this.sv.content;
    let y = 4;

    // Manager card
    const mg = this.add.graphics();
    panel(mg, 8, y, MENU_W - 16, 30, { fill: PALETTE.panelDark, border: PALETTE.ink, accent: PALETTE.amber });
    c.add(mg);
    c.add(this.add.text(14, y + 4, `MANAGER · ${GREYWICK_MANAGER.name}`, { fontFamily: FONT.heading, fontSize: '9px', color: hex(PALETTE.cream), fontStyle: 'bold', resolution: 3 }));
    c.add(this.add.text(14, y + 16, `Trust ${s.player.managerTrust}/100 · ${GREYWICK_MANAGER.trait}`, { fontFamily: FONT.body, fontSize: '7px', color: hex(PALETTE.creamDim), wordWrap: { width: MENU_W - 28 }, resolution: 3 }));
    y += 36;

    for (const t of s.teammates) {
      y = this.teammateCard(c, t, y);
    }
    this.sv.setContentHeight(y + 10);
    this.navBar('Squad');
  }

  private teammateCard(c: Phaser.GameObjects.Container, t: TeammateData, y: number): number {
    const h = 66;
    const g = this.add.graphics();
    const accent = t.state === 'ally' || t.state === 'close' ? PALETTE.good : t.state === 'rival' || t.state === 'hostile' ? PALETTE.danger : PALETTE.bluegrey;
    panel(g, 8, y, MENU_W - 16, h, { fill: PALETTE.panel, border: PALETTE.ink, accent });
    c.add(g);

    const expr: Expression = t.jealousy > 50 ? 'jealous' : t.morale < 40 ? 'disappointed' : t.morale > 70 ? 'happy' : 'neutral';
    c.add(new CharacterPortrait(this, 12, y + 6, t.appearance, Store.club().primary, expr, 1));

    c.add(this.add.text(66, y + 5, `${t.firstName} ${t.surname}${t.isCaptain ? ' (C)' : ''}`, { fontFamily: FONT.heading, fontSize: '10px', color: hex(PALETTE.cream), fontStyle: 'bold', resolution: 3 }));
    c.add(this.add.text(66, y + 17, `${posLabel(t.position)} · Age ${t.age} · ${personalityLabel(t.personality)}`, { fontFamily: FONT.body, fontSize: '7px', color: hex(PALETTE.creamDim), resolution: 3 }));
    c.add(this.add.text(66, y + 27, RelationshipSystem.label(t.state).toUpperCase(), { fontFamily: FONT.heading, fontSize: '8px', color: hex(accent), fontStyle: 'bold', resolution: 3 }));

    const bw = (MENU_W - 24) / 3 - 6;
    c.add(new StatBar(this, 12, y + 40, bw, 'Trust', t.trust, { color: PALETTE.good }));
    c.add(new StatBar(this, 12 + bw + 6, y + 40, bw, 'Respect', t.respect, { color: PALETTE.amber }));
    c.add(new StatBar(this, 12 + (bw + 6) * 2, y + 40, bw, 'Jealousy', t.jealousy, { color: PALETTE.danger }));
    c.add(this.add.text(66, y + 55, `“${t.concern}”`, { fontFamily: FONT.body, fontSize: '7px', color: hex(PALETTE.bluegrey), fontStyle: 'italic', wordWrap: { width: MENU_W - 80 }, resolution: 3 }));
    return y + h + 6;
  }

  update() { this.sv?.update(); }
}

function posLabel(p: string): string {
  return ({ ST: 'Striker', W: 'Winger', AM: 'Att. Mid', CM: 'Central Mid', GK: 'Keeper', DF: 'Defender', DM: 'Def. Mid' } as Record<string, string>)[p] ?? p;
}
function personalityLabel(p: string): string {
  return ({ loyalVeteran: 'Loyal Veteran', competitiveRival: 'Competitive', shyProspect: 'Shy Prospect', joker: 'Joker', hothead: 'Hot-Head', quietPro: 'Quiet Pro', selfishStar: 'Selfish Star', genius: 'Injury-Prone Genius', localLad: 'Local Lad', journeyman: 'Journeyman' } as Record<string, string>)[p] ?? p;
}
