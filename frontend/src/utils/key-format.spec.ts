import { describe, it, expect } from 'vitest'
import { isValidKeyFormat } from './key-format'
import { MALFORMED_KEY } from '../__fixtures__/frontend.fixtures'

describe('isValidKeyFormat', () => {
  it.each([
    ['HR1·a1b2'],
    ['HR1·0000'],
    ['HR9·zzzz'],
    ['HR1·A1B2'],
  ])('accepts a well-formed key: %s', (key) => {
    expect(isValidKeyFormat(key)).toBe(true)
  })

  it.each([
    ['the fixture MALFORMED_KEY', MALFORMED_KEY],
    ['missing the separator', 'HR1a1b2'],
    ['wrong prefix', 'XX1·a1b2'],
    ['payload too short', 'HR1·a1b'],
    ['payload too long', 'HR1·a1b23'],
    ['empty string', ''],
  ])('rejects %s', (_label, key) => {
    expect(isValidKeyFormat(key)).toBe(false)
  })
})
