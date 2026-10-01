import { test } from "node:test";
import assert from "node:assert/strict";
import { run } from "./index.js";
import type { Claim, Report } from "./claim.js";

/**
 * G1-REQ-007: Möglichen Eigenschaden markieren
 *
 * Tests for marking potential property damage when claimant is the policyholder or property manager.
 * Gemeinsame Ausgangslage: claim ist die Eingangsakte ohne stage1-Block mit leerem trace,
 * meta.currentStage: 1; report ist die standardisierte Eingangsmeldung mit allen erforderlichen Angaben.
 */

function createBaseClaim(): Claim {
  return {
    claimId: "SCH-2026-00101",
    meta: {
      contractVersion: "1.0.0",
      createdAt: "2026-11-03T08:12:00Z",
      currentStage: 1,
      testCase: "Standardfall",
    },
    trace: [],
  };
}

function createBaseReport(): Report {
  return {
    channel: "Telefon",
    policyNumber: "gh 4711023",
    incidentDate: "2026-11-01",
    reportedAt: "2026-11-03T08:12:00Z",
    description:
      "Bei Sturm hat sich ein Dachziegel von unserem Mehrfamilienhaus gelöst und ist auf das geparkte Auto des Nachbarn gefallen. Die Motorhaube ist eingedellt, die Windschutzscheibe gesprungen.",
    claimantName: "Jonas Albers",
    claimantPhone: "0171 2345678",
    damageType: "Sachschaden",
    policyholderName: "Eigentümergemeinschaft Lindenstraße 12",
    claimedAmount: 2340.0,
  };
}

test("[G1-REQ-007] Gegeben claimantName gleich policyholderName (Groß-/Kleinschreibung und Leerzeichen egal), dann möglicher Eigenschaden", async () => {
  const claim = createBaseClaim();
  const report = createBaseReport();

  // Test with different casing and whitespace
  report.claimantName = "  EIGENTÜMERGEMEINSCHAFT LINDENSTRASSE 12  ";
  report.policyholderName = "eigentümergemeinschaft lindenstrasse 12";

  const result = run(claim, report, new Date("2026-11-03T08:40:00Z"));

  // AC1: Vorgang muss erfasst sein
  assert.ok(result.stage1, "stage1 block should exist");
  assert.equal(result.meta.currentStage, 2, "currentStage should advance to 2");

  // AC1: Trace-Eintrag prüfen - genau ein Eintrag
  assert.equal(result.trace.length, 1, "should have exactly 1 trace entry");
  const traceEntry = result.trace[0];
  assert.equal(traceEntry.action, "erfasst", "action should be erfasst");

  // AC1: note muss "möglicher Eigenschaden" enthalten
  assert.ok(
    traceEntry.note && traceEntry.note.includes("möglicher Eigenschaden"),
    "note should contain 'möglicher Eigenschaden'"
  );
});

test("[G1-REQ-007] Gegeben claimantName gleich propertyManagerName, dann möglicher Eigenschaden", async () => {
  const claim = createBaseClaim();
  const report = createBaseReport();

  // AC2: Test matching property manager name
  report.claimantName = "Hausverwaltung Kramer & Söhne GbR";
  report.propertyManagerName = "Hausverwaltung Kramer & Söhne GbR";
  report.policyholderName = "Dieter Kramer"; // Different from claimant

  const result = run(claim, report, new Date("2026-11-03T08:40:00Z"));

  // AC2: Vorgang muss erfasst sein
  assert.ok(result.stage1, "stage1 block should exist");
  assert.equal(result.meta.currentStage, 2, "currentStage should advance to 2");

  // AC2: Trace-Eintrag prüfen
  assert.equal(result.trace.length, 1, "should have exactly 1 trace entry");
  const traceEntry = result.trace[0];
  assert.equal(traceEntry.action, "erfasst", "action should be erfasst");

  // AC2: note muss "möglicher Eigenschaden" enthalten
  assert.ok(
    traceEntry.note && traceEntry.note.includes("möglicher Eigenschaden"),
    "note should contain 'möglicher Eigenschaden'"
  );
});

