import type { Change, SpecVersion } from "../types.js";
import { ALL_SPEC_VERSIONS } from "../types.js";

/**
 * Returns the chain of versions strictly between (and including the boundary)
 * `from` and `to`, in release order. If `from === to` the chain is empty.
 * If `from` comes after `to` (downgrade query), the chain is reversed and
 * relative semantics apply (breaking-down rather than breaking-up).
 */
export function versionChain(
  from: SpecVersion,
  to: SpecVersion,
): { chain: SpecVersion[]; isDowngrade: boolean } {
  const fromIdx = ALL_SPEC_VERSIONS.indexOf(from);
  const toIdx = ALL_SPEC_VERSIONS.indexOf(to);
  if (fromIdx === toIdx) return { chain: [], isDowngrade: false };
  if (fromIdx < toIdx) {
    return {
      chain: ALL_SPEC_VERSIONS.slice(fromIdx + 1, toIdx + 1).map(
        (v) => v as SpecVersion,
      ),
      isDowngrade: false,
    };
  }
  return {
    chain: ALL_SPEC_VERSIONS.slice(toIdx + 1, fromIdx + 1)
      .slice()
      .reverse()
      .map((v) => v as SpecVersion),
    isDowngrade: true,
  };
}

export function partitionChanges(changes: Change[]): {
  breaking: Change[];
  soft_deprecations: Change[];
  new_features: Change[];
  experimental: Change[];
} {
  const breaking: Change[] = [];
  const soft_deprecations: Change[] = [];
  const new_features: Change[] = [];
  const experimental: Change[] = [];
  for (const c of changes) {
    switch (c.category) {
      case "breaking":
        breaking.push(c);
        break;
      case "deprecation":
        soft_deprecations.push(c);
        break;
      case "addition":
        new_features.push(c);
        break;
      case "experimental":
        experimental.push(c);
        break;
    }
  }
  return { breaking, soft_deprecations, new_features, experimental };
}
