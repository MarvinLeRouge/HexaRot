# FEAT-018 Correlation Score Design Spec

**Status:** Approved by the user (2026-09-10), ready for writing-plans.

**Backlog item:** FEAT-018, `status: ready`, `depends-on: FEAT-007` (done), `domain: cipher`, `complexity: XL`, `priority: low`. Scope narrows the current backlog text (see "Decision 1" below); the backlog entry will be updated to match this spec before implementation starts.

## Context

`RotationEngine.applyToBlocks()` (`backend/src/rotation/rotation-engine.ts`) rotates individual colour cases inside pivot blocks - it permutes cell positions within the grid, it never changes a cell's colour value. This means the pre-rotation grid and the post-rotation grid always contain the exact same multiset of colours, just arranged differently.

`EncodeService.encode()` (`backend/src/api/encode.service.ts`) already builds both grids in sequence: `buildGrid()` produces the pre-rotation grid (`bodyGrid`), `RotationEngine.encode()` produces the post-rotation grid (`rotatedGrid`), before either is rendered to PNG/SVG.

The correlation score measures how much of the original grid structure remains detectable after rotation: a score near 0 means the rotation scrambled the grid enough that pre/post positions agree no more than chance would predict; a score near 1 means the rotation barely changed anything and the cryptogram is still close to readable as-is.

## Decision 1: scope narrows the current backlog text

The original `FEAT-018` acceptance criteria include "Score interpretation is explained in the UI (tooltip or help text)" and "optionally displayed in the encode view." During brainstorming the user confirmed this item stays **backend-only**: the score is computed and exposed via a dedicated API endpoint, with no frontend display in this iteration. The UI-explanation criterion is removed from `FEAT-018` and deferred to a future frontend follow-up item (not yet created - no backlog item exists for it yet, per YAGNI).

A separate, unrelated idea (showing the pre-rotation encoding visually alongside the score) was raised and deliberately kept **out of scope** entirely - it's recorded in `docs/roadmap.md`/`docs/roadmap.fr.md`'s "Ideas for later" section, not as part of this item.

## Decision 2: Cohen's kappa over cell-level colour agreement, including padding

The score is Cohen's kappa (a chance-corrected agreement statistic) computed cell-by-cell between the pre-rotation grid and the post-rotation grid, treating each cell's colour as a categorical value:

```
p_o = (number of cells where preGrid[y][x] === postGrid[y][x]) / totalCells
p_e = sum over each distinct colour c of (proportion of cells with colour c in preGrid)^2
kappa = (p_o - p_e) / (1 - p_e)
score = abs(kappa)
```

`p_e` uses a single colour distribution because, as noted in Context, rotation never changes the grid's colour multiset - the pre-rotation and post-rotation grids share the same marginal distribution by construction.

Padding cells (random colours filling the grid out to a multiple of the pivot block size, added by `buildGrid()`) are included in the calculation rather than excluded. This was a deliberate simplicity choice: excluding them would require threading the message-cell-count boundary (`processedString.length * symbolWidth * symbolHeight`) into the correlation module, and padding being random noise doesn't meaningfully skew the statistic.

Cohen's kappa can be negative (agreement below chance); `abs()` maps that back into a meaningful "detectable structure" reading rather than clamping to 0, since strong systematic disagreement is itself a detectable pattern.

### Edge case: single-colour grid

If the grid contains only one distinct colour, every cell trivially agrees (`p_o = 1`) and `p_e = 1`, making `kappa = 0/0`. This can't happen with the real Hexahue alphabet (its palette always has multiple colours), so `computeCorrelationScore` throws a plain `Error` when `p_e === 1` rather than special-casing a result - the same defensive-guard pattern `RotationEngine.applyToBlocks()` already uses for its own invariants (a plain `Error`, left uncaught by callers, surfacing as a 500 through NestJS's default exception handling).

## Decision 3: dedicated endpoint, not a field on `/api/encode`

`POST /api/correlation-score` is a new, separate endpoint rather than an added field on `EncodeResult`. This matches the current backlog text ("dedicated API endpoint") and lets a caller get the score without paying for PNG/SVG rendering, which `/api/encode` always does.

Trade-off accepted: the new endpoint's service re-derives `bodyGrid`/`rotatedGrid` from `message` + key params, duplicating the preprocessing steps `EncodeService.encode()` already performs (but not the rendering steps, which are skipped entirely).

