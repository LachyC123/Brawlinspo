import type { CareerState } from '../types';
import { EVENTS, GameEvent } from '../data/events';

/**
 * Event selection (§43). Never fires an event blindly: an event is eligible
 * only when its `when` predicate passes AND it is off cooldown. Among eligible
 * events one is chosen by weight, so the world feels reactive, not random.
 */
export const EventSystem = {
  eligible(s: CareerState): GameEvent[] {
    return EVENTS.filter((e) => (s.eventCooldowns[e.id] ?? 0) <= 0 && safe(() => e.when(s)));
  },

  pick(s: CareerState): GameEvent | null {
    const pool = this.eligible(s);
    if (!pool.length) return null;
    const total = pool.reduce((sum, e) => sum + e.weight, 0);
    let roll = Math.random() * total;
    for (const e of pool) {
      roll -= e.weight;
      if (roll <= 0) return e;
    }
    return pool[pool.length - 1];
  },

  /** Record that an event resolved: set its cooldown + append to history. */
  resolve(s: CareerState, event: GameEvent, choiceId: string) {
    s.eventCooldowns[event.id] = event.cooldown;
    s.eventHistory.push({ eventId: event.id, choiceId, week: s.week, season: s.season });
  },
};

function safe(fn: () => boolean): boolean {
  try {
    return fn();
  } catch {
    return false;
  }
}
