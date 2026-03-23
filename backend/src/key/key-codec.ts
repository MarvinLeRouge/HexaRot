/**
 * V1 reading orders supported by the HexaRot cipher.
 * The `-ALT` suffix denotes the alternate modifier, which reverses the
 * traversal direction at each new row or column.
 */
export type ReadingOrder =
  | 'LR-TB'
  | 'RL-TB'
  | 'TB-LR'
  | 'BT-LR'
  | 'LR-TB-ALT'
  | 'RL-TB-ALT'
  | 'TB-LR-ALT'
  | 'BT-LR-ALT';

/**
 * A permutation of the four rotation angles [0°, 90°, 180°, 270°],
 * represented as indices [0, 1, 2, 3].
 * The rotation engine cycles through this sequence when processing blocks.
 */
export type RotationSequence = [number, number, number, number];

/** Parameters encoded in a HexaRot key. */
export interface KeyParams {
  /** Key format version. Currently always 1. */
  version: 1;
  /** Size of each pivot block in cases (T×T). */
  pivotBlockSize: number;
  /**
   * Rotation sequence: a permutation of [0, 1, 2, 3] where each index maps
   * to [0°, 90°, 180°, 270°] respectively.
   */
  rotationSequence: RotationSequence;
  /** Rotation direction applied to all blocks. */
  rotationDirection: 'cw' | 'ccw';
  /** Block traversal order. */
  readingOrder: ReadingOrder;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const KEY_PREFIX = 'HR';
const KEY_SEPARATOR = '·';
const VERSION_V1 = '1';
const PAYLOAD_LENGTH = 4;
const PAYLOAD_RADIX = 36;

/** All 8 V1 reading orders, indexed 0-7. */
const READING_ORDERS: ReadingOrder[] = [
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
 * All 24 permutations of [0, 1, 2, 3] in lexicographic order.
 * Index 0 = [0,1,2,3], index 23 = [3,2,1,0].
 */
const ROTATION_SEQUENCES: RotationSequence[] = buildPermutations([0, 1, 2, 3]);

function buildPermutations(arr: number[]): RotationSequence[] {
  if (arr.length === 0) return [[] as unknown as RotationSequence];
  const result: RotationSequence[] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of buildPermutations(rest)) {
      result.push([arr[i], ...perm] as RotationSequence);
    }
  }
  return result;
}

// ─── Bit layout ───────────────────────────────────────────────────────────────
//
// The payload is a 17-bit integer encoded as a 4-digit base36 string:
//   bits  0–7  → pivotBlockSize  (uint8, 1–255)
//   bits  8–10 → readingOrderIndex (0–7)
//   bit  11    → rotationDirection (0 = cw, 1 = ccw)
//   bits 12–16 → rotationSequenceIndex (0–23)

function pack(params: KeyParams): number {
  const seqIndex = ROTATION_SEQUENCES.findIndex((s) =>
    s.every((v, i) => v === params.rotationSequence[i]),
  );
  const orderIndex = READING_ORDERS.indexOf(params.readingOrder);
  const dirBit = params.rotationDirection === 'ccw' ? 1 : 0;

  return (
    params.pivotBlockSize |
    (orderIndex << 8) |
    (dirBit << 11) |
    (seqIndex << 12)
  );
}

function unpack(payload: number): Omit<KeyParams, 'version'> {
  const pivotBlockSize = payload & 0xff;
  const orderIndex = (payload >> 8) & 0x07;
  const dirBit = (payload >> 11) & 0x01;
  const seqIndex = (payload >> 12) & 0x1f;

  return {
    pivotBlockSize,
    readingOrder: READING_ORDERS[orderIndex],
    rotationDirection: dirBit === 1 ? 'ccw' : 'cw',
    rotationSequence: ROTATION_SEQUENCES[seqIndex],
  };
}

// ─── KeyCodec ─────────────────────────────────────────────────────────────────

/**
 * Encodes and decodes HexaRot key strings.
 *
 * Key format: `HR{V}·{PAYLOAD}`
 * - `HR`      — literal prefix
 * - `{V}`     — version char in base36 (`1` for V1)
 * - `·`       — visual separator (middle dot U+00B7)
 * - `{PAYLOAD}` — 4 uppercase base36 characters
 *
 * @example
 * const key = KeyCodec.encode({ version: 1, pivotBlockSize: 5, ... });
 * // → 'HR1·57C3'
 * const params = KeyCodec.decode('HR1·57C3');
 */
export class KeyCodec {
  /**
   * Serialises key parameters to a key string.
   *
   * @throws {Error} If the rotation sequence is not a valid permutation of [0,1,2,3].
   * @throws {Error} If the reading order is not a V1 reading order.
   */
  static encode(params: KeyParams): string {
    const seqIndex = ROTATION_SEQUENCES.findIndex((s) =>
      s.every((v, i) => v === params.rotationSequence[i]),
    );
    if (seqIndex === -1) {
      throw new Error(
        `Invalid rotation sequence: [${params.rotationSequence.join(',')}]`,
      );
    }

    const orderIndex = READING_ORDERS.indexOf(params.readingOrder);
    if (orderIndex === -1) {
      throw new Error(`Invalid reading order: ${params.readingOrder}`);
    }

    const payload = pack(params)
      .toString(PAYLOAD_RADIX)
      .toUpperCase()
      .padStart(PAYLOAD_LENGTH, '0');

    return `${KEY_PREFIX}${VERSION_V1}${KEY_SEPARATOR}${payload}`;
  }

  /**
   * Deserialises a key string to its parameters.
   *
   * @throws {Error} If the key string is malformed or has an unknown version.
   */
  static decode(key: string): KeyParams {
    if (!KeyCodec.validate(key)) {
      throw new Error(`Invalid key format: "${key}"`);
    }

    const separatorIndex = key.indexOf(KEY_SEPARATOR);
    const payloadStr = key.slice(separatorIndex + KEY_SEPARATOR.length);
    const payload = parseInt(payloadStr, PAYLOAD_RADIX);

    return { version: 1, ...unpack(payload) };
  }

  /**
   * Returns true if the key string has a valid structure, without fully decoding it.
   * Does not verify that parameter values are semantically valid.
   */
  static validate(key: string): boolean {
    if (!key.startsWith(KEY_PREFIX)) return false;

    const afterPrefix = key.slice(KEY_PREFIX.length);
    const versionChar = afterPrefix[0];
    if (versionChar !== VERSION_V1) return false;

    const separatorIndex = afterPrefix.indexOf(KEY_SEPARATOR);
    if (separatorIndex !== 1) return false;

    const payload = afterPrefix.slice(separatorIndex + KEY_SEPARATOR.length);
    if (payload.length !== PAYLOAD_LENGTH) return false;
    if (!/^[0-9A-Z]{4}$/i.test(payload)) return false;

    return true;
  }
}
