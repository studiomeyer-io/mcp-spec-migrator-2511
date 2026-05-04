import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  type CheckResult,
  type SpecVersion,
} from "../types.js";
import { detect } from "../detect/confidence.js";
import { computeMatrix } from "../matrix/compute.js";

/**
 * Verifies whether a repo has actually completed migration to `target_version`.
 *
 * The check is a closure on the matrix: every breaking change between detected
 * and target must be addressed (i.e. the deprecated/removed API surface is no
 * longer referenced and the new fingerprints are present where mandatory).
 */
export async function checkMigration(
  repoPath: string,
  target_version: SpecVersion,
): Promise<CheckResult> {
  const detection = await detect(repoPath);

  if (detection.detected === "unknown") {
    return {
      complete: false,
      target_version,
      detected_version: "unknown",
      missing_steps: [
        "Source spec could not be detected (confidence < 0.50). Resolve detection first.",
      ],
      warnings: [],
    };
  }

  if (detection.detected === target_version) {
    return {
      complete: true,
      target_version,
      detected_version: detection.detected,
      missing_steps: [],
      warnings: [],
    };
  }

  const matrix = computeMatrix(detection.detected, target_version);
  const missing_steps: string[] = [];
  const warnings: string[] = [];

  // Aggregate text once; checks are simple substring presence/absence.
  const allText = await loadAllText(repoPath);

  for (const change of matrix.breaking) {
    const issue = describeBreakingFailure(change.id, allText);
    if (issue) missing_steps.push(`[breaking ${change.id}] ${issue}`);
  }

  for (const change of matrix.soft_deprecations) {
    const issue = describeDeprecationWarning(change.id, allText);
    if (issue) warnings.push(`[deprecation ${change.id}] ${issue}`);
  }

  return {
    complete: missing_steps.length === 0,
    target_version,
    detected_version: detection.detected,
    missing_steps,
    warnings,
  };
}

async function loadAllText(repoPath: string): Promise<string> {
  const candidates = [
    "package.json",
    "src/server.ts",
    "src/index.ts",
    "src/cli.ts",
    "lib/server.ts",
    "server.ts",
    "index.ts",
  ];
  const texts: string[] = [];
  for (const rel of candidates) {
    const full = join(repoPath, rel);
    if (existsSync(full)) {
      try {
        texts.push(await readFile(full, "utf8"));
      } catch {
        // ignore
      }
    }
  }
  return texts.join("\n");
}

// Exported for unit-testing of the defensive default (F1 regression guard).
export function describeBreakingFailure(id: string, text: string): string | null {
  switch (id) {
    case "drop-jsonrpc-batching":
      if (text.includes("JSONRPCBatchRequest") || text.includes("batchedRequests")) {
        return "Source still references JSON-RPC batching APIs that were removed in 2025-06-18.";
      }
      return null;

    case "tasks-primitive":
      // 2025-11-25 added experimental task primitive (deferred-execution + polling).
      // No removal involved — this is additive. We cannot mechanically verify whether
      // a server has *opted in*, but we can at least flag if the older request/response
      // pattern is still hard-coded without acknowledging Tasks. Conservative: require
      // manual verification rather than passing silently.
      return "Manual verification required: 2025-11-25 introduces an experimental `tasks` primitive. Confirm server either opts in (sets capabilities.tasks) or explicitly rejects task requests with -32601.";

    case "sampling-with-tools":
      // SEP-1577: sampling/createMessage may now include tool definitions.
      // Servers that own a sampling loop must handle tool-call responses.
      if (text.includes("sampling/createMessage") || text.includes("CreateMessageRequest")) {
        return "Server uses sampling/createMessage but may not handle the 2025-11-25 tool-call response shape. Manual verification required.";
      }
      return "Manual verification required: confirm server is not affected by sampling-with-tools (SEP-1577) tool-loop semantics.";

    case "form-url-elicitation":
      // 2025-11-25 introduced form/url elicitation (-32042 for 3LO OAuth flows).
      if (text.includes("elicitation") || text.includes("ElicitationRequest")) {
        return "Server uses elicitation; verify it handles the new form+url variants and the -32042 error code per 2025-11-25.";
      }
      return null;

    default:
      // Defensive default: an unknown breaking-change id means we have no automated
      // check available. Reporting `null` (which historically meant "all clear") is
      // a false-positive risk for the migration-completeness gate. Instead, flag it
      // explicitly so the operator runs a manual verification step.
      return `No automated check available for breaking change "${id}" — manual verification required (read spec changelog and audit source).`;
  }
}

// Exported for unit-testing of the defensive default (F1 regression guard).
export function describeDeprecationWarning(id: string, text: string): string | null {
  switch (id) {
    case "drop-http-sse-transport":
      if (text.includes("SSEServerTransport") && !text.includes("StreamableHTTPServerTransport")) {
        return "Source uses SSEServerTransport without a StreamableHTTPServerTransport. Either dual-mount or migrate.";
      }
      return null;
    case "include-context-soft-deprecation":
      if (text.includes('includeContext: "thisServer"') || text.includes('includeContext: "allServers"')) {
        return "`includeContext: thisServer/allServers` is soft-deprecated in 2025-11-25. Use explicit context references.";
      }
      return null;
    default:
      // Defensive default: flag unknown deprecation ids as warnings (not blocking).
      return `No automated check available for deprecation "${id}" — manual review recommended.`;
  }
}
