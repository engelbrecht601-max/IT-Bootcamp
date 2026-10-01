import { test } from "node:test";
import assert from "node:assert/strict";
import { run } from "./index.js";
import type { Claim, Report } from "./claim.js";

/**
 * G1-REQ-001: Pflichtangaben vollständig
 *
 * Akzeptanzkriterien:
 * 1. Gegeben eine Meldung mit Versicherungsscheinnummer, Schadentag, Hergang, Name des Anspruchstellers
 *    und Name des Versicherungsnehmers, wenn Stage 1 sie verarbeitet, dann ist der Block `stage1`
 *    gefüllt, der neue Trace-Eintrag hat `action: "erfasst"` und `meta.currentStage` ist `2`.
 *
 * 2. Gegeben eine Meldung, in der eine dieser fünf Angaben fehlt oder leer ist, wenn Stage 1 sie
 *    verarbeitet, dann hat der neue Trace-Eintrag `action: "abgebrochen"`, die Akte hat einen
 *    `error`-Block mit `stage: 1` und `code: "PFLICHTANGABE_FEHLT"`, `error.message` enthält den
 *    Feldnamen der fehlenden Angabe aus der Eingangsmeldung (z. B. `policyNumber`), und
 *    `meta.currentStage` bleibt `1`.
 *
 * 3. Gegeben eine Meldung, in der mehrere Pflichtangaben fehlen, wenn Stage 1 sie verarbeitet,
 *    dann enthält `error.message` die Feldnamen aller fehlenden Angaben.
 */

/** Helper: Create a minimal valid claim for Stage 1 */
function createInputClaim(claimId = "SCH-2026-00101"): Claim {
  return {
    claimId,
    meta: {
      contractVersion: "1.1.0",
      createdAt: "2026-11-03T08:12:00Z",
      currentStage: 1,
      testCase: "Standardfall",
    },
    trace: [],
  };
}

/** Helper: Create a minimal valid report with all mandatory fields */
function createValidReport(overrides?: Partial<Report>): Report {
  return {
    channel: "Telefon",
    policyNumber: "GH-4711023",
    incidentDate: "2026-11-01",
    reportedAt: "2026-11-03T08:12:00Z",
    description:
      "Bei Sturm hat sich ein Dachziegel von unserem Mehrfamilienhaus gelöst und ist auf das geparkte Auto des Nachbarn gefallen.",
    claimantName: "Jonas Albers",
    policyholderName: "Eigentümergemeinschaft Lindenstraße 12",
    claimantPhone: "0171 2345678",
    damageType: "Sachschaden",
    ...overrides,
  };
}

const now = new Date("2026-11-03T08:40:00Z");

test("[G1-REQ-001] AC 1: Alle Pflichtangaben vorhanden, dann stage1 gefüllt und erfasst", () => {
  const claim = createInputClaim();
  const report = createValidReport();

  const result = run(claim, report, now);

  assert.ok(result.stage1, "stage1 block should exist");
  assert.ok(result.trace.length === 1, "should have exactly one trace entry");

  const lastTrace = result.trace[result.trace.length - 1];
  assert.equal(lastTrace.action, "erfasst", "trace action should be 'erfasst'");
  assert.equal(lastTrace.stage, 1, "trace stage should be 1");
  assert.equal(
    result.meta.currentStage,
    2,
    "currentStage should be 2 after processing"
  );
  assert.ok(!result.error, "error block should not exist");
});

test("[G1-REQ-001] AC 2: Fehlende policyNumber, dann abgebrochen mit fehler", () => {
  const claim = createInputClaim();
  const report = createValidReport({ policyNumber: undefined });

  const result = run(claim, report, now);

  assert.ok(!result.stage1, "stage1 block should not exist");
  assert.ok(result.error, "error block should exist");
  assert.equal(result.error.stage, 1, "error.stage should be 1");
  assert.equal(
    result.error.code,
    "PFLICHTANGABE_FEHLT",
    'error.code should be "PFLICHTANGABE_FEHLT"'
  );
  assert.ok(
    result.error.message.includes("policyNumber"),
    "error.message should contain 'policyNumber'"
  );
  assert.equal(
    result.meta.currentStage,
    1,
    "currentStage should remain 1"
  );
  assert.ok(result.trace.length === 1, "should have exactly one trace entry");
  assert.equal(
    result.trace[0].action,
    "abgebrochen",
    "trace action should be 'abgebrochen'"
  );
});

test("[G1-REQ-001] AC 2: Fehlende incidentDate, dann abgebrochen mit fehler", () => {
  const claim = createInputClaim();
  const report = createValidReport({ incidentDate: undefined });

  const result = run(claim, report, now);

  assert.ok(!result.stage1, "stage1 block should not exist");
  assert.ok(result.error, "error block should exist");
  assert.equal(result.error.code, "PFLICHTANGABE_FEHLT");
  assert.ok(
    result.error.message.includes("incidentDate"),
    "error.message should contain 'incidentDate'"
  );
  assert.equal(result.meta.currentStage, 1);
});

