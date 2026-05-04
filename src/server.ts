#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  detectSpecVersionInput,
  detectSpecVersionAnnotations,
  detectSpecVersionDescription,
  runDetectSpecVersion,
} from "./tools/detect-spec-version.js";
import {
  compatibilityMatrixInput,
  compatibilityMatrixAnnotations,
  compatibilityMatrixDescription,
  runCompatibilityMatrix,
} from "./tools/compatibility-matrix.js";
import {
  generateMigrationPlanInput,
  generateMigrationPlanAnnotations,
  generateMigrationPlanDescription,
  runGenerateMigrationPlan,
} from "./tools/generate-migration-plan.js";
import {
  checkMigrationCompleteInput,
  checkMigrationCompleteAnnotations,
  checkMigrationCompleteDescription,
  runCheckMigrationComplete,
} from "./tools/check-migration-complete.js";
import {
  listSupportedVersionsInput,
  listSupportedVersionsAnnotations,
  listSupportedVersionsDescription,
  runListSupportedVersions,
} from "./tools/list-supported-versions.js";
import {
  diffSpecVersionsInput,
  diffSpecVersionsAnnotations,
  diffSpecVersionsDescription,
  runDiffSpecVersions,
} from "./tools/diff-spec-versions.js";

interface PackageJsonShape {
  name?: string;
  version?: string;
}

function readPackageJson(): PackageJsonShape {
  // dist/server.js -> ../package.json
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "..", "package.json"),
    join(here, "..", "..", "package.json"),
  ];
  for (const path of candidates) {
    try {
      const raw = readFileSync(path, "utf8");
      return JSON.parse(raw) as PackageJsonShape;
    } catch {
      // try next
    }
  }
  // Defensive: silent fallback would advertise name="mcp-spec-migrator" version="0.0.0"
  // to clients. Log to stderr so the operator can spot a broken install/packaging.
  process.stderr.write(
    "[mcp-spec-migrator] warn: package.json not found in expected locations; advertising fallback metadata.\n",
  );
  return {};
}

export function buildServer(): McpServer {
  const pkg = readPackageJson();
  const name = pkg.name ?? "mcp-spec-migrator";
  const version = pkg.version ?? "0.0.0";

  const server = new McpServer({
    name,
    version,
  });

  server.registerTool(
    "detect_spec_version",
    {
      description: detectSpecVersionDescription,
      inputSchema: detectSpecVersionInput,
      annotations: detectSpecVersionAnnotations,
    },
    async (args) => {
      const result = await runDetectSpecVersion(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    },
  );

  server.registerTool(
    "compatibility_matrix",
    {
      description: compatibilityMatrixDescription,
      inputSchema: compatibilityMatrixInput,
      annotations: compatibilityMatrixAnnotations,
    },
    async (args) => {
      const result = await runCompatibilityMatrix(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    },
  );

  server.registerTool(
    "generate_migration_plan",
    {
      description: generateMigrationPlanDescription,
      inputSchema: generateMigrationPlanInput,
      annotations: generateMigrationPlanAnnotations,
    },
    async (args) => {
      const result = await runGenerateMigrationPlan(args);
      return {
        content: [{ type: "text", text: result.plan_markdown }],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    },
  );

  server.registerTool(
    "check_migration_complete",
    {
      description: checkMigrationCompleteDescription,
      inputSchema: checkMigrationCompleteInput,
      annotations: checkMigrationCompleteAnnotations,
    },
    async (args) => {
      const result = await runCheckMigrationComplete(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    },
  );

  server.registerTool(
    "list_supported_versions",
    {
      description: listSupportedVersionsDescription,
      inputSchema: listSupportedVersionsInput,
      annotations: listSupportedVersionsAnnotations,
    },
    async () => {
      const result = await runListSupportedVersions();
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    },
  );

  server.registerTool(
    "diff_spec_versions",
    {
      description: diffSpecVersionsDescription,
      inputSchema: diffSpecVersionsInput,
      annotations: diffSpecVersionsAnnotations,
    },
    async (args) => {
      const result = await runDiffSpecVersions(args);
      const text =
        typeof result.diff === "string"
          ? result.diff
          : JSON.stringify(result, null, 2);
      return {
        content: [{ type: "text", text }],
        structuredContent: { diff: result.diff, summary: result.summary } as Record<string, unknown>,
      };
    },
  );

  return server;
}

async function main(): Promise<void> {
  const server = buildServer();
  const transport = new StdioServerTransport();

  const shutdown = async (signal: string): Promise<void> => {
    process.stderr.write(`[mcp-spec-migrator] received ${signal}, shutting down\n`);
    try {
      await server.close();
    } catch {
      // best-effort
    }
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  await server.connect(transport);
}

// Start only when invoked directly (not when imported by tests).
const isDirectInvoke = (() => {
  try {
    const invokedFile = process.argv[1];
    if (!invokedFile) return false;
    const thisFile = fileURLToPath(import.meta.url);
    return invokedFile === thisFile;
  } catch {
    return false;
  }
})();

if (isDirectInvoke) {
  main().catch((err: unknown) => {
    process.stderr.write(`[mcp-spec-migrator] fatal: ${String(err)}\n`);
    process.exit(1);
  });
}
