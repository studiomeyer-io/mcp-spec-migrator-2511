import type { SpecDefinition } from "../types.js";

/**
 * Initial public MCP spec. Covers the three core primitives (tools, resources,
 * prompts), JSON-RPC over stdio, and SSE-over-HTTP. No elicitation, no
 * streamable HTTP, no tool annotations.
 *
 * Source: https://modelcontextprotocol.io/specification/2024-11-05
 */
export const SPEC_2024_11_05: SpecDefinition = {
  version: "2024-11-05",
  releaseDate: "2024-11-05",
  status: "legacy",
  sdkRanges: {
    typescript: ">=0.5.0 <1.0.0",
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
    annotations: [],
  },
  changes: [
    {
      id: "spec-2024-11-05-initial",
      category: "addition",
      area: "core",
      description:
        "Initial Model Context Protocol release: tools, resources, prompts, JSON-RPC 2.0, stdio transport, HTTP+SSE transport.",
      introducedIn: "2024-11-05",
    },
  ],
};
