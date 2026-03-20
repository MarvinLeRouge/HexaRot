import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

const HEXAHUE_DATA = [
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
  { char: ' ', variant: 'black', colors: ['black', 'black', 'black', 'black', 'black', 'black'] },
  { char: ' ', variant: 'white', colors: ['white', 'white', 'white', 'white', 'white', 'white'] },
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

async function main() {
  const alphabet = await prisma.alphabet.upsert({
    where: { name: 'Hexahue' },
    update: {},
    create: {
      name: 'Hexahue',
      symbolWidth: 2,
      symbolHeight: 3,
    },
  });

  console.log(`Alphabet: ${alphabet.name} (id: ${alphabet.id})`);

  for (const entry of HEXAHUE_DATA) {
    const symbol = await prisma.symbol.upsert({
      where: {
        char_variant_alphabetId: {
          char: entry.char,
          variant: entry.variant ?? '',
          alphabetId: alphabet.id,
        },
      },
      update: {},
      create: {
        char: entry.char,
        variant: entry.variant ?? '',
        alphabet: {
            connect: { id: alphabet.id },
        },
      },
    });

    const positions = [
      { x: 0, y: 0 }, { x: 1, y: 0 },
      { x: 0, y: 1 }, { x: 1, y: 1 },
      { x: 0, y: 2 }, { x: 1, y: 2 },
    ];

    for (let i = 0; i < 6; i++) {
      await prisma.colorCase.upsert({
        where: {
          x_y_symbolId: {
            x: positions[i].x,
            y: positions[i].y,
            symbolId: symbol.id,
          },
        },
        update: { color: entry.colors[i] },
        create: {
          x: positions[i].x,
          y: positions[i].y,
          color: entry.colors[i],
          symbolId: symbol.id,
        },
      });
    }

    console.log(`  Seeded: ${entry.char}${entry.variant ? ` (${entry.variant})` : ''}`);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });