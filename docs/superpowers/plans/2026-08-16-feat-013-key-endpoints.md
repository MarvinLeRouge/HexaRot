# FEAT-013 Key Generation and Parsing API Endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `POST /api/key/generate` (accepts optional individual key params, applies sensible defaults for any that are missing, returns a generated HR key string) and `GET /api/key/parse?key=HR...` (decodes a key string back into its structured parameters). Neither endpoint touches the cipher/rendering pipeline at all - both are thin wrappers around the already-shipped `KeyCodec` (FEAT-004).

**Architecture:** One `KeyController` (`@Controller('key')`) with two routes, backed by one `KeyService`. `KeyService.generate()` fills in any missing individual param with a fixed default before calling `KeyCodec.encode()`. `KeyService.parse()` calls `KeyCodec.decode()` and reshapes the result (rotation sequence indices become the actual angle values `[0,90,180,270]`-style, matching `docs/tests/api.md`'s literal wording "returns the correct rotationSequence as an array of angles").

**A hardening fix to already-shipped code, done once here rather than duplicated a second time:** FEAT-011's final review identified a gap in `KeyCodec.decode()` (a structurally valid key can decode to an out-of-range rotation-sequence index, or to `pivotBlockSize: 0`, both silently, no throw) and explicitly recommended fixing it at the source once a second caller needed the same guard - "FEAT-012 and FEAT-013 will both hit this, and each will otherwise reimplement its own local guard... A small KeyCodec hardening item... would let all three endpoints just catch and map to 400." `GET /key/parse` is exactly that second caller. This plan's Task 1 moves the guard into `KeyCodec.decode()` itself (a behavior-additive change: it only makes `decode()` throw in cases that previously silently returned unusable data - no legitimate caller today relies on the old silent behavior, confirmed by checking every current call site) and removes the now-redundant duplicate guard from `EncodeService` (FEAT-011).

**Tech Stack:** NestJS 11, TypeScript strict, Jest, `class-validator` (already a dependency, FEAT-011), `supertest` (already a devDependency).

**Spec:** `docs/tests/api.md` sections 3 (`POST /key/generate`) and 4 (`GET /key/parse`) are the binding test contract. `BACKLOG.md` FEAT-013 is the acceptance-criteria source.

## Global Constraints

- TypeScript strict mode, no implicit any.
- English code, comments, commit messages. No em dash, en dash, or curly quotes anywhere - plain ASCII punctuation only (hard house rule; violated repeatedly across the FEAT-009/010/011 branches, check every file including markdown with extra care). Note: `key-codec.ts`'s existing `// ─── Section ───` divider comments use box-drawing characters (U+2500), not em dashes (U+2014) - these are a different, pre-existing, allowed character; do not "fix" them.
- Conventional Commits with a mandatory "Modified files:" list on every commit.
- **`POST /key/generate` allows ANY combination of the four individual params to be omitted independently** - unlike `POST /encode`'s all-or-nothing key-vs-params split (FEAT-011), each missing field gets its own fixed default:
  - `pivotBlockSize` defaults to `5` (matches the `VALID_PIVOT_SIZES` convention already used throughout this project's cipher fixtures - coprime with Hexahue's real symbolWidth=2/symbolHeight=3).
  - `rotationSequence` defaults to `[0, 1, 2, 3]` (the identity permutation - angles 0,90,180,270 in order).
  - `rotationDirection` defaults to `'cw'`.
  - `readingOrder` defaults to `'LR-TB'` (matches `buildGrid`'s own default raster order).

  These are the "sensible defaults" `BACKLOG.md`'s FEAT-013 description calls for and that FEAT-011 explicitly deferred to this endpoint - no other default convention exists anywhere in this codebase (verified during planning: no `DEFAULT_KEY_PARAMS` or similar constant exists yet, `docs/tests/api.md`'s own Fixtures section references one but it was never created - this plan creates the actual default values as named constants in `key.service.ts`, not a separate fixture file).
- **`pivotBlockSize` in `KeyGenerateRequestDto` needs `@Max(255)`** (the same `KeyCodec` 8-bit packing constraint FEAT-011 already guards against) - do not repeat FEAT-011's original oversight of missing this bound.
- **`GET /key/parse`'s response `rotationSequence` field is an array of ANGLES (e.g. `[0, 90, 180, 270]`), not indices** - `docs/tests/api.md` section 4 literally says "it returns the correct rotationSequence as an array of angles." Convert via `index * 90` (no need to import `RotationAngle`/`ROTATION_ANGLES` from `rotation-engine.ts` for this - the mapping is a trivial one-line multiplication, and `rotation-engine.ts`'s own `ROTATION_ANGLES` constant is private/unexported, out of scope to change here).
- **`READING_ORDERS` is deduplicated in this plan.** It existed as two separate, independently-maintained literal arrays with identical content: a private const inside `key-codec.ts` (used for the key's own bit-packing index lookups) and a second private copy inside `encode-request.dto.ts` (used only for its `@IsIn(...)` validator). FEAT-011's final review flagged this explicitly as "worth doing before FEAT-013 lands." This plan exports the existing `key-codec.ts` array (a one-word change, `const` to `export const` - the array's content and order are load-bearing for the bit-packing scheme and must not change) and updates `encode-request.dto.ts` to import it instead of maintaining its own copy. `KeyGenerateRequestDto` (this plan's new DTO) imports the same shared constant from the start - there is now exactly one `READING_ORDERS` array in the codebase.
- **`KeyService` needs no dependency on `HexahueAlphabet`, `RotationEngine`, or any renderer** - neither `generate()` nor `parse()` touches the cipher/rendering pipeline at all, only `KeyCodec` (static methods, plain import, not injected - matching the established pattern from `EncodeService`). `KeyController`/`KeyService` are the first pieces of `ApiModule` that do NOT need `AlphabetModule`/`RotationModule`/`RendererModule` - but `ApiModule` as a whole still imports all three (for `EncodeController`'s sake), so any e2e test that boots the real `ApiModule` will still transitively construct `HexahueAlphabet` unless overridden, exactly as `encode.e2e-spec.ts` (FEAT-011) already had to handle. `KeyController`'s own e2e tests need the identical `overrideProvider(HexahueAlphabet).useValue(new MockAlphabet())` plus the Prisma `jest.mock`, even though `KeyController` itself never touches either - this is a consequence of `ApiModule`'s shared module graph, not something new to solve.
- `@HttpCode(200)` is required on `POST /key/generate` (NestJS defaults `@Post()` to 201, same gotcha as FEAT-011). `GET` already defaults to 200 in NestJS - do not add `@HttpCode(200)` to the `parse` route, it would be a no-op decorator.
- `KeyService.generate()`/`.parse()` catch `KeyCodec`'s thrown `Error`s and rethrow as `BadRequestException` with the original message - same pattern as `EncodeService`.
- The house rule against `for`/`while`/`if` directly inside `it()` test bodies applies (this project's established convention, `it.each` required instead).
- Following the precedent this project already established in FEAT-011 (`docs/tests/api.md`'s own specified fixture path), the full HTTP-level test suite for this plan lives in `backend/test/key.e2e-spec.ts`, run via `npm run test:e2e` - reuse the existing `backend/test/fixtures/api.fixtures.ts` file where it already has what's needed (`MALFORMED_KEY_STRINGS`), and extend it with what this plan's tests additionally need.

---

### Task 1: Harden `KeyCodec.decode()`, remove the now-redundant guard in `EncodeService`, deduplicate `READING_ORDERS`

**Files:**
- Modify: `backend/src/key/key-codec.ts`
- Modify: `backend/src/key/key-codec.spec.ts`
- Modify: `backend/src/api/encode.service.ts`
- Modify: `backend/src/api/dto/encode-request.dto.ts`

**Interfaces:**
- Produces: `KeyCodec.decode()` now throws `Error` for a structurally valid key that unpacks to `pivotBlockSize < 1` or an out-of-range rotation-sequence index (previously silently returned unusable data). `READING_ORDERS` exported from `key-codec.ts`.
- Consumes (verifying no behavior change): `EncodeService`'s existing tests (`encode.service.spec.ts`) already cover both scenarios via `'HR1·ZZZZ'` and `'HR1·0000'` and must keep passing unchanged - `EncodeService`'s own `try/catch` around `KeyCodec.decode()` already converts any thrown `Error` to `BadRequestException`, so removing its now-redundant follow-up guard changes nothing externally observable.

This task is entirely behavior-preserving-or-additive for every existing caller: `KeyCodec.decode()` throws in strictly more cases than before (cases that previously produced silently-wrong data), and `EncodeService`'s tests for exactly those two cases already exist and already only assert "throws `BadRequestException`" (not which specific line throws it internally), so they keep passing unchanged.

- [ ] **Step 1: Write the failing tests for the hardened `KeyCodec.decode()`**

Add to `backend/src/key/key-codec.spec.ts` (append; do not modify any existing test in this file):

```typescript
describe('KeyCodec.decode - out-of-range payload values', () => {
  it('throws for a structurally valid key that unpacks to an out-of-range rotation sequence index', () => {
    expect(() => KeyCodec.decode('HR1·ZZZZ')).toThrow(Error);
  });

  it('throws for a structurally valid key that unpacks to pivotBlockSize=0', () => {
    expect(() => KeyCodec.decode('HR1·0000')).toThrow(Error);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest key-codec.spec.ts`
Expected: FAIL (both new tests) - `KeyCodec.decode('HR1·ZZZZ')` currently returns `{ ..., rotationSequence: undefined }` without throwing, and `KeyCodec.decode('HR1·0000')` currently returns `{ ..., pivotBlockSize: 0 }` without throwing.

- [ ] **Step 3: Harden `KeyCodec.decode()` and export `READING_ORDERS`**

Modify `backend/src/key/key-codec.ts`:

1. Change line 38 from `const READING_ORDERS: ReadingOrder[] = [` to `export const READING_ORDERS: ReadingOrder[] = [` - the array's contents and order are unchanged, only the export keyword is added.
2. Replace the `decode()` method body (lines 155-165) with:

```typescript
  static decode(key: string): KeyParams {
    if (!KeyCodec.validate(key)) {
      throw new Error(`Invalid key format: "${key}"`);
    }

    const separatorIndex = key.indexOf(KEY_SEPARATOR);
    const payloadStr = key.slice(separatorIndex + KEY_SEPARATOR.length);
    const payload = parseInt(payloadStr, PAYLOAD_RADIX);
    const unpacked = unpack(payload);

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

    return { version: 1, ...unpacked };
  }
```

Also update the method's own doc comment (currently `@throws {Error} If the key string is malformed or has an unknown version.`) to add a second line: `@throws {Error} If the key unpacks to a semantically invalid pivotBlockSize or rotation sequence index.`

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest key-codec.spec.ts`
Expected: PASS (all existing tests plus the 2 new ones - do not guess the existing count, read the file's current test total and add 2).

- [ ] **Step 5: Remove the now-redundant guard from `EncodeService`**

Modify `backend/src/api/encode.service.ts`. Remove this block (currently right after the `KeyCodec.decode()` call inside the `if (dto.key)` branch):

```typescript
      if (!keyParams.rotationSequence || keyParams.pivotBlockSize < 1) {
        throw new BadRequestException(
          `Invalid key format: "${dto.key}" (unpacks to an unusable pivot block size or rotation sequence)`,
        );
      }
```

The surrounding `try { keyParams = KeyCodec.decode(dto.key); } catch (err) { throw new BadRequestException((err as Error).message); }` stays exactly as it is - `KeyCodec.decode()` now throws for these cases itself, and this existing catch already converts that to `BadRequestException`.

- [ ] **Step 6: Deduplicate `READING_ORDERS` in `EncodeRequestDto`**

Modify `backend/src/api/dto/encode-request.dto.ts`. Remove the private local array (lines 16-25):

```typescript
const READING_ORDERS = [
  'LR-TB',
  'RL-TB',
  'TB-LR',
  'BT-LR',
  'LR-TB-ALT',
  'RL-TB-ALT',
  'TB-LR-ALT',
  'BT-LR-ALT',
];
```

Add an import instead: `import { READING_ORDERS } from '../../key/key-codec';` (path relative to `backend/src/api/dto/` - `key-codec.ts` lives at `backend/src/key/key-codec.ts`). Everything else in this file (the `@IsIn(READING_ORDERS)` usage) stays unchanged - it now references the imported constant instead of the local one.

- [ ] **Step 7: Run the full backend suite (both runners) and lint**

Run: `cd backend && npm run test && npm run test:e2e && npx eslint src/key src/api`
Expected: `npm run test` passes with no regression (count will be 2 higher than the current baseline, from Step 4's new `key-codec.spec.ts` tests - read the actual current total before this task with `npm run test` and report the exact before/after numbers, do not guess). `npm run test:e2e` passes unchanged (29/29, this task does not touch anything in `backend/test/`). eslint clean.

- [ ] **Step 8: Commit**

```bash
git add backend/src/key/key-codec.ts backend/src/key/key-codec.spec.ts backend/src/api/encode.service.ts backend/src/api/dto/encode-request.dto.ts
git commit -m "$(cat <<'EOF'
fix(key): harden KeyCodec.decode against out-of-range payload values

Modified files:
- backend/src/key/key-codec.ts - decode() now throws for pivotBlockSize=0 or an out-of-range rotation sequence index instead of silently returning unusable data; export READING_ORDERS
- backend/src/key/key-codec.spec.ts - tests for both hardened decode() error cases
- backend/src/api/encode.service.ts - remove the now-redundant guard, decode()'s own throw plus the existing catch already produce the same BadRequestException
- backend/src/api/dto/encode-request.dto.ts - import the shared READING_ORDERS from key-codec.ts instead of maintaining a duplicate copy
EOF
)"
```

---

### Task 2: `KeyController`, `KeyService`, and both request DTOs

**Files:**
- Create: `backend/src/api/dto/key-generate-request.dto.ts`
- Create: `backend/src/api/dto/key-parse-query.dto.ts`
- Create: `backend/src/api/key.service.ts`
- Test: `backend/src/api/key.service.spec.ts`
- Create: `backend/src/api/key.controller.ts`
- Modify: `backend/src/api/api.module.ts`

**Interfaces:**
- Consumes: `READING_ORDERS`, `KeyCodec`, `KeyParams`, `RotationSequence` (all from Task 1's `key-codec.ts`, already committed).
- Produces: `KeyController` (registers `POST /key/generate`, `GET /key/parse`, served at `/api/key/...` via the existing global prefix from FEAT-011), `KeyService` (methods `generate(dto): { key: string }` and `parse(key: string): KeyParseResult`), `KeyParseResult` interface, both request DTOs.

- [ ] **Step 1: Write the failing tests**

`backend/src/api/key.service.spec.ts`:

```typescript
import { BadRequestException } from '@nestjs/common';
import { KeyService } from './key.service';
import { KeyGenerateRequestDto } from './dto/key-generate-request.dto';
import { KeyCodec } from '../key/key-codec';

describe('KeyService', () => {
  const service = new KeyService();

  describe('generate', () => {
    it('returns a valid HR key string for a fully specified parameter set', () => {
      const dto: KeyGenerateRequestDto = {
        pivotBlockSize: 7,
        rotationSequence: [3, 2, 1, 0],
        rotationDirection: 'ccw',
        readingOrder: 'RL-TB',
      };
      const result = service.generate(dto);
      expect(result.key).toMatch(/^HR1·[0-9A-Z]{4}$/);
      const decoded = KeyCodec.decode(result.key);
      expect(decoded.pivotBlockSize).toBe(7);
      expect(decoded.rotationSequence).toEqual([3, 2, 1, 0]);
      expect(decoded.rotationDirection).toBe('ccw');
      expect(decoded.readingOrder).toBe('RL-TB');
    });

    it('returns a valid HR key string with default parameters when no body is provided', () => {
      const result = service.generate({} as KeyGenerateRequestDto);
      expect(result.key).toMatch(/^HR1·[0-9A-Z]{4}$/);
      const decoded = KeyCodec.decode(result.key);
      expect(decoded.pivotBlockSize).toBe(5);
      expect(decoded.rotationSequence).toEqual([0, 1, 2, 3]);
      expect(decoded.rotationDirection).toBe('cw');
      expect(decoded.readingOrder).toBe('LR-TB');
    });

    it.each([
      'LR-TB',
      'RL-TB',
      'TB-LR',
      'BT-LR',
      'LR-TB-ALT',
      'RL-TB-ALT',
      'TB-LR-ALT',
      'BT-LR-ALT',
    ])('returns a valid HR key string for reading order %s', (readingOrder) => {
      const result = service.generate({ readingOrder } as KeyGenerateRequestDto);
      const decoded = KeyCodec.decode(result.key);
      expect(decoded.readingOrder).toBe(readingOrder);
    });

    it.each(['cw', 'ccw'] as const)(
      'returns a valid HR key string for rotation direction %s',
      (rotationDirection) => {
        const result = service.generate({ rotationDirection } as KeyGenerateRequestDto);
        const decoded = KeyCodec.decode(result.key);
        expect(decoded.rotationDirection).toBe(rotationDirection);
      },
    );

    it('throws BadRequestException when the provided rotationSequence is not a valid permutation', () => {
      const dto = { rotationSequence: [0, 0, 1, 2] } as KeyGenerateRequestDto;
      expect(() => service.generate(dto)).toThrow(BadRequestException);
    });
  });

  describe('parse', () => {
    it('returns all decoded params for a valid HR key', () => {
      const key = KeyCodec.encode({
        version: 1,
        pivotBlockSize: 5,
        rotationSequence: [0, 1, 2, 3],
        rotationDirection: 'cw',
        readingOrder: 'LR-TB',
      });
      const result = service.parse(key);
      expect(result.pivotBlockSize).toBe(5);
      expect(result.rotationSequence).toEqual([0, 90, 180, 270]);
      expect(result.rotationDirection).toBe('cw');
      expect(result.readingOrder).toBe('LR-TB');
    });

    it('returns the correct rotationSequence as an array of angles for a non-identity sequence', () => {
      const key = KeyCodec.encode({
        version: 1,
        pivotBlockSize: 5,
        rotationSequence: [3, 1, 0, 2],
        rotationDirection: 'cw',
        readingOrder: 'LR-TB',
      });
      const result = service.parse(key);
      expect(result.rotationSequence).toEqual([270, 90, 0, 180]);
    });

    it('throws BadRequestException for a malformed key string', () => {
      expect(() => service.parse('not-a-key')).toThrow(BadRequestException);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest key.service.spec.ts`
Expected: FAIL with "Cannot find module './key.service'" (and `'./dto/key-generate-request.dto'`)

- [ ] **Step 3: Implement the two request DTOs**

`backend/src/api/dto/key-generate-request.dto.ts`:

```typescript
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsIn,
} from 'class-validator';
import { READING_ORDERS } from '../../key/key-codec';

/**
 * Request body for POST /key/generate. Every field is independently
 * optional - any field left out gets its own fixed default, applied in
 * KeyService.generate(). Unlike POST /encode's DTO, there is no key/params
 * branching here - this endpoint's whole job is producing a key.
 */
export class KeyGenerateRequestDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(255)
  pivotBlockSize?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(3, { each: true })
  rotationSequence?: number[];

  @IsOptional()
  @IsIn(['cw', 'ccw'])
  rotationDirection?: 'cw' | 'ccw';

  @IsOptional()
  @IsIn(READING_ORDERS)
  readingOrder?: string;
}
```

`backend/src/api/dto/key-parse-query.dto.ts`:

```typescript
import { IsString, IsNotEmpty } from 'class-validator';

/** Query params for GET /key/parse. */
export class KeyParseQueryDto {
  @IsString()
  @IsNotEmpty()
  key!: string;
}
```

- [ ] **Step 4: Implement `KeyService`**

`backend/src/api/key.service.ts`:

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { KeyCodec, KeyParams, RotationSequence } from '../key/key-codec';
import { KeyGenerateRequestDto } from './dto/key-generate-request.dto';

const DEFAULT_PIVOT_BLOCK_SIZE = 5;
const DEFAULT_ROTATION_SEQUENCE: RotationSequence = [0, 1, 2, 3];
const DEFAULT_ROTATION_DIRECTION: 'cw' | 'ccw' = 'cw';
const DEFAULT_READING_ORDER: KeyParams['readingOrder'] = 'LR-TB';

/** Response shape for GET /key/parse. */
export interface KeyParseResult {
  pivotBlockSize: number;
  rotationSequence: number[];
  rotationDirection: 'cw' | 'ccw';
  readingOrder: string;
}

@Injectable()
export class KeyService {
  generate(dto: KeyGenerateRequestDto): { key: string } {
    const keyParams: KeyParams = {
      version: 1,
      pivotBlockSize: dto.pivotBlockSize ?? DEFAULT_PIVOT_BLOCK_SIZE,
      rotationSequence:
        (dto.rotationSequence as RotationSequence) ?? DEFAULT_ROTATION_SEQUENCE,
      rotationDirection: dto.rotationDirection ?? DEFAULT_ROTATION_DIRECTION,
      readingOrder:
        (dto.readingOrder as KeyParams['readingOrder']) ?? DEFAULT_READING_ORDER,
    };

    try {
      return { key: KeyCodec.encode(keyParams) };
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
  }

  parse(key: string): KeyParseResult {
    let keyParams: KeyParams;
    try {
      keyParams = KeyCodec.decode(key);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    return {
      pivotBlockSize: keyParams.pivotBlockSize,
      rotationSequence: keyParams.rotationSequence.map((index) => index * 90),
      rotationDirection: keyParams.rotationDirection,
      readingOrder: keyParams.readingOrder,
    };
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npx jest key.service.spec.ts`
Expected: PASS (16 tests: `generate` has 1 fully-specified + 1 defaults + 8 reading orders (`it.each`) + 2 rotation directions (`it.each`) + 1 invalid-permutation error = 13; `parse` has 3 = 16 total).

- [ ] **Step 6: Implement `KeyController`**

`backend/src/api/key.controller.ts`:

```typescript
import { Controller, Post, Get, Body, Query, HttpCode } from '@nestjs/common';
import { KeyService, KeyParseResult } from './key.service';
import { KeyGenerateRequestDto } from './dto/key-generate-request.dto';
import { KeyParseQueryDto } from './dto/key-parse-query.dto';

@Controller('key')
export class KeyController {
  constructor(private readonly keyService: KeyService) {}

  @Post('generate')
  @HttpCode(200)
  generate(@Body() dto: KeyGenerateRequestDto): { key: string } {
    return this.keyService.generate(dto);
  }

  @Get('parse')
  parse(@Query() query: KeyParseQueryDto): KeyParseResult {
    return this.keyService.parse(query.key);
  }
}
```

- [ ] **Step 7: Wire `ApiModule`**

Modify `backend/src/api/api.module.ts` to add `KeyController` and `KeyService` alongside the existing `EncodeController`/`EncodeService` (do not remove or reorder the existing entries):

```typescript
import { Module } from '@nestjs/common';
import { AlphabetModule } from '../alphabet/alphabet.module';
import { RotationModule } from '../rotation/rotation.module';
import { RendererModule } from '../renderer/renderer.module';
import { EncodeController } from './encode.controller';
import { EncodeService } from './encode.service';
import { KeyController } from './key.controller';
import { KeyService } from './key.service';

@Module({
  imports: [AlphabetModule, RotationModule, RendererModule],
  controllers: [EncodeController, KeyController],
  providers: [EncodeService, KeyService],
})
export class ApiModule {}
```

- [ ] **Step 8: Run the full backend suite and lint**

Run: `cd backend && npm run test && npx eslint src/api`
Expected: all tests pass (Task 1's post-fix total + however many `key.service.spec.ts` actually has, per Step 5's real count), eslint clean.

- [ ] **Step 9: Commit**

```bash
git add backend/src/api/dto/key-generate-request.dto.ts backend/src/api/dto/key-parse-query.dto.ts backend/src/api/key.service.ts backend/src/api/key.service.spec.ts backend/src/api/key.controller.ts backend/src/api/api.module.ts
git commit -m "$(cat <<'EOF'
feat(api): implement KeyController and KeyService for key generate/parse

Modified files:
- backend/src/api/dto/key-generate-request.dto.ts - all fields independently optional, imports the shared READING_ORDERS
- backend/src/api/dto/key-parse-query.dto.ts - required non-empty key query param
- backend/src/api/key.service.ts - generate() applies per-field defaults then KeyCodec.encode, parse() calls KeyCodec.decode and converts rotation indices to angles
- backend/src/api/key.service.spec.ts - unit tests for both methods, all documented default/param/error cases
- backend/src/api/key.controller.ts - POST /key/generate (HttpCode 200), GET /key/parse
- backend/src/api/api.module.ts - register KeyController/KeyService alongside the existing Encode ones
EOF
)"
```

---

### Task 3: Full HTTP e2e test suite

**Files:**
- Create: `backend/test/key.e2e-spec.ts`

**Interfaces:**
- Consumes: `ApiModule` (Task 2, already committed), `HexahueAlphabet`, `MockAlphabet` (existing shared double), `KeyCodec` (for constructing known-good test keys).

- [ ] **Step 1: Write the e2e tests**

`backend/test/key.e2e-spec.ts`:

```typescript
jest.mock('../src/prisma/prisma.service', () => ({
  PrismaService: class MockPrismaService {},
}));

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ApiModule } from '../src/api/api.module';
import { HexahueAlphabet } from '../src/alphabet/hexahue-alphabet.service';
import { MockAlphabet } from './utils/mock-alphabet';
import { MALFORMED_KEY_STRINGS } from './fixtures/api.fixtures';

describe('Key endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ApiModule],
    })
      .overrideProvider(HexahueAlphabet)
      .useValue(new MockAlphabet())
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/key/generate', () => {
    it('returns 200 with a valid HR key string for a fully specified parameter set', async () => {
      const res = await request(app.getHttpServer()).post('/api/key/generate').send({
        pivotBlockSize: 7,
        rotationSequence: [0, 1, 2, 3],
        rotationDirection: 'cw',
        readingOrder: 'LR-TB',
      });
      expect(res.status).toBe(200);
      expect(res.body.key).toMatch(/^HR1·[0-9A-Z]{4}$/);
    });

    it('returns 200 with a valid HR key string when no body is provided', async () => {
      const res = await request(app.getHttpServer()).post('/api/key/generate').send({});
      expect(res.status).toBe(200);
      expect(res.body.key).toMatch(/^HR1·[0-9A-Z]{4}$/);
    });

    it.each([
      'LR-TB',
      'RL-TB',
      'TB-LR',
      'BT-LR',
      'LR-TB-ALT',
      'RL-TB-ALT',
      'TB-LR-ALT',
      'BT-LR-ALT',
    ])('returns 200 with a valid HR key string for reading order %s', async (readingOrder) => {
      const res = await request(app.getHttpServer())
        .post('/api/key/generate')
        .send({ readingOrder });
      expect(res.status).toBe(200);
      expect(res.body.key).toMatch(/^HR1·[0-9A-Z]{4}$/);
    });

    it.each(['cw', 'ccw'])(
      'returns 200 with a valid HR key string for rotation direction %s',
      async (rotationDirection) => {
        const res = await request(app.getHttpServer())
          .post('/api/key/generate')
          .send({ rotationDirection });
        expect(res.status).toBe(200);
        expect(res.body.key).toMatch(/^HR1·[0-9A-Z]{4}$/);
      },
    );

    it('returns 400 when rotationDirection is an invalid value', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/key/generate')
        .send({ rotationDirection: 'sideways' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when readingOrder is an unknown value', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/key/generate')
        .send({ readingOrder: 'DIAGONAL' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when pivotBlockSize is not a positive integer', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/key/generate')
        .send({ pivotBlockSize: 0 });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/key/parse', () => {
    it('returns 200 with all decoded params for a valid HR key', async () => {
      const generateRes = await request(app.getHttpServer())
        .post('/api/key/generate')
        .send({
          pivotBlockSize: 5,
          rotationSequence: [0, 1, 2, 3],
          rotationDirection: 'cw',
          readingOrder: 'LR-TB',
        });
      const key = generateRes.body.key as string;

      const res = await request(app.getHttpServer())
        .get('/api/key/parse')
        .query({ key });

      expect(res.status).toBe(200);
      expect(res.body.pivotBlockSize).toBe(5);
      expect(res.body.rotationSequence).toEqual([0, 90, 180, 270]);
      expect(res.body.rotationDirection).toBe('cw');
      expect(res.body.readingOrder).toBe('LR-TB');
    });

    it('returns 400 for a malformed key string', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/key/parse')
        .query({ key: 'not-a-key' });
      expect(res.status).toBe(400);
    });

    it.each(MALFORMED_KEY_STRINGS.filter((k) => k !== ''))(
      'returns 400 for malformed key: %s',
      async (malformedKey) => {
        const res = await request(app.getHttpServer())
          .get('/api/key/parse')
          .query({ key: malformedKey });
        expect(res.status).toBe(400);
      },
    );

    it('returns 400 for an empty key query param', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/key/parse')
        .query({ key: '' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when the key query param is missing', async () => {
      const res = await request(app.getHttpServer()).get('/api/key/parse');
      expect(res.status).toBe(400);
    });
  });

  describe('round-trip', () => {
    it('generates a key and parses it back to recover the original params without data loss', async () => {
      const requestBody = {
        pivotBlockSize: 11,
        rotationSequence: [2, 0, 3, 1],
        rotationDirection: 'ccw',
        readingOrder: 'BT-LR-ALT',
      };

      const generateRes = await request(app.getHttpServer())
        .post('/api/key/generate')
        .send(requestBody);
      const key = generateRes.body.key as string;

      const parseRes = await request(app.getHttpServer())
        .get('/api/key/parse')
        .query({ key });

      expect(parseRes.status).toBe(200);
      expect(parseRes.body.pivotBlockSize).toBe(requestBody.pivotBlockSize);
      expect(parseRes.body.rotationSequence).toEqual(
        requestBody.rotationSequence.map((i) => i * 90),
      );
      expect(parseRes.body.rotationDirection).toBe(requestBody.rotationDirection);
      expect(parseRes.body.readingOrder).toBe(requestBody.readingOrder);
    });
  });
});
```

Note: `MALFORMED_KEY_STRINGS` (from `backend/test/fixtures/api.fixtures.ts`, FEAT-011) includes an empty string `''` as its first entry - this plan's suite already has its own dedicated "empty key query param" test with the correct 400-via-missing-required-field semantics for `GET`, so the `it.each` over `MALFORMED_KEY_STRINGS` filters that entry out to avoid an exact duplicate test case (an empty-string malformed-key case and an empty-string-query-param case are conceptually the same assertion for this endpoint, unlike for `POST /encode` where the empty string took a meaningfully different code path).

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd backend && npm run test:e2e`
Expected: PASS. Count precisely from the actual file: `POST /api/key/generate` (2 named + 8 reading-order `it.each` + 2 direction `it.each` + 3 named validation = 15) + `GET /api/key/parse` (2 named + 6 malformed-key `it.each` (`MALFORMED_KEY_STRINGS` currently has 7 entries; filtering out the empty string leaves 6) + 1 named empty + 1 named missing = 10) + `round-trip` (1) = 26 new tests in this file, plus the existing `encode.e2e-spec.ts` (28) and `app.e2e-spec.ts` (1) = 55 total across all e2e suites. Recount precisely against the actual files before reporting - do not guess.

- [ ] **Step 3: Run the full backend suite (both runners) and lint**

Run: `cd backend && npm run test && npm run test:e2e && npx eslint test`
Expected: `npm run test` unchanged from Task 2's final count (this task only adds an e2e file). `npm run test:e2e` passes per Step 2. eslint clean.

- [ ] **Step 4: Commit**

```bash
git add backend/test/key.e2e-spec.ts
git commit -m "$(cat <<'EOF'
test(api): add full HTTP-level test suite for key generate/parse endpoints

Modified files:
- backend/test/key.e2e-spec.ts - POST /key/generate and GET /key/parse over the real HTTP stack, mocked alphabet (no database), plus a generate-then-parse round-trip test
EOF
)"
```

---

## After this plan

FEAT-012 (`POST /decode`) remains the next feature with an open design question (message-boundary detection without a header, since FEAT-009's security decision holds). FEAT-013's `KeyCodec.decode()` hardening (Task 1) benefits FEAT-012 too - any decode call FEAT-012 makes now gets the same out-of-range protection for free. `docs/tests/frontend.md`/FEAT-014+ (Vue frontend) can start consuming a fully key-complete backend API surface (`POST /encode`, `POST /key/generate`, `GET /key/parse`) once this plan merges - only `POST /decode` remains before the V1 backend API surface is complete.
