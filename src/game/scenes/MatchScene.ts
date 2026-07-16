import Phaser from 'phaser';
import { MATCH_W, MATCH_H, PALETTE, FONT, hex, WEATHERS, Weather } from '../config';
import { px, panel } from '../render/pixel';
import { drawPitch, PITCH } from '../render/pitch';
import { Footballer } from '../entities/Footballer';
import { Store } from '../state';
import { CareerSystem } from '../systems/CareerSystem';
import { MatchSystem, MatchInput } from '../systems/MatchSystem';
import { AudioManager } from '../systems/AudioManager';
import { pick, randInt, clamp } from '../util/rng';
import type { Appearance } from '../types';

type SitType = 'throughball' | 'oneonone' | 'dribble' | 'penalty' | 'longshot';

interface SitResult {
  events?: { label: string; delta: number }[];
  goals?: number; assists?: number; chance?: number; passOK?: number; passFail?: number;
  dribble?: number; possLost?: number; shotOnTarget?: number; defAction?: number; selfish?: number;
  flags?: string[];
}

/**
 * The playable match (§7–§10). A short sequence of connected situations —
 * through-balls, one-on-ones and dribbles — with touch-first drag/swipe input,
 * a live rating and a slow-time beat before each moment. Feeds MatchSystem to
 * resolve the scoreline and Football Memories.
 */
export class MatchScene extends Phaser.Scene {
  private acc!: MatchInput;
  private situations: SitType[] = [];
  private index = 0;
  private minute = 0;
  private ratingRunning = 6.0;
  private stage!: Phaser.GameObjects.Container;
  private hud!: Phaser.GameObjects.Container;
  private ratingText!: Phaser.GameObjects.Text;
  private minuteText!: Phaser.GameObjects.Text;
  private feedText!: Phaser.GameObjects.Text;
  private weather: Weather = 'overcast';
  private kit = 0x9a2f2a;
  private oppKit = 0x1f3f7a;
  private playerAppr!: Appearance;
  private isHome = true;
  private opponentId = '';
  private lastPassGood = false; // connectedness between situations
  private momentum = 0;
  private sitEvents: Phaser.Time.TimerEvent[] = [];

  constructor() { super('Match'); }

  create() {
    this.scale.setGameSize(MATCH_W, MATCH_H);
    this.cameras.main.fadeIn(180, 0, 0, 0);
    this.toggleHint();
    this.scale.on('resize', this.toggleHint, this);
    this.events.once('shutdown', this.onShutdown, this);

    const s = Store.get();
    const fx = CareerSystem.currentFixture(s)!;
    this.isHome = fx.homeId === s.clubId;
    this.opponentId = this.isHome ? fx.awayId : fx.homeId;
    const club = Store.club();
    const opp = Store.club(this.opponentId);
    this.kit = club.primary;
    this.oppKit = opp.primary;
    this.playerAppr = s.player.appearance;
    this.weather = pick(WEATHERS);

    this.acc = {
      opponentId: this.opponentId, isHome: this.isHome, competition: fx.competition,
      situations: 0, playerGoals: 0, playerAssists: 0, chancesCreated: 0, passesCompleted: 0,
      passesFailed: 0, dribblesWon: 0, possessionLost: 0, shotsOnTarget: 0, defensiveActions: 0,
      selfishDecisions: 0, fouls: 0, ratingEvents: [], flags: [],
    };

    this.situations = this.buildSituations(s.player.position);
    this.acc.situations = this.situations.length;

    // Background pitch
    const bg = this.add.graphics();
    drawPitch(bg, this.weather, club.facilities, this.kit);
    if (this.weather === 'rain' || this.weather === 'heavyRain') this.startRain();

    this.stage = this.add.container(0, 0);
    this.buildHud(club.short, opp.short);
    AudioManager.crowd(this.isHome ? 0.6 : 0.4);

    // Kickoff intro then first situation
    this.bigMessage(this.isHome ? `${club.short} vs ${opp.short}` : `${opp.short} vs ${club.short}`, () => this.runNext());
  }

