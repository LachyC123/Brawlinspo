import type { CareerState, TeammateData, RelationshipState } from '../types';
import { clamp } from '../util/rng';

/**
 * Teammate relationships (§11). Derives a readable relationship state from the
 * underlying trust / respect / jealousy values, and exposes the gameplay
 * hooks other systems query (e.g. does this teammate make a supporting run?).
 */
export const RelationshipSystem = {
  deriveState(t: TeammateData): RelationshipState {
    if (t.jealousy > 65 && t.trust < 35) return 'hostile';
    if (t.jealousy > 50 && t.respect < 45) return 'rival';
    if (t.trust < 30) return 'resentful';
    if (t.trust > 78 && t.respect > 70) return 'ally';
    if (t.trust > 70) return 'close';
    if (t.respect > 65 && t.age - 24 > 6) return 'mentor';
    if (t.trust > 50) return 'friendly';
    return 'teammate';
  },

  refreshStates(s: CareerState) {
    s.teammates.forEach((t) => (t.state = this.deriveState(t)));
  },

  adjust(t: TeammateData, key: 'trust' | 'respect' | 'jealousy' | 'morale', d: number) {
    t[key] = clamp(t[key] + d, 0, 100);
  },

  /** How willing a teammate is to make a supporting run for the player. */
  supportWillingness(t: TeammateData): number {
    return clamp((t.trust + t.respect) / 2 - t.jealousy * 0.5, 0, 100);
  },

  /** Overall dressing-room warmth toward the player, 0–100. */
  dressingRoom(s: CareerState): number {
    if (!s.teammates.length) return 50;
    const avg = s.teammates.reduce((sum, t) => sum + (t.trust + t.respect) / 2 - t.jealousy * 0.3, 0) / s.teammates.length;
    return clamp(avg, 0, 100);
  },

  label(state: RelationshipState): string {
    const map: Record<RelationshipState, string> = {
      stranger: 'Stranger', teammate: 'Teammate', friendly: 'Friendly',
      close: 'Close friend', mentor: 'Mentor', rival: 'Rival',
      resentful: 'Resentful', hostile: 'Hostile', ally: 'Loyal ally',
    };
    return map[state];
  },
};
