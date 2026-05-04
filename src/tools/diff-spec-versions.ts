import { z } from "zod";
import { SpecVersionSchema } from "../types.js";
import { computeMatrix, matrixAsMarkdown } from "../matrix/compute.js";

export const diffSpecVersionsInput = {
  v1: SpecVersionSchema.describe("First spec version."),
  v2: SpecVersionSchema.describe("Second spec version."),
  format: z.enum(["markdown", "json"]).optional().describe("Output format. Defaults to json."),
};

export const diffSpecVersionsAnnotations = {
  title: "Diff Two MCP Spec Versions",
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export const diffSpecVersionsDescription =
  "Pure function: structured diff between any two known MCP spec versions. Same as compatibility_matrix but with format=markdown option for human-readable output.";

export async function runDiffSpecVersions(args: {
  v1: import("../types.js").SpecVersion;
  v2: import("../types.js").SpecVersion;
  format?: "markdown" | "json";
}) {
  const matrix = computeMatrix(args.v1, args.v2);
  const summary = {
    breaking_count: matrix.breaking.length,
    deprec_count: matrix.soft_deprecations.length,
    additions_count: matrix.new_features.length,
    experimental_count: matrix.experimental.length,
  };
  if (args.format === "markdown") {
    return { diff: matrixAsMarkdown(matrix), summary };
  }
  return { diff: matrix, summary };
}
