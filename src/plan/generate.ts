import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, extname } from "node:path";
import {
  type FileChange,
  type MigrationPlan,
  type SpecVersion,
} from "../types.js";
import { detect } from "../detect/confidence.js";
import { computeMatrix, matrixAsMarkdown } from "../matrix/compute.js";

const SCAN_EXT = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs"]);
const MAX_FILES = 300;

/**
 * Read-only migration plan generator. Detects the source spec version, computes
 * the compatibility matrix to `target_version`, then walks source files to map
 * each change to concrete files. Never writes patches — only emits MIGRATION.md
 * text and a `files_to_touch` array.
 */
export async function generatePlan(
  repoPath: string,
  target_version: SpecVersion,
): Promise<MigrationPlan> {
  const detection = await detect(repoPath);
  const source: SpecVersion | "unknown" = detection.detected;

  let plan_markdown: string;
  let files_to_touch: FileChange[] = [];
  let estimated_diff_kb = 0;
  const unscanned_files: string[] = [];

  if (source === "unknown") {
    plan_markdown = renderUnknownPlan(repoPath, target_version, detection.evidence.length);
    return {
      source_version: "unknown",
      target_version,
      plan_markdown,
      files_to_touch: [],
      estimated_diff_kb: 0,
      unscanned_files: ["package.json", "src/**/*"],
    };
  }

  if (source === target_version) {
    plan_markdown = renderNoOpPlan(target_version);
    return {
      source_version: source,
      target_version,
      plan_markdown,
      files_to_touch: [],
      estimated_diff_kb: 0,
      unscanned_files: [],
    };
  }

  const matrix = computeMatrix(source, target_version);
  const sourceFiles = await collectFiles(repoPath);

  // Map each change to source files where its trigger words appear. Pure
  // grep-style mapping — no AST mutation, no patch generation.
  const fileBuckets = new Map<string, string[]>();

  for (const change of [
    ...matrix.breaking,
    ...matrix.soft_deprecations,
    ...matrix.new_features,
    ...matrix.experimental,
  ]) {
    const triggers = changeTriggers(change.id);
    for (const file of sourceFiles) {
      try {
        const text = await readFile(file, "utf8");
        if (triggers.some((t) => text.includes(t))) {
          const rel = relative(repoPath, file);
          const arr = fileBuckets.get(rel) ?? [];
          arr.push(`[${change.category}] ${change.id}: ${change.description}`);
          fileBuckets.set(rel, arr);
        }
      } catch {
        unscanned_files.push(relative(repoPath, file));
      }
    }
  }

  files_to_touch = Array.from(fileBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, changes]) => ({ path, changes }));

  // Conservative diff size estimate: 0.5 KB per change-line item.
  estimated_diff_kb = Math.round(
    files_to_touch.reduce((acc, f) => acc + f.changes.length, 0) * 0.5,
  );

  plan_markdown = renderFullPlan({
    source,
    target_version,
    matrix_md: matrixAsMarkdown(matrix),
    files_to_touch,
    detection_confidence: detection.confidence,
  });

  // Surface machine-readable files we never opened (per MEMORY.md rule:
  // pivot/rebrand grep across all machine-readable files).
  unscanned_files.push(
    "README.md",
    "agent-card.json",
    ".well-known/mcp.json",
    "i18n/**",
  );

  return {
    source_version: source,
    target_version,
    plan_markdown,
    files_to_touch,
    estimated_diff_kb,
    unscanned_files: dedupe(unscanned_files),
  };
}

function changeTriggers(id: string): string[] {
  switch (id) {
    case "streamable-http":
      return ["StreamableHTTPServerTransport", "streamable-http", "SSEServerTransport"];
    case "oauth-2-1":
      return ["oauth", "OAuth", "PKCE"];
    case "tool-annotations":
      return ["readOnlyHint", "destructiveHint", "idempotentHint", "openWorldHint"];
    case "audio-content":
      return ["audio", "AudioContent"];
    case "drop-http-sse-transport":
      return ["SSEServerTransport", "/sse"];
    case "elicitation-primitive":
      return ["elicitation/create", "ElicitRequest", "elicitInput"];
    case "structured-tool-output":
      return ["structuredContent", "outputSchema"];
    case "resource-link-content":
      return ["ResourceLink", "resource_link"];
    case "tool-meta-field":
      return ["_meta"];
    case "drop-jsonrpc-batching":
      return ["JSONRPCBatchRequest", "batch"];
    case "tasks-primitive":
      return ["tasks/create", "tasks/get", "tasks/list", "tasks/cancel"];
    case "sampling-with-tools":
      return ["sampling/createMessage"];
    case "form-url-elicitation":
      return ["-32042", "elicitation/create"];
    case "include-context-soft-deprecation":
      return ["includeContext", "thisServer", "allServers"];
    default:
      return [];
  }
}

