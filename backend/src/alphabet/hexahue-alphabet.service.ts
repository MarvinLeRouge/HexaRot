import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VisualAlphabet, ColorGrid } from '../shared/types';
import { UnsupportedCharacterError } from './errors/unsupported-character.error';

/**
 * Concrete implementation of {@link VisualAlphabet} for the Hexahue alphabet.
 *
 * Symbol dimensions: 2 cases wide × 3 cases tall.
 *
 * Characters with multiple visual variants (e.g. space, which exists in black
 * and white) are stored internally under a `char:variant` key. Calling
 * {@link getBlock} with the base character returns the first available variant
 * (black takes priority over white).
 *
 * All symbols are loaded from the database on module initialisation and cached
 * in memory for the lifetime of the application.
 */
@Injectable()
export class HexahueAlphabet implements VisualAlphabet, OnModuleInit {
  readonly symbolWidth = 2;
  readonly symbolHeight = 3;

  /** Internal map: key → colour grid. Key is `char` or `char:variant`. */
  private readonly blocks = new Map<string, ColorGrid>();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.loadAlphabet();
  }

  /**
   * Loads all Hexahue symbols from the database and populates {@link blocks}.
   */
  private async loadAlphabet(): Promise<void> {
    const symbols = await this.prisma.symbol.findMany({
      where: { alphabet: { name: 'Hexahue' } },
      include: { colorCases: true },
    });

    for (const symbol of symbols) {
      const grid: ColorGrid = Array.from(
        { length: this.symbolHeight },
        (): string[] => new Array<string>(this.symbolWidth).fill(''),
      );

      for (const colorCase of symbol.colorCases) {
        grid[colorCase.y][colorCase.x] = colorCase.color;
      }

      this.blocks.set(this.buildKey(symbol.char, symbol.variant), grid);
    }
  }

  /** Builds the internal map key for a character and its optional variant. */
  private buildKey(char: string, variant: string): string {
    return variant ? `${char}:${variant}` : char;
  }

  /**
   * Returns the colour grid for the given character.
   *
   * For characters with multiple variants (e.g. space), the black variant is
   * returned by default, followed by white if black is unavailable.
   *
   * @throws {UnsupportedCharacterError} If the character has no registered grid.
   */
  getBlock(char: string): ColorGrid {
    const grid =
      this.blocks.get(char) ??
      this.blocks.get(`${char}:black`) ??
      this.blocks.get(`${char}:white`);

    if (!grid) {
      throw new UnsupportedCharacterError(char);
    }

    return grid;
  }

  /**
   * Returns all characters supported by the Hexahue alphabet.
   * For characters with variants, only the base character is returned once.
   */
  getSupportedChars(): string[] {
    const chars = new Set<string>();
    for (const key of this.blocks.keys()) {
      chars.add(key.includes(':') ? key.split(':')[0] : key);
    }
    return Array.from(chars);
  }
}
