# Changelog

All notable changes to this project are documented in this file, generated
automatically from Conventional Commits history.
## [Unreleased]

### Bug Fixes

- Corrected BACKLOG.md statut of item TEST-004
- Bad backlog item status
- Fix Kanban column name casing in sync-backlog script
- Guard invalid pivotBlockSize, add missing T=6 coverage
- Widen the grid adaptively instead of always using the minimum width
- Guard invalid pivotBlockSize and rotation sequence entries
- Replace em dashes with plain punctuation in renderer.md design note
- Guard colorNameToRgb against Object.prototype lookup
- Address final review findings for FEAT-009
- Address final review findings for FEAT-010
- Address final review findings for FEAT-011
- Harden KeyCodec.decode against out-of-range payload values
- Address final review findings for FEAT-013
- Detect misaligned casePixels in PNG parser
- Bound decoded pixel count in PNG parser
- Force CommonJS output for the generated Prisma client
- Correct inverted key format error condition
- Declare globals as an explicit devDependency
- Disambiguate select controls in the initial-render test
- Route the Vite dev-server proxy through an env var for Docker Compose
- Route error messages through i18n and add ApiError.code
- Handle clipboard failures, tidy eslint-disable placement, guard pivotBlockSize
- Resolve FileReader failures inside decode submit()
- Add a size-selector hint on the decode form
- Reset decode store on unmount and mark result aria-live
- Accept uppercase key payloads in client-side format check
- Close DB connections in e2e teardown, tighten test timing
- Correct e2e coverage scoping and a backlog ID collision
- Wire the design token stylesheet into the app entrypoint
- Stop destroying the encode key on navigation
- Move actual keyboard focus on rotation-picker arrow navigation
- Stop the success-path focus call from cancelling the scroll
- Raise disabled-button and form-border contrast
- Always focus and instant-scroll to result errors
- Extend stale-result protection to decode and key parser
- Restore readable disabled-button contrast, stop dimming cryptogram colors when stale
- Keep output column height stable during encode/decode requests
- Translate reading order to a human-readable label
- Surface the cryptogram size alongside the encode key
- Drop the decryption key from downloaded filenames
- Make decoded messages readable, fix stale-state contrast on Key views
- Move key parsing off a GET query string (REFACTOR-004)
- Snapshot the encode result size instead of reading it live (REFACTOR-007)
- Stop destroying the previous result on a failed submit (REFACTOR-006)
- Keep Copy and Download enabled while a result is stale (REFACTOR-005)
- Copy button includes the cryptogram size alongside the key (REFACTOR-008)
- Fix Encode form horizontal overflow on mobile (REFACTOR-009)
- Stop the "Out of date" badge from overlapping cryptogram cells (REFACTOR-010)
- Make the decoded message keyboard-scrollable (REFACTOR-011)

### CI/CD

- Set up GitHub Actions CI pipeline
- Fix vitest exit code when no test files found
- Add backlog sync pipeline, branch and PR trackers, PR template
- Extract sync script to separate file, fix YAML syntax error
- Fix working-directory and BACKLOG.md path in sync script
- Add debug logging to backlog parser
- Log full debug block in parser
- Fix parser split to ignore ITEM:BEGIN references in item descriptions
- Add status coherence validation and auto-promotion to ready
- Pass token to checkout to allow BACKLOG.md auto-commit
- Add PostgreSQL service to backend CI job for integration tests
- Add real backend e2e coverage collection and Codecov reporting
- Add automated changelog PR workflow
- Remove duplicate --config flag from git-cliff-action args
- Homogenize changelog workflow

### Documentation

