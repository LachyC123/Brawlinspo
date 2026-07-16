import { BaseScene } from './BaseScene';
import { MENU_W, MENU_H, PALETTE, FONT, hex, SKIN_TONES, HAIR_COLORS, EYE_COLORS } from '../config';
import { px, panel } from '../render/pixel';
import { PixelButton } from '../ui/PixelButton';
import { CharacterPortrait } from '../ui/CharacterPortrait';
import { NATIONALITIES, FIRST_NAMES, SURNAMES } from '../data/names';
import type { Foot, Position, Background, Appearance } from '../types';
import { CareerSystem } from '../systems/CareerSystem';
import { Store } from '../state';
import { AudioManager } from '../systems/AudioManager';
import { pick, randInt } from '../util/rng';

interface Draft {
  firstName: string; surname: string; shirtName: string; shirtNumber: number;
  foot: Foot; nationality: string; position: Position; background: Background;
  appearance: Appearance;
}

const POSITIONS: { id: Position; name: string }[] = [
  { id: 'ST', name: 'Striker' }, { id: 'W', name: 'Winger' },
  { id: 'AM', name: 'Attacking Mid' }, { id: 'CM', name: 'Central Mid' },
];
const BACKGROUNDS: { id: Background; name: string; desc: string }[] = [
  { id: 'street', name: 'Street Footballer', desc: '+Dribbling +Flair, -Discipline' },
  { id: 'academy', name: 'Academy Release', desc: '+Technique +Awareness, -Confidence' },
  { id: 'localhero', name: 'Local Hero', desc: '+Supporter bond, higher loyalty expectations' },
  { id: 'latebloomer', name: 'Late Bloomer', desc: '-Ability now, faster early growth' },
  { id: 'family', name: 'Famous Family', desc: '+Media +Reputation, more pressure' },
];
const FEET: Foot[] = ['Right', 'Left', 'Both'];

/** Career creation (§5). Live portrait preview updates as choices change. */
export class CareerCreationScene extends BaseScene {
  private slot = 0;
  private page = 0;
  private draft!: Draft;
  private portrait?: CharacterPortrait;
  private content?: Phaser.GameObjects.Container;

  constructor() { super('CareerCreation'); }

  create(data: { slot: number }) {
    this.ensureMenuSize();
    this.fadeIn();
    this.slot = data.slot ?? 0;
    this.draft = this.randomDraft();
    this.add.graphics().fillStyle(PALETTE.bgDeep, 1).fillRect(0, 0, MENU_W, MENU_H);
    this.header('CREATE YOUR PLAYER', () => this.goTo('Menu'));
    this.renderPortraitArea();
    this.renderPage();
  }

  private randomDraft(): Draft {
    const nat = pick(NATIONALITIES);
    const first = pick(FIRST_NAMES[nat]);
    const sur = pick(SURNAMES[nat]);
    return {
      firstName: first, surname: sur, shirtName: sur.toUpperCase(), shirtNumber: randInt(2, 29),
      foot: pick(FEET), nationality: nat, position: pick(POSITIONS).id, background: pick(BACKGROUNDS).id,
      appearance: { skinTone: randInt(0, SKIN_TONES.length - 1), hairStyle: randInt(0, 6), hairColor: randInt(0, HAIR_COLORS.length - 1), eyeColor: randInt(0, EYE_COLORS.length - 1), build: randInt(0, 4) },
    };
  }

  private renderPortraitArea() {
    const g = this.add.graphics();
    panel(g, 8, 36, MENU_W - 16, 92, { fill: PALETTE.panelDark, border: PALETTE.ink, accent: PALETTE.amber });
    // kit preview colour = Greywick red
    this.refreshPortrait();
    // name + number preview
    this.add.text(120, 44, '', { fontFamily: FONT.heading, fontSize: '10px', color: hex(PALETTE.cream), resolution: 3 }).setName('previewName');
    this.add.text(120, 60, '', { fontFamily: FONT.body, fontSize: '8px', color: hex(PALETTE.creamDim), resolution: 3 }).setName('previewMeta');
    this.updatePreviewText();
  }

