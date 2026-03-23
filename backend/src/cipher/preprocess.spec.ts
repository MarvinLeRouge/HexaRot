import { preprocess } from './preprocess';
import { VisualAlphabet } from '../shared/types';

// ---------------------------------------------------------------------------
// Mock alphabet — Hexahue supported character set, no database required
// ---------------------------------------------------------------------------

const HEXAHUE_CHARS = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  ...'0123456789',
  '.',
  ',',
  ' ',
];

const mockAlphabet: Pick<VisualAlphabet, 'getSupportedChars'> = {
  getSupportedChars: () => HEXAHUE_CHARS,
} as VisualAlphabet;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('preprocess()', () => {
  // -------------------------------------------------------------------------
  // Uppercase
  // -------------------------------------------------------------------------

  describe('uppercase conversion', () => {
    it('converts lowercase input to uppercase', () => {
      const { text, unknownChars } = preprocess('hello', mockAlphabet);
      expect(text).toBe('HELLO');
      expect(unknownChars).toHaveLength(0);
    });

    it('leaves already-uppercase input unchanged', () => {
      const { text } = preprocess('WORLD', mockAlphabet);
      expect(text).toBe('WORLD');
    });

    it('handles mixed case', () => {
      const { text } = preprocess('HeLLo WoRLd', mockAlphabet);
      expect(text).toBe('HELLO WORLD');
    });
  });

  // -------------------------------------------------------------------------
  // Transliteration — French
  // -------------------------------------------------------------------------

  describe('transliteration — French', () => {
    it('strips acute accents (é → E)', () => {
      const { text, unknownChars } = preprocess('café', mockAlphabet);
      expect(text).toBe('CAFE');
      expect(unknownChars).toHaveLength(0);
    });

    it('strips grave accents (à, è, ù)', () => {
      const { text } = preprocess('à è ù', mockAlphabet);
      expect(text).toBe('A E U');
    });

    it('strips cedilla (ç → C)', () => {
      const { text } = preprocess('ça', mockAlphabet);
      expect(text).toBe('CA');
    });

    it('strips circumflex (â, ê, î, ô, û)', () => {
      const { text } = preprocess('âêîôû', mockAlphabet);
      expect(text).toBe('AEIOU');
    });

    it('strips trema (ë, ï, ü, ÿ)', () => {
      const { text } = preprocess('ëïü', mockAlphabet);
      expect(text).toBe('EIU');
    });
  });

  // -------------------------------------------------------------------------
  // Transliteration — Spanish
  // -------------------------------------------------------------------------

  describe('transliteration — Spanish', () => {
    it('strips tilde (ñ → N)', () => {
      const { text } = preprocess('niño', mockAlphabet);
      expect(text).toBe('NINO');
    });

    it('strips acute accents on Spanish vowels', () => {
      const { text } = preprocess('México', mockAlphabet);
      expect(text).toBe('MEXICO');
    });
  });

  // -------------------------------------------------------------------------
  // Transliteration — German
  // -------------------------------------------------------------------------

  describe('transliteration — German', () => {
    it('strips umlauts (ä → A, ö → O, ü → U)', () => {
      const { text } = preprocess('über', mockAlphabet);
      expect(text).toBe('UBER');
    });
  });

  // -------------------------------------------------------------------------
  // Transliteration — Portuguese
  // -------------------------------------------------------------------------

  describe('transliteration — Portuguese', () => {
    it('strips tilde on vowels (ã, õ)', () => {
      const { text } = preprocess('São', mockAlphabet);
      expect(text).toBe('SAO');
    });
  });

  // -------------------------------------------------------------------------
  // Unknown character reporting
  // -------------------------------------------------------------------------

  describe('unknown character reporting', () => {
    it('reports unknown characters and excludes them from text', () => {
      const { text, unknownChars } = preprocess('hello!', mockAlphabet);
      expect(text).toBe('HELLO');
      expect(unknownChars).toEqual(['!']);
    });

    it('reports multiple unknown characters', () => {
      const { text, unknownChars } = preprocess('hi! how?', mockAlphabet);
      expect(text).toBe('HI HOW');
      expect(unknownChars).toEqual(['!', '?']);
    });

    it('preserves duplicates in unknownChars', () => {
      const { unknownChars } = preprocess('a!b!c', mockAlphabet);
      expect(unknownChars).toEqual(['!', '!']);
    });

    it('returns only unknownChars when all characters are unsupported', () => {
      const { text, unknownChars } = preprocess('!@#', mockAlphabet);
      expect(text).toBe('');
      expect(unknownChars).toEqual(['!', '@', '#']);
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  describe('edge cases', () => {
    it('returns empty text and no unknowns for an empty string', () => {
      const { text, unknownChars } = preprocess('', mockAlphabet);
      expect(text).toBe('');
      expect(unknownChars).toHaveLength(0);
    });

    it('handles a string of only spaces', () => {
      const { text, unknownChars } = preprocess('   ', mockAlphabet);
      expect(text).toBe('   ');
      expect(unknownChars).toHaveLength(0);
    });

    it('handles digits correctly', () => {
      const { text, unknownChars } = preprocess('abc123', mockAlphabet);
      expect(text).toBe('ABC123');
      expect(unknownChars).toHaveLength(0);
    });

    it('handles punctuation in the alphabet (. and ,)', () => {
      const { text, unknownChars } = preprocess('hello, world.', mockAlphabet);
      expect(text).toBe('HELLO, WORLD.');
      expect(unknownChars).toHaveLength(0);
    });
  });
});
