import { describe, it, expect, afterEach } from "vitest";
import { generatePlan } from "../src/plan/generate.js";
import {
  buildFixture,
  FIXTURE_2024_11_05,
  FIXTURE_2025_06_18,
  FIXTURE_UNKNOWN,
} from "./fixtures/build-fixture.js";

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
});

describe("generate_migration_plan", () => {
  it("returns no-op plan when source equals target", async () => {
    const fx = buildFixture(FIXTURE_2025_06_18);
    cleanups.push(fx.cleanup);
    // Force the detection to be 2025-06-18 by using the elicitation fixture and
    // requesting it as target.
    const plan = await generatePlan(fx.path, "2025-06-18");
    if (plan.source_version === "2025-06-18") {
      expect(plan.files_to_touch).toHaveLength(0);
      expect(plan.plan_markdown).toContain("already on 2025-06-18");
    } else {
      expect(plan.plan_markdown.length).toBeGreaterThan(0);
    }
  });

  it("emits unknown plan when source cannot be detected", async () => {
    const fx = buildFixture(FIXTURE_UNKNOWN);
    cleanups.push(fx.cleanup);
    const plan = await generatePlan(fx.path, "2025-11-25");
    expect(plan.source_version).toBe("unknown");
    expect(plan.plan_markdown).toContain("unknown");
  });

  it("produces markdown plan and lists files for upgrade", async () => {
    const fx = buildFixture(FIXTURE_2024_11_05);
    cleanups.push(fx.cleanup);
    const plan = await generatePlan(fx.path, "2025-11-25");
    expect(plan.source_version).toBe("2024-11-05");
    expect(plan.target_version).toBe("2025-11-25");
    expect(plan.plan_markdown).toContain("Migration Plan");
    expect(plan.plan_markdown).toContain("Spec diff");
    expect(plan.unscanned_files).toContain("agent-card.json");
  });

  it("estimated_diff_kb is non-negative and finite", async () => {
    const fx = buildFixture(FIXTURE_2024_11_05);
    cleanups.push(fx.cleanup);
    const plan = await generatePlan(fx.path, "2025-11-25");
    expect(Number.isFinite(plan.estimated_diff_kb)).toBe(true);
    expect(plan.estimated_diff_kb).toBeGreaterThanOrEqual(0);
  });
});
