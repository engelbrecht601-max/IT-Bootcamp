import { test } from "node:test";
import assert from "node:assert/strict";
import { run } from "./index.js";
import type { Claim, Report } from "./claim.js";

/**
 * G1-REQ-010: Grundregeln bei fehlenden oder unklaren Angaben
 *
 * User Story: Als Sachbearbeiter:in möchte ich, dass jede fehlende oder unklare Angabe
 * nach festen Grundregeln behandelt wird, damit kein unklarer Fall unbemerkt an die
 * Deckungsprüfung geht und nicht jeder Sonderfall einzeln geregelt werden muss.
 *
 * Grundregeln:
 * - Regel 1 (Rückfrage): Fehlt eine Pflichtangabe oder ist sie eindeutig ungültig,
 *   wird nichts angelegt. Die Meldung sagt, wonach gefragt werden muss.
 * - Regel 2 (Erfassen mit Hinweis): Fehlt eine optionale Angabe oder ist sie unklar,
 *   während die Pflichtangaben ausreichen, wird erfasst und ein Hinweis in die `note` geschrieben.
 * - Regel 3 (im Zweifel Rückfrage): Was keine der beiden Regeln eindeutig abdeckt,
 *   wird wie Regel 1 behandelt.
 */

function createBaseClaim(): Claim {
  return {
    claimId: "SCH-2026-00010",
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

test("[G1-REQ-010] Fehlende Schadenbeschreibung, dann Rückfrage mit 'Bitte nachfragen:'", () => {
  const claim = createBaseClaim();
  const report = createCompleteReport({
    description: undefined,
  });
  const now = new Date("2026-11-03T08:40:00Z");

  const result = run(claim, report, now);

  // Vorgang wird abgebrochen
  assert.strictEqual(
    result.trace[result.trace.length - 1].action,
    "abgebrochen",
    "action sollte 'abgebrochen' sein"
  );

  // error-Block vorhanden
  assert.ok(result.error, "error sollte vorhanden sein");
  assert.strictEqual(result.error.stage, 1, "error.stage sollte 1 sein");

  // error.message beginnt mit "Bitte nachfragen:"
  assert.match(
    result.error.message,
    /^Bitte nachfragen:/,
    "error.message sollte mit 'Bitte nachfragen:' beginnen"
  );

  // currentStage bleibt 1
  assert.strictEqual(result.meta.currentStage, 1, "currentStage sollte 1 bleiben");

  // kein stage1-Block
  assert.strictEqual(result.stage1, undefined, "stage1 sollte undefined sein");
});

test("[G1-REQ-010] Fehlende Beschreibung und fehlende Kontaktdaten, dann Rückfrage mit allen Feldnamen", () => {
  const claim = createBaseClaim();
  const report = createCompleteReport({
    description: undefined,
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

  // error-Block vorhanden
  assert.ok(result.error, "error sollte vorhanden sein");

  // error.message beginnt mit "Bitte nachfragen:" und enthält beide Feldnamen
  assert.match(
    result.error.message,
    /^Bitte nachfragen:/,
    "error.message sollte mit 'Bitte nachfragen:' beginnen"
  );
  assert.match(
    result.error.message,
    /description/,
    "error.message sollte 'description' enthalten"
  );
  assert.match(
    result.error.message,
    /claimantPhone/,
    "error.message sollte 'claimantPhone' enthalten"
  );

  // kein stage1-Block
  assert.strictEqual(result.stage1, undefined, "stage1 sollte undefined sein");
});

test("[G1-REQ-010] Ungültige incidentDate-Format, dann Rückfrage mit SCHADENTAG_UNGUELTIG", () => {
  const claim = createBaseClaim();
  const report = createCompleteReport({
    incidentDate: "Mitte Dezember",
  });
  const now = new Date("2026-11-03T08:40:00Z");

  const result = run(claim, report, now);

  // Vorgang wird abgebrochen
  assert.strictEqual(
    result.trace[result.trace.length - 1].action,
    "abgebrochen",
    "action sollte 'abgebrochen' sein"
  );

  // error-Block mit korrektem code
  assert.ok(result.error, "error sollte vorhanden sein");
  assert.strictEqual(result.error.stage, 1, "error.stage sollte 1 sein");
  assert.strictEqual(
    result.error.code,
    "SCHADENTAG_UNGUELTIG",
    "error.code sollte 'SCHADENTAG_UNGUELTIG' sein"
  );

  // currentStage bleibt 1
  assert.strictEqual(result.meta.currentStage, 1, "currentStage sollte 1 bleiben");

  // kein stage1-Block
  assert.strictEqual(result.stage1, undefined, "stage1 sollte undefined sein");
});

test("[G1-REQ-010] Ungültiges reportedAt-Format, dann Rückfrage mit MELDEZEITPUNKT_UNGUELTIG", () => {
  const claim = createBaseClaim();
  const report = createCompleteReport({
    reportedAt: "gestern",
  });
  const now = new Date("2026-11-03T08:40:00Z");

  const result = run(claim, report, now);

  // Vorgang wird abgebrochen
  assert.strictEqual(
    result.trace[result.trace.length - 1].action,
    "abgebrochen",
    "action sollte 'abgebrochen' sein"
  );

  // error-Block mit korrektem code
  assert.ok(result.error, "error sollte vorhanden sein");
  assert.strictEqual(result.error.stage, 1, "error.stage sollte 1 sein");
  assert.strictEqual(
    result.error.code,
    "MELDEZEITPUNKT_UNGUELTIG",
    "error.code sollte 'MELDEZEITPUNKT_UNGUELTIG' sein"
  );

  // currentStage bleibt 1
  assert.strictEqual(result.meta.currentStage, 1, "currentStage sollte 1 bleiben");

  // kein stage1-Block
  assert.strictEqual(result.stage1, undefined, "stage1 sollte undefined sein");
});

test("[G1-REQ-010] personInjured=true mit unbekannter Schadenart, dann erfasst mit Hinweis", () => {
  const claim = createBaseClaim();
  // Cast to any to allow invalid damageType value
  const report = createCompleteReport({
    personInjured: true,
    damageType: "Unfall" as any,
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

  // damageType ist "Personenschaden" (aus Fakten abgeleitet)
  assert.strictEqual(
    result.stage1.damageType,
    "Personenschaden",
    "damageType sollte 'Personenschaden' sein"
  );

  // note enthält Hinweis auf unbekannte Schadenart
  assert.match(
    result.trace[result.trace.length - 1].note || "",
    /Schadenart laut Kunde unbekannt/,
    "note sollte 'Schadenart laut Kunde unbekannt' enthalten"
  );

  // Kein Fehler
  assert.strictEqual(result.error, undefined, "error sollte undefined sein");
});

test("[G1-REQ-010] Fehlende Schadenart-Fakten mit unbekannter Schadenart, dann Rückfrage mit SCHADENART_UNKLAR", () => {
  const claim = createBaseClaim();
  // Cast to any to allow invalid damageType value
  const report = createCompleteReport({
    personInjured: undefined,
    propertyDamaged: undefined,
    damageType: "Unfall" as any,
  });
  const now = new Date("2026-11-03T08:40:00Z");

  const result = run(claim, report, now);

  // Vorgang wird abgebrochen
  assert.strictEqual(
    result.trace[result.trace.length - 1].action,
    "abgebrochen",
    "action sollte 'abgebrochen' sein"
  );

  // error-Block mit korrektem code
  assert.ok(result.error, "error sollte vorhanden sein");
  assert.strictEqual(result.error.stage, 1, "error.stage sollte 1 sein");
  assert.strictEqual(
    result.error.code,
    "SCHADENART_UNKLAR",
    "error.code sollte 'SCHADENART_UNKLAR' sein"
  );

  // currentStage bleibt 1
  assert.strictEqual(result.meta.currentStage, 1, "currentStage sollte 1 bleiben");

  // kein stage1-Block
  assert.strictEqual(result.stage1, undefined, "stage1 sollte undefined sein");
});
