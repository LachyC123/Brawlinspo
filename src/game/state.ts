import type { CareerState, ClubData, TeammateData } from './types';
import { SaveSystem } from './systems/SaveSystem';

/**
 * Global career store. A thin singleton wrapper so any scene can reach the
 * active CareerState and the current save slot. Kept deliberately small —
 * gameplay logic lives in the systems, not here.
 */
class GameStore {
  state: CareerState | null = null;
  slot = 0;

  set(state: CareerState, slot: number) {
    this.state = state;
    this.slot = slot;
  }

  get(): CareerState {
    if (!this.state) throw new Error('No active career');
    return this.state;
  }

  club(id?: string): ClubData {
    const s = this.get();
    const cid = id ?? s.clubId;
    return s.clubs.find((c) => c.id === cid) ?? s.clubs[0];
  }

  teammate(id: string): TeammateData | undefined {
    return this.get().teammates.find((t) => t.id === id);
  }

  /** Persist to the active slot. Called after weeks + matches (§39). */
  autosave() {
    if (this.state) SaveSystem.save(this.slot, this.state);
  }
}

export const Store = new GameStore();
