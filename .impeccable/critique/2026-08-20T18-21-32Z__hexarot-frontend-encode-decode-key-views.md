---
target: HexaRot frontend (encode, decode, key views)
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-08-20T18-21-32Z
slug: hexarot-frontend-encode-decode-key-views
---
Method: dual-agent (A: design review, complete · B: detector/browser evidence, CLI scan + overlay complete, supplementary manual spot-checks interrupted by an API session-limit error mid-run - the completed portion is reported below; Assessment A independently verified nearly all the same items in more depth)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Spinner/aria-busy/focus-move all present, but a successful encode in the single-column (narrow/short-viewport) layout produces no visible change at all - verified live: `scrollY` unchanged after a real click, result panel landing at the very bottom edge of the viewport. |
| 2 | Match System / Real World | 2 | "Pivot block size", "BT-LR-ALT" and unexplained parameter vocabulary; the key parser echoes `ccw`/`BT-LR-ALT` verbatim while the generator two inches above says "Counter-clockwise". Raw "Internal Server Error" still leaks through in some paths. |
| 3 | User Control and Freedom | 2 | Escape cancels a drag, key survives nav-away, key input is tolerantly normalized - but no undo for the new silent result-wipe, no way to clear a chosen file, no cancel on an in-flight request. |
| 4 | Consistency and Standards | 2 | The two new branches made this worse in one respect: Encode/Decode now use a two-column model and invalidate stale results; Key still uses a single stacked-card layout and does not invalidate - verified live (changed a generated key's pivot block size, the old key stayed on screen with a live Copy button). Also: Download SVG ships with an empty class while Download PNG is a styled secondary button. |
| 5 | Error Prevention | 3 | Strongest area: submit disabled until valid, pivot bounded 1-255, tolerant key-format normalization, file extension gated before selection, weakness warnings with explicit override, and REFACTOR-003 genuinely kills a real class of mismatched key/image errors on Encode. |
| 6 | Recognition Rather Than Recall | 1 | Decode still demands both the key (explicitly stored nowhere) and the size from memory, no history/recents, no Encode-to-Decode handoff. |
| 7 | Flexibility and Efficiency | 2 | Enter submits, keyboard reorder is properly implemented (verified: arrows move real DOM focus, not just a tabindex attribute). No shortcuts, no saved presets, even though a key already is a reusable preset. |
| 8 | Aesthetic and Minimalist Design | 2 | The new two-column layout leaves a permanently empty, unexplained output column beside the form (measured 590px wide x 0 children before any submit); the h1 centers over the whole grid rather than the column it titles; the rotation chips still read as inert disabled tags. |
| 9 | Error Recovery | 2 | Error copy is genuinely improved ("Couldn't encode this message: ..."), but focus does not move to the error (verified: `document.activeElement` stayed on `BODY` after a failed submit, unlike the success path which correctly moves focus). |
| 10 | Help and Documentation | 1 | Still no help anywhere - no tooltips, no explanation of any cipher parameter, no first-run guidance, no product identity statement in the UI itself. |
| **Total** | | **19/40** | **Poor (top of the 12-19 band)** |

Movement from the last measured 18/40 is real but small: **+1**. The two branches fixed exactly what they targeted (the desktop scroll-to-result defect, and stale Encode results) and nothing adjacent; the heuristics that were already dragging the score down - Recognition, Help, Match - were untouched by either fix, and REFACTOR-002/003 each introduced one new, narrower issue of their own (detailed below).

## Design Specificity Verdict

**LLM assessment (Assessment A):** Still category-interchangeable outside one exception. Swap the field labels on Encode for an accounting form's and it ships unchanged - system-ui type throughout, default `<select>` chrome, one purple accent, a bordered card. The one authored exception remains the key result card (uppercase micro-label, oversized mono value, tinted field, honest stakes copy) - still the only moment in the app where someone made a decision instead of accepting a default. The clearest missed opportunity: the four rotation chips (0°/90°/180°/270°) are the single product-specific control in the entire UI and render as small beige pills that read as disabled tags, not as the draggable heart of the cipher; the cryptogram itself renders at 280px, smaller than the message textarea that produced it.

**Deterministic scan (Assessment B):** `detect.mjs --json` over frontend/src/views, components, layouts: clean, no findings. Live browser overlay injection succeeded on all three routes (/encode, /decode, /key): "No anti-patterns found" on each. Assessment B's run was interrupted by a session-limit API error partway through its supplementary manual computed-style checks (button colors, grid computed style, stale-result DOM removal, decode-hint contrast) - the mandatory CLI scan and browser-overlay portions completed cleanly before the interruption. Assessment A independently and directly verified nearly all of the same items with concrete measurements (see Verification table below), so the dual-agent evidence for this round is substantively complete despite B's early stop.

**Live verification (Assessment A), confirmed vs. claimed:**

| Claim | Verdict | Evidence |
|---|---|---|
| REFACTOR-002: two-column at >=900px | Confirmed | `grid-template-columns` computes to `480px 590px` at 1322px viewport |
| REFACTOR-002: result readable without scrolling | Confirmed, desktop only, zero margin | scrollY: 0 after a successful encode at 785px viewport height; download row bottom lands exactly at the fold |
| REFACTOR-002: error in the output column, no scroll | Confirmed | error renders at top:191, scrollY: 0 |
| REFACTOR-003: editing a param clears the result | Confirmed | pivot, message, and size edits each clear the result; re-submit restores it |
| Rotation picker: arrows move real DOM focus | Confirmed | activeElement text changed 0deg -> 90deg; roving tabindex, grab/move/drop/escape all verified end to end |
| Primary/secondary buttons | Mostly - one regression | Download SVG ships with `class=""`, rendering as a raw default button next to the styled Download PNG secondary |
| Decode size hint contrast | Confirmed passing | #756d80 on #fff = 4.93:1 |

## Overall Impression

Both targeted patches work and the app is meaningfully less broken. The desktop scroll defect is genuinely gone - submitting an encode at a 785px viewport height now lands the cryptogram, key, and downloads on screen with zero scroll. But both branches were surgical, and surgery on two of three sibling views left a seam: Key view now differs from Encode and Decode on both dimensions the fixes addressed (layout model and stale-result handling), and it's now inconsistent in a way that actively teaches the wrong lesson - a user who learns on Encode that editing a parameter invalidates the result will trust that rule on Key, where it silently does not hold. A new P0 was also found in the process: the success-path scroll+focus fix (`revealResult`) actually fails outside the desktop two-column layout, because a synchronous `focus({preventScroll:true})` call cancels an in-flight smooth `scrollIntoView` animation - the exact mechanism REFACTOR-001's "animate" step built to fix "nothing visibly happens on submit" doesn't work in the one case (narrow/short viewport) where it's needed most.

## What's Working

1. **The key result card remains the best-designed object in the product**, and it's now byte-consistent in its visual treatment even as its behavioral consistency (staleness handling) has diverged from its sibling on Key view.
2. **Error prevention is quietly excellent**: gated submit, bounded pivot size, tolerant key normalization with a clear explanation of why it won't guess on genuinely malformed input, gated file extensions, explicit weakness-warning override.
3. **The rotation picker's keyboard implementation verified end-to-end as correct** - real DOM focus movement, roving tabindex, grab/move/drop, Escape-to-cancel from a saved snapshot, and a live-region announcement on every transition.

## Priority Issues

**[P0] A successful encode is invisible outside the two-column desktop layout.**
Why it matters: verified live via a real mouse click (not a synthetic submit) in the single-column layout - `scrollY` stays unchanged, the result lands as a 16px sliver at the very bottom of the viewport. The cause: `reveal-result.ts` calls `el.focus({preventScroll:true})` immediately after a smooth `scrollIntoView`, and the focus call cancels the in-flight scroll animation (confirmed by isolating: `behavior:'auto'` completes the scroll, `behavior:'smooth'` immediately followed by focus does not). This is the exact "nothing happens on submit" defect REFACTOR-001's animate step was built to fix, still present whenever the two-column layout doesn't apply - which is the entire mobile experience and any short desktop viewport.
Fix: in `frontend/src/utils/reveal-result.ts`, either switch to `behavior:'auto'` (a jump is honest, needs no motion budget) or await the scroll's completion before focusing.
Suggested command: /impeccable adapt

**[P1] REFACTOR-003 traded a stale-data bug for a silent data-loss bug.**
Why it matters: verified for pivot size, message, and size changes - the entire result panel (cryptogram, key, downloads) disappears with no message, no undo, immediately after the exact keystroke that fixes a typo. The app's own copy says the key "is not stored anywhere," then deletes it from the screen in response to a one-character edit.
Fix: keep the result mounted and mark it stale instead of unmounting it - dim the preview, disable Copy/downloads, show an inline "these parameters changed, re-encode to update" notice with a one-click re-encode action.
Suggested command: /impeccable harden

**[P1] The output column is an unexplained void, and the title floats over it.**
Why it matters: measured on an untouched /encode at 1322x785 - the output column is 590px wide with 0 children before any submit, no empty-state content. The h1 uses `align-self:center` across the whole grid rather than over the form column it titles (306px optical offset from the form's own center, measured). The submit button sits 226px below the fold on a standard viewport height, so the user fills an off-screen form and presses a button they had to scroll to find, then the feedback appears in a column they weren't looking at.
Fix: give the output column an idle empty-state card; align or re-scope the h1 to the column it actually titles; bring the submit closer to view.
Suggested command: /impeccable layout

**[P1] The Key view was left behind by both fixes and now contradicts them.**
Why it matters: verified live - generating a key then changing the pivot block size leaves the old key on screen with a live Copy button (the exact bug REFACTOR-003 removed from Encode, still present here, and now inconsistent rather than uniform). Key view also keeps the pre-REFACTOR-002 single-column stacked-card layout instead of the two-column model, and the parser echoes raw codes (`ccw`, `BT-LR-ALT`) the generator's own dropdowns render as plain English two inches away.
Fix: port `invalidateResult()` to the key store; share one label map between generator and parser instead of two; bring Key view onto the same layout model as Encode/Decode above 900px.
Suggested command: /impeccable harden

**[P2] Contrast: the resting (disabled) state of every primary button is barely readable, and form fields have no visible boundary.**
Why it matters: measured - disabled primary button label at 1.81:1 (this is the arrival state of every screen, not an edge case); input/select/textarea borders at 1.27:1 against a 3:1 non-text-contrast requirement, so fields have no perceivable edge; the active nav link narrowly misses 4.5:1 at 4.39:1. The Decode size-hint fix from the prior round is confirmed holding at 4.93:1.
Fix: replace the blanket opacity-0.5 disabled treatment with an explicit disabled token pair that stays readable and explains what's missing; darken --border to clear 3:1 in both themes.
Suggested command: /impeccable audit

## Persona Red Flags

**Jordan (confused first-timer):** faces four unexplained parameters with no tooltip or docs link before doing anything; the Decode submit button, disabled, reads as "this feature is broken" at 1.81:1 contrast; fixes a typo after a successful encode and watches the result vanish with no explanation.

**Sam (accessibility-dependent):** the cryptogram SVG has no accessible name at all (verified: no role, no aria-label, no title child) - the product's actual output is an unlabeled graphic; form field borders are imperceptible at 200% zoom or in bright light; on a failed submit, focus stays on BODY instead of moving to the error (the success path correctly moves focus, the error path doesn't).

**Casey (distracted mobile user):** the P0 above is Casey's entire experience - press Encode, nothing visibly happens; the Encode form is roughly two and a half mobile screens of scrolling before reaching the submit button; no state persists across an interruption, and the key is explicitly unrecoverable if lost mid-session.

## Minor Observations

Download SVG ships with an empty `class=""` while Download PNG is a styled secondary button (a real regression introduced somewhere in the button-system rollout) - "Copy or download it now" promises a key download that doesn't exist, only image downloads - the cryptogram preview caps at 280px inside a 480px column, smaller than the textarea that produced it - no route from a fresh Encode result into Decode to verify it round-trips - no way to clear a chosen file on Decode, only replace it - reading-order codes render raw in the select's options, the only control in the app with no human-language labels.

## Questions to Consider

- What if the cryptogram filled the output column instead of sitting at 280px in a corner of it - is a picture-first layout worth exploring now that the column exists?
- Silent deletion was the wrong remedy for a real problem (stale results) - what does a version look like where the result stays visible, goes stale, and asks to be refreshed instead of disappearing?
- Three views, three different combinations of layout model and invalidation rule - is it worth deciding once what "input surface + result surface" means in this product and applying it uniformly before the next fix branch?
