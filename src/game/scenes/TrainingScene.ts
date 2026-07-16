import { BaseScene } from './BaseScene';
import { MENU_W, MENU_H, PALETTE, FONT, hex } from '../config';
import { px, panel } from '../render/pixel';
import { PixelButton } from '../ui/PixelButton';
import { TRAINING, TrainingSystem, TrainingOption } from '../systems/TrainingSystem';
import { Store } from '../state';
import { AudioManager } from '../systems/AudioManager';

/**
 * Training (§21). One main session per week. Skill drills run a short timing
 * mini-game; other sessions resolve from a choice. Results feed straight into
 * the player's attributes.
 */
export class TrainingScene extends BaseScene {
  constructor() { super('Training'); }

  create() {
    this.ensureMenuSize();
    this.fadeIn();
    this.drawBackdrop(false);
    this.header('TRAINING', () => this.goTo('Home'));
    this.add.text(MENU_W / 2, 40, 'Choose one session for the week', { fontFamily: FONT.body, fontSize: '8px', color: hex(PALETTE.creamDim), resolution: 3 }).setOrigin(0.5);

    const cols = 2;
    const cw = (MENU_W - 24) / cols;
    const ch = 58;
    TRAINING.forEach((opt, i) => {
      const cx = 12 + (i % cols) * cw + 2;
      const cy = 54 + Math.floor(i / cols) * (ch + 6);
      this.optionCard(opt, cx, cy, cw - 8, ch);
    });
  }

  private optionCard(opt: TrainingOption, x: number, y: number, w: number, h: number) {
    const g = this.add.graphics();
    panel(g, x, y, w, h, { fill: PALETTE.panel, border: PALETTE.ink, accent: opt.interactive ? PALETTE.amber : PALETTE.bluegrey });
    this.add.text(x + 6, y + 6, opt.name, { fontFamily: FONT.heading, fontSize: '10px', color: hex(PALETTE.cream), fontStyle: 'bold', resolution: 3 });
    this.add.text(x + 6, y + 20, opt.desc, { fontFamily: FONT.body, fontSize: '7px', color: hex(PALETTE.creamDim), wordWrap: { width: w - 12 }, resolution: 3 });
    if (opt.interactive) this.add.text(x + w - 6, y + 6, '★ drill', { fontFamily: FONT.body, fontSize: '7px', color: hex(PALETTE.gold), resolution: 3 }).setOrigin(1, 0);
    const zone = this.add.zone(x, y, w, h).setOrigin(0).setInteractive();
    zone.on('pointerup', () => { AudioManager.play('tap'); this.select(opt); });
  }

  private select(opt: TrainingOption) {
    const s = Store.get();
    if (s.player.cond.fitness < opt.fitnessCost && opt.id !== 'recovery') {
      this.toast('Too tired for that. Try Recovery.', PALETTE.danger);
      return;
    }
    if (opt.interactive) this.runDrill(opt);
    else this.applyAndFinish(opt, 0.6);
  }

