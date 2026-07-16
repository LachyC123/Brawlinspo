import type {
  CareerState,
  PlayerData,
  Fixture,
  LeagueRow,
  Attributes,
  Position,
  Background,
} from '../types';
import { SAVE_VERSION } from '../config';
import { cloneClubs, STARTING_CLUB_ID } from '../data/clubs';
import { cloneSquad } from '../data/players';
import { clamp, randInt } from '../util/rng';

/** Baseline attributes for an amateur 16-year-old, tuned per position. */
function baseAttributes(position: Position): Attributes {
  const a: Attributes = {
    shooting: 28, passing: 30, dribbling: 30, control: 30, pace: 40,
    strength: 26, vision: 30, composure: 28, positioning: 28, stamina: 42,
    confidence: 45, discipline: 50, professionalism: 45, leadership: 30,
    loyalty: 55, ambition: 55, mediaRep: 12, supporterRep: 30, dressingRoomInfluence: 20,
  };
  switch (position) {
    case 'ST': a.shooting += 8; a.positioning += 6; a.composure += 4; break;
    case 'W': a.pace += 8; a.dribbling += 8; a.control += 2; break;
    case 'AM': a.passing += 6; a.vision += 8; a.dribbling += 4; break;
    case 'CM': a.passing += 8; a.stamina += 6; a.positioning += 4; break;
  }
  return a;
}

const BACKGROUND_MODS: Record<Background, (a: Attributes) => void> = {
  street: (a) => { a.dribbling += 8; a.control += 4; a.discipline -= 10; },
  academy: (a) => { a.control += 6; a.positioning += 6; a.confidence -= 8; },
  localhero: (a) => { a.supporterRep += 25; a.loyalty += 15; },
  latebloomer: (a) => { a.shooting -= 4; a.passing -= 4; a.dribbling -= 4; a.control -= 4; },
  family: (a) => { a.mediaRep += 25; a.confidence += 6; },
};

/** Circle-method double round-robin: 8 clubs → 14 league weeks. */
function generateFixtures(clubIds: string[]): Fixture[] {
  const ids = [...clubIds];
  const n = ids.length;
  const rounds: [string, string][][] = [];
  const arr = [...ids];
  for (let r = 0; r < n - 1; r++) {
    const pairings: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      pairings.push([arr[i], arr[n - 1 - i]]);
    }
    rounds.push(pairings);
    // rotate all but the first element
    arr.splice(1, 0, arr.pop()!);
  }
  const fixtures: Fixture[] = [];
  let week = 1;
  // First half: as drawn. Second half: reversed venue.
  for (const round of rounds) {
    for (const [h, a] of round) fixtures.push({ week, homeId: h, awayId: a, played: false, competition: 'league' });
    week++;
  }
  for (const round of rounds) {
    for (const [h, a] of round) fixtures.push({ week, homeId: a, awayId: h, played: false, competition: 'league' });
    week++;
  }
  return fixtures;
}

function emptyTable(clubIds: string[]): LeagueRow[] {
  return clubIds.map((id) => ({ clubId: id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }));
}

