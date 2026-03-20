[🇫🇷 Version française](README.fr.md) | 🇬🇧 English version

---

# 🔐 HexaRot

> *A visual cipher that combines colour-based symbol encoding with geometric block rotations
> to produce cryptograms that are easy to generate and hard to read — bundled into a compact,
> reusable key.*

[![CI](https://github.com/MarvinLeRouge/HexaRot/actions/workflows/ci.yml/badge.svg)](https://github.com/MarvinLeRouge/HexaRot/actions)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)]()
[![Vue.js](https://img.shields.io/badge/Vue.js-3-4FC08D?logo=vuedotjs&logoColor=white)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)]()
[![License](https://img.shields.io/github/license/MarvinLeRouge/HexaRot)]()

---

## Concept

HexaRot encodes any text message into a colour grid using the
[Hexahue](https://www.geocachingtoolbox.com/index.php?lang=en&page=hexahue) visual alphabet,
then scrambles that grid by applying geometric rotations to fixed-size pivot blocks —
deliberately dislocating symbols to produce visual noise.

All encryption parameters (block size, rotation sequence, reading order, direction) are
packed into a compact base36 key string prefixed with `HR` — for example `HR1·57C3`.
The same key decodes any message it was used to encode.

---

## Features

- **Encode** — text → colour cryptogram (PNG + SVG output)
- **Decode** — cryptogram + key → plaintext
- **Key generation and parsing** — compact base36 format, human-copyable
- **Parameter validation** — GCD-based weakness detection with override
- **Transliteration** — accented characters handled automatically (é→E, à→A, ç→C…)
- **Configurable rendering** — small / medium / large output size
- **4 reading orders** — LR-TB, RL-TB, TB-LR, BT-LR, each with optional alternate mode
- **REST API** — full encoding/decoding pipeline accessible programmatically

---

## Quick start

**Prerequisites:** Docker and Docker Compose.

```bash
git clone https://github.com/MarvinLeRouge/HexaRot.git && cd HexaRot
cp .env.example .env
docker-compose up
```

The web interface is available at `http://localhost:5173`.
The API is available at `http://localhost:3000`.

---

## API

All endpoints are prefixed with `/api`.

| Method | Route | Description |
|---|---|---|
| `POST` | `/encode` | Encode a message → PNG + SVG cryptogram |
| `POST` | `/decode` | Decode a cryptogram → plaintext |
| `POST` | `/key/generate` | Generate an HR key from parameters |
| `GET` | `/key/parse?key=HR…` | Parse an HR key → structured parameters |

**Example — `POST /encode`**

```json
POST /api/encode
{
  "message": "HELLO WORLD",
  "pivotBlockSize": 5,
  "rotationSequence": [0, 1, 2, 3],
  "rotationDirection": "cw",
  "readingOrder": "LR-TB",
  "size": "medium"
}
```

```json
{
  "png": "<base64-encoded PNG>",
  "svg": "<SVG string>",
  "key": "HR1·57C3",
  "warnings": [],
  "unknownChars": []
}
```

---

## The key format

> ⚠️ *Exact encoding specification in progress (FEAT-004). The values below are illustrative.*

A HexaRot key encodes all encryption parameters into a short base36 string:

```
HR1·57C3
│  │ └─── encoded parameters (base36)
│  └───── separator
└──────── version prefix
```

The parameters packed into the key, with example values:

| Parameter | Example value | Meaning |
|---|---|---|
| Version | `1` | System version |
| Pivot block size | `5` | 5×5 cases per rotation block |
| Rotation sequence | `[0°, 90°, 180°, 270°]` | One of 24 possible permutations |
| Rotation direction | `cw` | Clockwise |
| Reading order | `LR-TB` | Left-right, top-bottom |

The key is **message-independent** — the same key encrypts and decrypts any number of
messages. Message length is stored in the cryptogram header, not in the key.

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | NestJS 11 + TypeScript (strict) |
| Database | PostgreSQL + Prisma |
| Image rendering | Sharp (PNG) + native SVG |
| Frontend | Vue.js 3 + TypeScript + vue-i18n |
| DevOps | Docker Compose, GitHub Actions |
| Tests | Jest (backend), Vitest (frontend) |

---

## Architecture

```
backend/
├── alphabet/        # VisualAlphabet interface + HexahueAlphabet implementation
├── cipher/          # Pre-processing, grid construction, metadata header
├── rotation/        # Block rotation engine (encode + inverse)
├── key/             # KeyCodec — base36 encode/decode/validate
├── reading-order/   # ReadingOrderStrategy implementations
├── renderer/        # PngRenderer, SvgRenderer
├── validation/      # GCD-based parameter validator
└── api/             # NestJS controllers + DTOs

frontend/
├── views/           # Encode, Decode, Key
├── stores/          # Pinia stores
└── i18n/            # English (V1), French (V2)
```

---

## Roadmap

### V1

- ✅ Infra (NestJS, Vue.js, Docker Compose, Prisma)
- 🔄 CI (GitHub Actions — tests pipeline, backlog sync)
- ⬜ Alphabet (VisualAlphabet interface + Hexahue implementation)
- ⬜ Cipher (pre-processing, grid construction, metadata header)
- ⬜ Rotation engine
- ⬜ Key codec (base36 encode / decode / validate)
- ⬜ Reading order strategies (4 directions + alternate)
- ⬜ Renderers (PNG + SVG)
- ⬜ API endpoints (encode, decode, key)
- ⬜ Frontend (encode view, decode view, key view)
- ⬜ Tests & coverage

### V2

- ⬜ French interface (i18n)
- ⬜ Animated decoding mode
- ⬜ Spiral reading order
- ⬜ Correlation score
- ⬜ User authentication

---

## About

Personal project with a dual purpose:

- **Learning** — TypeScript strict mode, NestJS architecture (modules, dependency injection,
  pipes), Prisma + PostgreSQL, Vue.js 3 Composition API, image rendering with Sharp,
  base36 encoding, 2D matrix rotation algorithms, GitHub Actions CI/CD
- **Portfolio** — demonstrates a structured approach across a non-trivial algorithmic domain,
  from cipher design to tested, documented full-stack delivery

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
