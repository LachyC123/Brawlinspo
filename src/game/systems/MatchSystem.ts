import type { CareerState, MatchResult, CareerMemory } from '../types';
import { CareerSystem } from './CareerSystem';
import { MemorySystem } from './MemorySystem';
import { RelationshipSystem } from './RelationshipSystem';
import { clamp, randInt } from '../util/rng';

/**
 * Match number-crunching (§10). The interactive moments live in MatchScene;
 * this system turns the accumulated contributions into a rating, resolves the
 * final scoreline, updates the league table + player record, ripples through
 * teammate relationships and writes Football Memories.
 */

export interface MatchInput {
  opponentId: string;
  isHome: boolean;
  competition: string;
  situations: number;
  playerGoals: number;
  playerAssists: number;
  chancesCreated: number;
  passesCompleted: number;
  passesFailed: number;
  dribblesWon: number;
  possessionLost: number;
  shotsOnTarget: number;
  defensiveActions: number;
  selfishDecisions: number;
  fouls: number;
  ratingEvents: { label: string; delta: number }[];
  flags: string[]; // 'penaltyMiss' | 'winningGoal' | 'refusedPass' | 'sentOff' | 'lateWinner'
}

function squadAbility(s: CareerState): number {
  if (!s.teammates.length) return 45;
  return s.teammates.reduce((a, t) => a + t.ability, 0) / s.teammates.length;
}

