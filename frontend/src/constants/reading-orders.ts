/**
 * Mirrors backend/src/key/key-codec.ts's READING_ORDERS — the frontend and
 * backend are separate deployables, so this list is duplicated rather than
 * imported across the project boundary. Keep both lists in sync by hand.
 */
export const READING_ORDERS = [
  'LR-TB',
  'RL-TB',
  'TB-LR',
  'BT-LR',
  'LR-TB-ALT',
  'RL-TB-ALT',
  'TB-LR-ALT',
  'BT-LR-ALT',
] as const

export type ReadingOrder = (typeof READING_ORDERS)[number]
