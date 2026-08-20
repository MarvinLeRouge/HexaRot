import { describe, it, expect } from 'vitest'
import { isValidKeyFormat, normalizeKeyInput } from './key-format'
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

  it.each([
    ['lowercase prefix', 'hr1·a1b2'],
    ['a period instead of the middle dot', 'HR1.a1b2'],
    ['a hyphen instead of the middle dot', 'HR1-a1b2'],
    ['an underscore instead of the middle dot', 'HR1_a1b2'],
    ['a space instead of the middle dot', 'HR1 a1b2'],
  ])('tolerates %s as a near-miss of the canonical shape', (_label, key) => {
    expect(isValidKeyFormat(key)).toBe(true)
  })
})

describe('normalizeKeyInput', () => {
  it.each([
    ['hr1·a1b2', 'HR1·a1b2'],
    ['HR1.a1b2', 'HR1·a1b2'],
    ['HR1-a1b2', 'HR1·a1b2'],
    ['HR1_a1b2', 'HR1·a1b2'],
    ['HR1 a1b2', 'HR1·a1b2'],
    [' HR1·a1b2 ', 'HR1·a1b2'],
    ['HR1·a1b2', 'HR1·a1b2'],
  ])('rewrites %s to the canonical form %s', (input, expected) => {
    expect(normalizeKeyInput(input)).toBe(expected)
  })

  it('leaves genuinely malformed input untouched', () => {
    expect(normalizeKeyInput(MALFORMED_KEY)).toBe(MALFORMED_KEY)
  })
})
