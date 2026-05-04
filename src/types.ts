import { z } from "zod";

/**
 * Known MCP spec versions. The migrator only knows about these four — anything
 * else returns an `unknown` detection result with explicit evidence.
 */
export const SpecVersionSchema = z.enum([
  "2024-11-05",
  "2025-03-26",
  "2025-06-18",
  "2025-11-25",
]);
export type SpecVersion = z.infer<typeof SpecVersionSchema>;

export const ALL_SPEC_VERSIONS: readonly SpecVersion[] = [
  "2024-11-05",
  "2025-03-26",
  "2025-06-18",
  "2025-11-25",
] as const;

export const CURRENT_REFERENCE_VERSION: SpecVersion = "2025-06-18";
export const LATEST_VERSION: SpecVersion = "2025-11-25";

/**
 * Change category. `experimental` is used for SEPs that are released but flagged
 * as not-yet-stable (e.g. Tasks primitive in 2025-11-25).
 */
export const ChangeCategorySchema = z.enum([
  "breaking",
  "deprecation",
  "addition",
  "experimental",
]);
export type ChangeCategory = z.infer<typeof ChangeCategorySchema>;

export const ChangeSchema = z.object({
  id: z.string(),
  category: ChangeCategorySchema,
  area: z.string(),
  description: z.string(),
  rationale: z.string().optional(),
  migrationHint: z.string().optional(),
  introducedIn: SpecVersionSchema,
});
export type Change = z.infer<typeof ChangeSchema>;

export const SpecStatusSchema = z.enum([
  "legacy",
  "stable",
  "reference",
  "current",
]);
export type SpecStatus = z.infer<typeof SpecStatusSchema>;

/**
 * Static description of a single spec version. All four versions are encoded
 * in `src/specs/*.ts` and exposed via `src/specs/index.ts` as a registry.
 */
export interface SpecDefinition {
  version: SpecVersion;
  releaseDate: string; // ISO date
  status: SpecStatus;
  /**
   * Expected SDK semver ranges. Used as a 0.85-confidence signal in detection.
   */
  sdkRanges: {
    typescript: string;
  };
  /**
   * Source-level fingerprints used by ast-fingerprints.ts to score detection.
   */
  fingerprints: {
    /** Method names passed to `setRequestHandler(...)` that imply this spec. */
    requestHandlers: string[];
    /** Annotation field names introduced in this spec. */
    annotations: string[];
    /** Optional constructor-level meta key (e.g. `specVersion`). */
    constructorMeta?: string;
  };
  changes: Change[];
}

export const DetectionEvidenceSchema = z.object({
  file: z.string(),
  line: z.number().int().nonnegative(),
  snippet: z.string(),
  signal: z.string(),
});
export type DetectionEvidence = z.infer<typeof DetectionEvidenceSchema>;

export const DetectionResultSchema = z.object({
  detected: z.union([SpecVersionSchema, z.literal("unknown")]),
  confidence: z.number().min(0).max(1),
  evidence: z.array(DetectionEvidenceSchema),
  sdkVersion: z.string().nullable(),
  candidates: z.array(
    z.object({
      version: SpecVersionSchema,
      score: z.number().min(0).max(1),
    }),
  ),
});
export type DetectionResult = z.infer<typeof DetectionResultSchema>;

export const CompatibilityMatrixSchema = z.object({
  from: SpecVersionSchema,
  to: SpecVersionSchema,
  breaking: z.array(ChangeSchema),
  soft_deprecations: z.array(ChangeSchema),
  new_features: z.array(ChangeSchema),
  experimental: z.array(ChangeSchema),
  unchanged_areas: z.array(z.string()),
});
export type CompatibilityMatrix = z.infer<typeof CompatibilityMatrixSchema>;

export const FileChangeSchema = z.object({
  path: z.string(),
  changes: z.array(z.string()),
});
export type FileChange = z.infer<typeof FileChangeSchema>;

export const MigrationPlanSchema = z.object({
  source_version: z.union([SpecVersionSchema, z.literal("unknown")]),
  target_version: SpecVersionSchema,
  plan_markdown: z.string(),
  files_to_touch: z.array(FileChangeSchema),
  estimated_diff_kb: z.number().nonnegative(),
  unscanned_files: z.array(z.string()),
});
export type MigrationPlan = z.infer<typeof MigrationPlanSchema>;

export const CheckResultSchema = z.object({
  complete: z.boolean(),
  target_version: SpecVersionSchema,
  detected_version: z.union([SpecVersionSchema, z.literal("unknown")]),
  missing_steps: z.array(z.string()),
  warnings: z.array(z.string()),
});
export type CheckResult = z.infer<typeof CheckResultSchema>;
