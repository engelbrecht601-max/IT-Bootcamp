import { test } from "node:test";
import assert from "node:assert/strict";
import { run } from "./index.js";
import type { Claim, Report } from "./claim.js";

/**
 * G1-REQ-004: Schadenart einordnen
 *
 * Akzeptanzkriterien:
 * 1. Gegeben eine Meldung mit `damageType: "Sachschaden"` vom Kunden, wenn Stage 1 sie verarbeitet,
 *    dann ist `stage1.damageType` `Sachschaden`, unabhängig von den übrigen Angaben.
 *
 * 2. Gegeben eine Meldung ohne Schadenart, bei der ein Mensch verletzt wurde, wenn Stage 1 sie
 *    verarbeitet, dann ist `stage1.damageType` `Personenschaden`, auch wenn zusätzlich eine
 *    Sache beschädigt wurde.
 *
 * 3. Gegeben eine Meldung ohne Schadenart, bei der kein Mensch verletzt, aber eine Sache
 *    beschädigt wurde, wenn Stage 1 sie verarbeitet, dann ist `stage1.damageType` `Sachschaden`.
 *
 * 4. Gegeben eine Meldung ohne Schadenart, bei der weder ein Mensch verletzt noch eine Sache
 *    beschädigt wurde (z. B. entgangene Miete), wenn Stage 1 sie verarbeitet, dann ist
 *    `stage1.damageType` `Vermögensschaden`.
 *
 * 5. Gegeben eine Meldung ohne Schadenart und ohne Angabe, ob ein Mensch verletzt oder eine
 *    Sache beschädigt wurde, wenn Stage 1 sie verarbeitet, dann wird abgebrochen mit
 *    `error.code: "SCHADENART_UNKLAR"`.
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
    ...overrides,
  };
}

const now = new Date("2026-11-03T08:40:00Z");

test("[G1-REQ-004] AC 1: Kunde nennt Sachschaden, dann wird übernommen (Standardfall)", () => {
  const claim = createInputClaim();
  const report = createValidReport({
    damageType: "Sachschaden",
    personInjured: false,
    propertyDamaged: true,
  });

  const result = run(claim, report, now);

  assert.ok(result.stage1, "stage1 block should exist");
  assert.equal(
    result.stage1.damageType,
    "Sachschaden",
    'damageType should be "Sachschaden"'
  );
  assert.ok(!result.error, "error block should not exist");
});

test("[G1-REQ-004] AC 1: Kunde nennt Sachschaden, ignoriert Personenschaden (übernimmt Kundenangabe)", () => {
  const claim = createInputClaim();
  const report = createValidReport({
    damageType: "Sachschaden",
    personInjured: true,
    propertyDamaged: false,
  });

  const result = run(claim, report, now);

  assert.ok(result.stage1, "stage1 block should exist");
  assert.equal(
    result.stage1.damageType,
    "Sachschaden",
    'damageType should be "Sachschaden" (customer-provided, not derived)'
  );
  assert.ok(!result.error, "error block should not exist");
});

test("[G1-REQ-004] AC 1: Kunde nennt Personenschaden, dann wird übernommen", () => {
  const claim = createInputClaim();
  const report = createValidReport({
    damageType: "Personenschaden",
    personInjured: false,
    propertyDamaged: false,
  });

  const result = run(claim, report, now);

  assert.ok(result.stage1, "stage1 block should exist");
  assert.equal(
    result.stage1.damageType,
    "Personenschaden",
    'damageType should be "Personenschaden"'
  );
  assert.ok(!result.error, "error block should not exist");
});

test("[G1-REQ-004] AC 2: Keine Schadenart, aber Personenschaden (personInjured=true)", () => {
  const claim = createInputClaim();
  const report = createValidReport({
    damageType: undefined,
    personInjured: true,
    propertyDamaged: false,
  });

  const result = run(claim, report, now);

  assert.ok(result.stage1, "stage1 block should exist");
  assert.equal(
    result.stage1.damageType,
    "Personenschaden",
    'damageType should be derived as "Personenschaden"'
  );
  assert.ok(!result.error, "error block should not exist");
});

test("[G1-REQ-004] AC 2: Keine Schadenart, Personenschaden auch wenn zusätzlich Sachschaden", () => {
  const claim = createInputClaim();
  const report = createValidReport({
    damageType: undefined,
    personInjured: true,
    propertyDamaged: true,
  });

  const result = run(claim, report, now);

  assert.ok(result.stage1, "stage1 block should exist");
  assert.equal(
    result.stage1.damageType,
    "Personenschaden",
    'damageType should be "Personenschaden" (takes precedence over property damage)'
  );
  assert.ok(!result.error, "error block should not exist");
});

test("[G1-REQ-004] AC 3: Keine Schadenart, kein Personenschaden, aber Sachschaden (propertyDamaged=true)", () => {
  const claim = createInputClaim();
  const report = createValidReport({
    damageType: undefined,
    personInjured: false,
    propertyDamaged: true,
  });

  const result = run(claim, report, now);

  assert.ok(result.stage1, "stage1 block should exist");
  assert.equal(
    result.stage1.damageType,
    "Sachschaden",
    'damageType should be derived as "Sachschaden"'
  );
  assert.ok(!result.error, "error block should not exist");
});

test("[G1-REQ-004] AC 4: Keine Schadenart, kein Personenschaden, keine Sachschaden (entgangene Miete)", () => {
  const claim = createInputClaim();
  const report = createValidReport({
    damageType: undefined,
    personInjured: false,
    propertyDamaged: false,
  });

  const result = run(claim, report, now);

  assert.ok(result.stage1, "stage1 block should exist");
  assert.equal(
    result.stage1.damageType,
    "Vermögensschaden",
    'damageType should be derived as "Vermögensschaden"'
  );
  assert.ok(!result.error, "error block should not exist");
});

test("[G1-REQ-004] AC 5: Keine Schadenart und keine Angaben (personInjured und propertyDamaged fehlen)", () => {
  const claim = createInputClaim();
  const report = createValidReport({
    damageType: undefined,
    personInjured: undefined,
    propertyDamaged: undefined,
  });

  const result = run(claim, report, now);

  assert.ok(!result.stage1, "stage1 block should not exist");
  assert.ok(result.error, "error block should exist");
  assert.equal(
    result.error.code,
    "SCHADENART_UNKLAR",
    'error.code should be "SCHADENART_UNKLAR"'
  );
  assert.equal(result.error.stage, 1, "error.stage should be 1");
  assert.ok(result.error.message, "error.message should be set");
  assert.equal(result.meta.currentStage, 1, "currentStage should remain 1");
  assert.ok(result.trace.length === 1, "should have exactly one trace entry");
  assert.equal(
    result.trace[0].action,
    "abgebrochen",
    "trace action should be 'abgebrochen'"
  );
});

test("[G1-REQ-004] AC 5: Keine Schadenart, personInjured=false, propertyDamaged=undefined (ambiguous)", () => {
  const claim = createInputClaim();
  const report = createValidReport({
    damageType: undefined,
    personInjured: false,
    propertyDamaged: undefined,
  });

  const result = run(claim, report, now);

  assert.ok(!result.stage1, "stage1 block should not exist");
  assert.ok(result.error, "error block should exist");
  assert.equal(
    result.error.code,
    "SCHADENART_UNKLAR",
    'error.code should be "SCHADENART_UNKLAR"'
  );
  assert.equal(result.meta.currentStage, 1);
});

test("[G1-REQ-004] AC 5: Keine Schadenart, personInjured=undefined, propertyDamaged=false (ambiguous)", () => {
  const claim = createInputClaim();
  const report = createValidReport({
    damageType: undefined,
    personInjured: undefined,
    propertyDamaged: false,
  });

  const result = run(claim, report, now);

  assert.ok(!result.stage1, "stage1 block should not exist");
  assert.ok(result.error, "error block should exist");
  assert.equal(
    result.error.code,
    "SCHADENART_UNKLAR",
    'error.code should be "SCHADENART_UNKLAR"'
  );
  assert.equal(result.meta.currentStage, 1);
});

test("[G1-REQ-004] AC 1: Vermögensschaden vom Kunden wird übernommen", () => {
  const claim = createInputClaim();
  const report = createValidReport({
    damageType: "Vermögensschaden",
    personInjured: true,
    propertyDamaged: true,
  });

  const result = run(claim, report, now);

  assert.ok(result.stage1, "stage1 block should exist");
  assert.equal(
    result.stage1.damageType,
    "Vermögensschaden",
    'damageType should be "Vermögensschaden" (customer-provided)'
  );
  assert.ok(!result.error, "error block should not exist");
});
