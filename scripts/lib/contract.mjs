// Gemeinsame Logik für Contract-Build und Klassifikation.
// Keine Abhängigkeiten außer Node, damit contract-classify auch ohne pnpm install läuft.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

export const ROOT = new URL("../../", import.meta.url).pathname;
export const CONTRACTS = join(ROOT, "contracts");
export const BASE_SCHEMA = join(CONTRACTS, "claim.base.schema.json");
export const BUILT_SCHEMA = join(CONTRACTS, "claim.schema.json");
export const PATCHES = join(CONTRACTS, "patches");

const STAGE_GROUPS = { stage1: 1, stage2: 2, stage3: 3, stage4: 4 };
const ESCALATE_KEYS = new Set(["meta", "trace", "error"]);
const REQUEST_ID = /^G([1-5])-CR-[0-9]{3}$/;
const REQUIREMENT_ID = /^G([1-5])-REQ-[0-9]{3}$/;
const FIELD_NAME = /^[a-z][a-zA-Z0-9]*$/;

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Patches in Freigabe-Reihenfolge (approvedAt, dann id). */
export function loadPatches(dir = PATCHES) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ file: f, ...readJson(join(dir, f)) }))
    .sort((a, b) => (a.approvedAt ?? "").localeCompare(b.approvedAt ?? "") || a.id.localeCompare(b.id));
}

/** Rein additives Deep-Merge: Objekte werden zusammengeführt, Arrays vereinigt, Skalare überschrieben. */
export function deepMerge(target, fragment) {
  const out = structuredClone(target);
  for (const [key, value] of Object.entries(fragment)) {
    if (Array.isArray(value) && Array.isArray(out[key])) {
      out[key] = [...new Set([...out[key], ...value])];
    } else if (isObject(value) && isObject(out[key])) {
      out[key] = deepMerge(out[key], value);
    } else {
      out[key] = structuredClone(value);
    }
  }
  return out;
}

export function bumpMinor(version, by) {
  const [major, minor] = version.split(".").map(Number);
  return `${major}.${minor + by}.0`;
}

/** Komponiert Basis plus Patches. Wirft, wenn ein Patch vom Klassifikator abgelehnt würde. */
export function compose(base, patches, { requirementsText } = {}) {
  let schema = structuredClone(base);
  for (const patch of patches) {
    const result = classify(schema, patch, { requirementsText, skipRequirementCheck: !requirementsText });
    if (result.decision === "reject") {
      throw new Error(`Patch ${patch.id} würde abgelehnt: ${result.reasons.join("; ")}`);
    }
    schema = deepMerge(schema, patch.fragment);
  }
  schema["x-contractVersion"] = bumpMinor(base["x-contractVersion"], patches.length);
  schema["x-patches"] = patches.map((p) => p.id);
  return schema;
}

/**
 * Deterministische Klassifikation eines Änderungsantrags gegen das aktuelle Schema.
 * approve: additive, optionale Felder im eigenen Block.
 * escalate: meta/trace/error, neue Pflichtfelder, Enum-Erweiterungen bestehender Felder.
 * reject: fremde Blöcke, Änderungen oder Umbenennungen bestehender Felder, Formfehler.
 */
