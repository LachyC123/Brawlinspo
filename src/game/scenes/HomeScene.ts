import { BaseScene } from './BaseScene';
import { MENU_W, MENU_H, PALETTE, FONT, hex } from '../config';
import { px, panel } from '../render/pixel';
import { PixelButton } from '../ui/PixelButton';
import { StatBar } from '../ui/StatBar';
import { CharacterPortrait } from '../ui/CharacterPortrait';
import { DialogueBox } from '../ui/DialogueBox';
import { Store } from '../state';
import { CareerSystem } from '../systems/CareerSystem';
import { EventSystem } from '../systems/EventSystem';
import { TransferSystem } from '../systems/TransferSystem';
import { ReputationSystem } from '../systems/ReputationSystem';
import { RelationshipSystem } from '../systems/RelationshipSystem';
import { AudioManager } from '../systems/AudioManager';

/**
 * Home hub (§22) and the engine of the weekly loop (§4). The single Continue
 * button reads the week's phase (train → event → match → advance) and routes
 * the player through it, so the loop is always one tap away.
 */
export class HomeScene extends BaseScene {
  constructor() { super('Home'); }

  create(data: { firstTime?: boolean; autoMatch?: boolean } = {}) {
    this.ensureMenuSize();
    this.fadeIn();
    const s = Store.get();
    ReputationSystem.recompute(s);
    RelationshipSystem.refreshStates(s);
    CareerSystem.updateObjective(s);
    Store.autosave();

    this.drawBackdrop(false);
    this.header(CareerSystem.isSeasonOver(s) ? 'SEASON’S END' : `SEASON ${s.season} · WEEK ${s.week}`);
    new PixelButton(this, MENU_W - 26, 5, { w: 20, h: 20, label: '⚙', fontSize: 11, onClick: () => this.goTo('Settings', { from: 'Home' }) });

    this.renderPlayerCard(s);
    if (CareerSystem.isSeasonOver(s)) {
      this.renderSeasonEnd(s);
    } else {
      this.renderFixture(s);
      this.renderCondition(s);
      this.renderAlert(s);
      this.renderContinue(s);
    }
    this.navBar('Home');

    if (data.autoMatch && !CareerSystem.isSeasonOver(s)) {
      this.time.delayedCall(150, () => this.playMatch(s));
    }
    if (data.firstTime) this.time.delayedCall(300, () => this.tutorial());
  }

  private renderPlayerCard(s: ReturnType<typeof Store.get>) {
    const p = s.player;
    const club = Store.club();
    const g = this.add.graphics();
    panel(g, 8, 36, MENU_W - 16, 62, { fill: PALETTE.panelDark, border: PALETTE.ink, accent: club.primary });
    new CharacterPortrait(this, 14, 40, p.appearance, club.primary, p.cond.morale > 60 ? 'proud' : p.cond.morale < 35 ? 'worried' : 'neutral', 1);
    this.add.text(66, 42, `${p.firstName} ${p.surname}`, { fontFamily: FONT.heading, fontSize: '12px', color: hex(PALETTE.cream), fontStyle: 'bold', resolution: 3 });
    this.add.text(66, 56, `#${p.shirtNumber} · ${posName(p.position)} · ${club.name}`, { fontFamily: FONT.body, fontSize: '8px', color: hex(PALETTE.creamDim), resolution: 3 });
    this.add.text(66, 68, `“${ReputationSystem.primary(s)}”`, { fontFamily: FONT.body, fontSize: '8px', color: hex(PALETTE.gold), fontStyle: 'italic', resolution: 3 });
    this.add.text(66, 82, `£${p.money.toLocaleString()} · ${p.seasonGoals}G ${p.seasonAssists}A in ${p.seasonApps}`, { fontFamily: FONT.mono, fontSize: '8px', color: hex(PALETTE.amber), resolution: 3 });
  }

