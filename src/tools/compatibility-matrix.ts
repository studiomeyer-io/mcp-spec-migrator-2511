import { SpecVersionSchema } from "../types.js";
import { computeMatrix } from "../matrix/compute.js";

export const compatibilityMatrixInput = {
  from: SpecVersionSchema.describe("Source spec version."),
  to: SpecVersionSchema.describe("Target spec version."),
};

export const compatibilityMatrixAnnotations = {
  title: "MCP Spec Compatibility Matrix",
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export const compatibilityMatrixDescription =
  "Pure function: compute the compatibility matrix between two MCP spec versions. Returns breaking changes, soft deprecations, new features, experimental items, and unchanged areas. No I/O, no network — same input always returns the same output.";

export async function runCompatibilityMatrix(args: {
  from: import("../types.js").SpecVersion;
  to: import("../types.js").SpecVersion;
}) {
  return computeMatrix(args.from, args.to);
}
