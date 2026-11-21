# HexaRot Test Spec: Key Domain

Covers: FEAT-004 (KeyCodec: encode, decode, validate) and FEAT-032 (key format V2,
variable-length rotation sequence). Since FEAT-032, sections 1 and 2 describe V1
keys, which `KeyCodec` only decodes; `encode` always produces V2 (section 3).

All tests in this document are **unit tests**. No database access, no filesystem.

---

## 1. KeyCodec (FEAT-004)

### `encode(params)` / `decode(key)`

```
describe('KeyCodec: round-trip')
```

**Round-trip correctness**
- it recovers the original params after encode→decode for the default parameter set
- it recovers pivotBlockSize correctly for values: 2, 3, 5, 7, 11
- it recovers rotationDirection 'cw' after round-trip
- it recovers rotationDirection 'ccw' after round-trip
- it recovers all four base reading orders after round-trip: LR-TB, RL-TB, TB-LR, BT-LR
- it recovers all four reading orders with the alternate modifier after round-trip
- it recovers all 24 rotation sequence permutations after round-trip

**Key format**
- it produces a string prefixed with 'HR'
- it produces a string containing only base36 characters after the 'HR' prefix
- it produces a string of the documented fixed length (or within the documented range)
- it does not embed message content or message length

```
describe('KeyCodec.encode')
```

- it is deterministic: same params always produce the same key string
- it encodes rotation sequence as a permutation index (0–23), not as raw angle values

```
describe('KeyCodec.decode')
```

- it throws a typed `InvalidKeyError` for a key that does not start with 'HR'
- it throws a typed `InvalidKeyError` for a key with an unknown version byte
- it throws a typed `InvalidKeyError` for a truncated key string
- it throws a typed `InvalidKeyError` for a key containing non-base36 characters

### `validate(key)`

```
describe('KeyCodec.validate')
```

- it returns true for a key produced by `encode`
- it returns false for an empty string
- it returns false for a string not starting with 'HR'
- it returns false for a key with incorrect length
- it returns false for a key containing non-base36 characters after the prefix
- it returns false for a key with an unknown version identifier
- it does not throw, it always returns a boolean

---

## 2. Rotation sequence encoding

```
describe('KeyCodec: rotation sequence permutations')
```

The 24 permutations of [0°, 90°, 180°, 270°] must each map to a unique index (0–23)
and be fully recoverable.

- it assigns a unique index to each of the 24 permutations
- it recovers permutation [0, 90, 180, 270] (identity order)
- it recovers permutation [270, 180, 90, 0] (reverse order)
- it recovers permutation [90, 0, 270, 180]
- it recovers permutation [180, 270, 0, 90]
- it produces no two permutations with the same index

---

## 3. Key format V2 (FEAT-032)

```
describe('KeyCodec.encode()')
```

- it always returns a V2 key (HR2·), whatever `params.version` says
- it returns a 6-character payload for a 4-angle sequence and 16 for a 32-angle one
- it accepts sequence lengths from 4 to 32
- it throws for a sequence shorter than 4 or longer than 32
- it throws for an angle index outside 0-3 or not an integer
- it throws for a sequence made only of 0° rotations
- it throws for a pivotBlockSize outside 1-255 or not an integer, and for an unknown size
- it folds a counter-clockwise direction into the angles (ccw [1, 2, 3, 0] gives the cw [3, 2, 1, 0] key)

```
describe('KeyCodec.decode()')
```

- it throws for a V2 key whose payload length does not match its sequence length (truncated key)
- it throws for a V2 key with bits set beyond its sequence
- it throws for a V2 key that unpacks to pivotBlockSize=0, an all-0° sequence, a sequence length over 32, or the reserved size index
- it decodes lowercase V2 keys

```
describe('KeyCodec round-trip (V2)')
```

- it recovers the base params, every reading order, pivot size and case size
- it round-trips sequences of various lengths (4, 5, 17, 32), with repeated angles
- it decodes every V2 key as clockwise
- it produces different keys for sequences that differ only by length

```
describe('KeyCodec V1 decoding')
```

- it decodes a V1 key to its V1 params, keeping its rotation direction
- it decodes all 24 V1 permutations to distinct sequences, and all V1 reading orders
- it still rejects out-of-range V1 payloads and decodes pre-FEAT-022 keys as size "small"

---

## Fixtures

The following shared fixtures must be defined in `__fixtures__/key.fixtures.ts`:

- `ALL_24_PERMUTATIONS`: exhaustive array of all 24 permutations of [0, 90, 180, 270]
- `DEFAULT_KEY_PARAMS`: a valid `KeyParams` object using default values
- `ALL_READING_ORDERS`: array of all V1 reading order values including alternate variants
- `VALID_ENCODED_KEY`: a pre-computed valid key string matching `DEFAULT_KEY_PARAMS`,
  used to test `decode` and `validate` without relying on `encode`
