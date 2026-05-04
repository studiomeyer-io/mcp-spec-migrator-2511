import {
  ALL_SPEC_VERSIONS,
  CURRENT_REFERENCE_VERSION,
  LATEST_VERSION,
  type SpecDefinition,
  type SpecVersion,
} from "../types.js";
import { SPEC_2024_11_05 } from "./2024-11-05.js";
import { SPEC_2025_03_26 } from "./2025-03-26.js";
import { SPEC_2025_06_18 } from "./2025-06-18.js";
import { SPEC_2025_11_25 } from "./2025-11-25.js";

const REGISTRY: Record<SpecVersion, SpecDefinition> = {
  "2024-11-05": SPEC_2024_11_05,
  "2025-03-26": SPEC_2025_03_26,
  "2025-06-18": SPEC_2025_06_18,
  "2025-11-25": SPEC_2025_11_25,
};

export function getSpec(version: SpecVersion): SpecDefinition {
  return REGISTRY[version];
}

export function listSpecs(): SpecDefinition[] {
  return ALL_SPEC_VERSIONS.map((v) => REGISTRY[v]);
}

export function getCurrentReference(): SpecDefinition {
  return REGISTRY[CURRENT_REFERENCE_VERSION];
}

export function getLatest(): SpecDefinition {
  return REGISTRY[LATEST_VERSION];
}

export {
  ALL_SPEC_VERSIONS,
  CURRENT_REFERENCE_VERSION,
  LATEST_VERSION,
  SPEC_2024_11_05,
  SPEC_2025_03_26,
  SPEC_2025_06_18,
  SPEC_2025_11_25,
};
