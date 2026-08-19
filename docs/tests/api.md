# HexaRot — Test Spec: API Domain

Covers: FEAT-011 (POST /encode), FEAT-012 (POST /decode), FEAT-013 (POST /key/generate,
GET /key/parse).

All tests in this document are **integration tests**. They use the NestJS testing module
and supertest. They run against a real, seeded PostgreSQL test database (full Hexahue
alphabet) - `backend/test/{app,encode,decode,key}.e2e-spec.ts`, run via `npm run test:e2e`.

No per-test isolation logic (transactions, truncation) is needed: the schema
(`Alphabet`, `Symbol`, `ColorCase`) is entirely seed data, never written to by any
encode/decode/key endpoint at runtime, so there is no mutable state for tests to leak
into each other. Locally, point `DATABASE_URL` at the `docker-compose.yml` postgres
service (already migrated and seeded for normal development). In CI, the backend job's
`postgres:16` service (provisioned by CI-003) is migrated and seeded before the E2E
test step runs.

---

## 1. POST /encode (FEAT-011)

```
describe('POST /encode')
```

**Happy path**
- it returns 200 with a valid base64 PNG string in `png`
- it returns 200 with a valid SVG string in `svg` (starts with '\<svg')
- it returns 200 with a valid HR key string in `key`
- it returns 200 with an empty `warnings` array when params are strong
- it returns 200 with an empty `unknownChars` array for a clean ASCII message
- it generates a key from individual params when no `key` field is provided
- it uses the provided `key` and ignores individual params when `key` is present
- it encodes the same message with all three size options without error

**Weakness warning**
- it returns 200 with a non-empty `warnings` array when pivotBlockSize=2
- it returns 200 and does not block encoding when a weakness warning is present
- it returns 200 with an empty `warnings` array when `overrideWeaknessWarning=true`
  and pivotBlockSize=2 (warning suppressed)

**Unknown characters**
- it returns 200 with the unknown character listed in `unknownChars` for a message
  containing an unsupported symbol
- it encodes the remaining supported characters when unknown chars are present

**Validation errors**
- it returns 400 when `message` is missing
- it returns 400 when `message` is an empty string
- it returns 400 when `key` is provided but malformed
- it returns 400 when `rotationDirection` is not 'cw' or 'ccw'
- it returns 400 when `size` is not 'small', 'medium', or 'large'
- it returns 400 when extra fields are present in the body (strict DTO)

---

## 2. POST /decode (FEAT-012)

```
describe('POST /decode')
```

**Round-trip**
- it decodes a PNG cryptogram produced by POST /encode and recovers the original message
- it decodes an SVG cryptogram produced by POST /encode and recovers the original message
- it recovers the message for all four reading orders
- it recovers the message for both rotation directions
- it recovers the message for a multi-word message with spaces (the real Hexahue
  alphabet supports a space character, unlike the unit-test-only MockAlphabet)

**Validation errors**
- it returns 400 when `cryptogram` is missing
- it returns 400 when `key` is missing
- it returns 400 when `key` is malformed
- it returns 400 when `format` is not 'png' or 'svg'
- it returns 400 when `cryptogram` is not valid base64 (for PNG format)
- it returns 400 when `cryptogram` is not valid SVG (for SVG format)

**Size validation**
- it returns 400 when `size` is missing
- it returns 400 when `size` is not 'small', 'medium', or 'large'

---

## 3. POST /key/generate (FEAT-013)

```
describe('POST /key/generate')
```

- it returns 200 with a valid HR key string for a fully specified parameter set
- it returns 200 with a valid HR key string when no body is provided (default params)
- it returns 200 with a valid HR key string for each of the four reading orders
- it returns 200 with a valid HR key string for both rotation directions
- it returns 400 when `rotationDirection` is an invalid value
- it returns 400 when `readingOrder` is an unknown value
- it returns 400 when `pivotBlockSize` is not a positive integer

**Round-trip with GET /key/parse**
- it generates a key and parses it back to recover the original params without data loss

---

## 4. GET /key/parse (FEAT-013)

```
describe('GET /key/parse')
```

- it returns 200 with all decoded params for a valid HR key
- it returns the correct pivotBlockSize
- it returns the correct rotationSequence as an array of angles
- it returns the correct rotationDirection ('cw' or 'ccw')
- it returns the correct readingOrder string
- it returns 400 for a malformed key string
- it returns 400 for an empty `key` query param
- it returns 400 when the `key` query param is missing

---

## Fixtures

The following shared fixtures must be defined in `test/fixtures/api.fixtures.ts`:

- `VALID_ENCODE_BODY` — a minimal valid POST /encode request body
- `VALID_ENCODE_BODY_WITH_KEY` — same, with a pre-built HR key instead of individual params
- `WEAK_ENCODE_BODY` — a valid body with pivotBlockSize=2 (triggers weakness warning)
- `ENCODE_BODY_WITH_UNKNOWN_CHARS` — a valid body whose message contains unsupported characters
- `VALID_KEY_STRING` — a pre-computed valid HR key string (matches DEFAULT_KEY_PARAMS
  from key.fixtures.ts)
- `MALFORMED_KEY_STRINGS` — array of strings that are structurally invalid HR keys
