import { gcd, validateParams } from './validate-params';
import { VisualAlphabet } from '../shared/types';

// ---------------------------------------------------------------------------
// Mock alphabet — Hexahue dimensions (symbolWidth=2, symbolHeight=3)
// ---------------------------------------------------------------------------

function mockAlphabet(
  symbolWidth: number,
  symbolHeight: number,
): VisualAlphabet {
  return {
    symbolWidth,
    symbolHeight,
    getBlock: () => [],
    getSupportedChars: () => [],
  };
}

const HEXAHUE = mockAlphabet(2, 3);

// ---------------------------------------------------------------------------
// gcd()
// ---------------------------------------------------------------------------

describe('gcd()', () => {
  it('returns the larger number when one operand is 0', () => {
    expect(gcd(6, 0)).toBe(6);
    expect(gcd(0, 6)).toBe(6);
  });

  it('returns 1 for coprime pairs', () => {
    expect(gcd(5, 2)).toBe(1);
    expect(gcd(5, 3)).toBe(1);
    expect(gcd(7, 6)).toBe(1);
  });

  it('returns the GCD for non-coprime pairs', () => {
    expect(gcd(6, 3)).toBe(3);
    expect(gcd(4, 2)).toBe(2);
    expect(gcd(12, 8)).toBe(4);
  });

  it('is commutative', () => {
    expect(gcd(9, 6)).toBe(gcd(6, 9));
  });
});

// ---------------------------------------------------------------------------
// validateParams() — valid cases
// ---------------------------------------------------------------------------

describe('validateParams() — valid', () => {
  it('returns valid for T=5 (coprime with 2 and 3)', () => {
    const result = validateParams(5, HEXAHUE);
    expect(result.status).toBe('valid');
  });

  it('returns valid for T=7', () => {
    const result = validateParams(7, HEXAHUE);
    expect(result.status).toBe('valid');
  });

  it('returns valid for T=1', () => {
    const result = validateParams(1, HEXAHUE);
    expect(result.status).toBe('valid');
  });
});

// ---------------------------------------------------------------------------
// validateParams() — weak cases
// ---------------------------------------------------------------------------

describe('validateParams() — weak', () => {
  it('returns weak for T=2 (GCD with symbolWidth=2 is 2)', () => {
    const result = validateParams(2, HEXAHUE);
    expect(result.status).toBe('weak');
  });

  it('returns weak for T=3 (GCD with symbolHeight=3 is 3)', () => {
    const result = validateParams(3, HEXAHUE);
    expect(result.status).toBe('weak');
  });

  it('returns weak for T=6 (shares factor with both width and height)', () => {
    const result = validateParams(6, HEXAHUE);
    expect(result.status).toBe('weak');
  });

  it('includes a warning mentioning symbolWidth for T=2', () => {
    const result = validateParams(2, HEXAHUE);
    if (result.status !== 'weak') throw new Error('Expected weak');
    expect(result.warnings.some((w) => w.includes('symbolWidth'))).toBe(true);
  });

  it('includes a warning mentioning symbolHeight for T=3', () => {
    const result = validateParams(3, HEXAHUE);
    if (result.status !== 'weak') throw new Error('Expected weak');
    expect(result.warnings.some((w) => w.includes('symbolHeight'))).toBe(true);
  });

  it('includes two warnings for T=6 (shares factor with both dimensions)', () => {
    const result = validateParams(6, HEXAHUE);
    if (result.status !== 'weak') throw new Error('Expected weak');
    expect(result.warnings).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// validateParams() — override
// ---------------------------------------------------------------------------

describe('validateParams() — override', () => {
  it('returns overridden instead of weak when override=true', () => {
    const result = validateParams(2, HEXAHUE, true);
    expect(result.status).toBe('overridden');
  });

  it('preserves the warnings in the overridden result', () => {
    const result = validateParams(2, HEXAHUE, true);
    if (result.status !== 'overridden') throw new Error('Expected overridden');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('returns valid (not overridden) when T is already valid and override=true', () => {
    const result = validateParams(5, HEXAHUE, true);
    expect(result.status).toBe('valid');
  });
});

// ---------------------------------------------------------------------------
// validateParams() — custom alphabet dimensions
// ---------------------------------------------------------------------------

describe('validateParams() — custom alphabet dimensions', () => {
  it('uses the alphabet symbolWidth and symbolHeight, not hardcoded Hexahue values', () => {
    const custom = mockAlphabet(3, 4);
    // T=3 shares factor with symbolWidth=3
    const result = validateParams(3, custom);
    expect(result.status).toBe('weak');
    if (result.status !== 'weak') throw new Error('Expected weak');
    expect(result.warnings.some((w) => w.includes('symbolWidth=3'))).toBe(true);
  });
});
