import type { CareerState, TransferOffer } from '../types';
import { randInt, chance } from '../util/rng';
import { MemorySystem } from './MemorySystem';

/**
 * Transfers (§14). A move is deliberately not always the right call — leaving
 * carries loyalty, supporter and legacy costs. The vertical slice produces one
 * emotional offer from a bigger club once the player is performing.
 */
export const TransferSystem = {
  maybeGenerateOffer(s: CareerState): TransferOffer | null {
    if (s.pendingTransfer) return null;
    const avgForm = s.player.form.length ? s.player.form.reduce((a, b) => a + b, 0) / s.player.form.length : 0;
    // Needs real form, some apps, and a bit of ambition/media buzz.
    if (s.player.seasonApps < 3 || avgForm < 6.6) return null;
    if (!chance(0.35)) return null;

    const suitor = s.clubs.find((c) => c.id !== s.clubId && c.reputation > 26) ?? s.clubs[1];
    const offer: TransferOffer = {
      clubId: suitor.id,
      wage: randInt(1800, 3200),
      role: avgForm > 7.4 ? 'Key player' : 'Squad rotation',
      playingTime: avgForm > 7.4 ? 'Guaranteed starter' : 'Fighting for a place',
      style: 'Direct, high-tempo football',
      distance: 'Two hours north — a long way from Greywick',
      fee: randInt(40000, 120000),
      week: s.week,
      season: s.season,
    };
    s.pendingTransfer = offer;
    return offer;
  },

  accept(s: CareerState): string {
    const offer = s.pendingTransfer;
    if (!offer) return '';
    const from = s.clubs.find((c) => c.id === s.clubId)!;
    from.supporterLove = Math.max(0, from.supporterLove - 25);
    s.player.attr.loyalty = Math.max(1, s.player.attr.loyalty - 15);
    s.player.attr.ambition = Math.min(99, s.player.attr.ambition + 8);
    MemorySystem.add(s, {
      type: 'transfer',
      headline: `Left ${from.name} for a move up the divisions`,
      clubId: from.id,
      impact: 'neutral',
      publicImportance: 60,
      emotionalImportance: 55,
      repEffect: -3,
      tags: ['transfer', 'ambition'],
    });
    s.pendingTransfer = undefined;
    return `You accept the move. Greywick’s supporters are heartbroken — but the ambition burns.`;
  },

  reject(s: CareerState): string {
    const offer = s.pendingTransfer;
    if (!offer) return '';
    const from = s.clubs.find((c) => c.id === s.clubId)!;
    from.supporterLove = Math.min(100, from.supporterLove + 18);
    s.player.attr.loyalty = Math.min(99, s.player.attr.loyalty + 10);
    s.player.attr.supporterRep = Math.min(99, s.player.attr.supporterRep + 10);
    MemorySystem.add(s, {
      type: 'loyalty',
      headline: `Rejected a move to stay at ${from.name}`,
      clubId: from.id,
      impact: 'positive',
      publicImportance: 55,
      emotionalImportance: 65,
      repEffect: 6,
      tags: ['loyalty', 'hometown'],
    });
    s.pendingTransfer = undefined;
    return `You turn it down. The Foundry Ground will sing your name louder than ever.`;
  },

  delay(s: CareerState): string {
    // Push the decision a few weeks out.
    if (s.pendingTransfer) s.pendingTransfer.week = s.week + 3;
    return 'You ask for time to think. The offer stays on the table for now.';
  },
};
