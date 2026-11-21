import {
  KeyCodec,
  KeyParams,
  ReadingOrder,
  RotationSequence,
} from './key-codec';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_PARAMS: KeyParams = {
  version: 2,
  pivotBlockSize: 5,
  rotationSequence: [0, 1, 2, 3],
  rotationDirection: 'cw',
  readingOrder: 'LR-TB',
  size: 'medium',
};

const ALL_READING_ORDERS: ReadingOrder[] = [
  'LR-TB',
  'RL-TB',
  'TB-LR',
  'BT-LR',
  'LR-TB-ALT',
  'RL-TB-ALT',
  'TB-LR-ALT',
  'BT-LR-ALT',
];

/** Sequences of various lengths, with repeated angles, all valid in V2. */
const SAMPLE_SEQUENCES: RotationSequence[] = [
  [0, 1, 2, 3],
  [3, 2, 1, 0],
  [1, 1, 1, 1],
  [0, 0, 0, 2],
  [2, 0, 3, 1, 1],
  [1, 2, 3, 0, 0, 1, 2, 3, 3, 3, 2, 1, 0, 0, 1, 2, 3],
  Array.from({ length: 32 }, (_, i) => (i * 7 + 1) % 4),
];

const V1_READING_ORDERS: ReadingOrder[] = [
  'LR-TB',
  'RL-TB',
  'TB-LR',
  'BT-LR',
  'LR-TB-ALT',
  'RL-TB-ALT',
  'TB-LR-ALT',
  'BT-LR-ALT',
];

/**
 * Builds a V1 key with the V1 bit layout (pivot bits 0-7, order 8-10,
 * direction 11, permutation index 12-16, size 17-18). KeyCodec no longer
 * emits V1 keys, but must keep decoding the ones already handed out.
 */
function buildV1Key(fields: {
  pivotBlockSize: number;
  orderIndex: number;
  dirBit: number;
  seqIndex: number;
  sizeIndex: number;
}): string {
  const payload =
    fields.pivotBlockSize |
    (fields.orderIndex << 8) |
    (fields.dirBit << 11) |
    (fields.seqIndex << 12) |
    (fields.sizeIndex << 17);
  return `HR1·${payload.toString(36).toUpperCase().padStart(4, '0')}`;
}

/** Rewrites a V2 key payload character, keeping the key well-formed. */
function withPayload(key: string, payload: string): string {
  return `${key.slice(0, key.indexOf('·') + 1)}${payload}`;
}

// ─── validate() ───────────────────────────────────────────────────────────────

describe('KeyCodec.validate()', () => {
  it('returns true for a well-formed V2 key', () => {
    expect(KeyCodec.validate(KeyCodec.encode(BASE_PARAMS))).toBe(true);
  });

  it('returns true for a well-formed V1 key', () => {
    expect(KeyCodec.validate('HR1·2T51')).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(KeyCodec.validate('')).toBe(false);
  });

  it('returns false when the HR prefix is missing', () => {
    expect(KeyCodec.validate('1·0000')).toBe(false);
  });

  it('returns false for an unknown version', () => {
    expect(KeyCodec.validate('HR3·000000')).toBe(false);
  });

  it('returns false when the separator is missing', () => {
    expect(KeyCodec.validate('HR10000')).toBe(false);
  });

  it('returns false when a V1 payload is not 4 characters long', () => {
    expect(KeyCodec.validate('HR1·0')).toBe(false);
    expect(KeyCodec.validate('HR1·00000')).toBe(false);
  });

  it('returns false when a V2 payload is shorter than the shortest key or longer than the longest', () => {
    expect(KeyCodec.validate('HR2·00000')).toBe(false);
    expect(KeyCodec.validate(`HR2·${'0'.repeat(17)}`)).toBe(false);
  });

  it('returns false when the payload contains invalid characters', () => {
    expect(KeyCodec.validate('HR1·@@@@')).toBe(false);
    expect(KeyCodec.validate('HR2·@@@@@@')).toBe(false);
  });
});

// ─── encode() ─────────────────────────────────────────────────────────────────

