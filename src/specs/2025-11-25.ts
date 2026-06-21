import type { SpecDefinition } from "../types.js";

/**
 * Latest spec. Adds the Tasks primitive (experimental), sampling-with-tools
 * (SEP-1577), Form+URL elicitation modes with the new `-32042` 3LO OAuth error
 * code, JSON Schema 2020-12 as the default dialect, elicitation default values,
 * and soft-deprecates the `includeContext` field on `sampling/createMessage`.
 *
 * Source: https://modelcontextprotocol.io/specification/2025-11-25/changelog
 * Verified field-by-field against the spec via context7 on 2026-06-21.
 *
 * Note: at release time the migrator does NOT run on 2025-11-25 itself.
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
      // Tasks are CREATED via request augmentation (a `task` field on an existing
      // request such as `tools/call`), NOT via a `tasks/create` method. The
      // dedicated task methods are get / list / cancel / result. A `tasks/create`
      // handler can never legitimately exist, so it is intentionally absent here.
      "tasks/get",
      "tasks/list",
      "tasks/cancel",
      "tasks/result",
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
        "Tasks primitive (durable, deferred-execution requests) — flagged experimental in 2025-11-25. A task is created by augmenting an existing request (e.g. `tools/call`) with a `task` field; the server returns a `CreateTaskResult` and the caller later polls `tasks/get` / `tasks/result`, with `tasks/list` and `tasks/cancel` for management. There is no `tasks/create` method.",
      rationale:
        "Servers should not depend on Tasks as a hard requirement; clients may or may not implement it. Task augmentation is subject to capability negotiation — receivers MUST declare `capabilities.tasks.requests`.",
      migrationHint:
        "Optional. If you support task-augmented requests, declare `capabilities.tasks` (with `requests.tools.call`), handle the `task` field on incoming requests, return a `CreateTaskResult`, and implement `tasks/get` / `tasks/result` / `tasks/list` / `tasks/cancel`. Mark it experimental in your README. Do NOT add a `tasks/create` handler — it is not part of the spec.",
      introducedIn: "2025-11-25",
    },
    {
      id: "sampling-with-tools",
      category: "addition",
      area: "sampling",
      description:
        "SEP-1577: `sampling/createMessage` may include tools that the LLM is permitted to call during sampling. Clients declare support via the `sampling.tools` capability and the result may carry `tool_use` content with `stopReason: \"toolUse\"`.",
      migrationHint:
        "Servers that already call `sampling/createMessage` should review the new `tools` / `toolChoice` fields and decide whether to opt in. Backwards compatible — omit `tools` to keep old behaviour.",
      introducedIn: "2025-11-25",
    },
    {
      id: "form-url-elicitation",
      category: "addition",
      area: "elicitation",
      description:
        "Form and URL elicitation modes added. New error code `-32042` (URL_ELICITATION_REQUIRED) is returned when a request cannot proceed until a URL-mode elicitation (e.g. a 3LO OAuth redirect) is completed.",
      migrationHint:
        "Servers that handle elicitation should add a case for the `-32042` error code and map it to a user-facing redirect prompt. The error `data.elicitations[]` array carries the `url` and `elicitationId` to resume.",
      introducedIn: "2025-11-25",
    },
    {
      id: "elicitation-default-values",
      category: "addition",
      area: "elicitation",
      description:
        "Elicitation schemas may now specify `default` values for primitive types (string, number, enum).",
      migrationHint:
        "Optional. Add `default` to elicitation schema properties where a sensible pre-filled value exists. Backwards compatible — clients that ignore `default` simply leave the field empty.",
      introducedIn: "2025-11-25",
    },
    {
      id: "json-schema-2020-12-default",
      category: "addition",
      area: "core",
      description:
        "JSON Schema 2020-12 is now the default dialect for all MCP schema definitions (tool `inputSchema` / `outputSchema`, elicitation schemas).",
      rationale:
        "Aligns MCP on a single, current JSON Schema dialect. Most existing schemas are already 2020-12 compatible, so this is rarely a breaking change in practice.",
      migrationHint:
        "Optional but recommended. If you pin an explicit `$schema`, point it at JSON Schema 2020-12. Audit any draft-07-specific keywords (e.g. `dependencies`) that changed in 2020-12.",
      introducedIn: "2025-11-25",
    },
    {
      id: "include-context-soft-deprecation",
      category: "deprecation",
      area: "sampling",
      description:
        "`includeContext` values `thisServer` and `allServers` on `sampling/createMessage` are soft-deprecated. Servers SHOULD NOT use them unless the client declares the `sampling.context` capability.",
      rationale:
        "Context inclusion is moving to an explicit opt-in model. 2025-11-25 clients emit a warning when receiving these values, which may be removed in a future spec release.",
      migrationHint:
        "Replace `includeContext: 'thisServer'` and `includeContext: 'allServers'` with explicit context references, or simply omit `includeContext` (it defaults to `none`). `none` remains supported.",
      introducedIn: "2025-11-25",
    },
  ],
};
