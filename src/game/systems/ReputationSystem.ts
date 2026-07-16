import type { CareerState } from '../types';

/**
 * Reputation archetypes (§15). Labels emerge from accumulated behaviour —
 * they are never picked by the player. Recomputed after big events / matches
 * and surfaced in news and career summaries.
 */

interface ArchetypeRule {
  label: string;
  test: (s: CareerState) => boolean;
}

const RULES: ArchetypeRule[] = [
  { label: 'Hometown Hero', test: (s) => s.player.attr.loyalty > 70 && s.player.attr.supporterRep > 65 },
  { label: 'One-Club Legend', test: (s) => s.player.attr.loyalty > 80 && s.player.seasonApps > 20 },
  { label: 'Mercenary', test: (s) => s.player.attr.loyalty < 30 && s.player.attr.ambition > 70 },
  { label: 'Dressing-Room Leader', test: (s) => s.player.attr.leadership > 60 && s.player.attr.dressingRoomInfluence > 55 },
  { label: 'Selfish Finisher', test: (s) => s.memories.filter((m) => m.tags.includes('selfish')).length >= 2 && s.player.seasonGoals > 3 },
  { label: 'Big-Game Player', test: (s) => s.memories.filter((m) => m.tags.includes('derby') && m.impact === 'positive').length >= 1 && bigGameRating(s) },
  { label: 'Media Villain', test: (s) => s.memories.filter((m) => m.tags.includes('controversy')).length >= 2 },
  { label: 'Fan Favourite', test: (s) => s.player.attr.supporterRep > 72 },
  { label: 'Model Professional', test: (s) => s.player.attr.professionalism > 70 && s.player.attr.discipline > 65 },
  { label: 'Comeback King', test: (s) => s.memories.some((m) => m.tags.includes('comeback')) },
];

function bigGameRating(s: CareerState): boolean {
  return s.player.form.slice(-3).some((r) => r >= 7.5);
}

export const ReputationSystem = {
  recompute(s: CareerState) {
    const earned = RULES.filter((r) => safe(() => r.test(s))).map((r) => r.label);
    // Keep at most 3 headline archetypes, most recently qualifying first.
    s.player.archetypes = earned.slice(0, 3);
  },

  primary(s: CareerState): string {
    return s.player.archetypes[0] ?? 'Unproven Talent';
  },
};

function safe(fn: () => boolean): boolean {
  try { return fn(); } catch { return false; }
}
