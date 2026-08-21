---
target: HexaRot frontend (encode, decode, key views)
total_score: 14
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-08-21T15-56-57Z
slug: hexarot-frontend-encode-decode-key-views
---
# Critique #7 — HexaRot frontend (encode, decode, key views)

Method: dual-agent (A: design-review subagent · B: detector/browser-evidence subagent). Target: `main` @ `d8573ce` (post-merge `fix/critique-6-security-and-readability`).

**New security finding, more severe than the one just fixed:** the decryption key travels in a GET query string (`/api/key/parse?key=HR1%C2%B7a1b2`), landing in server access logs, reverse-proxy logs (Traefik locally), and browser cache — a more durable, shared channel than a local filename. Ironic: the code comment added by the last fix batch states the exact principle ("a cipher's key must travel on a separate channel from the cryptogram it decrypts") without applying it to this second channel. See P0 below.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3/4 | Solid skeletons/badges, but Decode's skeleton (60px) doesn't match the real result height (276px) |
| 2 | Match System / Real World | 1/4 | Errors show raw API field names (`pivotBlockSize`) instead of UI labels |
| 3 | User Control and Freedom | 1/4 | A failed request destroys the previous result; the stale state disables Copy and Download - the only two ways to save an unrecoverable artifact |
| 4 | Consistency and Standards | 2/4 | Encode preserves its result on navigation, Decode and Key reset unconditionally |
| 5 | Error Prevention | 2/4 | Nothing prevents this product's real failure mode: the panel renders live `store.size`, not the result's actual size |
| 6 | Recognition Rather Than Recall | 1/4 | Decode demands remembering the encode size, with no aid or file thumbnail |
| 7 | Flexibility and Efficiency | 1/4 | No shortcuts, no history, no handoff between Key and Encode |
| 8 | Aesthetic and Minimalist Design | 1/4 | The cryptogram (the product's artifact) is 280px inside a 1202px mostly-empty screen |
| 9 | Error Recovery | 2/4 | Good focus/role=alert, but API-vocabulary messages, no recovery action |
| 10 | Help and Documentation | 0/4 | Still zero |
| **Total** | | **14/40** | **Poor** |

## The systemic contrast fix is fully validated - no caveats

Both agents independently confirm: zero WCAG AA failures across all 4 stale surfaces, in both light and dark mode. First time in 4 rounds. All text >=4.93:1 light / >=5.52:1 dark, all non-text elements >=3.40:1. The recurring bug from rounds 4, 5, and 6 (1.97-2.11:1 composited) is genuinely closed.

## Design Specificity Verdict

Still generic - default scaffolding wearing a domain vocabulary. Clearest signal: the cryptogram (the one visually distinctive artifact) renders once, at 280px, inert, never connected to the controls that produce it.

CLI scan + overlay: 0 findings on all 3 pages, as every round - none of the serious bugs below are visible to the automated detector.

## Priority Issues

**[P0] The key travels in a GET query string**
Why it matters: `stores/key.ts` calls `getJson('/key/parse', { key: ... })`, becoming `GET /api/key/parse?key=HR1%C2%B7a1b2`. Unlike the filename (fixed last round), a query string is written by default into server logs, reverse-proxy logs, and browser cache - a shared, durable channel, not a single user's local file.
Fix: make `/api/key/parse` a POST with the key in the JSON body, or parse the key entirely client-side (format is already validated and deterministic, no server round trip needed).
Suggested command: /impeccable harden, then an owasp-security pass on the API surface.

**[P1] The stale state disables the only ways to save a still-valid result - confirmed by both agents**
Why it matters: Copy and both Download buttons go disabled the moment any field changes, on all 4 surfaces. The adjacent text says "Neither is stored anywhere - copy or download them now." A user who fixes a typo after encoding loses the ability to save the artifact still on screen, with no explanation on the disabled controls.
Fix: keep Copy and Download enabled while stale - "stale" means "may not reflect current settings," not "invalid."
Suggested command: /impeccable edge-cases

**[P1] A failed request destroys the previous result, on all 4 surfaces - confirmed with precise DOM sampling by both agents**
Why it matters: verified live with 40ms sampling across all 4 stores - the successful result disappears from the DOM before the failing response even arrives. The key generator is worst: its own text says "This key is not stored anywhere. Copy it now," and a transient error on regenerate destroys it with no undo.
Fix: only clear the result after explicit confirmation, never at the start of a new request.
Suggested command: /impeccable harden

**[P1] The result panel displays a size that doesn't match the result shown**
Why it matters: verified live by both agents - encoded at Small, changed the dropdown to Large without re-encoding, panel shows "Cryptogram size: Large" next to the intact Small key and cryptogram. Partial mitigation: this change also triggers stale, which disables downloads - so the wrong size can't leak into a filename today, but it's one `:disabled` removal away.
Fix: snapshot the size into EncodeResult at request time, stop reading live `store.size`.
Suggested command: /impeccable edge-cases

**[P2] Copy only copies the key, not the size**
Why it matters: verified live - clipboard receives only `HR1·a1b2`, while the adjacent text explicitly says "you'll need both this key and the cryptogram size."
Fix: make Copy emit `HR1·a1b2 · Large` together.
Suggested command: /impeccable clarify

**[P2] The reading-order select still overflows on mobile on Encode - root cause isolated, already fixed on Key**
Why it matters: measured in a real 360px viewport - 112px of horizontal overflow on Encode (slightly worse than before), 0px on Key and Decode. Root cause isolated: Encode's fieldset has `min-inline-size: min-content` and `box-sizing: content-box` (refuses to shrink), while Key has no fieldset and already uses `border-box` - exactly why Key is already clean. A targeted fix was verified live: `min-inline-size: 0; box-sizing: border-box` on the fieldset drops overflow from 112px to 0px.
Fix: apply this targeted fix to Encode's fieldset.
Suggested command: /impeccable adapt

**[P2] The "Out of date" badge overlaps and tints cryptogram cells - now quantified**
Why it matters: measured at 360px - 2 of 36 cells overlapped (24-38% of their area), and the badge's 8% opacity visibly tints underlying colors (measured RGB shift of 8-10 points on affected cells). This directly contradicts the component's own comment about color fidelity.
Fix: reposition the badge outside the SVG's box, or make it small/opaque enough to stay clear of cells.
Suggested command: /impeccable polish

**[P3] New accessibility regression: the decoded-message scroll container isn't keyboard-reachable beyond its visible height**
Why it matters: the decoded message's scrollable container (`overflow-y: auto`, added by the last readability fix) has no tabindex, role, or aria-label - a keyboard user can only read the first ~260px of a long message (93% of a 7200-char test message was unreachable).
Fix: add `tabindex="0"` and an aria-label to the scroll container itself.
Suggested command: /impeccable harden

## Round-fix Verification

| Fix | Status | Evidence |
|---|---|---|
| Filename security (key removed) | PASS, both agents | Filenames `hexarot-large.png/svg`, no key substring found via brute-force search |
| Decode readability (wrap + scroll + copy) | PASS, both agents | 0px page overflow with a 7200-char message, capped at 40vh, scrolls correctly, Copy delivers exact content |
| Systemic stale-contrast (dashed border, no opacity) | PASS, both agents, all 4 surfaces, both themes | Zero WCAG AA failures found, opacity:1 everywhere in the ancestor chain |

## Minor Observations

- Unknown `readingOrder` values leak a raw i18n key path (e.g. `readingOrder.ltr-ttb-alt`) with no fallback - only reachable on a backend/frontend enum drift, low severity.
- The "characters dropped" block renders with no border/padding/background - silent data loss is the least visually prominent element on the panel.
- `stores/encode.ts` initializes `rotationSequence` as permutation indices `[0,1,2,3]` while `/key/parse` returns actual degrees - two different value domains rendered identically as "0°, 90°, 180°, 270°" on the same screen.

## Questions to Consider

1. The fix batch wrote down the right principle - "a cipher's key must travel on a separate channel" - and then left the key in a GET query string. If the principle is real, where else does it apply?
2. "Copy or download them now, nothing is stored" and "your Copy and Download buttons are disabled" appear on screen at the same time. Which is the product's actual position?
3. Encode remembers its result across navigation; Decode and Key forget theirs. Is that a decision, or is it three different code paths that were never reconciled?
