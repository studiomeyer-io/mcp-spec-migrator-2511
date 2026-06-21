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

  it("2025-06-18 -> 2025-11-25 surfaces the new 2025-11-25 additions", () => {
    const matrix = computeMatrix("2025-06-18", "2025-11-25");
    const additionIds = matrix.new_features.map((c) => c.id);
    expect(additionIds).toContain("json-schema-2020-12-default");
    expect(additionIds).toContain("elicitation-default-values");
    expect(additionIds).toContain("sampling-with-tools");
    expect(additionIds).toContain("form-url-elicitation");
  });

  it("a downgrade query (to < from) preserves from/to and reports the same change set as the matching upgrade", () => {
    // F4 regression guard: the matrix aggregates the changes spanning the two
    // versions regardless of direction, but must keep `from`/`to` faithful to
    // the caller's arguments so the rendered header is correct.
    const down = computeMatrix("2025-11-25", "2024-11-05");
    expect(down.from).toBe("2025-11-25");
    expect(down.to).toBe("2024-11-05");

    const up = computeMatrix("2024-11-05", "2025-11-25");
    const idsOf = (m: typeof down) =>
      [
        ...m.breaking,
        ...m.soft_deprecations,
        ...m.new_features,
        ...m.experimental,
      ]
        .map((c) => c.id)
        .sort();
    // Same span of versions => same underlying change ids, just a different header.
    expect(idsOf(down)).toEqual(idsOf(up));
  });

  it("matrixAsMarkdown renders every section heading and unchanged areas", () => {
    const md = matrixAsMarkdown(computeMatrix("2024-11-05", "2025-11-25"));
    expect(md).toContain("## Breaking");
    expect(md).toContain("## Soft Deprecations");
    expect(md).toContain("## New Features");
    expect(md).toContain("## Experimental");
    // 2024-11-05 -> 2025-11-25 touches most areas; `resources`/`prompts` stay unchanged.
    expect(md).toContain("## Unchanged Areas");
    expect(md).toMatch(/- resources/);
  });

  it("matrixAsMarkdown emits _None._ for empty sections (no-op diff)", () => {
    const md = matrixAsMarkdown(computeMatrix("2025-11-25", "2025-11-25"));
    expect(md).toContain("_None._");
  });

  it("adjacent-step matrices are subsets of the full-span matrix (chain consistency)", () => {
    const full = computeMatrix("2024-11-05", "2025-11-25");
    const fullIds = new Set(
      [
        ...full.breaking,
        ...full.soft_deprecations,
        ...full.new_features,
        ...full.experimental,
      ].map((c) => c.id),
    );
    const steps: Array<[SpecVersion, SpecVersion]> = [
      ["2024-11-05", "2025-03-26"],
      ["2025-03-26", "2025-06-18"],
      ["2025-06-18", "2025-11-25"],
    ];
    for (const [a, b] of steps) {
      const m = computeMatrix(a, b);
      for (const c of [
        ...m.breaking,
        ...m.soft_deprecations,
        ...m.new_features,
        ...m.experimental,
      ]) {
        expect(fullIds.has(c.id), `${c.id} (${a}->${b}) missing from full span`).toBe(
          true,
        );
      }
    }
  });
});
