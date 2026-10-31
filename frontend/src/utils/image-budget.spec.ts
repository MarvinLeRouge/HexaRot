import { describe, it, expect } from 'vitest'
import { countEncodedCharacters, gridDimensions, imageFits } from './image-budget'

describe('gridDimensions', () => {
  // Same reference cases as backend/src/cipher/grid-dimensions.spec.ts
  it.each([
    [0, 5, 10, 5],
    [11, 5, 10, 10],
    [1000, 7, 84, 77],
    [10750, 5, 250, 260],
    [10800, 5, 250, 265],
    [1, 181, 362, 181],
    [29000, 255, 510, 510],
  ])('lays %i characters at pivot %i on a %i x %i case grid', (messageLength, pivotBlockSize, width, height) => {
    expect(gridDimensions(messageLength, pivotBlockSize)).toEqual({ width, height })
  })
})

describe('countEncodedCharacters', () => {
  it('counts what the server encodes: uppercased, accents removed, unsupported characters dropped', () => {
    expect(countEncodedCharacters('Éte, ok!')).toBe(7)
  })

  it('counts characters that uppercase to two letters twice', () => {
    expect(countEncodedCharacters('ß')).toBe(2)
  })
})

describe('imageFits', () => {
  it.each([
    [10750, 5, 'large', true],
    [10800, 5, 'large', false],
    [1, 181, 'large', false],
    [29000, 255, 'medium', true],
    [29000, 255, 'small', true],
  ] as const)('%i characters at pivot %i in size %s fits: %s', (messageLength, pivotBlockSize, size, expected) => {
    expect(imageFits(messageLength, pivotBlockSize, size)).toBe(expected)
  })
})