  // --- Interactive timing drill: stop the sweeping marker in the sweet spot ---
  private runDrill(opt: TrainingOption) {
    const overlay = this.add.container(0, 0).setDepth(500);
    const g = this.add.graphics();
    px(g, 0, 0, MENU_W, MENU_H, PALETTE.bgDeep, 0.9);
    overlay.add(g);

    const title = { finishing: 'FINISHING: time your strike', passing: 'PASSING: hit the weight', dribbling: 'DRIBBLING: time the touch' }[opt.id] || opt.name;
    overlay.add(this.add.text(MENU_W / 2, 60, title, { fontFamily: FONT.heading, fontSize: '11px', color: hex(PALETTE.cream), fontStyle: 'bold', align: 'center', wordWrap: { width: MENU_W - 40 }, resolution: 3 }).setOrigin(0.5));

    const reps = 3;
    let rep = 0;
    const scores: number[] = [];
    const barX = 30, barW = MENU_W - 60, barY = 200, barH = 26;
    const sweetW = 34;
    let sweetX = 0;
    const marker = this.add.graphics();
    overlay.add(marker);
    const info = this.add.text(MENU_W / 2, 240, '', { fontFamily: FONT.body, fontSize: '9px', color: hex(PALETTE.gold), resolution: 3 }).setOrigin(0.5);
    overlay.add(info);
    const repText = this.add.text(MENU_W / 2, 100, '', { fontFamily: FONT.body, fontSize: '9px', color: hex(PALETTE.creamDim), resolution: 3 }).setOrigin(0.5);
    overlay.add(repText);

    let t = 0, dir = 1, active = true, speed = 0.9;

    const newRep = () => {
      sweetX = barX + 20 + Math.random() * (barW - 40 - sweetW);
      t = barX; dir = 1; active = true;
      speed = 0.9 + rep * 0.35;
      repText.setText(`Attempt ${rep + 1} / ${reps}`);
      info.setText('Tap anywhere to strike');
    };

    const drawBar = () => {
      marker.clear();
      panel(marker, barX, barY, barW, barH, { fill: PALETTE.panelDark, border: PALETTE.ink });
      px(marker, sweetX, barY + 2, sweetW, barH - 4, PALETTE.greenDim);
      px(marker, sweetX + sweetW / 2 - 3, barY + 2, 6, barH - 4, PALETTE.good); // perfect core
      px(marker, t, barY, 3, barH, PALETTE.gold);
    };

    const tap = () => {
      if (!active) return;
      active = false;
      const center = sweetX + sweetW / 2;
      const dist = Math.abs(t + 1.5 - center);
      let q: number;
      if (dist < 4) q = 1;
      else if (dist < sweetW / 2) q = 0.75;
      else if (dist < sweetW) q = 0.45;
      else q = 0.15;
      scores.push(q);
      AudioManager.play(q >= 0.75 ? 'shot' : q >= 0.45 ? 'kick' : 'fail');
      info.setText(q === 1 ? 'PERFECT!' : q >= 0.75 ? 'Great' : q >= 0.45 ? 'Decent' : 'Mistimed');
      rep++;
      this.time.delayedCall(700, () => {
        if (rep < reps) { newRep(); }
        else {
          this.input.off('pointerdown', tap);
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          overlay.destroy();
          this.applyAndFinish(opt, avg);
        }
      });
    };

    this.input.on('pointerdown', tap);
    newRep();

    // drive the marker
    const ev = this.time.addEvent({ delay: 16, loop: true, callback: () => {
      if (active) {
        t += dir * speed * 2.2;
        if (t > barX + barW - 3) { t = barX + barW - 3; dir = -1; }
        if (t < barX) { t = barX; dir = 1; }
      }
      drawBar();
    } });
    overlay.once('destroy', () => ev.remove());
  }

  private applyAndFinish(opt: TrainingOption, quality: number) {
    const s = Store.get();
    const summary = TrainingSystem.apply(s, opt, quality);
    s.weekTrained = true;
    Store.autosave();

    const g = this.add.graphics().setDepth(600);
    px(g, 0, 0, MENU_W, MENU_H, PALETTE.bgDeep, 0.92);
    this.add.text(MENU_W / 2, 120, 'SESSION COMPLETE', { fontFamily: FONT.heading, fontSize: '13px', color: hex(PALETTE.gold), fontStyle: 'bold', resolution: 3 }).setOrigin(0.5).setDepth(601);
    this.add.text(MENU_W / 2, 144, opt.name, { fontFamily: FONT.body, fontSize: '9px', color: hex(PALETTE.cream), resolution: 3 }).setOrigin(0.5).setDepth(601);
    if (opt.interactive) this.add.text(MENU_W / 2, 160, `Drill quality: ${Math.round(quality * 100)}%`, { fontFamily: FONT.mono, fontSize: '8px', color: hex(PALETTE.amber), resolution: 3 }).setOrigin(0.5).setDepth(601);

    const panelG = this.add.graphics().setDepth(601);
    panel(panelG, 40, 178, MENU_W - 80, 20 + summary.length * 14, { fill: PALETTE.panel, border: PALETTE.ink, accent: PALETTE.good });
    summary.forEach((line, i) => this.add.text(MENU_W / 2, 188 + i * 14, line, { fontFamily: FONT.body, fontSize: '9px', color: hex(PALETTE.good), resolution: 3 }).setOrigin(0.5).setDepth(602));

    AudioManager.play('success');
    new PixelButton(this, 40, 300, { w: MENU_W - 80, h: 30, label: 'CONTINUE', fontSize: 11, accent: PALETTE.amber, onClick: () => this.goTo('Home') }).setDepth(602);
  }
}
