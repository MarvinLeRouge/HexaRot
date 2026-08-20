---
target: HexaRot frontend (encode, decode, key views)
total_score: 9
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
timestamp: 2026-08-19T21-20-04Z
slug: hexarot-frontend-encode-decode-key-views
---
Method: dual-agent (A: design review · B: detector + browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 1 | Active nav link renders identically to inactive ones (dead --accent); submitting Encode changes nothing visible - result lands ~600px below the fold, no scroll, no aria-live, no spinner |
| 2 | Match Between System and Real World | 1 | LR-TB-ALT, "Pivot block size", GCD(pivotBlockSize=5, symbolWidth=2) - backend variable names surfaced verbatim in UI copy, zero glossary |
| 3 | User Control and Freedom | 1 | No way to remove an uploaded file once selected; no reset/start-over; no cancel on an in-flight request; no undo on a rotation drag |
| 4 | Consistency and Standards | 2 | Terminology and structure are genuinely consistent, but placeholder casing drifts (HR1·xxxx vs HR1·XXXX), and only Decode resets on unmount / gets aria-live |
| 5 | Error Prevention | 1 | Key validator trims input but the stores submit untrimmed - a pasted key with a trailing space passes client-side, fails server-side |
| 6 | Recognition Rather Than Recall | 1 | Decode demands the exact size used at encode time; the app never records or displays it anywhere |
| 7 | Flexibility and Efficiency of Use | 1 | Rotation picker is entirely outside the tab order (tabIndex: -1 x4); no shortcuts, no presets, no shareable state |
| 8 | Aesthetic and Minimalist Design | 0 | src/style.css - a real token system with an accent colour, dark mode, and layout - is never imported anywhere. The app renders as unstyled Times New Roman |
| 9 | Help Users Recognize/Diagnose/Recover from Errors | 1 | Raw text "Internal Server Error" observed live as user-facing copy; errors are colour-only, no aria-invalid, no recovery guidance |
| 10 | Help and Documentation | 0 | One help string exists in the entire product |
| **Total** | | **9/40** | **Critical** |

No heuristic scored n/a - this is an Operate surface, all ten genuinely apply. 9/40 is a pre-design baseline, not a verdict on the engineering underneath it: most of these zeros trace to one root cause below.

## Design Specificity Verdict

**The root cause, confirmed live:** src/style.css defines a complete token system (accent purple, code background, dark-mode block, centred 1126px container) - and is never imported by main.ts or linked in index.html. getComputedStyle on the live page confirms --sans resolves to "" and the root font-family computes to "Times New Roman". This isn't a missing design pass - it's a written design pass that was never wired up. Every var(--border), var(--accent) reference across all ten components silently unsets its whole declaration.

The deterministic scan (Assessment B) found zero anti-patterns in the markup itself - expected, since "the stylesheet import is missing" isn't a pattern a static CSS/HTML scanner can see. It did catch one real, reproducible signal on live /encode: an overused-font finding (Roboto, 15% of text) - meaning a stray web font loads independently of style.css (likely a leftover <link> in index.html) and paints a fraction of text while the rest falls back to serif. Worth resolving in the same pass. A dark-glow finding on /decode and /key was traced to DOM elements literally named claude-agent-glow-border-inner - confirmed to be the browser-automation extension's own injected UI, not HexaRot's code. Excluded as a false positive.

Once the stylesheet is wired up, the product has real material to be specific with: the cryptogram itself - nine saturated colours on a rigid grid, deliberately scrambled - is a complete, unused visual language sitting in the one place users actually look.

## Overall Impression

Nothing here is a bad decision executed badly - it's good decisions (the token system, the i18n discipline, the mode-toggle disclosure, uniform submit-gating) sitting disconnected from the rendered page. The single biggest opportunity is also the cheapest fix in the whole report: importing one file changes the product's baseline more than any other change available.

## What's Working

1. The encode mode toggle is real progressive disclosure (EncodeParamsForm.vue:40-58, 68-126) - cleanly swaps four parameter controls for one key field based on actual user intent, not just visual toggling.
2. Submit gating is disciplined and uniform across all four forms (canSubmit/canGenerate/canParse), plus a genuinely well-built copy-to-clipboard state machine (EncodeResultPanel.vue:14-26) with an explicit denial catch most products skip.
3. Total i18n discipline - zero hardcoded copy anywhere, the whole product's voice lives in one 152-line en.json. A full copy rewrite is a one-file job, not a ten-component hunt.

## Priority Issues

**[P0] src/style.css is never imported - the design system is dead code.**
Why it matters: Removes real affordances, not just polish: no visible drop zone on Decode (the dashed border unsets entirely), no active-nav indicator, rotation-picker chips look like inert text.
Fix: Add the import, then re-audit since wiring this up will surface two currently-masked issues - a --text-muted token is missing so de-emphasized hints will render at full weight, and there are zero :focus-visible rules anywhere in the codebase, currently invisible only because browser defaults are still active.
Suggested command: /impeccable polish, then /impeccable layout for centring/rhythm

**[P0] The rotation sequence picker is completely unreachable by keyboard.**
Why it matters: All four items are tabIndex: -1, no roles, no keyboard handlers - verified in the accessibility tree. A keyboard/screen-reader user is locked to the default rotation sequence on both Encode and Key views: a functionally weaker product, not a degraded one.
Fix: role="listbox"/role="option", roving tabindex, Arrow keys to move, Space to grab/drop, a polite live-region announcement of the new order, and a visible grab handle.
Suggested command: /impeccable harden

**[P1] Raw server internals are the error UI.**
Why it matters: Observed live: the literal string "Internal Server Error" as user-facing copy; backend GCD warnings rendered verbatim.
Fix: Map HTTP status + backend error codes to localized, actionable strings; keep raw text behind a collapsed "Technical details".
Suggested command: /impeccable clarify

**[P1] Nothing visibly happens on submit.**
Why it matters: No scroll, no focus move, no aria-live on Encode/Key results (only Decode has one), no spinner - confirmed via before/after screenshots that were pixel-identical.
Fix: Scroll result into view and move focus to its heading on success; aria-live="polite" + aria-busy while loading; inline spinner in the button.
Suggested command: /impeccable animate

**[P1] The key - the entire point of the product - is the smallest text on the page.**
Why it matters: 13px inline <code>, upstaged by a duplicated, unlabelled PNG/SVG preview and a red warnings box.
Fix: One preview (SVG) at a deliberate size; promote the key to a bordered, large, monospace block above the preview with copy + download-with-key actions and one line of reassurance copy.
Suggested command: /impeccable bolder

## Persona Red Flags

**Jordan (confused first-timer):** browser tab reads "frontend", no product name anywhere in the UI; 8-option reading-order dropdown with zero explanation of any value; clicks Encode, nothing changes, clicks again.

**Sam (accessibility-dependent):** cannot set rotation sequence at all (keyboard-locked out of one of four cipher parameters); "Rotation sequence" and "Cryptogram file" labels are orphan divs with no for/aria-labelledby; key-format error re-fires on every keystroke from the first character typed.

**Riley (stress tester):** picks the wrong file on Decode and can't unpick it (no clear control); renames photo.jpg to photo.png and it sails through client validation into a raw server error; navigates Encode -> Decode -> Encode and finds the previous plaintext message still sitting there (Encode never resets on unmount, unlike Decode/Key) - a plaintext secret persisting in a cipher tool.

## Minor Observations

index.html still ships <title>frontend</title> - placeholder casing drifts between views - message textarea defaults to 2 rows for what's meant to hold an entire secret - overrideWeaknessWarning exists on Encode but not the Key generator - a full prefers-color-scheme: dark block exists in the dead stylesheet, so dark-mode users currently get pure white - the app's one fieldset explicitly disables its own border/padding, turning off the only native grouping primitive present.

## Questions to Consider

- Why does the encode form ask for five cipher parameters before asking whether the user wants to choose them at all - what if the default path were one textarea, one button, and "Cipher settings" collapsed behind a disclosure?
- The key is the product - why can the app ever hand back a cryptogram without the key physically attached to it (in the filename, embedded in the PNG, bundled)?
- The one thing this product makes that nothing else does - a sentence turned into a grid of colour - appears twice, unlabelled, 24 pixels tall. What if the result were a full-bleed hero where the grid animates in cell-by-cell along the chosen reading order?
