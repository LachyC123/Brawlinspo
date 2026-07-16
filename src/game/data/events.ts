import type { CareerState, TeammateData } from '../types';
import { clamp } from '../util/rng';

/**
 * Story / character events. Each event is conditional (§43) — it only enters
 * the pool when its `when` predicate passes — and has 2–4 choices whose
 * consequences are deliberately non-obvious (§12). Choices mutate the career
 * state and may optionally spawn a Football Memory.
 */

export interface EventChoice {
  id: string;
  label: string;
  /** Applies effects; returns a short outcome line shown to the player. */
  apply: (s: CareerState) => string;
  /** Optional memory spawned by this choice. */
  memory?: (s: CareerState) => { type: string; headline: string; impact: 'positive' | 'negative' | 'neutral'; tags: string[]; characters?: string[]; pub: number; emo: number; rep: number };
}

export interface GameEvent {
  id: string;
  /** Higher = more likely to be chosen when several are eligible. */
  weight: number;
  cooldown: number; // weeks before it can fire again
  title: string;
  body: (s: CareerState) => string;
  when: (s: CareerState) => boolean;
  choices: EventChoice[];
}

function mate(s: CareerState, id: string): TeammateData | undefined {
  return s.teammates.find((t) => t.id === id);
}
function adj(t: TeammateData | undefined, key: 'trust' | 'respect' | 'jealousy' | 'morale', d: number) {
  if (!t) return;
  t[key] = clamp(t[key] + d, 0, 100);
}
function attr(s: CareerState, key: keyof CareerState['player']['attr'], d: number) {
  const a = s.player.attr;
  a[key] = clamp(a[key] + d, 1, 99) as never;
}
function cond(s: CareerState, key: keyof CareerState['player']['cond'], d: number) {
  const c = s.player.cond;
  c[key] = clamp(c[key] + d, 0, 100);
}

