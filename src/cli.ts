#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { runDetectSpecVersion } from "./tools/detect-spec-version.js";
import { runGenerateMigrationPlan } from "./tools/generate-migration-plan.js";
import { runCheckMigrationComplete } from "./tools/check-migration-complete.js";
import { runDiffSpecVersions } from "./tools/diff-spec-versions.js";
import { runListSupportedVersions } from "./tools/list-supported-versions.js";
import { SpecVersionSchema, type SpecVersion } from "./types.js";

interface PackageJsonShape {
  name?: string;
  version?: string;
}

function readVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const path of [
    join(here, "..", "package.json"),
    join(here, "..", "..", "package.json"),
  ]) {
    try {
      const raw = readFileSync(path, "utf8");
      const parsed = JSON.parse(raw) as PackageJsonShape;
      if (parsed.version) return parsed.version;
    } catch {
      // continue
    }
  }
  return "0.0.0";
}

function parseTarget(value: string): SpecVersion {
  const parsed = SpecVersionSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(
      `Invalid spec version: ${value}. Expected one of: 2024-11-05, 2025-03-26, 2025-06-18, 2025-11-25.`,
    );
  }
  return parsed.data;
}

export function buildProgram(): Command {
  const program = new Command();
  program
    .name("mcp-spec-migrator")
    .description("Detect, plan and verify MCP spec version migrations.")
    .version(readVersion());

  program
    .command("detect")
    .description("Detect the MCP spec version of a repo.")
    .argument("<repo>", "Path to the MCP server repo")
    .option("--json", "Output JSON instead of human-readable text")
    .action(async (repo: string, opts: { json?: boolean }) => {
      const result = await runDetectSpecVersion({ repo_path: resolve(repo) });
      if (opts.json) {
        process.stdout.write(JSON.stringify(result, null, 2) + "\n");
        return;
      }
      process.stdout.write(
        `Detected: ${result.detected} (confidence ${result.confidence.toFixed(2)})\n` +
          `SDK: ${result.sdkVersion ?? "<not found>"}\n` +
          `Evidence (${result.evidence.length} signals):\n` +
          result.evidence
            .slice(0, 20)
            .map((e) => `  - ${e.file}:${e.line} [${e.signal}] ${e.snippet}`)
            .join("\n") +
          (result.evidence.length > 20 ? `\n  ... +${result.evidence.length - 20} more` : "") +
          "\n",
      );
    });

  program
    .command("plan")
    .description("Generate a migration plan for a repo.")
    .argument("<repo>", "Path to the MCP server repo")
    .requiredOption("--target <version>", "Target spec version", parseTarget)
    .option("--json", "Emit structured JSON instead of MIGRATION.md text")
    .action(async (repo: string, opts: { target: SpecVersion; json?: boolean }) => {
      const result = await runGenerateMigrationPlan({
        repo_path: resolve(repo),
        target_version: opts.target,
      });
      if (opts.json) {
        process.stdout.write(JSON.stringify(result, null, 2) + "\n");
        return;
      }
      process.stdout.write(result.plan_markdown + "\n");
    });

  program
    .command("check")
    .description("Verify a repo has completed migration to a target spec.")
    .argument("<repo>", "Path to the MCP server repo")
    .requiredOption("--target <version>", "Target spec version", parseTarget)
    .option("--json", "Emit structured JSON")
    .action(async (repo: string, opts: { target: SpecVersion; json?: boolean }) => {
      const result = await runCheckMigrationComplete({
        repo_path: resolve(repo),
        target_version: opts.target,
      });
      if (opts.json) {
        process.stdout.write(JSON.stringify(result, null, 2) + "\n");
      } else {
        const status = result.complete ? "COMPLETE" : "INCOMPLETE";
        process.stdout.write(
          `${status}: ${result.detected_version} -> ${result.target_version}\n` +
            (result.missing_steps.length > 0
              ? `Missing:\n${result.missing_steps.map((s) => `  - ${s}`).join("\n")}\n`
              : "") +
            (result.warnings.length > 0
              ? `Warnings:\n${result.warnings.map((w) => `  - ${w}`).join("\n")}\n`
              : ""),
        );
      }
      process.exitCode = result.complete ? 0 : 1;
    });

  program
    .command("diff")
    .description("Show the diff between two spec versions.")
    .argument("<v1>", "First version", parseTarget)
    .argument("<v2>", "Second version", parseTarget)
    .option("--format <format>", "Output format: markdown or json", "markdown")
    .action(async (v1: SpecVersion, v2: SpecVersion, opts: { format: string }) => {
      const fmt = opts.format === "json" ? "json" : "markdown";
      const result = await runDiffSpecVersions({ v1, v2, format: fmt });
      if (fmt === "json") {
        process.stdout.write(JSON.stringify(result, null, 2) + "\n");
      } else {
        process.stdout.write(String(result.diff) + "\n");
      }
    });

  program
    .command("versions")
    .description("List supported MCP spec versions.")
    .option("--json", "Emit JSON")
    .action(async (opts: { json?: boolean }) => {
      const result = await runListSupportedVersions();
      if (opts.json) {
        process.stdout.write(JSON.stringify(result, null, 2) + "\n");
        return;
      }
      process.stdout.write(
        result.detail
          .map(
            (d) =>
              `${d.version}  [${d.status}]  released ${d.releaseDate}` +
              (d.version === result.current_reference ? "  (reference)" : "") +
              (d.version === result.latest ? "  (latest)" : ""),
          )
          .join("\n") + "\n",
      );
    });

  return program;
}

async function main(argv: string[]): Promise<void> {
  const program = buildProgram();
  await program.parseAsync(argv);
}

// Direct-invoke detection mirrors server.ts.
const isDirectInvoke = (() => {
  try {
    const invokedFile = process.argv[1];
    if (!invokedFile) return false;
    const thisFile = fileURLToPath(import.meta.url);
    return invokedFile === thisFile;
  } catch {
    return false;
  }
})();

if (isDirectInvoke) {
  // If no command, print help and exit 0 cleanly (so smoke-spawn passes).
  if (process.argv.length <= 2) {
    buildProgram().outputHelp();
    process.exit(0);
  }
  main(process.argv).catch((err: unknown) => {
    process.stderr.write(`mcp-spec-migrator: ${String(err)}\n`);
    process.exit(1);
  });
}
