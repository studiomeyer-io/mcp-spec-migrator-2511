import type { SpecDefinition } from "../types.js";

/**
 * Reference spec at the time of the migrator v0.1.0 release. Adds the
 * elicitation primitive, structured tool output, ResourceLink content,
 * tool `_meta` field, and removes JSON-RPC batching.
 *
 * Source: https://modelcontextprotocol.io/specification/2025-06-18/changelog
 */
export const SPEC_2025_06_18: SpecDefinition = {
  version: "2025-06-18",
  releaseDate: "2025-06-18",
  status: "reference",
  sdkRanges: {
    typescript: ">=1.10.0 <1.30.0",
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
    ],
    annotations: [
      "readOnlyHint",
      "destructiveHint",
      "idempotentHint",
      "openWorldHint",
    ],
  },
  changes: [
    {
      id: "elicitation-primitive",
      category: "addition",
      area: "elicitation",
      description:
        "New `elicitation/create` request lets servers ask the user for structured input mid-tool.",
      migrationHint:
        "Optional. Servers that need user input mid-execution can register an `elicitation/create` handler instead of failing or hard-coding prompts.",
      introducedIn: "2025-06-18",
    },
    {
      id: "structured-tool-output",
      category: "addition",
      area: "tools",
      description:
        "Tools may return `structuredContent` alongside or instead of `content`. Allows clients to consume typed JSON results.",
      migrationHint:
        "Optional. Backwards compatible — clients that do not understand `structuredContent` ignore it.",
      introducedIn: "2025-06-18",
    },
    {
      id: "resource-link-content",
      category: "addition",
      area: "content",
      description:
        "New `ResourceLink` content type lets tool results reference resources without inlining them.",
      introducedIn: "2025-06-18",
    },
    {
      id: "tool-meta-field",
      category: "addition",
      area: "tools",
      description: "Tools may carry a free-form `_meta` field for vendor extensions.",
      introducedIn: "2025-06-18",
    },
    {
      id: "drop-jsonrpc-batching",
      category: "breaking",
      area: "transport",
      description:
        "JSON-RPC request/response batching is removed from the spec. All messages must be single requests.",
      migrationHint:
        "If any client batched calls (rare in practice), split them into individual requests. Server side: ensure no batched response handling assumed.",
      introducedIn: "2025-06-18",
    },
  ],
};
