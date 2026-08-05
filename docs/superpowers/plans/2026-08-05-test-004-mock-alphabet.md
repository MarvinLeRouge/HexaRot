# TEST-004 - Shared MockAlphabet for contract testing - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `MockAlphabet` test double implementing `VisualAlphabet` with dimensions deliberately different from Hexahue (3 wide x 2 tall instead of 2 wide x 3 tall), plus a contract-level test suite proving `VisualAlphabet` consumers don't accidentally assume Hexahue's specific dimensions.

**Architecture:** `MockAlphabet` is a plain class (no NestJS DI, no database) living in a shared test-utilities module under `backend/src/shared/testing/`, hardcoding grids for six characters (A-F). A separate contract spec exercises it the same way `HexahueAlphabet`'s own spec exercises dimensions/getBlock/getSupportedChars, but driven entirely off `symbolWidth`/`symbolHeight`/`getSupportedChars()` so it never hardcodes "2" or "3".

**Tech Stack:** TypeScript (strict), Jest + ts-jest. Jest `rootDir` is `backend/src`, so all test files must live under `backend/src/`.

## Global Constraints

- TypeScript strict mode, no implicit any (existing `tsconfig.json`).
- Code, comments, commit messages: English. Comments only where the WHY isn't obvious from the code.
- Functions/methods verb-first, camelCase; classes PascalCase; files kebab-case.
- `VisualAlphabet.symbolWidth` / `symbolHeight` are **already** required interface members (`backend/src/shared/types/visual-alphabet.interface.ts:12,15`) and already implemented by `HexahueAlphabet` (`symbolWidth = 2`, `symbolHeight = 3`). No interface or `HexahueAlphabet` changes are needed for this plan - TEST-004's backlog acceptance criteria about "formalising symbolWidth/symbolHeight as required members" are already satisfied by existing code.
- Conventional Commits format, with the mandatory modified-files list, per global CLAUDE.md.
- Branch: `test/TEST-004-mock-alphabet`, created from up-to-date `main`.

---

## File Structure

- Create: `backend/src/shared/testing/mock-alphabet.ts` - the `MockAlphabet` class (implements `VisualAlphabet`).
- Create: `backend/src/shared/testing/mock-alphabet.spec.ts` - correctness tests for the double itself (exact grid values, unsupported-char error, no duplicate chars).
- Create: `backend/src/shared/testing/visual-alphabet-contract.spec.ts` - dimension-agnostic contract tests, driven by `MockAlphabet`'s own reported `symbolWidth`/`symbolHeight`, proving no test assumption leaks in from Hexahue's 2x3.

No existing files are modified. `HexahueAlphabet` and its spec are untouched since the interface members they need already exist.

---

### Task 1: `MockAlphabet` test double

**Files:**
- Create: `backend/src/shared/testing/mock-alphabet.ts`
- Test: `backend/src/shared/testing/mock-alphabet.spec.ts`

**Interfaces:**
- Consumes: `VisualAlphabet` (`backend/src/shared/types/visual-alphabet.interface.ts`), `ColorGrid` (`backend/src/shared/types/color-grid.type.ts`), `UnsupportedCharacterError` (`backend/src/alphabet/errors/unsupported-character.error.ts`).
- Produces: `export class MockAlphabet implements VisualAlphabet` with `readonly symbolWidth = 3`, `readonly symbolHeight = 2`, `getBlock(char: string): ColorGrid`, `getSupportedChars(): string[]`. Supported chars: exactly `'A'`, `'B'`, `'C'`, `'D'`, `'E'`, `'F'` (uppercase only, case-sensitive - mirrors `HexahueAlphabet` behaviour where lowercase input is unsupported).

- [x] **Step 1: Write the failing test**

