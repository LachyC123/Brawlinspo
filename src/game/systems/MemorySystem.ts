import type { CareerState, CareerMemory, MemoryImpact } from '../types';

/**
 * The Football Memory system (§3) — the game's signature feature. Major
 * career events are stored as structured data so the rest of the world can
 * react to them: news, supporter comments, dressing-room mood, retirement
 * summaries. Memories are never wiped between matches.
 */

let counter = 0;

export interface MemoryInput {
  type: string;
  headline: string;
  clubId: string;
  competition?: string;
  opponentId?: string;
  characters?: string[];
  impact: MemoryImpact;
  publicImportance: number;
  emotionalImportance: number;
  repEffect: number;
  tags?: string[];
}

export const MemorySystem = {
  add(s: CareerState, m: MemoryInput): CareerMemory {
    const memory: CareerMemory = {
      id: `mem_${Date.now()}_${counter++}`,
      type: m.type,
      headline: m.headline,
      season: s.season,
      week: s.week,
      clubId: m.clubId,
      competition: m.competition ?? 'league',
      opponentId: m.opponentId,
      characters: m.characters ?? [],
      impact: m.impact,
      publicImportance: m.publicImportance,
      emotionalImportance: m.emotionalImportance,
      repEffect: m.repEffect,
      tags: m.tags ?? [],
    };
    s.memories.unshift(memory);
    // Keep the log bounded but generous.
    if (s.memories.length > 200) s.memories.length = 200;
    return memory;
  },

  /** Most publicly + emotionally significant memories, newest first. */
  significant(s: CareerState, limit = 8): CareerMemory[] {
    return [...s.memories]
      .sort((a, b) => b.publicImportance + b.emotionalImportance - (a.publicImportance + a.emotionalImportance))
      .slice(0, limit);
  },

  byTag(s: CareerState, tag: string): CareerMemory[] {
    return s.memories.filter((m) => m.tags.includes(tag));
  },
};
