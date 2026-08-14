# FEAT-008 - Cryptogram Metadata Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `encodeHeader(messageLength)` / `decodeHeader(encoded)`: a fixed-size binary header storing the message character count, so the decoder knows where message content ends and padding begins, without ever referencing the key.

**Architecture:** A fixed-size 2-byte `Buffer` (`Uint16BE`), independent of any `VisualAlphabet` - the header stores a plain integer, nothing else. Converting this binary header into a visual row of colour cases is deliberately out of scope here and belongs to the renderers (FEAT-009/010): this plan defines *what* data the header carries, not *how* it looks once drawn. Confirmed with the user: this reading of BACKLOG.md's "byte layout or visual row" choice matches the item's own `learning` tag ("binary header design, buffer encoding in Node.js").

**Tech Stack:** TypeScript (strict), Node.js `Buffer`, Jest + ts-jest.

**Spec:** `BACKLOG.md` (`FEAT-008`) and `docs/tests/cipher.md` section 5 ("Metadata header (FEAT-008)") - read both before touching code.

## Global Constraints

- TypeScript strict mode, no implicit any. Code, comments, commit messages: English.
- No em dash, en dash used as a hyphen, or curly quotes anywhere written - code, comments, or commit messages. Plain hyphen `-` only.
- Conventional Commits format, with the mandatory "Modified files:" list.
- Branch: `feat/FEAT-008-metadata-header`, created from up-to-date `main`.
- `docs/tests/index.md` section 4 governs every test in this plan: each `it` body must be a single flat assertion path - no `for`/`while`/`if` control-flow statements written directly inside an `it` callback.
- Header size is fixed at 2 bytes regardless of message length, supporting message lengths 0 through 65535 (`Uint16BE` range). `messageLength = 0` is valid (an empty message still produces a grid per FEAT-006's `buildGrid`, which is entirely padding - the header must be able to represent that).
- `encodeHeader` validates its input and throws a `RangeError` for a non-integer, negative, or over-maximum `messageLength` - consistent with the input-validation guards already established on `buildGrid` (FEAT-006) and `RotationEngine` (FEAT-007) this cycle.
- `decodeHeader` throws for any buffer that is not exactly 2 bytes long (covers both the doc's "malformed" and "truncated" bullets with one rule, since any 2-byte value is itself a valid `Uint16`).

---

## File Structure

- Create: `backend/src/cipher/header.ts` - `encodeHeader`, `decodeHeader`, `HEADER_SIZE_BYTES`, `MAX_MESSAGE_LENGTH` (the constants are exported so FEAT-009/010/011/012 can reference the same bound without redefining it).
- Create: `backend/src/cipher/header.spec.ts` - the 8 tests matching `docs/tests/cipher.md` section 5's `describe('encodeHeader / decodeHeader')` one-to-one, plus 3 additional `encodeHeader` input-validation tests (not in the doc, but consistent with this cycle's established pattern of guarding against invalid decoded-key-derived input).

No existing files are modified. No new fixtures file is needed - `docs/tests/cipher.md`'s Fixtures section lists nothing specific to the header, and the literal values used here (1, 100, 65535, a few raw buffers) don't warrant extraction.

---

### Task 1: encodeHeader / decodeHeader implementation and full test suite

**Files:**
- Create: `backend/src/cipher/header.ts`
- Test: `backend/src/cipher/header.spec.ts`

**Interfaces:**
- Produces: `export const HEADER_SIZE_BYTES = 2`, `export const MAX_MESSAGE_LENGTH = 0xffff` (65535), `export function encodeHeader(messageLength: number): Buffer`, `export function decodeHeader(encoded: Buffer): number`. This is what FEAT-009/010 (renderers, to draw the header) and FEAT-011/012 (API endpoints, to read/write it alongside the grid) will import next.

- [ ] **Step 1: Write the failing tests**

```typescript
// backend/src/cipher/header.spec.ts
import { encodeHeader, decodeHeader, HEADER_SIZE_BYTES, MAX_MESSAGE_LENGTH } from './header';

describe('encodeHeader / decodeHeader', () => {
  describe('round-trip', () => {
    it('recovers messageLength=1 after encode-decode', () => {
      expect(decodeHeader(encodeHeader(1))).toBe(1);
    });

    it('recovers messageLength=100 after encode-decode', () => {
      expect(decodeHeader(encodeHeader(100))).toBe(100);
    });

    it('recovers the maximum supported message length after encode-decode', () => {
      expect(decodeHeader(encodeHeader(MAX_MESSAGE_LENGTH))).toBe(
        MAX_MESSAGE_LENGTH,
      );
    });
  });

  describe('encodeHeader', () => {
    it('returns a value of the documented fixed size (2 bytes)', () => {
      expect(encodeHeader(1).length).toBe(HEADER_SIZE_BYTES);
      expect(encodeHeader(MAX_MESSAGE_LENGTH).length).toBe(HEADER_SIZE_BYTES);
    });

    it('is deterministic for the same input', () => {
      expect(encodeHeader(42)).toEqual(encodeHeader(42));
    });

    it('does not embed any key-related information', () => {
      // The header is a fixed HEADER_SIZE_BYTES buffer for every valid
      // messageLength, leaving no room to smuggle in key-related data -
      // encodeHeader's signature takes only messageLength, nothing else.
      expect(encodeHeader(1).length).toBe(
        encodeHeader(MAX_MESSAGE_LENGTH).length,
      );
    });
  });

  describe('decodeHeader', () => {
    it('throws for a malformed header input', () => {
      expect(() => decodeHeader(Buffer.from([1, 2, 3]))).toThrow();
    });

    it('throws for a truncated header input', () => {
      expect(() => decodeHeader(Buffer.from([1]))).toThrow();
    });
  });

  describe('encodeHeader input validation', () => {
    it('throws for a negative messageLength', () => {
      expect(() => encodeHeader(-1)).toThrow(RangeError);
    });

    it('throws for a messageLength exceeding the maximum supported length', () => {
      expect(() => encodeHeader(MAX_MESSAGE_LENGTH + 1)).toThrow(RangeError);
    });

    it('throws for a non-integer messageLength', () => {
      expect(() => encodeHeader(1.5)).toThrow(RangeError);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest cipher/header.spec.ts`
Expected: FAIL - `Cannot find module './header'`

- [ ] **Step 3: Write the implementation**

```typescript
// backend/src/cipher/header.ts

/** Fixed size of the metadata header, in bytes. */
export const HEADER_SIZE_BYTES = 2;

/** Largest message length representable by a HEADER_SIZE_BYTES-byte Uint16BE header. */
export const MAX_MESSAGE_LENGTH = 0xffff;

/**
 * Encodes a message's character count into a fixed-size binary header.
 *
 * The header is independent of the key and of any VisualAlphabet - it
 * carries only the message length. Converting it into a visual row of
 * colour cases for the rendered cryptogram is the renderer's job, not
 * this function's.
 *
 * @throws {RangeError} If messageLength is not an integer in [0, MAX_MESSAGE_LENGTH].
 */
export function encodeHeader(messageLength: number): Buffer {
  if (
    !Number.isInteger(messageLength) ||
    messageLength < 0 ||
    messageLength > MAX_MESSAGE_LENGTH
  ) {
    throw new RangeError(
      `messageLength must be an integer between 0 and ${MAX_MESSAGE_LENGTH}, got ${messageLength}`,
    );
  }

  const buffer = Buffer.alloc(HEADER_SIZE_BYTES);
  buffer.writeUInt16BE(messageLength, 0);
  return buffer;
}

/**
 * Decodes a metadata header back into the message's character count.
 *
 * @throws {RangeError} If encoded is not exactly HEADER_SIZE_BYTES long.
 */
export function decodeHeader(encoded: Buffer): number {
  if (encoded.length !== HEADER_SIZE_BYTES) {
    throw new RangeError(
      `header must be exactly ${HEADER_SIZE_BYTES} bytes, got ${encoded.length}`,
    );
  }

  return encoded.readUInt16BE(0);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest cipher/header.spec.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Run the full backend suite**

Run: `cd backend && npm run test`
Expected: PASS, all suites including the new one, no regressions.

- [ ] **Step 6: Commit**

```bash
git add backend/src/cipher/header.ts backend/src/cipher/header.spec.ts
git commit -m "$(cat <<'EOF'
feat(cipher): implement encodeHeader/decodeHeader for cryptogram metadata

Modified files:
- backend/src/cipher/header.ts - fixed 2-byte Uint16BE header storing message character count (0-65535), independent of the key and of any VisualAlphabet; converting it into a visual row is the renderer's job, not this module's
- backend/src/cipher/header.spec.ts - 8 tests matching docs/tests/cipher.md section 5 one-to-one, plus 3 encodeHeader input-validation tests
EOF
)"
```

---

## After this plan

Update `BACKLOG.md` (`FEAT-008` status `ready` -> `done`) in the same PR, push `feat/FEAT-008-metadata-header`, and hand back title/description for the user to open the PR. Next up per the validated roadmap: **FEAT-009** (PNG renderer), which will consume both `buildGrid`'s output (FEAT-006) and `encodeHeader`'s output (this plan) to draw the header row above the grid. Read `docs/tests/renderer.md` before planning it.
