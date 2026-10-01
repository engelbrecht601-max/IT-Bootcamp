import { test } from "node:test";
import assert from "node:assert/strict";
import { run } from "./index.js";
import type { Claim, Report } from "./claim.js";

/**
 * G1-REQ-007: Möglichen Eigenschaden markieren
 *
 * Tests for marking potential property damage when claimant is the policyholder or property manager.
 */

function createBaseClaim(): Claim {
  return {
    claimId: "TEST-G1-REQ-007",
    meta: {
      contractVersion: "1.0.0",
      createdAt: "2026-11-03T08:12:00Z",
      currentStage: 1,
    },
    trace: [],
  };
}

function createBaseReport(): Report {
  return {
    channel: "Telefon",
    policyNumber: "GH-4711023",
    incidentDate: "2026-11-01",
    reportedAt: "2026-11-03T08:12:00Z",
    description: "Wasserschaden im Keller.",
    claimantName: "Jonas Albers",
    claimantPhone: "0171 2345678",
    damageType: "Sachschaden",
    policyholderName: "Eigentümergemeinschaft Lindenstraße",
  };
}

test("[G1-REQ-007] Claimant gleich Versicherungsnehmer (case-insensitive, trim)", async () => {
  const claim = createBaseClaim();
  const report = createBaseReport();

  // Test with different casing and whitespace
  report.claimantName = "  JONAS ALBERS  ";
  report.policyholderName = "jonas albers";

  const result = run(claim, report, new Date("2026-11-03T08:40:00Z"));

  // Vorgang muss erfasst sein
  assert.ok(result.stage1, "stage1 block should exist");
  assert.equal(result.meta.currentStage, 2, "currentStage should advance to 2");

  // Trace-Eintrag prüfen
  assert.equal(result.trace.length, 1, "should have exactly 1 trace entry");
  const traceEntry = result.trace[0];
  assert.equal(traceEntry.action, "erfasst", "action should be erfasst");
  assert.ok(
    traceEntry.note && traceEntry.note.includes("möglicher Eigenschaden"),
    "note should contain 'möglicher Eigenschaden'"
  );
});

test("[G1-REQ-007] Claimant gleich Hausverwaltung", async () => {
  const claim = createBaseClaim();
  const report = createBaseReport();

  // Test matching property manager name
  report.claimantName = "Hausverwaltung Kramer & Söhne GbR";
  report.propertyManagerName = "Hausverwaltung Kramer & Söhne GbR";
  report.policyholderName = "Dieter Kramer";

  const result = run(claim, report, new Date("2026-11-03T08:40:00Z"));

  // Vorgang muss erfasst sein
  assert.ok(result.stage1, "stage1 block should exist");
  assert.equal(result.meta.currentStage, 2, "currentStage should advance to 2");

  // Trace-Eintrag prüfen
  assert.equal(result.trace.length, 1, "should have exactly 1 trace entry");
  const traceEntry = result.trace[0];
  assert.equal(traceEntry.action, "erfasst", "action should be erfasst");
  assert.ok(
    traceEntry.note && traceEntry.note.includes("möglicher Eigenschaden"),
    "note should contain 'möglicher Eigenschaden'"
  );
});

test("[G1-REQ-007] Claimant ist Dritter, keine Markierung", async () => {
  const claim = createBaseClaim();
  const report = createBaseReport();

  // Test with different claimant
  report.claimantName = "Jonas Albers";
  report.policyholderName = "Eigentümergemeinschaft Lindenstraße";
  report.propertyManagerName = "Hausverwaltung Kramer & Söhne GbR";

  const result = run(claim, report, new Date("2026-11-03T08:40:00Z"));

  // Vorgang muss erfasst sein
  assert.ok(result.stage1, "stage1 block should exist");
  assert.equal(result.meta.currentStage, 2, "currentStage should advance to 2");

  // Trace-Eintrag prüfen
  assert.equal(result.trace.length, 1, "should have exactly 1 trace entry");
  const traceEntry = result.trace[0];
  assert.equal(traceEntry.action, "erfasst", "action should be erfasst");
  assert.ok(
    !traceEntry.note || !traceEntry.note.includes("möglicher Eigenschaden"),
    "note should NOT contain 'möglicher Eigenschaden'"
  );
});
