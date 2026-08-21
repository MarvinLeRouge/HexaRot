---
target: HexaRot frontend (encode, decode, key views)
total_score: 13
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-08-21T09-23-20Z
slug: hexarot-frontend-encode-decode-key-views
---
# Critique #5 — HexaRot frontend (encode, decode, key views)

Method: dual-agent (A: design-review subagent · B: detector/browser-evidence subagent). Target: `main` @ `2d90550` (post-merge `refactor/critique-round-4-fixes`).

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3/4 | Skeleton/spinner/aria-busy and all 4 stale surfaces work; skeleton width mismatches the result it stands in for |
| 2 | Match System / Real World | 1/4 | `pivotBlockSize` leaks verbatim into error strings; core jargon unexplained |
| 3 | User Control and Freedom | 1/4 | No way to clear a selected Decode file; a failed re-encode destroys an unrecoverable successful result |
| 4 | Consistency and Standards | 2/4 | Encode preserves state on navigation, Decode/Key reset unconditionally (verified live); Decode's result region has no aria-label unlike Encode/Key |
| 5 | Error Prevention | 1/4 | The weakness (GCD) warning is pure client-computable arithmetic but only surfaces after a round trip |
| 6 | Recognition Rather Than Recall | 1/4 | Cryptogram size is required to decode but recorded nowhere in the product |
| 7 | Flexibility and Efficiency | 1/4 | No shortcuts, no key history, no URL state |
| 8 | Aesthetic and Minimalist Design | 2/4 | Hierarchy inverted: disabled CTA is the least visible element, the cryptogram (the product's core artifact) is the smallest |
| 9 | Error Recovery | 1/4 | Error is two API sentences concatenated, ~500px from the offending field, and destroys the prior result |
| 10 | Help and Documentation | 0/4 | Still none |
| **Total** | | **13/40** | **Poor** |

Same total as run #4, not a real plateau. Both agents independently verified the 5 round-4 fixes mostly hold (see verification table below). What offsets that gain: (1) two round-4 fixes don't survive composited states - found independently by both agents (see P1 below): isolated disabled-button contrast measures 5.15:1 but its border is dead (`.btn-primary`'s `border:none` overrides `border-color`), and the same button composited inside the 0.5-opacity stale wrapper drops to 2.0-2.1:1; (2) Assessment A dug deeper this round and found real pre-existing bugs not introduced by round 4: the cryptogram size is never recorded anywhere (P0), a real mobile horizontal-overflow bug (144px of clipped controls), and a destructive failed-submit path. The score is flat because real fix work was offset by deeper analysis, not because round 4 didn't help.

## Design Specificity Verdict

Generic. No brand identity, 100% system typography, an accent purple with no relationship to the cryptogram's own palette. The cryptogram (the product's one distinctive artifact) is capped at 280px inside a 480px panel surrounded by ~650px of dead space.

Deterministic scan (detect.mjs): exit 0, 0 findings. Browser overlay: injected successfully on all 3 pages, "No anti-patterns found" everywhere. The automated detector found nothing in either pass - it doesn't test composited-state contrast, narrow-width overflow, or data destruction, which are exactly the most serious bugs this pass surfaced.

## Overall Impression

