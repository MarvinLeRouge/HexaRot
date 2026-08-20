/**
 * Cheap client-side shape check for a HexaRot key (`HR{version}·{4-char
 * base36 payload}`) - not a correctness check. The backend's
 * KeyCodec.decode() remains the sole source of truth for whether a
 * well-formed-looking key actually decodes to valid parameters.
 */
const KEY_FORMAT_REGEX = /^HR\d·[0-9A-Za-z]{4}$/

/**
 * Matches near-misses of the canonical shape: a case-insensitive "HR"
 * prefix and a separator typed as one of ·, ., -, _ or a space instead of
 * the middle dot (U+00B7) the backend requires verbatim. Deliberately does
 * not touch anything that isn't already this exact shape, so a genuinely
 * malformed key still fails validation with a diagnostic message instead
 * of being silently "fixed" into something else.
 */
const KEY_INPUT_NEAR_MISS = /^hr(\d)[·.\-_ ]([0-9a-z]{4})$/i

/** Rewrites a near-miss key into the exact form the backend accepts. */
export function normalizeKeyInput(key: string): string {
  const trimmed = key.trim()
  const match = KEY_INPUT_NEAR_MISS.exec(trimmed)
  if (!match) return trimmed
  const [, version, payload] = match
  return `HR${version}·${payload}`
}

export function isValidKeyFormat(key: string): boolean {
  return KEY_FORMAT_REGEX.test(normalizeKeyInput(key))
}
