import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { run } from "./index.js";
import type { Claim, Report } from "./claim.js";

/**
 * G1-REQ-001: Pflichtangaben vollständig
 *
 * Gemeinsame Ausgangslage: Basis-Akte aus fixtures/1-2/standardfall.json ohne stage1-Block,
 * mit leerem trace und meta.currentStage: 1. Eingangsmeldung basiert auf
 * fixtures/eingang/standardfall.json, mit geänderten Feldern je Test.
 *
 * Akzeptanzkriterien:
 * 1. Gegeben eine Meldung mit Versicherungsscheinnummer, Schadentag, Hergang und Name des
 *    Anspruchstellers, wenn Stage 1 sie verarbeitet, dann ist der Block `stage1` gefüllt,
 *    der neue Trace-Eintrag hat `action: "erfasst"` und `meta.currentStage` ist `2`.
 *
 * 2. Gegeben eine Meldung, in der eine dieser vier Angaben fehlt oder leer ist, wenn Stage 1
 *    sie verarbeitet, dann hat der neue Trace-Eintrag `action: "abgebrochen"`, die Akte hat
 *    einen `error`-Block mit `stage: 1` und `code: "PFLICHTANGABE_FEHLT"`, `error.message`
 *    enthält den Feldnamen der fehlenden Angabe aus der Eingangsmeldung (z. B. `policyNumber`),
 *    und `meta.currentStage` bleibt `1`.
 *
 * 3. Gegeben eine Meldung, in der mehrere Pflichtangaben fehlen, wenn Stage 1 sie verarbeitet,
 *    dann enthält `error.message` die Feldnamen aller fehlenden Angaben.
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

const now = new Date("2026-11-03T08:40:00Z");

test("[G1-REQ-001] AC 1: Alle vier Pflichtangaben vorhanden, dann stage1 gefüllt und erfasst", () => {
  const claim = createBaseClaim();
  const report: Report = {
    ...createBaseReport(),
    policyNumber: "GH-4711023",
    incidentDate: "2026-11-01",
    description: "Bei Sturm hat sich ein Dachziegel gelöst und ist auf das geparkte Auto gefallen.",
    claimantName: "Jonas Albers",
    reportedAt: "2026-11-03T08:12:00Z",
  };

  const result = run(claim, report, now);

  assert.ok(result.stage1, "stage1 block should exist");
  assert.ok(result.stage1.policyNumber, "policyNumber should be filled");
  assert.ok(result.stage1.incidentDate, "incidentDate should be filled");
  assert.ok(result.stage1.description, "description should be filled");
  assert.ok(result.stage1.claimant.name, "claimant.name should be filled");

  assert.equal(result.trace.length, 1, "should have exactly one trace entry");
  const lastTrace = result.trace[0];
  assert.equal(lastTrace.action, "erfasst", "trace action should be 'erfasst'");
  assert.equal(lastTrace.stage, 1, "trace stage should be 1");

  assert.equal(result.meta.currentStage, 2, "currentStage should be 2 after processing");
  assert.ok(!result.error, "error block should not exist");
});

test("[G1-REQ-001] AC 2: Fehlende policyNumber, dann abgebrochen mit PFLICHTANGABE_FEHLT", () => {
  const claim = createBaseClaim();
  const report: Report = {
    ...createBaseReport(),
    policyNumber: undefined,
    incidentDate: "2026-11-01",
    description: "Bei Sturm hat sich ein Dachziegel gelöst.",
    claimantName: "Jonas Albers",
    reportedAt: "2026-11-03T08:12:00Z",
  };

  const result = run(claim, report, now);

  assert.ok(!result.stage1, "stage1 block should not exist");
  assert.ok(result.error, "error block should exist");
  assert.equal(result.error.stage, 1, "error.stage should be 1");
  assert.equal(result.error.code, "PFLICHTANGABE_FEHLT", 'error.code should be "PFLICHTANGABE_FEHLT"');
  assert.ok(result.error.message.includes("policyNumber"), "error.message should contain 'policyNumber'");

  assert.equal(result.meta.currentStage, 1, "currentStage should remain 1");
  assert.equal(result.trace.length, 1, "should have exactly one trace entry");
  assert.equal(result.trace[0].action, "abgebrochen", "trace action should be 'abgebrochen'");
});

test("[G1-REQ-001] AC 2: Leere policyNumber, dann abgebrochen mit PFLICHTANGABE_FEHLT", () => {
  const claim = createBaseClaim();
  const report: Report = {
    ...createBaseReport(),
    policyNumber: "",
    incidentDate: "2026-11-01",
    description: "Bei Sturm hat sich ein Dachziegel gelöst.",
    claimantName: "Jonas Albers",
    reportedAt: "2026-11-03T08:12:00Z",
  };

  const result = run(claim, report, now);

  assert.ok(!result.stage1, "stage1 block should not exist");
  assert.ok(result.error, "error block should exist");
  assert.equal(result.error.code, "PFLICHTANGABE_FEHLT");
  assert.ok(result.error.message.includes("policyNumber"), "error.message should contain 'policyNumber'");
  assert.equal(result.meta.currentStage, 1, "currentStage should remain 1");
});

test("[G1-REQ-001] AC 2: Fehlende incidentDate, dann abgebrochen mit PFLICHTANGABE_FEHLT", () => {
  const claim = createBaseClaim();
  const report: Report = {
    ...createBaseReport(),
    policyNumber: "GH-4711023",
    incidentDate: undefined,
    description: "Bei Sturm hat sich ein Dachziegel gelöst.",
    claimantName: "Jonas Albers",
    reportedAt: "2026-11-03T08:12:00Z",
  };

  const result = run(claim, report, now);

  assert.ok(!result.stage1, "stage1 block should not exist");
  assert.ok(result.error, "error block should exist");
  assert.equal(result.error.code, "PFLICHTANGABE_FEHLT");
  assert.ok(result.error.message.includes("incidentDate"), "error.message should contain 'incidentDate'");
  assert.equal(result.meta.currentStage, 1, "currentStage should remain 1");
});

test("[G1-REQ-001] AC 2: Leere incidentDate, dann abgebrochen mit PFLICHTANGABE_FEHLT", () => {
  const claim = createBaseClaim();
  const report: Report = {
    ...createBaseReport(),
    policyNumber: "GH-4711023",
    incidentDate: "",
    description: "Bei Sturm hat sich ein Dachziegel gelöst.",
    claimantName: "Jonas Albers",
    reportedAt: "2026-11-03T08:12:00Z",
  };

  const result = run(claim, report, now);

  assert.ok(!result.stage1, "stage1 block should not exist");
  assert.ok(result.error, "error block should exist");
  assert.equal(result.error.code, "PFLICHTANGABE_FEHLT");
  assert.ok(result.error.message.includes("incidentDate"), "error.message should contain 'incidentDate'");
  assert.equal(result.meta.currentStage, 1, "currentStage should remain 1");
});

test("[G1-REQ-001] AC 2: Fehlende description, dann abgebrochen mit PFLICHTANGABE_FEHLT", () => {
  const claim = createBaseClaim();
  const report: Report = {
    ...createBaseReport(),
    policyNumber: "GH-4711023",
    incidentDate: "2026-11-01",
    description: undefined,
    claimantName: "Jonas Albers",
    reportedAt: "2026-11-03T08:12:00Z",
  };

  const result = run(claim, report, now);

  assert.ok(!result.stage1, "stage1 block should not exist");
  assert.ok(result.error, "error block should exist");
  assert.equal(result.error.code, "PFLICHTANGABE_FEHLT");
  assert.ok(result.error.message.includes("description"), "error.message should contain 'description'");
  assert.equal(result.meta.currentStage, 1, "currentStage should remain 1");
});

test("[G1-REQ-001] AC 2: Leere description, dann abgebrochen mit PFLICHTANGABE_FEHLT", () => {
  const claim = createBaseClaim();
  const report: Report = {
    ...createBaseReport(),
    policyNumber: "GH-4711023",
    incidentDate: "2026-11-01",
    description: "",
    claimantName: "Jonas Albers",
    reportedAt: "2026-11-03T08:12:00Z",
  };

  const result = run(claim, report, now);

  assert.ok(!result.stage1, "stage1 block should not exist");
  assert.ok(result.error, "error block should exist");
  assert.equal(result.error.code, "PFLICHTANGABE_FEHLT");
  assert.ok(result.error.message.includes("description"), "error.message should contain 'description'");
  assert.equal(result.meta.currentStage, 1, "currentStage should remain 1");
});

test("[G1-REQ-001] AC 2: Fehlende claimantName, dann abgebrochen mit PFLICHTANGABE_FEHLT", () => {
  const claim = createBaseClaim();
  const report: Report = {
    ...createBaseReport(),
    policyNumber: "GH-4711023",
    incidentDate: "2026-11-01",
    description: "Bei Sturm hat sich ein Dachziegel gelöst.",
    claimantName: undefined,
    reportedAt: "2026-11-03T08:12:00Z",
  };

  const result = run(claim, report, now);

  assert.ok(!result.stage1, "stage1 block should not exist");
  assert.ok(result.error, "error block should exist");
  assert.equal(result.error.code, "PFLICHTANGABE_FEHLT");
  assert.ok(result.error.message.includes("claimantName"), "error.message should contain 'claimantName'");
  assert.equal(result.meta.currentStage, 1, "currentStage should remain 1");
});

test("[G1-REQ-001] AC 2: Leere claimantName, dann abgebrochen mit PFLICHTANGABE_FEHLT", () => {
  const claim = createBaseClaim();
  const report: Report = {
    ...createBaseReport(),
    policyNumber: "GH-4711023",
    incidentDate: "2026-11-01",
    description: "Bei Sturm hat sich ein Dachziegel gelöst.",
    claimantName: "",
    reportedAt: "2026-11-03T08:12:00Z",
  };

  const result = run(claim, report, now);

  assert.ok(!result.stage1, "stage1 block should not exist");
  assert.ok(result.error, "error block should exist");
  assert.equal(result.error.code, "PFLICHTANGABE_FEHLT");
  assert.ok(result.error.message.includes("claimantName"), "error.message should contain 'claimantName'");
  assert.equal(result.meta.currentStage, 1, "currentStage should remain 1");
});

test("[G1-REQ-001] AC 3: Mehrere fehlende Pflichtangaben, dann alle in error.message", () => {
  const claim = createBaseClaim();
  const report: Report = {
    ...createBaseReport(),
    policyNumber: undefined,
    incidentDate: undefined,
    description: "Bei Sturm hat sich ein Dachziegel gelöst.",
    claimantName: undefined,
    reportedAt: "2026-11-03T08:12:00Z",
  };

  const result = run(claim, report, now);

  assert.ok(!result.stage1, "stage1 block should not exist");
  assert.ok(result.error, "error block should exist");
  assert.equal(result.error.code, "PFLICHTANGABE_FEHLT");
  assert.ok(result.error.message.includes("policyNumber"), "error.message should contain 'policyNumber'");
  assert.ok(result.error.message.includes("incidentDate"), "error.message should contain 'incidentDate'");
  assert.ok(result.error.message.includes("claimantName"), "error.message should contain 'claimantName'");
  assert.equal(result.meta.currentStage, 1, "currentStage should remain 1");
});

test("[G1-REQ-001] AC 3: Alle vier Pflichtangaben fehlen, dann alle in error.message", () => {
  const claim = createBaseClaim();
  const report: Report = {
    ...createBaseReport(),
    policyNumber: undefined,
    incidentDate: undefined,
    description: undefined,
    claimantName: undefined,
    reportedAt: "2026-11-03T08:12:00Z",
  };

  const result = run(claim, report, now);

  assert.ok(!result.stage1, "stage1 block should not exist");
  assert.ok(result.error, "error block should exist");
  assert.equal(result.error.code, "PFLICHTANGABE_FEHLT");
  assert.ok(result.error.message.includes("policyNumber"), "error.message should contain 'policyNumber'");
  assert.ok(result.error.message.includes("incidentDate"), "error.message should contain 'incidentDate'");
  assert.ok(result.error.message.includes("description"), "error.message should contain 'description'");
  assert.ok(result.error.message.includes("claimantName"), "error.message should contain 'claimantName'");
  assert.equal(result.meta.currentStage, 1, "currentStage should remain 1");
});
