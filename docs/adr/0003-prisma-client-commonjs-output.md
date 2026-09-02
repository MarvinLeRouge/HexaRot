# 3. Force CommonJS output for the generated Prisma client

## Status

Accepted

## Context

The `prisma-client` generator defaults to emitting `import.meta.url` in its
generated client source. TypeScript compiles that source to CommonJS (there is
no `"type": "module"` in `backend/package.json`), producing a file that mixes
CommonJS `exports.foo =` assignments with an ESM-only construct. Node's module
loader cannot resolve the resulting hybrid module, so any real process that
imports `PrismaService` (`nest start`, `nest start --watch`, or the built
`dist/src/main.js`) crashed on startup with `ReferenceError: exports is not
defined`.

This was invisible to the test suite, since `PrismaService` is mocked in every
spec: no test actually booted the application against a real database. The
issue was reproduced identically on two different Node versions, ruling out a
Node-version-specific cause.

## Decision

Set `moduleFormat = "cjs"` on the Prisma client generator block in
`backend/prisma/schema.prisma`, so the generator emits `require()`-based output
with no `import.meta` usage, matching the module system used by the rest of the
codebase.

## Consequences

- The application boots correctly against a real PostgreSQL instance in every
  execution mode (dev watch, production build).
- Since the failure mode was invisible to a mocked test suite, this is a
  standing reminder that mocking `PrismaService` in unit tests does not
  substitute for occasionally verifying the full boot path against a real
  database (see [docs/operations.md](../operations.md) for how to run one
  locally).