describe('KeyCodec.encode()', () => {
  it('always returns a V2 key (HR2·)', () => {
    expect(KeyCodec.encode(BASE_PARAMS).startsWith('HR2·')).toBe(true);
    expect(KeyCodec.encode({ ...BASE_PARAMS, version: 1 })).toMatch(/^HR2·/);
  });

  it('returns a 6-character payload for a 4-angle sequence and 16 for a 32-angle one', () => {
    const short = KeyCodec.encode(BASE_PARAMS);
    const long = KeyCodec.encode({
      ...BASE_PARAMS,
      rotationSequence: Array.from({ length: 32 }, () => 3),
    });
    expect(short.length).toBe('HR2·'.length + 6);
    expect(long.length).toBe('HR2·'.length + 16);
  });

  it('accepts sequence lengths from 4 to 32', () => {
    for (const length of [4, 5, 31, 32]) {
      const rotationSequence = Array.from({ length }, () => 1);
      expect(() =>
        KeyCodec.encode({ ...BASE_PARAMS, rotationSequence }),
      ).not.toThrow();
    }
  });

  it('throws for a sequence shorter than 4 or longer than 32', () => {
    for (const length of [0, 3, 33]) {
      const rotationSequence = Array.from({ length }, () => 1);
      expect(() =>
        KeyCodec.encode({ ...BASE_PARAMS, rotationSequence }),
      ).toThrow(/length/);
    }
  });

  it('throws for an angle index outside 0-3 or not an integer', () => {
    for (const bad of [4, -1, 1.5]) {
      expect(() =>
        KeyCodec.encode({ ...BASE_PARAMS, rotationSequence: [0, 1, 2, bad] }),
      ).toThrow(/angle/);
    }
  });

  it('throws for a sequence made only of 0° rotations, which would leave the cryptogram in clear', () => {
    expect(() =>
      KeyCodec.encode({ ...BASE_PARAMS, rotationSequence: [0, 0, 0, 0, 0] }),
    ).toThrow(/0°/);
  });

  it('throws for an invalid reading order', () => {
    const bad = { ...BASE_PARAMS, readingOrder: 'INVALID' as ReadingOrder };
    expect(() => KeyCodec.encode(bad)).toThrow();
  });

  it('throws for a pivotBlockSize outside 1-255 or not an integer, which would corrupt other fields', () => {
    for (const pivotBlockSize of [0, 256, 2.5]) {
      expect(() => KeyCodec.encode({ ...BASE_PARAMS, pivotBlockSize })).toThrow(
        /pivotBlockSize/,
      );
    }
  });

  it('throws for an unknown size', () => {
    const bad = { ...BASE_PARAMS, size: 'huge' as KeyParams['size'] };
    expect(() => KeyCodec.encode(bad)).toThrow(/size/);
  });

  it('folds a counter-clockwise direction into the angles: ccw [1, 2, 3, 0] gives the cw [3, 2, 1, 0] key', () => {
    const ccw = KeyCodec.encode({
      ...BASE_PARAMS,
      rotationSequence: [1, 2, 3, 0],
      rotationDirection: 'ccw',
    });
    const cw = KeyCodec.encode({
      ...BASE_PARAMS,
      rotationSequence: [3, 2, 1, 0],
      rotationDirection: 'cw',
    });
    expect(ccw).toBe(cw);
  });
});

// ─── decode() ─────────────────────────────────────────────────────────────────

describe('KeyCodec.decode()', () => {
  it('throws for a malformed key', () => {
    expect(() => KeyCodec.decode('not-a-key')).toThrow();
  });

  it('throws for a key with unknown version', () => {
    expect(() => KeyCodec.decode('HR3·000000')).toThrow();
  });

  it('throws for a V2 key whose payload length does not match its sequence length (truncated key)', () => {
    const key = KeyCodec.encode({
      ...BASE_PARAMS,
      rotationSequence: Array.from({ length: 20 }, () => 2),
    });
    expect(() => KeyCodec.decode(key.slice(0, -1))).toThrow(/length/);
  });

  it('throws for a V2 key with bits set beyond its sequence', () => {
    // 6 base36 characters hold up to 31 bits; a 4-angle key uses only 26.
    expect(() => KeyCodec.decode('HR2·ZZZZZZ')).toThrow();
  });

  it('throws for a V2 key that unpacks to pivotBlockSize=0', () => {
    expect(() => KeyCodec.decode('HR2·000000')).toThrow(/pivotBlockSize/);
  });

  it('throws for a V2 key that unpacks to an all-0° sequence', () => {
    // pivotBlockSize=5, every other field 0, length 4, angles all 0.
    expect(() =>
      KeyCodec.decode(withPayload('HR2·', '5'.padStart(6, '0'))),
    ).toThrow(/0°/);
  });

  it('throws for a V2 key that unpacks to a sequence length over 32', () => {
    // pivotBlockSize=5 | (L - 4 = 31) << 13, padded to the 4-angle key length.
    const payload = (5 + 31 * 2 ** 13)
      .toString(36)
      .toUpperCase()
      .padStart(6, '0');
    expect(() => KeyCodec.decode(withPayload('HR2·', payload))).toThrow(
      /length/,
    );
  });

  it('throws for a V2 key that unpacks to the reserved size index (3)', () => {
    const payload = (5 + 3 * 2 ** 11 + 1 * 2 ** 18)
      .toString(36)
      .toUpperCase()
      .padStart(6, '0');
    expect(() => KeyCodec.decode(withPayload('HR2·', payload))).toThrow(/size/);
  });

  it('decodes lowercase V2 keys', () => {
    const key = KeyCodec.encode(BASE_PARAMS);
    const lower = withPayload(
      key,
      key.slice(key.indexOf('·') + 1).toLowerCase(),
    );
    expect(KeyCodec.decode(lower)).toEqual(KeyCodec.decode(key));
  });
});

