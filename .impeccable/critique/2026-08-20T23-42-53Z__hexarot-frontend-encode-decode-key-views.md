---
target: HexaRot frontend (encode, decode, key views)
total_score: 13
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-08-20T23-42-53Z
slug: hexarot-frontend-encode-decode-key-views
---
# Critique #4 — HexaRot frontend (encode, decode, key views)

Method: dual-agent (A: design-review subagent, retried once after a session-limit failure · B: detector/browser-evidence subagent). Target: `main` @ `a10aa02` (post-merge `refactor/critique-round-3-fixes`).

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2/4 | Output column collapses to 0 height during every request; no loading state |
| 2 | Match System / Real World | 1/4 | Reading order shown as raw enum codes (`LR-TB`, `BT-LR-ALT`); raw backend GCD diagnostic leaks into the weakness warning |
| 3 | User Control and Freedom | 1/4 | No clear/reset/undo; a selected file cannot be removed; a failed re-encode permanently destroys the previous good result |
| 4 | Consistency and Standards | 2/4 | Stale-result protection exists on 2 of 4 result surfaces (Encode, Key generator), absent on Decode and Key parser; Download SVG button has no CSS class |
| 5 | Error Prevention | 2/4 | Cryptogram size must match encode time but nothing carries it across views |
| 6 | Recognition Rather Than Recall | 1/4 | Three views fully siloed; a generated key must be hand-copied between them |
| 7 | Flexibility and Efficiency | 1/4 | No copy button for decoded plaintext; no key download; no history, presets, or shortcuts |
| 8 | Aesthetic and Minimalist Design | 2/4 | No brand identity; the cryptogram (the product's core artifact) capped at 280px inside a 590px column |
| 9 | Error Recovery | 1/4 | Errors are raw backend strings, no recovery action, never scroll into view |
| 10 | Help and Documentation | 0/4 | None. No about page, no Hexahue link, no examples, no first-run help |
| **Total** | | **13/40** | **Poor** |

This is an independent recalibration (Assessment A did not see the prior score), so not a like-for-like delta vs. 19/40. But two concrete regressions are corroborated independently by both agents: disabled-button contrast got worse, and the round-3 scroll fix only covers the success path, not the error path.

## Design Specificity Verdict

Generic, with two exceptions. No brand identity anywhere (`AppLayout.vue` has three bare grey text links), the type stack is one system font duplicated across 3 variables (`--sans === --heading`), "HexaRot" appears only in `<title>` and a few field labels. Ironic for a *visual* cipher: the cryptogram itself is capped at 280px inside a 590px column, no zoom, no full-size view.

Two genuinely authored pieces: `RotationSequencePicker.vue` (accessible drag-reorder, roving tabstop, live-region announcements) and `key-format.ts` (forgiving key-separator normalization). Neither is a visual choice.

Deterministic scan (detect.mjs): exit 0, 0 findings across 12 `.vue` files — verified genuine via a synthetic canary file (3 anti-patterns correctly caught). Note: detect.mjs always exits 0 even with findings; only the findings count is meaningful.

Browser overlay: injected successfully on `/encode`, `/decode`, `/key`. One real repeated finding: the disabled submit button (empty field on load) at 1.5:1 contrast. The `gradient-text` flag on `<BODY>` on all three pages is a false positive — the overlay detecting its own injected badge.

## Overall Impression

Real technical foundation (coherent tokens, complete dark mode, careful keyboard accessibility on the rotation picker) but still a functional shell with no identity or teaching. The most serious problem is no longer visual: two round-3 fixes are incomplete in ways that can mislead the user (see P0s below), and one fix (disabled-button contrast) got measurably worse instead of better.

## What's Working

1. `RotationSequencePicker.vue`: roving tabstop, keyboard grab/drop, Escape restores prior order, 4 distinct live-region announcements. Rarely built this carefully.
2. `key-format.ts`: accepts `HR1.57C3`, `HR1-57C3`, `HR1_57C3`, `HR1 57C3`, lowercase — verified live. Avoids forcing users to type U+00B7 by hand.
3. Coherent, dark-mode-complete token system: nearly all text/background pairs clear 4.5:1 in both themes (except the two regressions below).

## Priority Issues

**[P0] The round-3 scroll fix only covers the success path — errors are still invisible**
Why it matters: `revealResult()` called without `{focus:true}` uses `behavior:'smooth'`, which never actually fires in this context (verified: `scrollIntoView({behavior:'smooth'})` on the error element does not move `scrollY`; `{behavior:'auto'}` does). On mobile, a failed encode/decode produces zero visible feedback. Affects `EncodeView.vue:22`, `DecodeView.vue:21`, `KeyGeneratorForm.vue:33`, `KeyParserForm.vue:37`.
Fix: remove the `'smooth'` branch entirely, always use `'auto'`, and move focus to the error element (`tabindex="-1"`).
Suggested command: /impeccable harden

**[P0] Decode and Key-parser results never go stale — a wrong plaintext can stay on screen**
Why it matters: `DecodeView.vue` has no `resultStale`; changing the key or size after a successful decode leaves the old plaintext displayed, undimmed, unwarned — verified live. On a decode tool, a stale plaintext next to a mismatched key looks like a correct decode of that key.
Fix: extend the existing stale pattern (already built for Encode and Key generator) to the 2 missing surfaces.
Suggested command: /impeccable harden

**[P1] Disabled-button contrast regressed, and the 0.5 opacity falsifies the cryptogram's colors**
Why it matters: both agents independently measured the same result — `.btn-primary:disabled`/`.btn-secondary:disabled` went from 1.82:1/2.81:1 (previous `opacity:0.5`) to 1.45:1 light / 1.58-1.60:1 dark with the new explicit style. Worse than what it replaced. Separately, the 0.5 opacity applied to the result panel to signal "stale" visibly distorts the cryptogram's real colors (black renders mid-grey, red renders salmon) — a problem for a cipher whose entire meaning is exact color. Download SVG still has no CSS class and renders in a third, unrelated style.
Fix: pick a disabled-state color pair ≥3:1 (e.g. `--code-bg` background + `--text` foreground + `--border` outline); replace opacity with a non-destructive treatment (hatching, translucent scrim outside the image); add `class="btn-secondary"` to Download SVG.
Suggested command: /impeccable colorize, then /impeccable polish

**[P1] No loading state — the output column collapses to 0px on every submit**
Why it matters: `submit()` nulls `result` before the request, and all three `v-if` template branches are false during `status === 'loading'` — the whole column disappears and reappears, causing a layout jump on every submit (verified: `outputHeight: 0`).
Fix: add a skeleton state that preserves height; stop nulling `result` before a response arrives.
Suggested command: /impeccable harden

**[P2] Unexplained domain jargon, backend internals leak into the UI**
Why it matters: `readingOrder` is still shown as a raw code (`LR-TB`) in both forms and the parser, while `rotationDirection` two lines above in the same `<dl>` was translated in round 3. Nothing explains "pivot block size" or "rotation sequence" anywhere.
Fix: add missing i18n keys for `readingOrder` (8 values); translate the GCD warning into a readable sentence.
Suggested command: /impeccable clarify

**[P3] No product identity; the core artifact is the smallest thing on screen**
Fix: header with name + one-sentence intro; scale the cryptogram to available width with click-to-enlarge.
Suggested command: /impeccable shape, then /impeccable bolder

## Persona Red Flags

**Sam (accessibility)**: the cryptogram SVG injected via `v-html` has no `role`, `aria-label`, or `<title>` — a screen-reader user finishes an encode facing a completely silent graphic. The active nav link relies solely on `--accent` color (4.39:1, below AA text threshold) as its only current-page signal. `role="listbox"`/`aria-selected` on the rotation picker is a semantic mismatch used to represent a "grabbed" drag state.

**Casey (mobile)**: nav tap targets measured at 57×23, 59×23, and 28×23px — all under the 44×44 minimum; "Key" (28×23) is the sole route to key tools. Rotation-picker chips are 41px tall and touch-drag competes directly with page scroll, with no visible touch alternative.

**Alex (power user)**: no copy button for decoded plaintext (only the key has one, in two places). No value handoff between the three views — a generated key must be hand-copied everywhere. No URL state, nothing shareable via link.

## Round-3 Fix Verification

| # | Fix | Verdict |
|---|---|---|
| 1 | `reveal-result.ts` scroll+focus | Partial — success path confirmed working by both agents; error path still broken (`'smooth'` branch never fires) |
| 2 | Stale = dim + disable + re-encode | Working on Encode and Key generator, confirmed by both agents; missing on Decode and Key parser (found by A) |
| 3 | Empty placeholder + title alignment | Working, confirmed by both agents; but the column goes empty again (0px) during every request (found by A) |
| 4 | Key view parity + translated rotationDirection | Working, confirmed by both agents; `readingOrder` still raw, Key parser has no stale handling (found by A) |
| 5 | `--border` contrast + disabled buttons | `--border`: verified (3.40:1 light / 3.52:1 dark) by both agents — disabled buttons: regression confirmed independently by both agents (1.45-1.60:1, worse than before) |

## Minor Observations

- `EncodeView.vue:27-31` resets the store on unmount only if `status !== 'success'`, while Decode and Key views always reset — three views, two behaviors, no stated reason.
- `--sans` and `--heading` are byte-identical — the "typography system" is one font.
- No way to remove a selected decode file — the upload component's emit type structurally cannot clear it.
- `KeyView.vue`'s `1fr 1fr` grid gives 535px cells while both forms cap at 480px — 55px dead space per column, with the two cards at very different heights.

## Questions to Consider

1. Three fix rounds have all repaired the same three form-and-result screens. Is "Encode / Decode / Key" the right IA, or should a key be a persistent object carried between encode and decode rather than a string retyped three times?
2. The app forbids storing the key but offers no download/QR/printable-card path either — only copy-paste. Is that the intended security posture?
3. `opacity: 0.5` signals "stale" on an artifact whose entire meaning is exact color. What else in this UI borrows a generic web convention the domain contradicts?
4. Round 3 fixed `rotationDirection`'s raw code and left `readingOrder`'s raw code two lines below it in the same `<dl>`. Would a grep-for-the-pattern step catch this class of gap before the next critique has to?
