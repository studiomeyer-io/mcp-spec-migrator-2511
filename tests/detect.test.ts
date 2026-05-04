import { describe, it, expect, afterEach } from "vitest";
import { detect } from "../src/detect/confidence.js";
import {
  buildFixture,
  FIXTURE_2024_11_05,
  FIXTURE_2025_03_26,
  FIXTURE_2025_06_18,
  FIXTURE_2025_11_25,
  FIXTURE_UNKNOWN,
} from "./fixtures/build-fixture.js";

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
});

describe("detect_spec_version", () => {
  it("detects 2024-11-05 fixture", async () => {
    const fx = buildFixture(FIXTURE_2024_11_05);
    cleanups.push(fx.cleanup);
    const result = await detect(fx.path);
    expect(result.detected).toBe("2024-11-05");
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    expect(result.sdkVersion).toBeTruthy();
  });

  it("detects 2025-03-26 fixture (annotations)", async () => {
    const fx = buildFixture(FIXTURE_2025_03_26);
    cleanups.push(fx.cleanup);
    const result = await detect(fx.path);
    expect(["2025-03-26", "2025-06-18"]).toContain(result.detected);
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    // Annotation evidence should be present.
    expect(result.evidence.some((e) => e.signal.includes("annotation"))).toBe(true);
  });

  it("detects 2025-06-18 fixture (elicitation)", async () => {
    const fx = buildFixture(FIXTURE_2025_06_18);
    cleanups.push(fx.cleanup);
    const result = await detect(fx.path);
    expect(["2025-06-18", "2025-11-25"]).toContain(result.detected);
    expect(result.evidence.some((e) => e.signal.includes("elicitation/create"))).toBe(
      true,
    );
  });

  it("detects 2025-11-25 fixture via explicit specVersion meta", async () => {
    const fx = buildFixture(FIXTURE_2025_11_25);
    cleanups.push(fx.cleanup);
    const result = await detect(fx.path);
    expect(result.detected).toBe("2025-11-25");
    // Explicit meta should give max confidence.
    expect(result.confidence).toBe(1.0);
  });

  it("returns unknown for non-MCP repo", async () => {
    const fx = buildFixture(FIXTURE_UNKNOWN);
    cleanups.push(fx.cleanup);
    const result = await detect(fx.path);
    expect(result.detected).toBe("unknown");
    expect(result.confidence).toBeLessThan(0.5);
  });

  it("returns unknown for non-existent path", async () => {
    const result = await detect("/tmp/path-that-does-not-exist-mcp-spec");
    expect(result.detected).toBe("unknown");
  });
});