- Add README.md and README.fr.md, fix BACKLOG.md case in .gitignore
- Added Github Action token management to documentation
- Add TEST-004 MockAlphabet implementation plan
- Remove em dashes and exotic punctuation from TEST-004 plan
- Add FEAT-005 reading order strategies implementation plan
- Add Tasks 4-5 to FEAT-005 plan for docs/tests/reading-order.md compliance
- Add FEAT-006 grid construction implementation plan
- Add Task 3 to FEAT-006 plan for adaptive grid width
- Sync test contract with shipped suite, add narrow-alphabet coverage
- List the narrow-alphabet test in the adaptive width bullets
- Add FEAT-007 rotation engine implementation plan
- Add FEAT-008 metadata header implementation plan
- Clarify header messageLength semantics and sync test contract
- Add FEAT-011 encode API endpoint plan
- Add FEAT-013 key endpoints plan
- Add FEAT-012 decode API endpoint plan and design spec
- Document decodeGrid trailing-truncation behavior
- Sync FEAT-012 description with resolved decisions
- Note the spaces bullet is skipped in the shipped suite
- Update V1 roadmap to reflect completed backend API
- Add design spec and implementation plan for the encode view
- Add design spec and implementation plan for the decode view
- Add design spec and implementation plan for the key view
- Complete README API examples and fix stale content
- Persist the post-REFACTOR-001 re-critique snapshot
- Close REFACTOR-001, log deferred structural findings as REFACTOR-002
- Decompose REFACTOR-002 into layout, staleness and key-format investigation
- Persist critique #4 and #5 snapshots
- Persist critique #6 snapshot
- Persist critique #7 snapshot
- Add REFACTOR-004..011 from critique #7 findings
- Mark REFACTOR-004 done
- CHORE-009 recommendation, open FEAT-022
- Rewrite backend README with HexaRot-specific content
- Rewrite frontend README with HexaRot-specific content
- Add code of conduct
- Add security policy
- Generate initial changelog from commit history
- Extract roadmap into its own file
- Add public product context
- Document the current frontend design system
- Add operations runbook
- Add backend architecture guide
- Add frontend architecture guide
- Extract API reference into its own file
- Trim README roadmap and API sections to pointers
- Add end-user guide
- Add backend developer guide
- Add frontend developer guide
- Record the no-message-length-exposure decision
- Record the key-off-query-string decision
- Record the Prisma CommonJS output decision
- Record the Traefik local dev routing decision
- Record the stale-result handling decision
- Add bug report issue template
- Add feature request issue template
- Update changelog
- Homogenize contributing guide and code of conduct
- Add ADR index
- Add architecture summary page
- Link architecture decision records from README

### Features

- Implement text pre-processing pipeline
- Implement GCD-based parameter validator
- Implement KeyCodec with base36 encoding and round-trip decode
- Add ReadingOrderStrategy interface, LR-TB and RL-TB strategies
- Add TB-LR and BT-LR strategies
- Add ReadingOrderRegistry and wire it into the module
- Implement buildGrid for symbol layout and random padding
- Implement rotateBlock for single-block rotation
- Implement RotationEngine and wire it into the module
- Implement encodeHeader/decodeHeader for cryptogram metadata
- Add Renderer<T> interface and CaseSize type
- Add Hexahue palette constants and colour-to-RGB lookup
- Implement PngRenderer with Sharp raw pixel painting
- Implement SvgRenderer with native string templating
- Add global ValidationPipe, API prefix, and EncodeRequestDto
- Implement EncodeService orchestrating the full cipher pipeline
- Wire POST /encode end to end with a full HTTP-level test suite
- Implement KeyController and KeyService for key generate/parse
- Add PNG and SVG parsers, inverse of PngRenderer/SvgRenderer
- Add decodeGrid, the inverse of buildGrid
- Implement DecodeService and DecodeController for POST /decode
- Add router, layout, and shared build config for FEAT-014
- Add fetch-based API client wrapper
- Add encode Pinia store, reading-order constants, and shared test fixtures
- Add client-side HexaRot key format validation
- Add drag-and-drop rotation sequence picker
- Add encode parameters form
- Add encode result panel with previews, copy, and downloads
- Assemble the encode view and wire it into the router
- Add decode Pinia store and decode-related test fixtures
- Add file upload area with drag-and-drop for the decode view
- Add decode parameters form
- Assemble the decode view and wire it into the router
- Add the key store for generate and parse actions
- Add the key generator form
- Add the key parser form
- Assemble the key view and wire it into the router
- Apply the layout fix pass across encode, decode and key views
- Make the rotation sequence picker keyboard accessible
- Clarify error copy and explain weakness warnings
- Add submit feedback across encode, decode and key views
- Amplify the encode key result to its own visual weight
- Final polish pass across encode, decode and key views
- Introduce a primary/secondary button system and fix contrast tokens
- Tolerate near-miss HexaRot key input and diagnose format errors
- Two-column result layout for encode and decode views
- Invalidate a stale encode result on parameter change
- Mark a stale encode result instead of deleting it
- Give the output column an empty state and align the title
- Bring Key view to parity with Encode and Decode
- Pack the cryptogram size into the key (FEAT-022)

