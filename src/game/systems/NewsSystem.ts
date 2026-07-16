import type { CareerState, MatchResult } from '../types';
import { ReputationSystem } from './ReputationSystem';
import { pick } from '../util/rng';

/**
 * News + social reactions (§16). Comments reference the ACTUAL match and the
 * player's recent Football Memories — never generic "great game!" filler.
 */

export interface NewsScreen {
  headline: string;
  article: string;
  comments: string[];
  teammateReaction?: string;
  managerComment: string;
}

export const NewsSystem = {
  build(s: CareerState, result: MatchResult): NewsScreen {
    const club = s.clubs.find((c) => c.id === s.clubId)!;
    const oppId = result.isHome ? result.awayId : result.homeId;
    const opp = s.clubs.find((c) => c.id === oppId)!;
    const teamGoals = result.isHome ? result.homeGoals : result.awayGoals;
    const oppGoals = result.isHome ? result.awayGoals : result.homeGoals;
    const won = teamGoals > oppGoals;
    const drew = teamGoals === oppGoals;
    const name = s.player.surname;
    const isDerby = club.rivalId === opp.id;

    // --- Headline ---
    let headline: string;
    if (result.flags?.includes?.('winningGoal') && isDerby) headline = `${name.toUpperCase()} SINKS ${opp.short} IN THE DERBY`;
    else if (won && result.playerGoals >= 2) headline = `${name} DOUBLE DOWNS ${opp.name}`;
    else if (won && result.playerGoals >= 1) headline = `${name} FIRES ${club.short} PAST ${opp.short}`;
    else if (won) headline = `${club.name} EDGE ${opp.short}`;
    else if (drew) headline = `${club.short} HELD BY ${opp.short}`;
    else headline = `${opp.name} SEE OFF ${club.short}`;

    // --- Article ---
    const scoreLine = `${result.homeGoals}-${result.awayGoals}`;
    let article = `${club.name} ${won ? 'beat' : drew ? 'drew with' : 'lost to'} ${opp.name} ${scoreLine} at ${result.isHome ? club.stadium : opp.stadium}. `;
    if (result.playerGoals > 0) article += `${name} scored ${result.playerGoals === 1 ? 'once' : result.playerGoals + ' times'} `;
    if (result.playerAssists > 0) article += `${result.playerGoals > 0 ? 'and set up' : `${name} set up`} ${result.playerAssists} more `;
    article += `for a match rating of ${result.rating.toFixed(1)}. `;
    const arch = ReputationSystem.primary(s);
    if (s.player.archetypes.length) article += `The talk in Greywick is of a ${arch.toLowerCase()} in the making.`;

    // --- Supporter comments referencing real events ---
    const comments = this.comments(s, result, won, isDerby, name);

    // --- Teammate reaction ---
    let teammateReaction: string | undefined;
    const striker = s.teammates.find((t) => t.position === 'ST');
    if (result.ratingEvents.some((e) => e.label.toLowerCase().includes('selfish')) && striker) {
      teammateReaction = `${striker.firstName} ${striker.surname}: "You had me open. You have to see me there."`;
    } else if (result.playerAssists > 0) {
      const mate = pick(s.teammates);
      teammateReaction = `${mate.firstName} ${mate.surname}: "Ball on a plate, that. Love playing with him."`;
    } else if (result.rating >= 8) {
      const cap = s.teammates.find((t) => t.isCaptain) ?? pick(s.teammates);
      teammateReaction = `${cap.firstName} ${cap.surname}: "That's the level. Do that every week."`;
    }

    // --- Manager comment ---
    let managerComment: string;
    if (result.rating >= 8) managerComment = `Eddie Loxley: "Best player on the pitch by a distance. That's why we brought him in."`;
    else if (result.rating < 5) managerComment = `Eddie Loxley: "He'll be disappointed with that. We all will. We go again Tuesday."`;
    else if (won) managerComment = `Eddie Loxley: "Three points is three points. Proud of the lads."`;
    else managerComment = `Eddie Loxley: "We keep our heads up. This town's been through worse than a bad Saturday."`;

    return { headline, article, comments, teammateReaction, managerComment };
  },

  comments(s: CareerState, result: MatchResult, won: boolean, isDerby: boolean, name: string): string[] {
    const out: string[] = [];
    const club = s.clubs.find((c) => c.id === s.clubId)!;

    if (result.flags?.includes?.('winningGoal') && isDerby) {
      out.push(`That goal against ${s.clubs.find((c) => c.id === club.rivalId)?.short ?? 'them'} will be shown at the Foundry forever.`);
    }
    if (result.flags?.includes?.('penaltyMiss')) {
      out.push(`Twelve yards. TWELVE. My nan could've buried it.`);
    }
    if (result.ratingEvents.some((e) => e.label.toLowerCase().includes('selfish'))) {
      const st = s.teammates.find((t) => t.position === 'ST');
      out.push(`He ignored ${st?.firstName ?? 'the striker'} twice and still forced the shot. Pass it, son.`);
    }
    if (result.playerGoals >= 1 && won) {
      out.push(`Best thing to happen to this club in years. My lad copies his celebration in the garden.`);
    }
    if (result.rating >= 8) out.push(`Whatever they're paying him, it isn't enough. Best on the park again.`);
    if (result.rating < 5) out.push(`Anonymous today. Big reputation, quiet boots.`);

    // Loyalty / transfer memory references.
    if (s.memories.some((m) => m.tags.includes('loyalty'))) {
      out.push(`Say what you want — he stayed when he could've walked. That means something here.`);
    }
    if (s.memories.some((m) => m.tags.includes('community'))) {
      out.push(`Saw him down the community centre last week. Proper local, that one.`);
    }

    // Rival-flavoured neutral fill if we still need a couple.
    const fillers = [
      `Pitch was a bog again. When are we ever going to fix that drainage?`,
      `Under the lights at the Foundry, ${result.rating >= 6.5 ? 'he looked the part' : 'we looked nervous'}.`,
      `${won ? 'Get in!' : 'Onwards.'} Same again next week, up the Rovers.`,
      isDerby ? `Beating that lot is all that matters round here.` : `Steady progress. This is our season, I can feel it.`,
      `My knees can't take many more Saturdays like that one.`,
    ];
    // Fill up to four without repeating a filler line.
    const shuffled = [...fillers].sort(() => Math.random() - 0.5);
    let fi = 0;
    while (out.length < 4 && fi < shuffled.length) {
      if (!out.includes(shuffled[fi])) out.push(shuffled[fi]);
      fi++;
    }
    return out.slice(0, 5);
  },
};
