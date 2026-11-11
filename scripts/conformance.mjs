#!/usr/bin/env node
// Prüft, ob die Stages die Regeln des Envelopes einhalten. Die Musterakten ihres Eingangs gehen durch run().
// Aufruf: pnpm conformance [1|2|3|4 ...]   (ohne Argument alle Stages)
//
// Geprüft wird pro Akte:
//   - Ausgabe ist gegen den gebauten Contract valide
//   - claimId und meta bleiben gleich, nur meta.currentStage rückt vor
//   - fremde Blöcke bleiben unverändert, nichts wird gelöscht
//   - genau ein neuer Trace-Eintrag der eigenen Stage, bestehende bleiben unverändert
//   - eigener Block ist gesetzt, oder die Akte ist mit error und "abgebrochen" beendet
// Eine Stage, die noch "nicht implementiert" wirft, gilt als offen, nicht als Fehler.
import { isDeepStrictEqual } from "node:util";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { ROOT, BUILT_SCHEMA } from "./lib/contract.mjs";
import { loadFixtures } from "./lib/fixtures.mjs";

const STAGES = [1, 2, 3, 4];
const NOT_IMPLEMENTED = /nicht implementiert/i;

/** Eingangsakten einer Stage. Stage 1 bekommt die Akten 1-2 ohne ihren eigenen Block. */
export function inputsFor(stage, fixtures) {
  if (stage > 1) return fixtures.filter((f) => f.boundary === `${stage - 1}-${stage}`);
  return fixtures
    .filter((f) => f.boundary === "1-2")
    .map((f) => {
      const { stage1, ...rest } = structuredClone(f.claim);
      return { ...f, boundary: "eingang", claim: { ...rest, meta: { ...rest.meta, currentStage: 1 }, trace: [] } };
    });
}

/** Prüft eine Ausgabe gegen die Regeln. Gibt eine Liste von Verstößen zurück. */
export function violations(stage, input, output, validate) {
  const v = [];
  if (!output || typeof output !== "object") return ["run() gibt keine Akte zurück"];
  if (!validate(output)) {
    for (const e of validate.errors) v.push(`Contract: ${e.instancePath || "/"} ${e.message}`);
  }
  if (output.claimId !== input.claimId) v.push("claimId wurde geändert");

  const { currentStage: inStage, ...inMeta } = input.meta ?? {};
  const { currentStage: outStage, ...outMeta } = output.meta ?? {};
  if (!isDeepStrictEqual(inMeta, outMeta)) v.push("meta wurde geändert (außer currentStage darf dort nichts geändert werden)");

  for (const block of ["stage1", "stage2", "stage3", "stage4"]) {
    if (block !== `stage${stage}` && !isDeepStrictEqual(input[block], output[block])) {
      v.push(`fremder Block ${block} wurde geändert`);
    }
  }
  if (input.error && !isDeepStrictEqual(input.error, output.error)) v.push("bestehender error wurde geändert");

  const inTrace = input.trace ?? [];
  const outTrace = output.trace ?? [];
  if (!isDeepStrictEqual(outTrace.slice(0, inTrace.length), inTrace)) v.push("bestehende Trace-Einträge wurden geändert");
  const added = outTrace.slice(inTrace.length);
  if (added.length !== 1) v.push(`${added.length} neue Trace-Einträge statt genau einem`);
  const entry = added[0];
  if (entry && entry.stage !== stage) v.push(`neuer Trace-Eintrag hat stage ${entry.stage} statt ${stage}`);

  const aborted = entry?.action === "abgebrochen";
  if (aborted) {
    if (!output.error || input.error) v.push('"abgebrochen" ohne neuen error-Block');
    else if (output.error.stage !== stage) v.push(`error.stage ist ${output.error.stage} statt ${stage}`);
  } else {
    if (output[`stage${stage}`] === undefined) v.push(`eigener Block stage${stage} fehlt`);
    if (!input.error && output.error) v.push('error gesetzt, aber Trace-Eintrag ist nicht "abgebrochen"');
    const expected = Math.min(stage + 1, 4);
    if (outStage !== expected) v.push(`meta.currentStage ist ${outStage} statt ${expected}`);
  }
  if (aborted && outStage !== inStage) v.push("meta.currentStage darf bei Abbruch nicht vorrücken");
  return v;
}

export async function checkStage(stage, run, inputs, validate) {
  const results = [];
  for (const { boundary, testCase, claim } of inputs) {
    const input = structuredClone(claim);
    let output;
    try {
      output = await run(structuredClone(claim));
    } catch (err) {
      if (NOT_IMPLEMENTED.test(err?.message ?? "")) return [{ testCase, status: "offen" }];
      results.push({ boundary, testCase, status: "fehler", problems: [`run() wirft: ${err?.message ?? err}`] });
      continue;
    }
    const problems = violations(stage, input, output, validate);
    results.push({ boundary, testCase, status: problems.length ? "fehler" : "ok", problems });
  }
  return results;
}

async function main() {
  if (!existsSync(BUILT_SCHEMA)) {
    console.error("✗ Contract noch nicht gebaut: pnpm contracts:build");
    process.exit(1);
  }
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(JSON.parse(readFileSync(BUILT_SCHEMA, "utf8")));
  const fixtures = loadFixtures();
  const wanted = process.argv.slice(2).map(Number).filter((n) => STAGES.includes(n));
  let failed = 0;

  for (const stage of wanted.length ? wanted : STAGES) {
    const mod = await import(pathToFileURL(join(ROOT, `packages/stage${stage}/src/index.ts`)).href);
    const results = await checkStage(stage, mod.run, inputsFor(stage, fixtures), validate);
    if (results[0]?.status === "offen") {
      console.log(`○ Stage ${stage}: noch nicht implementiert`);
      continue;
    }
    for (const r of results) {
      if (r.status === "ok") console.log(`✓ Stage ${stage} · ${r.boundary}/${r.testCase}`);
      else {
        failed++;
        console.log(`✗ Stage ${stage} · ${r.boundary}/${r.testCase}`);
        for (const p of r.problems) console.log(`    ${p}`);
      }
    }
  }
  if (failed) {
    console.log(`\n${failed} Akte(n) verletzen den Envelope.`);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
