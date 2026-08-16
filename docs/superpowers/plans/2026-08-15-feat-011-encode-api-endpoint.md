# FEAT-011 Encode API Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `POST /api/encode`, the first HTTP endpoint in this project: accepts a message plus either a pre-built HR key or individual encoding parameters, runs the full cipher pipeline (preprocess -> buildGrid -> RotationEngine -> PngRenderer + SvgRenderer), and returns both image formats plus the key used, any weakness warnings, and any unknown characters.

**Architecture:** A thin `EncodeController` (`@Post()`, forced to `@HttpCode(200)` since NestJS's default for `@Post()` is 201) delegates to `EncodeService`, which orchestrates every domain module already built (FEAT-001 through FEAT-010) - no new cipher/rendering logic, purely wiring. Request validation is declarative via `class-validator` decorators on `EncodeRequestDto`, enforced by a global `ValidationPipe` (`whitelist: true, forbidNonWhitelisted: true, transform: true`) added to `main.ts` for the first time in this project, alongside a global `/api` route prefix (already documented in `CLAUDE.md` as the project's convention but never actually wired up until now).

**Tech Stack:** NestJS 11, TypeScript strict, Jest, `class-validator` + `class-transformer` (new dependencies), `supertest` (already a devDependency, unused until now).

**Spec:** `docs/tests/api.md` section 1 (`POST /encode`) is the binding test contract. `BACKLOG.md` FEAT-011 is the acceptance-criteria source.

## Test strategy decision (confirmed with the user before this plan was written)

`docs/tests/api.md` describes all of its tests as requiring "a seeded PostgreSQL test database." Investigation during planning found that the *full* database-backed suite matching that document's literal bullets across all three API features is actually owned by a separate, not-yet-started backlog item, **TEST-002** (`status: backlog`, depends on FEAT-011, FEAT-012, FEAT-013, TEST-001, **and CI-003** - the CI item that presumably resolves `docs/tests/index.md`'s open "Postgres in CI, pending confirmation from project owner" point). FEAT-011 itself does not need a live database: its own acceptance criteria are about endpoint behavior, not test methodology, and TEST-002's acceptance criteria ("all tests pass against a real test database") only make sense as a *later, additional* pass once a real DB is available in CI.

**Confirmed approach:** this plan implements essentially all of `docs/tests/api.md` section 1's bullets (happy path, weakness warning, unknown characters, validation errors) using a **mocked/in-memory alphabet** (the already-existing shared `MockAlphabet` test double from `backend/test/utils/mock-alphabet.ts`, TEST-004), substituted for the real, database-backed `HexahueAlphabet` via NestJS's `overrideProvider().useValue()` in a `TestingModule`. This gives full HTTP-level confidence (real `ValidationPipe`, real routing, real DTO transformation, real status codes) without touching Postgres. TEST-002 remains responsible for later re-running an equivalent suite against the real `HexahueAlphabet`/database once CI-003 lands - do not treat this plan's tests as satisfying TEST-002's own acceptance criteria.

## Global Constraints