async function collectFiles(repoPath: string): Promise<string[]> {
  const out: string[] = [];
  const roots = ["src", "lib", "server"].map((r) => join(repoPath, r));
  for (const root of roots) {
    if (existsSync(root)) await walk(root, out);
    if (out.length >= MAX_FILES) break;
  }
  if (out.length === 0) await walk(repoPath, out, true);
  return out.slice(0, MAX_FILES);
}

async function walk(
  dir: string,
  out: string[],
  shallow = false,
): Promise<void> {
  let entries: import("node:fs").Dirent[] = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (out.length >= MAX_FILES) return;
    if (entry.name.startsWith(".")) continue;
    if (
      entry.name === "node_modules" ||
      entry.name === "dist" ||
      entry.name === "build" ||
      entry.name === "coverage"
    )
      continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (shallow) continue;
      await walk(full, out, false);
    } else if (entry.isFile() && SCAN_EXT.has(extname(entry.name))) {
      out.push(full);
    }
  }
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

function renderNoOpPlan(version: SpecVersion): string {
  return [
    `# Migration Plan`,
    "",
    `Repo is already on ${version}. No migration needed.`,
    "",
  ].join("\n");
}

function renderUnknownPlan(
  repoPath: string,
  target: SpecVersion,
  evidenceCount: number,
): string {
  return [
    `# Migration Plan`,
    "",
    `**Source spec:** unknown (${evidenceCount} signal${evidenceCount === 1 ? "" : "s"} below 0.50 confidence)`,
    `**Target spec:** ${target}`,
    "",
    `The migrator could not determine the current spec version of \`${repoPath}\` with confidence ≥ 0.50.`,
    "",
    "## Next steps",
    "- Verify `package.json` declares `@modelcontextprotocol/sdk`.",
    "- Check `src/server.ts` (or equivalent) imports `@modelcontextprotocol/sdk/server/...`.",
    "- If the project uses a non-SDK MCP implementation (e.g. FastMCP, custom JSON-RPC), declare `meta: { specVersion: 'YYYY-MM-DD' }` in the server constructor and re-run detection.",
    "",
  ].join("\n");
}

function renderFullPlan(args: {
  source: SpecVersion;
  target_version: SpecVersion;
  matrix_md: string;
  files_to_touch: FileChange[];
  detection_confidence: number;
}): string {
  const { source, target_version, matrix_md, files_to_touch, detection_confidence } = args;
  const lines: string[] = [];
  lines.push(`# Migration Plan: ${source} → ${target_version}`);
  lines.push("");
  lines.push(`**Detection confidence:** ${detection_confidence.toFixed(2)}`);
  lines.push("");
  lines.push("## Spec diff");
  lines.push("");
  lines.push(matrix_md);
  lines.push("## Files to touch");
  lines.push("");
  if (files_to_touch.length === 0) {
    lines.push(
      "_No source files matched any change trigger. Review the spec diff above; you may still need to update README.md or agent-card.json manually._",
    );
  } else {
    for (const f of files_to_touch) {
      lines.push(`### \`${f.path}\``);
      lines.push("");
      for (const c of f.changes) lines.push(`- ${c}`);
      lines.push("");
    }
  }
  lines.push("## Notes");
  lines.push("");
  lines.push(
    "- This plan is read-only. The migrator does NOT apply patches. Review and apply manually or with a separate codemod tool.",
  );
  lines.push(
    "- Machine-readable files outside of `src/` (README.md, agent-card.json, .well-known/mcp.json, i18n/**) are NOT scanned. Run a `grep` pass per MEMORY.md rule.",
  );
  return lines.join("\n");
}
