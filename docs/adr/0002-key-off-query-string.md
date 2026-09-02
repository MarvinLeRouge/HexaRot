# 2. Move key parsing off a GET query string

## Status

Accepted

## Context

`GET /api/key/parse?key=...` sent the decryption key as a URL query string
parameter. Query strings are written by default into server access logs,
reverse-proxy logs (Traefik in local development), and browser history/cache: a
durable, shared leak channel that a secret like a decryption key must not
travel through. This was flagged as a P0 finding in a design/UX critique round
(critique #7).

## Decision

`POST /api/key/parse` now takes the key in a JSON request body, matching the
shape already used by `POST /api/key/generate`. The corresponding DTO was
renamed from a query DTO to a request-body DTO
(`key-parse-query.dto.ts` → `key-parse-request.dto.ts`) with the same
validation rules.

## Consequences

- Both key endpoints (`generate` and `parse`) now share a consistent
  POST-with-JSON-body shape, simplifying the frontend API client.
- The frontend's `getJson()` helper, used only for the old GET-with-query-string
  call, had no other caller and was removed rather than left dead.
- Any external integration built against the old `GET /api/key/parse?key=...`
  route needs updating; this is a breaking API change, not something addressed
  with a v1/v2 endpoint split, given the project is pre-1.0.
