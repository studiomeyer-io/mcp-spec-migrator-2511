# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
