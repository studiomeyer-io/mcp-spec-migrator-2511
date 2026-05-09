# mcp-spec-migrator


<!-- badges -->
[![npm version](https://img.shields.io/npm/v/mcp-spec-migrator?style=flat-square&color=cb3837&logo=npm&label=npm)](https://www.npmjs.com/package/mcp-spec-migrator)
[![npm downloads](https://img.shields.io/npm/dm/mcp-spec-migrator?style=flat-square&color=cb3837&logo=npm&label=installs%2Fmo)](https://www.npmjs.com/package/mcp-spec-migrator)
![License](https://img.shields.io/github/license/studiomeyer-io/mcp-spec-migrator-2511?style=flat-square&color=22c55e&label=license)
![Last commit](https://img.shields.io/github/last-commit/studiomeyer-io/mcp-spec-migrator-2511?style=flat-square&color=88c0d0&label=updated)
![GitHub stars](https://img.shields.io/github/stars/studiomeyer-io/mcp-spec-migrator-2511?style=flat-square&color=ffd700&logo=github&label=stars)
<!-- /badges -->Codemod and compatibility-matrix tool for migrating MCP server repos across spec versions.

Detects which MCP spec a repo targets, computes the diff to a target version, generates a `MIGRATION.md` plan, and verifies completion. Read-only — never writes patches into your repo.

## A note from us

We have been building tools and systems for ourselves for the past two years. The fact that this repo is small and has few stars is not because it is new. It is because we only just decided to share what we have built. It is not a fresh experiment, it is a long story with a recent commit.

We love building things and sharing them. We do not love social media tactics, growth hacks, or chasing stars and followers. So this repo is small. The code is real, it gets used, issues get answered. Judge for yourself.

If it helps you, sharing, testing, and feedback help us. If it could be better, an issue is more useful. If you build something with it, tell us at hello@studiomeyer.io. That genuinely makes our day.

From a small studio in Palma de Mallorca.

## Install

```bash
npm install -g mcp-spec-migrator
# or one-shot
npx mcp-spec-migrator detect /path/to/your-mcp-server
```

Library:

```bash
npm install mcp-spec-migrator
```

```ts
import { detect, computeMatrix, generatePlan } from "mcp-spec-migrator";

const result = await detect("/path/to/repo");
console.log(result.detected, result.confidence);
```

Requires Node 20+.

## Supported spec versions

| Version    | Status     | Released    |
|------------|------------|-------------|
| 2024-11-05 | legacy     | 2024-11-05  |
| 2025-03-26 | legacy     | 2025-03-26  |
| 2025-06-18 | reference  | 2025-06-18  |
| 2025-11-25 | current    | 2025-11-25  |

Migrator itself runs on `2025-06-18`. It is intentionally not on `2025-11-25` until Inspector + Claude Desktop adopt the new spec — keeping the migrator backwards-compatible with older clients.

## CLI

```bash
mcp-spec-migrator versions
mcp-spec-migrator detect <repo>          [--json]
mcp-spec-migrator plan <repo>            --target <version>  [--json]
mcp-spec-migrator check <repo>           --target <version>  [--json]
mcp-spec-migrator diff <v1> <v2>         [--format markdown|json]
```

Examples:

```bash
mcp-spec-migrator detect ./my-mcp-server
mcp-spec-migrator plan ./my-mcp-server --target 2025-11-25 > MIGRATION.md
mcp-spec-migrator check ./my-mcp-server --target 2025-11-25
mcp-spec-migrator diff 2025-06-18 2025-11-25
```

`check` exits with code `1` if migration is incomplete — useful as a pre-commit gate.

## MCP server

The same logic is exposed as a 6-tool MCP server over stdio. All tools are `readOnlyHint: true` and `destructiveHint: false`.

| Tool                       | Args                                  | Returns                                                    |
|----------------------------|---------------------------------------|------------------------------------------------------------|
| `detect_spec_version`      | `{ repo_path }`                       | `{ detected, confidence, evidence[], sdkVersion, candidates[] }` |
| `compatibility_matrix`     | `{ from, to }`                        | `{ breaking[], soft_deprecations[], new_features[], experimental[], unchanged_areas[] }` |
| `generate_migration_plan`  | `{ repo_path, target_version }`       | `{ plan_markdown, files_to_touch[], estimated_diff_kb, unscanned_files[] }` |
| `check_migration_complete` | `{ repo_path, target_version }`       | `{ complete, missing_steps[], warnings[] }`               |
| `list_supported_versions`  | `{}`                                  | `{ versions[], current_reference, latest, detail[] }`     |
| `diff_spec_versions`       | `{ v1, v2, format? }`                 | `{ diff, summary }`                                       |

Wire it up in Claude Desktop / VS Code MCP / Inspector:

```json
{
  "mcpServers": {
    "spec-migrator": {
      "command": "npx",
      "args": ["-y", "mcp-spec-migrator"]
    }
  }
}
```

## Compatibility matrix

| Migrator version | MCP SDK | Node  | Spec it runs on | Specs it can detect & plan |
|------------------|---------|-------|-----------------|------------------------------|
| 0.1.x            | ^1.29.0 | 20+   | 2025-06-18      | 2024-11-05, 2025-03-26, 2025-06-18, 2025-11-25 |

## Detection strategy

Confidence is in `[0, 1]`. The migrator returns `unknown` below `0.50` rather than guessing.

1. **1.00** — Explicit `meta.specVersion` in the server constructor.
2. **0.85** — `@modelcontextprotocol/sdk` semver range maps unambiguously to one spec.
3. **0.60** — AST fingerprint pattern (request handler names, annotation field names).
4. **<0.50** → `unknown` with full evidence list.

Source files outside `src/`, `lib/`, `server/` are not scanned. Files larger than 256 KB are skipped. ts-morph parse failures are caught per-file so one bad source file does not halt detection.

## Recommended migration order for the StudioMeyer fleet

1. **Memory** (56 tools, highest surface)
2. **CRM** (33 tools)
3. **GEO** (24 tools)
4. **Crew** (10 tools)

## Recommended hook recipes

| Event             | Tool                       | Use case                                            |
|-------------------|----------------------------|-----------------------------------------------------|
| `Stop`            | `detect_spec_version`      | Auto-detect at session end. Warns on stale spec.    |
| `UserPromptSubmit`| `list_supported_versions`  | Trigger on phrase "spec version?" — direct answer.  |
| `PreCompact`      | `generate_migration_plan`  | Persist plan to memory before context compaction.   |
| `Stop`            | `check_migration_complete` | Pre-commit gate: block when target spec incomplete. |
| `UserPromptSubmit`| `diff_spec_versions`       | Trigger on phrase "diff 2025-X 2025-Y".             |

All tools are read-only, deterministic, and run in <10s on typical repos. No network calls. No telemetry.

## Out of scope

- `--apply` flag (auto-applying patches). Separate build, intentionally deferred.
- Python-SDK MCP servers. v2.
- Live spec fetch at runtime. Spec data is committed as code.
- Hosted SaaS wrapper. CLI + library only.

## License

MIT — Copyright (c) 2026 Matthias Meyer (StudioMeyer).