export const EVENTS: GameEvent[] = [
  {
    id: 'captain_attitude',
    weight: 10,
    cooldown: 6,
    title: 'A word from the captain',
    body: () => 'Reece Fenwick catches you after training. "You’ve got more than any of us. But this dressing room notices everything. What kind of player are you going to be?"',
    when: (s) => (mate(s, 'reece')?.respect ?? 0) < 75,
    choices: [
      {
        id: 'humble',
        label: '"I’m here to learn from you."',
        apply: (s) => { adj(mate(s, 'reece'), 'respect', 12); adj(mate(s, 'reece'), 'trust', 8); s.player.attr.professionalism = clamp(s.player.attr.professionalism + 2, 1, 99); return 'Reece nods slowly. He starts looking out for you.'; },
        memory: () => ({ type: 'mentorship', headline: 'Took the captain’s guidance to heart', impact: 'positive', tags: ['leadership', 'humble'], characters: ['reece'], pub: 20, emo: 40, rep: 3 }),
      },
      {
        id: 'confident',
        label: '"I’m going to be the best here."',
        apply: (s) => { adj(mate(s, 'reece'), 'respect', 4); s.player.attr.confidence = clamp(s.player.attr.confidence + 3, 1, 99); s.player.attr.ambition = clamp(s.player.attr.ambition + 3, 1, 99); return 'He half-smiles. "We’ll see." Some will love the swagger, some won’t.'; },
      },
      {
        id: 'dismissive',
        label: 'Shrug and walk off.',
        apply: (s) => { adj(mate(s, 'reece'), 'respect', -14); adj(mate(s, 'reece'), 'trust', -10); s.player.managerTrust = clamp(s.player.managerTrust - 5, 0, 100); return 'Word gets round the dressing room fast. Not a good look.'; },
        memory: () => ({ type: 'disrespect', headline: 'Snubbed the club captain', impact: 'negative', tags: ['attitude'], characters: ['reece'], pub: 25, emo: 30, rep: -4 }),
      },
    ],
  },
  {
    id: 'young_advice',
    weight: 9,
    cooldown: 5,
    title: 'The kid needs a word',
    body: () => 'Ollie Craddock, 17, is sat with his head in his hands. "I gave the ball away for their goal on Saturday. Gaffer’s going to bin me off, isn’t he?"',
    when: (s) => (mate(s, 'ollie')?.morale ?? 100) < 65,
    choices: [
      {
        id: 'reassure',
        label: 'Tell him every player makes mistakes.',
        apply: (s) => { adj(mate(s, 'ollie'), 'morale', 20); adj(mate(s, 'ollie'), 'trust', 15); adj(mate(s, 'ollie'), 'respect', 10); return 'Ollie exhales. "Cheers. Genuinely." He trains harder than anyone that week.'; },
        memory: () => ({ type: 'kindness', headline: 'Picked up a young teammate after a mistake', impact: 'positive', tags: ['mentor', 'community'], characters: ['ollie'], pub: 15, emo: 45, rep: 3 }),
      },
      {
        id: 'toughen',
        label: '"Then don’t give it away next time."',
        apply: (s) => { adj(mate(s, 'ollie'), 'morale', -6); adj(mate(s, 'ollie'), 'respect', 6); return 'Harsh, but he squares his shoulders. Depends whether he responds or breaks.'; },
      },
      {
        id: 'ignore',
        label: 'Not your problem. Keep walking.',
        apply: (s) => { adj(mate(s, 'ollie'), 'trust', -8); return 'He watches you go. The kid remembers who was there and who wasn’t.'; },
      },
    ],
  },
  {
    id: 'rival_message',
    weight: 8,
    cooldown: 4,
    title: 'A message from Ashmoor',
    body: () => 'Your phone buzzes. It’s a number you don’t know: "Heard Greywick signed a superstar. We’ll see how brave you are at Colliery Park. — someone in blue."',
    when: (s) => s.week >= 2,
    choices: [
      {
        id: 'fire',
        label: '"Bring it. I’ll silence your ground."',
        apply: (s) => { s.player.attr.confidence = clamp(s.player.attr.confidence + 3, 1, 99); s.player.attr.mediaRep = clamp(s.player.attr.mediaRep + 4, 1, 99); return 'It leaks online within the hour. The derby just got personal.'; },
        memory: () => ({ type: 'rivalry', headline: 'Fired back at Ashmoor before the derby', impact: 'neutral', tags: ['rivalry', 'derby'], pub: 40, emo: 30, rep: 2 }),
      },
      {
        id: 'ignore',
        label: 'Say nothing. Let your football talk.',
        apply: (s) => { s.player.attr.professionalism = clamp(s.player.attr.professionalism + 3, 1, 99); adj(mate(s, 'reece'), 'respect', 6); return 'The captain approves. "Right answer, that."'; },
      },
      {
        id: 'block',
        label: 'Screenshot it and show the lads.',
        apply: (s) => { s.teammates.forEach((t) => adj(t, 'morale', 5)); return 'The dressing room rallies. "One of us now, aren’t you?"'; },
        memory: () => ({ type: 'bonding', headline: 'Rallied the squad against the rivals', impact: 'positive', tags: ['team', 'rivalry'], pub: 15, emo: 35, rep: 1 }),
      },
    ],
  },
  {
    id: 'financial_crisis',
    weight: 10,
    cooldown: 10,
    title: 'The club can’t pay',
    body: () => 'Manager Eddie Loxley pulls you aside, embarrassed. "The physio’s bill... we can’t cover the specialist for Kasper’s knee this month. I hate even asking."',
    when: (s) => (s.clubs.find((c) => c.id === s.clubId)?.finances ?? 0) < 0,
    choices: [
      {
        id: 'donate',
        label: 'Quietly cover it yourself.',
        apply: (s) => { s.player.money = Math.max(0, s.player.money - 800); const c = s.clubs.find((x) => x.id === s.clubId); if (c) { c.finances += 800; c.supporterLove = clamp(c.supporterLove + 12, 0, 100); } adj(mate(s, 'kasper'), 'trust', 18); adj(mate(s, 'kasper'), 'respect', 15); s.player.attr.loyalty = clamp(s.player.attr.loyalty + 4, 1, 99); return 'You told no one. Somehow, everyone knows. Kasper never forgets it.'; },
        memory: () => ({ type: 'loyalty', headline: 'Paid a teammate’s medical bill in the crisis', impact: 'positive', tags: ['loyalty', 'community', 'sacrifice'], characters: ['kasper'], pub: 30, emo: 60, rep: 6 }),
      },
      {
        id: 'suggest',
        label: 'Suggest a fundraiser with the supporters.',
        apply: (s) => { const c = s.clubs.find((x) => x.id === s.clubId); if (c) { c.finances += 400; c.supporterLove = clamp(c.supporterLove + 8, 0, 100); } s.player.attr.dressingRoomInfluence = clamp(s.player.attr.dressingRoomInfluence + 3, 1, 99); return 'The pub organises a collection. It’s not much, but it’s something.'; },
      },
      {
        id: 'decline',
        label: '"That’s the club’s problem, not mine."',
        apply: (s) => { s.player.managerTrust = clamp(s.player.managerTrust - 8, 0, 100); adj(mate(s, 'kasper'), 'respect', -10); return 'Eddie just nods and walks off. The quiet ones judge hardest.'; },
        memory: () => ({ type: 'selfish', headline: 'Turned its back on the club in a crisis', impact: 'negative', tags: ['selfish'], characters: ['kasper'], pub: 20, emo: 40, rep: -5 }),
      },
    ],
  },
  {
    id: 'extra_training',
    weight: 7,
    cooldown: 4,
    title: 'Extra session?',
    body: () => 'Sekou is still on the pitch after everyone’s gone in, striking free kicks. "Come on, superstar. Stay back with me. Or are you too good to practise?"',
    when: (s) => s.player.cond.fitness > 40,
    choices: [
      {
        id: 'stay',
        label: 'Stay and put the work in.',
        apply: (s) => { attr(s, 'shooting', 1); cond(s, 'sharpness', 8); cond(s, 'fitness', -6); adj(mate(s, 'sekou'), 'trust', 12); adj(mate(s, 'sekou'), 'respect', 10); return 'An hour of dead balls in the drizzle. Sekou grins. "Now we’re talking."'; },
      },
      {
        id: 'go',
        label: 'Nah, save the legs. Head in.',
        apply: (s) => { cond(s, 'fitness', 4); adj(mate(s, 'sekou'), 'respect', -4); return 'He shrugs and keeps shooting alone.'; },
      },
    ],
  },
  {
    id: 'sponsor_deal',
    weight: 6,
    cooldown: 12,
    title: 'A questionable sponsor',
    body: () => 'An agent slides a card across the café table. "Betting firm. Big money for a lad your level. They just want a few posts. Easy."',
    when: (s) => s.player.attr.mediaRep > 30,
    choices: [
      {
        id: 'take',
        label: 'Take the money.',
        apply: (s) => { s.player.money += 3000; s.player.attr.supporterRep = clamp(s.player.attr.supporterRep - 8, 1, 99); s.player.attr.mediaRep = clamp(s.player.attr.mediaRep + 6, 1, 99); return '£3,000 in the bank. Some supporters aren’t impressed.'; },
        memory: () => ({ type: 'commercial', headline: 'Signed a controversial betting deal', impact: 'negative', tags: ['media', 'money'], pub: 35, emo: 20, rep: -3 }),
      },
      {
        id: 'refuse',
        label: 'Turn it down.',
        apply: (s) => { s.player.attr.supporterRep = clamp(s.player.attr.supporterRep + 6, 1, 99); s.player.attr.professionalism = clamp(s.player.attr.professionalism + 2, 1, 99); return 'You keep your name clean. The supporters hear about it.'; },
        memory: () => ({ type: 'integrity', headline: 'Rejected easy money to protect the badge', impact: 'positive', tags: ['integrity', 'community'], pub: 20, emo: 30, rep: 3 }),
      },
    ],
  },
  {
    id: 'night_out',
    weight: 6,
    cooldown: 4,
    title: 'Big night before the match',
    body: () => 'Danny Marsden is buzzing. "Lads are heading to the Anchor tonight. Come out! One game we can win in our sleep." There’s a match in two days.',
    when: (s) => s.player.cond.stress > 40,
    choices: [
      {
        id: 'go',
        label: 'Go out with the lads.',
        apply: (s) => { cond(s, 'stress', -18); cond(s, 'sharpness', -12); adj(mate(s, 'danny'), 'trust', 14); s.teammates.forEach((t) => adj(t, 'morale', 4)); return 'A proper laugh. You’ll feel it in the legs though.'; },
      },
      {
        id: 'one',
        label: 'Show your face, then leave early.',
        apply: (s) => { cond(s, 'stress', -8); cond(s, 'sharpness', -3); adj(mate(s, 'danny'), 'trust', 6); return 'Best of both. Danny respects that you came at all.'; },
      },
      {
        id: 'stay',
        label: 'Stay home and rest.',
        apply: (s) => { cond(s, 'sharpness', 6); adj(mate(s, 'danny'), 'trust', -5); s.player.attr.professionalism = clamp(s.player.attr.professionalism + 2, 1, 99); return 'Professional. Danny mutters something about you being boring.'; },
      },
    ],
  },
  {
    id: 'school_visit',
    weight: 6,
    cooldown: 8,
    title: 'The local school asks',
    body: () => 'A supporter stops you outside the chippy. "My lad’s class would go mad if you came in. They’ve got your name on the back of their jumpers. Would you?"',
    when: (s) => (s.clubs.find((c) => c.id === s.clubId)?.supporterLove ?? 0) > 30,
    choices: [
      {
        id: 'yes',
        label: 'Of course. Spend the morning there.',
        apply: (s) => { const c = s.clubs.find((x) => x.id === s.clubId); if (c) c.supporterLove = clamp(c.supporterLove + 14, 0, 100); s.player.attr.supporterRep = clamp(s.player.attr.supporterRep + 8, 1, 99); cond(s, 'stress', -6); return 'A hundred kids screaming your name. The town takes you in.'; },
        memory: () => ({ type: 'community', headline: 'Gave a morning to the local school', impact: 'positive', tags: ['community', 'hometown'], pub: 25, emo: 40, rep: 4 }),
      },
      {
        id: 'busy',
        label: '"Maybe another time." (You’re busy.)',
        apply: (s) => { const c = s.clubs.find((x) => x.id === s.clubId); if (c) c.supporterLove = clamp(c.supporterLove - 6, 0, 100); return 'The supporter’s face falls. Word travels in a small town.'; },
      },
    ],
  },
  {
    id: 'hidden_injury',
    weight: 8,
    cooldown: 8,
    title: 'A secret in the treatment room',
    body: () => 'You catch Mason wincing, strapping his own hamstring before training. "Don’t say a word. Gaffer drops me, that new lad takes my spot. My spot. Alright?"',
    when: (s) => s.week >= 3,
    choices: [
      {
        id: 'keep',
        label: 'Keep his secret.',
        apply: (s) => { adj(mate(s, 'mason'), 'trust', 20); adj(mate(s, 'mason'), 'jealousy', -10); return 'Mason nods, grateful. For once he sees you as an ally, not a threat.'; },
        memory: () => ({ type: 'loyalty', headline: 'Kept a rival teammate’s injury secret', impact: 'neutral', tags: ['loyalty', 'risk'], characters: ['mason'], pub: 5, emo: 40, rep: 1 }),
      },
      {
        id: 'tell',
        label: 'Tell the manager, for Mason’s own good.',
        apply: (s) => { adj(mate(s, 'mason'), 'trust', -20); adj(mate(s, 'mason'), 'jealousy', 15); s.player.managerTrust = clamp(s.player.managerTrust + 8, 0, 100); s.player.attr.professionalism = clamp(s.player.attr.professionalism + 3, 1, 99); return 'Eddie thanks you. Mason won’t speak to you for weeks. Was it worth it?'; },
        memory: () => ({ type: 'conflict', headline: 'Reported a teammate’s hidden injury', impact: 'neutral', tags: ['conflict'], characters: ['mason'], pub: 10, emo: 45, rep: 0 }),
      },
      {
        id: 'convince',
        label: 'Convince him to see the physio himself.',
        apply: (s) => { adj(mate(s, 'mason'), 'trust', 8); adj(mate(s, 'mason'), 'respect', 10); return 'It takes an hour, but he agrees. Grown-up handling.'; },
      },
    ],
  },
  {
    id: 'manager_criticism',
    weight: 8,
    cooldown: 5,
    title: 'The manager isn’t happy',
    body: () => 'Eddie throws the tactics board down. "You’re playing for yourself out there. This is a team. Have you got something to say to me?"',
    when: (s) => s.player.managerTrust < 55 && s.week >= 2,
    choices: [
      {
        id: 'accept',
        label: 'Take it on the chin.',
        apply: (s) => { s.player.managerTrust = clamp(s.player.managerTrust + 12, 0, 100); s.player.attr.discipline = clamp(s.player.attr.discipline + 2, 1, 99); return 'Eddie softens. "Good lad. Show me Saturday."'; },
      },
      {
        id: 'defend',
        label: '"I’m the one creating chances."',
        apply: (s) => { s.player.managerTrust = clamp(s.player.managerTrust - 6, 0, 100); s.player.attr.confidence = clamp(s.player.attr.confidence + 2, 1, 99); return 'He stares at you. "We’ll see who’s right." A line is drawn.'; },
      },
      {
        id: 'public',
        label: 'Question him in front of the lads.',
        apply: (s) => { s.player.managerTrust = clamp(s.player.managerTrust - 16, 0, 100); s.player.attr.mediaRep = clamp(s.player.attr.mediaRep + 5, 1, 99); s.teammates.forEach((t) => adj(t, 'morale', -4)); return 'The room goes silent. That’ll be all over the local paper by Friday.'; },
        memory: () => ({ type: 'controversy', headline: 'Publicly challenged the manager', impact: 'negative', tags: ['controversy', 'attitude'], pub: 45, emo: 35, rep: -4 }),
      },
    ],
  },
  {
    id: 'transfer_help',
    weight: 6,
    cooldown: 10,
    title: 'Sekou wants out',
    body: () => 'Sekou finds you alone. "There’s interest from up north. I need this move, brother — for my family. Will you tell the gaffer I’m ready? He listens to you now."',
    when: (s) => (mate(s, 'sekou')?.trust ?? 0) > 60,
    choices: [
      {
        id: 'help',
        label: 'Put in a word for him.',
        apply: (s) => { adj(mate(s, 'sekou'), 'trust', 15); adj(mate(s, 'sekou'), 'respect', 12); s.player.managerTrust = clamp(s.player.managerTrust - 4, 0, 100); return 'You back your mate over the club. Sekou won’t forget it, wherever he ends up.'; },
        memory: () => ({ type: 'friendship', headline: 'Helped a friend chase his move', impact: 'positive', tags: ['friendship'], characters: ['sekou'], pub: 10, emo: 35, rep: 1 }),
      },
      {
        id: 'stay',
        label: '"We need you. Stay and fight."',
        apply: (s) => { adj(mate(s, 'sekou'), 'morale', -8); adj(mate(s, 'sekou'), 'respect', 6); const c = s.clubs.find((x) => x.id === s.clubId); if (c) c.supporterLove = clamp(c.supporterLove + 4, 0, 100); return 'He’s torn, but he stays. The bond is complicated now.'; },
      },
    ],
  },
  {
    id: 'journalist_manager',
    weight: 6,
    cooldown: 6,
    title: 'The reporter’s question',
    body: () => 'A local journalist corners you after training. "Off the record — is Eddie Loxley out of his depth at this level? You can be honest."',
    when: (s) => s.player.attr.mediaRep > 25,
    choices: [
      {
        id: 'loyal',
        label: 'Back the manager completely.',
        apply: (s) => { s.player.managerTrust = clamp(s.player.managerTrust + 10, 0, 100); s.player.attr.supporterRep = clamp(s.player.attr.supporterRep + 4, 1, 99); return '"He’s the reason I signed." Eddie reads it and grips your shoulder Monday.'; },
        memory: () => ({ type: 'loyalty', headline: 'Publicly backed the manager', impact: 'positive', tags: ['loyalty', 'media'], pub: 25, emo: 25, rep: 2 }),
      },
      {
        id: 'neutral',
        label: 'Give a diplomatic non-answer.',
        apply: () => 'A safe, boring quote. Nobody remembers it by Tuesday.',
      },
      {
        id: 'throw',
        label: 'Hint that things could be better.',
        apply: (s) => { s.player.managerTrust = clamp(s.player.managerTrust - 14, 0, 100); s.player.attr.mediaRep = clamp(s.player.attr.mediaRep + 8, 1, 99); return 'The headline runs itself. Eddie doesn’t make eye contact all week.'; },
        memory: () => ({ type: 'controversy', headline: 'Undermined the manager in the press', impact: 'negative', tags: ['controversy', 'media'], pub: 40, emo: 30, rep: -4 }),
      },
    ],
  },
  {
    id: 'jealous_striker',
    weight: 7,
    cooldown: 5,
    title: 'Mason snaps',
    body: () => 'After another game where the crowd sang your name, Mason slams his boot into the wall. "It’s the *Mason and the kid* show now, is it? I was banging goals in here before you could shave."',
    when: (s) => (mate(s, 'mason')?.jealousy ?? 0) > 45,
    choices: [
      {
        id: 'calm',
        label: '"We’re better with both of us firing."',
        apply: (s) => { adj(mate(s, 'mason'), 'jealousy', -15); adj(mate(s, 'mason'), 'respect', 8); return 'He breathes out. "...Yeah. Maybe." A truce, for now.'; },
        memory: () => ({ type: 'reconciliation', headline: 'Defused the striker rivalry', impact: 'positive', tags: ['team'], characters: ['mason'], pub: 10, emo: 30, rep: 1 }),
      },
      {
        id: 'bite',
        label: '"Then keep up, old man."',
        apply: (s) => { adj(mate(s, 'mason'), 'jealousy', 15); adj(mate(s, 'mason'), 'trust', -12); mate(s, 'mason') && (mate(s, 'mason')!.state = 'rival'); return 'It’s war now. Expect him to shoot instead of squaring it to you.'; },
        memory: () => ({ type: 'rivalry', headline: 'Turned a teammate into a rival', impact: 'negative', tags: ['conflict'], characters: ['mason'], pub: 15, emo: 40, rep: -1 }),
      },
    ],
  },
];
