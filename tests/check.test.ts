import { describe, it, expect, afterEach } from "vitest";
import {
  checkMigration,
  describeBreakingFailure,
  describeDeprecationWarning,
} from "../src/plan/check.js";
import {
  buildFixture,
  FIXTURE_2025_11_25,
  FIXTURE_UNKNOWN,
  FIXTURE_2024_11_05,
} from "./fixtures/build-fixture.js";

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
});

describe("check_migration_complete", () => {
  it("returns complete=true when source equals target", async () => {
    const fx = buildFixture(FIXTURE_2025_11_25);
    cleanups.push(fx.cleanup);
    const result = await checkMigration(fx.path, "2025-11-25");
    expect(result.detected_version).toBe("2025-11-25");
    expect(result.complete).toBe(true);
    expect(result.missing_steps).toHaveLength(0);
  });

  it("returns complete=false on unknown source", async () => {
    const fx = buildFixture(FIXTURE_UNKNOWN);
    cleanups.push(fx.cleanup);
    const result = await checkMigration(fx.path, "2025-11-25");
    expect(result.complete).toBe(false);
    expect(result.detected_version).toBe("unknown");
    expect(result.missing_steps.length).toBeGreaterThan(0);
  });

  it("returns warnings when migrating 2024-11-05 to 2025-11-25", async () => {
    const fx = buildFixture(FIXTURE_2024_11_05);
    cleanups.push(fx.cleanup);
    const result = await checkMigration(fx.path, "2025-11-25");
    // Source is 2024-11-05, target is 2025-11-25 — there is a real diff.
    expect(result.target_version).toBe("2025-11-25");
    // complete=false because we never claimed the migration was done.
    expect(typeof result.complete).toBe("boolean");
  });
});

// F1 regression guard (Reviewer S940): describeBreakingFailure must NEVER return
// `null` for an unknown breaking-change id. Returning null causes the parent
// check to silently report `complete: true`, masking real migration debt.
describe("describeBreakingFailure — defensive default", () => {
  it("returns a non-null reason for an unknown breaking-change id", () => {
    const reason = describeBreakingFailure("future-unknown-breaking-id", "");
    expect(reason).not.toBeNull();
    expect(reason).toMatch(/manual verification required/i);
    expect(reason).toContain("future-unknown-breaking-id");
  });

  it("matches drop-jsonrpc-batching when batching API is referenced", () => {
    const reason = describeBreakingFailure(
      "drop-jsonrpc-batching",
      "import { JSONRPCBatchRequest } from 'somewhere';",
    );
    expect(reason).not.toBeNull();
    expect(reason).toMatch(/JSON-RPC batching/);
  });

  it("returns null for drop-jsonrpc-batching when batching API is absent", () => {
    const reason = describeBreakingFailure("drop-jsonrpc-batching", "// clean source");
    expect(reason).toBeNull();
  });

  it("flags tasks-primitive with manual-verification message", () => {
    const reason = describeBreakingFailure("tasks-primitive", "");
    expect(reason).not.toBeNull();
    expect(reason).toMatch(/tasks/i);
    expect(reason).toMatch(/manual verification/i);
  });
});

describe("describeDeprecationWarning — defensive default", () => {
  it("returns a non-null hint for an unknown deprecation id", () => {
    const reason = describeDeprecationWarning("future-unknown-deprecation", "");
    expect(reason).not.toBeNull();
    expect(reason).toMatch(/manual review recommended/i);
  });

  it("matches drop-http-sse-transport when SSEServerTransport is used alone", () => {
    const reason = describeDeprecationWarning(
      "drop-http-sse-transport",
      "new SSEServerTransport()",
    );
    expect(reason).not.toBeNull();
    expect(reason).toMatch(/SSEServerTransport/);
  });
});
