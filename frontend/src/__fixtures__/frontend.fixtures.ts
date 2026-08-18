import type { EncodeResult } from '../stores/encode'

// A minimal valid 1x1 transparent PNG, base64-encoded — realistic enough to
// exercise data-URL rendering and blob-download code paths without needing
// a real render.
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

export const MOCK_ENCODE_RESPONSE: EncodeResult = {
  png: TINY_PNG_BASE64,
  svg: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#000"/></svg>',
  key: 'HR1·a1b2',
  warnings: [],
  unknownChars: [],
}

export const MOCK_ENCODE_RESPONSE_WITH_WARNINGS: EncodeResult = {
  ...MOCK_ENCODE_RESPONSE,
  warnings: ['pivotBlockSize is below the recommended minimum for this alphabet'],
  unknownChars: ['@', '#'],
}

export const MALFORMED_KEY = 'not-a-valid-key'
