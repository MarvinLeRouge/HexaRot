# HexaRot — Test Spec: Cipher Domain

Covers: FEAT-001 (VisualAlphabet / HexahueAlphabet), FEAT-002 (pre-processing),
FEAT-003 (parameter validation), FEAT-006 (grid construction), FEAT-008 (metadata header).

All tests in this document are **unit tests**. No database access.

Tests that exercise the `VisualAlphabet` contract (pre-processing, parameter validation,
grid construction) use `MockAlphabet` — the shared test double defined by TEST-004,
located at `test/utils/mock-alphabet`. `MockAlphabet` uses dimensions **3×2** (width×height)
and supports characters A–F with hardcoded colour grids.

`HexahueAlphabet` is tested separately against its own data, using a mock data source
that reproduces the Hexahue structure (dimensions 2×3).

---

## 1. VisualAlphabet / HexahueAlphabet (FEAT-001)

### Contract tests — via MockAlphabet (TEST-004)

These tests verify the `VisualAlphabet` interface contract independently of any real
alphabet. They use `MockAlphabet` (dimensions 3×2, characters A–F).

```
describe('VisualAlphabet contract — MockAlphabet')
```

- it returns a ColorGrid of the correct dimensions (symbolWidth × symbolHeight) for a supported character
- it returns a grid where every cell contains a value from the alphabet's colour set
- it throws a typed `UnsupportedCharacterError` for a character not in the supported set
- it throws for an empty string input
- it throws for a multi-character string input
- it returns no duplicate entries from `getSupportedChars`
- it returns only single-character strings from `getSupportedChars`
- it exposes `symbolWidth` as a required numeric property
- it exposes `symbolHeight` as a required numeric property

### HexahueAlphabet-specific tests

```
describe('HexahueAlphabet.getBlock')
```

- it returns a **2×3** ColorGrid for every supported character
- it returns a grid where each cell contains a valid Hexahue palette colour
- it is case-insensitive (input is pre-processed upstream, but defensive handling is acceptable)
- it exposes `symbolWidth: 2` and `symbolHeight: 3`

```
describe('HexahueAlphabet.getSupportedChars')
```

- it returns an array containing all 26 uppercase letters
- it returns an array containing all 10 digits
- it returns an array containing all special characters defined in the Hexahue spec

---

## 2. Text pre-processing (FEAT-002)

All `preprocess` tests use `MockAlphabet` (characters A–F, dimensions 3×2) as the
alphabet argument. This decouples the pre-processing logic from Hexahue specifics.

### `preprocess(input, alphabet)`

```
describe('preprocess')
```

**Uppercasing**
- it converts a lowercase ASCII string to uppercase
- it converts a mixed-case string to uppercase
- it leaves an already-uppercase string unchanged

**Transliteration**
- it converts French accented characters: é→E, è→E, ê→E, à→A, â→A, ù→U, û→U, î→I, ô→O, ç→C, œ→OE, æ→AE
- it converts Spanish accented characters: ñ→N, á→A, í→I, ó→O, ú→U, ü→U
- it converts German accented characters: ä→A, ö→O, ü→U, ß→SS
- it converts Portuguese accented characters: ã→A, õ→O, ç→C
- it applies transliteration before checking against the alphabet

**Unknown character reporting**
- it returns an empty `unknownChars` array when all characters are supported
- it collects characters that remain unsupported after transliteration
- it does not silently drop unknown characters from the processed string
- it reports each distinct unknown character only once (no duplicates in the report)
- it preserves the relative position logic: unknown chars are excluded from the
  output string but listed in `unknownChars`

**Edge cases**
- it returns an empty processed string and empty `unknownChars` for an empty input
- it returns an empty processed string and all chars in `unknownChars` for a string
  composed entirely of unsupported characters
- it handles a string of length 1 correctly for both supported and unsupported input

**Purity**
- it does not mutate the input string
- it returns the same result for the same input (deterministic)

---

## 3. Parameter validation (FEAT-003)

