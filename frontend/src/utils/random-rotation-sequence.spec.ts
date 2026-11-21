import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  DEFAULT_ROTATION_SEQUENCE_LENGTH,
  generateRandomRotationSequence,
} from './random-rotation-sequence'

describe('generateRandomRotationSequence', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns DEFAULT_ROTATION_SEQUENCE_LENGTH (8) angle indices by default', () => {
    expect(DEFAULT_ROTATION_SEQUENCE_LENGTH).toBe(8)
    expect(generateRandomRotationSequence()).toHaveLength(8)
  })

  it.each([4, 13, 32])('returns %i angle indices, each an integer 0-3', (length) => {
    const sequence = generateRandomRotationSequence(length)
    expect(sequence).toHaveLength(length)
    for (const angle of sequence) {
      expect([0, 1, 2, 3]).toContain(angle)
    }
  })

  it('draws its randomness from crypto.getRandomValues', () => {
    const spy = vi.spyOn(crypto, 'getRandomValues')
    generateRandomRotationSequence(4)
    expect(spy).toHaveBeenCalled()
  })

  it('allows repeated angles', () => {
    const repeated = Array.from({ length: 50 }, () => generateRandomRotationSequence(8)).some(
      (sequence) => new Set(sequence).size < sequence.length,
    )
    expect(repeated).toBe(true)
  })

  it('draws again when a draw is only 0° rotations', () => {
    let call = 0
    vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
      const values = array as Uint8Array
      values.fill(call++ === 0 ? 0 : 2)
      return array
    })
    expect(generateRandomRotationSequence(4)).toEqual([2, 2, 2, 2])
  })
})
