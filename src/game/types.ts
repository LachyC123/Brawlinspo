/**
 * Shared domain types for LOCAL LEGEND.
 *
 * These interfaces describe the persistent career state. Everything the
 * SaveSystem writes to disk is built from these shapes, so keep them
 * serialisable (plain data — no class instances, functions or Phaser objects).
 */

export type Position = 'ST' | 'W' | 'AM' | 'CM';

export type Foot = 'Left' | 'Right' | 'Both';

export type Background =
  | 'street'
  | 'academy'
  | 'localhero'
  | 'latebloomer'
  | 'family';

/** Core + mental + condition attributes, all on a 1–99 scale. */
export interface Attributes {
  // Core football
  shooting: number;
  passing: number;
  dribbling: number;
  control: number;
  pace: number;
  strength: number;
  vision: number;
  composure: number;
  positioning: number;
  stamina: number;
  // Mental / career
  confidence: number;
  discipline: number;
  professionalism: number;
  leadership: number;
  loyalty: number;
  ambition: number;
  mediaRep: number;
  supporterRep: number;
  dressingRoomInfluence: number;
}

/** Fast-changing condition values, 0–100. */
export interface Condition {
  fitness: number;
  morale: number;
  sharpness: number;
  stress: number;
  injuryRisk: number;
}

export interface Appearance {
  skinTone: number; // index into palette
  hairStyle: number;
  hairColor: number;
  eyeColor: number;
  build: number; // 0 slight .. 4 broad
}

export interface PlayerData {
  firstName: string;
  surname: string;
  shirtName: string;
  shirtNumber: number;
  foot: Foot;
  nationality: string;
  position: Position;
  background: Background;
  age: number;
  appearance: Appearance;
  attr: Attributes;
  cond: Condition;
  form: number[]; // recent match ratings
  seasonGoals: number;
  seasonAssists: number;
  seasonApps: number;
  careerGoals: number;
  careerAssists: number;
  managerTrust: number; // 0-100
  money: number;
  archetypes: string[];
}

export type RelationshipState =
  | 'stranger'
  | 'teammate'
  | 'friendly'
  | 'close'
  | 'mentor'
  | 'rival'
  | 'resentful'
  | 'hostile'
  | 'ally';

export type Personality =
  | 'loyalVeteran'
  | 'competitiveRival'
  | 'shyProspect'
  | 'joker'
  | 'hothead'
  | 'quietPro'
  | 'selfishStar'
  | 'genius'
  | 'localLad'
  | 'journeyman';

export interface TeammateData {
  id: string;
  firstName: string;
  surname: string;
  age: number;
  position: Position | 'GK' | 'DF' | 'DM';
  personality: Personality;
  ability: number;
  appearance: Appearance;
  trust: number; // toward player 0-100
  respect: number;
  jealousy: number;
  morale: number;
  state: RelationshipState;
  concern: string;
  goal: string;
  isCaptain?: boolean;
}

export interface ClubData {
  id: string;
  name: string;
  short: string;
  town: string;
  stadium: string;
  primary: number;
  secondary: number;
  division: number; // 0 = top .. 3 = bottom
  reputation: number;
  facilities: number; // 0-100 drives visual upgrades
  finances: number;
  supporterLove: number; // toward player
  rivalId?: string;
}

export interface LeagueRow {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
}

export interface Fixture {
  week: number;
  homeId: string;
  awayId: string;
  homeGoals?: number;
  awayGoals?: number;
  played: boolean;
  competition: string;
}

export type MemoryImpact = 'positive' | 'negative' | 'neutral';

export interface CareerMemory {
  id: string;
  type: string;
  headline: string;
  season: number;
  week: number;
  clubId: string;
  competition: string;
  opponentId?: string;
  characters: string[];
  impact: MemoryImpact;
  publicImportance: number; // 0-100
  emotionalImportance: number;
  repEffect: number;
  tags: string[];
}

export interface StoryEventRecord {
  eventId: string;
  week: number;
  season: number;
  choiceId: string;
}

export interface SettingsData {
  music: boolean;
  sfx: boolean;
  volume: number;
  reducedMotion: boolean;
  reducedShake: boolean;
  highContrast: boolean;
  leftHanded: boolean;
  textScale: number;
}

/** The complete serialisable career — one save slot. */
export interface CareerState {
  version: number;
  createdAt: number;
  updatedAt: number;
  season: number;
  week: number;
  /** Per-week loop phase flags, reset by CareerSystem.advanceWeek. */
  weekTrained: boolean;
  weekEventResolved: boolean;
  player: PlayerData;
  clubId: string;
  clubs: ClubData[];
  teammates: TeammateData[];
  fixtures: Fixture[];
  table: LeagueRow[];
  memories: CareerMemory[];
  eventHistory: StoryEventRecord[];
  eventCooldowns: Record<string, number>;
  objective: string;
  pendingTransfer?: TransferOffer;
  goldenBoot: { name: string; goals: number };
  settings: SettingsData;
}

export interface TransferOffer {
  clubId: string;
  wage: number;
  role: string;
  playingTime: string;
  style: string;
  distance: string;
  fee: number;
  week: number;
  season: number;
}

/** Result of a played match, returned by MatchSystem to PostMatch. */
export interface MatchResult {
  homeId: string;
  awayId: string;
  homeGoals: number;
  awayGoals: number;
  playerGoals: number;
  playerAssists: number;
  rating: number;
  ratingEvents: { label: string; delta: number }[];
  competition: string;
  memories: CareerMemory[];
  isHome: boolean;
  playerClubId: string;
  flags: string[];
}
