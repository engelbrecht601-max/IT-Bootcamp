#!/usr/bin/env node
// Übergabe prüfen: pnpm uebergabe
// Holt den freigegebenen Stand der Gruppe, schickt die Musterakten durch die eigenen Stages
// (Envelope-Regeln wie pnpm conformance) und lässt jede der drei Akten als Kette durch alle Stages
// laufen, so weit die Gruppe schon ist. Danach gilt Level 5 als erledigt.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { TASKS } from "./lib/tasks.mjs";
import { updateFlags } from "./lib/desks.mjs";
import { loadFixtures } from "./lib/fixtures.mjs";
import { claimsAt } from "./akten.mjs";
import { checkStage, inputsFor } from "./conformance.mjs";
import { ROOT, die, session } from "./lib/session.mjs";
import { pull } from "./sync.mjs";

const NOT_IMPLEMENTED = /nicht implementiert/i;
const { desk, state } = session();
if (!desk) die("Diese Sitzung gehört zu keinem Arbeitsplatz.");
try {
  pull(desk);
} catch (err) {
  die(err.message);
}

const schemaFile = join(ROOT, "contracts", "claim.schema.json");
if (!existsSync(schemaFile)) die("Contract noch nicht gebaut: pnpm contracts:build");
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(JSON.parse(readFileSync(schemaFile, "utf8")));
const fixtures = loadFixtures(join(ROOT, "fixtures"));
const load = async (stage) => (await import(pathToFileURL(join(ROOT, `packages/stage${stage}/src/index.ts`)).href)).run;
const owner = (stage) => state.desks.find((d) => d.tasks.includes(stage))?.persons.join(" & ") ?? "?";

let ownOk = true;
console.log("EIGENE STAGES gegen die Musterakten:");
const ownStages = desk.tasks.filter((t) => t <= 4);
if (!ownStages.length) console.log("  (dieser Arbeitsplatz hat keine Stage)");
for (const stage of ownStages) {
  const results = await checkStage(stage, await load(stage), inputsFor(stage, fixtures), validate);
  for (const r of results) {
    if (r.status === "ok") console.log(`  ✓ ${TASKS[stage].name} · ${r.testCase}`);
    else if (r.status === "offen") console.log(`  ○ ${TASKS[stage].name}: noch nicht umgesetzt`);
    else {
      ownOk = false;
      console.log(`  ✗ ${TASKS[stage].name} · ${r.testCase}: ${r.problems.join("; ")}`);
    }
  }
}

console.log("\nKETTE: jede Akte durch alle Stationen, so weit die Gruppe schon ist");
for (const { testCase, claim } of claimsAt("eingang", fixtures)) {
  let current = structuredClone(claim);
  const path = [];
  for (const stage of [1, 2, 3, 4]) {
    try {
      current = await (await load(stage))(structuredClone(current));
    } catch (err) {
      path.push(NOT_IMPLEMENTED.test(err?.message ?? "") ? `${TASKS[stage].name} (${owner(stage)}): noch nicht da` : `${TASKS[stage].name} (${owner(stage)}): Fehler "${String(err?.message ?? err).slice(0, 80)}"`);
      break;
    }
    const entry = current?.trace?.at(-1);
    if (!validate(current)) {
      path.push(`${TASKS[stage].name} (${owner(stage)}): Ausgabe passt nicht zum Contract (${validate.errors[0].instancePath || "/"} ${validate.errors[0].message})`);
      break;
    }
    path.push(`${TASKS[stage].name}: ${entry?.action ?? "?"}`);
    if (entry?.action === "abgebrochen") {
      path.push(`Ende mit "${current.error?.message ?? "ohne Grund"}"`);
      break;
    }
  }
  console.log(`  ${testCase}: ${path.join(" → ")}`);
}

// Level 5 gilt nach dem Lauf als erledigt, auch wenn etwas rot ist: Was hier auffällt, ist die erste Bonus-Anforderung.
updateFlags(desk.slug, { handover: true, handoverOk: ownOk, lastProgressAt: new Date().toISOString() });
console.log(ownOk ? "\n✓ Übergabe geprüft. Ab jetzt Bonus." : "\n✗ Die eigenen Stages verletzen die Regeln der Akte (siehe oben). Das ist die erste Bonus-Anforderung.");
