/**
 * Section anchors of the help page, identical in every locale. Contextual help
 * links target them as `{ path: '/help', hash: '#pivot-block-size' }`; the
 * help-files spec fails if a help file does not define exactly these anchors.
 */
export const HELP_SECTIONS = [
  'concept',
  'encoding',
  'message',
  'pivot-block-size',
  'rotation-sequence',
  'rotation-direction',
  'reading-order',
  'cryptogram-size',
  'weakness-warning',
  'key',
  'decoding',
] as const

export type HelpSection = (typeof HELP_SECTIONS)[number]
