---
target: HexaRot frontend (encode, decode, key views)
total_score: 18
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-08-20T09-40-23Z
slug: hexarot-frontend-encode-decode-key-views
---
Method: dual-agent (A: design review · B: detector + browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Spinner + aria-busy + "Encoding..." now land across all five forms. But the result panel goes stale: edit the message/params after a success and the old cryptogram and key stay on screen, downloadable, with no indication they no longer match the form. |
| 2 | Match System / Real World | 2 | Parse result prints `cw` where the form says "Clockwise". Reading order offers 8 raw codes (`LR-TB`, `BT-LR-ALT`) with zero explanation. Warning bullets still read raw GCD math under the friendly intro sentence. |
| 3 | User Control and Freedom | 2 | No cancel on in-flight requests, no "start over", no way to dismiss a stale error or result. Escape-to-cancel in the rotation picker is a genuine win and the only real undo in the product. |
| 4 | Consistency and Standards | 2 | Key result block is now identical on Encode and Key - a real win. But Encode/Decode forms are bare while Key forms are cards; the same 4 params get a fieldset+legend on Encode and none on Key; the parse result is an unstyled `<dl>` while the generate result is an accent card. |
| 5 | Error Prevention | 1 | Navigating away destroys the key with no confirmation (P0 below). Key separator `·` (U+00B7) is untypeable on any standard keyboard layout. Decode's size field has no fallback path, and the warning about it is the lowest-contrast text on the page (confirmed by detector: 2.7:1, needs 4.5:1). |
| 6 | Recognition Rather Than Recall | 2 | Decode requires recalling which size was used at encode time - nothing on screen or in the key carries it. Parse gives you parameters but offers no handoff into Encode. |
| 7 | Flexibility and Efficiency | 1 | No Cmd/Ctrl+Enter submit. Keyboard reordering reaches only ~4 of 24 possible sequences (P1 below - a real defect in the harden-step fix, not by design). No URL prefill, no Parse-to-Encode handoff. |
| 8 | Aesthetic and Minimalist Design | 2 | The primary action of the entire product is a 480x30px unstyled native button. Hierarchy is inverted: "Download PNG" is the only accent-styled button in the app while "Copy" - the action the key's own hint text instructs - is a bare button. |
| 9 | Error Recovery | 2 | "Couldn't encode this message: Internal Server Error" - friendly prefix over an unchanged raw payload, no icon, no container, no retry button. Work is preserved on error, which is worth something. |
| 10 | Help and Documentation | 1 | Zero. No help link, no tooltip, no glossary. The `keyHint` sentence is the only explanatory copy in the product. Nothing says what a pivot block size, rotation sequence, or reading order does. |
| **Total** | | **18/40** | **Poor - major UX overhaul required** |

Baseline was 9/40 (Critical). This is a genuine doubling and a band change (Critical -> Poor). All ten heuristics genuinely apply (Operate surface); none marked n/a.

## Design Specificity Verdict

**LLM assessment:** Still largely category-interchangeable, with three authored exceptions. Strip the words "HexaRot", "cryptogram", and "rotation" and this is indistinguishable from a generic admin form. Every input, select, textarea, and button is an unstyled browser default. On a 1280px viewport roughly 60% of the canvas is empty white next to a centered 480px column.

The three real exceptions: the key card (accent-tinted, uppercase micro-label, large monospace value, reassurance copy, copy action - identical between Encode and Key, which is a hard consistency win), the rotation chips (direct-manipulation objects with a grab handle, reading as physical tokens), and the elevated preview card (border + shadow, correctly framing the artifact). But the product's entire premise - a message becomes a picture - renders that picture at 280px inside a 480px card, stacked below a 900px form, smaller than the key text beneath it. Decode, where the user uploads one of these pictures, never shows the picture back at all.

**Deterministic scan (Assessment B):** `detect.mjs --json` over frontend/src/views, components, layouts: exit 0, zero findings - clean at the static markup/CSS level, as expected (structural/hierarchy issues aren't statically detectable).

**Live browser overlay (Assessment B):** injection succeeded on all three routes (/encode, /decode, /key).
- /encode: "No anti-patterns found."
- /decode: **1 real anti-pattern** - `low-contrast: 2.7:1 (need 4.5:1) - text #a09aa8 on #ffffff`, on `p.decode-params-form__hint` (the "Must match the size used when the cryptogram was encoded" text). Traced to HexaRot's own markup via the rendered screenshot, not a false positive.
- /key: "No anti-patterns found."

Manual computed-style spot check on a mocked successful encode: `body` font-family correctly resolves to `system-ui, "Segoe UI", Roboto, sans-serif` (confirms the Step-0 stylesheet fix held), and `.encode-result-panel__key` computes `background: rgba(170,59,255,0.1)`, `border: 1px solid rgba(170,59,255,0.5)` - the accent-tinted key card is real, not just source code. Zero console errors or warnings during load or the encode interaction, on any of the three routes.

## Overall Impression

This is now a working tool a determined user can complete a task in - that was not true at 9/40. Submit feedback, key promotion, and error-copy framing are all real and landed cleanly, and the two assessments corroborate each other rather than conflict (the one contrast finding the detector caught live is the same class of defect Assessment A flagged independently and traced to a specific token). But the six fix passes were remediation of named complaints, not a design pass - the result is an app whose best-designed moment (the key card) sits inside an app where a nav click can destroy that key with zero warning, and where the primary submit button remains a 30px unstyled native control.

**The single biggest opportunity:** stop stacking. On desktop, put the form and the cryptogram side by side and let the artifact be large. That fixes the dead canvas, fixes the scroll-to-result problem (verified: on Encode success the page runs out of scrollable height before the result panel reaches the viewport top - scrollY maxes out at 561 with the result still sitting at y=368), and finally puts the picture at the center of a product about pictures.

## What's Working

1. **The key moment is genuinely well-designed and consistent.** Accent-bordered block, tinted ground, uppercase micro-label, large monospace value with `word-break: break-all`, a reassurance sentence naming the stake, a copy button with a 2-second "Copied!" confirmation and a distinct failure state - byte-identical between EncodeResultPanel and KeyGeneratorForm. Two components, one pattern, no drift.
2. **Submit feedback is complete and uniform across all five forms** - aria-busy, a LoadingSpinner with a working prefers-reduced-motion guard, a verb-tense label swap, a disabled guard. Zero exceptions.
3. **The warnings copy now frames rather than dumps.** "This combination weakens the cryptogram's rotation pattern. You can proceed anyway, or adjust the pivot block size to remove the warning:" names the consequence, grants permission, and points at the lever.

## Priority Issues

**[P0] Navigating between tabs silently destroys the key, the cryptogram, and the message.**
Why it matters: verified live - encode a message, get a key and a cryptogram, click "Decode" then "Key" would not matter which - click back to "Encode" and the key, image, and message are all gone, no confirmation, no recovery. This regressed in this session's own final polish step: `onUnmounted(() => store.reset())` was added to EncodeView.vue "for consistency with Decode and Key" - but Decode's result is a re-derivable decoded message and Key's is a re-generatable key; Encode's result is the one artifact the app's own copy calls irreplaceable ("not stored anywhere"). The consistency fix built a symmetric API around an asymmetric risk.
Fix: don't reset the Encode store on unmount while `status === 'success'`; reset on a new submit or an explicit "start over" instead. Consider a route-leave confirm when an uncopied key is on screen (copyState is already tracked).
Suggested command: /impeccable harden

**[P1] The rotation picker is keyboard-reachable but not keyboard-operable - only ~4 of 24 orderings are achievable.**
Why it matters: verified live - focus the "0°" chip, press ArrowRight: the roving tabindex model updates but DOM focus never follows to the new chip (the non-grabbed arrow branch calls `focusItem(key)` with the OLD key instead of the destination key, then the `@focus` handler resets `focusedKey` back). A keyboard user can never focus 90°/180°/270° directly. Grab-and-move works correctly once an item is picked up, and the live-region announcements and Escape-cancel are correct - which makes the un-navigable default state more surprising, not less.
Fix: in the non-grabbed arrow branch, focus the destination (`items.value[newPos].index`), not the origin. Also: `aria-selected` is being used to mean "grabbed" inside a listbox, which tells assistive tech something different; prefer `aria-roledescription` plus the existing live region. The grabbed visual state (accent border) is nearly masked by the focus ring - give it a stronger signal (fill, lift, or scale).
Suggested command: /impeccable audit

**[P1] The primary action is an unstyled 30px native button, and visual hierarchy is inverted.**
Why it matters: measured - the Encode submit button is 480x30px, a bare `<button>` with no background/border/radius/weight token, under the 44px touch minimum, and it's the single control every task in the product funnels through. Meanwhile "Download PNG" is the only accent-styled button in the app, and "Copy" - the action the key card's own hint text instructs the user to take - is an unstyled default button, subordinate to Download PNG below it. The root cause is one line in style.css: `button, select, input, textarea { font-family: inherit; font-size: 1em }` and nothing else - no primary/secondary button system exists anywhere in the app.
Fix: add primary/secondary/quiet button classes (primary: accent fill, >=44px, weight 600, hover/active) and apply primary to the four submit buttons and to Copy; drop Download PNG to secondary. Style inputs/selects to match (border, radius, accent focus).
Suggested command: /impeccable layout

**[P2] Three real contrast failures land on the most consequential text in the product.**
Why it matters: confirmed independently by both assessments. `--text-muted` (#a09aa8 light / #6b7280 dark) computes to 2.73:1 and 3.70:1 against their respective backgrounds - both fail the 4.5:1 AA minimum for body text (Assessment B's live detector caught this exact token live on /decode). It is used specifically on the Decode size hint - "Must match the size used when the cryptogram was encoded" - the single line most likely to prevent the most common decode failure, rendered in the least readable color in the palette. Separately, the hardcoded error red `#c0392b` (six components, no dark-mode variant) computes to 3.29:1 on the dark background - every error message in the product is sub-AA in dark mode, and it doubles as the warnings-box border color for a message whose own text says "you can proceed anyway."
Fix: raise `--text-muted` to >=4.5:1 in both themes without changing its hue family. Tokenize the error color as `--danger` with a dark-mode variant; give warnings their own `--warning` token instead of borrowing error red.
Suggested command: /impeccable audit

**[P2] The key format is untypeable and intolerant, and the error is non-diagnostic.**
Why it matters: the separator `·` (U+00B7 MIDDLE DOT) isn't on any standard keyboard layout. Verified rejections: `hr1·abcd` (no case folding), `HR1.abcd`, `HR1-abcd`, `HR1 abcd` - all rejected with the same message: "This does not look like a valid HexaRot key," which never states the expected shape, length, or which part failed. In a two-party protocol where a short string has to survive being retyped from a screenshot or read aloud, this is the weakest link.
Fix: normalize input before validating (uppercase the prefix, accept `·`/`.`/`-`/`_`/space as the separator and rewrite to canonical form); make the error diagnostic ("A HexaRot key looks like HR1·a3f9 - 'HR', a version number, a separator, then 4 characters").
Suggested command: /impeccable clarify

## Persona Red Flags

**Jordan (confused first-timer):** nothing on any page explains what HexaRot or a cryptogram is; "Pivot block size: 5" and an 8-option "Reading order" dropdown (`LR-TB`, `BT-LR-ALT`, ...) offer zero explanation at a decision point double the working-memory limit; "Copy or download it now" sends her hunting for a Download Key button that doesn't exist (Download PNG/SVG download the image, not the key).

**Sam (accessibility-dependent):** locked to one focusable rotation chip (see P1 above) - can reach 4 of 24 orderings despite the harden pass's own keyboard work; key-format `role="alert"` fires from keystroke one, so typing a valid key produces several consecutive interruptions; inputs carry no `aria-invalid`/`aria-describedby` linking them to their error text; the rotation-sequence label is a bare `<div>`, not a `<label>`, while the picker's own `aria-label` duplicates the same string (double-announced).

**Riley (deliberate stress tester):** finds the P0 in under two minutes via Encode -> Key -> Encode; separately discovers the result panel goes fully stale - edit the message and pivot size after a successful encode and the old cryptogram/key remain on screen, fully downloadable/copyable, producing a key/image pair that will never decode together, with zero staleness indicator.

## Minor Observations

The `<h1>` is centered while the form beneath it is left-aligned on all three views - the message textarea has no character counter despite the backend's known ~100kb body-size limit - the parse result renders as an unstyled `<dl>` directly below the accent-carded generate result, two outputs of the same tool with two different treatments - nav links (64x26px) and the checkbox (13x13px) are under the 44px touch-target minimum - the cryptogram preview keeps its cream background in dark mode, producing a bright rectangle inside a dark card - "Parse a key" surfaces four parameters with no handoff back into Encode, so the user retypes them by hand - no Cmd/Ctrl+Enter submit from the message textarea.

## Questions to Consider

- Why is the cryptogram - the one thing this product makes that nothing else does - the smallest element on a page about making cryptograms?
- What if encoding were live, re-rendering as rotation chips are dragged? It would teach what "rotation sequence" and "reading order" mean without a single tooltip, and make the eight opaque reading-order codes self-explanatory.
- Why does the key not carry the cryptogram size, given Decode asks the user to recall it and warns (in failing-contrast text) that a mismatch breaks decoding?
- If the key exists nowhere else, why is it one nav click away from permanent, unwarned deletion?
