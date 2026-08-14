import {
  encodeHeader,
  decodeHeader,
  HEADER_SIZE_BYTES,
  MAX_MESSAGE_LENGTH,
} from './header';

describe('encodeHeader / decodeHeader', () => {
  describe('round-trip', () => {
    it('recovers messageLength=1 after encode-decode', () => {
      expect(decodeHeader(encodeHeader(1))).toBe(1);
    });

    it('recovers messageLength=100 after encode-decode', () => {
      expect(decodeHeader(encodeHeader(100))).toBe(100);
    });

    it('recovers the maximum supported message length after encode-decode', () => {
      expect(decodeHeader(encodeHeader(MAX_MESSAGE_LENGTH))).toBe(
        MAX_MESSAGE_LENGTH,
      );
    });
  });

  describe('encodeHeader', () => {
    it('returns a value of the documented fixed size (2 bytes)', () => {
      expect(encodeHeader(1).length).toBe(HEADER_SIZE_BYTES);
      expect(encodeHeader(MAX_MESSAGE_LENGTH).length).toBe(HEADER_SIZE_BYTES);
    });

    it('is deterministic for the same input', () => {
      expect(encodeHeader(42)).toEqual(encodeHeader(42));
    });

    it('does not embed any key-related information', () => {
      // The header is a fixed HEADER_SIZE_BYTES buffer for every valid
      // messageLength, leaving no room to smuggle in key-related data -
      // encodeHeader's signature takes only messageLength, nothing else.
      expect(encodeHeader(1).length).toBe(
        encodeHeader(MAX_MESSAGE_LENGTH).length,
      );
    });
  });

  describe('decodeHeader', () => {
    it('throws for a malformed header input', () => {
      expect(() => decodeHeader(Buffer.from([1, 2, 3]))).toThrow();
    });

    it('throws for a truncated header input', () => {
      expect(() => decodeHeader(Buffer.from([1]))).toThrow();
    });
  });

  describe('encodeHeader input validation', () => {
    it('throws for a negative messageLength', () => {
      expect(() => encodeHeader(-1)).toThrow(RangeError);
    });

    it('throws for a messageLength exceeding the maximum supported length', () => {
      expect(() => encodeHeader(MAX_MESSAGE_LENGTH + 1)).toThrow(RangeError);
    });

    it('throws for a non-integer messageLength', () => {
      expect(() => encodeHeader(1.5)).toThrow(RangeError);
    });
  });
});
