import { test } from "node:test";
import assert from "node:assert/strict";
import { run } from "./index.js";
import type { Claim, Report } from "./claim.js";

/**
 * G1-REQ-006: Spätmeldung markieren
 *
 * Als Sachbearbeiter:in möchte ich, dass Meldungen mit mehr als sechs Monaten
 * Abstand zum Schadentag deutlich als Spätmeldung markiert werden, damit die
 * Deckungsprüfung das sofort sieht.
 */

/**
 * Helper: Create a minimal valid claim for testing
 */
function createClaim(): Claim {
  return {
    claimId: "SCH-2026-00001",
    meta: {
      contractVersion: "1.1.0",
      createdAt: "2026-11-04T00:00:00Z",
      currentStage: 1,
    },
    trace: [],
  };
}

/**
 * Helper: Create a minimal valid report for testing
 */
function createReport(overrides: Partial<Report> = {}): Report {
  return {
    channel: "Telefon",
    policyNumber: "GH-4711023",
    incidentDate: "2026-11-01",
    reportedAt: "2026-11-03T08:12:00Z",
    description: "Bei Sturm hat sich ein Dachziegel gelöst.",
    claimantName: "Jonas Albers",
    claimantPhone: "0171 2345678",
    damageType: "Sachschaden",
    policyholderName: "Eigentümergemeinschaft Lindenstraße 12",
    ...overrides,
  };
}

test("[G1-REQ-006] Schadentag über 6 Monate zurück, dann Spätmeldung markieren", async () => {
  // Gegeben: Schadentag 2025-12-19 und Meldezeitpunkt 2026-11-04T14:05:00Z
  // Das sind 10 Monate und 16 Tage → über 6 Monate
  const claim = createClaim();
  const report = createReport({
    incidentDate: "2025-12-19",
    reportedAt: "2026-11-04T14:05:00Z",
  });
  const now = new Date("2026-11-04T14:05:00Z");

  // Wenn Stage 1 die Meldung verarbeitet
  const result = run(claim, report, now);

  // Dann wird der Vorgang erfasst
  assert.ok(result.stage1, "stage1 Block sollte existieren");

  // Und die `note` des neuen Trace-Eintrags enthält `Spätmeldung`
  assert.ok(result.trace.length > 0, "Mindestens ein Trace-Eintrag sollte existieren");
  const lastEntry = result.trace[result.trace.length - 1];
  assert.match(
    lastEntry.note ?? "",
    /Spätmeldung/,
    "note des Trace-Eintrags sollte 'Spätmeldung' enthalten"
  );
});

test("[G1-REQ-006] Schadentag genau 6 Monate zurück, dann keine Spätmeldung", async () => {
  // Gegeben: Schadentag 2026-01-15 und Meldung am 2026-07-15 (genau 6 Monate)
  const claim = createClaim();
  const report = createReport({
    incidentDate: "2026-01-15",
    reportedAt: "2026-07-15T08:00:00Z",
  });
  const now = new Date("2026-07-15T08:00:00Z");

  // Wenn Stage 1 die Meldung verarbeitet
  const result = run(claim, report, now);

  // Dann wird der Vorgang erfasst
  assert.ok(result.stage1, "stage1 Block sollte existieren");

  // Und die `note` des neuen Trace-Eintrags enthält nicht `Spätmeldung`
  assert.ok(result.trace.length > 0, "Mindestens ein Trace-Eintrag sollte existieren");
  const lastEntry = result.trace[result.trace.length - 1];
  assert.doesNotMatch(
    lastEntry.note ?? "",
    /Spätmeldung/,
    "note des Trace-Eintrags sollte 'Spätmeldung' nicht enthalten"
  );
});

test("[G1-REQ-006] Schadentag 6 Monate + 1 Tag zurück, dann Spätmeldung markieren", async () => {
  // Gegeben: Schadentag 2026-01-15 und Meldung am 2026-07-16 (6 Monate + 1 Tag)
  const claim = createClaim();
  const report = createReport({
    incidentDate: "2026-01-15",
    reportedAt: "2026-07-16T08:00:00Z",
  });
  const now = new Date("2026-07-16T08:00:00Z");

  // Wenn Stage 1 die Meldung verarbeitet
  const result = run(claim, report, now);

  // Dann wird der Vorgang erfasst
  assert.ok(result.stage1, "stage1 Block sollte existieren");

  // Und die `note` des neuen Trace-Eintrags enthält `Spätmeldung`
  assert.ok(result.trace.length > 0, "Mindestens ein Trace-Eintrag sollte existieren");
  const lastEntry = result.trace[result.trace.length - 1];
  assert.match(
    lastEntry.note ?? "",
    /Spätmeldung/,
    "note des Trace-Eintrags sollte 'Spätmeldung' enthalten"
  );
});