// ─── Round-trip ───────────────────────────────────────────────────────────────

describe('KeyCodec round-trip (V2)', () => {
  it('recovers base params after encode → decode', () => {
    expect(KeyCodec.decode(KeyCodec.encode(BASE_PARAMS))).toEqual(BASE_PARAMS);
  });

  it('decodes every V2 key as clockwise', () => {
    const params = { ...BASE_PARAMS, rotationDirection: 'ccw' as const };
    expect(KeyCodec.decode(KeyCodec.encode(params)).rotationDirection).toBe(
      'cw',
    );
  });

  it('round-trips all reading orders', () => {
    for (const order of ALL_READING_ORDERS) {
      const params = { ...BASE_PARAMS, readingOrder: order };
      expect(KeyCodec.decode(KeyCodec.encode(params)).readingOrder).toBe(order);
    }
  });

  it('round-trips sequences of various lengths, with repeated angles', () => {
    for (const seq of SAMPLE_SEQUENCES) {
      const params = { ...BASE_PARAMS, rotationSequence: seq };
      expect(KeyCodec.decode(KeyCodec.encode(params)).rotationSequence).toEqual(
        seq,
      );
    }
  });

  it('round-trips various pivot block sizes', () => {
    for (const size of [1, 5, 7, 12, 255]) {
      const params = { ...BASE_PARAMS, pivotBlockSize: size };
      expect(KeyCodec.decode(KeyCodec.encode(params)).pivotBlockSize).toBe(
        size,
      );
    }
  });

  it('round-trips all three case sizes', () => {
    for (const size of ['small', 'medium', 'large'] as const) {
      const params = { ...BASE_PARAMS, size };
      expect(KeyCodec.decode(KeyCodec.encode(params)).size).toBe(size);
    }
  });

  it('produces different keys for sequences that differ only by length', () => {
    const key1 = KeyCodec.encode({
      ...BASE_PARAMS,
      rotationSequence: [1, 1, 1, 1],
    });
    const key2 = KeyCodec.encode({
      ...BASE_PARAMS,
      rotationSequence: [1, 1, 1, 1, 0],
    });
    expect(key1).not.toBe(key2);
  });

  it('produces the same key for the same params (deterministic)', () => {
    expect(KeyCodec.encode(BASE_PARAMS)).toBe(KeyCodec.encode(BASE_PARAMS));
  });
});

// ─── V1 decoding (keys handed out before FEAT-032) ────────────────────────────

describe('KeyCodec V1 decoding', () => {
  const v1Base = {
    pivotBlockSize: 5,
    orderIndex: 0,
    dirBit: 0,
    seqIndex: 0,
    sizeIndex: 1,
  };

  it('decodes a V1 key to its V1 params', () => {
    expect(KeyCodec.decode(buildV1Key(v1Base))).toEqual({
      version: 1,
      pivotBlockSize: 5,
      rotationSequence: [0, 1, 2, 3],
      rotationDirection: 'cw',
      readingOrder: 'LR-TB',
      size: 'medium',
    });
  });

  it('keeps the V1 rotation direction', () => {
    const key = buildV1Key({ ...v1Base, dirBit: 1 });
    expect(KeyCodec.decode(key).rotationDirection).toBe('ccw');
  });

  it('decodes all 24 V1 permutations to distinct sequences', () => {
    const seen = new Set<string>();
    for (let seqIndex = 0; seqIndex < 24; seqIndex++) {
      const seq = KeyCodec.decode(
        buildV1Key({ ...v1Base, seqIndex }),
      ).rotationSequence;
      expect([...seq].sort()).toEqual([0, 1, 2, 3]);
      seen.add(seq.join(','));
    }
    expect(seen.size).toBe(24);
  });

  it('decodes all V1 reading orders', () => {
    V1_READING_ORDERS.forEach((order, orderIndex) => {
      expect(
        KeyCodec.decode(buildV1Key({ ...v1Base, orderIndex })).readingOrder,
      ).toBe(order);
    });
  });

  it('throws for a V1 key that unpacks to an out-of-range rotation sequence index', () => {
    expect(() => KeyCodec.decode('HR1·ZZZZ')).toThrow(Error);
  });

  it('throws for a V1 key that unpacks to pivotBlockSize=0', () => {
    expect(() => KeyCodec.decode('HR1·0000')).toThrow(Error);
  });

  it('throws for a V1 key that unpacks to the reserved size index (3)', () => {
    expect(() => KeyCodec.decode('HR1·8FEP')).toThrow(Error);
  });

  it('decodes a pre-FEAT-022 key (no size bits ever set) as size "small", without throwing', () => {
    // A key encoded before the size field existed never set bits 17-18, so
    // they read back as 0 ("small") rather than the reserved value 3.
    const decoded = KeyCodec.decode(buildV1Key({ ...v1Base, sizeIndex: 0 }));
    expect(decoded.size).toBe('small');
  });
});