```typescript
// backend/src/shared/testing/mock-alphabet.spec.ts
import { MockAlphabet } from './mock-alphabet';
import { UnsupportedCharacterError } from '../../alphabet/errors/unsupported-character.error';

describe('MockAlphabet', () => {
  let alphabet: MockAlphabet;

  beforeEach(() => {
    alphabet = new MockAlphabet();
  });

  it('exposes symbolWidth = 3 and symbolHeight = 2 (deliberately not Hexahue dimensions)', () => {
    expect(alphabet.symbolWidth).toBe(3);
    expect(alphabet.symbolHeight).toBe(2);
  });

  it('returns exactly A-F from getSupportedChars(), no duplicates', () => {
    const chars = alphabet.getSupportedChars();
    expect(chars.sort()).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(chars.length).toBe(new Set(chars).size);
  });

  it('returns the correct grid for "A"', () => {
    const grid = alphabet.getBlock('A');
    expect(grid).toEqual([
      ['red', 'green', 'blue'],
      ['yellow', 'purple', 'cyan'],
    ]);
  });

  it('returns a 2-row x 3-column grid for every supported character', () => {
    for (const char of alphabet.getSupportedChars()) {
      const grid = alphabet.getBlock(char);
      expect(grid).toHaveLength(2);
      for (const row of grid) {
        expect(row).toHaveLength(3);
      }
    }
  });

  it('throws UnsupportedCharacterError for a character outside A-F', () => {
    expect(() => alphabet.getBlock('Z')).toThrow(UnsupportedCharacterError);
  });

  it('throws UnsupportedCharacterError for lowercase input', () => {
    expect(() => alphabet.getBlock('a')).toThrow(UnsupportedCharacterError);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest shared/testing/mock-alphabet.spec.ts`
Expected: FAIL - `Cannot find module './mock-alphabet'`

- [x] **Step 3: Write minimal implementation**

```typescript
// backend/src/shared/testing/mock-alphabet.ts
import { VisualAlphabet } from '../types/visual-alphabet.interface';
import { ColorGrid } from '../types/color-grid.type';
import { UnsupportedCharacterError } from '../../alphabet/errors/unsupported-character.error';

/**
 * Minimal, self-contained VisualAlphabet double for tests.
 *
 * Deliberately uses 3 wide x 2 tall symbols (not Hexahue's 2 wide x 3 tall) so
 * that contract-level tests exercising VisualAlphabet consumers cannot pass by
 * accidentally assuming Hexahue-specific dimensions.
 */
export class MockAlphabet implements VisualAlphabet {
  readonly symbolWidth = 3;
  readonly symbolHeight = 2;

  private readonly blocks: Record<string, ColorGrid> = {
    A: [
      ['red', 'green', 'blue'],
      ['yellow', 'purple', 'cyan'],
    ],
    B: [
      ['green', 'blue', 'red'],
      ['purple', 'cyan', 'yellow'],
    ],
    C: [
      ['blue', 'red', 'green'],
      ['cyan', 'yellow', 'purple'],
    ],
    D: [
      ['yellow', 'purple', 'cyan'],
      ['red', 'green', 'blue'],
    ],
    E: [
      ['purple', 'cyan', 'yellow'],
      ['green', 'blue', 'red'],
    ],
    F: [
      ['cyan', 'yellow', 'purple'],
      ['blue', 'red', 'green'],
    ],
  };

  getBlock(char: string): ColorGrid {
    const grid = this.blocks[char];
    if (!grid) {
      throw new UnsupportedCharacterError(char);
    }
    return grid;
  }

  getSupportedChars(): string[] {
    return Object.keys(this.blocks);
  }
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest shared/testing/mock-alphabet.spec.ts`
Expected: PASS (6 tests)

- [x] **Step 5: Commit**

```bash
git add backend/src/shared/testing/mock-alphabet.ts backend/src/shared/testing/mock-alphabet.spec.ts
git commit -m "$(cat <<'EOF'
test(alphabet): add MockAlphabet test double with non-Hexahue dimensions

Modified files:
- backend/src/shared/testing/mock-alphabet.ts - new VisualAlphabet double, 3x2 symbols, chars A-F
- backend/src/shared/testing/mock-alphabet.spec.ts - correctness tests for the double
EOF
)"
```

---

### Task 2: Dimension-agnostic contract test suite

**Files:**
- Create: `backend/src/shared/testing/visual-alphabet-contract.spec.ts`