export function classify(schema, request, { requirementsText, skipRequirementCheck = false } = {}) {
  const reject = [];
  const escalate = [];

  const idMatch = REQUEST_ID.exec(request?.id ?? "");
  if (!idMatch) reject.push(`id "${request?.id}" entspricht nicht G<N>-CR-<NNN>`);
  const group = request?.group;
  if (!Number.isInteger(group) || group < 1 || group > 5) reject.push("group muss 1 bis 5 sein");
  if (idMatch && Number(idMatch[1]) !== group) reject.push("group passt nicht zur id");

  const reqMatch = REQUIREMENT_ID.exec(request?.requirementId ?? "");
  if (!reqMatch) reject.push(`requirementId "${request?.requirementId}" entspricht nicht G<N>-REQ-<NNN>`);
  else if (Number(reqMatch[1]) !== group) reject.push("requirementId gehört zu einer anderen Gruppe");
  else if (!skipRequirementCheck && !(requirementsText ?? "").includes(request.requirementId)) {
    reject.push(`${request.requirementId} steht nicht in der requirements.md der Gruppe`);
  }

  if (typeof request?.rationale !== "string" || request.rationale.trim() === "") reject.push("rationale fehlt");

  const fragment = request?.fragment;
  if (!isObject(fragment)) {
    reject.push("fragment muss ein Objekt sein");
    return verdict(reject, escalate);
  }
  const rootKeys = Object.keys(fragment);
  if (rootKeys.length !== 1 || rootKeys[0] !== "properties" || !isObject(fragment.properties)) {
    reject.push("fragment darf nur { properties: { ... } } auf oberster Ebene enthalten");
    return verdict(reject, escalate);
  }

  for (const [blockName, blockFragment] of Object.entries(fragment.properties)) {
    if (ESCALATE_KEYS.has(blockName)) {
      escalate.push(`${blockName} gehört keiner Gruppe`);
      continue;
    }
    if (!(blockName in STAGE_GROUPS)) {
      reject.push(`${blockName} ist kein Stage-Block; neue geteilte Felder gibt es nicht`);
      continue;
    }
    if (STAGE_GROUPS[blockName] !== group) {
      reject.push(`${blockName} gehört Gruppe ${STAGE_GROUPS[blockName]}, nicht Gruppe ${group}`);
      continue;
    }
    checkOwnBlock(schema.properties[blockName], blockFragment, blockName, reject, escalate);
  }

  return verdict(reject, escalate);
}

function checkOwnBlock(block, fragment, blockName, reject, escalate) {
  if (!isObject(fragment)) return reject.push(`${blockName}: Fragment muss ein Objekt sein`);
  for (const key of Object.keys(fragment)) {
    if (key !== "properties" && key !== "required") {
      reject.push(`${blockName}.${key} darf nicht geändert werden`);
    }
  }
  if ("required" in fragment) {
    escalate.push(`${blockName}: neue Pflichtfelder brechen bestehende Akten und Fixtures`);
    for (const name of fragment.required ?? []) {
      const known = name in (block.properties ?? {}) || name in (fragment.properties ?? {});
      if (!known) reject.push(`${blockName}: Pflichtfeld ${name} ist nicht definiert`);
    }
  }
  for (const [field, def] of Object.entries(fragment.properties ?? {})) {
    const path = `${blockName}.${field}`;
    const existing = block.properties?.[field];
    if (existing) {
      if (isEnumExtension(existing, def)) escalate.push(`${path}: Erweiterung eines bestehenden Enums`);
      else reject.push(`${path} existiert bereits; bestehende Felder werden nicht geändert oder umbenannt`);
      continue;
    }
    if (!FIELD_NAME.test(field)) reject.push(`${path}: Feldnamen sind englisch in camelCase`);
    checkFieldDefinition(def, path, reject);
  }
}

function checkFieldDefinition(def, path, reject) {
  if (!isObject(def)) return reject.push(`${path}: Definition muss ein Objekt sein`);
  if (typeof def.description !== "string" || def.description.trim() === "") {
    reject.push(`${path}: description (deutsch) fehlt`);
  }
  if (def.type === "object" || isObject(def.properties)) {
    if (def.additionalProperties !== false) reject.push(`${path}: Objekte brauchen additionalProperties: false`);
    for (const [child, childDef] of Object.entries(def.properties ?? {})) {
      if (!FIELD_NAME.test(child)) reject.push(`${path}.${child}: Feldnamen sind englisch in camelCase`);
      checkFieldDefinition(childDef, `${path}.${child}`, reject);
    }
  }
  if (isObject(def.items)) checkFieldDefinition({ description: "-", ...def.items }, `${path}[]`, reject);
}

function isEnumExtension(existing, def) {
  if (!Array.isArray(existing.enum) || !isObject(def) || !Array.isArray(def.enum)) return false;
  const onlyEnum = Object.keys(def).every((k) => k === "enum");
  const adds = def.enum.some((v) => !existing.enum.includes(v));
  return onlyEnum && adds;
}

function verdict(reject, escalate) {
  if (reject.length) return { decision: "reject", reasons: reject };
  if (escalate.length) return { decision: "escalate", reasons: escalate };
  return { decision: "approve", reasons: ["additive Änderung im eigenen Block"] };
}

function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
