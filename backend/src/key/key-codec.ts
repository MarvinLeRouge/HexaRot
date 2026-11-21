import type { ReadingOrder } from '../reading-order/reading-order-strategy.interface';
import type { CaseSize } from '../shared/types/case-size.type';

export type { ReadingOrder };

/**
 * Rotation angle indices, where 0-3 map to [0°, 90°, 180°, 270°].
 * The rotation engine cycles through this sequence when processing blocks.
 * V1 keys hold one of the 24 permutations of [0, 1, 2, 3]; V2 keys hold
 * MIN_ROTATION_SEQUENCE_LENGTH to MAX_ROTATION_SEQUENCE_LENGTH free angles,
 * repetitions allowed, never all 0.
 */
export type RotationSequence = number[];

/** Shortest rotation sequence a V2 key can hold. */
export const MIN_ROTATION_SEQUENCE_LENGTH = 4;
/** Longest rotation sequence a V2 key can hold. */
export const MAX_ROTATION_SEQUENCE_LENGTH = 32;

/**
 * Longest key string the API accepts before decoding (a V2 key is at most
 * 20 characters): keeps a junk key from being echoed back at full size in
 * the 400 error message.
 */
export const MAX_KEY_INPUT_LENGTH = 32;

/** Parameters encoded in a HexaRot key. */
export interface KeyParams {
  /**
   * Key format version: 1 for keys handed out before FEAT-032 (decode only),
   * 2 for every key produced by `KeyCodec.encode`.
   */
  version: 1 | 2;
  /** Size of each pivot block in cases (T×T). */
  pivotBlockSize: number;
  /** Rotation angle indices, applied cyclically over the blocks. */
  rotationSequence: RotationSequence;
  /**
   * Rotation direction applied to all blocks. A V2 key always decodes as
   * `cw`: `encode` folds `ccw` into the angles (90° ccw is 270° cw).
   */
  rotationDirection: 'cw' | 'ccw';
  /** Block traversal order. */
  readingOrder: ReadingOrder;
  /** Rendered case size used to produce (and required to decode) the cryptogram. */
  size: CaseSize;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const KEY_PREFIX = 'HR';
const KEY_SEPARATOR = '·';
const VERSION_V1 = '1';
const VERSION_V2 = '2';
const V1_PAYLOAD_LENGTH = 4;
const PAYLOAD_RADIX = 36;
const BASE36_PAYLOAD = /^[0-9A-Z]+$/i;

/** All 8 reading orders, indexed 0-7. */
export const READING_ORDERS: ReadingOrder[] = [
  'LR-TB',
  'RL-TB',
  'TB-LR',
  'BT-LR',
  'LR-TB-ALT',
  'RL-TB-ALT',
  'TB-LR-ALT',
  'BT-LR-ALT',
];

/** All 3 case sizes, indexed 0-2. Index 3 is reserved (unused). */
export const CASE_SIZES: CaseSize[] = ['small', 'medium', 'large'];

/**
 * All 24 permutations of [0, 1, 2, 3] in lexicographic order, the V1
 * rotation sequence table. Index 0 = [0,1,2,3], index 23 = [3,2,1,0].
 */
const V1_ROTATION_SEQUENCES: RotationSequence[] = buildPermutations([
  0, 1, 2, 3,
]);

function buildPermutations(arr: number[]): RotationSequence[] {
  if (arr.length === 0) return [[]];
  const result: RotationSequence[] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of buildPermutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

// ─── V1 bit layout (decode only) ──────────────────────────────────────────────
//
// A 19-bit integer encoded as a 4-digit base36 string:
//   bits  0–7  → pivotBlockSize  (uint8, 1–255)
//   bits  8–10 → readingOrderIndex (0–7)
//   bit  11    → rotationDirection (0 = cw, 1 = ccw)
//   bits 12–16 → rotationSequenceIndex (0–23)
//   bits 17–18 → sizeIndex (0–2; 3 is reserved)

function unpackV1(payload: number): Omit<KeyParams, 'version'> {
  return {
    pivotBlockSize: payload & 0xff,
    readingOrder: READING_ORDERS[(payload >> 8) & 0x07],
    rotationDirection: ((payload >> 11) & 0x01) === 1 ? 'ccw' : 'cw',
    rotationSequence: V1_ROTATION_SEQUENCES[(payload >> 12) & 0x1f],
    size: CASE_SIZES[(payload >> 17) & 0x03],
  };
}

// ─── V2 bit layout ────────────────────────────────────────────────────────────
//
// A (18 + 2L)-bit integer, L being the sequence length, encoded in base36
// and zero-padded to the length of the largest (18 + 2L)-bit value, so the
// key length depends on L only (6 characters for L=4, 16 for L=32):
//   bits  0–7  → pivotBlockSize  (uint8, 1–255)
//   bits  8–10 → readingOrderIndex (0–7)
//   bits 11–12 → sizeIndex (0–2; 3 is reserved)
//   bits 13–17 → L - 4 (0–28)
//   bits 18+2i → angle index i (0–3), for i in 0..L-1
// The length sits in the low bits so a decoder can read it before the angles.

const V2_HEADER_BITS = 18;
const V2_LENGTH_SHIFT = 13n;

function v2PayloadLength(sequenceLength: number): number {
  const bits = BigInt(V2_HEADER_BITS + 2 * sequenceLength);
  return ((1n << bits) - 1n).toString(PAYLOAD_RADIX).length;
}

const V2_MIN_PAYLOAD_LENGTH = v2PayloadLength(MIN_ROTATION_SEQUENCE_LENGTH);
const V2_MAX_PAYLOAD_LENGTH = v2PayloadLength(MAX_ROTATION_SEQUENCE_LENGTH);

function packV2(params: KeyParams, sequence: RotationSequence): string {
  let payload =
    BigInt(params.pivotBlockSize) |
    (BigInt(READING_ORDERS.indexOf(params.readingOrder)) << 8n) |
    (BigInt(CASE_SIZES.indexOf(params.size)) << 11n) |
    (BigInt(sequence.length - MIN_ROTATION_SEQUENCE_LENGTH) << V2_LENGTH_SHIFT);
  sequence.forEach((angle, i) => {
    payload |= BigInt(angle) << BigInt(V2_HEADER_BITS + 2 * i);
  });
  return payload
    .toString(PAYLOAD_RADIX)
    .toUpperCase()
    .padStart(v2PayloadLength(sequence.length), '0');
}

function parseBase36(payload: string): bigint {
  let value = 0n;
  for (const char of payload.toLowerCase()) {
    value = value * 36n + BigInt(parseInt(char, PAYLOAD_RADIX));
  }
  return value;
}

function unpackV2(key: string, payloadStr: string): Omit<KeyParams, 'version'> {
  const payload = parseBase36(payloadStr);
  const sequenceLength =
    Number((payload >> V2_LENGTH_SHIFT) & 0x1fn) + MIN_ROTATION_SEQUENCE_LENGTH;
  if (sequenceLength > MAX_ROTATION_SEQUENCE_LENGTH) {
    throw new Error(
      `Invalid key format: "${key}" (unpacks to a sequence length over ${MAX_ROTATION_SEQUENCE_LENGTH})`,
    );
  }
  if (payloadStr.length !== v2PayloadLength(sequenceLength)) {
    throw new Error(
      `Invalid key format: "${key}" (payload length does not match its sequence length of ${sequenceLength})`,
    );
  }
  const bits = BigInt(V2_HEADER_BITS + 2 * sequenceLength);
  if (payload >> bits !== 0n) {
    throw new Error(
      `Invalid key format: "${key}" (bits set beyond its rotation sequence)`,
    );
  }

  const rotationSequence = Array.from({ length: sequenceLength }, (_, i) =>
    Number((payload >> BigInt(V2_HEADER_BITS + 2 * i)) & 0x3n),
  );
  return {
    pivotBlockSize: Number(payload & 0xffn),
    readingOrder: READING_ORDERS[Number((payload >> 8n) & 0x7n)],
    rotationDirection: 'cw',
    rotationSequence,
    size: CASE_SIZES[Number((payload >> 11n) & 0x3n)],
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Returns why a rotation sequence cannot go into a V2 key, or null if it can:
 * length out of range, an entry that is not an angle index 0-3, or only 0°
 * rotations (the cryptogram would be the plain message).
 */
export function describeRotationSequenceError(
  sequence: RotationSequence,
): string | null {
  if (
    sequence.length < MIN_ROTATION_SEQUENCE_LENGTH ||
    sequence.length > MAX_ROTATION_SEQUENCE_LENGTH
  ) {
    return `rotation sequence length must be ${MIN_ROTATION_SEQUENCE_LENGTH}-${MAX_ROTATION_SEQUENCE_LENGTH}, got ${sequence.length}`;
  }
  if (
    sequence.some((angle) => !Number.isInteger(angle) || angle < 0 || angle > 3)
  ) {
    return `rotation sequence entries must be angle indices 0-3, got [${sequence.join(',')}]`;
  }
  if (sequence.every((angle) => angle === 0)) {
    return 'rotation sequence must not be only 0° rotations (it would leave the message in clear)';
  }
  return null;
}

/** Rewrites a ccw sequence as the equivalent cw one: A° ccw is (360 - A)° cw. */
function toClockwise(params: KeyParams): RotationSequence {
  return params.rotationDirection === 'ccw'
    ? params.rotationSequence.map((angle) => (4 - angle) % 4)
    : params.rotationSequence;
}

// ─── KeyCodec ─────────────────────────────────────────────────────────────────

/**
 * Encodes and decodes HexaRot key strings.
 *
 * Key format: `HR{V}·{PAYLOAD}`
 * - `HR`: literal prefix
 * - `{V}`: version, `2` for every key `encode` produces, `1` for older keys
 *   that `decode` still reads
 * - `·`: visual separator (middle dot U+00B7)
 * - `{PAYLOAD}`: base36 characters, 4 for V1, 6 to 16 for V2 (depending on
 *   the rotation sequence length)
 *
 * @example
 * const key = KeyCodec.encode({ version: 2, pivotBlockSize: 5, ... });
 * // → 'HR2·0ZL3ID' (pivot 5, LR-TB, medium, [0, 1, 2, 3])
 * const params = KeyCodec.decode(key);
 */
export class KeyCodec {
  /**
   * Serialises key parameters to a V2 key string, whatever `params.version`
   * says. A `ccw` direction is folded into the angles, so the key decodes
   * as `cw` with an equivalent sequence.
   *
   * @throws {Error} If the rotation sequence has a length outside 4-32, an
   *   entry outside 0-3, or only 0° rotations.
   * @throws {Error} If the reading order is not a known reading order.
   * @throws {Error} If pivotBlockSize is not an integer 1-255 or size is unknown.
   */
  static encode(params: KeyParams): string {
    const sequenceError = describeRotationSequenceError(
      params.rotationSequence,
    );
    if (sequenceError) {
      throw new Error(`Invalid rotation sequence: ${sequenceError}`);
    }
    if (!READING_ORDERS.includes(params.readingOrder)) {
      throw new Error(`Invalid reading order: ${params.readingOrder}`);
    }
    if (
      !Number.isInteger(params.pivotBlockSize) ||
      params.pivotBlockSize < 1 ||
      params.pivotBlockSize > 255
    ) {
      throw new Error(
        `Invalid pivotBlockSize: ${params.pivotBlockSize} (must be an integer 1-255)`,
      );
    }
    if (!CASE_SIZES.includes(params.size)) {
      throw new Error(`Invalid size: ${params.size}`);
    }

    const payload = packV2(params, toClockwise(params));
    return `${KEY_PREFIX}${VERSION_V2}${KEY_SEPARATOR}${payload}`;
  }

  /**
   * Deserialises a V1 or V2 key string to its parameters.
   *
   * @throws {Error} If the key string is malformed or has an unknown version.
   * @throws {Error} If a V2 payload length does not match its sequence length
   *   (e.g. a truncated key), or has bits set beyond its sequence.
   * @throws {Error} If the key unpacks to a semantically invalid
   *   pivotBlockSize, rotation sequence or size index.
   */
  static decode(key: string): KeyParams {
    if (!KeyCodec.validate(key)) {
      throw new Error(`Invalid key format: "${key}"`);
    }

    const version = key[KEY_PREFIX.length] === VERSION_V1 ? 1 : 2;
    const payloadStr = key.slice(
      key.indexOf(KEY_SEPARATOR) + KEY_SEPARATOR.length,
    );
    const unpacked =
      version === 1
        ? unpackV1(parseInt(payloadStr, PAYLOAD_RADIX))
        : unpackV2(key, payloadStr);

    if (unpacked.pivotBlockSize < 1) {
      throw new Error(
        `Invalid key format: "${key}" (unpacks to pivotBlockSize=${unpacked.pivotBlockSize}, must be positive)`,
      );
    }
    if (!unpacked.rotationSequence) {
      throw new Error(
        `Invalid key format: "${key}" (unpacks to an out-of-range rotation sequence index)`,
      );
    }
    if (!unpacked.size) {
      throw new Error(
        `Invalid key format: "${key}" (unpacks to a reserved size index)`,
      );
    }
    const sequenceError = describeRotationSequenceError(
      unpacked.rotationSequence,
    );
    if (sequenceError) {
      throw new Error(`Invalid key format: "${key}" (${sequenceError})`);
    }

    return { version, ...unpacked };
  }

  /**
   * Returns true if the key string has a valid structure (prefix, known
   * version, separator, base36 payload of a length that version allows),
   * without fully decoding it. Does not verify that parameter values are
   * semantically valid, nor that a V2 payload length matches its sequence.
   */
  static validate(key: string): boolean {
    if (!key.startsWith(KEY_PREFIX)) return false;

    const afterPrefix = key.slice(KEY_PREFIX.length);
    const versionChar = afterPrefix[0];
    if (versionChar !== VERSION_V1 && versionChar !== VERSION_V2) return false;
    if (afterPrefix.indexOf(KEY_SEPARATOR) !== 1) return false;

    const payload = afterPrefix.slice(1 + KEY_SEPARATOR.length);
    if (!BASE36_PAYLOAD.test(payload)) return false;

    return versionChar === VERSION_V1
      ? payload.length === V1_PAYLOAD_LENGTH
      : payload.length >= V2_MIN_PAYLOAD_LENGTH &&
          payload.length <= V2_MAX_PAYLOAD_LENGTH;
  }
}