## Decision 4: request DTO mirrors `EncodeRequestDto`

The new endpoint accepts the same shape as `POST /api/encode`'s request body, minus the two fields that only affect rendering:

- `message` (required)
- Either `key` (a pre-encoded key string), or all four of `pivotBlockSize`, `rotationSequence`, `rotationDirection`, `readingOrder`
- No `size`, no `overrideWeaknessWarning` (both are rendering-only concerns)

Validation rules mirror `EncodeRequestDto` exactly for the fields that are shared (same `class-validator` decorators, same "either key or all four params" `ValidateIf` pattern).

## Architecture

### New module: `backend/src/correlation/`

Mirrors how `rotation/` is its own standalone module, so the kappa computation is testable in isolation from the API layer.

**`backend/src/correlation/correlation-score.ts`**

```ts
import { ColorGrid } from '../shared/types';

/**
 * Computes a normalised [0, 1] measure of how much structure from preGrid
 * remains detectable in postGrid, via Cohen's kappa over cell-level colour
 * agreement. 0 means no more agreement than chance; 1 means perfect or
 * perfectly inverse agreement. preGrid and postGrid must have identical
 * dimensions and (by construction, since rotation only permutes cells)
 * the same colour multiset.
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

### API layer

**`backend/src/api/dto/correlation-score-request.dto.ts`** - copy of `EncodeRequestDto` minus `size` and `overrideWeaknessWarning`.

**`backend/src/api/correlation-score.service.ts`**

```ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { preprocess } from '../cipher/preprocess';
import { buildGrid } from '../cipher/build-grid';
import { RotationEngine } from '../rotation/rotation-engine';
import { KeyCodec, KeyParams, RotationSequence } from '../key/key-codec';
import { HexahueAlphabet } from '../alphabet/hexahue-alphabet.service';
import { computeCorrelationScore } from '../correlation/correlation-score';
import { CorrelationScoreRequestDto } from './dto/correlation-score-request.dto';

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

**`backend/src/api/correlation-score.controller.ts`** - `POST /api/correlation-score`, mirrors `EncodeController`'s structure (DTO validation via `ValidationPipe`, delegates to the service, returns its result directly).

Both are registered in `backend/src/api/api.module.ts` alongside the existing controllers/services. `CorrelationScoreService` needs `HexahueAlphabet` and `RotationEngine` as providers, both already available in that module's scope (used by `EncodeService`).

## Error handling

- Invalid `key` string, or invalid individual params failing DTO validation → `BadRequestException` (same as `/api/encode`), via the existing `KeyCodec.decode()` try/catch pattern.
- Single-colour grid (`computeCorrelationScore` throwing) → left uncaught, surfaces as a 500 via NestJS's default exception filter. Not expected to occur with the real Hexahue alphabet; this is defense-in-depth, not a user-facing error path.

## Testing

**`backend/src/correlation/correlation-score.spec.ts`** (unit, isolated from the API layer):
- Identical pre/post grids → score is `1`: `p_o = 1`, so `kappa = (1 - p_e) / (1 - p_e) = 1`. This confirms the score's direction - 1 means unchanged/readable (no scrambling happened), 0 means maximally scrambled relative to chance - and matches the acceptance criterion "1 means fully readable."
- Grids where cell colours were fully randomly reassigned (simulating maximal scrambling) → score close to 0.
- Fixed, hand-computed small grid (e.g. 2x2) with known `p_o`/`p_e` → exact expected score, asserted against the manually-derived value.
- Single-colour grid → throws.

**`backend/src/api/correlation-score.controller.spec.ts`** / service spec:
- Valid `message` + `key` → returns a `score` in `[0, 1]`.
- Valid `message` + 4 individual params → same code path, same result shape.
- Same `message` + `key` called twice → identical score both times (determinism, per acceptance criteria).
- Invalid `key` → `400`.
- Missing `message` → `400`.

## Backlog update

Before implementation, `BACKLOG.md`'s `FEAT-018` entry: remove the "Score interpretation is explained in the UI (tooltip or help text)" acceptance criterion; keep the rest (normalised 0-1, deterministic, dedicated endpoint, documented in API docs).

## API documentation

Per the remaining "documented in API docs" acceptance criterion, document `POST /api/correlation-score` wherever `/api/encode`/`/api/decode`/`/api/key` are already documented in this repo (check `README.md` and/or `docs/` for the existing API reference format and match it).
