import { test } from "node:test";
import assert from "node:assert/strict";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { checkStage, inputsFor } from "./conformance.mjs";
import { compose, readJson, BASE_SCHEMA } from "./lib/contract.mjs";
import { loadFixtures } from "./lib/fixtures.mjs";

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(compose(readJson(BASE_SCHEMA), []));
const fixtures = loadFixtures();
const at = "2026-11-04T10:15:00Z";

// Eine regelkonforme Stage 2 als Referenz.
const goodStage2 = (claim) => ({
  ...claim,
  meta: { ...claim.meta, currentStage: 3 },
  trace: [...claim.trace, { stage: 2, at, action: "geprüft" }],
  stage2: { completedAt: at, coverageDecision: "gedeckt" },
});

test("regelkonforme Stage besteht", async () => {
  const results = await checkStage(2, goodStage2, inputsFor(2, fixtures), validate);
  assert.equal(results.length, 3);
  assert.ok(results.every((r) => r.status === "ok"), JSON.stringify(results));
});

test("nicht implementierte Stage gilt als offen", async () => {
  const run = () => {
    throw new Error("Stage 2 ist noch nicht implementiert");
  };
  assert.deepEqual(await checkStage(2, run, inputsFor(2, fixtures), validate), [{ testCase: "ablehnungskandidat", status: "offen" }]);
});

test("Schreiben in fremde Blöcke fällt auf", async () => {
  const run = (c) => ({ ...goodStage2(c), stage1: { ...c.stage1, description: "überschrieben" } });
  const [r] = await checkStage(2, run, inputsFor(2, fixtures), validate);
  assert.equal(r.status, "fehler");
  assert.ok(r.problems.some((p) => p.includes("fremder Block stage1")));
});

test("fehlender Trace-Eintrag und falsche Stage fallen auf", async () => {
  const run = (c) => ({ ...goodStage2(c), trace: c.trace, meta: c.meta });
  const [r] = await checkStage(2, run, inputsFor(2, fixtures), validate);
  assert.ok(r.problems.some((p) => p.includes("0 neue Trace-Einträge")));
  assert.ok(r.problems.some((p) => p.includes("currentStage")));
});

test("ungültige Ausgabe verletzt den Contract", async () => {
  const run = (c) => ({ ...goodStage2(c), stage2: { completedAt: at, coverageDecision: "vielleicht" } });
  const [r] = await checkStage(2, run, inputsFor(2, fixtures), validate);
  assert.ok(r.problems.some((p) => p.startsWith("Contract:")));
});

test("Abbruch mit error ist regelkonform", async () => {
  const run = (c) => ({
    ...c,
    trace: [...c.trace, { stage: 2, at, action: "abgebrochen" }],
    error: { stage: 2, code: "VERTRAG_UNBEKANNT", message: "Versicherungsschein nicht gefunden." },
  });
  const results = await checkStage(2, run, inputsFor(2, fixtures), validate);
  assert.ok(results.every((r) => r.status === "ok"), JSON.stringify(results));
});

test("Stage 1 bekommt die Akten ohne eigenen Block und ohne Trace", () => {
  const inputs = inputsFor(1, fixtures);
  assert.equal(inputs.length, 3);
  assert.ok(inputs.every((i) => !("stage1" in i.claim) && i.claim.trace.length === 0 && i.claim.meta.currentStage === 1));
});