  private renderFixture(s: ReturnType<typeof Store.get>) {
    const fx = CareerSystem.currentFixture(s);
    const g = this.add.graphics();
    const y = 102;
    panel(g, 8, y, MENU_W - 16, 44, { fill: PALETTE.panel, border: PALETTE.ink, accent: PALETTE.amber });
    if (!fx) {
      this.add.text(MENU_W / 2, y + 22, 'No fixture this week — advance on.', { fontFamily: FONT.body, fontSize: '9px', color: hex(PALETTE.creamDim), resolution: 3 }).setOrigin(0.5);
      return;
    }
    const isHome = fx.homeId === s.clubId;
    const opp = Store.club(isHome ? fx.awayId : fx.homeId);
    const club = Store.club();
    const derby = club.rivalId === opp.id;
    this.add.text(14, y + 5, derby ? 'NEXT: LOCAL DERBY' : 'NEXT FIXTURE', { fontFamily: FONT.heading, fontSize: '8px', color: hex(derby ? PALETTE.rivalRed : PALETTE.amber), fontStyle: 'bold', resolution: 3 });
    // crest chips
    px(g, 20, y + 18, 18, 18, club.primary); px(g, 20, y + 18, 18, 3, club.secondary);
    px(g, MENU_W - 38, y + 18, 18, 18, opp.primary); px(g, MENU_W - 38, y + 18, 18, 3, opp.secondary);
    this.add.text(MENU_W / 2, y + 20, isHome ? 'vs' : '@', { fontFamily: FONT.heading, fontSize: '11px', color: hex(PALETTE.cream), fontStyle: 'bold', resolution: 3 }).setOrigin(0.5);
    this.add.text(MENU_W / 2, y + 33, `${club.short}  —  ${opp.short}`, { fontFamily: FONT.body, fontSize: '8px', color: hex(PALETTE.creamDim), resolution: 3 }).setOrigin(0.5);
    this.add.text(44, y + 26, isHome ? 'HOME' : '', { fontFamily: FONT.body, fontSize: '7px', color: hex(PALETTE.good), resolution: 3 });
  }

  private renderCondition(s: ReturnType<typeof Store.get>) {
    const p = s.player;
    let y = 154;
    const w = (MENU_W - 24) / 2 - 4;
    new StatBar(this, 12, y, w, 'Fitness', p.cond.fitness, { color: PALETTE.good });
    new StatBar(this, 12 + w + 8, y, w, 'Morale', p.cond.morale, { color: PALETTE.amber });
    y += 20;
    new StatBar(this, 12, y, w, 'Sharpness', p.cond.sharpness, { color: PALETTE.gold });
    new StatBar(this, 12 + w + 8, y, w, 'Mgr Trust', p.managerTrust, { color: PALETTE.bluegrey });
    y += 22;
    // form row
    this.add.text(12, y, 'FORM', { fontFamily: FONT.body, fontSize: '7px', color: hex(PALETTE.bluegrey), resolution: 3 });
    const form = p.form.slice(-5);
    if (!form.length) this.add.text(44, y, 'No matches yet', { fontFamily: FONT.body, fontSize: '8px', color: hex(PALETTE.creamDim), resolution: 3 });
    form.forEach((r, i) => {
      const col = r >= 7.5 ? PALETTE.good : r >= 6 ? PALETTE.amber : PALETTE.danger;
      const bx = 44 + i * 36;
      const gg = this.add.graphics();
      panel(gg, bx, y - 2, 32, 12, { fill: PALETTE.panelDark, border: PALETTE.ink });
      px(gg, bx, y - 2, 2, 12, col);
      this.add.text(bx + 17, y + 4, r.toFixed(1), { fontFamily: FONT.mono, fontSize: '8px', color: hex(col), resolution: 3 }).setOrigin(0.5);
    });
  }