### Miscellaneous

- Initialize NestJS backend project
- Initialize Vue.js 3 frontend project
- Configure pre-commit hooks with Husky and lint-staged
- Untrack gitignored files
- Configure Docker Compose for local development
- Configure Prisma and PostgreSQL schema with Hexahue seed
- Mark CI-002 as done
- Auto-promote ready items [skip ci]
- Mark CI-003 as done and clarify acceptance criteria
- Updated BACKLOG
- Mark FEAT-001 as done
- Auto-promote ready items [skip ci]
- Mark FEAT-002 as done
- Auto-promote ready items [skip ci]
- Auto-promote ready items [skip ci]
- Plan reactivation roadmap - traefik infra, Brevo registration, design and security passes
- Mark TEST-004 as done
- Mark FEAT-005 as done
- Auto-promote ready items [skip ci]
- Relocate MockAlphabet to test/utils per docs/tests/cipher.md
- Mark FEAT-006 as done
- Auto-promote ready items [skip ci]
- Mark FEAT-007 as done
- Auto-promote ready items [skip ci]
- Mark FEAT-008 as done
- Auto-promote ready items [skip ci]
- Mark FEAT-010 as done, fix doc comment, commit plan
- Auto-promote ready items [skip ci]
- Mark FEAT-011 as done
- Auto-promote ready items [skip ci]
- Mark FEAT-013 as done
- Auto-promote ready items [skip ci]
- Mark FEAT-012 as done
- Auto-promote ready items [skip ci]
- Flip FEAT-014 to status done
- Mark FEAT-016 as done
- Route local dev through Traefik instead of published ports
- Auto-promote ready items [skip ci]
- Auto-promote ready items [skip ci]
- Enforce the Codecov project status now that a real number exists
- Auto-promote ready items [skip ci]
- Mark FEAT-015 done - already implemented
- Auto-promote ready items [skip ci]
- Add git-cliff configuration for changelog generation
- Update CHANGELOG.md
- Update CHANGELOG.md
- Update CHANGELOG.md
- Update CHANGELOG.md

### Refactoring

- Consolidate colour and size guards into shared palette helpers

### Styling

- Apply linter fixes to CLI-generated files

### Testing

- Add MockAlphabet test double with non-Hexahue dimensions
- Add dimension-agnostic VisualAlphabet contract suite
- Give MockAlphabet a real consumer and address review findings
- Align tests with docs/tests/reading-order.md contract
- Add module-wiring test, fix stale JSDoc, update TEST-001 deps
- Add sections 2-6 behavioral tests from docs/tests/reading-order.md
- Add shared fixtures for grid construction tests
- Assert padding region differs from message symbol rendering
- Add shared fixtures for rotation engine tests
- Add missing messageLength=0 case to header round-trip tests
- Add PngRenderer integration tests for the full pipeline
- Add SvgRenderer integration tests for the full pipeline
- Add full HTTP-level test suite for key generate/parse endpoints
- Add full HTTP-level test suite for POST /decode
- Enforce coverage thresholds on the algorithmic core
- Make the e2e suite hit a real seeded database
- Enforce coverage thresholds, close two real test gaps


