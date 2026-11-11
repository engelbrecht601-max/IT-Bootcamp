#!/usr/bin/env node
// Komponiert claim.base.schema.json + contracts/patches/*.json zu contracts/claim.schema.json
// und validiert alle Fixtures dagegen. Die gebaute Datei wird nicht versioniert.
import { writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { ROOT, BASE_SCHEMA, BUILT_SCHEMA, readJson, loadPatches, compose } from "./lib/contract.mjs";

const FIXTURES = join(ROOT, "fixtures");

const base = readJson(BASE_SCHEMA);
const patches = loadPatches();
let schema;
try {
  schema = compose(base, patches);
} catch (err) {
  console.error(`✗ ${err.message}`);
  process.exit(1);
}
writeFileSync(BUILT_SCHEMA, JSON.stringify(schema, null, 2) + "\n");
console.log(`✓ Contract ${schema["x-contractVersion"]} gebaut (${patches.length} Patch(es)) → ${relative(ROOT, BUILT_SCHEMA)}`);

const ajv = new Ajv2020({ allErrors: true, strict: true, strictTuples: false });
ajv.addKeyword("x-contractVersion");
ajv.addKeyword("x-patches");
addFormats(ajv);
const validate = ajv.compile(schema);

const files = listJson(FIXTURES);
let failed = 0;
for (const file of files) {
  const data = readJson(file);
  if (validate(data)) {
    console.log(`  ✓ ${relative(ROOT, file)}`);
  } else {
    failed++;
    console.error(`  ✗ ${relative(ROOT, file)}`);
    for (const e of validate.errors) console.error(`      ${e.instancePath || "/"} ${e.message}`);
  }
}
if (failed) {
  console.error(`✗ ${failed} von ${files.length} Fixture(s) ungültig`);
  process.exit(1);
}
console.log(`✓ ${files.length} Fixture(s) valide`);

function listJson(dir) {
  let out = [];
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out = out.concat(listJson(path));
    else if (name.endsWith(".json")) out.push(path);
  }
  return out;
}
