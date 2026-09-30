#!/usr/bin/env node
// Klassifiziert einen Änderungsantrag deterministisch: approve, escalate oder reject.
// Aufruf: pnpm contracts:classify contracts/requests/G2-CR-001.json
// Ausgabe: JSON auf stdout. Exit-Code 0 bei approve, 2 bei escalate, 3 bei reject.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, BASE_SCHEMA, readJson, loadPatches, compose, classify } from "./lib/contract.mjs";

const file = process.argv[2];
if (!file) {
  console.error("Aufruf: pnpm contracts:classify <pfad/zum/antrag.json>");
  process.exit(64);
}
const request = readJson(file);
const current = compose(readJson(BASE_SCHEMA), loadPatches());
const pkg = request.group === 5 ? "ui" : `stage${request.group}`;
const reqFile = join(ROOT, "packages", pkg, "requirements.md");
const requirementsText = existsSync(reqFile) ? readFileSync(reqFile, "utf8") : "";

const result = { id: request.id, ...classify(current, request, { requirementsText }) };
console.log(JSON.stringify(result, null, 2));
process.exit({ approve: 0, escalate: 2, reject: 3 }[result.decision]);
