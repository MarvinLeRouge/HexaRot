# 1. No message-length exposure in the cryptogram

## Status

Accepted

## Context

An early design (FEAT-008) built a fixed-size binary header (`encodeHeader` /
`decodeHeader` in `backend/src/cipher/header.ts`, a 2-byte `Uint16BE` storing the
message's character count) that was originally planned to be rendered as a
visual row above the grid by the PNG/SVG renderers (FEAT-009/FEAT-010), so a
decoder could know exactly where the real message ends and random padding
begins.

That plan was reversed before the renderers shipped: both `PngRenderer` and
`SvgRenderer` explicitly draw the grid "with no header of any kind." Exposing
the message length, even indirectly through a visually distinct row, leaks
information about the plaintext an attacker does not otherwise have, undermining
the cipher's own anti-leakage goal. `header.ts` remains in the codebase but is
never called by the encode or decode pipeline.

This left an open question on the decode side: without a length header, how
does decoding know where the real message ends and padding begins? FEAT-012's
design spec considered two options:

1. Stop decoding at the first symbol block that doesn't match any known
   character (padding blocks are usually, but not always, unrecognizable).
2. Decode every block unconditionally, real message and padding alike, marking
   unrecognized blocks with a placeholder character, with no attempt to guess
   where the real content ends.

## Decision

No message-length metadata is ever stored in the key or rendered into the
cryptogram. Decoding always processes the full grid (option 2 above): the real
message decodes to its exact original characters (always recognizable, by
construction), followed by the padding region, most of which decodes to the
`?` placeholder (`UNRECOGNIZED_PLACEHOLDER` in `decode-grid.ts`), occasionally to
a real character by coincidence.

No heuristic judgment call is made about where the message "really" ends; that
determination is left entirely to whoever reads the response. This is a more
honest design given that no signal is reliable enough to make that call
correctly 100% of the time: guessing wrong would either silently truncate real
content or silently append garbage, in a way the caller cannot detect or
correct.

## Consequences

- The key remains genuinely message-independent and reusable across messages of
  different lengths, since no length-specific data is embedded anywhere.
- Decoded output routinely contains trailing `?` characters (or, rarely, other
  characters by coincidence) that are not part of the original message; API
  consumers and the frontend must treat this as expected behaviour, not an
  error.
- The round-trip acceptance criterion for encode/decode is not strict equality
  on the full decoded string; it accounts for this trailing padding region.
- Message-boundary detection (distinguishing real content from padding-derived
  noise in decoded output) remains genuinely unsolved by design, not by
  oversight. A future evolution could revisit this with a key-dependent
  encoding or a different heuristic; the current design deliberately does not
  attempt one.
- `header.ts`'s `encodeHeader`/`decodeHeader` are dead code relative to the
  actual pipeline. They are kept for now rather than removed, since no backlog
  item has revisited whether to delete them or repurpose them outside the
  visual cryptogram.
