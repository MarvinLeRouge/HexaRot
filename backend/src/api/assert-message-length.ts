import { BadRequestException } from '@nestjs/common';
import { MAX_ENCODE_MESSAGE_LENGTH } from '../cipher/max-message-length';

/**
 * Rejects a pre-processed message over the maximum length. The DTO already
 * checks the raw input, but uppercasing can lengthen it ('ß' becomes 'SS').
 *
 * @throws {BadRequestException} If `text` is longer than MAX_ENCODE_MESSAGE_LENGTH.
 */
export function assertMessageLength(text: string): void {
  if (text.length > MAX_ENCODE_MESSAGE_LENGTH) {
    throw new BadRequestException(
      `message must be at most ${MAX_ENCODE_MESSAGE_LENGTH} characters once converted to uppercase`,
    );
  }
}
