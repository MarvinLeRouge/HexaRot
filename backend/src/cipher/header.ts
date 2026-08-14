/** Fixed size of the metadata header, in bytes. */
export const HEADER_SIZE_BYTES = 2;

/** Largest message length representable by a HEADER_SIZE_BYTES-byte Uint16BE header. */
export const MAX_MESSAGE_LENGTH = 0xffff;

/**
 * Encodes a message's character count into a fixed-size binary header.
 *
 * The header is independent of the key and of any VisualAlphabet - it
 * carries only the message length. Converting it into a visual row of
 * colour cases for the rendered cryptogram is the renderer's job, not
 * this function's.
 *
 * @throws {RangeError} If messageLength is not an integer in [0, MAX_MESSAGE_LENGTH].
 */
export function encodeHeader(messageLength: number): Buffer {
  if (
    !Number.isInteger(messageLength) ||
    messageLength < 0 ||
    messageLength > MAX_MESSAGE_LENGTH
  ) {
    throw new RangeError(
      `messageLength must be an integer between 0 and ${MAX_MESSAGE_LENGTH}, got ${messageLength}`,
    );
  }

  const buffer = Buffer.alloc(HEADER_SIZE_BYTES);
  buffer.writeUInt16BE(messageLength, 0);
  return buffer;
}

/**
 * Decodes a metadata header back into the message's character count.
 *
 * @throws {RangeError} If encoded is not exactly HEADER_SIZE_BYTES long.
 */
export function decodeHeader(encoded: Buffer): number {
  if (encoded.length !== HEADER_SIZE_BYTES) {
    throw new RangeError(
      `header must be exactly ${HEADER_SIZE_BYTES} bytes, got ${encoded.length}`,
    );
  }

  return encoded.readUInt16BE(0);
}
