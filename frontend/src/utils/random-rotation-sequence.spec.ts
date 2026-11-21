import { describe, it, expect, vi, afterEach } from 'vitest'
import { generateRandomRotationSequence } from './random-rotation-sequence'

describe('generateRandomRotationSequence', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('always returns a permutation of [0, 1, 2, 3]', () => {
    for (let i = 0; i < 200; i++) {
      expect([...generateRandomRotationSequence()].sort()).toEqual([0, 1, 2, 3])
    }
  })

  it('draws its randomness from crypto.getRandomValues', () => {
    const spy = vi.spyOn(crypto, 'getRandomValues')
    generateRandomRotationSequence()
    expect(spy).toHaveBeenCalled()
  })

  it('produces more than one ordering across draws', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) seen.add(generateRandomRotationSequence().join(','))
    expect(seen.size).toBeGreaterThan(1)
  })

  it('returns the identity permutation when every draw selects the current index', () => {
    // With j = r % (i + 1) and r = i, every swap is a no-op.
    let call = 0
    vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
      const values = array as Uint32Array
      values[0] = 3 - call++
      return array
    })
    expect(generateRandomRotationSequence()).toEqual([0, 1, 2, 3])
  })
})
