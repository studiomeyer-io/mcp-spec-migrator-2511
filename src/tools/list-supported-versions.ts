import {
  ALL_SPEC_VERSIONS,
  CURRENT_REFERENCE_VERSION,
  LATEST_VERSION,
} from "../types.js";
import { listSpecs } from "../specs/index.js";

export const listSupportedVersionsInput = {};

export const listSupportedVersionsAnnotations = {
  title: "List Supported MCP Spec Versions",
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export const listSupportedVersionsDescription =
  "Return the four MCP spec versions known to this migrator, with status (legacy/reference/current) and release date.";

export async function runListSupportedVersions() {
  return {
    versions: ALL_SPEC_VERSIONS.slice(),
    current_reference: CURRENT_REFERENCE_VERSION,
    latest: LATEST_VERSION,
    detail: listSpecs().map((s) => ({
      version: s.version,
      releaseDate: s.releaseDate,
      status: s.status,
    })),
  };
}