export const CareerSystem = {
  create(player: Omit<PlayerData, 'attr' | 'cond' | 'form' | 'seasonGoals' | 'seasonAssists' | 'seasonApps' | 'careerGoals' | 'careerAssists' | 'managerTrust' | 'money' | 'archetypes'>, slot: number): CareerState {
    const attr = baseAttributes(player.position);
    BACKGROUND_MODS[player.background](attr);
    // clamp
    (Object.keys(attr) as (keyof Attributes)[]).forEach((k) => (attr[k] = clamp(attr[k], 1, 99)));

    const fullPlayer: PlayerData = {
      ...player,
      attr,
      cond: { fitness: 90, morale: 70, sharpness: 60, stress: 20, injuryRisk: 10 },
      form: [],
      seasonGoals: 0, seasonAssists: 0, seasonApps: 0,
      careerGoals: 0, careerAssists: 0,
      managerTrust: 55,
      money: 1200,
      archetypes: [],
    };

    const clubs = cloneClubs();
    if (player.background === 'localhero') {
      const c = clubs.find((x) => x.id === STARTING_CLUB_ID);
      if (c) c.supporterLove = clamp(c.supporterLove + 20, 0, 100);
    }
    const clubIds = clubs.map((c) => c.id);

    const state: CareerState = {
      version: SAVE_VERSION,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      season: 1,
      week: 1,
      weekTrained: false,
      weekEventResolved: false,
      player: fullPlayer,
      clubId: STARTING_CLUB_ID,
      clubs,
      teammates: cloneSquad(),
      fixtures: generateFixtures(clubIds),
      table: emptyTable(clubIds),
      memories: [],
      eventHistory: [],
      eventCooldowns: {},
      objective: 'Win over the dressing room and make the starting XI your own.',
      goldenBoot: { name: '', goals: 0 },
      settings: {
        music: true, sfx: true, volume: 0.7, reducedMotion: false,
        reducedShake: false, highContrast: false, leftHanded: false, textScale: 1,
      },
    };
    return state;
  },

  currentFixture(s: CareerState): Fixture | undefined {
    return s.fixtures.find((f) => f.week === s.week && !f.played && (f.homeId === s.clubId || f.awayId === s.clubId));
  },

  isSeasonOver(s: CareerState): boolean {
    return !s.fixtures.some((f) => !f.played && (f.homeId === s.clubId || f.awayId === s.clubId));
  },

  /** Record a league result into the table. */
  applyResult(s: CareerState, homeId: string, awayId: string, hg: number, ag: number) {
    const fx = s.fixtures.find((f) => f.week === s.week && f.homeId === homeId && f.awayId === awayId);
    if (fx && !fx.played) {
      fx.homeGoals = hg; fx.awayGoals = ag; fx.played = true;
    }
    const home = s.table.find((r) => r.clubId === homeId)!;
    const away = s.table.find((r) => r.clubId === awayId)!;
    home.played++; away.played++;
    home.gf += hg; home.ga += ag; away.gf += ag; away.ga += hg;
    if (hg > ag) { home.won++; home.points += 3; away.lost++; }
    else if (hg < ag) { away.won++; away.points += 3; home.lost++; }
    else { home.drawn++; away.drawn++; home.points++; away.points++; }
  },

  /** Simulate every OTHER fixture in the current week (not the player's). */
  simulateOtherFixtures(s: CareerState) {
    const weekFixtures = s.fixtures.filter((f) => f.week === s.week && !f.played);
    for (const f of weekFixtures) {
      const h = s.clubs.find((c) => c.id === f.homeId)!;
      const a = s.clubs.find((c) => c.id === f.awayId)!;
      // Strength from reputation + facilities with home advantage + noise.
      const hs = h.reputation + h.facilities * 0.3 + 10 + randInt(-14, 14);
      const as = a.reputation + a.facilities * 0.3 + randInt(-14, 14);
      const hg = Math.max(0, Math.round((hs - as) / 22 + randInt(0, 2)));
      const ag = Math.max(0, Math.round((as - hs) / 22 + randInt(0, 2)));
      this.applyResult(s, f.homeId, f.awayId, hg, ag);
    }
  },

  sortedTable(s: CareerState): LeagueRow[] {
    return [...s.table].sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
  },

  /** End-of-week: recover condition, decay cooldowns, advance the clock. */
  advanceWeek(s: CareerState) {
    const c = s.player.cond;
    c.fitness = clamp(c.fitness + 14, 0, 100);
    c.stress = clamp(c.stress - 6, 0, 100);
    c.sharpness = clamp(c.sharpness - 2, 0, 100);
    c.injuryRisk = clamp(c.injuryRisk - 3, 0, 100);
    // Teammate moods drift toward neutral slightly.
    s.teammates.forEach((t) => {
      t.morale = clamp(t.morale + (t.morale < 55 ? 2 : -1), 0, 100);
      t.jealousy = clamp(t.jealousy - 1, 0, 100);
    });
    for (const k of Object.keys(s.eventCooldowns)) {
      s.eventCooldowns[k] = Math.max(0, s.eventCooldowns[k] - 1);
    }
    s.week++;
    s.weekTrained = false;
    s.weekEventResolved = false;
    this.updateObjective(s);
  },

  /** Contextual objective shown on the home screen (§22). */
  updateObjective(s: CareerState) {
    const dr = s.teammates.reduce((a, t) => a + (t.trust + t.respect) / 2, 0) / (s.teammates.length || 1);
    const pos = this.sortedTable(s).findIndex((r) => r.clubId === s.clubId) + 1;
    if (s.pendingTransfer) s.objective = 'A club has come in for you — decide your future.';
    else if (dr < 45) s.objective = 'Win the dressing room round. Trust is low.';
    else if (s.player.managerTrust < 45) s.objective = 'Prove yourself to the manager.';
    else if (pos > 4) s.objective = `Climb the table — Rovers sit ${ordinal(pos)}.`;
    else if (pos <= 3) s.objective = `Keep it up — promotion is on. Rovers ${ordinal(pos)}.`;
    else s.objective = 'Make the shirt your own and score the goals.';
  },

  /** Roll the world into a new season: promotions/relegations abstracted. */
  startNewSeason(s: CareerState) {
    const clubIds = s.clubs.map((c) => c.id);
    s.season++;
    s.week = 1;
    s.weekTrained = false;
    s.weekEventResolved = false;
    s.fixtures = generateFixtures(clubIds);
    s.table = emptyTable(clubIds);
    s.player.age++;
    s.player.seasonGoals = 0;
    s.player.seasonAssists = 0;
    s.player.seasonApps = 0;
    s.goldenBoot = { name: '', goals: 0 };
    // Rival + others drift in reputation a little each year.
    s.clubs.forEach((c) => (c.reputation = clamp(c.reputation + randInt(-2, 3), 10, 60)));
    this.updateObjective(s);
  },
};

function ordinal(n: number): string {
  const sfx = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (sfx[(v - 20) % 10] || sfx[v] || sfx[0]);
}
