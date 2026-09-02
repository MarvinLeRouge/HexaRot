[🇫🇷 Version française](product-context.fr.md) | 🇬🇧 English version

---

# Product context

## What HexaRot is

HexaRot is a visual cipher that combines colour-based symbol encoding with
geometric block rotations to produce cryptograms that are easy to generate and
hard to read. Encryption parameters (block size, rotation offset, reading order,
and more) are bundled into a compact key, giving fine-grained control over the
complexity of the output.

## Nature and audience

HexaRot is a web application with an integrated API. The web interface is the
primary entry point; the API exists to allow integration into third-party
projects but is not the primary purpose.

The target audience is anyone interested in visual cryptography as a concept.
Geocaching-specific use cases (the Hexahue alphabet originates from that
community) are not highlighted as a specific audience.

## The cipher, at a glance

- **Visual alphabet:** built on Hexahue, where each character is a 2×3 block of
  colour cases. The system is designed around a `VisualAlphabet` abstraction so
  other grid-based, character-by-character alphabets could be added later; only
  Hexahue is implemented today.
- **Pre-processing:** text is uppercased and accented characters are
  transliterated (é→E, à→A, ç→C…); any character outside the alphabet and outside
  transliteration is reported to the user rather than silently dropped.
- **Grid construction:** the message is laid out in rows sized to be a multiple of
  the pivot block size, with random padding completing the grid.
- **Rotation:** the grid is divided into pivot blocks, each rotated according to
  the sequence defined in the key. Rotation operates on individual colour cases,
  not whole symbols, which is what dislocates the visual pattern and produces the
  cryptogram's apparent noise.
- **The key:** a compact, reusable, message-independent base36 string (`HR`
  prefix) packing the system version, pivot block size, rotation sequence and
  direction, and reading order. See [ADR 0001](adr/0001-no-message-length-exposure.md)
  for why the key and cryptogram deliberately carry no message-length metadata.

## Project purpose

HexaRot is a personal project with a dual purpose:

- **Learning:** TypeScript strict mode, NestJS architecture (modules, dependency
  injection, pipes), Prisma + PostgreSQL, Vue.js 3 Composition API, image
  rendering with Sharp, base36 encoding, 2D matrix rotation algorithms, GitHub
  Actions CI/CD.
- **Portfolio:** demonstrating a structured approach across a non-trivial
  algorithmic domain, from cipher design to tested, documented full-stack
  delivery.

See [docs/roadmap.md](roadmap.md) for what's implemented and what's planned.
