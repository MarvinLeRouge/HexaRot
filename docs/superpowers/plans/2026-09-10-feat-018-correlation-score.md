# FEAT-018 Correlation Score Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose a `POST /api/correlation-score` endpoint that computes a normalised 0-1 score (Cohen's kappa over cell-level colour agreement) measuring how much of a cryptogram's original grid structure remains detectable after rotation.

**Architecture:** A pure, dependency-free function `computeCorrelationScore` in a new `backend/src/correlation/` folder (mirrors the `cipher/` folder's plain-function pattern - no NestJS module needed). A new `CorrelationScoreService` in the `api/` layer re-derives the pre-rotation and post-rotation grids from `message` + key/params (reusing `preprocess`, `buildGrid`, `RotationEngine`, exactly like `EncodeService` does) and calls the pure function, skipping PNG/SVG rendering entirely. A new `CorrelationScoreController` exposes it at `POST /api/correlation-score`.

**Tech Stack:** NestJS 11, `class-validator`/`class-transformer` for DTO validation, Jest for unit/e2e tests.

**Spec:** docs/superpowers/specs/2026-09-10-feat-018-correlation-score-design.md

## Global Constraints

- Score is a normalised value in `[0, 1]` via `Math.abs(kappa)` (kappa can be negative; absolute value maps disagreement back into range).
- `p_e` (expected chance agreement) is computed from a single colour distribution, since rotation only permutes cell positions and never changes the grid's colour multiset - pre-rotation and post-rotation grids share the same marginal distribution by construction.
- Padding cells (random colours filling the grid to a multiple of the pivot block size) are included in the score calculation, not excluded.
- A single-colour grid (`p_e === 1`, division by zero) throws a plain, uncaught `Error` - same defensive-guard pattern as `RotationEngine.applyToBlocks()`, not wrapped in `BadRequestException`.
- The new endpoint's request DTO mirrors `EncodeRequestDto` exactly (message + key, or message + 4 individual params via the same `ValidateIf` pattern), minus `size` and `overrideWeaknessWarning` (rendering-only fields, not applicable here).
- Invalid `key`/params → `BadRequestException`, same pattern as `EncodeService`/`DecodeService`/`KeyService`.
- No PNG/SVG rendering in this endpoint's code path.

---

### Task 1: Update FEAT-018's backlog entry

**Files:**
- Modify: `BACKLOG.md:1129` (the `FEAT-018` item's acceptance criteria list)

**Interfaces:**
- Consumes: nothing
- Produces: nothing (documentation-only change; no other task depends on this one)

- [ ] **Step 1: Remove the UI-display acceptance criterion**

In `BACKLOG.md`, find the `[FEAT-018] Correlation score` item's `#### Acceptance criteria` block:

```markdown
#### Acceptance criteria

- Score is a normalised value between 0 and 1
- Score of 0 means no detectable structure; 1 means fully readable
- Score is deterministic for a given cryptogram
- Endpoint documented in API docs
- Score interpretation is explained in the UI (tooltip or help text)
```

Delete the last line (`- Score interpretation is explained in the UI (tooltip or help text)`), leaving:

```markdown
#### Acceptance criteria

- Score is a normalised value between 0 and 1
- Score of 0 means no detectable structure; 1 means fully readable
- Score is deterministic for a given cryptogram
- Endpoint documented in API docs
```

Do not touch any other line in the file (the description above it, including its existing em dash, stays exactly as-is - only remove the one acceptance-criterion line).

- [ ] **Step 2: Verify the backlog's status values are still valid**

Run: `grep -o "\*\*status:\*\* [a-z_]*" BACKLOG.md | sort | uniq -c`
Expected: only `backlog`, `ready`, `in_progress`, `in_review`, `done` appear (this task doesn't change any status field, this is a sanity check that the edit didn't corrupt the file).

- [ ] **Step 3: Commit**

```bash
git add BACKLOG.md
git commit -m "docs(backlog): narrow FEAT-018 to backend-only scope

Modified files:
- BACKLOG.md - remove the UI-display acceptance criterion from FEAT-018, deferred to a future frontend follow-up item per the approved design spec"
```

---

### Task 2: Implement `computeCorrelationScore`

**Files:**
- Create: `backend/src/correlation/correlation-score.ts`
- Test: `backend/src/correlation/correlation-score.spec.ts`

**Interfaces:**
- Consumes: `ColorGrid` type from `backend/src/shared/types` (already exists, `string[][]`)
- Produces: `computeCorrelationScore(preGrid: ColorGrid, postGrid: ColorGrid): number`, importable as `import { computeCorrelationScore } from '../correlation/correlation-score'` from `backend/src/api/`. Later tasks depend on this exact name and signature.

- [ ] **Step 1: Write the failing tests**

Create `backend/src/correlation/correlation-score.spec.ts`:

```ts
import { computeCorrelationScore } from './correlation-score';
import { ColorGrid } from '../shared/types';

describe('computeCorrelationScore', () => {
  it('returns 1 for identical pre/post grids (no rotation happened)', () => {
    const grid: ColorGrid = [
      ['red', 'green', 'blue'],
      ['yellow', 'purple', 'cyan'],
    ];

    const score = computeCorrelationScore(grid, grid);

    expect(score).toBeCloseTo(1, 10);
  });

  it('computes the exact kappa-based score for a fixed, hand-verified 2x2 grid', () => {
    // preGrid colour counts: red=2, green=1, blue=1 (total 4)
    // p_e = (2/4)^2 + (1/4)^2 + (1/4)^2 = 0.25 + 0.0625 + 0.0625 = 0.375
    // every cell disagrees between pre and post, so p_o = 0
    // kappa = (0 - 0.375) / (1 - 0.375) = -0.6, score = abs(-0.6) = 0.6
    const preGrid: ColorGrid = [
      ['red', 'green'],
      ['blue', 'red'],
    ];
    const postGrid: ColorGrid = [
      ['green', 'red'],
      ['red', 'blue'],
    ];

    const score = computeCorrelationScore(preGrid, postGrid);

    expect(score).toBeCloseTo(0.6, 10);
  });

  it('returns a low score when every cell disagrees across six equally-distributed colours', () => {
    // preGrid: 6 distinct colours, one cell each (total 6), so p_e = 6 * (1/6)^2 = 1/6
    // postGrid is preGrid cyclically shifted by one position, so every cell disagrees: p_o = 0
    // kappa = (0 - 1/6) / (1 - 1/6) = -0.2, score = abs(-0.2) = 0.2
    const preGrid: ColorGrid = [
      ['red', 'green', 'blue', 'yellow', 'purple', 'cyan'],
    ];
    const postGrid: ColorGrid = [
      ['cyan', 'red', 'green', 'blue', 'yellow', 'purple'],
    ];

    const score = computeCorrelationScore(preGrid, postGrid);

    expect(score).toBeCloseTo(0.2, 10);
  });

  it('throws when the grid has only one distinct colour (p_e === 1, kappa undefined)', () => {
    const grid: ColorGrid = [
      ['red', 'red'],
      ['red', 'red'],
    ];

    expect(() => computeCorrelationScore(grid, grid)).toThrow(
      'computeCorrelationScore: grid has only one distinct colour, kappa is undefined',
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx jest src/correlation/correlation-score.spec.ts`
Expected: FAIL - `Cannot find module './correlation-score'` (the module doesn't exist yet).

- [ ] **Step 3: Implement `computeCorrelationScore`**

Create `backend/src/correlation/correlation-score.ts`:

```ts
import { ColorGrid } from '../shared/types';

/**
 * Computes a normalised [0, 1] measure of how much structure from preGrid
 * remains detectable in postGrid, via Cohen's kappa over cell-level colour
 * agreement. 0 means no more agreement than chance; 1 means the grids are
 * identical. preGrid and postGrid must have identical dimensions and (by
 * construction, since rotation only permutes cells) the same colour
 * multiset.
 */
export function computeCorrelationScore(
  preGrid: ColorGrid,
  postGrid: ColorGrid,
): number {
  const colorCounts = new Map<string, number>();
  let totalCells = 0;
  let agreementCount = 0;

  for (let y = 0; y < preGrid.length; y++) {
    for (let x = 0; x < preGrid[y].length; x++) {
      const preColor = preGrid[y][x];
      const postColor = postGrid[y][x];
      totalCells++;
      if (preColor === postColor) {
        agreementCount++;
      }
      colorCounts.set(preColor, (colorCounts.get(preColor) ?? 0) + 1);
    }
  }

  const observedAgreement = agreementCount / totalCells;
  let expectedAgreement = 0;
  for (const count of colorCounts.values()) {
    const proportion = count / totalCells;
    expectedAgreement += proportion * proportion;
  }

  if (expectedAgreement === 1) {
    throw new Error(
      'computeCorrelationScore: grid has only one distinct colour, kappa is undefined',
    );
  }

  const kappa =
    (observedAgreement - expectedAgreement) / (1 - expectedAgreement);
  return Math.abs(kappa);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && npx jest src/correlation/correlation-score.spec.ts`
Expected: PASS, 4/4 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/correlation/correlation-score.ts backend/src/correlation/correlation-score.spec.ts
git commit -m "feat(correlation): add computeCorrelationScore

Modified files:
- backend/src/correlation/correlation-score.ts - new pure function computing a Cohen's-kappa-based correlation score between two colour grids
- backend/src/correlation/correlation-score.spec.ts - unit tests: identical grids, a hand-verified fixed case, a low-score case, and the single-colour throw"
```

---

### Task 3: Add `CorrelationScoreRequestDto`

**Files:**
- Create: `backend/src/api/dto/correlation-score-request.dto.ts`
- Test: `backend/src/api/dto/correlation-score-request.dto.spec.ts`

**Interfaces:**
- Consumes: `READING_ORDERS` from `backend/src/key/key-codec` (existing export), `MAX_MESSAGE_LENGTH` from `backend/src/cipher/header` (existing export, `0xffff`)
- Produces: `CorrelationScoreRequestDto` class with fields `message: string`, `key?: string`, `pivotBlockSize?: number`, `rotationSequence?: number[]`, `rotationDirection?: 'cw' | 'ccw'`, `readingOrder?: string`. Task 4's service consumes this exact shape.

- [ ] **Step 1: Write the failing tests**

Create `backend/src/api/dto/correlation-score-request.dto.spec.ts`:

```ts
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CorrelationScoreRequestDto } from './correlation-score-request.dto';

async function validateBody(body: Record<string, unknown>) {
  const dto = plainToInstance(CorrelationScoreRequestDto, body);
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
}

const VALID_PARAMS_BODY = {
  message: 'ABC',
  pivotBlockSize: 5,
  rotationSequence: [0, 1, 2, 3],
  rotationDirection: 'cw',
  readingOrder: 'LR-TB',
};

describe('CorrelationScoreRequestDto', () => {
  describe('valid bodies', () => {
    it('passes with a fully specified individual-params body', async () => {
      const errors = await validateBody(VALID_PARAMS_BODY);
      expect(errors).toHaveLength(0);
    });

    it('passes with only message and key (individual params omitted)', async () => {
      const errors = await validateBody({ message: 'ABC', key: 'HR1·0000' });
      expect(errors).toHaveLength(0);
    });
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
      const errors = await validateBody({ message: 'ABC', key: 'HR1·0000' });
      expect(errors.some((e) => e.property === 'pivotBlockSize')).toBe(false);
    });

    it('fails when rotationDirection is not cw or ccw (no key provided)', async () => {
      const errors = await validateBody({
        ...VALID_PARAMS_BODY,
        rotationDirection: 'sideways',
      });
      expect(errors.some((e) => e.property === 'rotationDirection')).toBe(true);
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

  describe('rendering-only fields are rejected', () => {
    it('fails when size is present (strict DTO, size does not apply here)', async () => {
      const errors = await validateBody({ ...VALID_PARAMS_BODY, size: 'large' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('fails when overrideWeaknessWarning is present (strict DTO, does not apply here)', async () => {
      const errors = await validateBody({
        ...VALID_PARAMS_BODY,
        overrideWeaknessWarning: true,
      });
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx jest src/api/dto/correlation-score-request.dto.spec.ts`
Expected: FAIL - `Cannot find module './correlation-score-request.dto'`.

- [ ] **Step 3: Implement `CorrelationScoreRequestDto`**

Create `backend/src/api/dto/correlation-score-request.dto.ts`:

```ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsIn,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateIf,
} from 'class-validator';
import { READING_ORDERS } from '../../key/key-codec';
import { MAX_MESSAGE_LENGTH } from '../../cipher/header';

/**
 * Request body for POST /correlation-score. Same "either key, or all four
 * individual params" contract as EncodeRequestDto, minus the two
 * rendering-only fields (size, overrideWeaknessWarning) that don't apply
 * here since this endpoint never renders an image.
 */
export class CorrelationScoreRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_MESSAGE_LENGTH)
  message!: string;

  @IsOptional()
  @IsString()
  key?: string;

  @ValidateIf((o: CorrelationScoreRequestDto) => !o.key)
  @IsInt()
  @Min(1)
  @Max(255)
  pivotBlockSize?: number;

  @ValidateIf((o: CorrelationScoreRequestDto) => !o.key)
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(3, { each: true })
  rotationSequence?: number[];

  @ValidateIf((o: CorrelationScoreRequestDto) => !o.key)
  @IsIn(['cw', 'ccw'])
  rotationDirection?: 'cw' | 'ccw';

  @ValidateIf((o: CorrelationScoreRequestDto) => !o.key)
  @IsIn(READING_ORDERS)
  readingOrder?: string;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && npx jest src/api/dto/correlation-score-request.dto.spec.ts`
Expected: PASS, 10/10 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/dto/correlation-score-request.dto.ts backend/src/api/dto/correlation-score-request.dto.spec.ts
git commit -m "feat(api): add CorrelationScoreRequestDto

Modified files:
- backend/src/api/dto/correlation-score-request.dto.ts - request DTO for the upcoming POST /correlation-score endpoint, mirrors EncodeRequestDto minus rendering-only fields
- backend/src/api/dto/correlation-score-request.dto.spec.ts - validation unit tests"
```

---

### Task 4: Implement `CorrelationScoreService`

**Files:**
- Create: `backend/src/api/correlation-score.service.ts`
- Test: `backend/src/api/correlation-score.service.spec.ts`

**Interfaces:**
- Consumes: `computeCorrelationScore` (Task 2), `CorrelationScoreRequestDto` (Task 3), `preprocess` from `backend/src/cipher/preprocess` (existing), `buildGrid` from `backend/src/cipher/build-grid` (existing), `RotationEngine` from `backend/src/rotation/rotation-engine` (existing), `KeyCodec`/`KeyParams`/`RotationSequence` from `backend/src/key/key-codec` (existing), `HexahueAlphabet` from `backend/src/alphabet/hexahue-alphabet.service` (existing)
- Produces: `CorrelationScoreService` (NestJS `@Injectable`, constructor `(alphabet: HexahueAlphabet, rotationEngine: RotationEngine)`) with method `compute(dto: CorrelationScoreRequestDto): CorrelationScoreResult`, and `export interface CorrelationScoreResult { score: number }`. Task 5's controller consumes both.

- [ ] **Step 1: Write the failing tests**

Create `backend/src/api/correlation-score.service.spec.ts`:

```ts
// Prevent Jest from parsing PrismaService's generated ESM Prisma client.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class MockPrismaService {},
}));

import { BadRequestException } from '@nestjs/common';
import { CorrelationScoreService } from './correlation-score.service';
import { CorrelationScoreRequestDto } from './dto/correlation-score-request.dto';
import { RotationEngine } from '../rotation/rotation-engine';
import { ReadingOrderRegistry } from '../reading-order/reading-order.registry';
import { KeyCodec } from '../key/key-codec';
import { HexahueAlphabet } from '../alphabet/hexahue-alphabet.service';
import { MockAlphabet } from '../../test/utils/mock-alphabet';

function makeService(): CorrelationScoreService {
  const alphabet = new MockAlphabet();
  return new CorrelationScoreService(
    alphabet as unknown as HexahueAlphabet,
    new RotationEngine(new ReadingOrderRegistry()),
  );
}

const VALID_PARAMS_DTO: CorrelationScoreRequestDto = {
  message: 'ABC',
  pivotBlockSize: 5,
  rotationSequence: [0, 1, 2, 3],
  rotationDirection: 'cw',
  readingOrder: 'LR-TB',
};

describe('CorrelationScoreService', () => {
  describe('happy path', () => {
    it('returns a score in [0, 1] for a valid params body', () => {
      const service = makeService();
      const result = service.compute(VALID_PARAMS_DTO);

      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('returns a score in [0, 1] for a valid key body', () => {
      const service = makeService();
      const key = KeyCodec.encode({
        version: 1,
        pivotBlockSize: 5,
        rotationSequence: [0, 1, 2, 3],
        rotationDirection: 'cw',
        readingOrder: 'LR-TB',
        size: 'medium',
      });
      const dto = { message: 'ABC', key } as CorrelationScoreRequestDto;

      const result = service.compute(dto);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });
  });

  describe('determinism', () => {
    it('returns the exact same score across repeated calls with the same input', () => {
      const service = makeService();
      const first = service.compute(VALID_PARAMS_DTO);
      const second = service.compute(VALID_PARAMS_DTO);
      const third = service.compute(VALID_PARAMS_DTO);

      expect(second.score).toBe(first.score);
      expect(third.score).toBe(first.score);
    });
  });

  describe('errors', () => {
    it('throws BadRequestException when key is malformed', () => {
      const service = makeService();
      const dto = { message: 'ABC', key: 'not-a-key' } as CorrelationScoreRequestDto;

      expect(() => service.compute(dto)).toThrow(BadRequestException);
    });

    it('throws BadRequestException when key unpacks to pivotBlockSize=0', () => {
      const service = makeService();
      const dto = { message: 'ABC', key: 'HR1·0000' } as CorrelationScoreRequestDto;

      expect(() => service.compute(dto)).toThrow(BadRequestException);
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx jest src/api/correlation-score.service.spec.ts`
Expected: FAIL - `Cannot find module './correlation-score.service'`.

- [ ] **Step 3: Implement `CorrelationScoreService`**

Create `backend/src/api/correlation-score.service.ts`:

```ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { preprocess } from '../cipher/preprocess';
import { buildGrid } from '../cipher/build-grid';
import { RotationEngine } from '../rotation/rotation-engine';
import { KeyCodec, KeyParams, RotationSequence } from '../key/key-codec';
import { HexahueAlphabet } from '../alphabet/hexahue-alphabet.service';
import { computeCorrelationScore } from '../correlation/correlation-score';
import { CorrelationScoreRequestDto } from './dto/correlation-score-request.dto';

/** Response shape for POST /correlation-score. */
export interface CorrelationScoreResult {
  score: number;
}

@Injectable()
export class CorrelationScoreService {
  constructor(
    private readonly alphabet: HexahueAlphabet,
    private readonly rotationEngine: RotationEngine,
  ) {}

  compute(dto: CorrelationScoreRequestDto): CorrelationScoreResult {
    let keyParams: KeyParams;

    if (dto.key) {
      try {
        keyParams = KeyCodec.decode(dto.key);
      } catch (err) {
        throw new BadRequestException((err as Error).message);
      }
    } else {
      keyParams = {
        version: 1,
        pivotBlockSize: dto.pivotBlockSize as number,
        rotationSequence: dto.rotationSequence as RotationSequence,
        rotationDirection: dto.rotationDirection as 'cw' | 'ccw',
        readingOrder: dto.readingOrder as KeyParams['readingOrder'],
        size: 'medium',
      };
    }

    const { text } = preprocess(dto.message, this.alphabet);
    const bodyGrid = buildGrid(text, this.alphabet, keyParams.pivotBlockSize);
    const rotatedGrid = this.rotationEngine.encode(
      bodyGrid,
      keyParams.pivotBlockSize,
      keyParams.rotationSequence,
      keyParams.rotationDirection,
      keyParams.readingOrder,
    );

    const score = computeCorrelationScore(bodyGrid, rotatedGrid);
    return { score };
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && npx jest src/api/correlation-score.service.spec.ts`
Expected: PASS, 6/6 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/correlation-score.service.ts backend/src/api/correlation-score.service.spec.ts
git commit -m "feat(api): add CorrelationScoreService

Modified files:
- backend/src/api/correlation-score.service.ts - re-derives pre/post-rotation grids from message + key/params (no rendering) and computes the correlation score
- backend/src/api/correlation-score.service.spec.ts - unit tests covering both input modes, determinism, and error handling"
```

---

### Task 5: Wire up `POST /api/correlation-score`

**Files:**
- Create: `backend/src/api/correlation-score.controller.ts`
- Modify: `backend/src/api/api.module.ts`
- Test: `backend/test/correlation-score.e2e-spec.ts`

**Interfaces:**
- Consumes: `CorrelationScoreService`/`CorrelationScoreResult` (Task 4), `CorrelationScoreRequestDto` (Task 3), `VALID_ENCODE_BODY`/`VALID_ENCODE_BODY_WITH_KEY`/`MALFORMED_KEY_STRINGS` from `backend/test/fixtures/api.fixtures.ts` (existing - reused as-is since their shape already matches `CorrelationScoreRequestDto`, no `size`/`overrideWeaknessWarning` fields present in them)
- Produces: `POST /api/correlation-score` route, live for Task 6's documentation to describe.

- [ ] **Step 1: Write the failing e2e tests**

Create `backend/test/correlation-score.e2e-spec.ts`:

```ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ApiModule } from '../src/api/api.module';
import { CorrelationScoreResult } from '../src/api/correlation-score.service';
import {
  VALID_ENCODE_BODY,
  VALID_ENCODE_BODY_WITH_KEY,
  MALFORMED_KEY_STRINGS,
} from './fixtures/api.fixtures';

describe('POST /api/correlation-score (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ApiModule],
    }).compile();

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
    it('returns 200 with a score in [0, 1] for a valid params body', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/correlation-score')
        .send(VALID_ENCODE_BODY);

      expect(res.status).toBe(200);
      const body = res.body as CorrelationScoreResult;
      expect(typeof body.score).toBe('number');
      expect(body.score).toBeGreaterThanOrEqual(0);
      expect(body.score).toBeLessThanOrEqual(1);
    });

    it('returns 200 with a score in [0, 1] for a valid key body', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/correlation-score')
        .send(VALID_ENCODE_BODY_WITH_KEY);

      expect(res.status).toBe(200);
      const body = res.body as CorrelationScoreResult;
      expect(body.score).toBeGreaterThanOrEqual(0);
      expect(body.score).toBeLessThanOrEqual(1);
    });

    it('returns the identical score across repeated requests with the same body', async () => {
      const first = await request(app.getHttpServer())
        .post('/api/correlation-score')
        .send(VALID_ENCODE_BODY);
      const second = await request(app.getHttpServer())
        .post('/api/correlation-score')
        .send(VALID_ENCODE_BODY);

      expect((second.body as CorrelationScoreResult).score).toBe(
        (first.body as CorrelationScoreResult).score,
      );
    });
  });

  describe('validation errors', () => {
    it('returns 400 when message is missing', async () => {
      const { message, ...rest } = VALID_ENCODE_BODY;
      void message;
      const res = await request(app.getHttpServer())
        .post('/api/correlation-score')
        .send(rest);

      expect(res.status).toBe(400);
    });

    it.each(MALFORMED_KEY_STRINGS)(
      'returns 400 for malformed key %p',
      async (key) => {
        const res = await request(app.getHttpServer())
          .post('/api/correlation-score')
          .send({ message: 'ABC', key });

        expect(res.status).toBe(400);
      },
    );

    it('returns 400 when size is present (rejected, strict DTO)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/correlation-score')
        .send({ ...VALID_ENCODE_BODY, size: 'large' });

      expect(res.status).toBe(400);
    });
  });
});
```

- [ ] **Step 2: Run the e2e tests to verify they fail**

Run: `cd backend && npx jest --config test/jest-e2e.json correlation-score.e2e-spec.ts`
Expected: FAIL - 404s (route doesn't exist yet) and a compile error on the missing `../src/api/correlation-score.service` import.

- [ ] **Step 3: Implement `CorrelationScoreController`**

Create `backend/src/api/correlation-score.controller.ts`:

```ts
import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import {
  CorrelationScoreService,
  CorrelationScoreResult,
} from './correlation-score.service';
import { CorrelationScoreRequestDto } from './dto/correlation-score-request.dto';

/**
 * Handles POST /correlation-score - computes how much of a cryptogram's
 * original grid structure remains detectable after rotation.
 */
@Controller('correlation-score')
export class CorrelationScoreController {
  constructor(
    private readonly correlationScoreService: CorrelationScoreService,
  ) {}

  /**
   * Computes the correlation score for the given message and parameters.
   *
   * @param dto - Validated request body.
   * @returns The correlation score result (score).
   */
  @Post()
  @HttpCode(200)
  compute(@Body() dto: CorrelationScoreRequestDto): CorrelationScoreResult {
    return this.correlationScoreService.compute(dto);
  }
}
```

- [ ] **Step 4: Register the controller and service in `ApiModule`**

Modify `backend/src/api/api.module.ts` to:

```ts
import { Module } from '@nestjs/common';
import { AlphabetModule } from '../alphabet/alphabet.module';
import { RotationModule } from '../rotation/rotation.module';
import { RendererModule } from '../renderer/renderer.module';
import { EncodeController } from './encode.controller';
import { EncodeService } from './encode.service';
import { KeyController } from './key.controller';
import { KeyService } from './key.service';
import { DecodeController } from './decode.controller';
import { DecodeService } from './decode.service';
import { CorrelationScoreController } from './correlation-score.controller';
import { CorrelationScoreService } from './correlation-score.service';

@Module({
  imports: [AlphabetModule, RotationModule, RendererModule],
  controllers: [
    EncodeController,
    KeyController,
    DecodeController,
    CorrelationScoreController,
  ],
  providers: [EncodeService, KeyService, DecodeService, CorrelationScoreService],
})
export class ApiModule {}
```

- [ ] **Step 5: Run the e2e tests to verify they pass**

Run: `cd backend && npx jest --config test/jest-e2e.json correlation-score.e2e-spec.ts`
Expected: PASS, 7/7 tests. (Requires the PostgreSQL 16 test database to be up, same as the other e2e suites - see `backend/test/jest-e2e.json` / CI's existing e2e setup, no new setup needed here.)

- [ ] **Step 6: Run the full backend test suite**

Run: `cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e`
Expected: all pass, no regressions in `encode`/`decode`/`key` suites.

- [ ] **Step 7: Commit**

```bash
git add backend/src/api/correlation-score.controller.ts backend/src/api/api.module.ts backend/test/correlation-score.e2e-spec.ts
git commit -m "feat(api): expose POST /api/correlation-score

Modified files:
- backend/src/api/correlation-score.controller.ts - new controller for POST /correlation-score
- backend/src/api/api.module.ts - register CorrelationScoreController and CorrelationScoreService
- backend/test/correlation-score.e2e-spec.ts - e2e coverage: happy path (both input modes), determinism, validation errors"
```

---

### Task 6: Document the endpoint

**Files:**
- Modify: `docs/api/api_endpoints.md`
- Modify: `docs/api/api_endpoints.fr.md`

**Interfaces:**
- Consumes: nothing (documentation-only)
- Produces: nothing (closes the "Endpoint documented in API docs" acceptance criterion; no other task depends on this one)

- [ ] **Step 1: Add the English documentation**

In `docs/api/api_endpoints.md`, add a row to the existing table (after the `/decode` row):

```markdown
| `POST` | `/correlation-score` | Compute a cryptogram's correlation score |
```

so the table reads:

```markdown
| Method | Route | Description |
|---|---|---|
| `POST` | `/encode` | Encode a message → PNG + SVG cryptogram |
| `POST` | `/decode` | Decode a cryptogram → plaintext |
| `POST` | `/correlation-score` | Compute a cryptogram's correlation score |
| `POST` | `/key/generate` | Generate an HR key from parameters |
| `POST` | `/key/parse` | Parse an HR key → structured parameters |
```

Then add a new section right after the existing `## \`POST /decode\`` section (before `## \`POST /key/generate\``):

```markdown
## `POST /correlation-score`

```json
POST /api/correlation-score
{
  "message": "HELLO WORLD",
  "pivotBlockSize": 5,
  "rotationSequence": [0, 1, 2, 3],
  "rotationDirection": "cw",
  "readingOrder": "LR-TB"
}
```

```json
{
  "score": 0.83
}
```
```

- [ ] **Step 2: Add the French documentation**

In `docs/api/api_endpoints.fr.md`, add the matching table row (after the `/decode` row):

```markdown
| `POST` | `/correlation-score` | Calculer le score de corrélation d'un cryptogramme |
```

Then add the matching section right after the existing `## \`POST /decode\`` section (before `## \`POST /key/generate\``):

```markdown
## `POST /correlation-score`

```json
POST /api/correlation-score
{
  "message": "HELLO WORLD",
  "pivotBlockSize": 5,
  "rotationSequence": [0, 1, 2, 3],
  "rotationDirection": "cw",
  "readingOrder": "LR-TB"
}
```

```json
{
  "score": 0.83
}
```
```

- [ ] **Step 3: Verify the bilingual pages still cross-link correctly**

Run: `grep -n "correlation-score" docs/api/api_endpoints.md docs/api/api_endpoints.fr.md`
Expected: 4 matches total (1 table row + 1 section heading, in each of the two files).

- [ ] **Step 4: Commit**

```bash
git add docs/api/api_endpoints.md docs/api/api_endpoints.fr.md
git commit -m "docs(api): document POST /correlation-score

Modified files:
- docs/api/api_endpoints.md, docs/api/api_endpoints.fr.md - add the new endpoint to the reference table and give it its own request/response example section"
```