- TypeScript strict mode, no implicit any.
- English code, comments, commit messages. No em dash, en dash, or curly quotes anywhere - plain ASCII punctuation only (hard house rule; violated repeatedly during the FEAT-009/FEAT-010 branches, check every file including markdown with extra care).
- Conventional Commits with a mandatory "Modified files:" list on every commit.
- **`app.setGlobalPrefix('api')` and a global `ValidationPipe` are added to `backend/src/main.ts` for the first time in this project.** `CLAUDE.md` already documents "/api" as the project's routing convention; this plan is what actually implements it. `EncodeController` itself is decorated `@Controller('encode')` (no `/api` in the decorator) - the prefix is applied globally, not per-controller.
- **`ValidationPipe` config: `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.** `whitelist`+`forbidNonWhitelisted` together satisfy the "DTO validation rejects extra fields (strict DTO)" acceptance criterion. `transform: true` is enabled for forward compatibility with FEAT-013's future `GET /key/parse` query-param coercion needs, even though it has no effect on this JSON-body-only endpoint.
- **`@Post() @HttpCode(200)` on the controller method is mandatory, not optional.** NestJS defaults `@Post()` to a 201 status code; `docs/tests/api.md` explicitly requires 200 on every success bullet. Missing this decorator is a common, easy-to-miss mistake - the task reviewer must specifically check for it.
- **Individual encoding params (`pivotBlockSize`, `rotationSequence`, `rotationDirection`, `readingOrder`) are validated as required ONLY when `key` is absent**, via `class-validator`'s `@ValidateIf(o => !o.key)`. When `key` is present, these fields are not validated and are ignored entirely by the service, matching `BACKLOG.md`'s "if provided, individual params are ignored" and `docs/tests/api.md`'s "it uses the provided key and ignores individual params when key is present." This project deliberately does **not** implement "sensible defaults" for missing individual params (unlike `FEAT-013`'s `POST /key/generate`, which explicitly owns that behavior for a different endpoint, not yet built) - if `key` is absent, all four fields are genuinely required.
- **`size` defaults to `'medium'` when omitted**, independently of the key/individual-params branch (it is never part of the key encoding). No other case size default is documented anywhere in the project; `'medium'` is a straightforward, defensible middle choice.
- **`overrideWeaknessWarning` defaults to `false`** when omitted, matching `validateParams`'s own default parameter.
- **Weakness validation runs on the resolved `pivotBlockSize`** (whether it came from a decoded key or from individual params) - the warning is about the resulting cryptogram's strength, not about how the parameter was sourced.
- **`RangeError`s from `buildGrid`/`RotationEngine` are not separately caught and converted to `BadRequestException` in this plan.** `EncodeRequestDto`'s own `@IsInt() @Min(1)` on `pivotBlockSize` already fully covers the only case that could trigger such an error (see `docs/tests/cipher.md` section 4's own guard: `pivotBlockSize` must be a positive integer) - do not add a redundant defense-in-depth try/catch around the pipeline call; it is genuinely unreachable given upstream DTO validation and this plan is not adding a test for it.
- **`KeyCodec.decode()`'s and `KeyCodec.encode()`'s thrown `Error`s ARE caught in `EncodeService`** and rethrown as `BadRequestException` (with the original message) - these are the one place a malformed/invalid value can reach domain code that throws a plain `Error` rather than something DTO validation already rejects (a structurally key-shaped-but-semantically-invalid string, e.g. an unknown reading order encoded in an otherwise well-formed key, is not something `class-validator` can catch at the DTO level).
- **A gap found in the already-shipped `KeyCodec.decode()` (FEAT-004, out of scope to fix here) is guarded against in `EncodeService` instead.** The key payload packs a 5-bit `rotationSequenceIndex` (values 0-31) but only 24 of those values map to a real permutation in `ROTATION_SEQUENCES` (indices 0-23) - a structurally well-formed key whose payload happens to unpack to index 24-31 (e.g. `"HR1·ZZZZ"`, the maximum base36 payload) makes `KeyCodec.decode()` return `rotationSequence: undefined` without throwing at all. Left unguarded, this would reach `RotationEngine.encode()` and crash with an uncaught error (500), not the clean 400 this endpoint's own acceptance criteria require for "key is provided but malformed." `EncodeService` checks `!keyParams.rotationSequence` immediately after a successful `KeyCodec.decode()` call and throws `BadRequestException` if it is falsy. This is a narrow, file-local fix scoped to what FEAT-011 itself needs (a clean 400 for every malformed-key shape) - it does not touch `key-codec.ts` itself, and does not attempt to fix `KeyCodec.decode()`'s underlying looseness for other callers.
- **Following `docs/tests/api.md`'s own specified fixture path (`test/fixtures/api.fixtures.ts`, under `backend/test/`, not `backend/src/`), this plan puts the full HTTP-level test suite in `backend/test/encode.e2e-spec.ts`**, run via the project's pre-existing but so-far-unused `npm run test:e2e` script (`backend/test/jest-e2e.json`) - not `backend/src/api/*.spec.ts` under the main `npm run test` runner. This is a deliberate deviation from the `src/`-colocated test convention used by every prior domain (cipher/rotation/renderer): those are unit/integration tests of pure business logic, this is the project's first full HTTP-request-to-response test, which is exactly what NestJS's own e2e convention (and this project's already-configured, never-yet-used `jest-e2e.json`) exists for. Both `npm run test` and `npm run test:e2e` must be run and reported for this plan's final task.
- **`EncodeService` injects the concrete `HexahueAlphabet` class** (not an abstract `VisualAlphabet` token) - matching `AlphabetModule`'s existing, already-shipped provider registration (`providers: [HexahueAlphabet], exports: [HexahueAlphabet]`). Introducing an abstract injection token is out of scope for this plan. Tests substitute `MockAlphabet` via `Test.createTestingModule(...).overrideProvider(HexahueAlphabet).useValue(mockAlphabetInstance)`, which is a standard, fully-supported NestJS testing pattern regardless of the concrete-class injection - the real `HexahueAlphabet` (and therefore its own `PrismaService` dependency) is never constructed when overridden this way, so no database connection is ever attempted by these tests.
- **`KeyCodec`'s methods are all `static`** (`KeyCodec.encode(...)`, `KeyCodec.decode(...)`) - call them as static methods via a plain import (`import { KeyCodec } from '../key/key-codec'`), do not inject `KeyCodec` via the constructor even though `KeyModule` registers it as a provider (pre-existing, unrelated to this plan - that registration is effectively unused by static-only consumers).
- `docs/tests/api.md`'s Fixtures section references "`VALID_KEY_STRING` - a pre-computed valid HR key string (matches DEFAULT_KEY_PARAMS from key.fixtures.ts)" - no `key.fixtures.ts` or `DEFAULT_KEY_PARAMS` exists anywhere in the codebase (verified during planning). This plan computes `VALID_KEY_STRING` directly via `KeyCodec.encode(...)` inside `api.fixtures.ts` instead of chasing a nonexistent external fixture - the doc's cross-reference is stale.

---

### Task 1: NestJS app setup and `EncodeRequestDto`

**Files:**
- Modify: `backend/src/main.ts`
- Create: `backend/src/api/dto/encode-request.dto.ts`
- Test: `backend/src/api/dto/encode-request.dto.spec.ts`
- Modify: `backend/package.json` (adds `class-validator`, `class-transformer` dependencies via `npm install`)

**Interfaces:**
- Produces: `EncodeRequestDto` class, exported from `backend/src/api/dto/encode-request.dto.ts`, consumed by Task 2's `EncodeService` and Task 3's `EncodeController`.

- [ ] **Step 1: Install class-validator and class-transformer**

Run: `cd backend && npm install class-validator class-transformer`
Expected: both added to `dependencies` in `backend/package.json` and `backend/package-lock.json` updated. Both ship their own TypeScript types.

- [ ] **Step 2: Write the failing DTO validation tests**

`backend/src/api/dto/encode-request.dto.spec.ts`:

```typescript
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EncodeRequestDto } from './encode-request.dto';

async function validateBody(body: Record<string, unknown>) {
  const dto = plainToInstance(EncodeRequestDto, body);
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
}

const VALID_PARAMS_BODY = {
  message: 'ABC',
  pivotBlockSize: 5,
  rotationSequence: [0, 1, 2, 3],
  rotationDirection: 'cw',
  readingOrder: 'LR-TB',
};

describe('EncodeRequestDto', () => {
  describe('valid bodies', () => {
    it('passes with a fully specified individual-params body', async () => {
      const errors = await validateBody(VALID_PARAMS_BODY);
      expect(errors).toHaveLength(0);
    });

    it('passes with only message and key (individual params omitted)', async () => {
      const errors = await validateBody({ message: 'ABC', key: 'HR1.0000' });
      expect(errors).toHaveLength(0);
    });

    it('passes with size and overrideWeaknessWarning provided', async () => {
      const errors = await validateBody({
        ...VALID_PARAMS_BODY,
        size: 'large',
        overrideWeaknessWarning: true,
      });
      expect(errors).toHaveLength(0);
    });

    it.each(['small', 'medium', 'large'])(
      'accepts size value %s',
      async (size) => {
        const errors = await validateBody({ ...VALID_PARAMS_BODY, size });
        expect(errors).toHaveLength(0);
      },
    );
  });

  describe('message validation', () => {
    it('fails when message is missing', async () => {
      const { message, ...rest } = VALID_PARAMS_BODY;
      void message;
      const errors = await validateBody(rest);
      expect(errors.some((e) => e.property === 'message')).toBe(true);
    });

    it('fails when message is an empty string', async () => {
      const errors = await validateBody({ ...VALID_PARAMS_BODY, message: '' });
      expect(errors.some((e) => e.property === 'message')).toBe(true);
    });
  });

  describe('individual params required only when key is absent', () => {
    it('fails when pivotBlockSize is missing and no key is provided', async () => {
      const { pivotBlockSize, ...rest } = VALID_PARAMS_BODY;
      void pivotBlockSize;
      const errors = await validateBody(rest);
      expect(errors.some((e) => e.property === 'pivotBlockSize')).toBe(true);
    });

    it('does not require pivotBlockSize when key is provided', async () => {
      const errors = await validateBody({ message: 'ABC', key: 'HR1.0000' });
      expect(errors.some((e) => e.property === 'pivotBlockSize')).toBe(false);
    });

    it('fails when rotationDirection is not cw or ccw (no key provided)', async () => {
      const errors = await validateBody({
        ...VALID_PARAMS_BODY,
        rotationDirection: 'sideways',
      });
      expect(errors.some((e) => e.property === 'rotationDirection')).toBe(true);
    });

    it('does not validate rotationDirection when key is provided', async () => {
      const errors = await validateBody({
        message: 'ABC',
        key: 'HR1.0000',
        rotationDirection: 'sideways',
      });
      expect(errors.some((e) => e.property === 'rotationDirection')).toBe(false);
    });

    it('fails when readingOrder is not a known value (no key provided)', async () => {
      const errors = await validateBody({
        ...VALID_PARAMS_BODY,
        readingOrder: 'DIAGONAL',
      });
      expect(errors.some((e) => e.property === 'readingOrder')).toBe(true);
    });

    it('fails when rotationSequence does not have exactly 4 entries', async () => {
      const errors = await validateBody({
        ...VALID_PARAMS_BODY,
        rotationSequence: [0, 1, 2],
      });
      expect(errors.some((e) => e.property === 'rotationSequence')).toBe(true);
    });
  });

  describe('other fields', () => {
    it('fails when size is not small, medium, or large', async () => {
      const errors = await validateBody({ ...VALID_PARAMS_BODY, size: 'huge' });
      expect(errors.some((e) => e.property === 'size')).toBe(true);
    });

    it('fails when extra fields are present (strict DTO)', async () => {
      const errors = await validateBody({
        ...VALID_PARAMS_BODY,
        extraField: 'not allowed',
      });
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && npx jest encode-request.dto.spec.ts`
Expected: FAIL with "Cannot find module './encode-request.dto'"

- [ ] **Step 4: Implement `EncodeRequestDto`**

`backend/src/api/dto/encode-request.dto.ts`:

```typescript
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsIn,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsBoolean,
  ValidateIf,
} from 'class-validator';

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

/**
 * Request body for POST /encode. Either `key` is provided (individual
 * params below are ignored), or all four individual params are provided
 * (there is no "sensible defaults" fallback for this endpoint - that is
 * POST /key/generate's job, not implemented yet).
 */
