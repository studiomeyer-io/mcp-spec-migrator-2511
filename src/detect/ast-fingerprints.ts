import { existsSync, statSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, extname } from "node:path";
import { Project } from "ts-morph";
import {
  type SpecVersion,
  type DetectionEvidence,
  ALL_SPEC_VERSIONS,
} from "../types.js";
import { getSpec } from "../specs/index.js";

export interface AstProbe {
  /** Per-version score 0..1 derived from how many fingerprints matched. */
  scoresPerVersion: Record<SpecVersion, number>;
  evidence: DetectionEvidence[];
  filesScanned: number;
  filesFailed: number;
}

const SCAN_ROOTS = ["src", "lib", "server"];
const SCAN_EXT = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs"]);
const MAX_FILES = 200;
const MAX_FILE_SIZE_BYTES = 256 * 1024; // 256 KB

/**
 * Walks the repo for source files and collects fingerprint hits. Each fingerprint
 * (request handler name, annotation key, constructor meta key) attributes 1
 * point to the spec versions that declare it.
 */
export async function probeAst(repoPath: string): Promise<AstProbe> {
  const scoresPerVersion = initScores();
  const evidence: DetectionEvidence[] = [];
  let filesScanned = 0;
  let filesFailed = 0;

  if (!existsSync(repoPath)) {
    return { scoresPerVersion, evidence, filesScanned, filesFailed };
  }

  const files = await collectFiles(repoPath);
  if (files.length === 0) {
    return { scoresPerVersion, evidence, filesScanned, filesFailed };
  }

  // Use a single Project for parsing; do not write back to disk.
  const project = new Project({
    useInMemoryFileSystem: false,
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    skipLoadingLibFiles: true,
    compilerOptions: {
      allowJs: true,
      checkJs: false,
      noEmit: true,
    },
  });

  for (const filePath of files) {
    try {
      const text = await readFile(filePath, "utf8");
      const sourceFile = project.createSourceFile(filePath, text, {
        overwrite: true,
      });

      for (const v of ALL_SPEC_VERSIONS) {
        const spec = getSpec(v);

        // Request handler fingerprints: look for string literals matching the
        // handler name passed to `setRequestHandler` / `registerTool`-like calls.
        for (const handler of spec.fingerprints.requestHandlers) {
          const literalRegex = new RegExp(`["']${escapeRegex(handler)}["']`);
          const fileText = sourceFile.getFullText();
          const lineMatch = findLineWithMatch(fileText, literalRegex);
          if (lineMatch) {
            scoresPerVersion[v] = (scoresPerVersion[v] ?? 0) + 1;
            evidence.push({
              file: relative(repoPath, filePath),
              line: lineMatch.line,
              snippet: lineMatch.snippet,
              signal: `request-handler:${handler}=>${v}`,
            });
          }
        }

        // Annotation field names.
        for (const ann of spec.fingerprints.annotations) {
          const annRegex = new RegExp(`\\b${escapeRegex(ann)}\\s*:`);
          const fileText = sourceFile.getFullText();
          const lineMatch = findLineWithMatch(fileText, annRegex);
          if (lineMatch) {
            scoresPerVersion[v] = (scoresPerVersion[v] ?? 0) + 1;
            evidence.push({
              file: relative(repoPath, filePath),
              line: lineMatch.line,
              snippet: lineMatch.snippet,
              signal: `annotation:${ann}=>${v}`,
            });
          }
        }

        // Constructor meta: e.g. `specVersion`.
        if (spec.fingerprints.constructorMeta) {
          const meta = spec.fingerprints.constructorMeta;
          const metaRegex = new RegExp(`\\b${escapeRegex(meta)}\\s*:`);
          const fileText = sourceFile.getFullText();
          const lineMatch = findLineWithMatch(fileText, metaRegex);
          if (lineMatch) {
            scoresPerVersion[v] = (scoresPerVersion[v] ?? 0) + 2; // explicit meta is strong
            evidence.push({
              file: relative(repoPath, filePath),
              line: lineMatch.line,
              snippet: lineMatch.snippet,
              signal: `constructor-meta:${meta}=>${v}`,
            });
          }
        }
      }

      project.removeSourceFile(sourceFile);
      filesScanned++;
    } catch {
      filesFailed++;
    }
  }

  // Normalise scores into 0..1 per version. Cap raw count at 8 hits before
  // saturating; this prevents one heavy file from over-dominating detection.
  for (const v of ALL_SPEC_VERSIONS) {
    const raw = scoresPerVersion[v] ?? 0;
    scoresPerVersion[v] = Math.min(raw, 8) / 8;
  }

  return { scoresPerVersion, evidence, filesScanned, filesFailed };
}

function initScores(): Record<SpecVersion, number> {
  const out: Partial<Record<SpecVersion, number>> = {};
  for (const v of ALL_SPEC_VERSIONS) out[v] = 0;
  return out as Record<SpecVersion, number>;
}

async function collectFiles(repoPath: string): Promise<string[]> {
  const out: string[] = [];

  // Prefer common source roots first.
  for (const root of SCAN_ROOTS) {
    const dir = join(repoPath, root);
    if (existsSync(dir)) {
      await walk(dir, out, repoPath);
      if (out.length >= MAX_FILES) break;
    }
  }

  // If no source root, fall back to root.
  if (out.length === 0) {
    await walk(repoPath, out, repoPath, /* shallow */ true);
  }

  return out.slice(0, MAX_FILES);
}

async function walk(
  dir: string,
  out: string[],
  rootPath: string,
  shallow = false,
): Promise<void> {
  let entries: import("node:fs").Dirent[] = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (out.length >= MAX_FILES) return;
    if (entry.name.startsWith(".")) continue;
    if (
      entry.name === "node_modules" ||
      entry.name === "dist" ||
      entry.name === "build" ||
      entry.name === "coverage"
    )
      continue;

    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (shallow) continue;
      await walk(full, out, rootPath, false);
    } else if (entry.isFile() && SCAN_EXT.has(extname(entry.name))) {
      try {
        const stats = statSync(full);
        if (stats.size > MAX_FILE_SIZE_BYTES) continue;
      } catch {
        continue;
      }
      out.push(full);
    }
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findLineWithMatch(
  text: string,
  regex: RegExp,
): { line: number; snippet: string } | null {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    if (regex.test(line)) {
      return { line: i + 1, snippet: line.trim().slice(0, 200) };
    }
  }
  return null;
}
