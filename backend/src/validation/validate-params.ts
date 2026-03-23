import { VisualAlphabet } from '../shared/types';

/**
 * Result of parameter validation.
 *
 * - `valid` — pivot block size T is coprime with both symbol dimensions
 * - `weak` — GCD(T, symbolWidth) or GCD(T, symbolHeight) is not 1; rotations
 *   may preserve partial symbol alignment, weakening the cryptogram
 * - `overridden` — same as `weak` but the user explicitly bypassed the warning
 */
export type ValidationResult =
  | { status: 'valid' }
  | { status: 'weak'; warnings: string[] }
  | { status: 'overridden'; warnings: string[] };

/**
 * Computes the greatest common divisor of two positive integers using the
 * Euclidean algorithm.
 */
export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Validates the pivot block size against the symbol dimensions of the given alphabet.
 *
 * A pivot block size T weakens the cryptogram when GCD(T, symbolWidth) or
 * GCD(T, symbolHeight) is not 1, because rotations of T×T blocks will
 * realign with symbol boundaries, reducing visual entropy.
 *
 * The validator never blocks execution — it only informs via the returned result.
 *
 * @param pivotBlockSize - The T×T block size to validate.
 * @param alphabet - The visual alphabet providing symbol dimensions.
 * @param override - When true, returns `overridden` instead of `weak`, allowing
 *   the caller to proceed despite the warning.
 */
export function validateParams(
  pivotBlockSize: number,
  alphabet: VisualAlphabet,
  override = false,
): ValidationResult {
  const warnings: string[] = [];

  const gcdWidth = gcd(pivotBlockSize, alphabet.symbolWidth);
  if (gcdWidth !== 1) {
    warnings.push(
      `GCD(T=${pivotBlockSize}, symbolWidth=${alphabet.symbolWidth}) = ${gcdWidth} ≠ 1` +
        ` — rotations may realign with symbol boundaries along the x-axis`,
    );
  }

  const gcdHeight = gcd(pivotBlockSize, alphabet.symbolHeight);
  if (gcdHeight !== 1) {
    warnings.push(
      `GCD(T=${pivotBlockSize}, symbolHeight=${alphabet.symbolHeight}) = ${gcdHeight} ≠ 1` +
        ` — rotations may realign with symbol boundaries along the y-axis`,
    );
  }

  if (warnings.length === 0) return { status: 'valid' };
  if (override) return { status: 'overridden', warnings };
  return { status: 'weak', warnings };
}