export class EncodeRequestDto {
  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsString()
  key?: string;

  @ValidateIf((o: EncodeRequestDto) => !o.key)
  @IsInt()
  @Min(1)
  pivotBlockSize?: number;

  @ValidateIf((o: EncodeRequestDto) => !o.key)
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(3, { each: true })
  rotationSequence?: number[];

  @ValidateIf((o: EncodeRequestDto) => !o.key)
  @IsIn(['cw', 'ccw'])
  rotationDirection?: 'cw' | 'ccw';

  @ValidateIf((o: EncodeRequestDto) => !o.key)
  @IsIn(READING_ORDERS)
  readingOrder?: string;

  @IsOptional()
  @IsIn(['small', 'medium', 'large'])
  size?: 'small' | 'medium' | 'large';

  @IsOptional()
  @IsBoolean()
  overrideWeaknessWarning?: boolean;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npx jest encode-request.dto.spec.ts`
Expected: PASS (16 tests: 6 valid-body cases (3 named + 3 parametrized size values) + 2 message validation + 6 individual-params-required-only-when-no-key cases + 2 other-field cases)

- [ ] **Step 6: Add the global ValidationPipe and API prefix**

Modify `backend/src/main.ts` to:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
```

There is no test for `main.ts` itself (it is never imported by any spec file, matching the pre-existing project convention - `bootstrap()` only runs via `npm run start:dev`/`start:prod`). Task 3's e2e test replicates this exact `ValidationPipe` configuration and prefix directly in its own `TestingModule` setup, since `main.ts`'s bootstrap does not run in tests.

- [ ] **Step 7: Run the full backend suite and lint**

Run: `cd backend && npm run test && npx eslint src/api`
Expected: all tests pass (289 baseline + 16 new = 305), eslint clean.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main.ts backend/src/api/dto/encode-request.dto.ts backend/src/api/dto/encode-request.dto.spec.ts backend/package.json backend/package-lock.json
git commit -m "$(cat <<'EOF'
feat(api): add global ValidationPipe, API prefix, and EncodeRequestDto

Modified files:
- backend/src/main.ts - add app.setGlobalPrefix('api') and global ValidationPipe (whitelist, forbidNonWhitelisted, transform)
- backend/src/api/dto/encode-request.dto.ts - EncodeRequestDto with class-validator decorators, individual params required only when key is absent
- backend/src/api/dto/encode-request.dto.spec.ts - DTO validation tests covering all documented 400 cases plus the key/no-key branching
- backend/package.json, backend/package-lock.json - add class-validator and class-transformer dependencies
EOF
)"
```

---

### Task 2: `EncodeService`

**Files:**
- Create: `backend/src/api/encode.service.ts`
- Test: `backend/src/api/encode.service.spec.ts`

**Interfaces:**
- Consumes: `EncodeRequestDto` from Task 1; `HexahueAlphabet` (`backend/src/alphabet/hexahue-alphabet.service.ts`); `preprocess` (`backend/src/cipher/preprocess.ts`); `buildGrid` (`backend/src/cipher/build-grid.ts`); `validateParams` (`backend/src/validation/validate-params.ts`); `RotationEngine` (`backend/src/rotation/rotation-engine.ts`); `PngRenderer`, `SvgRenderer` (`backend/src/renderer/`); `KeyCodec`, `KeyParams`, `RotationSequence` (`backend/src/key/key-codec.ts`); `MockAlphabet` (`backend/test/utils/mock-alphabet.ts`) for this task's own tests only.
- Produces: `EncodeService` class and `EncodeResult` interface, both exported from `encode.service.ts`, consumed by Task 3's `EncodeController`.

- [ ] **Step 1: Write the failing tests**

`backend/src/api/encode.service.spec.ts`:

```typescript
import { BadRequestException } from '@nestjs/common';
import { EncodeService } from './encode.service';
import { EncodeRequestDto } from './dto/encode-request.dto';
import { RotationEngine } from '../rotation/rotation-engine';
import { ReadingOrderRegistry } from '../reading-order/reading-order.registry';
import { PngRenderer } from '../renderer/png-renderer';
import { SvgRenderer } from '../renderer/svg-renderer';
import { KeyCodec } from '../key/key-codec';
import { HexahueAlphabet } from '../alphabet/hexahue-alphabet.service';
import { MockAlphabet } from '../../test/utils/mock-alphabet';

