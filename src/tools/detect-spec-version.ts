import { z } from "zod";
import { detect } from "../detect/confidence.js";

export const detectSpecVersionInput = {
  repo_path: z.string().min(1).describe("Absolute or relative path to the MCP server repo."),
};

export const detectSpecVersionAnnotations = {
  title: "Detect MCP Spec Version",
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export const detectSpecVersionDescription =
  "Inspect a repo and detect which MCP spec version it targets. Reads package.json + scans source files via ts-morph. Read-only — never modifies the target repo. Returns confidence 0..1 and per-signal evidence; below 0.50 returns `unknown`.";

export async function runDetectSpecVersion(args: { repo_path: string }) {
  const result = await detect(args.repo_path);
  return result;
}