  private toggleHint() {
    const hint = document.getElementById('orientation-hint');
    if (!hint) return;
    const portrait = window.innerHeight > window.innerWidth * 1.1;
    hint.hidden = !portrait;
  }

  private onShutdown() {
    this.scale.off('resize', this.toggleHint, this);
    this.sitEvents.forEach((e) => e.remove());
    this.sitEvents = [];
    const hint = document.getElementById('orientation-hint');
    if (hint) hint.hidden = true;
    AudioManager.crowd(0);
  }

  private buildSituations(pos: string): SitType[] {
    const core: SitType[] = ['throughball', 'oneonone', 'dribble'];
    const extraPool: SitType[] = pos === 'ST' ? ['oneonone', 'penalty', 'longshot', 'throughball']
      : pos === 'W' ? ['dribble', 'throughball', 'oneonone']
      : ['throughball', 'longshot', 'dribble'];
    const count = randInt(1, 3);
    const extra: SitType[] = [];
    for (let i = 0; i < count; i++) extra.push(pick(extraPool));
    return Phaser.Utils.Array.Shuffle([...core, ...extra]);
  }

  // ---------------- HUD ----------------
  private buildHud(home: string, away: string) {
    this.hud = this.add.container(0, 0).setDepth(100);
    const g = this.add.graphics();
    panel(g, 4, 2, 120, 16, { fill: PALETTE.panelDark, border: PALETTE.ink });
    this.hud.add(g);
    this.hud.add(this.add.text(10, 5, `${home} — ${away}`, { fontFamily: FONT.heading, fontSize: '8px', color: hex(PALETTE.cream), fontStyle: 'bold', resolution: 3 }));
    this.minuteText = this.add.text(90, 5, `0'`, { fontFamily: FONT.mono, fontSize: '8px', color: hex(PALETTE.amber), resolution: 3 });
    this.hud.add(this.minuteText);

    const rg = this.add.graphics();
    panel(rg, MATCH_W - 70, 2, 66, 16, { fill: PALETTE.panelDark, border: PALETTE.ink, accent: PALETTE.gold });
    this.hud.add(rg);
    this.hud.add(this.add.text(MATCH_W - 66, 5, 'RATING', { fontFamily: FONT.body, fontSize: '7px', color: hex(PALETTE.creamDim), resolution: 3 }));
    this.ratingText = this.add.text(MATCH_W - 10, 4, '6.0', { fontFamily: FONT.mono, fontSize: '9px', color: hex(PALETTE.gold), fontStyle: 'bold', resolution: 3 }).setOrigin(1, 0);
    this.hud.add(this.ratingText);

    this.feedText = this.add.text(MATCH_W / 2, MATCH_H - 10, '', { fontFamily: FONT.body, fontSize: '8px', color: hex(PALETTE.cream), align: 'center', resolution: 3 }).setOrigin(0.5);
    this.hud.add(this.feedText);
  }

  private feed(msg: string, color = PALETTE.cream) {
    this.feedText.setColor(hex(color)).setText(msg).setAlpha(1);
    this.tweens.add({ targets: this.feedText, alpha: 0.5, duration: 1500, delay: 500 });
  }

