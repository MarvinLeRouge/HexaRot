[🇫🇷 Version française](api_endpoints.fr.md) | 🇬🇧 English version

---

# API reference

All endpoints are prefixed with `/api`. See the
[backend architecture guide](../architecture/backend_architecture.md) for how
each endpoint maps onto the underlying pipeline.

| Method | Route | Description |
|---|---|---|
| `POST` | `/encode` | Encode a message → PNG + SVG cryptogram |
| `POST` | `/decode` | Decode a cryptogram → plaintext |
| `POST` | `/key/generate` | Generate an HR key from parameters |
| `POST` | `/key/parse` | Parse an HR key → structured parameters |

## `POST /encode`

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

## `POST /decode`

```json
POST /api/decode
{
  "cryptogram": "<base64-encoded PNG or raw SVG string>",
  "format": "png",
  "key": "HR1·57C3",
  "size": "medium"
}
```

```json
{
  "message": "HELLO WORLD"
}
```

## `POST /key/generate`

```json
POST /api/key/generate
{
  "pivotBlockSize": 5,
  "rotationSequence": [0, 1, 2, 3],
  "rotationDirection": "cw",
  "readingOrder": "LR-TB"
}
```

```json
{
  "key": "HR1·57C3"
}
```

## `POST /key/parse`

```json
POST /api/key/parse
{
  "key": "HR1·57C3"
}
```

```json
{
  "pivotBlockSize": 5,
  "rotationSequence": [0, 90, 180, 270],
  "rotationDirection": "cw",
  "readingOrder": "LR-TB"
}
```

## The key format

A HexaRot key encodes all encryption parameters into a short base36 string:

```
HR1·57C3
│  │ └─── encoded parameters (base36)
│  └───── separator
└──────── version prefix
```

| Parameter | Example value | Meaning |
|---|---|---|
| Version | `1` | System version |
| Pivot block size | `5` | 5×5 cases per rotation block |
| Rotation sequence | `[0°, 90°, 180°, 270°]` | One of 24 possible permutations |
| Rotation direction | `cw` | Clockwise |
| Reading order | `LR-TB` | Left-right, top-bottom |

The key is message-independent: the same key encrypts and decrypts any number of
messages. The cryptogram carries no message-length metadata by design (see
[ADR 0001](../adr/0001-no-message-length-exposure.md)); decoding always processes
the full grid, filling any padding with a `?` placeholder rather than storing or
leaking the original length anywhere.
