import { VisualAlphabet } from '../shared/types';

/**
 * Result of the text pre-processing pipeline.
 */
export interface PreprocessResult {
  /** The processed string, containing only characters supported by the alphabet. */
  text: string;

  /**
   * Characters from the original input that could not be mapped to any
   * alphabet character after transliteration. Duplicates are preserved so
   * the caller can report exact occurrences.
   */
  unknownChars: string[];
}

/**
 * Pre-processes a raw input string for encoding with the given alphabet.
 *
 * Pipeline (in order):
 * 1. Convert to uppercase
 * 2. Transliterate by NFD decomposition + stripping of Unicode combining
 *    diacritical marks (U+0300–U+036F) — covers French, Spanish, German,
 *    Portuguese and the broader Latin script family
 * 3. Filter: characters recognised by the alphabet are kept in `text`;
 *    unrecognised characters are collected in `unknownChars` and excluded
 *    from the output
 *
 * The function is pure and deterministic — no side effects, same input always
 * produces the same output.
 *
 * @param input - The raw text to process.
 * @param alphabet - The target alphabet used to determine which characters are valid.
 * @returns A {@link PreprocessResult} with the processed text and any unknown characters.
 */
export function preprocess(
  input: string,
  alphabet: VisualAlphabet,
): PreprocessResult {
  const supported = new Set(alphabet.getSupportedChars());

  const transliterated = input
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const text: string[] = [];
  const unknownChars: string[] = [];

  for (const char of transliterated) {
    if (supported.has(char)) {
      text.push(char);
    } else {
      unknownChars.push(char);
    }
  }

  return { text: text.join(''), unknownChars };
}