  private renderAlert(s: ReturnType<typeof Store.get>) {
    const y = 222;
    // Pick the most pressing relationship: highest jealousy or lowest trust.
    const sorted = [...s.teammates].sort((a, b) => (b.jealousy - b.trust) - (a.jealousy - a.trust));
    const t = sorted[0];
    const g = this.add.graphics();
    panel(g, 8, y, MENU_W - 16, 40, { fill: PALETTE.panel, border: PALETTE.ink, accent: PALETTE.rivalRed });
    this.add.text(14, y + 4, 'DRESSING ROOM', { fontFamily: FONT.heading, fontSize: '8px', color: hex(PALETTE.rivalRed), fontStyle: 'bold', resolution: 3 });
    if (t) {
      new CharacterPortrait(this, 12, y + 12, t.appearance, Store.club().primary, t.jealousy > 45 ? 'jealous' : t.trust < 40 ? 'disappointed' : 'neutral', 0.5);
      this.add.text(42, y + 14, `${t.firstName} ${t.surname} · ${RelationshipSystem.label(t.state)}`, { fontFamily: FONT.heading, fontSize: '8px', color: hex(PALETTE.cream), fontStyle: 'bold', resolution: 3 });
      this.add.text(42, y + 25, t.concern, { fontFamily: FONT.body, fontSize: '7px', color: hex(PALETTE.creamDim), wordWrap: { width: MENU_W - 58 }, resolution: 3 });
    }
  }

  private renderContinue(s: ReturnType<typeof Store.get>) {
    // Objective line.
    this.add.text(MENU_W / 2, 268, s.objective, { fontFamily: FONT.body, fontSize: '8px', color: hex(PALETTE.gold), align: 'center', wordWrap: { width: MENU_W - 24 }, resolution: 3 }).setOrigin(0.5).setY(270);

    const phase = this.phase(s);
    const y = 288;
    const bigBtn = (label: string, accent: number, fn: () => void) =>
      new PixelButton(this, 16, y, { w: MENU_W - 32, h: 34, label, fontSize: 12, accent, onClick: fn });

    // Transfer alert takes priority.
    if (s.pendingTransfer && s.week >= s.pendingTransfer.week) {
      bigBtn('⚑ RESPOND TO OFFER', PALETTE.gold, () => this.goTo('Transfer'));
      return;
    }

    switch (phase) {
      case 'train':
        bigBtn('▶ GO TO TRAINING', PALETTE.amber, () => this.goTo('Training'));
        this.subNote('Choose this week’s training session.');
        break;
      case 'event':
        bigBtn('▶ CONTINUE THE WEEK', PALETTE.amber, () => this.goTo('Event'));
        this.subNote('Something’s happening around the club…');
        break;
      case 'match':
        bigBtn('⚽ PLAY THE MATCH', PALETTE.good, () => this.playMatch(s));
        this.subNote('Rotate to landscape for the best view.');
        break;
      case 'advance':
        bigBtn('➜ ADVANCE TO NEXT WEEK', PALETTE.bluegrey, () => this.advance(s));
        this.subNote('Match done. Recover and go again.');
        break;
    }
  }

  private subNote(text: string) {
    this.add.text(MENU_W / 2, 326, text, { fontFamily: FONT.body, fontSize: '7px', color: hex(PALETTE.bluegrey), align: 'center', wordWrap: { width: MENU_W - 30 }, resolution: 3 }).setOrigin(0.5);
  }

  /** Determine the current phase of the weekly loop. */
  private phase(s: ReturnType<typeof Store.get>): 'train' | 'event' | 'match' | 'advance' {
    if (!s.weekTrained) return 'train';
    if (!s.weekEventResolved) return 'event';
    const fx = CareerSystem.currentFixture(s);
    if (fx) return 'match';
    return 'advance';
  }

  private playMatch(s: ReturnType<typeof Store.get>) {
    const fx = CareerSystem.currentFixture(s);
    if (!fx) { this.advance(s); return; }
    // Hint landscape on portrait phones.
    this.goTo('Match');
  }

  private advance(s: ReturnType<typeof Store.get>) {
    // Simulate remaining fixtures (none should be the player's), advance week.
    CareerSystem.simulateOtherFixtures(s);
    if (TransferSystem.maybeGenerateOffer(s)) AudioManager.play('notify');
    CareerSystem.advanceWeek(s);
    Store.autosave();
    AudioManager.play('tap');
    this.scene.restart();
  }