The technical foundation keeps improving (the stale model is now complete and consistent across all 4 surfaces; the non-destructive cryptogram badge remains the project's best single decision). But two failures far more serious than visual polish surfaced this round: a failed re-encode that destroys an unrecoverable result, and the fact that the cryptogram size (required to decode) is recorded nowhere in the product.

## What's Working

1. The rotation-picker's keyboard drag-reorder remains genuine craft: roving tabindex, order restored on Escape, precise live-region announcements - verified live.
2. Round 4's "don't dim the cryptogram" reasoning is exactly right, and the code explains why in a comment. Best decision in the codebase.
3. The stale-result model is now complete and consistent across all 4 result surfaces (Encode, Decode, Key generator, Key parser) - same banner, same wording, same re-submit affordance - verified live on all four.

## Priority Issues

**[P0] The cryptogram size, required to decode, is recorded nowhere**
Why it matters: `decode.form.size.hint` says it "must match the size used when encoded" - but nothing records it: not the key, not the downloaded filename (constant: `hexarot-cryptogram.png`), not the result panel. Meanwhile `encode.result.keyHint` claims the key "is required to decode your message," which wrongly implies it's sufficient. A silent-wrong-answer failure on the product's core round trip: a user who encodes at Large and returns a week later has no way to know why decoding fails.
Fix: name downloads `hexarot-<size>-<key>.png`, restate size next to the key in the result panel, or better: derive size from the uploaded file's pixel dimensions at decode time.
Suggested command: /impeccable clarify, then /impeccable harden

**[P1] Contrast doesn't survive composited states - found independently by both agents**
Why it matters: `.btn-primary:disabled` sets `border-color` but `.btn-primary` declares `border: none`, which overrides it - measured live: `border: 0px none`, surface contrast 1.05-1.11:1 (below WCAG 1.4.11's 3:1), making the disabled primary CTA nearly invisible. Separately, inside the stale wrapper's `opacity: 0.5`, both agents independently measured composited text dropping to 2.0-2.1:1 (Copy, Download PNG, key hint text on Decode and Key parser) - the exact regression class round 4 fixed, but only in isolation, not composited.
Fix: add `border: 1px solid var(--border)` to `.btn-primary:disabled`; replace opacity-based staleness with dedicated `--surface-stale`/`--text-stale` tokens authored to hold 4.5:1, rather than an alpha multiplier that silently degrades whatever it wraps.
Suggested command: /impeccable audit, then /impeccable polish

**[P1] Real horizontal overflow on mobile - controls unreachable**
Why it matters: the rotation picker is `flex` with no `flex-wrap`, intrinsic width 407px, forcing its parent fieldset to a 441px floor. Measured at a simulated 390px width (resize_window unavailable in this environment): 144px of real horizontal overflow, with Pivot block size, Rotation direction, and Reading order clipped off-screen. Most phones are under 473px wide.
Fix: `flex-wrap: wrap` on `.rotation-sequence-picker`, `min-inline-size: 0` on the fieldsets.
Suggested command: /impeccable adapt

**[P1] A failed request destroys the successful result it replaces**
Why it matters: `encode.ts:62` (and `decode.ts:66`, `key.ts:62/91`) null `result` before the request even starts. Verified live: a successful cryptogram + key displayed, then a failing re-encode, and the output column contains only the error - the key, explicitly "not stored anywhere," is permanently lost to a minor validation mistake.
Fix: keep `result` intact through a failed submit; render the error above the retained result and mark it stale instead of clearing it.
Suggested command: /impeccable harden

**[P2] The "Out of date" badge can overlap the cryptogram at narrow widths**
Why it matters: measured independently by both agents. The badge only clears the SVG because the preview is currently capped at 280px and centered. Assessment B simulated a narrower 200px preview: 55% of the badge landed over cryptogram cells, and `--warning-bg` at 8% alpha establishes no opaque surface - the badge text becomes unreadable over a saturated cell.
Fix: give the badge an opaque background.
Suggested command: /impeccable polish

**[P2] Decode's result remains the least-finished surface in the product**
Why it matters: the decoded message is a single line of grey text with no panel, no mono type, no copy button (unlike Encode's key), and its region has no aria-label. It's the last thing a Decode user sees (peak-end rule) and it undersells success.
Fix: give the decoded message the same treatment as Encode's key panel.
Suggested command: /impeccable polish

## Persona Red Flags

**Jordan (first-timer)**: nothing on the page explains what HexaRot is or why she faces 8 simultaneous decisions with no reassurance that defaults are fine. The disabled Encode button reads as inert chrome, not a button awaiting input.

**Sam (accessibility)**: `role="alert"` on key validation fires on every keystroke of an 8-character field - 8 interruptions to type one field. Decode's result region has no accessible name. Radio/checkbox targets measure 13x13px, well under WCAG 2.2's 24x24 minimum.

**Riley (stress tester)**: finds three real breaks in five minutes - the broken size/key round trip, the destructive re-encode, and Encode preserving state on navigation while Decode/Key reset unconditionally (verified live, identical mechanism, opposite behavior).

## Round-4 Fix Verification

| # | Fix | Verdict |
|---|---|---|
| 1 | Scroll+focus on all 4 error paths | Verified by both agents, all 4 surfaces |
| 2 | Stale protection extended to Decode and Key parser | Verified by both agents, all 4 surfaces |
| 3 | Disabled-button contrast + non-destructive badge + Download SVG class | Partial - badge and SVG class verified; isolated contrast verified (5.15:1) but border is dead and composited stale-state contrast fails (2.0-2.1:1), found independently by both agents |
| 4 | Loading skeleton | Verified but unfinished - column no longer collapses, but skeleton width mismatches the final result (visual jump) and its shimmer color reads as a broken image |
| 5 | readingOrder translation | Verified, clean, no caveats |

On the deliberate round-4 scope cut (the raw GCD warning string): Assessment A notes this is pure client-computable arithmetic (`gcd(pivotBlockSize, symbolWidth)`), so it may not actually need a backend change as assumed - worth reopening as a frontend-only item.

## Minor Observations

- Skeleton spans the full ~590px column while the result it stands in for is capped at 480px - a ~106px reflow on completion.
- Two competing primary buttons appear in every stale state (the notice's re-submit button plus the form's own submit); on a doubly-stale Key page that's four purple CTAs on screen at once.
- The stale notice never says which parameter changed.
- Grabbed vs. keyboard-focused states on the rotation chips are visually near-identical (both purple, both 2px).
- `#app { max-width: 1126px }` clips the nav's bottom border on wide screens.

## Questions to Consider

1. If the key alone isn't sufficient to decode, why is it presented as the whole secret? Either the size belongs in the key, or it belongs prominently next to it - the current copy actively misleads.
2. The weakness warning is pure arithmetic (`gcd(pivotBlockSize, symbolWidth) !== 1`) - why does it require a round trip to the server? Computing it client-side turns the app's worst error string into inline prevention.
3. What does the `?` placeholder in a decoded message actually mean - unreadable cell, wrong key, or a literal question mark? Right now it's one glyph for three different situations.