export const MatchSystem = {
  computeRating(input: MatchInput): { rating: number; events: { label: string; delta: number }[] } {
    let r = 6.0;
    const events = [...input.ratingEvents];
    for (const e of events) r += e.delta;
    // Discipline penalties captured via flags.
    if (input.flags.includes('sentOff')) r -= 1.5;
    r = clamp(r, 1.0, 10.0);
    return { rating: Math.round(r * 10) / 10, events };
  },

  finalize(s: CareerState, input: MatchInput): MatchResult {
    const club = s.clubs.find((c) => c.id === s.clubId)!;
    const opp = s.clubs.find((c) => c.id === input.opponentId)!;
    const { rating } = this.computeRating(input);

    // Team + opponent strength → teammate goals + goals conceded.
    const teamStrength = club.reputation + squadAbility(s) * 0.5 + (input.isHome ? 6 : 0);
    const oppStrength = opp.reputation + opp.facilities * 0.3 + (input.isHome ? 0 : 6);
    const ratingBoost = (rating - 6) * 0.35;
    const teammateGoals = clamp(Math.round((teamStrength - oppStrength) / 26 + ratingBoost + randInt(0, 1)), 0, 4);
    let oppGoals = clamp(Math.round((oppStrength - teamStrength) / 26 + randInt(0, 2) - (rating - 6) * 0.15), 0, 5);
    const teamGoals = input.playerGoals + teammateGoals;

    // A late winner flag guarantees the player's side edges it.
    let finalTeam = teamGoals;
    let finalOpp = oppGoals;
    if (input.flags.includes('lateWinner') && finalTeam <= finalOpp) {
      finalTeam = finalOpp + 1;
    }

    const homeGoals = input.isHome ? finalTeam : finalOpp;
    const awayGoals = input.isHome ? finalOpp : finalTeam;

    // --- Persist into league table + player record ---
    CareerSystem.applyResult(s, input.isHome ? s.clubId : input.opponentId, input.isHome ? input.opponentId : s.clubId, homeGoals, awayGoals);

    s.player.seasonApps++;
    s.player.seasonGoals += input.playerGoals;
    s.player.seasonAssists += input.playerAssists;
    s.player.careerGoals += input.playerGoals;
    s.player.careerAssists += input.playerAssists;
    s.player.form.push(rating);
    if (s.player.form.length > 6) s.player.form.shift();

    if (s.player.seasonGoals > s.goldenBoot.goals) {
      s.goldenBoot = { name: `${s.player.firstName} ${s.player.surname}`, goals: s.player.seasonGoals };
    }

    // --- Condition ---
    const c = s.player.cond;
    c.fitness = clamp(c.fitness - randInt(18, 28), 0, 100);
    c.sharpness = clamp(c.sharpness + 6, 0, 100);
    c.stress = clamp(c.stress + (rating < 5 ? 12 : 4), 0, 100);
    c.morale = clamp(c.morale + (rating >= 7 ? 10 : rating < 5 ? -12 : 0) + (finalTeam > finalOpp ? 6 : finalTeam < finalOpp ? -6 : 0), 0, 100);

    // --- Manager trust ---
    s.player.managerTrust = clamp(s.player.managerTrust + (rating >= 7 ? 5 : rating < 5 ? -4 : 1) + (input.flags.includes('sentOff') ? -8 : 0), 0, 100);

    // --- Teammate reactions ---
    this.rippleRelationships(s, input, rating);

    // --- Club supporter love ---
    const won = finalTeam > finalOpp;
    club.supporterLove = clamp(club.supporterLove + (won ? 3 : -1) + (rating >= 8 ? 3 : 0), 0, 100);

    // --- Memories ---
    const memories = this.buildMemories(s, input, rating, won, opp);

    return {
      homeId: s.clubId === (input.isHome ? s.clubId : input.opponentId) ? s.clubId : input.opponentId,
      awayId: input.isHome ? input.opponentId : s.clubId,
      homeGoals,
      awayGoals,
      playerGoals: input.playerGoals,
      playerAssists: input.playerAssists,
      rating,
      ratingEvents: input.ratingEvents,
      competition: input.competition,
      memories,
      isHome: input.isHome,
      playerClubId: s.clubId,
      flags: input.flags,
    };
  },

  rippleRelationships(s: CareerState, input: MatchInput, rating: number) {
    const R = RelationshipSystem;
    // Assists build trust with everyone; selfishness erodes it.
    if (input.playerAssists > 0) s.teammates.forEach((t) => R.adjust(t, 'trust', 3 * input.playerAssists));
    if (input.selfishDecisions > 0) {
      s.teammates.forEach((t) => {
        R.adjust(t, 'trust', -2 * input.selfishDecisions);
        if (t.personality === 'competitiveRival' || t.personality === 'hothead') R.adjust(t, 'jealousy', 3 * input.selfishDecisions);
      });
    }
    if (input.flags.includes('refusedPass')) {
      // Whoever you ignored (Mason, by default the striker) takes it personally.
      const striker = s.teammates.find((t) => t.position === 'ST') ?? s.teammates[0];
      R.adjust(striker, 'trust', -8);
      R.adjust(striker, 'jealousy', 6);
    }
    // A star performance makes competitive teammates jealous but earns respect.
    if (rating >= 8) {
      s.teammates.forEach((t) => {
        R.adjust(t, 'respect', 4);
        if (t.personality === 'competitiveRival' || t.personality === 'selfishStar') R.adjust(t, 'jealousy', 5);
      });
    }
    R.refreshStates(s);
  },

  buildMemories(s: CareerState, input: MatchInput, rating: number, won: boolean, opp: { id: string; name: string; rivalId?: string }): CareerMemory[] {
    const created: CareerMemory[] = [];
    const isDerby = s.clubs.find((c) => c.id === s.clubId)?.rivalId === opp.id;

    if (input.flags.includes('winningGoal') && isDerby) {
      created.push(MemorySystem.add(s, {
        type: 'derby_winner', headline: `Scored the winner against ${opp.name} in the derby`, clubId: s.clubId,
        competition: input.competition, opponentId: opp.id, impact: 'positive',
        publicImportance: 90, emotionalImportance: 85, repEffect: 8, tags: ['derby', 'goal', 'clutch', 'winner'],
      }));
    } else if (input.flags.includes('winningGoal')) {
      created.push(MemorySystem.add(s, {
        type: 'match_winner', headline: `Scored the winner against ${opp.name}`, clubId: s.clubId,
        competition: input.competition, opponentId: opp.id, impact: 'positive',
        publicImportance: 55, emotionalImportance: 50, repEffect: 4, tags: ['goal', 'winner'],
      }));
    } else if (input.playerGoals >= 2) {
      created.push(MemorySystem.add(s, {
        type: 'brace', headline: `Bagged ${input.playerGoals} against ${opp.name}`, clubId: s.clubId,
        competition: input.competition, opponentId: opp.id, impact: 'positive',
        publicImportance: 45, emotionalImportance: 40, repEffect: 3, tags: ['goal'],
      }));
    }

    if (input.flags.includes('penaltyMiss')) {
      created.push(MemorySystem.add(s, {
        type: 'penalty_miss', headline: `Missed a penalty against ${opp.name}`, clubId: s.clubId,
        competition: input.competition, opponentId: opp.id, impact: 'negative',
        publicImportance: 60, emotionalImportance: 55, repEffect: -3, tags: ['penalty', 'miss', isDerby ? 'derby' : 'league'],
      }));
    }
    if (input.flags.includes('sentOff')) {
      created.push(MemorySystem.add(s, {
        type: 'red_card', headline: `Sent off against ${opp.name}`, clubId: s.clubId,
        competition: input.competition, opponentId: opp.id, impact: 'negative',
        publicImportance: 50, emotionalImportance: 45, repEffect: -4, tags: ['discipline', 'redcard'],
      }));
    }
    if (rating >= 8.5) {
      created.push(MemorySystem.add(s, {
        type: 'masterclass', headline: `A ${rating.toFixed(1)} masterclass against ${opp.name}`, clubId: s.clubId,
        competition: input.competition, opponentId: opp.id, impact: 'positive',
        publicImportance: 50, emotionalImportance: 40, repEffect: 3, tags: ['performance'],
      }));
    }
    return created;
  },
};
