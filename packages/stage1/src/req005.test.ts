import { test } from "node:test";
import assert from "node:assert/strict";
import { run } from "./index.js";
import type { Claim, Report } from "./claim.js";

/**
 * G1-REQ-005: Kontaktangabe des Anspruchstellers
 *
 * User Story: Als Sachbearbeiter:in möchte ich, dass zu jedem Anspruchsteller
 * eine Telefonnummer oder E-Mail-Adresse erfasst wird, damit später jemand nachfragen kann.
 */

function createBaseClaim(): Claim {
  return {
    claimId: "SCH-2026-00001",
    meta: {
      contractVersion: "1.1.0",
      createdAt: "2026-11-03T08:12:00Z",
      currentStage: 1,
    },
    trace: [],
  };
}

function createCompleteReport(overrides?: Partial<Report>): Report {
  return {
    channel: "Telefon",
    policyNumber: "GH-4711023",
    incidentDate: "2026-11-01",
    reportedAt: "2026-11-03T08:12:00Z",
    description: "Schadenbeschreibung",
    claimantName: "Test Anspruchsteller",
    policyholderName: "Test Versicherungsnehmer",
    damageType: "Sachschaden",
    claimantPhone: "0171 2345678",
    claimantEmail: "test@example.com",
    ...overrides,
  };
}

test("[G1-REQ-005] Telefonnummer vorhanden, E-Mail fehlt, dann erfasst", () => {
  const claim = createBaseClaim();
  const report = createCompleteReport({
    claimantPhone: "0171 2345678",
    claimantEmail: undefined,
  });
  const now = new Date("2026-11-03T08:40:00Z");

  const result = run(claim, report, now);

  // Vorgang wird erfasst
  assert.ok(result.stage1, "stage1 sollte vorhanden sein");
  assert.strictEqual(
    result.trace[result.trace.length - 1].action,
    "erfasst",
    "action sollte 'erfasst' sein"
  );
  assert.strictEqual(result.meta.currentStage, 2, "currentStage sollte 2 sein");

  // Telefonnummer steht in stage1.claimantPhone
  assert.strictEqual(
    result.stage1.claimantPhone,
    "0171 2345678",
    "claimantPhone sollte die Telefonnummer enthalten"
  );

  // Kein Fehler
  assert.strictEqual(result.error, undefined, "error sollte undefined sein");
});

test("[G1-REQ-005] E-Mail vorhanden, Telefonnummer fehlt, dann erfasst", () => {
  const claim = createBaseClaim();
  const report = createCompleteReport({
    claimantPhone: undefined,
    claimantEmail: "anspruchsteller@example.com",
  });
  const now = new Date("2026-11-03T08:40:00Z");

  const result = run(claim, report, now);

  // Vorgang wird erfasst
  assert.ok(result.stage1, "stage1 sollte vorhanden sein");
  assert.strictEqual(
    result.trace[result.trace.length - 1].action,
    "erfasst",
    "action sollte 'erfasst' sein"
  );
  assert.strictEqual(result.meta.currentStage, 2, "currentStage sollte 2 sein");

  // E-Mail-Adresse steht in stage1.claimantEmail
  assert.strictEqual(
    result.stage1.claimantEmail,
    "anspruchsteller@example.com",
    "claimantEmail sollte die E-Mail-Adresse enthalten"
  );

  // Kein Fehler
  assert.strictEqual(result.error, undefined, "error sollte undefined sein");
});

test("[G1-REQ-005] Weder Telefonnummer noch E-Mail vorhanden, dann abgebrochen", () => {
  const claim = createBaseClaim();
  const report = createCompleteReport({
    claimantPhone: undefined,
    claimantEmail: undefined,
  });
  const now = new Date("2026-11-03T08:40:00Z");

  const result = run(claim, report, now);

  // Vorgang wird abgebrochen
  assert.strictEqual(
    result.trace[result.trace.length - 1].action,
    "abgebrochen",
    "action sollte 'abgebrochen' sein"
  );

  // error-Block mit korrektem stage und code
  assert.ok(result.error, "error sollte vorhanden sein");
  assert.strictEqual(
    result.error.stage,
    1,
    "error.stage sollte 1 sein"
  );
  assert.strictEqual(
    result.error.code,
    "KONTAKT_FEHLT",
    "error.code sollte 'KONTAKT_FEHLT' sein"
  );

  // currentStage bleibt 1
  assert.strictEqual(
    result.meta.currentStage,
    1,
    "currentStage sollte 1 bleiben"
  );

  // kein stage1-Block
  assert.strictEqual(result.stage1, undefined, "stage1 sollte undefined sein");
});
