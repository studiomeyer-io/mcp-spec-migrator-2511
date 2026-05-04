import { z } from "zod";
import { SpecVersionSchema } from "../types.js";
import { checkMigration } from "../plan/check.js";

export const checkMigrationCompleteInput = {
  repo_path: z.string().min(1).describe("Path to the MCP server repo to verify."),
  target_version: SpecVersionSchema.describe("Spec version the repo claims to be on."),
};

export const checkMigrationCompleteAnnotations = {
  title: "Check MCP Migration Complete",
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export const checkMigrationCompleteDescription =
  "Closure check: returns `complete: true` only if every breaking change between the detected source spec and the target spec has been addressed. Useful as a pre-commit / pre-publish gate.";

export async function runCheckMigrationComplete(args: {
  repo_path: string;
  target_version: import("../types.js").SpecVersion;
}) {
  return checkMigration(args.repo_path, args.target_version);
}
