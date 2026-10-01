import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { run } from "./index.js";
import type { Claim, Report } from "./claim.js";

/**
 * G1-REQ-002: Versicherungsscheinnummer prüfen und normalisieren
 *
 * Gemeinsame Ausgangslage: Basis-Akte aus fixtures/1-2/standardfall.json ohne stage1-Block,
 * mit leerem trace und meta.currentStage: 1. Eingangsmeldung aus fixtures/eingang/standardfall.json,
 * mit je geänderter Versicherungsscheinnummer pro Test.
 */

function createBaseClaim(): Claim {
  const fixture = JSON.parse(
    readFileSync("/home/node/workspace/fixtures/1-2/standardfall.json", "utf-8")
  );
  // Entferne stage1-Block, leere trace, setze currentStage auf 1
  const { stage1, ...rest } = fixture;
  return {
    ...rest,
    trace: [],
    meta: {
      ...rest.meta,
      currentStage: 1,
    },
  };
}

function createBaseReport(): Report {
  return JSON.parse(
    readFileSync(
      "/home/node/workspace/packages/stage1/fixtures/eingang/standardfall.json",
      "utf-8"
    )
  );
}

test("[G1-REQ-002] Versicherungsscheinnummer bereits korrekt formatiert", () => {
  const claim = createBaseClaim();
  const report: Report = {
    ...createBaseReport(),
    policyNumber: "GH-4711023",
  };

  const result = run(claim, report, new Date("2026-11-03T08:40:00Z"));

  assert.ok(result.stage1, "stage1-Block muss vorhanden sein");
  assert.equal(result.stage1.policyNumber, "GH-4711023");
  assert.ok(result.trace.length > 0, "trace muss einen Eintrag haben");
  assert.equal(result.trace[result.trace.length - 1].action, "erfasst");
});

test("[G1-REQ-002] Kleine Tippfehler normalisieren: Kleinbuchstaben und Leerzeichen", () => {
  const claim = createBaseClaim();
  const report: Report = {
    ...createBaseReport(),
    policyNumber: "gh 4711023",
  };

  const result = run(claim, report, new Date("2026-11-03T08:40:00Z"));

  assert.ok(result.stage1, "stage1-Block muss vorhanden sein");
  assert.equal(
    result.stage1.policyNumber,
    "GH-4711023",
    "Kleinbuchstaben und Leerzeichen müssen normalisiert werden"
  );
  assert.equal(result.trace[result.trace.length - 1].action, "erfasst");
});

test("[G1-REQ-002] Fehlenden Bindestrich und Leerzeichen am Rand korrigieren", () => {
  const claim = createBaseClaim();
  const report: Report = {
    ...createBaseReport(),
    policyNumber: " GH4711023 ",
  };

  const result = run(claim, report, new Date("2026-11-03T08:40:00Z"));

  assert.ok(result.stage1, "stage1-Block muss vorhanden sein");
  assert.equal(
    result.stage1.policyNumber,
    "GH-4711023",
    "Bindestrich muss hinzugefügt und Leerzeichen getrimmt werden"
  );
  assert.equal(result.trace[result.trace.length - 1].action, "erfasst");
});

test("[G1-REQ-002] Ungültige Formatierung: nur 6 Ziffern statt 7", () => {
  const claim = createBaseClaim();
  const report: Report = {
    ...createBaseReport(),
    policyNumber: "GH-471102",
  };

  const result = run(claim, report, new Date("2026-11-03T08:40:00Z"));

  assert.ok(result.trace.length > 0, "trace muss einen Eintrag haben");
  assert.equal(
    result.trace[result.trace.length - 1].action,
    "abgebrochen",
    "Vorgang muss abgebrochen werden"
  );
  assert.ok(result.error, "error-Block muss vorhanden sein");
  assert.equal(result.error.stage, 1);
  assert.equal(
    result.error.code,
    "VERSICHERUNGSSCHEIN_UNGUELTIG",
    "Fehlercode muss VERSICHERUNGSSCHEIN_UNGUELTIG sein"
  );
  assert.ok(!result.stage1, "stage1-Block darf nicht vorhanden sein");
});

test("[G1-REQ-002] Ungültiges Präfix: XY statt GH", () => {
  const claim = createBaseClaim();
  const report: Report = {
    ...createBaseReport(),
    policyNumber: "XY-4711023",
  };

  const result = run(claim, report, new Date("2026-11-03T08:40:00Z"));

  assert.ok(result.trace.length > 0, "trace muss einen Eintrag haben");
  assert.equal(
    result.trace[result.trace.length - 1].action,
    "abgebrochen",
    "Vorgang muss abgebrochen werden"
  );
  assert.ok(result.error, "error-Block muss vorhanden sein");
  assert.equal(result.error.stage, 1);
  assert.equal(
    result.error.code,
    "VERSICHERUNGSSCHEIN_UNGUELTIG",
    "Fehlercode muss VERSICHERUNGSSCHEIN_UNGUELTIG sein"
  );
  assert.ok(!result.stage1, "stage1-Block darf nicht vorhanden sein");
});
