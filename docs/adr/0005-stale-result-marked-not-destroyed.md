# 5. Mark stale results, don't destroy them

## Status

Accepted

## Context

Editing the message or any transform parameter after a successful encode
originally left the old cryptogram and key fully visible, downloadable, and
copyable on screen, with no indication that they no longer matched the current
form state: a user could produce a key/image pair that would never decode
together.

An initial fix (REFACTOR-003) introduced result invalidation on parameter
change, clearing the result back to an idle state. A follow-up design/UX
critique round (critique #7) found this went too far in the other direction:
all four stale-result surfaces (Encode, Decode, both Key views) disabled their
Copy and Download actions the moment any form field changed, on top of copy
that explicitly told the user "Neither is stored anywhere, copy or download
them now." A user who edited a small typo after encoding lost the only way to
save the artifact still on screen, even though the underlying result blob was
still perfectly valid, just possibly out of sync with the current form.

The same round also found that a failed follow-up request (e.g. a validation
error after changing parameters) was destroying the previous successful result
entirely, compounding the problem: a transient error left the user with
nothing to fall back on.

## Decision

Staleness means "this result may not reflect your current form state," not
"this result is invalid." Concretely:

- A result becomes stale when a relevant form field changes after that result
  was produced, but it is not cleared or destroyed.
- Recovery actions (Copy, Download) remain enabled on a stale result; only
  actions that would be misleading if taken on stale data are affected.
- A failed request does not destroy the previous successful result; the UI
  keeps showing it, flagged as no longer necessarily current, alongside the new
  error.

## Consequences

- Every store tracking a submittable result (`stores/encode.ts`,
  `stores/decode.ts`, `stores/key.ts`) needs to expose a derived staleness flag
  and preserve the last successful result across both parameter changes and
  failed requests, rather than clearing it eagerly.
- The design system's visual language for a stale versus fresh result had to be
  revisited more than once to keep contrast and legibility acceptable in the
  stale state; see [docs/design-system.md](../design-system.md)'s "In flux"
  section.
- New views or stores following this pattern should preserve the last
  successful result by default and add opt-in destruction only where a case
  genuinely warrants it, rather than the reverse.
