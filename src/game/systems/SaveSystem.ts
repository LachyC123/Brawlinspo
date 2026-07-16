import type { CareerState } from '../types';
import { SAVE_VERSION } from '../config';

/**
 * Persistence via localStorage. Three slots plus JSON export/import.
 * All reads are defensive: a corrupted or outdated blob returns null rather
 * than throwing, so the game never gets stuck on a broken save (§39, §49).
 */

const KEY = (slot: number) => `locallegend.save.${slot}`;
const SETTINGS_KEY = 'locallegend.settings';
export const NUM_SLOTS = 3;

export interface SlotSummary {
  slot: number;
  exists: boolean;
  name?: string;
  club?: string;
  season?: number;
  week?: number;
  updatedAt?: number;
}

export const SaveSystem = {
  save(slot: number, state: CareerState): boolean {
    try {
      state.updatedAt = Date.now();
      state.version = SAVE_VERSION;
      localStorage.setItem(KEY(slot), JSON.stringify(state));
      return true;
    } catch (e) {
      console.error('Save failed', e);
      return false;
    }
  },

  load(slot: number): CareerState | null {
    try {
      const raw = localStorage.getItem(KEY(slot));
      if (!raw) return null;
      const data = JSON.parse(raw) as CareerState;
      if (!data || typeof data !== 'object' || !data.player) return null;
      // Migrate older saves forward where possible; refuse the truly broken.
      if (data.version > SAVE_VERSION) return null;
      return migrate(data);
    } catch (e) {
      console.error('Load failed (corrupted save?)', e);
      return null;
    }
  },

  delete(slot: number): void {
    localStorage.removeItem(KEY(slot));
  },

  summaries(): SlotSummary[] {
    const out: SlotSummary[] = [];
    for (let i = 0; i < NUM_SLOTS; i++) {
      const s = this.load(i);
      out.push(
        s
          ? {
              slot: i,
              exists: true,
              name: `${s.player.firstName} ${s.player.surname}`,
              club: s.clubs.find((c) => c.id === s.clubId)?.name,
              season: s.season,
              week: s.week,
              updatedAt: s.updatedAt,
            }
          : { slot: i, exists: false },
      );
    }
    return out;
  },

  exportJSON(state: CareerState): string {
    return JSON.stringify(state, null, 2);
  },

  importJSON(json: string): CareerState | null {
    try {
      const data = JSON.parse(json) as CareerState;
      if (!data.player || !data.clubs) return null;
      return migrate(data);
    } catch {
      return null;
    }
  },

  saveSettings(state: CareerState): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    } catch {
      /* ignore */
    }
  },

  loadSettings(): CareerState['settings'] | null {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
};

/** Fill in fields added in later versions so old saves keep working. */
function migrate(data: CareerState): CareerState {
  data.eventCooldowns = data.eventCooldowns || {};
  data.eventHistory = data.eventHistory || [];
  data.memories = data.memories || [];
  data.player.archetypes = data.player.archetypes || [];
  data.goldenBoot = data.goldenBoot || { name: '', goals: 0 };
  data.weekTrained = data.weekTrained ?? false;
  data.weekEventResolved = data.weekEventResolved ?? false;
  const defaults = {
    music: true, sfx: true, volume: 0.7, reducedMotion: false,
    reducedShake: false, highContrast: false, leftHanded: false, textScale: 1,
  };
  data.settings = Object.assign({}, defaults, data.settings || {});
  return data;
}
