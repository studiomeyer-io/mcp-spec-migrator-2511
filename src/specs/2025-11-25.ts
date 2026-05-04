import type { SpecDefinition } from "../types.js";

/**
 * Latest spec. Adds the Tasks primitive (experimental), sampling-with-tools
 * (SEP-1577), Form+URL elicitation modes with the new `-32042` 3LO OAuth error
 * code, and soft-deprecates the `includeContext` field on `sampling/createMessage`.
 *
 * Source: https://modelcontextprotocol.io/specification/2025-11-25/changelog
 *
 * Note: at v0.1.0 release time the migrator does NOT run on 2025-11-25 itself.
 * The migrator is built on 2025-06-18 (stable reference) so it can run on
 * older clients (Inspector, Claude Desktop) that have not yet adopted 2025-11-25.
 */
export const SPEC_2025_11_25: SpecDefinition = {
  version: "2025-11-25",
  releaseDate: "2025-11-25",
  status: "current",
  sdkRanges: {
    typescript: ">=1.30.0",
  },
  fingerprints: {
    requestHandlers: [
      "tools/list",
      "tools/call",
      "resources/list",
      "resources/read",
      "prompts/list",
      "prompts/get",
      "elicitation/create",
      "tasks/create",
      "tasks/get",
      "tasks/list",
      "tasks/cancel",
    ],
    annotations: [
      "readOnlyHint",
      "destructiveHint",
      "idempotentHint",
      "openWorldHint",
    ],
    constructorMeta: "specVersion",
  },
  changes: [
    {
      id: "tasks-primitive",
      category: "experimental",
      area: "tasks",
      description:
        "Tasks primitive (long-running operations with create/get/list/cancel) — flagged experimental in 2025-11-25.",
      rationale:
        "Servers should not depend on Tasks as a hard requirement; clients may or may not implement it.",
      migrationHint:
        "Optional. If you implement Tasks, mark it experimental in your README and gate behind a capability flag.",
      introducedIn: "2025-11-25",
    },
    {
      id: "sampling-with-tools",
      category: "addition",
      area: "sampling",
      description:
        "SEP-1577: `sampling/createMessage` may include tools that the LLM is permitted to call during sampling.",
      migrationHint:
        "Servers that already call `sampling/createMessage` should review the new `tools` field and decide whether to opt in. Backwards compatible — omit `tools` to keep old behaviour.",
      introducedIn: "2025-11-25",
    },
    {
      id: "form-url-elicitation",
      category: "addition",
      area: "elicitation",
      description:
        "Form and URL elicitation modes added. New error code `-32042` returned for 3LO OAuth flows that require user redirect.",
      migrationHint:
        "Servers that handle elicitation should add a case for `-32042` and map it to a user-facing redirect prompt.",
      introducedIn: "2025-11-25",
    },
    {
      id: "include-context-soft-deprecation",
      category: "deprecation",
      area: "sampling",
      description:
        "`includeContext` values `thisServer` and `allServers` on `sampling/createMessage` are soft-deprecated.",
      rationale:
        "Context inclusion is moving to an explicit opt-in model. 2025-11-25 clients emit a warning when receiving these values.",
      migrationHint:
        "Replace `includeContext: 'thisServer'` and `includeContext: 'allServers'` with explicit context references. `none` remains supported.",
      introducedIn: "2025-11-25",
    },
  ],
};