function makeService(): EncodeService {
  const alphabet = new MockAlphabet();
  return new EncodeService(
    alphabet as unknown as HexahueAlphabet,
    new RotationEngine(new ReadingOrderRegistry()),
    new PngRenderer(),
    new SvgRenderer(),
  );
}

const VALID_PARAMS_DTO: EncodeRequestDto = {
  message: 'ABC',
  pivotBlockSize: 5,
  rotationSequence: [0, 1, 2, 3],
  rotationDirection: 'cw',
  readingOrder: 'LR-TB',
} as EncodeRequestDto;

describe('EncodeService', () => {
  describe('happy path', () => {
    it('returns a base64 png, an svg string, a key, empty warnings, and empty unknownChars for a clean message', async () => {
      const service = makeService();
      const result = await service.encode(VALID_PARAMS_DTO);

      expect(typeof result.png).toBe('string');
      expect(Buffer.from(result.png, 'base64').subarray(0, 4)).toEqual(
        Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      );
      expect(result.svg.startsWith('<svg')).toBe(true);
      expect(typeof result.key).toBe('string');
      expect(result.warnings).toEqual([]);
      expect(result.unknownChars).toEqual([]);
    });

    it('generates a key from individual params when no key field is provided', async () => {
      const service = makeService();
      const result = await service.encode(VALID_PARAMS_DTO);
      const decoded = KeyCodec.decode(result.key);
      expect(decoded.pivotBlockSize).toBe(5);
      expect(decoded.rotationSequence).toEqual([0, 1, 2, 3]);
      expect(decoded.rotationDirection).toBe('cw');
      expect(decoded.readingOrder).toBe('LR-TB');
    });

    it('uses the provided key and ignores individual params when key is present', async () => {
      const service = makeService();
      const key = KeyCodec.encode({
        version: 1,
        pivotBlockSize: 7,
        rotationSequence: [3, 2, 1, 0],
        rotationDirection: 'ccw',
        readingOrder: 'RL-TB',
      });
      const dto = { message: 'ABC', key } as EncodeRequestDto;

      const result = await service.encode(dto);
      expect(result.key).toBe(key);
    });

    it.each(['small', 'medium', 'large'] as const)(
      'encodes the message with size %s without error',
      async (size) => {
        const service = makeService();
        const result = await service.encode({ ...VALID_PARAMS_DTO, size });
        expect(result.png.length).toBeGreaterThan(0);
      },
    );
  });

  describe('weakness warning', () => {
    it('returns a non-empty warnings array when pivotBlockSize is weak', async () => {
      const service = makeService();
      const result = await service.encode({ ...VALID_PARAMS_DTO, pivotBlockSize: 3 });
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('does not block encoding when a weakness warning is present', async () => {
      const service = makeService();
      const result = await service.encode({ ...VALID_PARAMS_DTO, pivotBlockSize: 3 });
      expect(result.png.length).toBeGreaterThan(0);
    });

    it('returns an empty warnings array when overrideWeaknessWarning is true and pivotBlockSize is weak', async () => {
      const service = makeService();
      const result = await service.encode({
        ...VALID_PARAMS_DTO,
        pivotBlockSize: 3,
        overrideWeaknessWarning: true,
      });
      expect(result.warnings).toEqual([]);
    });
  });

  describe('unknown characters', () => {
    it('lists the unknown character for a message containing an unsupported symbol', async () => {
      const service = makeService();
      const result = await service.encode({ ...VALID_PARAMS_DTO, message: 'ABXYZ' });
      expect(result.unknownChars).toEqual(
        expect.arrayContaining(['X', 'Y', 'Z']),
      );
    });

    it('encodes the remaining supported characters when unknown chars are present', async () => {
      const service = makeService();
      const result = await service.encode({ ...VALID_PARAMS_DTO, message: 'ABXYZ' });
      expect(result.png.length).toBeGreaterThan(0);
    });
  });

  describe('errors', () => {
    it('throws BadRequestException when key is malformed', async () => {
      const service = makeService();
      const dto = { message: 'ABC', key: 'not-a-key' } as EncodeRequestDto;
      await expect(service.encode(dto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when key unpacks to an out-of-range rotation sequence index', async () => {
      const service = makeService();
      const dto = { message: 'ABC', key: 'HR1·ZZZZ' } as EncodeRequestDto;
      await expect(service.encode(dto)).rejects.toThrow(BadRequestException);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest encode.service.spec.ts`
Expected: FAIL with "Cannot find module './encode.service'"

- [ ] **Step 3: Implement `EncodeService`**

`backend/src/api/encode.service.ts`:

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { preprocess } from '../cipher/preprocess';
import { buildGrid } from '../cipher/build-grid';
import { validateParams } from '../validation/validate-params';
import { RotationEngine } from '../rotation/rotation-engine';
import { PngRenderer } from '../renderer/png-renderer';
import { SvgRenderer } from '../renderer/svg-renderer';
import { KeyCodec, KeyParams, RotationSequence } from '../key/key-codec';
import { HexahueAlphabet } from '../alphabet/hexahue-alphabet.service';
import { EncodeRequestDto } from './dto/encode-request.dto';

/** Response shape for POST /encode. */
export interface EncodeResult {
  png: string;
  svg: string;
  key: string;
  warnings: string[];
  unknownChars: string[];
}

@Injectable()
export class EncodeService {
  constructor(
    private readonly alphabet: HexahueAlphabet,
    private readonly rotationEngine: RotationEngine,
    private readonly pngRenderer: PngRenderer,
    private readonly svgRenderer: SvgRenderer,
  ) {}

  async encode(dto: EncodeRequestDto): Promise<EncodeResult> {
    let keyParams: KeyParams;
    let key: string;

    if (dto.key) {
      try {
        keyParams = KeyCodec.decode(dto.key);
      } catch (err) {
        throw new BadRequestException((err as Error).message);
      }
      if (!keyParams.rotationSequence) {
        throw new BadRequestException(
          `Invalid key format: "${dto.key}" (unpacks to an out-of-range rotation sequence index)`,
        );
      }
      key = dto.key;
    } else {
      keyParams = {
        version: 1,
        pivotBlockSize: dto.pivotBlockSize as number,
        rotationSequence: dto.rotationSequence as RotationSequence,
        rotationDirection: dto.rotationDirection as 'cw' | 'ccw',
        readingOrder: dto.readingOrder as KeyParams['readingOrder'],
      };
      try {
        key = KeyCodec.encode(keyParams);
      } catch (err) {
        throw new BadRequestException((err as Error).message);
      }
    }

    const validation = validateParams(
      keyParams.pivotBlockSize,
      this.alphabet,
      dto.overrideWeaknessWarning ?? false,
    );
    const warnings = validation.status === 'valid' ? [] : validation.warnings;

    const { text, unknownChars } = preprocess(dto.message, this.alphabet);
    const bodyGrid = buildGrid(text, this.alphabet, keyParams.pivotBlockSize);
    const rotatedGrid = this.rotationEngine.encode(
      bodyGrid,
      keyParams.pivotBlockSize,
      keyParams.rotationSequence,
      keyParams.rotationDirection,
      keyParams.readingOrder,
    );

    const size = dto.size ?? 'medium';
    const pngBuffer = await this.pngRenderer.render(rotatedGrid, size);
    const svgString = this.svgRenderer.render(rotatedGrid, size);

    return {
      png: pngBuffer.toString('base64'),
      svg: svgString,
      key,
      warnings,
      unknownChars,
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest encode.service.spec.ts`
Expected: PASS (13 tests: 6 happy-path cases (3 named + 3 parametrized size values) + 3 weakness warning + 2 unknown characters + 2 error cases)

- [ ] **Step 5: Run the full backend suite and lint**

Run: `cd backend && npm run test && npx eslint src/api`
Expected: all tests pass (305 + 13 new = 318), eslint clean.

- [ ] **Step 6: Commit**

```bash
git add backend/src/api/encode.service.ts backend/src/api/encode.service.spec.ts
git commit -m "$(cat <<'EOF'
feat(api): implement EncodeService orchestrating the full cipher pipeline

Modified files:
- backend/src/api/encode.service.ts - EncodeService: resolves key/params, validates weakness, runs preprocess/buildGrid/rotate/render, shapes the response
- backend/src/api/encode.service.spec.ts - unit tests: happy path, key generation vs provided key, weakness warning, unknown characters, malformed key error mapping
EOF
)"
```

---

### Task 3: `EncodeController`, `ApiModule` wiring, and the full HTTP e2e suite

**Files:**
- Create: `backend/src/api/encode.controller.ts`
- Modify: `backend/src/api/api.module.ts`
- Create: `backend/test/fixtures/api.fixtures.ts`
- Create: `backend/test/encode.e2e-spec.ts`

**Interfaces:**
- Consumes: `EncodeService`, `EncodeResult` from Task 2; `EncodeRequestDto` from Task 1; `AlphabetModule`, `RotationModule`, `RendererModule` (all pre-existing, already-shipped modules); `HexahueAlphabet`, `MockAlphabet`, `KeyCodec`.
- Produces: `EncodeController` (registers `POST /encode`, served at `/api/encode` via the global prefix), `ApiModule` wired with imports/controllers/providers.

- [ ] **Step 1: Implement `EncodeController`**

`backend/src/api/encode.controller.ts`:

```typescript
import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { EncodeService } from './encode.service';
import { EncodeRequestDto } from './dto/encode-request.dto';
import { EncodeResult } from './encode.service';

@Controller('encode')
export class EncodeController {
  constructor(private readonly encodeService: EncodeService) {}

  @Post()
  @HttpCode(200)
  async encode(@Body() dto: EncodeRequestDto): Promise<EncodeResult> {
    return this.encodeService.encode(dto);
  }
}
```

- [ ] **Step 2: Wire `ApiModule`**

Modify `backend/src/api/api.module.ts` to:

```typescript
import { Module } from '@nestjs/common';
import { AlphabetModule } from '../alphabet/alphabet.module';
import { RotationModule } from '../rotation/rotation.module';
import { RendererModule } from '../renderer/renderer.module';
import { EncodeController } from './encode.controller';
import { EncodeService } from './encode.service';

@Module({
  imports: [AlphabetModule, RotationModule, RendererModule],
  controllers: [EncodeController],
  providers: [EncodeService],
})
export class ApiModule {}
```

- [ ] **Step 3: Create the shared API fixtures**

`backend/test/fixtures/api.fixtures.ts`:

```typescript
import { KeyCodec } from '../../src/key/key-codec';

export const VALID_ENCODE_BODY = {
  message: 'ABC',
  pivotBlockSize: 5,
  rotationSequence: [0, 1, 2, 3],
  rotationDirection: 'cw',
  readingOrder: 'LR-TB',
};

export const VALID_KEY_STRING = KeyCodec.encode({
  version: 1,
  pivotBlockSize: 5,
  rotationSequence: [0, 1, 2, 3],
  rotationDirection: 'cw',
  readingOrder: 'LR-TB',
});

export const VALID_ENCODE_BODY_WITH_KEY = {
  message: 'ABC',
  key: VALID_KEY_STRING,
};

export const WEAK_ENCODE_BODY = {
  message: 'ABC',
  pivotBlockSize: 3,
  rotationSequence: [0, 1, 2, 3],
  rotationDirection: 'cw',
  readingOrder: 'LR-TB',
};

export const ENCODE_BODY_WITH_UNKNOWN_CHARS = {
  message: 'ABXYZ',
  pivotBlockSize: 5,
  rotationSequence: [0, 1, 2, 3],
  rotationDirection: 'cw',
  readingOrder: 'LR-TB',
};

export const MALFORMED_KEY_STRINGS = [
  '',
  'not-a-key',
  'HR2.0000',
  'HR1-0000',
  'HR1.ABC',
  'HR1·ZZZZ', // structurally valid, but unpacks to an out-of-range rotation sequence index (26, only 0-23 exist)
];
```

- [ ] **Step 4: Write the failing e2e tests**

`backend/test/encode.e2e-spec.ts`:

```typescript
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { ApiModule } from '../src/api/api.module';
import { HexahueAlphabet } from '../src/alphabet/hexahue-alphabet.service';
import { MockAlphabet } from './utils/mock-alphabet';
import {
  VALID_ENCODE_BODY,
  VALID_ENCODE_BODY_WITH_KEY,
  WEAK_ENCODE_BODY,
  ENCODE_BODY_WITH_UNKNOWN_CHARS,
  MALFORMED_KEY_STRINGS,
} from './fixtures/api.fixtures';

describe('POST /api/encode (e2e)', () => {
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

  describe('happy path', () => {
    it('returns 200 with a valid base64 PNG string in png', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send(VALID_ENCODE_BODY);

      expect(res.status).toBe(200);
      const pngBuffer = Buffer.from(res.body.png as string, 'base64');
      expect(pngBuffer.subarray(0, 4)).toEqual(
        Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      );
    });

    it('returns 200 with a valid SVG string in svg', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send(VALID_ENCODE_BODY);

      expect(res.status).toBe(200);
      expect((res.body.svg as string).startsWith('<svg')).toBe(true);
    });

    it('returns 200 with a valid HR key string in key', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send(VALID_ENCODE_BODY);

      expect(res.status).toBe(200);
      expect(res.body.key).toMatch(/^HR1\.[0-9A-Z]{4}$/);
    });

    it('returns 200 with an empty warnings array when params are strong', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send(VALID_ENCODE_BODY);

      expect(res.status).toBe(200);
      expect(res.body.warnings).toEqual([]);
    });

    it('returns 200 with an empty unknownChars array for a clean ASCII message', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send(VALID_ENCODE_BODY);

      expect(res.status).toBe(200);
      expect(res.body.unknownChars).toEqual([]);
    });

    it('generates a key from individual params when no key field is provided', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send(VALID_ENCODE_BODY);

      expect(res.status).toBe(200);
      expect(typeof res.body.key).toBe('string');
    });

    it('uses the provided key and ignores individual params when key is present', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send(VALID_ENCODE_BODY_WITH_KEY);

      expect(res.status).toBe(200);
      expect(res.body.key).toBe(VALID_ENCODE_BODY_WITH_KEY.key);
    });

    it.each(['small', 'medium', 'large'])(
      'encodes the message with size %s without error',
      async (size) => {
        const res = await request(app.getHttpServer())
          .post('/api/encode')
          .send({ ...VALID_ENCODE_BODY, size });
        expect(res.status).toBe(200);
      },
    );
  });

  describe('weakness warning', () => {
    it('returns 200 with a non-empty warnings array when pivotBlockSize is weak', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send(WEAK_ENCODE_BODY);

      expect(res.status).toBe(200);
      expect((res.body.warnings as string[]).length).toBeGreaterThan(0);
    });

    it('returns 200 and does not block encoding when a weakness warning is present', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send(WEAK_ENCODE_BODY);

      expect(res.status).toBe(200);
      expect(typeof res.body.png).toBe('string');
    });

    it('returns 200 with an empty warnings array when overrideWeaknessWarning=true and pivotBlockSize=weak', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send({ ...WEAK_ENCODE_BODY, overrideWeaknessWarning: true });

      expect(res.status).toBe(200);
      expect(res.body.warnings).toEqual([]);
    });
  });

  describe('unknown characters', () => {
    it('returns 200 with the unknown characters listed in unknownChars', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send(ENCODE_BODY_WITH_UNKNOWN_CHARS);

      expect(res.status).toBe(200);
      expect(res.body.unknownChars).toEqual(
        expect.arrayContaining(['X', 'Y', 'Z']),
      );
    });

    it('encodes the remaining supported characters when unknown chars are present', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send(ENCODE_BODY_WITH_UNKNOWN_CHARS);

      expect(res.status).toBe(200);
      expect(typeof res.body.png).toBe('string');
    });
  });

  describe('validation errors', () => {
    it('returns 400 when message is missing', async () => {
      const { message, ...rest } = VALID_ENCODE_BODY;
      void message;
      const res = await request(app.getHttpServer()).post('/api/encode').send(rest);
      expect(res.status).toBe(400);
    });

    it('returns 400 when message is an empty string', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send({ ...VALID_ENCODE_BODY, message: '' });
      expect(res.status).toBe(400);
    });

    it.each(MALFORMED_KEY_STRINGS)(
      'returns 400 when key is malformed: %s',
      async (malformedKey) => {
        const res = await request(app.getHttpServer())
          .post('/api/encode')
          .send({ message: 'ABC', key: malformedKey });
        expect(res.status).toBe(400);
      },
    );

    it('returns 400 when rotationDirection is not cw or ccw', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send({ ...VALID_ENCODE_BODY, rotationDirection: 'sideways' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when size is not small, medium, or large', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send({ ...VALID_ENCODE_BODY, size: 'huge' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when extra fields are present in the body (strict DTO)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send({ ...VALID_ENCODE_BODY, extraField: 'nope' });
      expect(res.status).toBe(400);
    });
  });
});
```

Note: `MockAlphabet`'s supported characters are `A`-`F` only (`backend/test/utils/mock-alphabet.ts`) - all fixture messages above (`'ABC'`, `'ABXYZ'`) are chosen to match this. `X`, `Y`, `Z` in `ENCODE_BODY_WITH_UNKNOWN_CHARS` are deliberately outside `MockAlphabet`'s A-F set, matching the shared `SAMPLE_MESSAGES.withUnsupportedChars` convention already established in `backend/src/cipher/__fixtures__/cipher.fixtures.ts`.

- [ ] **Step 5: Run e2e tests to verify they fail**

Run: `cd backend && npm run test:e2e`
Expected: FAIL with "Cannot find module '../src/api/api.module'" or similar, since `EncodeController`/`ApiModule` wiring do not exist yet at this point if Steps 1-2 were skipped - but since this plan has you implement Steps 1-2 first, this run should instead reveal any wiring mistakes. If Steps 1-3 were done correctly, expect real assertion failures (e.g. 404s) rather than module-resolution errors - fix forward from there, this is not a placeholder "expect failure" step to skip.

- [ ] **Step 6: Run e2e tests to verify they pass**

Run: `cd backend && npm run test:e2e`
Expected: PASS (26 tests: 10 happy-path cases (7 named + 3 parametrized size values) + 3 weakness warning + 2 unknown characters + 6 malformed-key cases via `it.each` + 5 other validation errors - missing message, empty message, invalid rotationDirection, invalid size, extra fields). Recount precisely against the actual test file before reporting - do not guess the number here without counting the real `it`/`it.each` entries.

- [ ] **Step 7: Run the full backend suite (both runners) and lint**

Run: `cd backend && npm run test && npm run test:e2e && npx eslint src/api`
Expected: `npm run test` passes at 318 (unchanged by this task - the e2e suite runs under a separate Jest config and is not counted in this number), `npm run test:e2e` passes per Step 6, eslint clean.

- [ ] **Step 8: Commit**

```bash
git add backend/src/api/encode.controller.ts backend/src/api/api.module.ts backend/test/fixtures/api.fixtures.ts backend/test/encode.e2e-spec.ts
git commit -m "$(cat <<'EOF'
feat(api): wire POST /encode end to end with a full HTTP-level test suite

Modified files:
- backend/src/api/encode.controller.ts - EncodeController, POST /encode forced to HttpCode(200)
- backend/src/api/api.module.ts - wire AlphabetModule/RotationModule/RendererModule, register EncodeController/EncodeService
- backend/test/fixtures/api.fixtures.ts - shared fixtures per docs/tests/api.md's Fixtures section
- backend/test/encode.e2e-spec.ts - full HTTP-level test suite via supertest, HexahueAlphabet overridden with the shared MockAlphabet double, no real database touched
EOF
)"
```

---

## After this plan

FEAT-012 (`POST /decode`) is the natural next step and will need the inverse pipeline (`RotationEngine`'s already-implemented inverse mode) plus a real answer to the still-open message-boundary-detection question recorded in `BACKLOG.md`'s FEAT-012 entry (no header exists to signal where the message ends). FEAT-013 (`POST /key/generate`, `GET /key/parse`) is smaller and is where "sensible defaults" for individual key params - deliberately NOT implemented in this plan - actually belongs. TEST-002 (still `status: backlog`, blocked on CI-003) will eventually run an equivalent suite to this plan's `encode.e2e-spec.ts` against the real `HexahueAlphabet`/database once CI-003 provisions Postgres in CI - this plan's e2e suite does not replace that future work, it only covers what FEAT-011 itself needs to ship correctly.
