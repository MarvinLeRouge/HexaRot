// Prevent Jest from parsing PrismaService's generated ESM Prisma client.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class MockPrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { HexahueAlphabet } from './hexahue-alphabet.service';
import { PrismaService } from '../prisma/prisma.service';
import { UnsupportedCharacterError } from './errors/unsupported-character.error';

// ---------------------------------------------------------------------------
// Test fixture — mirrors the data produced by prisma/seed.ts
// ---------------------------------------------------------------------------

interface SeedEntry {
  char: string;
  variant?: string;
  colors: string[];
}

const HEXAHUE_SEED: SeedEntry[] = [
  { char: 'A', colors: ['purple', 'red', 'green', 'yellow', 'blue', 'cyan'] },
  { char: 'B', colors: ['red', 'purple', 'green', 'yellow', 'blue', 'cyan'] },
  { char: 'C', colors: ['red', 'green', 'purple', 'yellow', 'blue', 'cyan'] },
  { char: 'D', colors: ['red', 'green', 'yellow', 'purple', 'blue', 'cyan'] },
  { char: 'E', colors: ['red', 'green', 'yellow', 'blue', 'purple', 'cyan'] },
  { char: 'F', colors: ['red', 'green', 'yellow', 'blue', 'cyan', 'purple'] },
  { char: 'G', colors: ['green', 'red', 'yellow', 'blue', 'cyan', 'purple'] },
  { char: 'H', colors: ['green', 'yellow', 'red', 'blue', 'cyan', 'purple'] },
  { char: 'I', colors: ['green', 'yellow', 'blue', 'red', 'cyan', 'purple'] },
  { char: 'J', colors: ['green', 'yellow', 'blue', 'cyan', 'red', 'purple'] },
  { char: 'K', colors: ['green', 'yellow', 'blue', 'cyan', 'purple', 'red'] },
  { char: 'L', colors: ['yellow', 'green', 'blue', 'cyan', 'purple', 'red'] },
  { char: 'M', colors: ['yellow', 'blue', 'green', 'cyan', 'purple', 'red'] },
  { char: 'N', colors: ['yellow', 'blue', 'cyan', 'green', 'purple', 'red'] },
  { char: 'O', colors: ['yellow', 'blue', 'cyan', 'purple', 'green', 'red'] },
  { char: 'P', colors: ['yellow', 'blue', 'cyan', 'purple', 'red', 'green'] },
  { char: 'Q', colors: ['blue', 'yellow', 'cyan', 'purple', 'red', 'green'] },
  { char: 'R', colors: ['blue', 'cyan', 'yellow', 'purple', 'red', 'green'] },
  { char: 'S', colors: ['blue', 'cyan', 'purple', 'yellow', 'red', 'green'] },
  { char: 'T', colors: ['blue', 'cyan', 'purple', 'red', 'yellow', 'green'] },
  { char: 'U', colors: ['blue', 'cyan', 'purple', 'red', 'green', 'yellow'] },
  { char: 'V', colors: ['cyan', 'blue', 'purple', 'red', 'green', 'yellow'] },
  { char: 'W', colors: ['cyan', 'purple', 'blue', 'red', 'green', 'yellow'] },
  { char: 'X', colors: ['cyan', 'purple', 'red', 'blue', 'green', 'yellow'] },
  { char: 'Y', colors: ['cyan', 'purple', 'red', 'green', 'blue', 'yellow'] },
  { char: 'Z', colors: ['cyan', 'purple', 'red', 'green', 'yellow', 'blue'] },
  { char: '.', colors: ['black', 'white', 'white', 'black', 'black', 'white'] },
  { char: ',', colors: ['white', 'black', 'black', 'white', 'white', 'black'] },
  {
    char: ' ',
    variant: 'black',
    colors: ['black', 'black', 'black', 'black', 'black', 'black'],
  },
  {
    char: ' ',
    variant: 'white',
    colors: ['white', 'white', 'white', 'white', 'white', 'white'],
  },
  { char: '0', colors: ['black', 'gray', 'white', 'black', 'gray', 'white'] },
  { char: '1', colors: ['gray', 'black', 'white', 'black', 'gray', 'white'] },
  { char: '2', colors: ['gray', 'white', 'black', 'black', 'gray', 'white'] },
  { char: '3', colors: ['gray', 'white', 'black', 'gray', 'black', 'white'] },
  { char: '4', colors: ['gray', 'white', 'black', 'gray', 'white', 'black'] },
  { char: '5', colors: ['white', 'gray', 'black', 'gray', 'white', 'black'] },
  { char: '6', colors: ['white', 'black', 'gray', 'gray', 'white', 'black'] },
  { char: '7', colors: ['white', 'black', 'gray', 'white', 'gray', 'black'] },
  { char: '8', colors: ['white', 'black', 'gray', 'white', 'black', 'gray'] },
  { char: '9', colors: ['black', 'white', 'gray', 'white', 'black', 'gray'] },
];

