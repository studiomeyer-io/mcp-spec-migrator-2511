import { describe, it, expect } from "vitest";
import { buildServer } from "../src/server.js";

const EXPECTED_TOOL_NAMES = [
  "check_migration_complete",
  "compatibility_matrix",
  "detect_spec_version",
  "diff_spec_versions",
  "generate_migration_plan",
  "list_supported_versions",
] as const;

interface RegisteredToolShape {
  description?: string;
  inputSchema?: unknown;
  annotations?: Record<string, unknown>;
}

function getRegisteredTools(server: unknown): Record<string, RegisteredToolShape> {
  // SDK 1.x McpServer keeps registered tools in `_registeredTools` as a plain
  // object keyed by tool name. We reach in via `unknown` so an SDK rename in a
  // later major doesn't crash compilation — the test would just fail clearly.
  const inner = (server as { _registeredTools?: Record<string, RegisteredToolShape> })
    ._registeredTools;
  return inner ?? {};
}

describe("MCP server", () => {
  it("buildServer registers without throwing", () => {
    const server = buildServer();
    expect(server).toBeDefined();
  });

  it("server registers exactly the 6 planned tools", () => {
    const server = buildServer();
    const tools = getRegisteredTools(server);
    const names = Object.keys(tools).sort();

    expect(names).toEqual([...EXPECTED_TOOL_NAMES]);
    expect(names).toHaveLength(6);
  });

  it("every registered tool carries the read-only annotation set", () => {
    const server = buildServer();
    const tools = getRegisteredTools(server);

    for (const name of EXPECTED_TOOL_NAMES) {
      const def = tools[name];
      expect(def, `tool ${name} should be registered`).toBeDefined();
      const annotations = def.annotations ?? {};
      expect(annotations.readOnlyHint, `${name} readOnlyHint`).toBe(true);
      expect(annotations.destructiveHint, `${name} destructiveHint`).toBe(false);
    }
  });
});
