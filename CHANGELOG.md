# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-06-21

### Fixed
- **Rule correctness — `2025-11-25` Tasks primitive (HIGH):** the spec data
  declared a `tasks/create` request-handler fingerprint and migration hint.
  There is **no `tasks/create` method** in MCP `2025-11-25` — tasks are created
  via *request augmentation* (a `task` field on an existing request such as
  `tools/call`, returning a `CreateTaskResult`), then polled. The real task
  methods are `tasks/get`, `tasks/list`, `tasks/cancel`, `tasks/result`. A
  `tasks/create` fingerprint can never legitimately fire, and the hint told
  users to add a handler that does not exist. Corrected the fingerprints, the
  `tasks-primitive` change description / migration hint
  (`src/specs/2025-11-25.ts`), the plan triggers (`src/plan/generate.ts`) and
  the completeness-check message (`src/plan/check.ts`). Verified field-by-field
  against `modelcontextprotocol.io/specification/2025-11-25` via context7.

### Added
- **Two missing `2025-11-25` changes** the matrix/plan did not surface, both
  confirmed in the official changelog:
  - `json-schema-2020-12-default` — JSON Schema 2020-12 is now the default
    dialect for all MCP schema definitions.
  - `elicitation-default-values` — elicitation schemas may specify `default`
    values for primitive types (string / number / enum).
- **Test typechecking.** `tests/**` were previously excluded from `tsc`, so a
  type error in a test never failed CI. New `tsconfig.test.json` + `npm run
  typecheck:tests`, folded into `npm run lint`. This immediately surfaced (and
  fixed) a latent `noUncheckedIndexedAccess` issue in `tests/server.test.ts`.
- **Coverage** raised from 86.3% → 90.5% statements / 73.3% → 80.8% branches
  (23 new tests, 35 → 58 total):
  - `tests/specs.test.ts` — new file locking spec-data facts (no `tasks/create`,
    correct task methods, new additions, unique change ids, `introducedIn`
    integrity, core-handler presence, single `specVersion` meta owner).
  - Matrix: downgrade-direction path (the previously untested F4 path),
    `matrixAsMarkdown` section/empty rendering, adjacent-step ⊆ full-span chain
    consistency, and the two new `2025-11-25` additions.
  - Plan: tasks-primitive trigger fires on a task-augmented `2025-11-25` fixture
    and does **not** fire on a `2025-06-18` server with no task surface
    (false-positive guard).
  - Check: per-id branch coverage for `sampling-with-tools`,
    `form-url-elicitation`, `drop-http-sse-transport` (dual-transport pass) and
    `include-context` soft-deprecation (positive + negative cases).
- New test fixtures: `FIXTURE_2025_06_18_NO_TASKS` and
  `FIXTURE_2025_11_25_TASK_AUGMENTED`; `FIXTURE_2025_11_25` updated to the real
  request-augmentation task model (no `tasks/create`).

### Notes
- No public API changes. Detection/diff/plan **output** changes for repos that
  reference the corrected `2025-11-25` task surface, hence the patch bump.
- F4 (downgrade direction in `computeMatrix`) is now covered by tests; the
  aggregate change set is direction-agnostic by design and `from`/`to` are kept
  faithful to the caller's arguments. Flipping additions↔removals for true
  down-migrations remains deferred to a future minor (still rare in practice).

## [0.1.0] - 2026-05-02

### Added
- Initial release.
- Detection of 4 MCP spec versions: `2024-11-05`, `2025-03-26`, `2025-06-18`, `2025-11-25`.
- Compatibility matrix between any two spec versions.
- Migration plan generator (`MIGRATION.md`) — read-only, no patch application.
- Migration completeness checker.
- 6 MCP tools (all `readOnlyHint: true`):
  - `detect_spec_version`
  - `compatibility_matrix`
  - `generate_migration_plan`
  - `check_migration_complete`
  - `list_supported_versions`
  - `diff_spec_versions`
- CLI with 5 subcommands: `detect`, `plan`, `check`, `diff`, `versions`.
- ts-morph based AST fingerprinting.
- Vitest test suite covering detection, matrix, plan, check, CLI, and server.

### Round 2 (Reviewer + Tester findings, addressed before publish)
- **F1 (MEDIUM):** `describeBreakingFailure` and `describeDeprecationWarning` in
  `src/plan/check.ts` now return a defensive non-null reason for any unknown
  change id. Previously, only `drop-jsonrpc-batching` (breaking) and two
  deprecations were matched; every other id silently fell to `null`, which
  let `check_migration_complete` report `complete: true` for migrations it
  had not actually verified. New explicit cases for `tasks-primitive`,
  `sampling-with-tools`, and `form-url-elicitation`. 6 regression tests in
  `tests/check.test.ts` lock the defensive default.
- **F2 (MEDIUM):** `package.json` devDependencies bumped to plan baseline:
  `typescript@^6.0.0`, `vitest@^4.0.0` (was `^5.6.0` and `^2.1.0`).
  `tsx@^4.19.0` retained. tsconfig adds `"types": ["node"]` to satisfy
  TS 6's stricter `lib`/`types` defaults.
- **F3 (MEDIUM):** `tests/server.test.ts` now asserts that `buildServer()`
  registers exactly the 6 planned tools (by name) and that every tool
  carries the read-only annotation set. A future drop or rename of any
  tool will fail CI immediately.
- **F5 (LOW):** `readPackageJson` in `src/server.ts` now writes a stderr
  warning when both candidate paths fail; previously a packaging breakage
  would silently advertise fallback metadata.

### Verified against the 4 StudioMeyer hosted MCP servers (read-only detect run)
Detection output committed in `TEST_REPORT.md`:

| Server  | Detected spec | Confidence | SDK     | Evidence signals |
|---------|---------------|------------|---------|------------------|
| Memory  | 2025-06-18    | 0.94       | 1.26.0  | 13               |
| CRM     | 2025-06-18    | 0.90       | 1.26.0  | 7                |
| GEO     | 2025-06-18    | 0.85       | 1.26.0  | 1                |
| Crew    | 2025-06-18    | 0.90       | 1.12.1  | 7                |

### Known limitations (deferred to v0.1.1 / v0.2.0)
- **F4 (LOW):** `src/matrix/compute.ts` does not yet honour the `isDowngrade`
  flag from `versionChain`. Down-version queries currently aggregate
  upstream additions instead of flipping their direction. No tests cover
  this path. Defer; downstream is monotonic in practice (servers move
  forward across spec versions, not back).
- **F1 partial:** Closure check is heuristic — substring matches over
  candidate files only. Deeper AST scoping deferred to v0.2.0.

### Notes
- Tasks primitive in `2025-11-25` flagged as `experimental: true` (Innovator source).
- Migrator itself runs on spec `2025-06-18` (stable reference). Move to `2025-11-25` deferred until Inspector + Claude Desktop adopt the new spec.
- `--apply` flag is explicit Out of Scope (separate B4 build).
