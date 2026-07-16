import type { ClubData } from '../types';
import { PALETTE } from '../config';

/**
 * The eight Community League clubs. Greywick Rovers is the player's starting
 * club; Ashmoor Athletic is the local rival. All fictional.
 */
export const COMMUNITY_LEAGUE: ClubData[] = [
  {
    id: 'greywick',
    name: 'Greywick Rovers',
    short: 'GRE',
    town: 'Greywick',
    stadium: 'The Foundry Ground',
    primary: 0x9a2f2a,
    secondary: PALETTE.cream,
    division: 3,
    reputation: 22,
    facilities: 18,
    finances: -40000,
    supporterLove: 45,
    rivalId: 'ashmoor',
  },
  {
    id: 'ashmoor',
    name: 'Ashmoor Athletic',
    short: 'ASH',
    town: 'Ashmoor',
    stadium: 'Colliery Park',
    primary: 0x1f3f7a,
    secondary: 0xf0c020,
    division: 3,
    reputation: 30,
    facilities: 26,
    finances: 5000,
    supporterLove: 0,
    rivalId: 'greywick',
  },
  { id: 'kelverton', name: 'Kelverton Town', short: 'KEL', town: 'Kelverton', stadium: 'Millgate', primary: 0x2f7a3a, secondary: PALETTE.white, division: 3, reputation: 28, facilities: 24, finances: 12000, supporterLove: 0 },
  { id: 'duncastle', name: 'Duncastle United', short: 'DUN', town: 'Duncastle', stadium: 'The Keep', primary: 0x111111, secondary: 0xd8d8d8, division: 3, reputation: 33, facilities: 30, finances: 30000, supporterLove: 0 },
  { id: 'redmarsh', name: 'Redmarsh Rangers', short: 'RED', town: 'Redmarsh', stadium: 'Fen Lane', primary: 0xb0431f, secondary: 0x102030, division: 3, reputation: 24, facilities: 20, finances: -8000, supporterLove: 0 },
  { id: 'holbeck', name: 'Holbeck Albion', short: 'HOL', town: 'Holbeck', stadium: 'Weavers End', primary: 0x6a2f8a, secondary: PALETTE.white, division: 3, reputation: 26, facilities: 22, finances: 4000, supporterLove: 0 },
  { id: 'farrowdale', name: 'Farrowdale County', short: 'FAR', town: 'Farrowdale', stadium: 'Hillside', primary: 0xc9a227, secondary: 0x102030, division: 3, reputation: 20, facilities: 16, finances: -2000, supporterLove: 0 },
  { id: 'stonemill', name: 'Stonemill Wanderers', short: 'STO', town: 'Stonemill', stadium: 'The Quarry', primary: 0x2a6a7a, secondary: PALETTE.cream, division: 3, reputation: 27, facilities: 23, finances: 9000, supporterLove: 0 },
];

export const STARTING_CLUB_ID = 'greywick';

export function cloneClubs(): ClubData[] {
  return COMMUNITY_LEAGUE.map((c) => ({ ...c }));
}
