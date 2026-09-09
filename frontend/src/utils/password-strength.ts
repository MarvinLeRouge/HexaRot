/** Mirrors backend/src/auth/dto/register.dto.ts's complexity rule - live,
 * per-criterion feedback only. The backend remains the sole source of truth;
 * a passing client-side check does not guarantee the server accepts it. */
const MIN_LENGTH = 12

export interface PasswordCriteria {
  minLength: boolean
  lowercase: boolean
  uppercase: boolean
  digit: boolean
  special: boolean
}

export function evaluatePassword(password: string): PasswordCriteria {
  return {
    minLength: password.length >= MIN_LENGTH,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    digit: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }
}

export function isPasswordValid(password: string): boolean {
  const criteria = evaluatePassword(password)
  return Object.values(criteria).every(Boolean)
}