  private addRating(label: string, delta: number) {
    this.acc.ratingEvents.push({ label, delta });
    this.ratingRunning = clamp(this.ratingRunning + delta, 1, 10);
    this.ratingText.setText(this.ratingRunning.toFixed(1));
    // floating indicator (kept elegant, not constant)
    const col = delta >= 0 ? PALETTE.good : PALETTE.danger;
    const t = this.add.text(MATCH_W - 10, 20, `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`, { fontFamily: FONT.mono, fontSize: '8px', color: hex(col), fontStyle: 'bold', resolution: 3 }).setOrigin(1, 0).setDepth(120);
    this.tweens.add({ targets: t, y: 30, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  // ---------------- Flow ----------------
  private runNext() {
    if (this.index >= this.situations.length) { this.finish(); return; }
    this.minute = Math.min(90, Math.round(((this.index + 1) / this.situations.length) * 82) + randInt(2, 6));
    this.minuteText.setText(`${this.minute}'`);
    const type = this.situations[this.index];
    this.index++;
    this.clearStage();

    const runner = () => {
      switch (type) {
        case 'throughball': this.sitThroughBall(); break;
        case 'oneonone': this.sitOneOnOne(); break;
        case 'dribble': this.sitDribble(); break;
        case 'penalty': this.sitPenalty(); break;
        case 'longshot': this.sitLongShot(); break;
      }
    };
    this.slowMoInto(runner);
  }

  private slowMoInto(fn: () => void) {
    const s = Store.state;
    const reduce = s?.settings.reducedMotion;
    const v = this.add.graphics().setDepth(90);
    px(v, 0, 0, MATCH_W, MATCH_H, PALETTE.bgDeep, 0.35);
    this.tweens.add({ targets: v, alpha: 0, duration: reduce ? 0 : 260, onComplete: () => v.destroy() });
    this.time.delayedCall(reduce ? 0 : 200, fn);
  }

  private resolve(r: SitResult) {
    // Accumulate
    if (r.goals) this.acc.playerGoals += r.goals;
    if (r.assists) this.acc.playerAssists += r.assists;
    if (r.chance) this.acc.chancesCreated += r.chance;
    if (r.passOK) this.acc.passesCompleted += r.passOK;
    if (r.passFail) this.acc.passesFailed += r.passFail;
    if (r.dribble) this.acc.dribblesWon += r.dribble;
    if (r.possLost) this.acc.possessionLost += r.possLost;
    if (r.shotOnTarget) this.acc.shotsOnTarget += r.shotOnTarget;
    if (r.defAction) this.acc.defensiveActions += r.defAction;
    if (r.selfish) this.acc.selfishDecisions += r.selfish;
    if (r.flags) this.acc.flags.push(...r.flags);
    (r.events || []).forEach((e) => this.addRating(e.label, e.delta));
    this.time.delayedCall(1100, () => this.runNext());
  }

  private clearStage() {
    this.clearInput();
    this.sitEvents.forEach((e) => e.remove());
    this.sitEvents = [];
    this.stage.removeAll(true);
    this.guide?.clear();
  }

  private clearInput() {
    this.input.off('pointerdown');
    this.input.off('pointermove');
    this.input.off('pointerup');
  }

  // ---------------- Input helpers ----------------
  private guide?: Phaser.GameObjects.Graphics;
  private dragFrom?: { x: number; y: number };

  /** Capture a drag flick; onRelease receives the vector from press to release. */
  private captureDrag(originX: number, originY: number, onRelease: (dx: number, dy: number, dist: number) => void) {
    if (!this.guide) this.guide = this.add.graphics().setDepth(80);
    let start: { x: number; y: number } | null = null;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { start = { x: p.worldX, y: p.worldY }; });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!start) return;
      const dx = p.worldX - start.x, dy = p.worldY - start.y;
      this.guide!.clear();
      // aim line from ball origin in drag direction
      const len = Math.min(90, Math.hypot(dx, dy));
      const ang = Math.atan2(dy, dx);
      for (let i = 0; i < len; i += 4) px(this.guide!, originX + Math.cos(ang) * i, originY + Math.sin(ang) * i, 2, 2, PALETTE.gold, 0.5);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!start) return;
      const dx = p.worldX - start.x, dy = p.worldY - start.y;
      const dist = Math.hypot(dx, dy);
      this.guide!.clear();
      this.clearInput();
      onRelease(dx, dy, dist);
    });
  }

  private prompt(text: string) {
    const t = this.add.text(MATCH_W / 2, 30, text, { fontFamily: FONT.heading, fontSize: '9px', color: hex(PALETTE.white), backgroundColor: 'rgba(10,13,22,0.6)', padding: { x: 5, y: 3 }, align: 'center', resolution: 3 }).setOrigin(0.5).setDepth(85);
    this.stage.add(t);
    this.tweens.add({ targets: t, alpha: 0.7, yoyo: true, repeat: -1, duration: 600 });
    return t;
  }

  // ---------------- Situations ----------------
  private makePlayer(x: number, y: number) {
    const p = new Footballer(this, x, y, this.playerAppr, this.kit, 0x1a1a2a);
    this.stage.add(p);
    // marker under controlled player (§9)
    const m = this.add.graphics();
    px(m, x - 5, y + 1, 10, 2, PALETTE.gold, 0.8);
    this.stage.add(m);
    return p;
  }
  private makeMate(x: number, y: number) {
    const a: Appearance = { skinTone: randInt(0, 5), hairStyle: randInt(0, 6), hairColor: randInt(0, 7), eyeColor: 0, build: randInt(1, 3) };
    const f = new Footballer(this, x, y, a, this.kit, 0x1a1a2a);
    this.stage.add(f);
    return f;
  }
  private makeOpp(x: number, y: number) {
    const a: Appearance = { skinTone: randInt(0, 5), hairStyle: randInt(0, 6), hairColor: randInt(0, 7), eyeColor: 0, build: randInt(1, 4) };
    const f = new Footballer(this, x, y, a, this.oppKit, 0x101018);
    this.stage.add(f);
    return f;
  }
  private ball(x: number, y: number) {
    const g = this.add.graphics();
    px(g, x - 1, y - 1, 3, 3, PALETTE.white);
    px(g, x, y, 1, 1, PALETTE.bluegrey);
    this.stage.add(g);
    return g;
  }

  // 1) THROUGH-BALL: pass into space ahead of a runner (or selfishly shoot)
  private sitThroughBall() {
    const p = this.makePlayer(120, 170);
    const ballX = 128, ballY = 168;
    const b = this.ball(ballX, ballY);
    // runner making a diagonal run behind the defence
    const runner = this.makeMate(180, 150);
    runner.setMoving(true).setFacing(1);
    const targetX = 240, targetY = 90; // space to lead into
    const defender = this.makeOpp(200, 120);
    // teammate run animation
    this.tweens.add({ targets: runner, x: 232, y: 100, duration: 2600, onUpdate: () => runner.update(16) });

    // vision highlight of the passing lane (better vision = clearer)
    const vision = Store.get().player.attr.vision;
    if (vision > 40) {
      const lane = this.add.graphics().setDepth(70);
      for (let i = 0; i < 20; i++) px(lane, ballX + (targetX - ballX) * (i / 20), ballY + (targetY - ballY) * (i / 20), 2, 2, PALETTE.gold, 0.25 + vision / 400);
      this.stage.add(lane);
    }
    // target zone
    const tz = this.add.graphics().setDepth(70);
    const passing = Store.get().player.attr.passing;
    const radius = 14 + passing / 6;
    px(tz, targetX - radius, targetY - radius, radius * 2, radius * 2, PALETTE.good, 0.12);
    this.stage.add(tz);

    this.prompt('THROUGH-BALL — drag to lead the runner');

    this.captureDrag(ballX, ballY, (dx, dy, dist) => {
      p.setPose('kick');
      const aimX = ballX + dx * 1.6, aimY = ballY + dy * 1.6;
      const towardGoal = aimY < 70 && Math.abs(aimX - 192) < 50 && dist > 40;
      const distToTarget = Math.hypot(aimX - targetX, aimY - targetY);
      AudioManager.play('pass');
      // animate ball toward aim
      this.tweens.add({ targets: b, x: Phaser.Math.Clamp(aimX, PITCH.left, PITCH.right), y: Phaser.Math.Clamp(aimY, PITCH.goalY, PITCH.bottom), duration: 420, onComplete: () => {
        if (towardGoal && distToTarget > radius + 20) {
          // Chose to shoot from range instead of the clear pass → selfish
          this.feed('Shot from distance — the runner was clean through!', PALETTE.danger);
          this.resolve({ events: [{ label: 'Selfish shot, possession lost', delta: -0.2 }], selfish: 1, possLost: 1, flags: ['refusedPass'] });
        } else if (distToTarget < radius) {
          this.lastPassGood = true; this.momentum++;
          const perfect = distToTarget < radius * 0.5;
          runner.setPose('run2');
          this.feed(perfect ? 'Perfect ball! Runner in behind!' : 'Great through-ball, chance on!', PALETTE.good);
          // teammate may finish → assist
          const finish = Math.random() < 0.5 + Store.get().player.attr.passing / 300;
          if (finish) {
            this.time.delayedCall(500, () => { AudioManager.play('net'); this.netBulge(); this.feed('He scores! Assist for you!', PALETTE.gold); });
            this.resolve({ events: [{ label: 'Assist', delta: 0.4 }, { label: 'Chance created', delta: 0.2 }], assists: 1, passOK: 1, chance: 1 });
          } else {
            this.resolve({ events: [{ label: 'Chance created', delta: 0.2 }, { label: 'Good pass', delta: 0.1 }], passOK: 1, chance: 1 });
          }
        } else {
          this.feed('Overhit — straight to the keeper.', PALETTE.danger);
          this.resolve({ events: [{ label: 'Pass lost', delta: -0.1 }], passFail: 1, possLost: 1 });
        }
      } });
    });
  }

  // 2) ONE-ON-ONE: through on goal, drag to place the shot past the keeper
  private sitOneOnOne() {
    const p = this.makePlayer(190, 120);
    const ballX = 192, ballY = 112;
    const b = this.ball(ballX, ballY);
    // keeper patrols the goal
    const keeper = new Footballer(this, 192, PITCH.goalY + 4, { skinTone: randInt(0, 5), hairStyle: 0, hairColor: randInt(0, 7), eyeColor: 0, build: 3 }, 0x2f8f4a, 0x102010);
    this.stage.add(keeper);
    let kdir = 1;
    const kev = this.time.addEvent({ delay: 16, loop: true, callback: () => {
      keeper.x += kdir * 0.7;
      if (keeper.x > PITCH.goalX2 - 14) kdir = -1;
      if (keeper.x < PITCH.goalX1 + 14) kdir = 1;
    } });
    this.sitEvents.push(kev);

    const composure = Store.get().player.attr.composure;
    this.prompt('ONE-ON-ONE — drag to aim your shot');
    if (this.lastPassGood) this.feed('From the move — finish it!', PALETTE.gold);

    this.captureDrag(ballX, ballY, (dx, dy, dist) => {
      kev.remove();
      p.setPose('kick');
      AudioManager.play('shot');
      const aimX = Phaser.Math.Clamp(ballX + dx * 1.4, PITCH.goalX1 - 6, PITCH.goalX2 + 6);
      const power = Phaser.Math.Clamp(dist / 70, 0.2, 1.3);
      const goingUp = dy < -8;
      this.tweens.add({ targets: b, x: aimX, y: PITCH.goalY - 2, duration: 300, onComplete: () => {
        const inGoal = aimX > PITCH.goalX1 && aimX < PITCH.goalX2;
        const keeperReach = 16 - composure / 12; // composed players face a "smaller" keeper
        const saved = Math.abs(aimX - keeper.x) < keeperReach && power < 1.15;
        const missed = !inGoal || (goingUp && power > 1.1 && Math.random() > composure / 120);
        if (missed) {
          this.feed('Blazed over! The chance goes begging.', PALETTE.danger);
          this.resolve({ events: [{ label: 'Shot off target', delta: -0.15 }], possLost: 1 });
        } else if (saved) {
          keeper.setPose('slide');
          AudioManager.play('groan');
          this.feed('Saved! The keeper stands up big.', PALETTE.danger);
          this.resolve({ events: [{ label: 'Shot saved', delta: 0.05 }], shotOnTarget: 1 });
        } else {
          this.netBulge(); AudioManager.play('net'); AudioManager.play('cheer');
          const winner = this.momentum >= 1 && this.index >= this.situations.length - 1;
          this.feed('GOAL!! The Foundry erupts!', PALETTE.gold);
          this.resolve({ events: [{ label: 'GOAL', delta: 0.6 }, { label: 'Shot on target', delta: 0.1 }], goals: 1, shotOnTarget: 1, flags: winner ? ['winningGoal', 'lateWinner'] : ['winningGoal'] });
        }
      } });
    });
  }

  // 3) DRIBBLE: swipe away from the defender's lunge at the right moment
  private sitDribble() {
    const p = this.makePlayer(150, 160);
    const ballX = 152, ballY = 150;
    const b = this.ball(ballX, ballY);
    const defender = this.makeOpp(150, 118);
    const lungeDir: 1 | -1 = Math.random() < 0.5 ? -1 : 1;
    let windowOpen = false;
    const dribbling = Store.get().player.attr.dribbling;

    this.prompt('DRIBBLE — swipe AWAY when the defender commits');
    // telegraph after a beat
    const tel = this.time.delayedCall(randInt(700, 1400), () => {
      windowOpen = true;
      defender.x += lungeDir * 6;
      defender.setPose('slide');
      // arrow telegraph
      const arrow = this.add.text(defender.x, defender.y - 16, lungeDir < 0 ? '⟵' : '⟶', { fontFamily: FONT.body, fontSize: '12px', color: hex(PALETTE.danger), resolution: 3 }).setOrigin(0.5).setDepth(85);
      this.stage.add(arrow);
      // window closes
      this.sitEvents.push(this.time.delayedCall(700 + dribbling * 4, () => { windowOpen = false; }));
    });
    this.sitEvents.push(tel);

    this.captureDrag(ballX, ballY, (dx, dy) => {
      const swipeDir = dx < 0 ? -1 : 1;
      const beat = windowOpen && swipeDir === -lungeDir && Math.abs(dx) > 12;
      tel.remove();
      if (beat) {
        p.setPose('run2');
        AudioManager.play('kick');
        this.tweens.add({ targets: [p, b], x: `+=${swipeDir * 30}`, y: '-=30', duration: 400 });
        this.momentum++;
        this.feed('Skinned him! Into the box…', PALETTE.good);
        // follow-up: quick tap shot/cross
        this.time.delayedCall(500, () => this.dribbleFollowUp());
      } else {
        p.setPose('fall');
        AudioManager.play('fail');
        this.feed(windowOpen ? 'Wrong way — tackled!' : 'Mistimed it — dispossessed.', PALETTE.danger);
        this.resolve({ events: [{ label: 'Dispossessed', delta: -0.2 }], possLost: 1 });
      }
    });
  }

  private dribbleFollowUp() {
    this.clearInput();
    const t = this.prompt('TAP to shoot!');
    let taken = false;
    const timeout = this.time.delayedCall(1200, () => { if (!taken) { taken = true; this.feed('Hesitated — chance gone.', PALETTE.danger); this.resolve({ events: [{ label: 'Chance wasted', delta: -0.1 }], possLost: 1 }); } });
    this.input.once('pointerdown', () => {
      if (taken) return; taken = true; timeout.remove(); t.destroy();
      AudioManager.play('shot');
      const shooting = Store.get().player.attr.shooting;
      const scored = Math.random() < 0.4 + shooting / 250 + this.momentum * 0.05;
      if (scored) {
        this.netBulge(); AudioManager.play('net'); AudioManager.play('cheer');
        const winner = this.index >= this.situations.length - 1;
        this.feed('GOAL! What a solo run!', PALETTE.gold);
        this.resolve({ events: [{ label: 'Solo GOAL', delta: 0.6 }, { label: 'Dribble completed', delta: 0.2 }], goals: 1, dribble: 1, shotOnTarget: 1, flags: winner ? ['winningGoal', 'lateWinner'] : ['winningGoal'] });
      } else {
        this.feed('Good effort — saved.', PALETTE.amber);
        this.resolve({ events: [{ label: 'Dribble completed', delta: 0.2 }, { label: 'Shot on target', delta: 0.1 }], dribble: 1, shotOnTarget: 1, chance: 1 });
      }
    });
  }

  // 4) PENALTY: place the spot kick (reuses aim mechanic, tighter)
  private sitPenalty() {
    const p = this.makePlayer(192, 140);
    const ballX = 192, ballY = 118;
    const b = this.ball(ballX, ballY);
    const keeper = new Footballer(this, 192, PITCH.goalY + 4, { skinTone: randInt(0, 5), hairStyle: 0, hairColor: randInt(0, 7), eyeColor: 0, build: 3 }, 0x2f8f4a, 0x102010);
    this.stage.add(keeper);
    const composure = Store.get().player.attr.composure;
    this.prompt('PENALTY — drag to place it. Stay composed.');
    // keeper guesses a side
    const guess: 1 | -1 = Math.random() < 0.5 ? -1 : 1;

    this.captureDrag(ballX, ballY, (dx, dy, dist) => {
      p.setPose('kick');
      AudioManager.play('shot');
      const aimX = Phaser.Math.Clamp(ballX + dx * 1.5, PITCH.goalX1 - 4, PITCH.goalX2 + 4);
      const side = aimX < 192 ? -1 : 1;
      const power = dist / 70;
      // low composure shrinks the placement window
      const wobble = (60 - composure) / 6;
      const finalX = aimX + randInt(-wobble, wobble);
      this.tweens.add({ targets: keeper, x: 192 + guess * 26, duration: 260 });
      this.tweens.add({ targets: b, x: Phaser.Math.Clamp(finalX, PITCH.goalX1 - 8, PITCH.goalX2 + 8), y: PITCH.goalY - 2, duration: 300, onComplete: () => {
        const inGoal = finalX > PITCH.goalX1 && finalX < PITCH.goalX2;
        const saved = side === guess && power < 1.0;
        if (!inGoal) { AudioManager.play('groan'); this.feed('Missed the target! Agony from twelve yards.', PALETTE.danger); this.resolve({ events: [{ label: 'Penalty missed', delta: -0.4 }], flags: ['penaltyMiss'], possLost: 1 }); }
        else if (saved) { keeper.setPose('slide'); AudioManager.play('groan'); this.feed('SAVED! The keeper guesses right.', PALETTE.danger); this.resolve({ events: [{ label: 'Penalty saved', delta: -0.3 }], flags: ['penaltyMiss'], shotOnTarget: 1 }); }
        else { this.netBulge(); AudioManager.play('net'); AudioManager.play('cheer'); const winner = this.index >= this.situations.length - 1; this.feed('GOAL! Ice cold from the spot.', PALETTE.gold); this.resolve({ events: [{ label: 'Penalty scored', delta: 0.5 }], goals: 1, shotOnTarget: 1, flags: winner ? ['winningGoal', 'lateWinner'] : ['winningGoal'] }); }
      } });
    });
  }

  // 5) LONG SHOT: from distance, higher risk
  private sitLongShot() {
    const p = this.makePlayer(190, 175);
    const ballX = 192, ballY = 168;
    const b = this.ball(ballX, ballY);
    const defender = this.makeOpp(180, 140);
    const defender2 = this.makeOpp(205, 145);
    const keeper = new Footballer(this, 192, PITCH.goalY + 4, { skinTone: randInt(0, 5), hairStyle: 0, hairColor: randInt(0, 7), eyeColor: 0, build: 3 }, 0x2f8f4a, 0x102010);
    this.stage.add(keeper);
    const shooting = Store.get().player.attr.shooting;
    this.prompt('LONG SHOT — drag for power & placement');

    this.captureDrag(ballX, ballY, (dx, dy, dist) => {
      p.setPose('wind');
      this.time.delayedCall(120, () => p.setPose('kick'));
      AudioManager.play('shot');
      const aimX = Phaser.Math.Clamp(ballX + dx * 1.3, PITCH.goalX1 - 10, PITCH.goalX2 + 10);
      const power = dist / 70;
      this.tweens.add({ targets: b, x: aimX, y: PITCH.goalY - 2, duration: 340, onComplete: () => {
        const inGoal = aimX > PITCH.goalX1 + 2 && aimX < PITCH.goalX2 - 2 && power > 0.7 && power < 1.4;
        const scored = inGoal && Math.random() < 0.28 + shooting / 300;
        if (scored) { this.netBulge(); AudioManager.play('net'); AudioManager.play('cheer'); const winner = this.index >= this.situations.length - 1; this.feed('SCREAMER! Top corner!', PALETTE.gold); this.resolve({ events: [{ label: 'Wonder GOAL', delta: 0.7 }], goals: 1, shotOnTarget: 1, flags: winner ? ['winningGoal', 'lateWinner'] : ['winningGoal'] }); }
        else if (inGoal) { this.feed('Tipped over! Great save.', PALETTE.amber); this.resolve({ events: [{ label: 'Shot on target', delta: 0.1 }], shotOnTarget: 1 }); }
        else { this.feed('Wide — worth a go.', PALETTE.creamDim); this.resolve({ events: [{ label: 'Shot off target', delta: -0.05 }], possLost: 1 }); }
      } });
    });
  }

  private netBulge() {
    const g = this.add.graphics().setDepth(60);
    px(g, PITCH.goalX1, PITCH.goalY - 6, PITCH.goalX2 - PITCH.goalX1, 8, PALETTE.white, 0.5);
    this.stage.add(g);
    this.tweens.add({ targets: g, alpha: 0, duration: 500, onComplete: () => g.destroy() });
    if (!Store.state?.settings.reducedShake) this.cameras.main.shake(150, 0.004);
  }

  private bigMessage(text: string, onDone: () => void) {
    const g = this.add.graphics().setDepth(150);
    px(g, 0, 0, MATCH_W, MATCH_H, PALETTE.bgDeep, 0.6);
    const t = this.add.text(MATCH_W / 2, MATCH_H / 2, text, { fontFamily: FONT.heading, fontSize: '18px', color: hex(PALETTE.cream), fontStyle: 'bold', resolution: 3 }).setOrigin(0.5).setDepth(151);
    AudioManager.play('whistle');
    this.tweens.add({ targets: [g, t], alpha: 0, delay: 900, duration: 400, onComplete: () => { g.destroy(); t.destroy(); onDone(); } });
  }

  private startRain() {
    const rg = this.add.graphics().setDepth(95);
    const drops: { x: number; y: number }[] = [];
    for (let i = 0; i < 50; i++) drops.push({ x: Math.random() * MATCH_W, y: Math.random() * MATCH_H });
    this.time.addEvent({ delay: 32, loop: true, callback: () => {
      rg.clear();
      for (const d of drops) { d.y += 8; d.x -= 2; if (d.y > MATCH_H) { d.y = -3; d.x = Math.random() * MATCH_W + 20; } px(rg, d.x, d.y, 1, 3, PALETTE.rain, 0.3); }
    } });
  }

  private finish() {
    const s = Store.get();
    const result = MatchSystem.finalize(s, this.acc);
    Store.autosave();
    this.bigMessage('FULL TIME', () => {
      const hint = document.getElementById('orientation-hint');
      if (hint) hint.hidden = true;
      this.scene.start('PostMatch', { result });
    });
  }

  update(_t: number, delta: number) {
    this.stage?.list.forEach((o) => { if (o instanceof Footballer) o.update(delta); });
  }
}
