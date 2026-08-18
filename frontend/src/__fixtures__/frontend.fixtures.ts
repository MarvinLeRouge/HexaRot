import type { EncodeResult } from '../stores/encode'

// A minimal valid 1x1 transparent PNG, base64-encoded — realistic enough to
// exercise data-URL rendering and blob-download code paths without needing
// a real render.
export const TINY_PNG_BASE64 =
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

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)) as Uint8Array<ArrayBuffer>
}

export const MOCK_PNG_FILE = new File([base64ToBytes(TINY_PNG_BASE64)], 'cryptogram.png', {
  type: 'image/png',
})

export const SVG_CRYPTOGRAM_CONTENT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#000"/></svg>'

export const MOCK_SVG_FILE = new File([SVG_CRYPTOGRAM_CONTENT], 'cryptogram.svg', {
  type: 'image/svg+xml',
})

export const MOCK_DECODE_RESPONSE = {
  message: 'HELLO WORLD',
}
