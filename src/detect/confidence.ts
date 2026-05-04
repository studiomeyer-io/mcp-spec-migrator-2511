import {
  ALL_SPEC_VERSIONS,
  type DetectionEvidence,
  type DetectionResult,
  type SpecVersion,
} from "../types.js";
import { probePackageJson } from "./package-json.js";
import { probeAst } from "./ast-fingerprints.js";

/**
 * Detection strategy (per PLAN.md):
 *   1.00 — explicit `specVersion` constructor meta (handled via AST fingerprint)
 *   0.85 — SDK version range maps unambiguously to one spec
 *   0.60 — AST fingerprint pattern
 *   0.30 — heuristic fallback (oldest plausible)
 *
 * Anything below 0.50 returns `unknown` with full evidence so callers do not
 * silently proceed on a guess.
 */
export async function detect(repoPath: string): Promise<DetectionResult> {
  const evidence: DetectionEvidence[] = [];

  const pkg = await probePackageJson(repoPath);
  if (pkg.exists && pkg.sdkVersion) {
    evidence.push({
      file: "package.json",
      line: 0,
      snippet: `@modelcontextprotocol/sdk: ${pkg.sdkVersion}`,
      signal: "sdk-version",
    });
  }

  const ast = await probeAst(repoPath);
  evidence.push(...ast.evidence);

  const candidates: { version: SpecVersion; score: number }[] = [];

  // Explicit `specVersion` meta wins — search evidence for that signal.
  const metaSignal = ast.evidence.find((e) =>
    e.signal.startsWith("constructor-meta:specVersion=>"),
  );
  if (metaSignal) {
    const parts = metaSignal.signal.split("=>");
    const version = parts[1];
    if (isSpecVersion(version)) {
      return {
        detected: version,
        confidence: 1.0,
        evidence,
        sdkVersion: pkg.sdkVersion,
        candidates: [{ version, score: 1.0 }],
      };
    }
  }

  // SDK range mapping.
  if (pkg.matchingVersions.length === 1) {
    const v = pkg.matchingVersions[0];
    if (v) {
      candidates.push({ version: v, score: 0.85 });
    }
  } else if (pkg.matchingVersions.length > 1) {
    // Ambiguous SDK match — split 0.85 evenly.
    const each = 0.85 / pkg.matchingVersions.length;
    for (const v of pkg.matchingVersions) {
      candidates.push({ version: v, score: each });
    }
  }

  // AST fingerprint scores. Multiply normalised score by 0.60 ceiling.
  for (const v of ALL_SPEC_VERSIONS) {
    const ast_score = ast.scoresPerVersion[v];
    if (ast_score > 0) {
      const score = ast_score * 0.6;
      const existing = candidates.find((c) => c.version === v);
      if (existing) {
        existing.score = Math.max(existing.score, score, existing.score + score * 0.3);
        existing.score = Math.min(existing.score, 1.0);
      } else {
        candidates.push({ version: v, score });
      }
    }
  }

  // Pick highest-scoring candidate.
  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    // No package.json + no AST signal → unknown with low-confidence fallback.
    return {
      detected: "unknown",
      confidence: 0,
      evidence,
      sdkVersion: pkg.sdkVersion,
      candidates: [],
    };
  }

  const top = candidates[0];
  if (!top) {
    return {
      detected: "unknown",
      confidence: 0,
      evidence,
      sdkVersion: pkg.sdkVersion,
      candidates: [],
    };
  }

  if (top.score < 0.5) {
    return {
      detected: "unknown",
      confidence: top.score,
      evidence,
      sdkVersion: pkg.sdkVersion,
      candidates,
    };
  }

  return {
    detected: top.version,
    confidence: Number(top.score.toFixed(3)),
    evidence,
    sdkVersion: pkg.sdkVersion,
    candidates,
  };
}

function isSpecVersion(v: string | undefined): v is SpecVersion {
  if (!v) return false;
  return (ALL_SPEC_VERSIONS as readonly string[]).includes(v);
}
