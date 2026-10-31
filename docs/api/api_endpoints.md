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
| `POST` | `/correlation-score` | Compute a cryptogram's correlation score |
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
  "key": "HR1·2T51",
  "warnings": [],
  "unknownChars": [],
  "size": "medium"
}
```

`message` is limited to 29,000 characters, checked again once converted to
uppercase (some characters, such as `ß`, become two). Longer messages get a
400.

## `POST /decode`

```json
POST /api/decode
{
  "cryptogram": "<base64-encoded PNG or raw SVG string>",
  "format": "png",
  "key": "HR1·2T51"
}
```

```json
{
  "message": "HELLO WORLD"
}
```

The image is always read at the size stored in the key. A `size` field is
still accepted for compatibility, with any value, but ignored.

The request body is limited to 24 MB on this route, enough for the largest
cryptogram `POST /encode` can produce (an SVG of about 19 MB). A larger body
gets a 413. Every other route is limited to 256 kB, enough for any accepted
message.

## `POST /correlation-score`

```json
POST /api/correlation-score
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
  "score": 0.83
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
  "key": "HR1·2T51"
}
```

## `POST /key/parse`

```json
POST /api/key/parse
{
  "key": "HR1·2T51"
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
HR1·2T51
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