test("[G1-REQ-007] Gegeben claimantName weder gleich policyholderName noch propertyManagerName, dann keine Markierung", async () => {
  const claim = createBaseClaim();
  const report = createBaseReport();

  // AC3: Test with different claimant (third party)
  report.claimantName = "Jonas Albers";
  report.policyholderName = "Eigentümergemeinschaft Lindenstraße 12";
  report.propertyManagerName = "Hausverwaltung Kramer & Söhne GbR";

  const result = run(claim, report, new Date("2026-11-03T08:40:00Z"));

  // AC3: Vorgang muss erfasst sein
  assert.ok(result.stage1, "stage1 block should exist");
  assert.equal(result.meta.currentStage, 2, "currentStage should advance to 2");

  // AC3: Trace-Eintrag prüfen
  assert.equal(result.trace.length, 1, "should have exactly 1 trace entry");
  const traceEntry = result.trace[0];
  assert.equal(traceEntry.action, "erfasst", "action should be erfasst");

  // AC3: note darf weder "möglicher Eigenschaden" noch "Eigenschaden nicht prüfbar" enthalten
  assert.ok(
    !traceEntry.note || (!traceEntry.note.includes("möglicher Eigenschaden") && !traceEntry.note.includes("Eigenschaden nicht prüfbar")),
    "note should NOT contain 'möglicher Eigenschaden' or 'Eigenschaden nicht prüfbar'"
  );
});

test("[G1-REQ-007] Gegeben Meldung ohne policyholderName und propertyManagerName, dann Eigenschaden nicht prüfbar", async () => {
  const claim = createBaseClaim();
  const report = createBaseReport();

  // AC4: Both policyholder and property manager are missing
  report.claimantName = "Jonas Albers";
  report.policyholderName = undefined;
  report.propertyManagerName = undefined;

  const result = run(claim, report, new Date("2026-11-03T08:40:00Z"));

  // AC4: Vorgang muss trotzdem erfasst sein
  assert.ok(result.stage1, "stage1 block should exist");
  assert.equal(result.meta.currentStage, 2, "currentStage should advance to 2");

  // AC4: Trace-Eintrag prüfen
  assert.equal(result.trace.length, 1, "should have exactly 1 trace entry");
  const traceEntry = result.trace[0];
  assert.equal(traceEntry.action, "erfasst", "action should be erfasst");

  // AC4: note muss "Eigenschaden nicht prüfbar" enthalten
  assert.ok(
    traceEntry.note && traceEntry.note.includes("Eigenschaden nicht prüfbar"),
    "note should contain 'Eigenschaden nicht prüfbar'"
  );
});

test("[G1-REQ-007] Gegeben Meldung ohne policyholderName, deren claimantName gleich propertyManagerName, dann möglicher Eigenschaden nicht Eigenschaden nicht prüfbar", async () => {
  const claim = createBaseClaim();
  const report = createBaseReport();

  // AC5: No policyholder, but claimant matches property manager
  report.claimantName = "Hausverwaltung Kramer & Söhne GbR";
  report.policyholderName = undefined;
  report.propertyManagerName = "Hausverwaltung Kramer & Söhne GbR";

  const result = run(claim, report, new Date("2026-11-03T08:40:00Z"));

  // AC5: Vorgang muss erfasst sein
  assert.ok(result.stage1, "stage1 block should exist");
  assert.equal(result.meta.currentStage, 2, "currentStage should advance to 2");

  // AC5: Trace-Eintrag prüfen
  assert.equal(result.trace.length, 1, "should have exactly 1 trace entry");
  const traceEntry = result.trace[0];
  assert.equal(traceEntry.action, "erfasst", "action should be erfasst");

  // AC5: note muss "möglicher Eigenschaden" enthalten
  assert.ok(
    traceEntry.note && traceEntry.note.includes("möglicher Eigenschaden"),
    "note should contain 'möglicher Eigenschaden'"
  );

  // AC5: note darf "Eigenschaden nicht prüfbar" NICHT enthalten
  assert.ok(
    !traceEntry.note || !traceEntry.note.includes("Eigenschaden nicht prüfbar"),
    "note should NOT contain 'Eigenschaden nicht prüfbar'"
  );
});
