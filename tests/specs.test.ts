import { describe, it, expect } from "vitest";
import { getSpec, listSpecs } from "../src/specs/index.js";
import { ALL_SPEC_VERSIONS, type SpecVersion } from "../src/types.js";

/**
 * Spec-data correctness guards. These lock the spec definitions to the real
 * MCP changelogs (verified via context7 against modelcontextprotocol.io).
 * A wrong fingerprint or change-id silently produces wrong detection and wrong
 * migration plans, so each fact below is asserted explicitly.
 */
describe("spec data — 2025-11-25 correctness", () => {
  const spec = getSpec("2025-11-25");

  it("does NOT declare a `tasks/create` request handler (no such method in the spec)", () => {
    // Tasks are created via request augmentation (a `task` field on tools/call),
    // not a dedicated tasks/create method. A tasks/create fingerprint can never
    // legitimately fire and would mislead users mid-migration.
    expect(spec.fingerprints.requestHandlers).not.toContain("tasks/create");
  });

  it("declares the real task methods: tasks/get, tasks/list, tasks/cancel, tasks/result", () => {
    for (const m of ["tasks/get", "tasks/list", "tasks/cancel", "tasks/result"]) {
      expect(spec.fingerprints.requestHandlers).toContain(m);
    }
  });

  it("tasks-primitive description does not claim a tasks/create method", () => {
    const tasks = spec.changes.find((c) => c.id === "tasks-primitive");
    expect(tasks).toBeDefined();
    expect(tasks?.description.toLowerCase()).not.toContain("create/get/list/cancel");
    expect(tasks?.description).toMatch(/augmenting an existing request|request augmentation/i);
    expect(tasks?.description).toContain("There is no `tasks/create` method");
  });

  it("includes JSON Schema 2020-12 default-dialect change", () => {
    const c = spec.changes.find((x) => x.id === "json-schema-2020-12-default");
    expect(c).toBeDefined();
    expect(c?.category).toBe("addition");
    expect(c?.description).toMatch(/2020-12/);
  });

  it("includes elicitation default-values change", () => {
    const c = spec.changes.find((x) => x.id === "elicitation-default-values");
    expect(c).toBeDefined();
    expect(c?.category).toBe("addition");
  });

  it("keeps the -32042 URL elicitation error code on form-url-elicitation", () => {
    const c = spec.changes.find((x) => x.id === "form-url-elicitation");
    expect(c?.description).toContain("-32042");
  });

  it("soft-deprecates includeContext thisServer/allServers", () => {
    const c = spec.changes.find((x) => x.id === "include-context-soft-deprecation");
    expect(c?.category).toBe("deprecation");
    expect(c?.description).toMatch(/thisServer/);
    expect(c?.description).toMatch(/allServers/);
  });
});

describe("spec data — registry invariants", () => {
  it("every registered change.introducedIn matches its owning spec version", () => {
    for (const v of ALL_SPEC_VERSIONS as readonly SpecVersion[]) {
      const spec = getSpec(v);
      for (const c of spec.changes) {
        expect(c.introducedIn, `${v}/${c.id}`).toBe(v);
      }
    }
  });

  it("change ids are globally unique across all specs", () => {
    const ids = listSpecs().flatMap((s) => s.changes.map((c) => c.id));
    const set = new Set(ids);
    expect(set.size).toBe(ids.length);
  });

  it("every spec lists the six core request handlers", () => {
    const core = [
      "tools/list",
      "tools/call",
      "resources/list",
      "resources/read",
      "prompts/list",
      "prompts/get",
    ];
    for (const v of ALL_SPEC_VERSIONS as readonly SpecVersion[]) {
      const spec = getSpec(v);
      for (const h of core) {
        expect(spec.fingerprints.requestHandlers, `${v} missing ${h}`).toContain(h);
      }
    }
  });

  it("only 2025-11-25 carries the specVersion constructorMeta fingerprint", () => {
    for (const v of ALL_SPEC_VERSIONS as readonly SpecVersion[]) {
      const meta = getSpec(v).fingerprints.constructorMeta;
      if (v === "2025-11-25") expect(meta).toBe("specVersion");
      else expect(meta).toBeUndefined();
    }
  });
});
