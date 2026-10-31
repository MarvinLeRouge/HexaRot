import type { CryptogramSize } from '../stores/encode'

/** Mirrors backend/src/renderer/image-limits.ts: a 200 MB budget at 3 bytes per pixel. */
export const MAX_IMAGE_PIXELS = Math.floor(200_000_000 / 3)

const CASE_PIXELS: Record<CryptogramSize, number> = { small: 8, medium: 16, large: 32 }
const SYMBOL_WIDTH = 2
const SYMBOL_HEIGHT = 3
const HEXAHUE_CHARACTERS = /[A-Z0-9 .,]/

/** Number of characters the server will encode: uppercased, accents removed, unsupported ones dropped. */
export function countEncodedCharacters(message: string): number {
  let count = 0
  for (const char of message.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')) {
    if (HEXAHUE_CHARACTERS.test(char)) count++
  }
  return count
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

/**
 * Grid size, in cases, for a Hexahue message of this length. Mirrors
 * gridDimensions in backend/src/cipher/build-grid.ts; both are tested
 * against the same reference cases.
 */
export function gridDimensions(messageLength: number, pivotBlockSize: number): { width: number; height: number } {
  const baseWidthUnit = (pivotBlockSize * SYMBOL_WIDTH) / gcd(pivotBlockSize, SYMBOL_WIDTH)
  const idealWidth = Math.sqrt(messageLength * SYMBOL_WIDTH * SYMBOL_HEIGHT)
  const width = Math.max(1, Math.round(idealWidth / baseWidthUnit)) * baseWidthUnit
  const rows = Math.ceil(messageLength / (width / SYMBOL_WIDTH))
  const height = Math.ceil(Math.max(SYMBOL_HEIGHT, rows * SYMBOL_HEIGHT) / pivotBlockSize) * pivotBlockSize
  return { width, height }
}

/** Whether the server will accept rendering this combination (same check as its assertImageFits). */
export function imageFits(messageLength: number, pivotBlockSize: number, size: CryptogramSize): boolean {
  const { width, height } = gridDimensions(messageLength, pivotBlockSize)
  const casePixels = CASE_PIXELS[size]
  return width * casePixels * height * casePixels <= MAX_IMAGE_PIXELS
}