  private refreshPortrait() {
    this.portrait?.destroy();
    this.portrait = new CharacterPortrait(this, 40, 74, this.draft.appearance, 0x9a2f2a, 'neutral', 1);
  }

  private updatePreviewText() {
    const n = this.children.getByName('previewName') as Phaser.GameObjects.Text;
    const m = this.children.getByName('previewMeta') as Phaser.GameObjects.Text;
    if (n) n.setText(`${this.draft.firstName} ${this.draft.surname}`);
    if (m) m.setText(`#${this.draft.shirtNumber} · ${this.draft.shirtName}\n${this.draft.nationality} · ${this.draft.foot} foot`);
  }

  private renderPage() {
    this.content?.destroy();
    this.content = this.add.container(0, 0);
    const c = this.content;
    const top = 138;

    const tabNames = ['Identity', 'Style', 'Finish'];
    // page indicator
    const ind = this.add.text(MENU_W / 2, top - 4, `${tabNames[this.page]}  (${this.page + 1}/3)`, {
      fontFamily: FONT.heading, fontSize: '9px', color: hex(PALETTE.amber), fontStyle: 'bold', resolution: 3,
    }).setOrigin(0.5, 0);
    c.add(ind);

    if (this.page === 0) this.pageIdentity(c, top + 12);
    else if (this.page === 1) this.pageStyle(c, top + 12);
    else this.pageFinish(c, top + 12);

    // nav buttons
    const navY = MENU_H - 66;
    if (this.page > 0) c.add(new PixelButton(this, 16, navY, { w: 70, h: 26, label: '‹ BACK', fontSize: 9, onClick: () => { this.page--; this.renderPage(); } }));
    c.add(new PixelButton(this, 16, MENU_H - 36, { w: 100, h: 26, label: 'RANDOMISE', fontSize: 9, onClick: () => { this.draft = this.randomDraft(); this.refreshPortrait(); this.updatePreviewText(); this.renderPage(); } }));
    if (this.page < 2) {
      c.add(new PixelButton(this, MENU_W - 86, navY, { w: 70, h: 26, label: 'NEXT ›', fontSize: 9, accent: PALETTE.amber, onClick: () => { this.page++; this.renderPage(); } }));
    } else {
      c.add(new PixelButton(this, MENU_W - 116, MENU_H - 36, { w: 100, h: 26, label: 'START CAREER', fontSize: 9, accent: PALETTE.good, onClick: () => this.start() }));
    }
  }

  // --- cycler control helper ---
  private cycler(c: Phaser.GameObjects.Container, x: number, y: number, w: number, label: string, value: string, onPrev: () => void, onNext: () => void) {
    const g = this.add.graphics();
    panel(g, x, y, w, 24, { fill: PALETTE.panel, border: PALETTE.ink });
    c.add(g);
    c.add(this.add.text(x + 6, y + 3, label, { fontFamily: FONT.body, fontSize: '7px', color: hex(PALETTE.bluegrey), resolution: 3 }));
    const val = this.add.text(x + w / 2, y + 14, value, { fontFamily: FONT.heading, fontSize: '9px', color: hex(PALETTE.cream), fontStyle: 'bold', resolution: 3 }).setOrigin(0.5);
    c.add(val);
    c.add(new PixelButton(this, x + 2, y + 2, { w: 18, h: 20, label: '‹', fontSize: 12, onClick: () => { AudioManager.play('tap'); onPrev(); } }));
    c.add(new PixelButton(this, x + w - 20, y + 2, { w: 18, h: 20, label: '›', fontSize: 12, onClick: () => { AudioManager.play('tap'); onNext(); } }));
  }

