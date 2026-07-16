import type { TeammateData, Appearance } from '../types';

function appr(skin: number, hairStyle: number, hairColor: number, build: number): Appearance {
  return { skinTone: skin, hairStyle, hairColor, eyeColor: 0, build };
}

/**
 * Six important Greywick Rovers teammates + the manager. These are the
 * characters that drive relationship gameplay in the vertical slice.
 */
export const GREYWICK_SQUAD: TeammateData[] = [
  {
    id: 'mason',
    firstName: 'Mason',
    surname: 'Barlow',
    age: 29,
    position: 'ST',
    personality: 'competitiveRival',
    ability: 58,
    appearance: appr(1, 2, 0, 3),
    trust: 45,
    respect: 50,
    jealousy: 30,
    morale: 60,
    state: 'teammate',
    concern: 'He wants the goals and the attention — and he was here first.',
    goal: 'Be the top scorer and earn one last move up a division.',
  },
  {
    id: 'reece',
    firstName: 'Reece',
    surname: 'Fenwick',
    age: 34,
    position: 'CM',
    personality: 'loyalVeteran',
    ability: 55,
    appearance: appr(0, 5, 5, 2),
    trust: 60,
    respect: 62,
    jealousy: 5,
    morale: 65,
    state: 'teammate',
    concern: 'Worried the club he loves is slipping away financially.',
    goal: 'Keep Rovers up and bring a young player through.',
    isCaptain: true,
  },
  {
    id: 'ollie',
    firstName: 'Ollie',
    surname: 'Craddock',
    age: 17,
    position: 'W',
    personality: 'shyProspect',
    ability: 44,
    appearance: appr(0, 1, 2, 0),
    trust: 55,
    respect: 40,
    jealousy: 10,
    morale: 55,
    state: 'teammate',
    concern: 'Terrified of making a mistake and being dropped.',
    goal: 'Establish himself and not let his hometown down.',
  },
  {
    id: 'sekou',
    firstName: 'Sekou',
    surname: 'Diallo',
    age: 23,
    position: 'AM',
    personality: 'joker',
    ability: 52,
    appearance: appr(4, 3, 0, 1),
    trust: 58,
    respect: 48,
    jealousy: 12,
    morale: 70,
    state: 'teammate',
    concern: 'Keeps the mood up but hides how much he wants to be noticed.',
    goal: 'Get a move to a bigger club and send money home.',
  },
  {
    id: 'kasper',
    firstName: 'Kasper',
    surname: 'Dahl',
    age: 26,
    position: 'CM',
    personality: 'quietPro',
    ability: 56,
    appearance: appr(5, 4, 6, 2),
    trust: 52,
    respect: 55,
    jealousy: 8,
    morale: 58,
    state: 'teammate',
    concern: 'Says little, judges everyone by how hard they work.',
    goal: 'Be respected as the most reliable man in the side.',
  },
  {
    id: 'danny',
    firstName: 'Danny',
    surname: 'Marsden',
    age: 21,
    position: 'W',
    personality: 'hothead',
    ability: 50,
    appearance: appr(1, 6, 1, 1),
    trust: 40,
    respect: 42,
    jealousy: 22,
    morale: 52,
    state: 'teammate',
    concern: 'Brilliant on his day, but one bad tackle from a red card.',
    goal: 'Prove the coaches who doubted him wrong.',
  },
];

export interface ManagerData {
  name: string;
  age: number;
  trait: string;
  line: string;
}

export const GREYWICK_MANAGER: ManagerData = {
  name: 'Eddie Loxley',
  age: 47,
  trait: 'Passionate but inexperienced. Wears his heart on his sleeve.',
  line: 'This club is the town. Don’t forget who you’re playing for.',
};

export function cloneSquad(): TeammateData[] {
  return GREYWICK_SQUAD.map((t) => ({ ...t, appearance: { ...t.appearance } }));
}
