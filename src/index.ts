/**
 * Public library entry. Consumers can import detection, matrix and plan
 * utilities directly without spawning the MCP server.
 */
export * from "./types.js";
export {
  ALL_SPEC_VERSIONS,
  CURRENT_REFERENCE_VERSION,
  LATEST_VERSION,
  getSpec,
  listSpecs,
  getCurrentReference,
  getLatest,
} from "./specs/index.js";
export { detect } from "./detect/confidence.js";
export { computeMatrix, matrixAsMarkdown } from "./matrix/compute.js";
export { versionChain, partitionChanges } from "./matrix/changes.js";
export { generatePlan } from "./plan/generate.js";
export { checkMigration } from "./plan/check.js";
