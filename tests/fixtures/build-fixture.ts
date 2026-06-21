import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface FixtureFile {
  path: string;
  content: string;
}

/**
 * Create a temporary repo with the given files. Returns the path and a
 * cleanup function. Used by detect/plan/check tests.
 */
export function buildFixture(files: FixtureFile[]): {
  path: string;
  cleanup: () => void;
} {
  const root = mkdtempSync(join(tmpdir(), "mcp-spec-migrator-fixture-"));
  for (const file of files) {
    const full = join(root, file.path);
    const dir = full.split("/").slice(0, -1).join("/");
    if (dir) mkdirSync(dir, { recursive: true });
    writeFileSync(full, file.content, "utf8");
  }
  return {
    path: root,
    cleanup: () => {
      try {
        rmSync(root, { recursive: true, force: true });
      } catch {
        // best-effort
      }
    },
  };
}

export const FIXTURE_2024_11_05: FixtureFile[] = [
  {
    path: "package.json",
    content: JSON.stringify(
      {
        name: "fake-2024-11-05",
        version: "0.0.1",
        type: "module",
        dependencies: {
          "@modelcontextprotocol/sdk": "^0.5.0",
        },
      },
      null,
      2,
    ),
  },
  {
    path: "src/server.ts",
    content: `import { Server } from "@modelcontextprotocol/sdk/server/index.js";
const server = new Server({ name: "fake", version: "0.0.1" });
server.setRequestHandler("tools/list", async () => ({ tools: [] }));
server.setRequestHandler("tools/call", async () => ({ content: [] }));
`,
  },
];

export const FIXTURE_2025_03_26: FixtureFile[] = [
  {
    path: "package.json",
    content: JSON.stringify(
      {
        name: "fake-2025-03-26",
        version: "0.0.1",
        type: "module",
        dependencies: {
          "@modelcontextprotocol/sdk": "^1.5.0",
        },
      },
      null,
      2,
    ),
  },
  {
    path: "src/server.ts",
    content: `import { Server } from "@modelcontextprotocol/sdk/server/index.js";
const server = new Server({ name: "fake", version: "0.0.1" });
server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "do_thing",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
      },
    },
  ],
}));
`,
  },
];

export const FIXTURE_2025_06_18: FixtureFile[] = [
  {
    path: "package.json",
    content: JSON.stringify(
      {
        name: "fake-2025-06-18",
        version: "0.0.1",
        type: "module",
        dependencies: {
          "@modelcontextprotocol/sdk": "^1.15.0",
        },
      },
      null,
      2,
    ),
  },
  {
    path: "src/server.ts",
    content: `import { Server } from "@modelcontextprotocol/sdk/server/index.js";
const server = new Server({ name: "fake", version: "0.0.1" });
server.setRequestHandler("tools/list", async () => ({ tools: [] }));
server.setRequestHandler("elicitation/create", async () => ({
  content: [],
}));
const result = {
  readOnlyHint: true,
  destructiveHint: false,
  structuredContent: { ok: true },
};
`,
  },
];

export const FIXTURE_2025_11_25: FixtureFile[] = [
  {
    path: "package.json",
    content: JSON.stringify(
      {
        name: "fake-2025-11-25",
        version: "0.0.1",
        type: "module",
        dependencies: {
          "@modelcontextprotocol/sdk": "^1.30.0",
        },
      },
      null,
      2,
    ),
  },
  {
    path: "src/server.ts",
    content: `import { Server } from "@modelcontextprotocol/sdk/server/index.js";
const server = new Server({
  name: "fake",
  version: "0.0.1",
  meta: { specVersion: "2025-11-25" },
});
server.setRequestHandler("tools/list", async () => ({ tools: [] }));
server.setRequestHandler("elicitation/create", async () => ({ content: [] }));
// Tasks in 2025-11-25 are created via request augmentation (a \`task\` field on
// tools/call returning a CreateTaskResult), then polled — there is no tasks/create.
server.setRequestHandler("tasks/get", async () => ({ task: { id: "x", status: "pending" } }));
server.setRequestHandler("tasks/result", async () => ({ content: [] }));
const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
};
`,
  },
];

/**
 * A 2025-06-18 server with NO task surface at all. Used to assert the
 * tasks-primitive plan trigger does NOT fire on a server that never touches
 * tasks (false-positive guard).
 */
export const FIXTURE_2025_06_18_NO_TASKS: FixtureFile[] = [
  {
    path: "package.json",
    content: JSON.stringify(
      {
        name: "fake-2025-06-18-no-tasks",
        version: "0.0.1",
        type: "module",
        dependencies: {
          "@modelcontextprotocol/sdk": "^1.15.0",
        },
      },
      null,
      2,
    ),
  },
  {
    path: "src/server.ts",
    content: `import { Server } from "@modelcontextprotocol/sdk/server/index.js";
const server = new Server({ name: "fake", version: "0.0.1" });
server.setRequestHandler("tools/list", async () => ({ tools: [] }));
server.setRequestHandler("tools/call", async () => ({ content: [] }));
server.setRequestHandler("elicitation/create", async () => ({ content: [] }));
const annotations = { readOnlyHint: true, destructiveHint: false };
`,
  },
];

/**
 * A 2025-11-25 server that opts into task-augmented tools/call (the real
 * creation path). Used to assert the tasks-primitive plan trigger DOES fire on
 * the correct surface. Note: no explicit specVersion meta, so detection falls
 * back to SDK + fingerprints.
 */
export const FIXTURE_2025_11_25_TASK_AUGMENTED: FixtureFile[] = [
  {
    path: "package.json",
    content: JSON.stringify(
      {
        name: "fake-2025-11-25-tasks",
        version: "0.0.1",
        type: "module",
        dependencies: {
          "@modelcontextprotocol/sdk": "^1.30.0",
        },
      },
      null,
      2,
    ),
  },
  {
    path: "src/server.ts",
    content: `import { Server } from "@modelcontextprotocol/sdk/server/index.js";
const server = new Server({ name: "fake", version: "0.0.1" });
server.setRequestHandler("tools/call", async (req) => {
  // Task-augmented request: caller passed a \`task\` field, so we return a CreateTaskResult.
  const task = req.params.task;
  if (task) return { task: { id: "t1", status: "pending" } };
  return { content: [] };
});
server.setRequestHandler("tasks/get", async () => ({ task: { id: "t1", status: "completed" } }));
server.setRequestHandler("tasks/result", async () => ({ content: [] }));
`,
  },
];

export const FIXTURE_UNKNOWN: FixtureFile[] = [
  {
    path: "package.json",
    content: JSON.stringify(
      {
        name: "fake-custom-server",
        version: "0.0.1",
        dependencies: {
          express: "^4.0.0",
        },
      },
      null,
      2,
    ),
  },
  {
    path: "src/server.ts",
    content: `// Custom server, not using @modelcontextprotocol/sdk.
import express from "express";
const app = express();
app.listen(3000);
`,
  },
];
