import type {
  CompatibilityMatrix,
  Change,
  SpecVersion,
} from "../types.js";
import { getSpec } from "../specs/index.js";
import { partitionChanges, versionChain } from "./changes.js";

const ALL_AREAS = [
  "core",
  "transport",
  "auth",
  "tools",
  "resources",
  "prompts",
  "elicitation",
  "sampling",
  "tasks",
  "content",
] as const;

/**
 * Pure function: compatibility matrix between two spec versions. Aggregates
 * all changes introduced strictly after `from` up to and including `to`.
 *
 * Same input always yields the same output — no I/O, no time, no random.
 */
export function computeMatrix(
  from: SpecVersion,
  to: SpecVersion,
): CompatibilityMatrix {
  const { chain } = versionChain(from, to);
  const collected: Change[] = [];
  for (const v of chain) {
    const spec = getSpec(v);
    collected.push(...spec.changes);
  }
  // Deduplicate by id.
  const seen = new Set<string>();
  const unique = collected.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  const partitioned = partitionChanges(unique);

  const touchedAreas = new Set(unique.map((c) => c.area));
  const unchanged_areas = ALL_AREAS.filter((a) => !touchedAreas.has(a));

  return {
    from,
    to,
    breaking: partitioned.breaking,
    soft_deprecations: partitioned.soft_deprecations,
    new_features: partitioned.new_features,
    experimental: partitioned.experimental,
    unchanged_areas,
  };
}

export function matrixAsMarkdown(matrix: CompatibilityMatrix): string {
  const lines: string[] = [];
  lines.push(`# MCP Spec Diff: ${matrix.from} → ${matrix.to}`);
  lines.push("");
  lines.push(
    `Breaking: ${matrix.breaking.length} | Soft-deprecations: ${matrix.soft_deprecations.length} | New features: ${matrix.new_features.length} | Experimental: ${matrix.experimental.length}`,
  );
  lines.push("");
  lines.push(...sectionMd("Breaking", matrix.breaking));
  lines.push(...sectionMd("Soft Deprecations", matrix.soft_deprecations));
  lines.push(...sectionMd("New Features", matrix.new_features));
  lines.push(...sectionMd("Experimental", matrix.experimental));
  if (matrix.unchanged_areas.length > 0) {
    lines.push("## Unchanged Areas");
    lines.push("");
    lines.push(matrix.unchanged_areas.map((a) => `- ${a}`).join("\n"));
    lines.push("");
  }
  return lines.join("\n");
}

function sectionMd(heading: string, changes: Change[]): string[] {
  const out: string[] = [];
  out.push(`## ${heading}`);
  out.push("");
  if (changes.length === 0) {
    out.push("_None._");
    out.push("");
    return out;
  }
  for (const c of changes) {
    out.push(
      `- **${c.id}** (\`${c.area}\`, introduced in ${c.introducedIn}) — ${c.description}`,
    );
    if (c.migrationHint) out.push(`  - Migration: ${c.migrationHint}`);
    if (c.rationale) out.push(`  - Rationale: ${c.rationale}`);
  }
  out.push("");
  return out;
}