**Interfaces:**
- Consumes: `MockAlphabet` from Task 1 (`./mock-alphabet`).
- Produces: nothing consumed by later tasks - this is a leaf test file.

- [x] **Step 1: Write the failing test**

```typescript
// backend/src/shared/testing/visual-alphabet-contract.spec.ts
import { MockAlphabet } from './mock-alphabet';

describe('VisualAlphabet contract (dimension-agnostic, via MockAlphabet)', () => {
  const alphabet = new MockAlphabet();

  it('reports dimensions other than Hexahue\'s 2x3, to prove no test hardcodes them', () => {
    expect(alphabet.symbolWidth).not.toBe(2);
    expect(alphabet.symbolHeight).not.toBe(3);
  });

  it('every supported character returns a grid matching symbolHeight rows x symbolWidth columns', () => {
    for (const char of alphabet.getSupportedChars()) {
      const grid = alphabet.getBlock(char);
      expect(grid).toHaveLength(alphabet.symbolHeight);
      for (const row of grid) {
        expect(row).toHaveLength(alphabet.symbolWidth);
      }
    }
  });

  it('every cell of every supported character is a non-empty colour string', () => {
    for (const char of alphabet.getSupportedChars()) {
      for (const row of alphabet.getBlock(char)) {
        for (const color of row) {
          expect(typeof color).toBe('string');
          expect(color.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('getSupportedChars() has no duplicate entries', () => {
    const chars = alphabet.getSupportedChars();
    expect(chars.length).toBe(new Set(chars).size);
  });

  it('getBlock() throws for a character outside the supported set', () => {
    expect(() => alphabet.getBlock('Z')).toThrow();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest shared/testing/visual-alphabet-contract.spec.ts`
Expected: FAIL only if Task 1 wasn't committed yet in this working tree - otherwise it should already PASS since `MockAlphabet` exists. If Task 1 is already merged, treat this as red-green in one step: write the test, confirm it currently passes against `MockAlphabet` (Step 2 becomes a pass-confirmation, not a failure - note this explicitly when running the plan and move directly to Step 4).

- [x] **Step 3: (No implementation step - this task only adds tests against existing code)**

- [x] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest shared/testing/visual-alphabet-contract.spec.ts`
Expected: PASS (5 tests)

- [x] **Step 5: Run full backend test suite**

Run: `cd backend && npm run test`
Expected: PASS, all existing suites (`hexahue-alphabet.service.spec.ts`, `preprocess.spec.ts`, `validate-params.spec.ts`, `key-codec.spec.ts`, `app.controller.spec.ts`) plus the two new files, no regressions.

- [x] **Step 6: Commit**

```bash
git add backend/src/shared/testing/visual-alphabet-contract.spec.ts
git commit -m "$(cat <<'EOF'
test(alphabet): add dimension-agnostic VisualAlphabet contract suite

Modified files:
- backend/src/shared/testing/visual-alphabet-contract.spec.ts - contract tests driven off MockAlphabet's own reported dimensions, decoupled from Hexahue's 2x3
EOF
)"
```

---

## After this plan

Push `test/TEST-004-mock-alphabet`, update `BACKLOG.md` (`TEST-004` status `ready` -> `done`) in the same PR - this must happen inside the feature PR, not via a direct push to `main`, so the backlog-sync automation picks it up correctly - and hand back title/description for the user to open the PR. Next up per the validated roadmap: **FEAT-005** (reading order strategies).

## Post-review addendum (final whole-branch review)

The final review found the plan's Task 2 interpretation of the TEST-004 acceptance criterion ("an existing test is updated to use MockAlphabet") was too weak: `visual-alphabet-contract.spec.ts` only exercises `MockAlphabet` against itself, so the fixture had zero real consumers. A third, small task was added after review to close that gap: add a consumer test to `backend/src/cipher/preprocess.spec.ts` using `MockAlphabet`, replacing the ad-hoc partial-object cast that was there before. See the branch's final commits for the exact change. A parameterised `describeVisualAlphabetContract` harness (applying the same assertions to both `MockAlphabet` and `HexahueAlphabet`) was identified as a further improvement and deferred to a follow-up backlog item rather than expanding this branch.
