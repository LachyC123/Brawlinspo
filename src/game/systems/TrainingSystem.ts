import type { CareerState, Attributes } from '../types';
import { clamp } from '../util/rng';

/**
 * Weekly training (§21). One main activity per week. Choices trade condition
 * against development, and early-career players grow faster (§44). Late
 * Bloomers get an additional early-development boost.
 */

export interface TrainingOption {
  id: string;
  name: string;
  desc: string;
  attrs: (keyof Attributes)[];
  fitnessCost: number;
  sharpnessGain: number;
  interactive?: boolean; // has a mini drill in the Training scene
}

export const TRAINING: TrainingOption[] = [
  { id: 'finishing', name: 'Finishing', desc: 'Sharpen your shooting in front of goal.', attrs: ['shooting', 'composure'], fitnessCost: 10, sharpnessGain: 10, interactive: true },
  { id: 'passing', name: 'Passing', desc: 'Drill weight and timing of your passing.', attrs: ['passing', 'vision'], fitnessCost: 8, sharpnessGain: 9, interactive: true },
  { id: 'dribbling', name: 'Dribbling', desc: 'Beat cones and defenders at pace.', attrs: ['dribbling', 'control'], fitnessCost: 10, sharpnessGain: 9, interactive: true },
  { id: 'physical', name: 'Physical', desc: 'Build strength, pace and stamina.', attrs: ['strength', 'pace', 'stamina'], fitnessCost: 14, sharpnessGain: 6 },
  { id: 'tactical', name: 'Tactical', desc: 'Study shape, positioning and movement.', attrs: ['positioning', 'vision'], fitnessCost: 4, sharpnessGain: 5 },
  { id: 'setpieces', name: 'Set Pieces', desc: 'Free kicks and penalties on repeat.', attrs: ['shooting', 'composure'], fitnessCost: 6, sharpnessGain: 7 },
  { id: 'recovery', name: 'Recovery', desc: 'Rest, ice baths and physio. Restore the body.', attrs: [], fitnessCost: -22, sharpnessGain: -2 },
  { id: 'bonding', name: 'Team Bonding', desc: 'Build trust across the whole dressing room.', attrs: ['dressingRoomInfluence'], fitnessCost: 2, sharpnessGain: 2 },
];

export const TrainingSystem = {
  /** Growth multiplier: teenagers develop fast, late bloomers faster still. */
  growthMultiplier(s: CareerState): number {
    let m = s.player.age <= 19 ? 1.4 : s.player.age <= 24 ? 1.0 : 0.6;
    if (s.player.background === 'latebloomer' && s.season <= 2) m *= 1.5;
    return m;
  },

  /**
   * Apply a session. `quality` (0..1) comes from an interactive drill, or is
   * a flat 0.6 for choice-only sessions. Returns a summary of what improved.
   */
  apply(s: CareerState, option: TrainingOption, quality = 0.6): string[] {
    const cond = s.player.cond;
    cond.fitness = clamp(cond.fitness - option.fitnessCost, 0, 100);
    cond.sharpness = clamp(cond.sharpness + option.sharpnessGain, 0, 100);
    if (option.id === 'recovery') { cond.stress = clamp(cond.stress - 14, 0, 100); cond.injuryRisk = clamp(cond.injuryRisk - 8, 0, 100); }

    const summary: string[] = [];
    if (option.id === 'bonding') {
      s.teammates.forEach((t) => { t.trust = clamp(t.trust + 4, 0, 100); t.morale = clamp(t.morale + 3, 0, 100); });
      s.player.attr.dressingRoomInfluence = clamp(s.player.attr.dressingRoomInfluence + 2, 1, 99);
      summary.push('Dressing-room trust improved across the squad.');
      return summary;
    }

    const mult = this.growthMultiplier(s);
    const gain = Math.max(0, (0.4 + quality) * mult);
    for (const key of option.attrs) {
      const before = Math.floor(s.player.attr[key]);
      s.player.attr[key] = clamp(s.player.attr[key] + gain, 1, 99);
      const after = Math.floor(s.player.attr[key]);
      if (after > before) summary.push(`${prettyAttr(key)} +${after - before}`);
      else summary.push(`${prettyAttr(key)} improving…`);
    }
    if (!summary.length) summary.push('A solid session in the legs.');
    return summary;
  },
};

function prettyAttr(k: string): string {
  return k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}
