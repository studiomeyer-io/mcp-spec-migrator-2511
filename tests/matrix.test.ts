import { describe, it, expect } from "vitest";
import { computeMatrix, matrixAsMarkdown } from "../src/matrix/compute.js";
import { ALL_SPEC_VERSIONS, type SpecVersion } from "../src/types.js";
import { versionChain } from "../src/matrix/changes.js";

describe("compatibility_matrix", () => {
  it("returns empty diff for from === to", () => {
    for (const v of ALL_SPEC_VERSIONS) {
      const matrix = computeMatrix(v, v);
      expect(matrix.breaking).toHaveLength(0);
      expect(matrix.soft_deprecations).toHaveLength(0);
      expect(matrix.new_features).toHaveLength(0);
      expect(matrix.experimental).toHaveLength(0);
    }
  });

  it("2024-11-05 -> 2025-03-26 has 4 additions + 1 deprecation", () => {
    const matrix = computeMatrix("2024-11-05", "2025-03-26");
    expect(matrix.new_features.length).toBeGreaterThanOrEqual(3);
    expect(matrix.soft_deprecations.length).toBeGreaterThanOrEqual(1);
  });

  it("2025-03-26 -> 2025-06-18 has at least 1 breaking change", () => {
    const matrix = computeMatrix("2025-03-26", "2025-06-18");
    expect(matrix.breaking.length).toBeGreaterThanOrEqual(1);
    expect(matrix.breaking.some((c) => c.id === "drop-jsonrpc-batching")).toBe(true);
  });

  it("2025-06-18 -> 2025-11-25 has experimental Tasks", () => {
    const matrix = computeMatrix("2025-06-18", "2025-11-25");
    expect(matrix.experimental.some((c) => c.id === "tasks-primitive")).toBe(true);
    expect(
      matrix.soft_deprecations.some((c) => c.id === "include-context-soft-deprecation"),
    ).toBe(true);
  });

  it("2024-11-05 -> 2025-11-25 aggregates all intermediate changes", () => {
    const matrix = computeMatrix("2024-11-05", "2025-11-25");
    const allIds = [
      ...matrix.breaking,
      ...matrix.soft_deprecations,
      ...matrix.new_features,
      ...matrix.experimental,
    ].map((c) => c.id);
    expect(allIds).toContain("streamable-http");
    expect(allIds).toContain("elicitation-primitive");
    expect(allIds).toContain("tasks-primitive");
    expect(allIds).toContain("drop-jsonrpc-batching");
  });

  it("is deterministic — same input yields same output", () => {
    const a = computeMatrix("2024-11-05", "2025-11-25");
    const b = computeMatrix("2024-11-05", "2025-11-25");
    expect(a).toStrictEqual(b);
  });

  it("matrixAsMarkdown produces non-empty heading", () => {
    const matrix = computeMatrix("2025-03-26", "2025-06-18");
    const md = matrixAsMarkdown(matrix);
    expect(md).toContain("# MCP Spec Diff: 2025-03-26 → 2025-06-18");
    expect(md).toContain("## Breaking");
  });

  it("versionChain handles upgrade and downgrade", () => {
    const up = versionChain("2024-11-05", "2025-06-18");
    expect(up.chain).toEqual(["2025-03-26", "2025-06-18"]);
    expect(up.isDowngrade).toBe(false);

    const down = versionChain("2025-06-18", "2024-11-05");
    expect(down.isDowngrade).toBe(true);
  });

  it("covers all 12 ordered (from,to) permutations without throwing", () => {
    const versions = ALL_SPEC_VERSIONS as readonly SpecVersion[];
    for (const a of versions) {
      for (const b of versions) {
        if (a === b) continue;
        const m = computeMatrix(a, b);
        expect(m.from).toBe(a);
        expect(m.to).toBe(b);
      }
    }
  });
});
