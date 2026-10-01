import { test } from "node:test";
import assert from "node:assert/strict";
import { run } from "./index.js";
import type { Claim, Report } from "./claim.js";

/**
 * G1-REQ-003: Schadentag plausibel
 *
 * Akzeptanzkriterien:
 * 1. Gegeben Schadentag `2026-11-01` und Meldezeitpunkt `2026-11-03T08:12:00Z`,
 *    wenn Stage 1 die Meldung verarbeitet, dann steht in `stage1.incidentDate` `2026-11-01`.
 * 2. Gegeben Schadentag und Meldung am selben Tag,
 *    wenn Stage 1 die Meldung verarbeitet, dann wird der Vorgang erfasst.
 * 3. Gegeben Schadentag `2026-11-04` und Meldezeitpunkt `2026-11-03T08:12:00Z`,
 *    wenn Stage 1 die Meldung verarbeitet, dann wird abgebrochen mit `error.code: "schadentag-ungueltig"`.
 */

function createBaseClaim(): Claim {
  return {
    claimId: "SCH-2026-99999",
    meta: {
      contractVersion: "1.1.0",
      createdAt: "2026-11-03T08:00:00Z",
      currentStage: 1,
    },
    trace: [],
  };
}

function createBaseReport(): Report {
  return {
    channel: "Telefon",
    incidentDate: "2026-11-01",
    reportedAt: "2026-11-03T08:12:00Z",
    description: "Wasserschaden",
    claimantName: "Test Musterperson",
    claimantPhone: "0123 456789",
    policyNumber: "GH-4711023",
    policyholderName: "Test Versicherungsnehmer",
    damageType: "Sachschaden",
  };
}

test("[G1-REQ-003] Schadentag vor Meldezeitpunkt wird akzeptiert", () => {
  const claim = createBaseClaim();
  const report: Report = {
    ...createBaseReport(),
    incidentDate: "2026-11-01",
    reportedAt: "2026-11-03T08:12:00Z",
  };

  const result = run(claim, report, new Date("2026-11-03T08:40:00Z"));

  assert.ok(result.stage1, "stage1-Block muss vorhanden sein");
  assert.equal(
    result.stage1.incidentDate,
    "2026-11-01",
    "incidentDate muss 2026-11-01 sein"
  );
  assert.ok(result.trace.length > 0, "trace muss einen Eintrag haben");
  assert.equal(
    result.trace[result.trace.length - 1].action,
    "erfasst",
    "Letzter Trace-Eintrag muss action 'erfasst' haben"
  );
});

test("[G1-REQ-003] Schadentag und Meldung am selben Tag werden erfasst", () => {
  const claim = createBaseClaim();
  const report: Report = {
    ...createBaseReport(),
    incidentDate: "2026-11-03",
    reportedAt: "2026-11-03T08:12:00Z",
  };

  const result = run(claim, report, new Date("2026-11-03T08:40:00Z"));

  assert.ok(result.stage1, "stage1-Block muss vorhanden sein");
  assert.ok(result.trace.length > 0, "trace muss einen Eintrag haben");
  assert.equal(
    result.trace[result.trace.length - 1].action,
    "erfasst",
    "Vorgang muss erfasst werden"
  );
  assert.equal(
    result.meta.currentStage,
    2,
    "currentStage muss nach 2 verschoben sein"
  );
  assert.ok(!result.error, "Es darf keinen error-Block geben");
});

test("[G1-REQ-003] Schadentag nach Meldezeitpunkt wird abgebrochen", () => {
  const claim = createBaseClaim();
  const report: Report = {
    ...createBaseReport(),
    incidentDate: "2026-11-04",
    reportedAt: "2026-11-03T08:12:00Z",
  };

  const result = run(claim, report, new Date("2026-11-03T08:40:00Z"));

  assert.ok(result.trace.length > 0, "trace muss einen Eintrag haben");
  assert.equal(
    result.trace[result.trace.length - 1].action,
    "abgebrochen",
    "Vorgang muss abgebrochen werden"
  );
  assert.ok(result.error, "error-Block muss vorhanden sein");
  assert.equal(
    result.error.stage,
    1,
    "error.stage muss 1 sein"
  );
  assert.equal(
    result.error.code,
    "SCHADENTAG_UNGUELTIG",
    "error.code muss SCHADENTAG_UNGUELTIG sein"
  );
  assert.ok(!result.stage1, "stage1-Block darf nicht vorhanden sein");
  assert.equal(
    result.meta.currentStage,
    1,
    "currentStage muss bei 1 bleiben"
  );
});
