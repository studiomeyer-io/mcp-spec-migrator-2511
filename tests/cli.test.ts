import { describe, it, expect, afterEach } from "vitest";
import { buildProgram } from "../src/cli.js";
import {
  buildFixture,
  FIXTURE_2024_11_05,
} from "./fixtures/build-fixture.js";

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
});

function captureStdout(fn: () => Promise<void> | void): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((data: string | Uint8Array): boolean => {
      chunks.push(typeof data === "string" ? data : data.toString());
      return true;
    }) as typeof process.stdout.write;
    Promise.resolve()
      .then(() => fn())
      .then(() => {
        process.stdout.write = origWrite;
        resolve(chunks.join(""));
      })
      .catch((err) => {
        process.stdout.write = origWrite;
        reject(err);
      });
  });
}

describe("CLI", () => {
  it("`versions` lists all 4 spec versions", async () => {
    const program = buildProgram();
    const out = await captureStdout(async () => {
      await program.parseAsync(["node", "cli", "versions"]);
    });
    expect(out).toContain("2024-11-05");
    expect(out).toContain("2025-03-26");
    expect(out).toContain("2025-06-18");
    expect(out).toContain("2025-11-25");
  });

  it("`versions --json` returns parseable JSON", async () => {
    const program = buildProgram();
    const out = await captureStdout(async () => {
      await program.parseAsync(["node", "cli", "versions", "--json"]);
    });
    const parsed = JSON.parse(out);
    expect(parsed.versions).toHaveLength(4);
  });

  it("`diff` produces markdown by default", async () => {
    const program = buildProgram();
    const out = await captureStdout(async () => {
      await program.parseAsync([
        "node",
        "cli",
        "diff",
        "2025-06-18",
        "2025-11-25",
      ]);
    });
    expect(out).toContain("# MCP Spec Diff");
  });

  it("`detect --json` works against fixture", async () => {
    const fx = buildFixture(FIXTURE_2024_11_05);
    cleanups.push(fx.cleanup);
    const program = buildProgram();
    const out = await captureStdout(async () => {
      await program.parseAsync(["node", "cli", "detect", fx.path, "--json"]);
    });
    const parsed = JSON.parse(out);
    expect(parsed.detected).toBe("2024-11-05");
  });
});
