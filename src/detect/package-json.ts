import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import semver from "semver";
import { type SpecVersion, ALL_SPEC_VERSIONS } from "../types.js";
import { getSpec } from "../specs/index.js";

export interface PackageJsonProbe {
  exists: boolean;
  sdkVersion: string | null;
  /** Versions whose `sdkRanges.typescript` is satisfied by `sdkVersion`. */
  matchingVersions: SpecVersion[];
  raw: unknown;
}

/**
 * Reads `<repo>/package.json` and extracts the `@modelcontextprotocol/sdk`
 * dependency version. Maps the version to spec versions whose declared
 * `sdkRanges.typescript` is satisfied. Pure async — no side effects.
 */
export async function probePackageJson(
  repoPath: string,
): Promise<PackageJsonProbe> {
  const path = join(repoPath, "package.json");
  if (!existsSync(path)) {
    return {
      exists: false,
      sdkVersion: null,
      matchingVersions: [],
      raw: null,
    };
  }

  let parsed: unknown;
  try {
    const raw = await readFile(path, "utf8");
    parsed = JSON.parse(raw);
  } catch {
    return {
      exists: true,
      sdkVersion: null,
      matchingVersions: [],
      raw: null,
    };
  }

  const sdkRange = readDep(parsed, "@modelcontextprotocol/sdk");
  if (!sdkRange) {
    return {
      exists: true,
      sdkVersion: null,
      matchingVersions: [],
      raw: parsed,
    };
  }

  // Resolve the range to its minimum satisfying version for mapping. We do not
  // hit npm — we only look at the declared range's lower bound.
  const minVer = semver.minVersion(sdkRange);
  const sdkVersion = minVer ? minVer.version : sdkRange;

  const matchingVersions: SpecVersion[] = [];
  for (const v of ALL_SPEC_VERSIONS) {
    const spec = getSpec(v);
    if (
      minVer &&
      semver.satisfies(minVer.version, spec.sdkRanges.typescript, {
        includePrerelease: true,
      })
    ) {
      matchingVersions.push(v);
    }
  }

  return {
    exists: true,
    sdkVersion,
    matchingVersions,
    raw: parsed,
  };
}

function readDep(parsed: unknown, name: string): string | null {
  if (!isRecord(parsed)) return null;
  const deps = parsed.dependencies;
  const devDeps = parsed.devDependencies;
  const peerDeps = parsed.peerDependencies;
  for (const bag of [deps, devDeps, peerDeps]) {
    if (isRecord(bag)) {
      const v = bag[name];
      if (typeof v === "string") return v;
    }
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