  private tapField(c: Phaser.GameObjects.Container, x: number, y: number, w: number, label: string, value: string, onEdit: () => void) {
    const g = this.add.graphics();
    panel(g, x, y, w, 24, { fill: PALETTE.panel, border: PALETTE.ink });
    c.add(g);
    c.add(this.add.text(x + 6, y + 3, label, { fontFamily: FONT.body, fontSize: '7px', color: hex(PALETTE.bluegrey), resolution: 3 }));
    c.add(this.add.text(x + 6, y + 13, value, { fontFamily: FONT.heading, fontSize: '9px', color: hex(PALETTE.cream), fontStyle: 'bold', resolution: 3 }));
    c.add(this.add.text(x + w - 8, y + 12, '✎', { fontFamily: FONT.body, fontSize: '9px', color: hex(PALETTE.amber), resolution: 3 }).setOrigin(1, 0.5));
    const zone = this.add.zone(x, y, w, 24).setOrigin(0).setInteractive();
    zone.on('pointerup', () => { AudioManager.play('tap'); onEdit(); });
    c.add(zone);
  }

  private pageIdentity(c: Phaser.GameObjects.Container, y: number) {
    const w = MENU_W - 32;
    this.tapField(c, 16, y, w, 'FIRST NAME', this.draft.firstName, () => { const v = prompt('First name:', this.draft.firstName); if (v) { this.draft.firstName = v.slice(0, 14); this.updatePreviewText(); this.renderPage(); } });
    this.tapField(c, 16, y + 28, w, 'SURNAME', this.draft.surname, () => { const v = prompt('Surname:', this.draft.surname); if (v) { this.draft.surname = v.slice(0, 16); this.draft.shirtName = v.toUpperCase().slice(0, 12); this.updatePreviewText(); this.renderPage(); } });
    this.tapField(c, 16, y + 56, (w - 8) * 0.62, 'SHIRT NAME', this.draft.shirtName, () => { const v = prompt('Shirt name:', this.draft.shirtName); if (v) { this.draft.shirtName = v.toUpperCase().slice(0, 12); this.updatePreviewText(); this.renderPage(); } });
    this.tapField(c, 16 + (w - 8) * 0.62 + 8, y + 56, (w - 8) * 0.38, 'NUMBER', `${this.draft.shirtNumber}`, () => { const v = prompt('Shirt number (1-99):', `${this.draft.shirtNumber}`); const n = parseInt(v || ''); if (n >= 1 && n <= 99) { this.draft.shirtNumber = n; this.updatePreviewText(); this.renderPage(); } });
    this.cycler(c, 16, y + 84, (w - 8) / 2, 'PREFERRED FOOT', this.draft.foot, () => { this.draft.foot = this.cyc(FEET, this.draft.foot, -1); this.updatePreviewText(); this.renderPage(); }, () => { this.draft.foot = this.cyc(FEET, this.draft.foot, 1); this.updatePreviewText(); this.renderPage(); });
    this.cycler(c, 16 + (w - 8) / 2 + 8, y + 84, (w - 8) / 2, 'NATIONALITY', this.draft.nationality, () => { this.draft.nationality = this.cyc(NATIONALITIES, this.draft.nationality, -1); this.updatePreviewText(); this.renderPage(); }, () => { this.draft.nationality = this.cyc(NATIONALITIES, this.draft.nationality, 1); this.updatePreviewText(); this.renderPage(); });
  }

