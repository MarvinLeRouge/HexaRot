import { describe, it, expect } from 'vitest'
import { evaluatePassword, isPasswordValid } from './password-strength'

describe('evaluatePassword', () => {
  it('reports all criteria met for a fully valid password', () => {
    expect(evaluatePassword('Correct-Horse-Battery9')).toEqual({
      minLength: true,
      lowercase: true,
      uppercase: true,
      digit: true,
      special: true,
    })
  })

  it('reports minLength unmet for a password shorter than 12 characters', () => {
    expect(evaluatePassword('Short-1a').minLength).toBe(false)
  })

  it('reports uppercase unmet when the password has no uppercase letter', () => {
    expect(evaluatePassword('correct-horse-battery9').uppercase).toBe(false)
  })

  it('reports lowercase unmet when the password has no lowercase letter', () => {
    expect(evaluatePassword('CORRECT-HORSE-BATTERY9').lowercase).toBe(false)
  })

  it('reports digit unmet when the password has no digit', () => {
    expect(evaluatePassword('Correct-Horse-Battery').digit).toBe(false)
  })

  it('reports special unmet when the password has no special character', () => {
    expect(evaluatePassword('CorrectHorseBattery9').special).toBe(false)
  })
})

describe('isPasswordValid', () => {
  it('returns true when every criterion is met', () => {
    expect(isPasswordValid('Correct-Horse-Battery9')).toBe(true)
  })

  it('returns false when any criterion is unmet', () => {
    expect(isPasswordValid('correct-horse-battery9')).toBe(false)
  })
})
