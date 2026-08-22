import {
  KeyCodec,
  KeyParams,
  ReadingOrder,
  RotationSequence,
} from './key-codec';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_PARAMS: KeyParams = {
  version: 1,
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

/** A representative subset of the 24 rotation sequences. */
const SAMPLE_SEQUENCES: RotationSequence[] = [
  [0, 1, 2, 3],
  [0, 3, 2, 1],
  [1, 0, 2, 3],
  [2, 3, 0, 1],
  [3, 2, 1, 0],
];

// ─── validate() ───────────────────────────────────────────────────────────────

describe('KeyCodec.validate()', () => {
  it('returns true for a well-formed key', () => {
    const key = KeyCodec.encode(BASE_PARAMS);
    expect(KeyCodec.validate(key)).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(KeyCodec.validate('')).toBe(false);
  });

  it('returns false when the HR prefix is missing', () => {
    expect(KeyCodec.validate('1·0000')).toBe(false);
  });

  it('returns false for an unknown version', () => {
    expect(KeyCodec.validate('HR2·0000')).toBe(false);
  });

  it('returns false when the separator is missing', () => {
    expect(KeyCodec.validate('HR10000')).toBe(false);
  });

  it('returns false when the payload is too short', () => {
    expect(KeyCodec.validate('HR1·0')).toBe(false);
  });

  it('returns false when the payload is too long', () => {
    expect(KeyCodec.validate('HR1·00000')).toBe(false);
  });

  it('returns false when the payload contains invalid characters', () => {
    expect(KeyCodec.validate('HR1·@@@@')).toBe(false);
  });
});

// ─── encode() ─────────────────────────────────────────────────────────────────

describe('KeyCodec.encode()', () => {
  it('returns a string starting with HR1·', () => {
    const key = KeyCodec.encode(BASE_PARAMS);
    expect(key.startsWith('HR1·')).toBe(true);
  });

  it('returns a key of fixed length (HR + 1 + · + 4 = 8 chars)', () => {
    const key = KeyCodec.encode(BASE_PARAMS);
    expect(key.length).toBe(8);
  });

  it('throws for an invalid rotation sequence', () => {
    const bad = {
      ...BASE_PARAMS,
      rotationSequence: [0, 0, 0, 0] as unknown as RotationSequence,
    };
    expect(() => KeyCodec.encode(bad)).toThrow();
  });

  it('throws for an invalid reading order', () => {
    const bad = { ...BASE_PARAMS, readingOrder: 'INVALID' as ReadingOrder };
    expect(() => KeyCodec.encode(bad)).toThrow();
  });
});

// ─── decode() ─────────────────────────────────────────────────────────────────

describe('KeyCodec.decode()', () => {
  it('throws for a malformed key', () => {
    expect(() => KeyCodec.decode('not-a-key')).toThrow();
  });

  it('throws for a key with unknown version', () => {
    expect(() => KeyCodec.decode('HR2·0000')).toThrow();
  });
});

// ─── Round-trip ───────────────────────────────────────────────────────────────

describe('KeyCodec round-trip', () => {
  it('recovers base params after encode → decode', () => {
    const key = KeyCodec.encode(BASE_PARAMS);
    const decoded = KeyCodec.decode(key);
    expect(decoded).toEqual(BASE_PARAMS);
  });

  it('round-trips both rotation directions', () => {
    for (const dir of ['cw', 'ccw'] as const) {
      const params = { ...BASE_PARAMS, rotationDirection: dir };
      expect(KeyCodec.decode(KeyCodec.encode(params)).rotationDirection).toBe(
        dir,
      );
    }
  });

  it('round-trips all V1 reading orders', () => {
    for (const order of ALL_READING_ORDERS) {
      const params = { ...BASE_PARAMS, readingOrder: order };
      const decoded = KeyCodec.decode(KeyCodec.encode(params));
      expect(decoded.readingOrder).toBe(order);
    }
  });

  it('round-trips a representative subset of rotation sequences', () => {
    for (const seq of SAMPLE_SEQUENCES) {
      const params = { ...BASE_PARAMS, rotationSequence: seq };
      const decoded = KeyCodec.decode(KeyCodec.encode(params));
      expect(decoded.rotationSequence).toEqual(seq);
    }
  });

  it('round-trips various pivot block sizes', () => {
    for (const size of [1, 5, 7, 12, 255]) {
      const params = { ...BASE_PARAMS, pivotBlockSize: size };
      const decoded = KeyCodec.decode(KeyCodec.encode(params));
      expect(decoded.pivotBlockSize).toBe(size);
    }
  });

  it('round-trips all three case sizes', () => {
    for (const size of ['small', 'medium', 'large'] as const) {
      const params = { ...BASE_PARAMS, size };
      const decoded = KeyCodec.decode(KeyCodec.encode(params));
      expect(decoded.size).toBe(size);
    }
  });

  it('produces different keys for different params', () => {
    const key1 = KeyCodec.encode({ ...BASE_PARAMS, pivotBlockSize: 5 });
    const key2 = KeyCodec.encode({ ...BASE_PARAMS, pivotBlockSize: 7 });
    expect(key1).not.toBe(key2);
  });

  it('produces the same key for the same params (deterministic)', () => {
    expect(KeyCodec.encode(BASE_PARAMS)).toBe(KeyCodec.encode(BASE_PARAMS));
  });
});

describe('KeyCodec.decode - out-of-range payload values', () => {
  it('throws for a structurally valid key that unpacks to an out-of-range rotation sequence index', () => {
    expect(() => KeyCodec.decode('HR1·ZZZZ')).toThrow(Error);
  });

  it('throws for a structurally valid key that unpacks to pivotBlockSize=0', () => {
    expect(() => KeyCodec.decode('HR1·0000')).toThrow(Error);
  });

  it('throws for a structurally valid key that unpacks to the reserved size index (3)', () => {
    // Payload = pivotBlockSize=1 | orderIndex=0 | dirBit=0 | seqIndex=0 | sizeIndex=3<<17
    expect(() => KeyCodec.decode('HR1·8FEP')).toThrow(Error);
  });
});

describe('KeyCodec backward compatibility', () => {
  it('decodes a pre-FEAT-022 key (no size bits ever set) as size "small", without throwing', () => {
    // A key encoded before the size field existed never set bits 17-18, so
    // they read back as 0 ("small") rather than the reserved value 3 - this
    // must keep decoding cleanly, not throw.
    const legacyPayload =
      BASE_PARAMS.pivotBlockSize | (0 << 8) | (0 << 11) | (0 << 12);
    const legacyKey = `HR1·${legacyPayload.toString(36).toUpperCase().padStart(4, '0')}`;

    const decoded = KeyCodec.decode(legacyKey);

    expect(decoded.size).toBe('small');
  });
});
