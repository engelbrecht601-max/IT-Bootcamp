import { test } from "node:test";
import assert from "node:assert/strict";
import { run } from "./index.js";
import type { Claim, Report } from "./claim.js";

/**
 * G1-REQ-004: Schadenart einordnen
 *
 * Akzeptanzkriterien:
 * 1. Gegeben eine Meldung mit `damageType: "Sachschaden"` vom Kunden und ohne `personInjured` und `propertyDamaged`,
 *    wenn Stage 1 sie verarbeitet, dann ist `stage1.damageType` `Sachschaden`.
 *
 * 2. Gegeben eine Meldung, bei der ein Mensch verletzt wurde (`personInjured: true`), egal welche Schadenart der Kunde nennt
 *    (z. B. `damageType: "Sachschaden"`) und auch wenn zusätzlich eine Sache beschädigt wurde,
 *    wenn Stage 1 sie verarbeitet, dann ist `stage1.damageType` `Personenschaden`.
 *
 * 3. Gegeben eine Meldung, bei der kein Mensch verletzt, aber eine Sache beschädigt wurde (`personInjured: false`, `propertyDamaged: true`),
 *    egal welche Schadenart der Kunde nennt (z. B. `damageType: "Personenschaden"`),
 *    wenn Stage 1 sie verarbeitet, dann ist `stage1.damageType` `Sachschaden`.
 *
 * 4. Gegeben eine Meldung, bei der weder ein Mensch verletzt noch eine Sache beschädigt wurde (`personInjured: false`, `propertyDamaged: false`, z. B. entgangene Miete),
 *    egal welche Schadenart der Kunde nennt,
 *    wenn Stage 1 sie verarbeitet, dann ist `stage1.damageType` `Vermögensschaden`.
 *
 * 5. Gegeben eine Meldung ohne Schadenart und ohne Angabe, ob ein Mensch verletzt oder eine Sache beschädigt wurde,
 *    wenn Stage 1 sie verarbeitet, dann wird abgebrochen mit `error.code: "SCHADENART_UNKLAR"`.
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

// AC 1: Kundenangabe, keine Fakten
test("[G1-REQ-004] AC 1: Sachschaden vom Kunden, keine Fakten erfasst", () => {
  const claim = createInputClaim();
  const report = createValidReport({
    damageType: "Sachschaden",
    personInjured: undefined,
    propertyDamaged: undefined,
  });

  const result = run(claim, report, now);

  assert.ok(result.stage1, "stage1 block should exist");
  assert.equal(
    result.stage1.damageType,
    "Sachschaden",
    'damageType should be "Sachschaden" from customer when no facts provided'
  );
  assert.ok(!result.error, "error block should not exist");
});

// AC 2: Personenschaden (personInjured=true) schlägt alle Kundenangaben
test("[G1-REQ-004] AC 2: Mensch verletzt, keine Kundenangabe", () => {
  const claim = createInputClaim();
  const report = createValidReport({
    damageType: undefined,
    personInjured: true,
    propertyDamaged: undefined,
  });

  const result = run(claim, report, now);

  assert.ok(result.stage1, "stage1 block should exist");
  assert.equal(
    result.stage1.damageType,
    "Personenschaden",
    'damageType should be derived as "Personenschaden" from fact personInjured=true'
  );
  assert.ok(!result.error, "error block should not exist");
});

test("[G1-REQ-004] AC 2: Mensch verletzt, Kundenangabe Sachschaden wird überschrieben", () => {
  const claim = createInputClaim();
  const report = createValidReport({
    damageType: "Sachschaden",
    personInjured: true,
    propertyDamaged: undefined,
  });

  const result = run(claim, report, now);

  assert.ok(result.stage1, "stage1 block should exist");
  assert.equal(
    result.stage1.damageType,
    "Personenschaden",
    'damageType should be derived as "Personenschaden" despite customer saying "Sachschaden"'
  );
  assert.ok(!result.error, "error block should not exist");
});

test("[G1-REQ-004] AC 2: Mensch verletzt, auch wenn Sache beschädigt wurde", () => {
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
    'damageType should be "Personenschaden" (personInjured has precedence)'
  );
  assert.ok(!result.error, "error block should not exist");
});

// AC 3: Sachschaden (personInjured=false, propertyDamaged=true)
test("[G1-REQ-004] AC 3: Sache beschädigt, kein Mensch verletzt, keine Kundenangabe", () => {
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
    'damageType should be derived as "Sachschaden" from facts'
  );
  assert.ok(!result.error, "error block should not exist");
});

test("[G1-REQ-004] AC 3: Sache beschädigt, Kundenangabe Personenschaden wird überschrieben", () => {
  const claim = createInputClaim();
  const report = createValidReport({
    damageType: "Personenschaden",
    personInjured: false,
    propertyDamaged: true,
  });

  const result = run(claim, report, now);

  assert.ok(result.stage1, "stage1 block should exist");
  assert.equal(
    result.stage1.damageType,
    "Sachschaden",
    'damageType should be "Sachschaden" despite customer claiming "Personenschaden"'
  );
  assert.ok(!result.error, "error block should not exist");
});

// AC 4: Vermögensschaden (personInjured=false, propertyDamaged=false)
test("[G1-REQ-004] AC 4: Weder Mensch verletzt noch Sache beschädigt, keine Kundenangabe", () => {
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

test("[G1-REQ-004] AC 4: Weder Mensch verletzt noch Sache beschädigt, Kundenangabe wird überschrieben", () => {
  const claim = createInputClaim();
  const report = createValidReport({
    damageType: "Sachschaden",
    personInjured: false,
    propertyDamaged: false,
  });

  const result = run(claim, report, now);

  assert.ok(result.stage1, "stage1 block should exist");
  assert.equal(
    result.stage1.damageType,
    "Vermögensschaden",
    'damageType should be "Vermögensschaden" despite customer claiming "Sachschaden"'
  );
  assert.ok(!result.error, "error block should not exist");
});

// AC 5: Abbruch wenn weder Kundenangabe noch Fakten vorliegen
test("[G1-REQ-004] AC 5: Keine Schadenart, keine Fakten (alle undefined)", () => {
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
  assert.equal(result.trace.length, 1, "should have exactly one trace entry");
  assert.equal(
    result.trace[0].action,
    "abgebrochen",
    "trace action should be 'abgebrochen'"
  );
});

test("[G1-REQ-004] AC 5: Keine Schadenart, personInjured=false aber propertyDamaged=undefined", () => {
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
    'error.code should be "SCHADENART_UNKLAR" when facts are incomplete'
  );
  assert.equal(result.meta.currentStage, 1, "currentStage should remain 1");
});

test("[G1-REQ-004] AC 5: Keine Schadenart, propertyDamaged=false aber personInjured=undefined", () => {
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
    'error.code should be "SCHADENART_UNKLAR" when facts are incomplete'
  );
  assert.equal(result.meta.currentStage, 1, "currentStage should remain 1");
});