test("[G1-REQ-001] AC 2: Fehlende description, dann abgebrochen mit fehler", () => {
  const claim = createInputClaim();
  const report = createValidReport({ description: undefined });

  const result = run(claim, report, now);

  assert.ok(!result.stage1, "stage1 block should not exist");
  assert.ok(result.error, "error block should exist");
  assert.equal(result.error.code, "PFLICHTANGABE_FEHLT");
  assert.ok(
    result.error.message.includes("description"),
    "error.message should contain 'description'"
  );
  assert.equal(result.meta.currentStage, 1);
});

test("[G1-REQ-001] AC 2: Fehlende claimantName, dann abgebrochen mit fehler", () => {
  const claim = createInputClaim();
  const report = createValidReport({ claimantName: undefined });

  const result = run(claim, report, now);

  assert.ok(!result.stage1, "stage1 block should not exist");
  assert.ok(result.error, "error block should exist");
  assert.equal(result.error.code, "PFLICHTANGABE_FEHLT");
  assert.ok(
    result.error.message.includes("claimantName"),
    "error.message should contain 'claimantName'"
  );
  assert.equal(result.meta.currentStage, 1);
});

test("[G1-REQ-001] AC 2: Fehlende policyholderName, dann abgebrochen mit fehler", () => {
  const claim = createInputClaim();
  const report = createValidReport({ policyholderName: undefined });

  const result = run(claim, report, now);

  assert.ok(!result.stage1, "stage1 block should not exist");
  assert.ok(result.error, "error block should exist");
  assert.equal(result.error.code, "PFLICHTANGABE_FEHLT");
  assert.ok(
    result.error.message.includes("policyholderName"),
    "error.message should contain 'policyholderName'"
  );
  assert.equal(result.meta.currentStage, 1);
});

test("[G1-REQ-001] AC 2: Leere policyNumber, dann abgebrochen mit fehler", () => {
  const claim = createInputClaim();
  const report = createValidReport({ policyNumber: "" });

  const result = run(claim, report, now);

  assert.ok(!result.stage1, "stage1 block should not exist");
  assert.ok(result.error, "error block should exist");
  assert.equal(result.error.code, "PFLICHTANGABE_FEHLT");
  assert.ok(
    result.error.message.includes("policyNumber"),
    "error.message should contain 'policyNumber'"
  );
  assert.equal(result.meta.currentStage, 1);
});

test("[G1-REQ-001] AC 3: Mehrere fehlende Pflichtangaben, dann alle in error.message", () => {
  const claim = createInputClaim();
  const report = createValidReport({
    policyNumber: undefined,
    incidentDate: undefined,
    description: undefined,
  });

  const result = run(claim, report, now);

  assert.ok(!result.stage1, "stage1 block should not exist");
  assert.ok(result.error, "error block should exist");
  assert.equal(result.error.code, "PFLICHTANGABE_FEHLT");
  assert.ok(
    result.error.message.includes("policyNumber"),
    "error.message should contain 'policyNumber'"
  );
  assert.ok(
    result.error.message.includes("incidentDate"),
    "error.message should contain 'incidentDate'"
  );
  assert.ok(
    result.error.message.includes("description"),
    "error.message should contain 'description'"
  );
  assert.equal(result.meta.currentStage, 1);
});

test("[G1-REQ-001] AC 3: Alle fünf Pflichtangaben fehlen, dann alle in error.message", () => {
  const claim = createInputClaim();
  const report = createValidReport({
    policyNumber: undefined,
    incidentDate: undefined,
    description: undefined,
    claimantName: undefined,
    policyholderName: undefined,
  });

  const result = run(claim, report, now);

  assert.ok(!result.stage1, "stage1 block should not exist");
  assert.ok(result.error, "error block should exist");
  assert.equal(result.error.code, "PFLICHTANGABE_FEHLT");
  assert.ok(
    result.error.message.includes("policyNumber"),
    "error.message should contain 'policyNumber'"
  );
  assert.ok(
    result.error.message.includes("incidentDate"),
    "error.message should contain 'incidentDate'"
  );
  assert.ok(
    result.error.message.includes("description"),
    "error.message should contain 'description'"
  );
  assert.ok(
    result.error.message.includes("claimantName"),
    "error.message should contain 'claimantName'"
  );
  assert.ok(
    result.error.message.includes("policyholderName"),
    "error.message should contain 'policyholderName'"
  );
  assert.equal(result.meta.currentStage, 1);
});

test("[G1-REQ-001] AC 1: No report provided, then all mandatory fields are missing", () => {
  const claim = createInputClaim();

  const result = run(claim, undefined, now);

  assert.ok(!result.stage1, "stage1 block should not exist");
  assert.ok(result.error, "error block should exist");
  assert.equal(result.error.code, "PFLICHTANGABE_FEHLT");
  assert.equal(result.meta.currentStage, 1);
});
