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
| `GET` | `/health` | Health check: `200 {"status":"ok"}`, or `503 {"status":"error"}` when the database is unreachable |

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
  "key": "HR2·0ZL3ID",
  "warnings": [],
  "unknownChars": [],
  "size": "medium"
}
```

`message` is limited to 29,000 characters, checked again once converted to
uppercase (some characters, such as `ß`, become two). Longer messages get a
400.

Block i gets the angle at position i of the rotation sequence (cycling when
there are more blocks than angles), so a short message only uses the first
few angles. If every block of the message would get 0°, the cryptogram would
be the message in clear: the request gets a 400 asking for a non-zero angle
among the first N entries, N being the message's block count. This applies
with individual params and with an existing key.

The image is limited to 66,666,666 pixels (a 200 MB memory budget per
request). `small` and `medium` always fit within the message limit; `large`
depends on the message length and the pivot block size. A combination over
the limit gets a 400 whose message gives the image size, before anything is
rendered. `POST /decode` applies the same pixel limit to uploaded PNGs, and
`POST /key/generate` refuses a pivot block size and size that no message could
fit (for example pivot 181 or more at size `large`).

## `POST /decode`

```json
POST /api/decode
{
  "cryptogram": "<base64-encoded PNG or raw SVG string>",
  "format": "png",
  "key": "HR2·0ZL3ID"
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
  "key": "HR2·0ZL3ID"
}
```

`rotationSequence` takes 4 to 32 angle indices (`0` to `3` for 0°, 90°,
180°, 270°), repetitions allowed, never only `0`; the same rule applies to
`POST /encode` and `POST /correlation-score`. The key does not store a
direction: a `ccw` request gets a key whose angles are rewritten as their
clockwise equivalent (A° counter-clockwise is (360 - A)° clockwise), so
`POST /key/parse` returns `cw` for it. Keys starting with `HR1` (one of the 24
permutations of the four angles, plus a direction) still decode and parse.

## `POST /key/parse`

```json
POST /api/key/parse
{
  "key": "HR2·0ZL3ID"
}
```

```json
{
  "pivotBlockSize": 5,
  "rotationSequence": [0, 90, 180, 270],
  "rotationDirection": "cw",
  "readingOrder": "LR-TB",
  "size": "medium"
}
```

## The key format

A HexaRot key encodes all encryption parameters into a short base36 string:

```
HR2·0ZL3ID
│  │ └─── encoded parameters (base36)
│  └───── separator
└──────── version prefix
```

| Parameter | Example value | Meaning |
|---|---|---|
| Version | `2` | Key format version (`1` keys still decode) |
| Pivot block size | `5` | 5×5 cases per rotation block |
| Rotation sequence | `[0°, 90°, 180°, 270°]` | 4 to 32 angles, repetitions allowed, never only 0° |
| Reading order | `LR-TB` | Left-right, top-bottom |

The key is message-independent: the same key encrypts and decrypts any number of
messages. The cryptogram carries no message-length metadata by design (see
[ADR 0001](../adr/0001-no-message-length-exposure.md)); decoding always processes
the full grid, filling any padding with a `?` placeholder rather than storing or
leaking the original length anywhere.
