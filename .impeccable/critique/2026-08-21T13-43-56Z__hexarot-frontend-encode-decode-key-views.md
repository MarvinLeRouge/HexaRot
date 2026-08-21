---
target: HexaRot frontend (encode, decode, key views)
total_score: 15
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
timestamp: 2026-08-21T13-43-56Z
slug: hexarot-frontend-encode-decode-key-views
---
# Critique #6 — HexaRot frontend (encode, decode, key views)

Method: dual-agent (A: design-review subagent · B: detector/browser-evidence subagent). Target: `main` @ `256994c` (post-merge `fix/encode-result-size-visibility`).

**Notable finding: the just-merged size-visibility fix introduces a security regression.** The decryption key is now embedded in the downloaded filename (`hexarot-large-HR1a3f9.png`), directly under a sentence claiming "Neither is stored anywhere." A cipher's security model depends on the key traveling on a separate channel from the cryptogram - the filename breaks that. See P0 below.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3/4 | Solid skeletons/spinners, but a garbage `?`-filled decode renders identically to a correct one |
| 2 | Match System / Real World | 2/4 | Five domain terms (pivot block, rotation sequence...) never explained |
| 3 | User Control and Freedom | 1/4 | Leaving Decode wipes file+key+size unconditionally; a failed retry destroys the previous result |
| 4 | Consistency and Standards | 2/4 | Encode has a Copy button for the key, Decode has none for the decoded message; Key page's hint still says "key alone" while Encode's says "key + size" |
| 5 | Error Prevention | 1/4 | The single most preventable failure (wrong size at decode) is left 100% to memory |
| 6 | Recognition Rather Than Recall | 1/4 | The size fix is a recall aid, not recognition - nothing connects the 3 views |
| 7 | Flexibility and Efficiency | 1/4 | No cross-view flow, no history, no URL state |
| 8 | Aesthetic and Minimalist Design | 2/4 | The decoded message overflows 9087px off-screen (see P0) |
| 9 | Error Recovery | 2/4 | Good error copy and focus management, but no recovery action and 2.0:1 contrast on stale-state buttons |
| 10 | Help and Documentation | 0/4 | Still zero |
| **Total** | | **15/40** | **Poor** |

Independent recalibration by a fresh reviewer (not a diff against 13/40 - read the delta as noise, not progress). Notably, two of this round's defects are directly caused by the fix that was just merged.

## Design Specificity Verdict

Mostly generic, with two authored moments: the decision not to dim the cryptogram when stale (documented in a code comment), and the forgiving key normalizer. Everything else - forms, empty states, error strings - is default-shaped.

CLI scan + browser overlay: 0 findings, "No anti-patterns found" on all 3 pages, same as prior rounds - the automated detector sees none of the serious issues below, all found through live measurement.

## Priority Issues

**[P0] The decryption key ends up in the downloaded filename**
Why it matters: verified live - `hexarot-large-HR1a3f9.png`. A cipher's whole security model depends on the key traveling on a different channel from the cryptogram. The product now writes the key onto the artifact the user emails/DMs, directly beneath a sentence promising the opposite. Anyone who intercepts the file gets the key for free.
Fix: drop the key from the filename (`hexarot-large-2026-08-21.png`, or just `hexarot-<size>.png`); keep only the size.
Suggested command: /impeccable harden

**[P0] A long decoded message overflows off-screen and is unreadable**
Why it matters: verified live with an 880-char no-space message: `scrollWidth: 9087` vs `clientWidth: 453`, no wrapping, no scroll container. The product's alphabet drops unknown characters, so real decodes routinely come back as long unbroken strings - exactly the input that breaks this. This is the one output the entire product exists to produce, and it is physically unreadable.
Fix: render the result in a card with `overflow-wrap: anywhere; white-space: pre-wrap; max-height: 40vh; overflow-y: auto`, plus a Copy button (Decode has none).
Suggested command: /impeccable shape

**[P1] The size fix displays a value that doesn't match the cryptogram shown**
Why it matters: the panel reads live `store.size`, not a snapshot of the size that actually produced the result. Verified live: encoded at Large, changed the dropdown to Small without re-encoding - the panel still showed the Large key next to "Cryptogram size: Small" above the intact Large preview. It presents a mismatched key/size pair as a matched credential - exactly the failure mode the component's own comment (about not dimming the cryptogram) calls unacceptable, now applied to the size.
Fix: snapshot the size into `EncodeResult` at request time (`this.result = { ...response, size: this.size }`), read `props.result.size` instead of `store.size`.
Suggested command: /impeccable harden