  private pageStyle(c: Phaser.GameObjects.Container, y: number) {
    const w = MENU_W - 32;
    const a = this.draft.appearance;
    const upd = () => { this.refreshPortrait(); this.renderPage(); };
    this.cycler(c, 16, y, (w - 8) / 2, 'SKIN TONE', `${a.skinTone + 1}/${SKIN_TONES.length}`, () => { a.skinTone = (a.skinTone + SKIN_TONES.length - 1) % SKIN_TONES.length; upd(); }, () => { a.skinTone = (a.skinTone + 1) % SKIN_TONES.length; upd(); });
    this.cycler(c, 16 + (w - 8) / 2 + 8, y, (w - 8) / 2, 'BUILD', ['Slight', 'Lean', 'Average', 'Strong', 'Broad'][a.build], () => { a.build = (a.build + 4) % 5; upd(); }, () => { a.build = (a.build + 1) % 5; upd(); });
    this.cycler(c, 16, y + 28, (w - 8) / 2, 'HAIRSTYLE', `${a.hairStyle + 1}/7`, () => { a.hairStyle = (a.hairStyle + 6) % 7; upd(); }, () => { a.hairStyle = (a.hairStyle + 1) % 7; upd(); });
    this.cycler(c, 16 + (w - 8) / 2 + 8, y + 28, (w - 8) / 2, 'HAIR COLOUR', `${a.hairColor + 1}/${HAIR_COLORS.length}`, () => { a.hairColor = (a.hairColor + HAIR_COLORS.length - 1) % HAIR_COLORS.length; upd(); }, () => { a.hairColor = (a.hairColor + 1) % HAIR_COLORS.length; upd(); });
    this.cycler(c, 16, y + 56, (w - 8) / 2, 'EYE COLOUR', `${a.eyeColor + 1}/${EYE_COLORS.length}`, () => { a.eyeColor = (a.eyeColor + EYE_COLORS.length - 1) % EYE_COLORS.length; upd(); }, () => { a.eyeColor = (a.eyeColor + 1) % EYE_COLORS.length; upd(); });

    // Position
    const posName = POSITIONS.find((p) => p.id === this.draft.position)!.name;
    this.cycler(c, 16 + (w - 8) / 2 + 8, y + 56, (w - 8) / 2, 'POSITION', posName, () => { this.draft.position = this.cyc(POSITIONS.map((p) => p.id), this.draft.position, -1); this.renderPage(); }, () => { this.draft.position = this.cyc(POSITIONS.map((p) => p.id), this.draft.position, 1); this.renderPage(); });
  }

  private pageFinish(c: Phaser.GameObjects.Container, y: number) {
    const w = MENU_W - 32;
    c.add(this.add.text(MENU_W / 2, y, 'CHOOSE YOUR BACKGROUND', { fontFamily: FONT.heading, fontSize: '9px', color: hex(PALETTE.cream), fontStyle: 'bold', resolution: 3 }).setOrigin(0.5, 0));
    let by = y + 16;
    for (const bg of BACKGROUNDS) {
      const selected = this.draft.background === bg.id;
      const g = this.add.graphics();
      panel(g, 16, by, w, 28, { fill: selected ? PALETTE.panelLight : PALETTE.panel, border: PALETTE.ink, accent: selected ? PALETTE.gold : PALETTE.bluegrey });
      c.add(g);
      c.add(this.add.text(22, by + 4, bg.name, { fontFamily: FONT.heading, fontSize: '9px', color: hex(selected ? PALETTE.gold : PALETTE.cream), fontStyle: 'bold', resolution: 3 }));
      c.add(this.add.text(22, by + 16, bg.desc, { fontFamily: FONT.body, fontSize: '7px', color: hex(PALETTE.creamDim), resolution: 3 }));
      const zone = this.add.zone(16, by, w, 28).setOrigin(0).setInteractive();
      zone.on('pointerup', () => { AudioManager.play('tap'); this.draft.background = bg.id; this.renderPage(); });
      c.add(zone);
      by += 32;
    }
  }

  private cyc<T>(arr: readonly T[], cur: T, dir: number): T {
    const i = arr.indexOf(cur);
    return arr[(i + dir + arr.length) % arr.length];
  }

  private start() {
    const state = CareerSystem.create({
      firstName: this.draft.firstName || 'Alex',
      surname: this.draft.surname || 'Rivers',
      shirtName: this.draft.shirtName || 'RIVERS',
      shirtNumber: this.draft.shirtNumber,
      foot: this.draft.foot,
      nationality: this.draft.nationality,
      position: this.draft.position,
      background: this.draft.background,
      age: 16,
      appearance: this.draft.appearance,
    }, this.slot);
    Store.set(state, this.slot);
    Store.autosave();
    AudioManager.play('success');
    this.goTo('Opening');
  }
}
