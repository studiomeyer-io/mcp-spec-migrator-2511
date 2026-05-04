import type { SpecDefinition } from "../types.js";

/**
 * Second public MCP spec. Introduces Streamable HTTP transport, OAuth 2.1,
 * tool annotations, and audio content. Drops the older HTTP+SSE transport
 * style in favour of streamable HTTP.
 *
 * Source: https://modelcontextprotocol.io/specification/2025-03-26/changelog
 */
export const SPEC_2025_03_26: SpecDefinition = {
  version: "2025-03-26",
  releaseDate: "2025-03-26",
  status: "legacy",
  sdkRanges: {
    typescript: ">=1.0.0 <1.10.0",
  },
  fingerprints: {
    requestHandlers: [
      "tools/list",
      "tools/call",
      "resources/list",
      "resources/read",
      "prompts/list",
      "prompts/get",
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
      id: "streamable-http",
      category: "addition",
      area: "transport",
      description:
        "New Streamable HTTP transport replaces the older HTTP+SSE transport.",
      migrationHint:
        "Replace `SSEServerTransport` with `StreamableHTTPServerTransport`. Existing stdio servers are unaffected.",
      introducedIn: "2025-03-26",
    },
    {
      id: "oauth-2-1",
      category: "addition",
      area: "auth",
      description:
        "OAuth 2.1 with PKCE specified for HTTP servers. Required for any multi-tenant remote server.",
      introducedIn: "2025-03-26",
    },
    {
      id: "tool-annotations",
      category: "addition",
      area: "tools",
      description:
        "Tool annotations: `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`.",
      migrationHint:
        "Add `annotations: { readOnlyHint, destructiveHint }` to each tool definition. Read-only tools should set `readOnlyHint: true`, `destructiveHint: false`.",
      introducedIn: "2025-03-26",
    },
    {
      id: "audio-content",
      category: "addition",
      area: "content",
      description: "Audio content type added alongside text and image.",
      introducedIn: "2025-03-26",
    },
    {
      id: "drop-http-sse-transport",
      category: "deprecation",
      area: "transport",
      description:
        "HTTP+SSE transport from 2024-11-05 is deprecated in favour of Streamable HTTP.",
      migrationHint:
        "Servers that exposed `SSEServerTransport` should add a `StreamableHTTPServerTransport` and either dual-mount or migrate clients.",
      introducedIn: "2025-03-26",
    },
  ],
};
