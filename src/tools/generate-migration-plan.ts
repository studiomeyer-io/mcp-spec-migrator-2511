import { z } from "zod";
import { SpecVersionSchema } from "../types.js";
import { generatePlan } from "../plan/generate.js";

export const generateMigrationPlanInput = {
  repo_path: z.string().min(1).describe("Path to the MCP server repo to migrate."),
  target_version: SpecVersionSchema.describe("Target spec version to migrate to."),
};

export const generateMigrationPlanAnnotations = {
  title: "Generate MCP Migration Plan",
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export const generateMigrationPlanDescription =
  "Read-only: detect the source spec, compute the diff to target, and emit a structured MIGRATION.md with per-file change suggestions. Never writes patches. Files outside src/ (README, agent-card.json, .well-known/) are listed as unscanned for manual grep.";

export async function runGenerateMigrationPlan(args: {
  repo_path: string;
  target_version: import("../types.js").SpecVersion;
}) {
  return generatePlan(args.repo_path, args.target_version);
}