/**
 * Builds a mock Prisma symbol record from a seed entry.
 * ColorCases follow the same x/y layout as the seed script:
 * index 0 → (x=0, y=0), index 1 → (x=1, y=0), ..., index 5 → (x=1, y=2).
 */
function buildMockSymbol(entry: SeedEntry, id: number) {
  const positions = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
  ];
  return {
    id,
    char: entry.char,
    variant: entry.variant ?? '',
    alphabetId: 1,
    colorCases: entry.colors.map((color, i) => ({
      id: id * 10 + i,
      x: positions[i].x,
      y: positions[i].y,
      color,
      symbolId: id,
    })),
  };
}

const MOCK_SYMBOLS = HEXAHUE_SEED.map((entry, i) =>
  buildMockSymbol(entry, i + 1),
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HexahueAlphabet', () => {
  let service: HexahueAlphabet;
  let prismaService: { symbol: { findMany: jest.Mock } };

  beforeEach(async () => {
    prismaService = {
      symbol: {
        findMany: jest.fn().mockResolvedValue(MOCK_SYMBOLS),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HexahueAlphabet,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<HexahueAlphabet>(HexahueAlphabet);
    await service.onModuleInit();
  });

  // -------------------------------------------------------------------------
  // Symbol dimensions
  // -------------------------------------------------------------------------

  describe('symbolWidth and symbolHeight', () => {
    it('exposes symbolWidth = 2', () => {
      expect(service.symbolWidth).toBe(2);
    });

    it('exposes symbolHeight = 3', () => {
      expect(service.symbolHeight).toBe(3);
    });
  });

  // -------------------------------------------------------------------------
  // getSupportedChars
  // -------------------------------------------------------------------------

  describe('getSupportedChars()', () => {
    it('returns all 39 base characters (space counted once despite two variants)', () => {
      // 26 letters + 10 digits + . + , + space = 39 unique base chars
      expect(service.getSupportedChars()).toHaveLength(39);
    });

    it('includes all 26 uppercase letters', () => {
      const chars = service.getSupportedChars();
      for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
        expect(chars).toContain(letter);
      }
    });

    it('includes all 10 digits', () => {
      const chars = service.getSupportedChars();
      for (const digit of '0123456789') {
        expect(chars).toContain(digit);
      }
    });

    it('includes punctuation (. and ,) and space', () => {
      const chars = service.getSupportedChars();
      expect(chars).toContain('.');
      expect(chars).toContain(',');
      expect(chars).toContain(' ');
    });

    it('does not contain duplicate entries', () => {
      const chars = service.getSupportedChars();
      expect(chars.length).toBe(new Set(chars).size);
    });
  });

  // -------------------------------------------------------------------------
  // getBlock — grid dimensions for all supported characters
  // -------------------------------------------------------------------------

  describe('getBlock() — grid dimensions', () => {
    it('returns a grid with correct dimensions for every supported character', () => {
      for (const char of service.getSupportedChars()) {
        const grid = service.getBlock(char);
        expect(grid).toHaveLength(service.symbolHeight); // 3 rows
        for (const row of grid) {
          expect(row).toHaveLength(service.symbolWidth); // 2 columns
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // getBlock — colour values
  // -------------------------------------------------------------------------

  describe('getBlock() — colour values', () => {
    it('returns the correct grid for "A"', () => {
      const grid = service.getBlock('A');
      expect(grid[0][0]).toBe('purple');
      expect(grid[0][1]).toBe('red');
      expect(grid[1][0]).toBe('green');
      expect(grid[1][1]).toBe('yellow');
      expect(grid[2][0]).toBe('blue');
      expect(grid[2][1]).toBe('cyan');
    });

    it('returns a non-empty colour string in every cell for all supported characters', () => {
      for (const char of service.getSupportedChars()) {
        const grid = service.getBlock(char);
        for (const row of grid) {
          for (const color of row) {
            expect(typeof color).toBe('string');
            expect(color.length).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // getBlock — space variant fallback
  // -------------------------------------------------------------------------

  describe('getBlock(" ") — space variant', () => {
    it('returns the black variant grid for space', () => {
      const grid = service.getBlock(' ');
      for (const row of grid) {
        for (const color of row) {
          expect(color).toBe('black');
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // getBlock — unsupported character
  // -------------------------------------------------------------------------

  describe('getBlock() — unsupported character', () => {
    it('throws UnsupportedCharacterError for a character not in the alphabet', () => {
      expect(() => service.getBlock('é')).toThrow(UnsupportedCharacterError);
    });

    it('throws UnsupportedCharacterError with a message referencing the character', () => {
      expect(() => service.getBlock('!')).toThrow('"!"');
    });

    it('throws UnsupportedCharacterError for lowercase input', () => {
      expect(() => service.getBlock('a')).toThrow(UnsupportedCharacterError);
    });
  });
});