  private renderSeasonEnd(s: ReturnType<typeof Store.get>) {
    const table = CareerSystem.sortedTable(s);
    const pos = table.findIndex((r) => r.clubId === s.clubId) + 1;
    const g = this.add.graphics();
    panel(g, 12, 110, MENU_W - 24, 150, { fill: PALETTE.panel, border: PALETTE.ink, accent: PALETTE.gold });
    this.add.text(MENU_W / 2, 122, `ROVERS FINISHED ${ordinal(pos)}`, { fontFamily: FONT.heading, fontSize: '12px', color: hex(PALETTE.gold), fontStyle: 'bold', resolution: 3 }).setOrigin(0.5);
    const promoted = pos <= 3;
    this.add.text(MENU_W / 2, 142, promoted ? 'PROMOTION! The town is dreaming.' : pos >= 7 ? 'A relegation scrap survived.' : 'A season of hard graft.', { fontFamily: FONT.body, fontSize: '9px', color: hex(PALETTE.cream), align: 'center', wordWrap: { width: MENU_W - 40 }, resolution: 3 }).setOrigin(0.5);
    this.add.text(MENU_W / 2, 170, `You: ${s.player.seasonGoals} goals · ${s.player.seasonAssists} assists · ${s.player.seasonApps} apps`, { fontFamily: FONT.body, fontSize: '8px', color: hex(PALETTE.creamDim), align: 'center', resolution: 3 }).setOrigin(0.5);
    this.add.text(MENU_W / 2, 186, `Golden Boot: ${s.goldenBoot.name || '—'} (${s.goldenBoot.goals})`, { fontFamily: FONT.body, fontSize: '8px', color: hex(PALETTE.amber), align: 'center', resolution: 3 }).setOrigin(0.5);
    this.add.text(MENU_W / 2, 206, `${s.memories.length} football memories written this career.`, { fontFamily: FONT.body, fontSize: '8px', color: hex(PALETTE.bluegrey), align: 'center', resolution: 3 }).setOrigin(0.5);

    new PixelButton(this, 24, 226, { w: MENU_W - 48, h: 28, label: '➜ BEGIN NEXT SEASON', fontSize: 11, accent: PALETTE.good, onClick: () => {
      CareerSystem.startNewSeason(s);
      Store.autosave();
      AudioManager.play('success');
      this.scene.restart();
    } });
    new PixelButton(this, 24, 262, { w: MENU_W - 48, h: 24, label: 'View Career Summary', fontSize: 9, onClick: () => this.goTo('Career') });
  }

  private tutorial() {
    const pages = [
      { title: 'Welcome to Greywick', body: 'This is your home base. Each week you’ll train, live through a story, then play the key match moments. It all runs from the Continue button.' },
      { title: 'The Weekly Loop', body: 'Train → a club event → the match → reactions → advance. One week takes a few minutes. Your choices shape who you become.' },
      { title: 'Football Memory', body: 'The world remembers what you do — winners against the rivals, missed penalties, moments of loyalty. They shape news, teammates and your legacy.' },
      { title: 'Ready', body: 'Fitness and morale matter. So does the dressing room. Tap Continue to start your first week. Good luck, legend.' },
    ];
    let i = 0;
    const show = () => {
      const box = new DialogueBox(this, MENU_W / 2, MENU_H / 2, {
        title: pages[i].title, body: pages[i].body,
        choices: [{ label: i < pages.length - 1 ? 'Next ›' : 'Let’s go', onClick: () => { box.destroy(); i++; if (i < pages.length) show(); } }],
      });
    };
    show();
  }
}

function posName(p: string): string {
  return ({ ST: 'Striker', W: 'Winger', AM: 'Att. Mid', CM: 'Central Mid' } as Record<string, string>)[p] ?? p;
}
function ordinal(n: number): string {
  const sfx = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (sfx[(v - 20) % 10] || sfx[v] || sfx[0]);
}