**[P1] Copy only copies half of what the copy tells you to copy**
Why it matters: `navigator.clipboard.writeText(props.result.key)` - verified live, clipboard receives only `"HR1·a3f9"`. The sentence right above it says "you'll need the key AND the size... copy or download them now." Clipboard is the dominant path for sharing a key, and the product just told the user the size is half the credential, then silently drops it at the exact moment the user follows that instruction.
Fix: make Copy emit `HR1·a3f9 · Large`, relabel the button "Copy key and size".
Suggested command: /impeccable clarify

**[P1] Encode and Key overflow horizontally on every phone**
Why it matters: measured by both agents, converging root cause. The reading-order `<select>`'s intrinsic width is set by its longest option ("Left to right, top to bottom (alternating rows)", added in round 4) - 407px, forcing the whole form to overflow. At a simulated 360px width: ~97px of real page-level horizontal overflow (independently confirmed by both agents at 67-97px depending on width). A round-4 accessibility fix (translating reading order) silently regressed responsive layout.
Fix: `select { max-width: 100%; }`, `min-width: 0` on flex form fields, `flex-wrap: wrap` on the rotation picker.
Suggested command: /impeccable adapt

**[P2] The stale state renders its own escape hatch illegible - corroborated by both agents, 3rd consecutive critique**
Why it matters: measured by both agents with the full composited opacity chain: the new size label, hint, and Copy/Download buttons drop to 1.97-2.03:1 in the stale state (vs. 4.5:1 required). This is the same defect critique #4 and #5 found on other elements - blanket opacity uniformly degrades everything it wraps, including the text most needed to recover.
Fix: replace opacity with dedicated `--text-stale`/`--surface-stale` tokens, each individually contrast-checked.
Suggested command: /impeccable harden

**[P2] Navigating away from a failed submit destroys everything the user typed**
Why it matters: confirmed live by both agents across all 3 stores - `decode.ts`/`encode.ts` null `result` before the request even starts, and `DecodeView.vue` resets the store unconditionally on unmount. A failed decode followed by a visit to `/key` (the page that explains keys) and back wipes file, key, and size.
Fix: preserve form state on unmount, only clear the result after explicit confirmation.
Suggested command: /impeccable harden

## Persona Red Flags

**Jordan (first-timer)**: no answer anywhere to "what is this?" Five undefined domain terms on one screen. "Suppress weakness warnings" is offered before any warning has ever been seen. A garbage `?`-filled decode looks exactly like a correct one - Jordan will believe the ciphertext was corrupted rather than that they picked the wrong size.

**Sam (accessibility)**: stale-state contrast failures at 2.0-2.03:1 (size line, hint, both action buttons). The active nav link fails AA (4.39:1) and is color-only with no other indicator. `<input type="file">` has no label, no id, no aria-label. The rotation picker's `role="listbox"`/`aria-selected` is repurposed to mean "grabbed," which screen readers announce incorrectly as "selected."

**Casey (mobile)**: ~97px of horizontal page overflow at 360px on Encode and Key. The stale badge overlaps the cryptogram cells at narrow widths (measured overlap grows from 0 at desktop to 1230px² at 360px app width) - directly contradicting the panel's own "the colors are the message" principle.

## Round-fix Verification (size-visibility fix)

Partially verified - it renders correctly, but does not hold up:
- Size renders next to the key: confirmed
- Download filename includes size and key: confirmed, but this IS the P0 security problem
- Updated keyHint copy is live: confirmed
- Displayed size is correct: FAILS - bound to live store state, not a result snapshot (P1 above)
- Size is legible when it matters: FAILS - 2.0:1 in the stale state (P2 above)
- Size is portable via Copy: FAILS - Copy drops it (P1 above)
- Filename channel is safe: FAILS - carries the key (P0 above)
- Filename channel is read: FAILS - Decode ignores the filename entirely, verified with a file named `hexarot-large-HR1a3f9.png`

## Minor Observations

- The Key generator's hint still says "This key is not stored anywhere. Copy it now" - no mention of size - while Encode's hint now says "key and size." Two contradictory statements about what constitutes a credential, two clicks apart.
- The parsed-key result is a `<dl>` with no action - nothing lets you push those parameters into the Encode form.
- No Cmd/Ctrl+Enter submit from the message textarea.
- `--accent-contrast` is identical in light and dark mode (`#08060d`), never actually re-derived for the dark accent - passes by luck.

## Questions to Consider

1. If the size is genuinely half the credential, why isn't it folded into the key format itself? Every fix in this space will be a workaround until the key is self-sufficient.
2. The download filename is the only place both halves of the credential live together - and it's the one artifact handed to an adversary. Was that trade examined, or did "put the size somewhere" get satisfied by the first available string?
3. Three critiques have now flagged the `opacity: 0.5` stale pattern degrading legibility. Is "stale" a visual treatment, or does it deserve its own designed tokens?
