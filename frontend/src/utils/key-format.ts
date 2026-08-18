/**
 * Cheap client-side shape check for a HexaRot key (`HR{version}·{4-char
 * base36 payload}`) - not a correctness check. The backend's
 * KeyCodec.decode() remains the sole source of truth for whether a
 * well-formed-looking key actually decodes to valid parameters.
 */
const KEY_FORMAT_REGEX = /^HR\d·[0-9a-z]{4}$/

export function isValidKeyFormat(key: string): boolean {
  return KEY_FORMAT_REGEX.test(key.trim())
}