All `validateParams` tests use `MockAlphabet` (symbolWidth=3, symbolHeight=2) unless
otherwise noted. GCD weak/valid thresholds are computed against these dimensions.

### `validateParams(pivotBlockSize, alphabet)`

```
describe('validateParams')
```

**Valid configurations**
- it returns `{ status: 'valid' }` for T=5 (GCD(5,3)=1, GCD(5,2)=1) with MockAlphabet
- it returns `{ status: 'valid' }` for T=7
- it returns `{ status: 'valid' }` for T=11

**Weak configurations**
- it returns `{ status: 'weak' }` for T=3 (GCD(3,3)=3, shares factor with symbolWidth)
- it returns `{ status: 'weak' }` for T=2 (GCD(2,2)=2, shares factor with symbolHeight)
- it returns `{ status: 'weak' }` for T=6 (GCD(6,3)=3 and GCD(6,2)=2, both dimensions)
- it includes a human-readable explanation in the `weak` result
- it identifies which dimension(s) caused the weakness in the explanation

**Override**
- it returns `{ status: 'overridden' }` for a weak T when override flag is true
- it returns `{ status: 'valid' }` for a valid T even when override flag is true
  (override does not change a valid result)

**GCD utility**
- it computes GCD(0, n) = n
- it computes GCD(n, 0) = n
- it computes GCD(12, 8) = 4
- it computes GCD(7, 3) = 1

---

## 4. Grid construction (FEAT-006)

`buildGrid` tests use `MockAlphabet` (symbolWidth=3, symbolHeight=2, characters A–F).
T values are chosen to be coprime with both 3 and 2 (e.g. T=5, T=7) unless the test
specifically targets a dimension relationship.

### `buildGrid(processedString, alphabet, pivotBlockSize)`

```
describe('buildGrid')
```

**Dimensions**
- it produces a grid whose width in cases is a multiple of pivotBlockSize
- it produces a grid whose height in cases is a multiple of pivotBlockSize
- it satisfies both dimension constraints for T=5, T=7, T=11

**Symbol layout**
- it places the first symbol of the message at position (0,0)
- it lays out symbols left-to-right, top-to-bottom within the message area
- it places all N symbols of the message in the grid (no symbol omitted)
- it places no message symbol in the padding area

**Padding**
- it fills trailing positions with valid colour values from the alphabet's palette
- it places padding only after the last message symbol
- it uses random padding (two calls with the same input may differ in padding content)

**Edge cases**
- it handles a message that fills the grid exactly (zero padding needed)
- it handles a single-character message
- it handles an empty string (grid contains only padding)

---

## 5. Metadata header (FEAT-008)

### `encodeHeader(messageLength)` / `decodeHeader(encoded)`

```
describe('encodeHeader / decodeHeader')
```

**Round-trip**
- it recovers messageLength=1 after encode→decode
- it recovers messageLength=100 after encode→decode
- it recovers the maximum supported message length after encode→decode

**encodeHeader**
- it returns a value of the documented fixed size (byte count or case count)
- it is deterministic for the same input
- it does not embed any key-related information

**decodeHeader**
- it throws or returns an error for a malformed header input
- it throws or returns an error for a truncated header input

---

## Fixtures

**`MockAlphabet`** — imported from `test/utils/mock-alphabet` (defined by TEST-004).
This is the canonical shared test double for `VisualAlphabet`. Do not redefine it here.
Properties: `symbolWidth: 3`, `symbolHeight: 2`, supported characters: A–F.

The following additional fixtures must be defined in `__fixtures__/cipher.fixtures.ts`:

- `VALID_PIVOT_SIZES` — `[5, 7, 11]` (coprime with both 3 and 2)
- `WEAK_PIVOT_SIZES_MOCK` — `[2, 3, 6]` (share a factor with MockAlphabet dimensions)
- `SAMPLE_MESSAGES` — a set of short strings using MockAlphabet's character set (A–F),
  covering: all supported chars, empty string, single char, string with unsupported chars.
