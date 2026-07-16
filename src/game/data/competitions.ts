/** Division + competition definitions for the fictional football country. */

export const DIVISIONS = [
  { id: 0, name: 'Premier Division' },
  { id: 1, name: 'National Championship' },
  { id: 2, name: 'Regional League' },
  { id: 3, name: 'Community League' },
];

export const CUPS = {
  national: 'The Founders Cup',
  lower: 'The Boroughs Shield',
};

/** Player's club always begins in the Community League (division 3). */
export const STARTING_DIVISION = 3;
export const CLUBS_PER_DIVISION = 8;
